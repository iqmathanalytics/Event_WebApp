export function parseInfluencerSocialLinks(value) {
  if (!value) {
    return { instagram: "", facebook: "", youtube: "" };
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return {
      instagram: String(value.instagram || "").trim(),
      facebook: String(value.facebook || "").trim(),
      youtube: String(value.youtube || "").trim()
    };
  }
  try {
    const parsed = JSON.parse(value);
    return {
      instagram: String(parsed?.instagram || "").trim(),
      facebook: String(parsed?.facebook || "").trim(),
      youtube: String(parsed?.youtube || "").trim()
    };
  } catch (_err) {
    return { instagram: "", facebook: "", youtube: "" };
  }
}

export function normalizeInstagramProfileUrl(instagramUrl) {
  const raw = String(instagramUrl || "").trim();
  if (!raw) return "";
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withProto);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "instagram.com") return "";
    const username = u.pathname.replace(/^\/+/, "").split("/")[0];
    const cleaned = String(username || "").replace(/^@/, "").trim();
    if (!cleaned) return "";
    return `https://www.instagram.com/${encodeURIComponent(cleaned)}/`;
  } catch (_err) {
    return "";
  }
}

export function normalizeInstagramEmbedSrc(instagramUrl) {
  const profile = normalizeInstagramProfileUrl(instagramUrl);
  if (!profile) return "";
  return `${profile}embed`;
}

export function normalizeFacebookPageUrl(facebookUrl) {
  const raw = String(facebookUrl || "").trim();
  if (!raw) return "";
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withProto);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "facebook.com" && host !== "m.facebook.com") return "";
    const firstPath = u.pathname.replace(/^\/+/, "").split("/")[0];
    if (!firstPath) return "";
    if (firstPath.toLowerCase() === "profile.php") {
      const profileId = u.searchParams.get("id");
      if (!profileId) return "";
      return `https://www.facebook.com/profile.php?id=${encodeURIComponent(profileId)}`;
    }
    return `https://www.facebook.com/${firstPath}/`;
  } catch (_err) {
    return "";
  }
}

export function normalizeYoutubeUrl(youtubeUrl) {
  const raw = String(youtubeUrl || "").trim();
  if (!raw) return "";
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withProto);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (!["youtube.com", "m.youtube.com", "youtu.be"].includes(host)) return "";
    return u.toString();
  } catch (_err) {
    return "";
  }
}
