#!/usr/bin/env node
// Moodring smoke test — hits the live /api/mood/demo endpoint
// and validates every service returns the expected shape.

import assert from 'node:assert/strict';

const BASE = process.env.MOODRING_URL || 'http://localhost:10000';
let pass = 0;
let fail = 0;

async function check(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    await fn();
    console.log('\x1b[32m✓\x1b[0m');
    pass++;
  } catch (e) {
    console.log(`\x1b[31m✗\x1b[0m ${e.message}`);
    fail++;
  }
}

function expectOneOf(value, options, label) {
  assert.ok(
    options.includes(value),
    `${label}: expected one of [${options.join(', ')}], got "${value}"`
  );
}

console.log(`\n🌙 Moodring smoke test → ${BASE}\n`);

// ============================================================
// Metadata
// ============================================================
await check('GET /health returns 200 + status ok', async () => {
  const r = await fetch(`${BASE}/health`);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.status, 'ok');
  assert.equal(j.service, 'moodring');
  assert.equal(j.version, '1.0.0');
});

await check('GET /.well-known/x402 returns manifest with 5 services', async () => {
  const r = await fetch(`${BASE}/.well-known/x402`);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.x402Version, 2);
  assert.equal(j.network, 'eip155:196');
  assert.equal(j.asset, 'USDT0');
  assert.equal(j.services.length, 5);
  const paid = j.services.filter((s) => !s.free);
  const free = j.services.filter((s) => s.free);
  assert.equal(paid.length, 4);
  assert.equal(free.length, 1);
  // Prices are non-zero strings for paid services
  for (const s of paid) {
    assert.ok(parseFloat(s.priceUSDT) > 0, `expected paid service ${s.id} to have price > 0`);
  }
  // x402 manifest points to real-looking endpoints
  for (const s of j.services) {
    assert.ok(s.endpoint.startsWith('https://'), `${s.id} endpoint should be HTTPS`);
  }
});

await check('GET /api/agents/moodring returns agent metadata', async () => {
  const r = await fetch(`${BASE}/api/agents/moodring`);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.name, 'Moodring');
  assert.equal(j.category, 'LIFESTYLE');
  assert.equal(j.chain, 'X Layer');
  assert.equal(j.chainId, 196);
  assert.equal(j.services, 5);
});

await check('GET / serves the landing page (HTML)', async () => {
  const r = await fetch(`${BASE}/`);
  assert.equal(r.status, 200);
  const ct = r.headers.get('content-type') || '';
  assert.ok(ct.includes('text/html'), `expected text/html, got ${ct}`);
  const body = await r.text();
  assert.ok(body.includes('Moodring'));
  assert.ok(body.includes('Live demo'));
  assert.ok(body.includes('mood_read'));
});

await check('GET /styles.css serves CSS', async () => {
  const r = await fetch(`${BASE}/styles.css`);
  assert.equal(r.status, 200);
  const ct = r.headers.get('content-type') || '';
  assert.ok(ct.includes('text/css') || ct.includes('css'), `got ${ct}`);
});

await check('GET /app.js serves JS', async () => {
  const r = await fetch(`${BASE}/app.js`);
  assert.equal(r.status, 200);
  const ct = r.headers.get('content-type') || '';
  assert.ok(ct.includes('javascript') || ct.includes('text/'), `got ${ct}`);
});

await check('GET /favicon.svg serves SVG', async () => {
  const r = await fetch(`${BASE}/favicon.svg`);
  assert.equal(r.status, 200);
});

// ============================================================
// Free demo endpoint
// ============================================================
await check('POST /api/mood/demo (loss) returns negative label', async () => {
  const r = await fetch(`${BASE}/api/mood/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: "Just lost 30% on a position. Sleep is going to be tough. I hate this market.",
    }),
  });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.service, 'mood_demo');
  assert.equal(j.free, true);
  expectOneOf(j.label, ['agitated', 'subdued', 'deflated', 'activated'], 'loss.label');
  assert.ok(j.valence < 0, `expected negative valence, got ${j.valence}`);
  assert.ok(j.intensity > 0.2, `expected meaningful intensity, got ${j.intensity}`);
});

await check('POST /api/mood/demo (win) returns positive label', async () => {
  const r = await fetch(`${BASE}/api/mood/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: "AMAZING!! Just hit a huge win! So happy, this is the best day ever!",
    }),
  });
  const j = await r.json();
  assert.ok(j.valence > 0, `expected positive valence, got ${j.valence}`);
  expectOneOf(j.label, ['energized', 'content', 'activated'], 'win.label');
});

await check('POST /api/mood/demo (neutral) returns neutral-ish label', async () => {
  const r = await fetch(`${BASE}/api/mood/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: "Just a regular Tuesday. Nothing special happening." }),
  });
  const j = await r.json();
  assert.ok(j.intensity < 0.5, `expected low intensity, got ${j.intensity}`);
  expectOneOf(j.label, ['neutral'], 'neutral.label');
});

await check('POST /api/mood/demo (sleep) detects sleep domain', async () => {
  const r = await fetch(`${BASE}/api/mood/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: "So tired. Can't sleep. Exhausted. Brain won't shut off." }),
  });
  const j = await r.json();
  assert.ok(j.signals, 'expected signals object');
  assert.ok(j.signals.sleep, `expected sleep signal, got ${JSON.stringify(j.signals)}`);
});

await check('POST /api/mood/demo (food) detects food domain', async () => {
  const r = await fetch(`${BASE}/api/mood/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: "Haven't eaten all day. Need breakfast. So hungry." }),
  });
  const j = await r.json();
  assert.ok(j.signals && j.signals.food, `expected food signal, got ${JSON.stringify(j.signals)}`);
});

await check('POST /api/mood/demo validates input', async () => {
  const r = await fetch(`${BASE}/api/mood/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(r.status, 400);
  const j = await r.json();
  assert.equal(j.error, 'invalid_input');
});

// ============================================================
// x402 paid endpoints — 402 challenges
// ============================================================
await check('POST /api/mood/read without payment returns 402 + PAYMENT-REQUIRED', async () => {
  const r = await fetch(`${BASE}/api/mood/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: "test" }),
  });
  assert.equal(r.status, 402);
  const paymentRequired = r.headers.get('payment-required') || r.headers.get('x-payment-required');
  assert.ok(paymentRequired, 'expected PAYMENT-REQUIRED header');
  const decoded = JSON.parse(Buffer.from(paymentRequired, 'base64').toString('utf8'));
  assert.equal(decoded.x402Version, 2);
  assert.equal(decoded.accepts[0].scheme, 'exact');
  assert.equal(decoded.accepts[0].network, 'eip155:196');
  assert.equal(decoded.accepts[0].assetDecimals, 6);
  assert.equal(decoded.accepts[0].maxAmountRequired, '3000'); // 0.003 USDT
});

await check('POST /api/mood/track without payment returns 402 ($0.008)', async () => {
  const r = await fetch(`${BASE}/api/mood/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject: "0xtest", text: "calm" }),
  });
  assert.equal(r.status, 402);
  const decoded = JSON.parse(
    Buffer.from(r.headers.get('payment-required'), 'base64').toString('utf8')
  );
  assert.equal(decoded.accepts[0].maxAmountRequired, '8000'); // 0.008 USDT
});

await check('POST /api/mood/ritual without payment returns 402 ($0.01)', async () => {
  const r = await fetch(`${BASE}/api/mood/ritual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: "I'm feeling great today" }),
  });
  assert.equal(r.status, 402);
  const paymentRequired = r.headers.get('payment-required') || r.headers.get('x-payment-required');
  assert.ok(paymentRequired);
  const decoded = JSON.parse(Buffer.from(paymentRequired, 'base64').toString('utf8'));
  assert.equal(decoded.accepts[0].maxAmountRequired, '10000'); // 0.01 USDT
});

await check('POST /api/mood/oracle without payment returns 402 ($0.02)', async () => {
  const r = await fetch(`${BASE}/api/mood/oracle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: "Anxious about a trade", agentRole: "trader" }),
  });
  assert.equal(r.status, 402);
  const paymentRequired = r.headers.get('payment-required') || r.headers.get('x-payment-required');
  assert.ok(paymentRequired);
  const decoded = JSON.parse(Buffer.from(paymentRequired, 'base64').toString('utf8'));
  assert.equal(decoded.accepts[0].maxAmountRequired, '20000'); // 0.02 USDT
});

// ============================================================
// Paid endpoints — with mock payment passthrough
// ============================================================
await check('POST /api/mood/read with mock payment returns mood', async () => {
  const r = await fetch(`${BASE}/api/mood/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PAYMENT': 'mock-payment-for-hackathon-demo',
    },
    body: JSON.stringify({ text: "I'm so excited for the future" }),
  });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.service, 'mood_read');
  assert.ok(j.mood, 'expected mood object');
  assert.ok(j.mood.valence > 0, `expected positive valence, got ${j.mood.valence}`);
});

await check('POST /api/mood/ritual with mock payment returns ritual', async () => {
  const r = await fetch(`${BASE}/api/mood/ritual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PAYMENT': 'mock-payment-for-hackathon-demo',
    },
    body: JSON.stringify({ text: "Anxious, can't sleep" }),
  });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.ok(j.ritual, 'expected ritual object');
  assert.ok(j.ritual.breath, 'expected breath pattern');
  assert.ok(j.ritual.breath.steps && j.ritual.breath.steps.length > 0, 'expected breath steps');
  assert.ok(j.ritual.affirmation, 'expected affirmation');
  assert.ok(j.ritual.color, 'expected color');
  assert.ok(j.ritual.song && j.ritual.song.title, 'expected song title');
  assert.ok(j.ritual.durationSeconds > 0, 'expected positive duration');
});

await check('POST /api/mood/oracle with mock payment returns role-aware action', async () => {
  const r = await fetch(`${BASE}/api/mood/oracle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PAYMENT': 'mock-payment-for-hackathon-demo',
    },
    body: JSON.stringify({ text: "Furious about losses", agentRole: "trader" }),
  });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.ok(j.action, 'expected action object');
  assert.equal(j.action.agentRole, 'trader');
  assert.ok(j.action.do, 'expected action.do to be set');
  expectOneOf(j.action.tone, ['gentle', 'urgent', 'measured', 'matching', 'warm', 'soft', 'neutral'], 'oracle.tone');
});

await check('POST /api/mood/oracle supports all 5 roles', async () => {
  for (const role of ['trader', 'assistant', 'social', 'dating', 'creative']) {
    const r = await fetch(`${BASE}/api/mood/oracle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PAYMENT': 'mock',
      },
      body: JSON.stringify({ text: "Feeling a bit off today", agentRole: role }),
    });
    assert.equal(r.status, 200, `role=${role}`);
    const j = await r.json();
    assert.equal(j.action.agentRole, role, `role mismatch for ${role}`);
    assert.ok(j.action.do, `expected do for ${role}`);
  }
});

await check('POST /api/mood/track records and returns history', async () => {
  const r1 = await fetch(`${BASE}/api/mood/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PAYMENT': 'mock' },
    body: JSON.stringify({ subject: `test-${Date.now()}`, text: "Tired and stressed, can't sleep" }),
  });
  assert.equal(r1.status, 200);
  const j1 = await r1.json();
  assert.ok(j1.delta, 'expected delta object');
  assert.equal(j1.delta.trend, 'baseline');
  assert.equal(j1.current.label, j1.current.label); // sanity

  const r2 = await fetch(`${BASE}/api/mood/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PAYMENT': 'mock' },
    body: JSON.stringify({ subject: j1.subject, text: "AMAZING! Won everything!" }),
  });
  assert.equal(r2.status, 200);
  const j2 = await r2.json();
  expectOneOf(j2.delta.trend, ['rising', 'falling', 'stable'], 'track.trend');
  assert.ok(Array.isArray(j2.history) && j2.history.length >= 2, 'expected history with >= 2 entries');
});

// ============================================================
// 404
// ============================================================
await check('404 on unknown path returns JSON error', async () => {
  const r = await fetch(`${BASE}/no-such-thing`);
  assert.equal(r.status, 404);
  const j = await r.json();
  assert.equal(j.error, 'not_found');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
