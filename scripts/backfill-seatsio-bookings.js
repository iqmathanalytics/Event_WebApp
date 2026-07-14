/**
 * Book already-sold seats into Seats.io for production bookings that
 * have seat labels in ticket_items_json but were never confirmed on the chart.
 *
 * Auth: organizer credentials via env (used only to fetch booking rows).
 * Seats.io: SEATSIO_* from root .env
 *
 *   $env:RESEND_ORGANIZER_EMAIL="..."
 *   $env:RESEND_ORGANIZER_PASSWORD="..."
 *   node scripts/backfill-seatsio-bookings.js --email=sukanthisridhar@gmail.com --dry-run
 *   node scripts/backfill-seatsio-bookings.js --email=sukanthisridhar@gmail.com --apply
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const { SeatsioClient } = require("seatsio");
const seatsioService = require("../src/services/seatsioService");
const { parseSelectedSeatsJson } = require("../src/utils/bookingSeats");
const { pool } = require("../src/config/db");
const { toJsonDbString } = require("../src/utils/jsonDb");

const API_BASE = process.env.RESEND_API_BASE || "https://www.bookmytickets.us/api";
const ORGANIZER_EMAIL = process.env.RESEND_ORGANIZER_EMAIL || "";
const ORGANIZER_PASSWORD = process.env.RESEND_ORGANIZER_PASSWORD || "";

function parseArgs(argv) {
  const out = { dryRun: true, email: "", eventTitleIncludes: "charlotte" };
  for (const arg of argv) {
    if (arg === "--apply") out.dryRun = false;
    if (arg === "--dry-run") out.dryRun = true;
    if (arg.startsWith("--email=")) out.email = String(arg.slice(8)).trim().toLowerCase();
    if (arg.startsWith("--event-contains=")) {
      out.eventTitleIncludes = String(arg.slice("--event-contains=".length)).trim().toLowerCase();
    }
  }
  return out;
}

function seatsFromBooking(booking) {
  const fromColumn = parseSelectedSeatsJson(booking.selected_seats_json);
  if (fromColumn.length) return fromColumn;
  if (Array.isArray(booking.selected_seats) && booking.selected_seats.length) {
    return parseSelectedSeatsJson(booking.selected_seats);
  }
  try {
    const raw = booking.ticket_items_json;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return parseSelectedSeatsJson(
        parsed.flatMap((item) => (Array.isArray(item?.seats) ? item.seats : []))
      );
    }
  } catch (_err) {
    /* ignore */
  }
  return [];
}

async function loginOrganizer() {
  const res = await fetch(`${API_BASE}/auth/login/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ORGANIZER_EMAIL, password: ORGANIZER_PASSWORD })
  });
  const json = await res.json();
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || `Login failed (${res.status})`);
  }
  const token = json?.data?.accessToken || json?.data?.token;
  if (!token) throw new Error("No access token returned");
  return token;
}

async function fetchJson(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json();
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed ${path} (${res.status})`);
  }
  return json.data;
}

function getClient() {
  if (!seatsioService.isSeatsioConfigured()) {
    throw new Error("SEATSIO_SECRET_KEY / SEATSIO_WORKSPACE_KEY missing in .env");
  }
  // Reuse region resolution from service internals via a lightweight recreate
  const { Region } = require("seatsio");
  const raw = String(process.env.SEATSIO_REGION || "na").trim().toLowerCase();
  const map = {
    na: Region.NA(),
    eu: Region.EU(),
    sa: Region.SA(),
    oc: Region.OC()
  };
  const region = map[raw] || Region.NA();
  return new SeatsioClient(region, process.env.SEATSIO_SECRET_KEY);
}

async function retrieveStatuses(client, eventKey, labels) {
  const statuses = {};
  for (const label of labels) {
    try {
      const obj = await client.events.retrieveObjectInfo(eventKey, label);
      statuses[label] = obj?.status || obj?.availabilityReason || "unknown";
    } catch (err) {
      statuses[label] = `error:${err?.message || err}`;
    }
  }
  return statuses;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email) {
    console.error("Required: --email=guest@email.com");
    process.exit(1);
  }
  if (!ORGANIZER_EMAIL || !ORGANIZER_PASSWORD) {
    console.error("Set RESEND_ORGANIZER_EMAIL and RESEND_ORGANIZER_PASSWORD");
    process.exit(1);
  }

  console.log(`Mode: ${args.dryRun ? "DRY RUN" : "APPLY"}`);
  console.log(`Fetching production bookings for ${args.email}…`);

  const token = await loginOrganizer();
  const bookings = await fetchJson("/bookings/organizer", token);
  const myEvents = await fetchJson("/events/my-events", token);
  const eventById = new Map((myEvents || []).map((e) => [Number(e.id), e]));

  const rows = (bookings || [])
    .filter((b) => String(b.email || "").trim().toLowerCase() === args.email)
    .filter((b) => {
      if (!args.eventTitleIncludes) return true;
      return String(b.event_title || "").toLowerCase().includes(args.eventTitleIncludes);
    })
    .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));

  if (!rows.length) {
    console.error("No matching bookings found.");
    process.exit(1);
  }

  const client = getClient();
  let bookedCount = 0;

  for (const row of rows) {
    const event = eventById.get(Number(row.event_id));
    const seats = seatsFromBooking(row);
    const labels = seats.map((s) => s.label).filter(Boolean);
    const eventKey = event?.seatsio_event_key || null;

    console.log(`\n#${row.id} · ${row.event_title}`);
    console.log(`  event_id=${row.event_id} seatsio_event_key=${eventKey || "(missing)"}`);
    console.log(`  seats=${labels.join(", ") || "(none)"}`);

    if (!eventKey) {
      console.log("  skip: no seatsio_event_key on organizer event");
      continue;
    }
    if (!labels.length) {
      console.log("  skip: no seat labels");
      continue;
    }

    const before = await retrieveStatuses(client, eventKey, labels);
    console.log("  status before:", before);

    const needsBooking = labels.filter((label) => {
      const status = String(before[label] || "").toLowerCase();
      return status !== "booked" && !status.startsWith("error:");
    });

    if (!needsBooking.length) {
      console.log("  already booked in Seats.io");
      continue;
    }

    if (args.dryRun) {
      console.log(`  dry-run: would book ${needsBooking.join(", ")}`);
      continue;
    }

    try {
      await client.events.book(eventKey, needsBooking, null, String(row.id));
      const after = await retrieveStatuses(client, eventKey, labels);
      console.log("  status after:", after);
      bookedCount += 1;

      // Best-effort: store selected_seats_json if this booking exists in connected DB
      try {
        const [local] = await pool.query(
          `SELECT id, selected_seats_json FROM event_bookings WHERE id = ? LIMIT 1`,
          [row.id]
        );
        if (local[0] && !local[0].selected_seats_json) {
          await pool.query(
            `UPDATE event_bookings SET selected_seats_json = CAST(? AS JSON) WHERE id = ?`,
            [toJsonDbString(seats), row.id]
          );
          console.log("  ✓ updated selected_seats_json in connected DB");
        }
      } catch (dbErr) {
        console.log(`  note: could not update local/connected DB (${dbErr.message})`);
      }
    } catch (err) {
      console.error(`  ✗ book failed: ${err?.message || err}`);
      if (Array.isArray(err?.messages)) {
        console.error(err.messages);
      }
    }
  }

  console.log(`\nDone. Bookings updated in Seats.io: ${bookedCount}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    pool.end?.().catch(() => {});
  });
