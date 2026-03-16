const { subscribeNewsletter } = require("../models/newsletterModel");

async function subscribe(payload) {
  await subscribeNewsletter({
    email: payload.email,
    cityId: payload.city_id ? Number(payload.city_id) : null
  });
}

module.exports = { subscribe };
