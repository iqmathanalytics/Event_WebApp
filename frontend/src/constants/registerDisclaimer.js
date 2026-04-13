/**
 * Registration acknowledgment shown at sign-up. When Terms and Privacy URLs are live,
 * add links from the register page to those routes.
 */
export const REGISTRATION_DISCLAIMER_PARAGRAPHS = [
  "By registering for an account on Yay! Eventz, you confirm that the information you provide is accurate and that you are authorized to use the email address and telephone number (if provided) associated with this registration.",
  "You agree to comply with applicable laws and with our community standards for listings, bookings, promotions, and any other content you submit. We may update platform policies from time to time; where permitted by law, continued use of your account after reasonable notice may constitute acceptance of material changes.",
  "You consent to receive service-related and transactional communications—including account, security, and booking-related messages—at the contact details you provide. Any marketing communications will respect your preferences and applicable regulations.",
  "You are responsible for safeguarding your password and for all activity that occurs under your credentials. Please notify us without undue delay if you suspect unauthorized access to your account.",
  "Your relationship with Yay! Eventz is governed by our Terms of Service and Privacy Policy, which describe how the platform operates and how personal data is collected, used, and protected. Those documents, once published on this site, form part of your agreement with us."
];

/** Single-block export for any legacy consumers */
export const REGISTRATION_DISCLAIMER_TEXT = REGISTRATION_DISCLAIMER_PARAGRAPHS.join(" ");
