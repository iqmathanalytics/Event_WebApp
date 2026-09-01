/**
 * Manually run / preview the weekly organizer + shared-user summary digest.
 *
 * Usage:
 *   node scripts/send-weekly-organizer-summary.js
 *   node scripts/send-weekly-organizer-summary.js --dry-run
 *   node scripts/send-weekly-organizer-summary.js --email=you@example.com
 */
require("dotenv").config();

const {
  getPreviousWeekWindow,
  listWeeklySummaryRecipients,
  buildEventSummariesForUser,
  runWeeklyOrganizerSummary,
  sendWeeklySummaryForUser
} = require("../src/services/weeklyOrganizerSummaryService");
const { buildWeeklyOrganizerSummaryEmail } = require("../src/utils/transactionalEmailTemplates");
const { isBrevoConfigured } = require("../src/utils/emailIntegrations");

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const emailArg = args.find((a) => a.startsWith("--email="));
  const onlyEmail = emailArg ? emailArg.slice("--email=".length).trim().toLowerCase() : "";

  const window = getPreviousWeekWindow();
  // eslint-disable-next-line no-console
  console.log("Week window:", window.weekLabel, window.fromMysql, "→", window.toMysql, window.timezoneLabel);
  // eslint-disable-next-line no-console
  console.log("Brevo configured:", isBrevoConfigured());

  if (dryRun || onlyEmail) {
    let recipients = await listWeeklySummaryRecipients();
    if (onlyEmail) {
      recipients = recipients.filter((u) => String(u.email || "").toLowerCase() === onlyEmail);
    }
    if (!recipients.length) {
      // eslint-disable-next-line no-console
      console.log("No matching recipients.");
      return;
    }
    for (const user of recipients.slice(0, dryRun ? 5 : recipients.length)) {
      const events = await buildEventSummariesForUser(user.id, window);
      // eslint-disable-next-line no-console
      console.log(`\nUser #${user.id} ${user.email} — ${events.length} events`);
      events.forEach((ev) => {
        // eslint-disable-next-line no-console
        console.log(
          `  - ${ev.title} [${ev.accessLabel}] bookings=${ev.bookings} guests=${ev.attendees} revenue=${ev.revenue}`
        );
      });
      if (!dryRun) {
        await sendWeeklySummaryForUser(user, window);
        // eslint-disable-next-line no-console
        console.log("  Sent.");
      } else if (events.length) {
        const mail = buildWeeklyOrganizerSummaryEmail({
          recipientName: user.name,
          weekLabel: window.weekLabel,
          timezoneLabel: window.timezoneLabel,
          totals: {
            events: events.length,
            bookings: events.reduce((n, e) => n + (e.bookings || 0), 0),
            attendees: events.reduce((n, e) => n + (e.attendees || 0), 0),
            revenue: events.reduce((n, e) => n + (e.revenue || 0), 0)
          },
          events
        });
        // eslint-disable-next-line no-console
        console.log("  Subject:", mail.subject);
      }
    }
    return;
  }

  const result = await runWeeklyOrganizerSummary({ force: true });
  // eslint-disable-next-line no-console
  console.log(result);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
