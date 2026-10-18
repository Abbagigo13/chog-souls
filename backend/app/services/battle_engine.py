# backend/app/services/battle_engine.py
"""
Turn-based Arena battles.

Everything here is a pure function of the battle state the browser sends back
each round, so the server stores nothing. Each fighter picks one of four moves
(tied to the four stats) or uses a once-per-battle SIGNATURE move that comes
from one of the Chog's real NFT traits.

Counter cycle (each move beats the next one):
    Strike > Outwit > Gamble > Guard > Strike
"""
import hashlib
import random
import re
from typing import Any, Dict, List, Optional

MOVES = ("strike", "outwit", "guard", "gamble")
SPECIAL = "special"

STAT_FOR_MOVE = {
    "strike": "courage",
    "outwit": "intelligence",
    "guard": "loyalty",
    "gamble": "greed",
}
MOVE_LABEL = {
    "strike": "Strike",
    "outwit": "Outwit",
    "guard": "Guard",
    "gamble": "Gamble",
    SPECIAL: "Signature",
}
# key beats value
BEATS = {"strike": "outwit", "outwit": "gamble", "gamble": "guard", "guard": "strike"}

MAX_ROUNDS = 6
BURN_DAMAGE = 5
BURN_TURNS = 3
HOLDER_BONUS_PER_TIER = 0.10
HINT_ACCURACY = 0.55
MAX_HOLDER_TIER = 3

EFFECT_DESCRIPTIONS = {
    "beam": "A heavy hit that cannot be countered or blocked.",
    "spell": "Strong magic that slips straight through Guard.",
    "burn": "Hits and sets the enemy ablaze for 3 rounds.",
    "heal": "Hits lightly and restores your HP.",
    "shield": "Hits lightly and raises a barrier that soaks damage.",
    "fortune": "A wild swing: could be weak, could be huge.",
    "confuse": "Hits and leaves the enemy dazed next round.",
}

# (trait name, regex on its value, effect, move name) - first match wins
SIGNATURE_RULES = [
    ("eyes", r"laser", "beam", "Laser Beam"),
    ("head", r"wizard|mage|witch|sage", "spell", "Arcane Hex"),
    ("aura", r"burn|fire|fiery|flame|ember", "burn", "Ember Surge"),
    ("accessory", r"heart|love", "heal", "Heart Mend"),
    ("accessory", r"candle|gold|dollar|cash|coin|chain", "fortune", "Moonshot"),
    ("head", r"dollar|gold|crown|money", "fortune", "Moonshot"),
    ("mouth", r"puke|rainbow", "confuse", "Rainbow Burst"),
    ("aura", r".+", "shield", "Aura Ward"),
]

# Used when no rule matches: the effect is picked from the trait values
FALLBACK_NAMES = {
    "beam": "Focus Blast",
    "spell": "Mind Hex",
    "burn": "Flare Burst",
    "heal": "Second Wind",
    "shield": "Iron Ward",
    "fortune": "Lucky Break",
    "confuse": "Daze",
}
FALLBACK_SOURCES = ("mouth", "body", "head", "skin", "background")


def relation(a: str, b: str) -> str:
    """How move a fares against move b: win / lose / neutral / clash."""
    if a == b:
        return "clash"
    if BEATS[a] == b:
        return "win"
    if BEATS[b] == a:
        return "lose"
    return "neutral"


def counter_to(move: str) -> str:
    """The move that beats `move`."""
    return next(m for m in MOVES if BEATS[m] == move)


def signature_for(traits: List[Dict[str, Any]]) -> Dict[str, str]:
    """The signature move a Chog gets from its real traits."""
    by_name = {}
    for trait in traits:
        name = str(trait.get("name", "")).strip()
        value = str(trait.get("value", "")).strip()
        if name:
            by_name[name.lower()] = (name, value)

    for trait_key, pattern, effect, move_name in SIGNATURE_RULES:
        entry = by_name.get(trait_key)
        if entry and entry[1] and re.search(pattern, entry[1].lower()):
            return {
                "name": move_name,
                "effect": effect,
                "source": f"{entry[0]}: {entry[1]}",
                "desc": EFFECT_DESCRIPTIONS[effect],
            }

    # Fallback: stable pick from the trait values
    joined = "|".join(f"{k}={v[1]}" for k, v in sorted(by_name.items()))
    digest = int(hashlib.sha256(joined.encode("utf-8")).hexdigest(), 16)
    effect = list(FALLBACK_NAMES.keys())[digest % len(FALLBACK_NAMES)]
    source = "Chog"
    for key in FALLBACK_SOURCES:
        if key in by_name and by_name[key][1]:
            source = f"{by_name[key][0]}: {by_name[key][1]}"
            break
    return {
        "name": FALLBACK_NAMES[effect],
        "effect": effect,
        "source": source,
        "desc": EFFECT_DESCRIPTIONS[effect],
    }


def _fighter(name, level, stats, traits, image, bonus=0.0) -> Dict[str, Any]:
    max_hp = 100 + int(level) * 2
    return {
        "name": name,
        "level": int(level),
        "image": image,
        "stats": {k: int(stats.get(k, 50)) for k in STAT_FOR_MOVE.values()},
        "hp": max_hp,
        "max_hp": max_hp,
        "special": signature_for(traits),
        "special_used": False,
        "burn": 0,
        "shield": 0,
        "dazed": False,
        "bonus": bonus,
    }


def start_battle(soul: Dict[str, Any], rival: Dict[str, Any], holder_tier: int = 0) -> Dict[str, Any]:
    """
    soul:  {"name","level","stats":{...},"traits":[{name,value}],"image"}
    rival: the entry from RIVALS (+ "image" resolved by the caller)
    """
    tier = max(0, min(MAX_HOLDER_TIER, int(holder_tier or 0)))
    player = _fighter(
        soul["name"], soul["level"], soul["stats"], soul["traits"],
        soul.get("image", ""), bonus=tier * HOLDER_BONUS_PER_TIER,
    )
    enemy = _fighter(
        rival["name"], rival["level"], rival["stats"], rival["traits"],
        rival.get("imageUrl", ""),
    )
    top_stat = max(enemy["stats"], key=lambda s: enemy["stats"][s])
    leans = next(m for m, s in STAT_FOR_MOVE.items() if s == top_stat)
    state = {
        "rival_id": rival["id"],
        "seed": "%032x" % random.getrandbits(128),
        "round": 1,
        "max_rounds": MAX_ROUNDS,
        "holder_tier": tier,
        "player": player,
        "rival": enemy,
        "leans": leans,
        "history": [],
        "finished": False,
        "won": None,
        "hint": None,
    }
    state["hint"] = rival_intent(state)[1]
    return state


def _base_damage(fighter: Dict[str, Any], stat: str, rng: random.Random) -> float:
    value = fighter["stats"][stat]
    return (14 + value * 0.08 + fighter["level"] * 0.4) * rng.uniform(0.88, 1.12)


def _attack(fighter: Dict[str, Any], choice: str, rng: random.Random) -> Dict[str, Any]:
    """What a fighter's chosen action does, before counters and defences."""
    out = {"dmg": 0.0, "heal": 0, "shield": 0, "burn": 0, "daze": False, "pierce": False}
    stats = fighter["stats"]
    bonus = 1.0 + fighter["bonus"]

    if choice != SPECIAL:
        stat = STAT_FOR_MOVE[choice]
        dmg = _base_damage(fighter, stat, rng)
        dmg *= {"strike": 1.0, "outwit": 0.95, "guard": 0.5, "gamble": 1.0}[choice]
        if choice == "gamble":
            dmg *= rng.uniform(0.5, 1.6 + stats["greed"] / 250)
        out["dmg"] = dmg
        return out

    effect = fighter["special"]["effect"]
    if effect == "beam":
        stat = "courage" if stats["courage"] >= stats["intelligence"] else "intelligence"
        out["dmg"] = _base_damage(fighter, stat, rng) * 2.0 * bonus
        out["pierce"] = True
    elif effect == "spell":
        out["dmg"] = _base_damage(fighter, "intelligence", rng) * 1.7 * bonus
        out["pierce"] = True
    elif effect == "burn":
        out["dmg"] = _base_damage(fighter, "courage", rng) * 1.0 * bonus
        out["burn"] = BURN_TURNS
    elif effect == "heal":
        out["dmg"] = _base_damage(fighter, "loyalty", rng) * 0.8 * bonus
        out["heal"] = round((16 + stats["loyalty"] * 0.14) * bonus)
    elif effect == "shield":
        out["dmg"] = _base_damage(fighter, "loyalty", rng) * 0.8 * bonus
        out["shield"] = round((16 + stats["loyalty"] * 0.12) * bonus)
    elif effect == "fortune":
        out["dmg"] = _base_damage(fighter, "greed", rng) * rng.uniform(0.6, 2.8) * bonus
    else:  # confuse
        out["dmg"] = _base_damage(fighter, "intelligence", rng) * 1.0 * bonus
        out["daze"] = True
    return out


MOD = {"win": (1.5, 0.5), "lose": (0.5, 1.5), "neutral": (1.0, 1.0), "clash": (0.8, 0.8)}


def choose_rival_move(battle: Dict[str, Any], rng: random.Random) -> str:
    """The rival's pick: favours its strongest stats, sometimes reads you."""
    enemy = battle["rival"]
    if not enemy["special_used"]:
        late = battle["round"] >= battle["max_rounds"] - 1
        hurt = enemy["hp"] < enemy["max_hp"] * 0.45
        if hurt or late or (battle["round"] >= 3 and rng.random() < 0.4):
            return SPECIAL

    last = battle["history"][-1]["p_move"] if battle["history"] else None
    read_chance = min(0.6, 0.30 + 0.02 * enemy["level"])
    if last in MOVES and rng.random() < read_chance:
        return counter_to(last)  # assumes you repeat yourself

    weights = [enemy["stats"][STAT_FOR_MOVE[m]] + 10 for m in MOVES]
    return rng.choices(MOVES, weights=weights, k=1)[0]


def rival_intent(state: Dict[str, Any]):
    """
    What the rival will do this round, and the hint shown to the player.
    Deterministic from the battle seed, so the true move is never sent to the
    browser. The hint is right 55% of the time.
    """
    rng = random.Random(f"{state['seed']}:{state['round']}")
    move = choose_rival_move(state, rng)
    if rng.random() < HINT_ACCURACY:
        hint = move
    else:
        hint = rng.choice([m for m in MOVES if m != move])
    return move, hint


def _headline(rel: str, p_choice: str, r_choice: str, pn: str, rn: str, pm: Dict, rm: Dict) -> str:
    if p_choice == SPECIAL and r_choice == SPECIAL:
        return f"Signature clash! {pm['name']} meets {rm['name']}"
    if p_choice == SPECIAL:
        return f"{pm['name']}! ({pm['source']})"
    if r_choice == SPECIAL:
        return f"{rn} unleashes {rm['name']}!"
    if rel == "win":
        return f"Counter! {MOVE_LABEL[p_choice]} beats {MOVE_LABEL[r_choice]}"
    if rel == "lose":
        return f"Countered! {MOVE_LABEL[r_choice]} beats {MOVE_LABEL[p_choice]}"
    if rel == "clash":
        return f"Clash! Both chose {MOVE_LABEL[p_choice]}"
    return f"{MOVE_LABEL[p_choice]} meets {MOVE_LABEL[r_choice]}: a trade of blows"


def play_round(battle: Dict[str, Any], move: str, rng: Optional[random.Random] = None) -> Dict[str, Any]:
    """
    Resolve one round. Returns {"battle": new state, "round": round summary}.
    `move` is one of MOVES or "special".
    """
    rng = rng or random.Random()
    if battle.get("finished"):
        raise ValueError("Battle already finished")
    if move != SPECIAL and move not in MOVES:
        raise ValueError("Unknown move")

    state = _copy(battle)
    P, R = state["player"], state["rival"]

    if move == SPECIAL and P["special_used"]:
        raise ValueError("Signature move already used")

    r_choice, _ = rival_intent(state)
    p_choice = move

    p_atk = _attack(P, p_choice, rng)
    r_atk = _attack(R, r_choice, rng)

    cycle = p_choice != SPECIAL and r_choice != SPECIAL
    rel = relation(p_choice, r_choice) if cycle else "special"
    if cycle:
        p_mult, r_mult = MOD[rel]
        p_atk["dmg"] *= p_mult
        r_atk["dmg"] *= r_mult

    # Dazed fighters hit softer this round
    if P["dazed"]:
        p_atk["dmg"] *= 0.6
        P["dazed"] = False
    if R["dazed"]:
        r_atk["dmg"] *= 0.6
        R["dazed"] = False

    def guarded(defender_choice: str, attacker_atk: Dict, rel_for_defender: str) -> float:
        if defender_choice == "guard" and not attacker_atk["pierce"] and rel_for_defender != "lose":
            return 0.6
        return 1.0

    p_in = r_atk["dmg"] * guarded(p_choice, r_atk, rel if cycle else "special")
    r_in = p_atk["dmg"] * guarded(r_choice, p_atk, {"win": "lose", "lose": "win"}.get(rel, rel) if cycle else "special")

    def soak(fighter: Dict[str, Any], dmg: float) -> float:
        absorbed = min(fighter["shield"], dmg)
        fighter["shield"] = int(round(fighter["shield"] - absorbed))
        return dmg - absorbed

    p_taken = int(round(soak(P, p_in)))
    r_taken = int(round(soak(R, r_in)))

    P["hp"] = P["hp"] - p_taken
    R["hp"] = R["hp"] - r_taken

    notes: List[str] = []
    p_healed = r_healed = 0
    if p_atk["heal"]:
        p_healed = min(p_atk["heal"], max(0, P["max_hp"] - max(0, P["hp"])))
        P["hp"] += p_healed
    if r_atk["heal"]:
        r_healed = min(r_atk["heal"], max(0, R["max_hp"] - max(0, R["hp"])))
        R["hp"] += r_healed
    if p_atk["shield"]:
        P["shield"] += p_atk["shield"]
        notes.append(f"{P['name']} raises a barrier ({p_atk['shield']})")
    if r_atk["shield"]:
        R["shield"] += r_atk["shield"]
        notes.append(f"{R['name']} raises a barrier ({r_atk['shield']})")
    if p_atk["burn"]:
        R["burn"] = BURN_TURNS
        notes.append(f"{R['name']} is burning")
    if r_atk["burn"]:
        P["burn"] = BURN_TURNS
        notes.append(f"{P['name']} is burning")
    if p_atk["daze"]:
        R["dazed"] = True
        notes.append(f"{R['name']} is dazed")
    if r_atk["daze"]:
        P["dazed"] = True
        notes.append(f"{P['name']} is dazed")

    p_burn_hit = r_burn_hit = 0
    if P["burn"] > 0:
        P["hp"] -= BURN_DAMAGE
        P["burn"] -= 1
        p_burn_hit = BURN_DAMAGE
    if R["burn"] > 0:
        R["hp"] -= BURN_DAMAGE
        R["burn"] -= 1
        r_burn_hit = BURN_DAMAGE

    if p_choice == SPECIAL:
        P["special_used"] = True
    if r_choice == SPECIAL:
        R["special_used"] = True

    summary = {
        "round": state["round"],
        "p_move": p_choice,
        "r_move": r_choice,
        "relation": rel,
        "headline": _headline(rel, p_choice, r_choice, P["name"], R["name"], P["special"], R["special"]),
        "p_dealt": r_taken,          # damage the player dealt
        "r_dealt": p_taken,          # damage the rival dealt
        "p_healed": p_healed,
        "r_healed": r_healed,
        "p_burn": p_burn_hit,
        "r_burn": r_burn_hit,
        "p_hp": max(0, P["hp"]),
        "r_hp": max(0, R["hp"]),
        "notes": notes,
    }
    state["history"].append(summary)

    # Is it over?
    ko = P["hp"] <= 0 or R["hp"] <= 0
    last_round = state["round"] >= state["max_rounds"]
    if ko or last_round:
        state["finished"] = True
        if P["hp"] != R["hp"]:
            state["won"] = P["hp"] > R["hp"]
        else:
            state["won"] = _power(P) >= _power(R)
        P["hp"] = max(0, P["hp"])
        R["hp"] = max(0, R["hp"])
        summary["p_hp"], summary["r_hp"] = P["hp"], R["hp"]
        summary["ko"] = ko
    else:
        state["round"] += 1
        state["hint"] = rival_intent(state)[1]

    if state["finished"]:
        state["hint"] = None

    return {"battle": state, "round": summary}


def _power(fighter: Dict[str, Any]) -> float:
    s = fighter["stats"]
    return s["courage"] + s["intelligence"] * 1.2 + s["loyalty"] * 0.6 + s["greed"] * 0.4


def _copy(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _copy(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_copy(v) for v in obj]
    return obj


def recap_prompt(battle: Dict[str, Any]) -> str:
    """Prompt for a short, dramatic recap of a finished battle."""
    P, R = battle["player"], battle["rival"]
    lines = []
    for h in battle["history"]:
        lines.append(
            f"Round {h['round']}: {h['headline']} "
            f"(you dealt {h['p_dealt']}, took {h['r_dealt']}; HP {h['p_hp']} vs {h['r_hp']})"
        )
    outcome = "WON" if battle["won"] else "LOST"
    ko = battle["history"][-1].get("ko")
    return (
        f"A turn-based battle just ended in the CHOG ARENA.\n\n"
        f"{P['name']} ({P['special']['name']} from {P['special']['source']}) {outcome} against "
        f"{R['name']} ({R['special']['name']} from {R['special']['source']}).\n"
        f"{'It ended in a knockout.' if ko else 'It went the distance and was decided on remaining HP.'}\n\n"
        f"Round log:\n" + "\n".join(lines) + "\n\n"
        "Write a dramatic 2-3 sentence recap in the style of a fighting game announcer. "
        "Mention the signature moves and the turning point. No markdown, plain prose."
    )