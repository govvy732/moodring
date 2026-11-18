// Moodring stateful mood store.
// Tracks emotional state per subject (user id, wallet, or session id).
//
// Backends, picked automatically at boot:
//   1. Upstash Redis (REST)  — if UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//                              (or Vercel KV's KV_REST_API_URL + KV_REST_API_TOKEN) are set.
//                              Persistent and works on serverless (Vercel).
//   2. SQLite (better-sqlite3) — default on Render / Docker / local. Persistent as long
//                              as DATA_DIR is on a persistent disk.
//                              On Vercel it falls back to /tmp, which is NOT persistent:
//                              history survives only while a function instance is warm.
//   3. In-memory              — last-resort fallback if SQLite can't load. Never crashes,
//                              but history is lost on restart.
//
// Force a backend with MOOD_STORE=redis|sqlite|memory.
// All store methods return Promises so the backends are interchangeable.

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const HISTORY_CAP = 50; // max records kept per subject in redis/memory backends

let store = null;
let initPromise = null;

export function initMoodStore() {
  if (!initPromise) initPromise = createStore().then((s) => (store = s));
  return initPromise;
}

export async function getMoodStore() {
  if (!store) await initMoodStore();
  return store;
}

async function createStore() {
  const forced = (process.env.MOOD_STORE || '').toLowerCase();
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (forced === 'redis' || (!forced && redisUrl && redisToken)) {
    if (redisUrl && redisToken) {
      console.log('🗄️  Mood store: Upstash Redis (persistent)');
      return redisStore(redisUrl, redisToken);
    }
    console.warn('⚠️  MOOD_STORE=redis but UPSTASH_REDIS_REST_URL/TOKEN missing — falling back');
  }

  if (forced !== 'memory') {
    try {
      return await sqliteStore();
    } catch (err) {
      console.warn(`⚠️  SQLite unavailable (${err.message}) — using in-memory mood store`);
    }
  }
  console.log('🗄️  Mood store: in-memory (not persistent)');
  return memoryStore();
}

// ---------------------------------------------------------------
// SQLite
// ---------------------------------------------------------------
async function sqliteStore() {
  const { default: Database } = await import('better-sqlite3');
  const dataDir =
    process.env.DATA_DIR || (IS_SERVERLESS ? '/tmp/moodring' : path.join(__dirname, '..', 'data'));
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'moodring.sqlite');
  const db = new Database(dbPath);
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
  console.log(
    `🗄️  Mood store: SQLite at ${dbPath}${IS_SERVERLESS ? ' (serverless /tmp — NOT persistent)' : ''}`
  );

  const insert = db.prepare(
    `INSERT INTO mood_records (subject, ts, valence, arousal, intensity, label, signals)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const latest = db.prepare(`SELECT * FROM mood_records WHERE subject = ? ORDER BY ts DESC, id DESC LIMIT 1`);
  const history = db.prepare(`SELECT * FROM mood_records WHERE subject = ? ORDER BY ts DESC, id DESC LIMIT ?`);

  return {
    kind: 'sqlite',
    persistent: !IS_SERVERLESS,
    async record(subject, mood) {
      insert.run(subject, Date.now(), mood.valence, mood.arousal, mood.intensity, mood.label, JSON.stringify(mood.signals || {}));
    },
    async getLatest(subject) {
      const row = latest.get(subject);
      return row ? hydrate(row) : null;
    },
    async getHistory(subject, limit = 7) {
      return history.all(subject, limit).map(hydrate);
    },
    async getStats() {
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

// ---------------------------------------------------------------
// In-memory
// ---------------------------------------------------------------
function memoryStore() {
  const bySubject = new Map(); // subject -> [newest, ...]
  const toRecord = (mood) => ({
    valence: mood.valence,
    arousal: mood.arousal,
    intensity: mood.intensity,
    label: mood.label,
    signals: mood.signals || {},
    ts: Date.now(),
  });
  return {
    kind: 'memory',
    persistent: false,
    async record(subject, mood) {
      const list = bySubject.get(subject) || [];
      list.unshift(toRecord(mood));
      if (list.length > HISTORY_CAP) list.length = HISTORY_CAP;
      bySubject.set(subject, list);
    },
    async getLatest(subject) {
      return bySubject.get(subject)?.[0] || null;
    },
    async getHistory(subject, limit = 7) {
      return (bySubject.get(subject) || []).slice(0, limit);
    },
    async getStats() {
      let total = 0;
      for (const l of bySubject.values()) total += l.length;
      return { totalRecords: total, uniqueSubjects: bySubject.size };
    },
  };
}

// ---------------------------------------------------------------
// Upstash Redis via REST (no extra dependency — uses fetch)
// ---------------------------------------------------------------
function redisStore(url, token) {
  const base = url.replace(/\/$/, '');
  const key = (subject) => `moodring:mood:${subject}`;
  async function cmd(...args) {
    const r = await fetch(base, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!r.ok) throw new Error(`redis ${args[0]} failed: HTTP ${r.status}`);
    const j = await r.json();
    if (j.error) throw new Error(`redis ${args[0]} failed: ${j.error}`);
    return j.result;
  }
  const parse = (s) => JSON.parse(s);
  return {
    kind: 'redis',
    persistent: true,
    async record(subject, mood) {
      const rec = {
        valence: mood.valence,
        arousal: mood.arousal,
        intensity: mood.intensity,
        label: mood.label,
        signals: mood.signals || {},
        ts: Date.now(),
      };
      await cmd('LPUSH', key(subject), JSON.stringify(rec));
      await cmd('LTRIM', key(subject), 0, HISTORY_CAP - 1);
      await cmd('SADD', 'moodring:subjects', subject);
    },
    async getLatest(subject) {
      const s = await cmd('LINDEX', key(subject), 0);
      return s ? parse(s) : null;
    },
    async getHistory(subject, limit = 7) {
      const list = await cmd('LRANGE', key(subject), 0, limit - 1);
      return (list || []).map(parse);
    },
    async getStats() {
      const subjects = await cmd('SCARD', 'moodring:subjects');
      return { totalRecords: null, uniqueSubjects: subjects };
    },
  };
}
