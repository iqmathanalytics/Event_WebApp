/**
 * Google OAuth users get a minimal row until they finish the same onboarding
 * as email registration. Detect incomplete profiles after sign-in.
 */
export function needsGoogleProfileCompletion(fetchMeResponse) {
  const u = fetchMeResponse?.data;
  if (!u) {
    return false;
  }
  if (String(u.auth_provider || "").toLowerCase() !== "google") {
    return false;
  }
  const ob = u.onboarding;
  if (!ob) {
    return true;
  }
  const hasCity = ob.city_id != null && Number(ob.city_id) > 0;
  const hasMobile = String(ob.mobile_number || u.mobile_number || "").trim().length >= 8;
  const hasInterests = Array.isArray(ob.interests) && ob.interests.length >= 1;
  return !hasCity || !hasMobile || !hasInterests;
}
