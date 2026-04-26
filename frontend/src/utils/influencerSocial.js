export function parseInfluencerSocialLinks(value) {
  if (!value) {
    return { instagram: "", youtube: "" };
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return {
      instagram: String(value.instagram || "").trim(),
      youtube: String(value.youtube || "").trim()
    };
  }
  try {
    const parsed = JSON.parse(value);
    return {
      instagram: String(parsed?.instagram || "").trim(),
      youtube: String(parsed?.youtube || "").trim()
    };
  } catch (_err) {
    return { instagram: "", youtube: "" };
  }
}
