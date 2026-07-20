// Moodring — Onchain Emotional Intelligence Layer for AI Agents
// x402 v2 paid endpoints on X Layer + 1 free demo endpoint
// Lifestyle category primary, eligible for Best Product / Software Utility / Social Buzz

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initMoodStore, getMoodStore } from './moodStore.js';
import { classifyMood, generateIntervention, suggestAgentAction } from './moodEngine.js';
import { x402 } from './x402.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const RECEIVE_ADDRESS = process.env.RECEIVE_ADDRESS || '0x0000000000000000000000000000000000000000';

app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// =============================================================
// Health & metadata
// =============================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'moodring',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/.well-known/x402', (req, res) => {
  res.json({
    x402Version: 2,
    name: 'Moodring',
    description: 'Onchain Emotional Intelligence Layer for AI Agents. Read emotional context, track mood over time, generate interventions, and decide the right next action.',
    homepage: PUBLIC_URL,
    agentId: process.env.AGENT_ID || null,
    network: 'eip155:196',
    chain: 'X Layer',
    asset: 'USDT0',
    assetAddress: '0x779Ded0c9e10eA8507B6c1e8ed4F2944A3A1A3dC',
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
  (req, res) => {
    const { subject, text, wallet, transaction } = req.body || {};
    if (!subject) {
      return res.status(400).json({
        error: 'invalid_input',
        message: 'subject is required (a stable identifier: user id, wallet address, or session id)',
      });
    }

    const current = classifyMood({ text, wallet, transaction });
    const store = getMoodStore();
    const prior = store.getLatest(subject);

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

    store.record(subject, current);

    return res.json({
      service: 'mood_track',
      version: '1.0.0',
      subject,
      current,
      prior: prior || null,
      delta,
      history: store.getHistory(subject, 7),
    });
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
    const ritual = generateIntervention(mood);

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
const DEMO_LIMIT = 60;
const demoHits = new Map();
app.post('/api/mood/demo', (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
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

// =============================================================
// Boot
// =============================================================
initMoodStore();
app.listen(PORT, () => {
  console.log(`🌙 Moodring listening on ${PUBLIC_URL}`);
  console.log(`   x402 manifest: ${PUBLIC_URL}/.well-known/x402`);
  console.log(`   receive address: ${RECEIVE_ADDRESS}`);
});
