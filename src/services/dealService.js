const { listDeals } = require("../models/dealModel");
const { getMonthRange } = require("../utils/dateRange");

async function fetchDeals(query, user) {
  const includePremium = Boolean(user);
  const cityId = query.city ? Number(query.city) : null;
  const categoryId = query.category ? Number(query.category) : null;
  const { monthStart, monthEnd } = getMonthRange(query.month || null);

  const rows = await listDeals({
    cityId,
    categoryId,
    includePremium,
    date: query.date || null,
    monthStart,
    monthEnd,
    priceMin: query.price_min ? Number(query.price_min) : null,
    priceMax: query.price_max ? Number(query.price_max) : null,
    q: query.q || query.search || null,
    onlyActive: query.only_active !== "false",
    sortBy: query.sort || "newest",
    sortOrder: query.sort_order || "asc"
  });

  return rows;
}

module.exports = { fetchDeals };
