const {
  subscribeNewsletter,
  getSubscriberSyncProfile,
  cityExists,
  hasActiveSubscriptionForEmail,
  hasActiveSubscriptionForUserId,
  getFirstInactiveSubscriberIdForEmail,
  reactivateSubscriberById,
  linkNewsletterSubscriberToUser
} = require("../models/newsletterModel");
const { findUserById } = require("../models/userModel");
const { pool } = require("../config/db");
const ApiError = require("../utils/ApiError");
const { syncMailchimpSubscriber } = require("../utils/emailIntegrations");

/**
 * Newsletter rows are keyed by email string. JWT/client user objects can omit email or differ from DB.
 * Always use the email from `users` so guest newsletter rows match after signup.
 */
function coerceAuthUserId(authUser) {
  if (!authUser || typeof authUser !== "object") {
    return null;
  }
  const raw = authUser.id ?? authUser.userId ?? authUser.user_id ?? authUser.sub;
  if (raw == null) {
    return null;
  }
  if (typeof raw === "bigint") {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const n = typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function resolveEmailForNewsletterUser(authUser) {
  const uid = coerceAuthUserId(authUser);
  if (uid != null) {
    const dbUser = await findUserById(uid);
    const fromDb = dbUser?.email != null ? String(dbUser.email).trim().toLowerCase() : "";
    if (fromDb) {
      return fromDb;
    }
  }
  const fromJwt = authUser.email != null ? String(authUser.email).trim().toLowerCase() : "";
  return fromJwt;
}

async function getCityLabelForSync(cityId) {
  if (!cityId) {
    return "";
  }
  const [rows] = await pool.query(`SELECT name, state FROM cities WHERE id = ? LIMIT 1`, [cityId]);
  const r = rows[0];
  if (!r) {
    return "";
  }
  return r.state ? `${r.name}, ${r.state}` : String(r.name || "");
}

async function subscribe(payload, user) {
  const cityId = payload.city_id ? Number(payload.city_id) : null;
  const uid = coerceAuthUserId(user);
  // Guest-then-account: row exists under the same email as users.email — match by user id + join, not string resolution alone.
  if (uid != null && (await hasActiveSubscriptionForUserId(uid))) {
    return { alreadySubscribed: true };
  }
  const email = await resolveEmailForNewsletterUser(user);
  if (!email) {
    throw new ApiError(400, "Could not resolve account email for newsletter.");
  }
  // Match guest behavior: one active row per email (any city), so “already subscribed” UI is correct
  // even when header city differs from the row’s city_id.
  if (await hasActiveSubscriptionForEmail(email)) {
    return { alreadySubscribed: true };
  }

  await subscribeNewsletter({
    email,
    cityId,
    firstName: null,
    lastName: null,
    interestsNote: null
  });
  if (uid != null && email) {
    await linkNewsletterSubscriberToUser(uid, email).catch(() => {});
  }
  const profile = await getSubscriberSyncProfile({
    email,
    fallbackCityId: cityId
  });
  const parts = String(profile?.user_name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = String(profile?.first_name || parts.slice(0, -1).join(" ") || parts[0] || "").trim();
  const lastName = String(profile?.last_name || (parts.length > 1 ? parts[parts.length - 1] : "")).trim();
  const cityName = String(profile?.onboarding_city_name || profile?.fallback_city_name || "").trim();
  const phoneNumber = String(profile?.mobile_number || "").trim();

  const mc = await syncMailchimpSubscriber({
    email,
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

async function getSubscriptionStatus(_payload, user) {
  if (!user || typeof user !== "object") {
    return { subscribed: false };
  }
  const uid = coerceAuthUserId(user);
  if (uid != null && (await hasActiveSubscriptionForUserId(uid))) {
    return { subscribed: true };
  }
  const email = await resolveEmailForNewsletterUser(user);
  if (email && (await hasActiveSubscriptionForEmail(email))) {
    return { subscribed: true };
  }
  return { subscribed: false };
}

async function subscribeGuest(payload) {
  const email = String(payload.email || "").trim().toLowerCase();
  const firstName = String(payload.first_name || "").trim();
  const lastName = String(payload.last_name || "").trim();
  const cityId = payload.city_id != null && payload.city_id !== "" ? Number(payload.city_id) : null;
  const interestedIn =
    payload.interested_in != null && String(payload.interested_in).trim() !== ""
      ? String(payload.interested_in).trim().slice(0, 500)
      : null;

  if (cityId) {
    const ok = await cityExists(cityId);
    if (!ok) {
      throw new ApiError(400, "City not found.", [{ path: "body.city_id", message: "Invalid city id" }]);
    }
  }

  // One subscription per email for guests: do not insert a second row when city differs from a prior signup.
  if (await hasActiveSubscriptionForEmail(email)) {
    return { alreadySubscribed: true };
  }

  const inactiveId = await getFirstInactiveSubscriberIdForEmail(email);
  if (inactiveId != null) {
    await reactivateSubscriberById({
      id: inactiveId,
      email,
      cityId,
      firstName,
      lastName,
      interestsNote: interestedIn
    });
    const cityName = await getCityLabelForSync(cityId);
    const mc = await syncMailchimpSubscriber({
      email,
      firstName,
      lastName,
      cityName,
      phoneNumber: ""
    });
    if (mc.error && process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[newsletterService] Mailchimp sync (guest):", mc.error);
    }
    return { alreadySubscribed: false };
  }

  await subscribeNewsletter({
    email,
    cityId,
    firstName,
    lastName,
    interestsNote: interestedIn
  });

  const cityName = await getCityLabelForSync(cityId);
  const mc = await syncMailchimpSubscriber({
    email,
    firstName,
    lastName,
    cityName,
    phoneNumber: ""
  });
  if (mc.error && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn("[newsletterService] Mailchimp sync (guest):", mc.error);
  }
  return { alreadySubscribed: false };
}

module.exports = { subscribe, getSubscriptionStatus, subscribeGuest };
