// Moodring stateful mood store — SQLite-backed.
// Tracks emotional state per subject (user id, wallet, or session id).
// Stateless from the caller's perspective; persistence is implementation detail.

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'moodring.sqlite');

let db = null;

export function initMoodStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS mood_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      ts INTEGER NOT NULL,
      valence REAL NOT NULL,
      arousal REAL NOT NULL,
      intensity REAL NOT NULL,
      label TEXT NOT NULL,
      signals TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_subject_ts ON mood_records (subject, ts DESC);
  `);
  console.log(`🗄️  Mood store ready at ${DB_PATH}`);
  return db;
}

export function getMoodStore() {
  if (!db) initMoodStore();
  return {
    record(subject, mood) {
      db.prepare(
        `INSERT INTO mood_records (subject, ts, valence, arousal, intensity, label, signals)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        subject,
        Date.now(),
        mood.valence,
        mood.arousal,
        mood.intensity,
        mood.label,
        JSON.stringify(mood.signals || {})
      );
    },
    getLatest(subject) {
      const row = db
        .prepare(
          `SELECT * FROM mood_records WHERE subject = ? ORDER BY ts DESC LIMIT 1`
        )
        .get(subject);
      return row ? hydrate(row) : null;
    },
    getHistory(subject, limit = 7) {
      const rows = db
        .prepare(
          `SELECT * FROM mood_records WHERE subject = ? ORDER BY ts DESC LIMIT ?`
        )
        .all(subject, limit);
      return rows.map(hydrate);
    },
    getStats() {
      const total = db.prepare(`SELECT COUNT(*) as c FROM mood_records`).get().c;
      const subjects = db.prepare(`SELECT COUNT(DISTINCT subject) as c FROM mood_records`).get().c;
      return { totalRecords: total, uniqueSubjects: subjects };
    },
  };
}

function hydrate(row) {
  return {
    valence: row.valence,
    arousal: row.arousal,
    intensity: row.intensity,
    label: row.label,
    signals: row.signals ? JSON.parse(row.signals) : {},
    ts: row.ts,
  };
}
