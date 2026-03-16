const { listInfluencers } = require("../models/influencerModel");
const { getDateRange, getMonthRange } = require("../utils/dateRange");

async function fetchInfluencers(query) {
  const { dateStart, dateEnd } = getDateRange(query.date || null);
  const { monthStart, monthEnd } = getMonthRange(query.month || null);
  return listInfluencers({
    cityId: query.city ? Number(query.city) : null,
    categoryId: query.category ? Number(query.category) : null,
    dateStart,
    dateEnd,
    monthStart,
    monthEnd,
    q: query.q || query.search || null,
    sortBy: query.sort || "popularity"
  });
}

module.exports = { fetchInfluencers };
