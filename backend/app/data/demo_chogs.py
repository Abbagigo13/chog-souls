# backend/app/data/demo_chogs.py
"""
Saved real Chogs used by "Try a Demo Chog" only when the live collection
data cannot be reached. Normally a random Chog is fetched from the collection.
Stats are worked out from the traits by the app.
"""


def _traits(attributes):
    return [{"name": name, "value": value} for name, value in attributes.items()]


DEMO_CHOGS = [
    {
        "tokenId": 1468,
        "name": "CHOG #1468",
        "imageUrl": "chog:1468",
        "traits": _traits({
            "Background": "Rosie",
            "Base": "Origin",
            "Skin": "Pink",
            "Side": "Right",
            "Body": "Red Tuxedo",
            "Mouth": "Rainbow Puke",
            "Eyes": "Teary",
            "Head": "Wizard Hat",
            "Form": "Chog",
            "Tier": "Common",
            "Naked": "No",
        }),
    },
    {
        "tokenId": 1816,
        "name": "CHOG #1816",
        "imageUrl": "chog:1816",
        "traits": _traits({
            "Background": "Aqua",
            "Aura": "Clean",
            "Base": "Origin",
            "Skin": "Origin",
            "Side": "Right",
            "Body": "Pink Tuxedo",
            "Mouth": "Worried",
            "Eyes": "Happy",
            "Head": "Balls Cap",
            "Form": "Chog",
            "Tier": "Common",
            "Naked": "No",
        }),
    },
]