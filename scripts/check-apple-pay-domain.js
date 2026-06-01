/**
 * Verifies Apple Pay domain association file is reachable (required for Apple Pay on the web).
 *
 * Usage:
 *   node scripts/check-apple-pay-domain.js
 *   node scripts/check-apple-pay-domain.js https://www.bookmytickets.us
 */
const DEFAULT_ORIGINS = ["https://www.bookmytickets.us", "https://bookmytickets.us"];

const PATH = "/.well-known/apple-developer-merchantid-domain-association";

async function checkOrigin(origin) {
  const url = `${origin.replace(/\/$/, "")}${PATH}`;
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    const text = await res.text();
    const ok = res.ok && text.length > 10;
    console.log(`${ok ? "OK" : "FAIL"}  ${url}  (${res.status}, ${text.length} bytes)`);
    return ok;
  } catch (err) {
    console.log(`FAIL  ${url}  (${err.message})`);
    return false;
  }
}

async function main() {
  const origins = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ORIGINS;
  console.log("Apple Pay domain file check\n");
  const results = await Promise.all(origins.map(checkOrigin));
  const allOk = results.every(Boolean);
  if (!allOk) {
    console.log(
      "\nAdd the file from Stripe Dashboard → Settings → Payment methods → Apple Pay → Configure."
    );
    console.log("Save to: frontend/public/.well-known/apple-developer-merchantid-domain-association");
    process.exit(1);
  }
  console.log(
    "\nFile is reachable. If Apple Pay still does not appear, verify the domain in Stripe Dashboard"
  );
  console.log("(Payment method domains) and test in Safari on iPhone/Mac with a card in Wallet.");
}

main();
