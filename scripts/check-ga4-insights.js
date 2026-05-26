/**
 * Diagnose GA4 Data API + bmt_event_id for organizer Insights.
 *
 *   node scripts/check-ga4-insights.js EVENT_ID
 *   node scripts/check-ga4-insights.js EVENT_ID "Override title"
 *
 * Event title is loaded from the database when omitted (required for Realtime live users).
 */

require("dotenv").config();
const { findEventById } = require("../src/models/eventModel");
const googleAnalytics = require("../src/services/googleAnalyticsService");

async function main() {
  const eventId = process.argv[2] || process.env.GA4_TEST_EVENT_ID || "";
  const titleOverride = process.argv[3] || "";

  console.log("GA4 configured:", googleAnalytics.isConfigured());
  console.log("Property ID:", process.env.GA4_PROPERTY_ID?.trim() || "(missing)");

  if (!googleAnalytics.isConfigured()) {
    console.error("\nSet GA4_PROPERTY_ID and GA_SERVICE_ACCOUNT_JSON in .env");
    process.exit(1);
  }

  if (!eventId) {
    console.error("\nPass an event id: node scripts/check-ga4-insights.js YOUR_EVENT_ID");
    process.exit(1);
  }

  let eventTitle = titleOverride.trim();
  if (!eventTitle) {
    const event = await findEventById(eventId);
    if (!event) {
      console.error("\nEvent not found in database for id:", eventId);
      process.exit(1);
    }
    eventTitle = event.title || "";
    console.log("\nLoaded from database:", eventTitle);
  } else {
    console.log("\nUsing title override (debug only):", eventTitle);
  }

  console.log("Testing event id:", eventId);
  console.log("Note: custom dimension bmt_event_id must exist in GA4 (Event scope).\n");

  try {
    const [metrics, realtime] = await Promise.all([
      googleAnalytics.getEventTrafficMetrics(eventId, { eventTitle }),
      googleAnalytics.getRealtimeScreenMetrics(eventTitle)
    ]);

    console.log("── Standard + merged (API) ──");
    console.log(JSON.stringify(metrics, null, 2));

    console.log("\n── Realtime only (page title match) ──");
    console.log(JSON.stringify(realtime, null, 2));
    console.log("  activeUsers → Live now");
    console.log("  screenPageViews → recent page views on this screen (30 min)");

    if (metrics.realtime_proxy) {
      console.log(
        "\nStandard reports empty — Today uses Realtime screenPageViews until bmt_event_id data processes."
      );
    } else if (metrics.live_sessions_30m !== realtime.activeUsers) {
      console.warn(
        "\nWarning: live_sessions_30m should equal Realtime activeUsers:",
        metrics.live_sessions_30m,
        "vs",
        realtime.activeUsers
      );
    } else {
      console.log("\nStandard reports active. Live now uses Realtime; historical KPIs use bmt_event_id.");
    }

    if (metrics.total_views === 0 && metrics.views_today === 0 && !metrics.realtime_proxy) {
      const hint = await googleAnalytics.getDebugTrafficHint();
      if (hint) {
        console.log("\n" + hint);
      }
    }
  } catch (err) {
    console.error("\nAPI error:", err.details || err.message || err);
    process.exit(1);
  }
}

main().finally(() => process.exit(0));
