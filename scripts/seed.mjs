// Initialize the SQLite database and ensure the admin operator account exists.
// Production-safe: NO demo / fake flights are inserted. Operators add real
// flights via the /admin console after sign-in.
//
//   node scripts/seed.mjs
//
// Pass --wipe-flights to clear any pre-existing flights (use this on a fresh
// install if a previous seed populated demo data).

import path from "node:path";
import fs from "node:fs";
import url from "node:url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

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
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
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

// Admin user (idempotent)
const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD || "AeroTrack!Demo2026";
const existing = db
  .prepare("SELECT 1 FROM users WHERE username = ?")
  .get(username);
if (!existing) {
  db.prepare(
    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
  ).run(username, bcrypt.hashSync(password, 10));
  console.log(`Seeded admin "${username}".`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(
      `  Default password used. Set ADMIN_PASSWORD in .env.local for production.`,
    );
  }
} else {
  console.log(`Admin "${username}" already exists — no changes.`);
}

console.log(`\nDatabase ready at: ${dbFile}`);
console.log(`Sign in at:        /login`);
