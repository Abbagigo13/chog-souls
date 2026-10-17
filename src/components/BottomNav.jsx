// src/components/BottomNav.jsx
const items = [
  ["dashboard", "SOUL"],
  ["talk", "TALK"],
  ["quest", "QUEST"],
  ["arena", "ARENA"],
  ["leaderboard", "RANKS"],
  ["chog", "$CHOG"],
  ["timeline", "HISTORY"],
];

export default function BottomNav({ page, navigate }) {
  return (
    <nav className="bottom-nav">
      {items.map(([id, label]) => (
        <button
          key={id}
          className={page === id ? "active" : ""}
          onClick={() => navigate(id)}
        >
          <span className="nav-dot" />
          {label}
        </button>
      ))}
    </nav>
  );
}