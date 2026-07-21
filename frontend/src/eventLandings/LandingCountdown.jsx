import { useEffect, useState } from "react";

function pad(n) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function getRemaining(targetMs) {
  const diff = Math.max(0, targetMs - Date.now());
  const totalSec = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    done: diff <= 0,
  };
}

export default function LandingCountdown({ eventDateIso }) {
  const targetMs = eventDateIso ? Date.parse(eventDateIso) : NaN;
  const [parts, setParts] = useState(() =>
    Number.isFinite(targetMs) ? getRemaining(targetMs) : null
  );

  useEffect(() => {
    if (!Number.isFinite(targetMs)) {
      setParts(null);
      return undefined;
    }
    setParts(getRemaining(targetMs));
    const id = window.setInterval(() => {
      setParts(getRemaining(targetMs));
    }, 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  if (!parts) return null;

  if (parts.done) {
    return (
      <div className="el-countdown" aria-live="polite">
        <div className="el-countdown__cell" style={{ gridColumn: "1 / -1" }}>
          <span className="el-countdown__value">LIVE</span>
          <span className="el-countdown__label">The night is here</span>
        </div>
      </div>
    );
  }

  return (
    <div className="el-countdown" aria-live="polite">
      {[
        ["Days", parts.days],
        ["Hours", pad(parts.hours)],
        ["Mins", pad(parts.minutes)],
        ["Secs", pad(parts.seconds)],
      ].map(([label, value]) => (
        <div className="el-countdown__cell" key={label}>
          <span className="el-countdown__value">{value}</span>
          <span className="el-countdown__label">{label}</span>
        </div>
      ))}
    </div>
  );
}
