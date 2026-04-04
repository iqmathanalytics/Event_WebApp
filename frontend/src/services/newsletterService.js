import api from "./api";

export async function subscribeNewsletter({ city_id }) {
  const response = await api.post("/newsletter/subscribe", {
    ...(city_id != null && city_id !== "" ? { city_id: Number(city_id) } : {})
  });
  return response.data;
}

/**
 * Guest newsletter signup (no account). Server stores name, optional city, optional interests.
 */
export async function subscribeNewsletterGuest(body) {
  const response = await api.post("/newsletter/subscribe/guest", {
    email: String(body.email || "").trim(),
    first_name: String(body.first_name || "").trim(),
    last_name: String(body.last_name || "").trim(),
    ...(body.city_id != null && body.city_id !== ""
      ? { city_id: Number(body.city_id) }
      : {}),
    ...(body.interested_in != null && String(body.interested_in).trim() !== ""
      ? { interested_in: String(body.interested_in).trim() }
      : {})
  });
  return response.data;
}

function parseSubscribedPayload(payload) {
  let cur = payload;
  for (let depth = 0; depth < 6 && cur && typeof cur === "object"; depth += 1) {
    if ("subscribed" in cur && cur.subscribed !== undefined) {
      const s = cur.subscribed;
      return {
        subscribed:
          s === true || s === 1 || s === "1" || s === "true" || String(s).toLowerCase() === "true"
      };
    }
    if (cur.data != null && typeof cur.data === "object") {
      cur = cur.data;
    } else {
      break;
    }
  }
  return { subscribed: false };
}

/** One in-flight GET per access token so duplicate <NewsletterSignup> mounts do not race; avoids cross-user cache. */
let statusInflight = null;
let statusInflightToken = null;

/** Clear dedupe state after login/logout or when forcing a fresh `/newsletter/me/status` read. */
export function invalidateNewsletterStatusCache() {
  statusInflight = null;
  statusInflightToken = null;
}

/**
 * Returns `{ subscribed: boolean }` from the API (unwraps nested `{ success, data }` envelopes).
 * Subscription is account-wide — never pass filter city here.
 */
export async function fetchMyNewsletterStatus() {
  const token =
    typeof localStorage !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (!token) {
    return { subscribed: false };
  }
  if (statusInflight && statusInflightToken === token) {
    return statusInflight;
  }
  statusInflightToken = token;
  statusInflight = api
    .get("/newsletter/me/status", {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      },
      params: { _: Date.now() }
    })
    .then((response) => {
      statusInflight = null;
      return parseSubscribedPayload(response?.data);
    })
    .catch((err) => {
      statusInflight = null;
      statusInflightToken = null;
      throw err;
    });
  return statusInflight;
}
