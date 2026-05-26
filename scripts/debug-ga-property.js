require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const { BetaAnalyticsDataClient } = require("@google-analytics/data");

function parseCredentials() {
  const raw = process.env.GA_SERVICE_ACCOUNT_JSON?.trim();
  return raw ? JSON.parse(raw) : null;
}

async function main() {
  const propertyId = String(process.env.GA4_PROPERTY_ID || "").replace(/^properties\//, "");
  const creds = parseCredentials();
  if (!propertyId || !creds) {
    console.error("GA not configured");
    process.exit(1);
  }
  const client = new BetaAnalyticsDataClient({ credentials: creds });
  const property = `properties/${propertyId}`;

  const [std] = await client.runReport({
    property,
    metrics: [{ name: "screenPageViews" }],
    dateRanges: [{ startDate: "today", endDate: "today" }]
  });
  console.log("Property screenPageViews today:", std.rows?.[0]?.metricValues?.[0]?.value || "0");

  try {
    const [rt] = await client.runRealtimeReport({
      property,
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }]
    });
    console.log("Property realtime:", rt.rows?.[0]?.metricValues?.map((m) => m.value).join(", ") || "0");
  } catch (err) {
    console.log("Property realtime ERROR:", err?.message || err);
  }

  try {
    const [rtPaths] = await client.runRealtimeReport({
      property,
      dimensions: [{ name: "unifiedScreenName" }],
      metrics: [{ name: "screenPageViews" }],
      limit: 15
    });
    console.log("\nTop realtime screen names:");
    for (const row of rtPaths.rows || []) {
      console.log(
        " ",
        row.dimensionValues?.[0]?.value,
        "→",
        row.metricValues?.[0]?.value
      );
    }
  } catch (err) {
    console.log("Realtime screens ERROR:", err?.message || err);
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
