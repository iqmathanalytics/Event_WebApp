/**
 * Quick checks for wallet checkout prerequisites on production.
 *
 *   node scripts/check-payment-wallet-domains.js
 */
const DEFAULT_ORIGINS = ["https://www.bookmytickets.us", "https://bookmytickets.us"];

const APPLE_PATH = "/.well-known/apple-developer-merchantid-domain-association";

async function headOk(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return { url, ok: res.ok, status: res.status };
  } catch (err) {
    return { url, ok: false, status: err.message };
  }
}

async function main() {
  const origins = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ORIGINS;
  console.log("Payment wallet domain checks\n");

  for (const origin of origins) {
    const base = origin.replace(/\/$/, "");
    const apple = await headOk(`${base}${APPLE_PATH}`);
    console.log(
      `${apple.ok ? "OK" : "FAIL"}  Apple Pay file  ${apple.url}  (${apple.status})`
    );
    console.log(`INFO  Google Pay     ${base}  (register in Stripe → Payment method domains)`);
    console.log(`INFO  Amazon Pay     ${base}  (register in Stripe → Payment method domains)\n`);
  }

  console.log("Stripe Dashboard:");
  console.log("  Settings → Payment methods → enable Google Pay, Apple Pay, Amazon Pay");
  console.log("  Settings → Payment method domains → add bookmytickets.us + www.bookmytickets.us");
  console.log("\nTest Google Pay in Chrome on HTTPS with a card saved in Google Wallet.");
}

main();
