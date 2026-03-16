const { listServices } = require("../models/serviceModel");
const { getDateRange, getMonthRange } = require("../utils/dateRange");

async function fetchServices(query) {
  const { dateStart, dateEnd } = getDateRange(query.date || null);
  const { monthStart, monthEnd } = getMonthRange(query.month || null);
  return listServices({
    cityId: query.city ? Number(query.city) : null,
    categoryId: query.category ? Number(query.category) : null,
    dateStart,
    dateEnd,
    monthStart,
    monthEnd,
    priceMin: query.price_min ? Number(query.price_min) : null,
    priceMax: query.price_max ? Number(query.price_max) : null,
    q: query.q || query.search || null,
    sortBy: query.sort || "popularity",
    sortOrder: query.sort_order || "desc"
  });
}

module.exports = { fetchServices };
