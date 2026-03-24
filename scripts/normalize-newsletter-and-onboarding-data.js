const { pool } = require("../src/config/db");

async function run() {
  const [r1] = await pool.query(
    "UPDATE user_onboarding_profiles SET interests_json='[]' WHERE interests_json IS NULL OR TRIM(interests_json) IN ('', 'null', 'NULL')"
  );
  const [r2] = await pool.query(
    "UPDATE newsletter_subscribers SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL"
  );
  const [r3] = await pool.query(
    "UPDATE newsletter_subscribers ns JOIN users u ON LOWER(TRIM(ns.email)) = LOWER(TRIM(u.email)) SET ns.email = u.email"
  );

  console.log(
    JSON.stringify(
      {
        onboardingInterestsNormalized: r1.affectedRows,
        newsletterEmailsNormalized: r2.affectedRows,
        newsletterEmailsSyncedToUsers: r3.affectedRows
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
