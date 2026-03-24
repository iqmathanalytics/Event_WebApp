const { getAllSubscribersForExport } = require("../src/models/newsletterModel");
const { syncMailchimpSubscriber } = require("../src/utils/emailIntegrations");
const { pool } = require("../src/config/db");

function splitNameFallback(fullName = "") {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.slice(0, -1).join(" ") || parts[0] || "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : ""
  };
}

async function fetchUserNameByEmail(email) {
  const [rows] = await pool.query(
    `SELECT name
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0]?.name || "";
}

async function run() {
  const rows = await getAllSubscribersForExport();
  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  for (const row of rows) {
    const email = String(row.email || "").trim().toLowerCase();
    if (!email) {
      skipped += 1;
      continue;
    }

    let firstName = String(row.first_name || "").trim();
    let lastName = String(row.last_name || "").trim();
    if (!firstName && !lastName) {
      const fallback = await fetchUserNameByEmail(email);
      const split = splitNameFallback(fallback);
      firstName = split.firstName;
      lastName = split.lastName;
    }

    const cityName = String(row.city_name || "").trim();
    const phoneNumber = String(row.mobile_number || "").trim();
    const result = await syncMailchimpSubscriber({
      email,
      firstName,
      lastName,
      cityName,
      phoneNumber
    });

    if (result?.synced) {
      synced += 1;
    } else if (result?.skipped) {
      skipped += 1;
    } else {
      failed += 1;
      failures.push({
        email,
        error: result?.error || "Unknown Mailchimp error"
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        total: rows.length,
        synced,
        skipped,
        failed,
        failures: failures.slice(0, 20)
      },
      null,
      2
    )
  );
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
