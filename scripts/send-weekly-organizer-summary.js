/**
 * Manually run / preview the daily per-event organizer + shared-user summary.
 *
 * Usage:
 *   node scripts/send-weekly-organizer-summary.js
 *   node scripts/send-weekly-organizer-summary.js --dry-run
 *   node scripts/send-weekly-organizer-summary.js --email=you@example.com
 */
require("dotenv").config();

const {
  getPreviousDayWindow,
  listDailySummaryRecipients,
  buildEventSummariesForUser,
  runDailyOrganizerSummary,
  sendDailySummaryForUser
} = require("../src/services/weeklyOrganizerSummaryService");
const { buildDailyOrganizerEventSummaryEmail } = require("../src/utils/transactionalEmailTemplates");
const { isBrevoConfigured } = require("../src/utils/emailIntegrations");

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const emailArg = args.find((a) => a.startsWith("--email="));
  const onlyEmail = emailArg ? emailArg.slice("--email=".length).trim().toLowerCase() : "";

  const window = getPreviousDayWindow();
  // eslint-disable-next-line no-console
  console.log("Day window:", window.dayLabel, window.fromMysql, "→", window.toMysql, window.timezoneLabel);
  // eslint-disable-next-line no-console
  console.log("Brevo configured:", isBrevoConfigured());

  if (dryRun || onlyEmail) {
    let recipients = await listDailySummaryRecipients();
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
      const platformEvents = events.filter((ev) => ev.isPlatform);
      // eslint-disable-next-line no-console
      console.log(`\nUser #${user.id} ${user.email} — ${platformEvents.length} platform event emails`);
      platformEvents.forEach((ev) => {
        // eslint-disable-next-line no-console
        console.log(
          `  - ${ev.title} [${ev.accessLabel}] totalSales=${ev.totalSales} totalTickets=${ev.totalTickets} yesterday bookings=${ev.bookings} revenue=${ev.revenue}`
        );
      });
      if (!dryRun) {
        const result = await sendDailySummaryForUser(user, window);
        // eslint-disable-next-line no-console
        console.log("  Sent emails:", result.emailsSent || 0);
      } else if (platformEvents.length) {
        const mail = buildDailyOrganizerEventSummaryEmail({
          recipientName: user.name,
          dayLabel: window.dayLabel,
          timezoneLabel: window.timezoneLabel,
          event: platformEvents[0]
        });
        // eslint-disable-next-line no-console
        console.log("  Sample subject:", mail.subject);
      }
    }
    return;
  }

  const result = await runDailyOrganizerSummary({ force: true });
  // eslint-disable-next-line no-console
  console.log(result);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
