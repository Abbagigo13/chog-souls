export default function ProgressBar({ value, max = 100 }) {
  const percent = Math.min(100, (value / max) * 100);
  return (
    <div className="progress">
      <div className="progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}