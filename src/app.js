// Moodring — Onchain Emotional Intelligence Layer for AI Agents
// x402 v2 paid endpoints on X Layer + 1 free demo endpoint
//
// This module builds and exports the Express app WITHOUT listening, so it can run:
//   - as a long-lived server (src/server.js → Render, Docker, local), or
//   - as a serverless function (api/index.js → Vercel).

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMoodStore } from './moodStore.js';
import { classifyMood, generateIntervention, suggestAgentAction } from './moodEngine.js';
import { x402 } from './x402.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const RECEIVE_ADDRESS = process.env.RECEIVE_ADDRESS || '0x0000000000000000000000000000000000000000';

// Render, Vercel and most hosts terminate TLS at a proxy. Trusting the first hop makes
// req.protocol report "https" (so x402 resource URLs are https) and req.ip report the
// real client IP (so the demo rate limit is per user, not per proxy).
app.set('trust proxy', 1);

// Public base URL. An explicit PUBLIC_URL wins (use it for custom domains); otherwise
// it is derived from the incoming request, so the same build works on any host.
export function baseUrl(req) {
  const explicit = (process.env.PUBLIC_URL || '').trim().replace(/\/$/, '');
  if (explicit) return explicit;
  return `${req.protocol}://${req.get('host')}`;
}

app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// =============================================================
// Health & metadata
// =============================================================
app.get('/health', async (req, res) => {
  const store = await getMoodStore().catch(() => null);
  res.json({
    status: 'ok',
    service: 'moodring',
    version: '1.0.0',
    uptime: process.uptime(),
    store: store ? store.kind : 'unavailable',
    persistentHistory: store ? store.persistent : false,
    timestamp: new Date().toISOString(),
  });
});

app.get('/.well-known/x402', (req, res) => {
  const PUBLIC_URL = baseUrl(req);
  res.json({
    x402Version: 2,
    name: 'Moodring',
    description: 'Onchain Emotional Intelligence Layer for AI Agents. Read emotional context, track mood over time, generate interventions, and decide the right next action.',
    homepage: PUBLIC_URL,
    agentId: process.env.AGENT_ID || null,
    network: 'eip155:196',
    chain: 'X Layer',
    asset: 'USDT0',
    assetAddress: '0x779ded0c9e1022225f8e0630b35a9b54be713736',
    assetDecimals: 6,
    receiveAddress: RECEIVE_ADDRESS,
    facilitator: 'https://x402.okx.com',
    services: [
      {
        id: 'mood_read',
        name: 'Mood Read',
        description: 'Single-snapshot emotional read on text, wallet activity, or transaction. Returns mood label + intensity + recommended tone for the calling agent.',
        priceUSDT: '0.003',
        endpoint: `${PUBLIC_URL}/api/mood/read`,
        method: 'POST',
        free: false,
      },
      {
        id: 'mood_track',
        name: 'Mood Track',
        description: 'Stateful call — returns the emotional delta vs the prior call for the same subject. Shows direction, magnitude, and trend.',
        priceUSDT: '0.008',
        endpoint: `${PUBLIC_URL}/api/mood/track`,
        method: 'POST',
        free: false,
      },
      {
        id: 'mood_ritual',
        name: 'Mood Ritual',
        description: 'Returns a 60-second intervention: breath pattern + affirmation + color + song. Ready to drop into any user-facing flow.',
        priceUSDT: '0.01',
        endpoint: `${PUBLIC_URL}/api/mood/ritual`,
        method: 'POST',
        free: false,
      },
      {
        id: 'mood_oracle',
        name: 'Mood Oracle',
        description: 'Returns the next-best-action for the calling agent given current emotional state. "Don\'t push the upsell" / "Ask how they\'re doing" / "Suggest a break".',
        priceUSDT: '0.02',
        endpoint: `${PUBLIC_URL}/api/mood/oracle`,
        method: 'POST',
        free: false,
      },
      {
        id: 'mood_demo',
        name: 'Mood Demo (free)',
        description: 'Free preview of mood_read — same logic, no payment, rate-limited. Use this to try Moodring before integrating x402.',
        priceUSDT: '0',
        endpoint: `${PUBLIC_URL}/api/mood/demo`,
        method: 'POST',
        free: true,
      },
    ],
  });
});

// =============================================================
// Service 1 (PAID): mood_read — single-snapshot read
// =============================================================
app.post(
  '/api/mood/read',
  x402({
    price: '0.003',
    description: 'Mood Read — single-snapshot emotional classification',
  }),
  (req, res) => {
    const { text, wallet, transaction } = req.body || {};
    if (!text && !wallet && !transaction) {
      return res.status(400).json({
        error: 'invalid_input',
        message: 'Provide one of: text, wallet, transaction',
      });
    }

    const mood = classifyMood({ text, wallet, transaction });
    return res.json({
      service: 'mood_read',
      version: '1.0.0',
      ...mood,
      hint: 'For stateful tracking, use /api/mood/track with the same subject. For interventions, use /api/mood/ritual.',
    });
  }
);

// =============================================================
// Service 2 (PAID): mood_track — stateful, returns delta
// =============================================================
app.post(
  '/api/mood/track',
  x402({
    price: '0.008',
    description: 'Mood Track — stateful emotional delta vs prior call',
  }),
  async (req, res, next) => {
    try {
      const { subject, text, wallet, transaction } = req.body || {};
      if (!subject) {
        return res.status(400).json({
          error: 'invalid_input',
          message: 'subject is required (a stable identifier: user id, wallet address, or session id)',
        });
      }

      const current = classifyMood({ text, wallet, transaction });
      const store = await getMoodStore();
      const prior = await store.getLatest(subject);

      const delta = prior
        ? {
            valenceDelta: +(current.valence - prior.valence).toFixed(3),
            arousalDelta: +(current.arousal - prior.arousal).toFixed(3),
            intensityDelta: +(current.intensity - prior.intensity).toFixed(3),
            trend:
              current.valence > prior.valence
                ? 'rising'
                : current.valence < prior.valence
                ? 'falling'
                : 'stable',
          }
        : { valenceDelta: 0, arousalDelta: 0, intensityDelta: 0, trend: 'baseline' };

      await store.record(subject, current);

      return res.json({
        service: 'mood_track',
        version: '1.0.0',
        subject,
        current,
        prior: prior || null,
        delta,
        history: await store.getHistory(subject, 7),
      });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================
// Service 3 (PAID): mood_ritual — 60-second intervention
// =============================================================
app.post(
  '/api/mood/ritual',
  x402({
    price: '0.01',
    description: 'Mood Ritual — 60-second intervention (breath + affirmation + color + song)',
  }),
  (req, res) => {
    const { text, wallet, transaction } = req.body || {};
    if (!text && !wallet && !transaction) {
      return res.status(400).json({
        error: 'invalid_input',
        message: 'Provide one of: text, wallet, transaction',
      });
    }

    const mood = classifyMood({ text, wallet, transaction });
    const ritual = generateIntervention(mood, { baseUrl: baseUrl(req) });

    return res.json({
      service: 'mood_ritual',
      version: '1.0.0',
      mood,
      ritual,
    });
  }
);

// =============================================================
// Service 4 (PAID): mood_oracle — next best action
// =============================================================
app.post(
  '/api/mood/oracle',
  x402({
    price: '0.02',
    description: 'Mood Oracle — recommended next action for the calling agent',
  }),
  (req, res) => {
    const { text, wallet, transaction, agentRole } = req.body || {};
    if (!text && !wallet && !transaction) {
      return res.status(400).json({
        error: 'invalid_input',
        message: 'Provide one of: text, wallet, transaction',
      });
    }

    const mood = classifyMood({ text, wallet, transaction });
    const action = suggestAgentAction(mood, agentRole || 'assistant');

    return res.json({
      service: 'mood_oracle',
      version: '1.0.0',
      mood,
      action,
    });
  }
);

// =============================================================
// Service 5 (FREE): mood_demo — rate-limited preview
// =============================================================
export const DEMO_LIMIT = 60; // calls per minute per IP (per instance on serverless hosts)
const demoHits = new Map();
let lastPrune = Date.now();
app.post('/api/mood/demo', (req, res) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  // Drop stale IPs once a minute so the map can't grow forever.
  if (now - lastPrune > 60_000) {
    for (const [k, hits] of demoHits) if (!hits.some((t) => now - t < 60_000)) demoHits.delete(k);
    lastPrune = now;
  }
  const window = demoHits.get(ip)?.filter((t) => now - t < 60_000) || [];
  if (window.length >= DEMO_LIMIT) {
    return res.status(429).json({
      error: 'rate_limited',
      message: `Demo endpoint limited to ${DEMO_LIMIT} calls/minute per IP. Integrate x402 paid endpoints for unlimited calls.`,
    });
  }
  window.push(now);
  demoHits.set(ip, window);

  const { text, wallet, transaction } = req.body || {};
  if (!text && !wallet && !transaction) {
    return res.status(400).json({
      error: 'invalid_input',
      message: 'Provide one of: text, wallet, transaction',
    });
  }
  const mood = classifyMood({ text, wallet, transaction });
  return res.json({
    service: 'mood_demo',
    version: '1.0.0',
    free: true,
    rateLimit: `${DEMO_LIMIT}/min per IP`,
    ...mood,
    upgrade: 'Pay 0.003 USDT via x402 at /api/mood/read for unlimited calls and schema-strict output.',
  });
});

// =============================================================
// Agent detail (for OKX marketplace card)
// =============================================================
app.get('/api/agents/moodring', (req, res) => {
  const PUBLIC_URL = baseUrl(req);
  res.json({
    id: process.env.AGENT_ID || 'pending',
    name: 'Moodring',
    tagline: 'Agents should ask how you\'re doing before they ask for your money.',
    description:
      'Onchain Emotional Intelligence Layer for AI Agents. Other agents POST context (text, wallet activity, transactions) and get back emotional reads, stateful mood deltas, 60-second interventions, or next-best-action recommendations. x402 v2 paid endpoints on X Layer.',
    category: 'LIFESTYLE',
    crossCategories: ['SOFTWARE_SERVICES', 'ARTISTIC_EXCELLENCE'],
    chain: 'X Layer',
    chainId: 196,
    caip2: 'eip155:196',
    asset: 'USDT0',
    website: PUBLIC_URL,
    x402Manifest: `${PUBLIC_URL}/.well-known/x402`,
    services: 5,
    paidServices: 4,
    freeServices: 1,
  });
});

// =============================================================
// x402 v2 manifest — agent-side discovery for marketplace
// =============================================================
app.get('/x402', (req, res) => res.redirect('/.well-known/x402'));

// =============================================================
// 404 fallback
// =============================================================
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: `${req.method} ${req.path} not found`,
    hint: 'GET / for the landing page, GET /.well-known/x402 for the x402 manifest, POST /api/mood/* for services.',
  });
});

// Error handler — JSON instead of an HTML stack trace
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong. Try again.' });
});

export default app;
