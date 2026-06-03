/**
 * List / register Stripe payment method domains and show wallet status (Google Pay, Apple Pay, etc.).
 *
 *   node scripts/stripe-payment-method-domains.js
 *   node scripts/stripe-payment-method-domains.js --register
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const Stripe = require("stripe");

const DEFAULT_DOMAINS = ["bookmytickets.us", "www.bookmytickets.us"];

function fmtWallet(label, wallet) {
  if (!wallet) return `${label}: (none)`;
  const status = wallet.status || "unknown";
  const err = wallet.status_details?.error_message;
  return err ? `${label}: ${status} — ${err}` : `${label}: ${status}`;
}

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error("Missing STRIPE_SECRET_KEY in .env");
    process.exit(1);
  }

  const register = process.argv.includes("--register");
  const domains = process.argv
    .slice(2)
    .filter((a) => !a.startsWith("-") && a.includes(".") && !a.includes("\\") && !a.includes("/"));
  const domainList = domains.length ? domains : DEFAULT_DOMAINS;

  const stripe = new Stripe(secret);
  const mode = secret.startsWith("sk_live") ? "LIVE" : "TEST";

  console.log(`Stripe payment method domains (${mode})\n`);

  const existing = await stripe.paymentMethodDomains.list({ limit: 100 });
  const byName = new Map(existing.data.map((d) => [d.domain_name, d]));

  for (const domain of domainList) {
    let row = byName.get(domain);
    if (!row && register) {
      console.log(`Registering ${domain}…`);
      row = await stripe.paymentMethodDomains.create({ domain_name: domain });
      byName.set(domain, row);
    }

    if (!row) {
      console.log(`MISSING  ${domain}`);
      console.log(`         Run: node scripts/stripe-payment-method-domains.js --register\n`);
      continue;
    }

    console.log(`${row.enabled ? "ENABLED" : "DISABLED"}  ${row.domain_name}  (${row.id})`);
    console.log(`         ${fmtWallet("google_pay", row.google_pay)}`);
    console.log(`         ${fmtWallet("apple_pay", row.apple_pay)}`);
    console.log(`         ${fmtWallet("amazon_pay", row.amazon_pay)}`);
    console.log("");
  }

  const extra = existing.data.filter((d) => !domainList.includes(d.domain_name));
  if (extra.length) {
    console.log("Other domains on this account:");
    for (const row of extra) {
      console.log(`  - ${row.domain_name}  google_pay=${row.google_pay?.status}`);
    }
    console.log("");
  }

  const googleInactive = domainList
    .map((d) => byName.get(d))
    .filter(Boolean)
    .some((d) => d.google_pay?.status !== "active");

  if (googleInactive || domainList.some((d) => !byName.has(d))) {
    console.log("Google Pay checklist:");
    console.log("  1. Dashboard → Settings → Payment methods → enable Google Pay (under Cards)");
    console.log("  2. Register both bookmytickets.us AND www.bookmytickets.us (checkout may use either)");
    console.log("  3. Test in Chrome (not Incognito) with a real card in https://pay.google.com");
    console.log("  4. Manifest console errors often mean inactive domain or no card in Google Wallet");
    process.exit(1);
  }

  console.log("All listed domains have google_pay status active.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
