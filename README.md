# 🌙 Moodring

**Onchain Emotional Intelligence Layer for AI Agents.**

> Agents should ask how you're doing before they ask for your money.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![x402 v2](https://img.shields.io/badge/x402-v2-a78bfa)](https://www.x402.org)
[![X Layer](https://img.shields.io/badge/X%20Layer-eip155:196-38bdf8)](https://www.okx.com/xlayer)
[![USDT0](https://img.shields.io/badge/Settlement-USDT0-22c55e)](https://www.okx.com)
[![Lifestyle](https://img.shields.io/badge/Category-Lifestyle%20ASP-fb923c)](https://www.okx.ai/agents)

A Lifestyle Agent Service Provider (ASP) on the [OKX.AI marketplace](https://www.okx.ai/agents). Other agents POST context (chat, wallet activity, transactions) and get back emotional reads, stateful mood deltas, 60-second interventions, and next-best-action recommendations — all paid via x402 v2 in USDT0 on X Layer.

## Live

- **Service:** https://moodring-d49o.onrender.com (Render)
- **x402 manifest:** `<your-host>/.well-known/x402`
- **Marketplace listing:** https://www.okx.ai/agents (search "Moodring")
- **Source:** https://github.com/govvy732/moodring

All URLs in the manifest, the landing page snippets and ritual share links are built from the host that serves the request (or from `PUBLIC_URL` if you set it), so the same code works on Render, Vercel, Docker or a custom domain.

## Why this exists

Most lifestyle agents are human-facing apps dressed as agents. They wait for the human to come to them. **Moodring is the other way around** — it's designed to be called *by other agents* in the middle of their normal flow. A trading agent calls Moodring before sending a "buy now" alert. A social agent calls Moodring before scheduling a post. A dating agent calls Moodring before recommending a match.

The 402-payment-on-every-call model makes this economically viable at the price points where x402 actually works: $0.003 to $0.02 per call. Other agents pay micro-cents, Moodring returns schema-validated JSON, both sides win.

## Architecture

```
┌──────────────────┐      x402 v2 payment       ┌──────────────────┐
│   Calling agent  │ ──────────────────────────▶ │     Moodring     │
│ (trader, social, │   402 challenge first       │                  │
│  dating, etc.)   │   then POST with payment    │  ┌────────────┐  │
│                  │ ──────────────────────────▶ │  │ moodEngine │  │
└──────────────────┘                            │  │ (lexicon + │  │
                                                │  │  valence)  │  │
                                                │  └────────────┘  │
                                                │         │        │
                                                │  ┌──────▼──────┐ │
                                                │  │ moodStore   │ │
                                                │  │ (SQLite WAL)│ │
                                                │  └─────────────┘ │
                                                └──────────────────┘
                                                          │
                                                          ▼
                                                  ┌──────────────┐
                                                  │  X Layer     │
                                                  │  (eip155:196)│
                                                  │  USDT0 pay   │
                                                  └──────────────┘
```

The whole service is a stateless function call from the caller's perspective. SQLite gives us stateful mood tracking (so `mood_track` can return a delta) without the caller needing a session, an account, or any auth beyond their wallet.

## Services

| Service | Endpoint | Price | Purpose |
|---|---|---|---|
| `mood_read` | `POST /api/mood/read` | $0.003 | Single-snapshot emotional classification |
| `mood_track` | `POST /api/mood/track` | $0.008 | Stateful delta vs. prior call (7-call history) |
| `mood_ritual` | `POST /api/mood/ritual` | $0.01 | 60-second intervention (breath + affirmation + color + song) |
| `mood_oracle` | `POST /api/mood/oracle` | $0.02 | Next-best-action for the calling agent (role-aware) |
| `mood_demo` | `POST /api/mood/demo` | FREE | Try before you integrate (60 calls/min per IP) |

All prices in **USDT0** on **X Layer** (`eip155:196`).

In the examples below, replace `$MOODRING` with your host, e.g. `export MOODRING=https://moodring-d49o.onrender.com`.

### Example — call `mood_read` (paid)

```bash
# Step 1: get the 402 challenge
curl -i -X POST $MOODRING/api/mood/read \
  -H "Content-Type: application/json" \
  -d '{"text":"Just lost 30% on a position. Sleep is going to be tough."}'

# Response: HTTP/1.1 402 Payment Required
# PAYMENT-REQUIRED: <base64 JSON with accepts[0].amount="3000">
# (3000 = 0.003 USDT0 in 6-decimal units)

# Step 2: sign with your EIP-3009 wallet, retry with the PAYMENT-SIGNATURE header
curl -X POST $MOODRING/api/mood/read \
  -H "Content-Type: application/json" \
  -H "PAYMENT-SIGNATURE: <base64 signed payment>" \
  -d '{"text":"Just lost 30% on a position. Sleep is going to be tough."}'

# Response: 200 OK
# {"service":"mood_read","label":"subdued","valence":-0.8,"arousal":0,
#  "intensity":0.333,"signals":{"sleep":1},...}
```

### Example — call `mood_oracle` with role

```bash
curl -X POST $MOODRING/api/mood/oracle \
  -H "Content-Type: application/json" \
  -H "PAYMENT-SIGNATURE: <your payment>" \
  -d '{"text":"Furious about the rugpull","agentRole":"trader"}'

# {"action":{"agentRole":"trader","do":"Close the app. The market will be here in 30 min.",
#  "tone":"gentle","intensity":"zero",...}}
```

### Try the demo (no payment)

```bash
curl -X POST $MOODRING/api/mood/demo \
  -H "Content-Type: application/json" \
  -d '{"text":"AMAZING! Just hit a huge win!"}'
```

Or open the landing page on any deployment and use the **live demo**. It calls `/api/mood/demo` on the same host.

## How emotional classification works

`moodEngine.classifyMood()` returns a 5-axis vector:

- **valence** (−1 to +1): negative to positive
- **arousal** (−1 to +1): calm to activated
- **intensity** (0 to 1): flat to strong
- **label** (one of 8): `energized`, `content`, `peaceful`, `activated`, `neutral`, `agitated`, `subdued`, `deflated`
- **signals**: detected lifestyle domains (`sleep`, `food`, `movement`, `social`, `money`, `health`, plus `activity` for busy wallets)

The label comes from a valence × arousal grid:

| | arousal high | arousal mid | arousal low (calm / drained) |
|---|---|---|---|
| **positive** | energized | content | peaceful |
| **mixed / flat** | activated | neutral | neutral |
| **negative** | agitated | subdued | deflated |

Rules the engine follows:

- **Negation:** "not happy", "don't love", "never good" count as negative; "not terrible" is mildly positive. Negation covers the next 3 words and stops at punctuation.
- **Whole words only:** "interest" does not trigger the `sleep` signal for "rest", and "I'll" is not "ill".
- **Shouting:** ALL CAPS words are detected on the original text before lowercasing and raise arousal. Words like "what" or "wow" only count as intense when shouted.
- **Calm and low-energy words** ("calm", "quiet", "exhausted", "hopeless") lower arousal, which is how `peaceful` and `deflated` are reached.

It's deterministic, lexicon-based, and runs in well under 1 ms per call with no external API calls. Same input → same output. The calling agent can rely on it.

## Run it locally

```bash
git clone https://github.com/govvy732/moodring
cd moodring
npm install
cp .env.example .env  # optional: src/server.js loads .env via dotenv. Set RECEIVE_ADDRESS for paid services.
npm start
# → http://localhost:10000
```

### Docker

```bash
docker build -t moodring .
docker run -p 10000:10000 -e RECEIVE_ADDRESS=0x... moodring
```

### Deploy

- **Render:** [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/govvy732/moodring) or use the `render.yaml` Blueprint.
- **Vercel:** `vercel deploy` from the repo root. `vercel.json` serves `public/` from the CDN and routes the API to `api/index.js`.

See [DEPLOY.md](DEPLOY.md) for details, including mood history storage on Vercel.

## Tests

```bash
npm test                    # unit tests for the mood engine (node:test, no server needed)

# end-to-end smoke test against a running server
PUBLIC_URL=https://moodring.local RECEIVE_ADDRESS=0x0000000000000000000000000000000000000001 npm start &
npm run smoke                                       # against http://localhost:10000
MOODRING_URL=https://moodring-d49o.onrender.com npm run smoke   # against a live deployment
```

The smoke test checks all 5 services, the 402 challenge format, the payment-header passthrough and the stateful track. It expects `https://` endpoints in the manifest and a `RECEIVE_ADDRESS`, so set both when running it locally. CI (`.github/workflows/ci.yml`) runs both suites on every push and PR.

## Built for

- [OKX AI Genesis Hackathon](https://hackquest.io/hackathons/OKXAI-Genesis-Hackathon) — Lifestyle Companion category

## Tech

- Node 20+ / Express 4
- Mood history: SQLite (better-sqlite3, WAL) on Render/Docker, optional Upstash Redis for serverless, in-memory fallback
- Hand-rolled x402 v2 middleware (returns spec-compliant `PAYMENT-REQUIRED` base64 header, reads `PAYMENT-SIGNATURE`)
- Zero external LLM calls — pure deterministic classification
- Zero secrets in the codebase

## License

MIT © 2026 govvy732
