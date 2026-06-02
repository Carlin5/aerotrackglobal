import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

let _db: Database.Database | null = null;

function getDbPath() {
  const explicit = process.env.DATABASE_FILE;
  if (explicit) {
    return path.isAbsolute(explicit)
      ? explicit
      : path.join(process.cwd(), explicit);
  }
  // On Vercel: use Blob storage (KV) instead of /tmp
  // For now, use /tmp but with aggressive persistence
  if (process.env.VERCEL === "1") {
    // Store in a more persistent location if available
    const tmpDir = "/tmp/aerotrack-data";
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
    } catch {}
    return path.join(tmpDir, "aerotrack.sqlite");
  }
  return path.join(process.cwd(), "data", "aerotrack.sqlite");
}

export function getDb(): Database.Database {
  if (_db) return _db;
  const file = getDbPath();
  const dir = path.dirname(file);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error(`[db] Failed to create directory ${dir}:`, err);
  }
  
  try {
    const db = new Database(file);
    // Optimize for durability on ephemeral filesystems
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    // FULL sync ensures data hits disk before returning
    db.pragma("synchronous = FULL");
    db.pragma("cache_size = -64000");
    // Reduce busy timeout to fail faster on locked db
    db.pragma("busy_timeout = 5000");
    migrate(db);
    _db = db;
    return db;
  } catch (err) {
    console.error(`[db] Failed to open database at ${file}:`, err);
    throw err;
  }
}

export async function ensureDbReady(): Promise<void> {
  try {
    getDb();
  } catch (err) {
    console.error("[db] ensureDbReady failed:", err);
    throw err;
  }
}

export async function persistDb(): Promise<void> {
  const db = getDb();
  try {
    // Force a checkpoint to flush WAL to main database file
    // TRUNCATE mode recycles the WAL file
    db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch (err) {
    console.error("[db] WAL checkpoint failed:", err);
  }
}

function migrate(db: Database.Database) {
  try {
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
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_flights_tracking_id ON flights(tracking_id);
      CREATE INDEX IF NOT EXISTS idx_flights_created_at ON flights(created_at);

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
  } catch (err) {
    console.error("[db] Migration failed:", err);
    throw err;
  }

  // Additive migrations — safely add columns that may not exist yet.
  ensureColumn(db, "flights", "emergency_json", "TEXT");
}

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
      name: string;
    }>;
    if (!cols.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  } catch (err) {
    console.error(`[db] ensureColumn failed for ${column}:`, err);
  }
}
