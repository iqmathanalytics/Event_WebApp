const { pool } = require("../config/db");

async function upsertUserOnboardingProfile({
  userId,
  firstName,
  lastName,
  mobileNumber,
  cityId,
  interests,
  wantsInfluencer,
  wantsDeal
}) {
  const interestsJson = Array.isArray(interests) ? JSON.stringify(interests) : null;
  await pool.query(
    `INSERT INTO user_onboarding_profiles
      (user_id, first_name, last_name, mobile_number, city_id, interests_json, wants_influencer, wants_deal, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
      first_name = VALUES(first_name),
      last_name = VALUES(last_name),
      mobile_number = VALUES(mobile_number),
      city_id = VALUES(city_id),
      interests_json = VALUES(interests_json),
      wants_influencer = VALUES(wants_influencer),
      wants_deal = VALUES(wants_deal),
      updated_at = NOW()`,
    [
      userId,
      firstName || null,
      lastName || null,
      mobileNumber || null,
      cityId || null,
      interestsJson,
      wantsInfluencer ? 1 : 0,
      wantsDeal ? 1 : 0
    ]
  );
}

async function findUserOnboardingProfileByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT user_id, first_name, last_name, mobile_number, city_id, interests_json, wants_influencer, wants_deal
     FROM user_onboarding_profiles
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

module.exports = { upsertUserOnboardingProfile, findUserOnboardingProfileByUserId };
