function getMonthRange(month) {
  if (!month) {
    return { monthStart: null, monthEnd: null };
  }

  const start = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(start.getTime())) {
    return { monthStart: null, monthEnd: null };
  }

  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));

  const monthStart = start.toISOString().slice(0, 10);
  const monthEnd = end.toISOString().slice(0, 10);
  return { monthStart, monthEnd };
}

function getDateRange(date) {
  if (!date) {
    return { dateStart: null, dateEnd: null };
  }
  const start = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) {
    return { dateStart: null, dateEnd: null };
  }
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1));
  return {
    dateStart: start.toISOString().slice(0, 10),
    dateEnd: end.toISOString().slice(0, 10)
  };
}

module.exports = { getMonthRange, getDateRange };
