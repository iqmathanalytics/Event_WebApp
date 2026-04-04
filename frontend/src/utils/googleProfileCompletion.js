/**
 * Previously used to force Google users through an extra onboarding screen.
 * Flow is now: sign in → dashboard; profile details can be added from My Hub anytime.
 */
export function needsGoogleProfileCompletion(_fetchMeResponse) {
  return false;
}
