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

- **Service:** https://moodring.onrender.com
- **x402 manifest:** https://moodring.onrender.com/.well-known/x402
- **Marketplace listing:** https://www.okx.ai/agents (search "Moodring")
- **Source:** https://github.com/govvy732/moodring

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
| `mood_demo` | `POST /api/mood/demo` | FREE | Try before you integrate (10 calls/min/IP) |

All prices in **USDT0** on **X Layer** (`eip155:196`).

### Example — call `mood_read` (paid)

```bash
# Step 1: get 402 challenge
curl -i -X POST https://moodring.onrender.com/api/mood/read \
  -H "Content-Type: application/json" \
  -d '{"text":"Just lost 30% on a position. Sleep is going to be tough."}'

# Response: HTTP/1.1 402 Payment Required
# PAYMENT-REQUIRED: <base64 JSON with accepts[0].maxAmountRequired="3000">
# (3000 = 0.003 USDT in 6-decimal units)

# Step 2: sign with your EIP-3009 wallet, retry with X-PAYMENT header
curl -X POST https://moodring.onrender.com/api/mood/read \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <base64 signed authorization>" \
  -d '{"text":"Just lost 30% on a position. Sleep is going to be tough."}'

# Response: 200 OK
# {"service":"mood_read","label":"agitated","valence":-0.4,"arousal":0.3,
#  "intensity":0.42,"signals":{"money":2,"sleep":1},...}
```

### Example — call `mood_oracle` with role

```bash
curl -X POST https://moodring.onrender.com/api/mood/oracle \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <your payment>" \
  -d '{"text":"Furious about the rugpull","agentRole":"trader"}'

# {"action":{"agentRole":"trader","do":"Close the app. The market will be here in 30 min.",
#  "tone":"gentle","intensity":"zero",...}}
```

### Try the demo (no payment)

```bash
curl -X POST https://moodring.onrender.com/api/mood/demo \
  -H "Content-Type: application/json" \
  -d '{"text":"AMAZING! Just hit a huge win!"}'
```

Or hit the **live interactive demo** at https://moodring.onrender.com — paste any text and get a real result from the live API.

## How emotional classification works

`moodEngine.classifyMood()` returns a 5-axis vector:

- **valence** (−1 to +1): negative to positive
- **arousal** (−1 to +1): calm to activated
- **intensity** (0 to 1): flat to strong
- **label** (one of 9): `energized`, `content`, `peaceful`, `activated`, `neutral`, `subdued`, `deflated`, `agitated`
- **signals**: detected lifestyle domains (`sleep`, `food`, `movement`, `social`, `money`, `health`)

It's deterministic, lexicon-based, and runs in <5ms with no external API calls. Same input → same output. The calling agent can rely on it.

## Run it locally

```bash
git clone https://github.com/govvy732/moodring
cd moodring
npm install
cp .env.example .env  # edit RECEIVE_ADDRESS for paid services
npm start
# → http://localhost:10000
```

### Docker

```bash
docker build -t moodring .
docker run -p 10000:10000 -e RECEIVE_ADDRESS=0x... moodring
```

### One-click deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/govvy732/moodring)

Or use the `render.yaml` Blueprint in this repo.

## Smoke test

```bash
npm test                    # against http://localhost:10000
MOODRING_URL=https://moodring.onrender.com npm test   # against live
```

Verifies all 5 services, the 402 challenge format, the payment-header passthrough, and the SQLite stateful track.

## Built for

- [OKX AI Genesis Hackathon](https://hackquest.io/hackathons/OKXAI-Genesis-Hackathon) — Lifestyle Companion category
- Eligible for **Best Product**, **Creative Genius**, **Social Buzz** cross-category
- Submission deadline: **2026-07-27 22:59 UTC** (extended from Jul 17)

## Tech

- Node 20 / Express 4
- better-sqlite3 (WAL mode) for stateful mood tracking
- Hand-rolled x402 v2 middleware (returns spec-compliant `PAYMENT-REQUIRED` base64 header)
- Zero external LLM calls — pure deterministic classification
- Zero secrets in the codebase

## License

MIT © 2026 govvy732
