import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

let _db: Database.Database | null = null;

function getDbPath() {
  const explicit = process.env.DATABASE_FILE;
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.join(process.cwd(), explicit);
  }
  // On serverless platforms the project filesystem is read-only; only /tmp
  // is writable. Pick that automatically when we're not in a normal dev/host.
  if (process.env.NETLIFY === "true" || process.env.LAMBDA_TASK_ROOT || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return "/tmp/aerotrack.sqlite";
  }
  return path.join(process.cwd(), "data", "aerotrack.sqlite");
}

export function getDb(): Database.Database {
  if (_db) {
    ensureAdmin(_db);
    return _db;
  }
  const file = getDbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  ensureAdmin(db);
  _db = db;
  return db;
}

function migrate(db: Database.Database) {
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_flights_tracking_id ON flights(tracking_id);

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

  // Additive migrations — safely add columns that may not exist yet.
  ensureColumn(db, "flights", "emergency_json", "TEXT");
}

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function ensureAdmin(db: Database.Database) {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = "Tracy@1"; // TEMPORARILY HARDCODED - will work regardless of env vars
  
  console.log(`[DB DEBUG] ensureAdmin called for username: ${username}, password: ${password}`);

  const existing = db
    .prepare("SELECT id, password_hash FROM users WHERE username = ?")
    .get(username) as { id: number; password_hash: string } | undefined;
    
  console.log(`[DB DEBUG] Existing user found:`, !!existing);
  
  if (!existing) {
    console.log(`[DB DEBUG] Creating new admin user...`);
    const hash = bcrypt.hashSync(password, 10);
    console.log(`[DB DEBUG] Hashed password length: ${hash.length}`);
    db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(
      username,
      hash,
    );
    // eslint-disable-next-line no-console
    console.log(`[db] Seeded admin user "${username}".`);
  } else {
    console.log(`[DB DEBUG] Updating existing admin user password...`);
    const hash = bcrypt.hashSync(password, 10);
    console.log(`[DB DEBUG] New hash length: ${hash.length}`);
    db.prepare("UPDATE users SET password_hash = ? WHERE username = ?").run(
      hash,
      username,
    );
    // eslint-disable-next-line no-console
    console.log(`[db] Updated admin password for "${username}".`);
    
    // Verify the update worked
    const verify = db.prepare("SELECT password_hash FROM users WHERE username = ?").get(username) as { password_hash: string };
    console.log(`[DB DEBUG] Verification - stored hash starts with: ${verify.password_hash.substring(0, 10)}...`);
  }
}
