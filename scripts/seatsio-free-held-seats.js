/**
 * Release stale held (not booked) seats on a Seats.io event.
 * Usage: node scripts/seatsio-free-held-seats.js [eventKey]
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const { SeatsioClient, Region } = require("seatsio");

const eventKey = process.argv[2] || "bmt-event-2948999";

(async () => {
  const client = new SeatsioClient(Region.NA(), process.env.SEATSIO_SECRET_KEY);
  const report = await client.eventReports.byStatus(eventKey);
  const heldLabels = [];

  for (const [status, objects] of Object.entries(report || {})) {
    const normalized = String(status).toLowerCase();
    if (!normalized.includes("hold") && normalized !== "reservedbytoken") {
      continue;
    }
    for (const obj of objects || []) {
      const label = obj?.label || obj?.id;
      if (label) {
        heldLabels.push(label);
      }
    }
  }

  if (!heldLabels.length) {
    const summary = await client.eventReports.summaryByStatus(eventKey);
    console.log("No held seats found. Status summary:", JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Releasing ${heldLabels.length} held seat(s) on ${eventKey}:`, heldLabels.join(", "));
  await client.events.release(eventKey, heldLabels, null, null, null, true);
  console.log("Done.");
})().catch((err) => {
  console.error(err?.errors || err?.message || err);
  process.exit(1);
});
