/**
 * Short, device-specific copy when Apple Pay / Google Pay is not offered by Stripe.
 */
export function getWalletCheckoutEnvironment() {
  if (typeof navigator === "undefined") {
    return { isIOS: false, isAndroid: false, inAppBrowser: false };
  }
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const inAppBrowser = /FBAN|FBAV|Instagram|Twitter|Line\/|LinkedInApp|Snapchat|wv\)/i.test(ua);
  return { isIOS, isAndroid, inAppBrowser };
}

export function getWalletCheckoutHint(expressMethods) {
  if (!expressMethods) {
    return null;
  }

  const { isIOS, isAndroid, inAppBrowser } = getWalletCheckoutEnvironment();
  const hasApple = Boolean(expressMethods.applePay);
  const hasGoogle = Boolean(expressMethods.googlePay);

  if (inAppBrowser && (!hasApple || !hasGoogle)) {
    return "Apple Pay and Google Pay do not work inside this app’s browser. Tap ⋯ → Open in Safari (iPhone) or Chrome (Android), then try again.";
  }

  if (isIOS && !hasApple) {
    return "Add a card to Apple Wallet, then use Apple Pay above or enter your card below. (Google Pay is not available in Safari on iPhone.)";
  }

  if (isAndroid && !hasGoogle) {
    return "For Google Pay: use Chrome (not “Desktop site”), add a card in Google Wallet (pay.google.com), or pay by card / Amazon Pay below.";
  }

  if (!hasGoogle && !hasApple) {
    return "Use card or Amazon Pay below. Apple Pay needs Safari + Apple Wallet; Google Pay needs Chrome + Google Wallet.";
  }

  if (!hasGoogle && !isIOS) {
    return "Google Pay needs Chrome with a card in Google Wallet. You can also use Apple Pay (Safari/Mac), card, or Amazon Pay below.";
  }

  return null;
}
