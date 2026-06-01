// Initialize the SQLite database used by AeroTrack.
// Production-safe: NO demo / fake flights are inserted. Operators add real
// flights via the /admin console after sign-in.
//
//   node scripts/seed.mjs
//
// Pass --wipe-flights to clear any pre-existing flights (use this on a fresh
// install if a previous seed populated demo data).
//
// Admin credentials are not stored in the database; they come from the
// `ADMIN_USERNAME` / `ADMIN_PASSWORD` environment variables at sign-in time.

import path from "node:path";
import fs from "node:fs";
import url from "node:url";
import Database from "better-sqlite3";

const ROOT = path.dirname(url.fileURLToPath(import.meta.url));
const PROJECT = path.resolve(ROOT, "..");

const envPath = path.join(PROJECT, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (!(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const dbFile = process.env.DATABASE_FILE
  ? path.isAbsolute(process.env.DATABASE_FILE)
    ? process.env.DATABASE_FILE
    : path.resolve(PROJECT, process.env.DATABASE_FILE)
  : path.join(PROJECT, "data", "aerotrack.sqlite");
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_id TEXT NOT NULL UNIQUE,
    flight_number TEXT NOT NULL,
    aircraft TEXT NOT NULL,
    origin_code TEXT NOT NULL,
    destination_code TEXT NOT NULL,
    waypoints_json TEXT NOT NULL DEFAULT '[]',
    cruise_kmh INTEGER NOT NULL DEFAULT 880,
    departure_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    is_live INTEGER NOT NULL DEFAULT 0,
    cargo_json TEXT NOT NULL,
    shipper_json TEXT NOT NULL,
    consignee_json TEXT NOT NULL,
    notes TEXT,
    emergency_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Additive migration: ensure emergency_json exists on older DBs
const flightCols = db.prepare("PRAGMA table_info(flights)").all();
if (!flightCols.some((c) => c.name === "emergency_json")) {
  db.exec("ALTER TABLE flights ADD COLUMN emergency_json TEXT");
}

// Optional: wipe any previously seeded flights when explicitly requested
if (process.argv.includes("--wipe-flights")) {
  const removed = db.prepare("DELETE FROM flights").run();
  console.log(`Wiped ${removed.changes} existing flight(s).`);
}

console.log(`Database ready at: ${dbFile}`);
console.log(`Sign in at:        /login`);
console.log(
  "Credentials:       $ADMIN_USERNAME / $ADMIN_PASSWORD (env vars).",
);
