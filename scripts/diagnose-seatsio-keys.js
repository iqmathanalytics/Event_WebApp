/**
 * Diagnose Seats.io key pairing and buyer chart config.
 * Usage: node scripts/diagnose-seatsio-keys.js [eventId]
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const { SeatsioClient, Region } = require("seatsio");

const eventId = Number(process.argv[2] || 2948999);
const keyA = String(process.env.SEATSIO_SECRET_KEY || "").trim();
const keyB = String(process.env.SEATSIO_WORKSPACE_KEY || "").trim();
const region = Region.NA();

async function trySecret(label, secret, workspacePublic) {
  const client = new SeatsioClient(region, secret);
  const out = { label, secret: secret.slice(0, 8) + "…", workspacePublic: workspacePublic.slice(0, 8) + "…" };
  try {
    const token = await client.holdTokens.create(15);
    out.holdTokenOk = true;
    out.tokenWorkspaceKey = token.workspaceKey;
    out.holdToken = token.holdToken?.slice(0, 12) + "…";
    out.workspaceMatch = token.workspaceKey === workspacePublic;
  } catch (err) {
    out.holdTokenOk = false;
    out.holdTokenError = err?.errors?.[0]?.code || err?.message;
  }

  try {
    const ws = await client.workspaces.retrieve(workspacePublic);
    out.retrieveWorkspaceOk = true;
    out.workspaceName = ws.name;
  } catch (err) {
    out.retrieveWorkspaceOk = false;
    out.retrieveWorkspaceError = err?.errors?.[0]?.code || err?.message;
  }

  for (const eventKey of [
    `bmt-p-e${eventId}`,
    `bmt-event-${eventId}`,
    `bmt-d-e${eventId}`
  ]) {
    try {
      const ev = await client.events.retrieve(eventKey);
      out[`event_${eventKey}`] = { ok: true, chartKey: ev.chartKey || ev.key };
    } catch (err) {
      out[`event_${eventKey}`] = { ok: false, code: err?.errors?.[0]?.code };
    }
  }

  return out;
}

(async () => {
  console.log("Configured SEATSIO_SECRET_KEY:", keyA.slice(0, 8) + "…");
  console.log("Configured SEATSIO_WORKSPACE_KEY:", keyB.slice(0, 8) + "…");
  console.log("Event id:", eventId);
  console.log("");

  const results = await Promise.all([
    trySecret("as-configured (secret=A, public=B)", keyA, keyB),
    trySecret("swapped (secret=B, public=A)", keyB, keyA)
  ]);

  console.log(JSON.stringify(results, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
