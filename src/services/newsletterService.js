const {
  subscribeNewsletter,
  getActiveSubscription,
  getSubscriberSyncProfile
} = require("../models/newsletterModel");
const { syncMailchimpSubscriber } = require("../utils/emailIntegrations");

async function subscribe(payload, user) {
  const cityId = payload.city_id ? Number(payload.city_id) : null;
  const existing = await getActiveSubscription({
    email: user.email,
    cityId
  });
  if (existing?.is_active) {
    return { alreadySubscribed: true };
  }

  await subscribeNewsletter({
    email: user.email,
    cityId
  });
  const profile = await getSubscriberSyncProfile({
    email: user.email,
    fallbackCityId: cityId
  });
  const parts = String(profile?.user_name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = String(profile?.first_name || parts.slice(0, -1).join(" ") || parts[0] || "").trim();
  const lastName = String(profile?.last_name || (parts.length > 1 ? parts[parts.length - 1] : "")).trim();
  const cityName = String(profile?.onboarding_city_name || profile?.fallback_city_name || "").trim();
  const phoneNumber = String(profile?.mobile_number || "").trim();

  const mc = await syncMailchimpSubscriber({
    email: user.email,
    firstName,
    lastName,
    cityName,
    phoneNumber
  });
  if (mc.error && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn("[newsletterService] Mailchimp sync:", mc.error);
  }
  return { alreadySubscribed: false };
}

async function getSubscriptionStatus(payload, user) {
  const cityId = payload.city_id ? Number(payload.city_id) : null;
  const existing = await getActiveSubscription({
    email: user.email,
    cityId
  });
  return {
    subscribed: Boolean(existing?.is_active)
  };
}

module.exports = { subscribe, getSubscriptionStatus };
