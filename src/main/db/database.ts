import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'fresh.sqlite3')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  runMigrations(db)

  return db
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized — call initDatabase() first')
  return db
}

// Called from app 'before-quit' — an open handle here has been one of the
// suspects behind the Windows installer failing to fully remove/replace
// files during uninstall/upgrade.
export function closeDatabase(): void {
  db?.close()
  db = null
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS media_library (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      display_path TEXT NOT NULL,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      duration_sec REAL,
      width INTEGER,
      height INTEGER,
      thumbnail_path TEXT,
      needs_transcode INTEGER NOT NULL DEFAULT 0,
      transcode_status TEXT NOT NULL DEFAULT 'none',
      created_at INTEGER NOT NULL
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slot INTEGER NOT NULL UNIQUE,
      layers_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  // Single-row table (id always 1) holding the project's canvas resolution.
  database.exec(`
    CREATE TABLE IF NOT EXISTS canvas_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      width INTEGER NOT NULL,
      height INTEGER NOT NULL
    )
  `)
  database
    .prepare(`INSERT OR IGNORE INTO canvas_settings (id, width, height) VALUES (1, 1920, 1080)`)
    .run()
}
