/** True when event_date is today or in the future (YYYY-MM-DD compare). */
export function isUpcomingEvent(event) {
  const dateStr = String(event?.event_date || "").slice(0, 10);
  if (!dateStr) {
    return true;
  }
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return dateStr >= todayStr;
}

export function enrichEventWithCountdown(event) {
  const dateStr = String(event.event_date || "").slice(0, 10);
  const timeStr = event.event_time ? String(event.event_time).slice(0, 5) : "00:00";
  const start = new Date(`${dateStr}T${timeStr}:00`);
  const diffMs = start.getTime() - Date.now();

  let countdownLabel = null;
  if (diffMs > 0) {
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
    const minutes = totalMinutes - days * 60 * 24 - hours * 60;

    if (days > 0) {
      countdownLabel = `${days}d`;
    } else if (hours > 0) {
      countdownLabel = `${hours}h`;
    } else if (minutes > 0) {
      countdownLabel = `${minutes}m`;
    }
  }

  return { ...event, countdownLabel };
}

export function sortEventsByPopularity(events) {
  return [...events].sort(
    (a, b) =>
      Number(b.ga_page_views_30d ?? b.popularity_score ?? 0) -
      Number(a.ga_page_views_30d ?? a.popularity_score ?? 0)
  );
}

/** Soonest event_date first (YYYY-MM-DD). */
export function sortEventsByDate(events, order = "asc") {
  return [...events].sort((a, b) => {
    const da = String(a?.event_date || "").slice(0, 10);
    const db = String(b?.event_date || "").slice(0, 10);
    if (da === db) {
      return 0;
    }
    return order === "desc" ? db.localeCompare(da) : da.localeCompare(db);
  });
}
