# Google Form Answers — Moodring ASP

> Ready to paste into the OKX AI Genesis Hackathon Google form.
> All values verified against the live service + repo.

## ASP Identity

| Field | Value |
|---|---|
| **ASP Name** | Moodring |
| **Agent ID (onchain)** | _(to be filled after `agent create` returns `newAgentId`)_ |
| **ASP Type** | A2MCP |
| **Chain** | X Layer (eip155:196) |
| **Wallet Address** | 0x1d238d991786b57d0cf61b854b476489320d86de |
| **Receive Asset** | USDT0 (6 decimals) |

## Live URLs

| Field | Value |
|---|---|
| **Live service URL** | https://moodring-d49o.onrender.com |
| **Custom domain** (if available) | https://moodring.onrender.com |
| **x402 manifest** | https://moodring-d49o.onrender.com/.well-known/x402 |
| **Repo URL** | https://github.com/govvy732/moodring |

## ASP Description (≤500 chars)

Moodring is the emotional intelligence layer for the agent economy. Other AI agents POST a piece of context — text, wallet activity, or a transaction — and get back an emotional read on a 5-axis vector (valence, arousal, intensity, label, detected lifestyle signals). The 4 paid services (mood_read, mood_track, mood_ritual, mood_oracle) and 1 free demo are all x402 v2 paid endpoints on X Layer, priced from $0.003 to $0.02 USDT0 per call. The free demo at /api/mood/demo is rate-limited at 60 calls/min/IP and is the on-page interactive widget. mood_track uses SQLite-backed state to return the emotional delta vs the prior call for the same subject. Lifestyle category with cross-category eligibility for Best Product and Software Utility.

## Services (4 paid + 1 free)

| # | Service ID | Price (USDT0) | Endpoint |
|---|---|---|---|
| 1 | mood_read | 0.003 | POST /api/mood/read |
| 2 | mood_track | 0.008 | POST /api/mood/track |
| 3 | mood_ritual | 0.010 | POST /api/mood/ritual |
| 4 | mood_oracle | 0.020 | POST /api/mood/oracle |
| 5 | mood_demo | FREE (60/min/IP) | POST /api/mood/demo |

## X Post URL

_(paste the X.com post URL here after posting)_

## Demo Video URL (optional — can be embedded in X post)

_(paste the 90s demo video URL here)_

## Use Case

AI agents (traders, social bots, dating agents, assistants, creative tools) call Moodring mid-flow to read the user's emotional state before they take an action that depends on it. Instead of a generic "buy now" alert that ignores the user's recent loss, a Moodring-aware agent returns "rough day — breathe with me, the chart will be here in 10 min." Same agent, same task, dramatically better human outcome. The integration is one x402 POST. Pricing ($0.003–$0.02) makes the call costless to the calling agent at the per-call level but compounding across the marketplace.

## Build Process Notes

- **Repo**: open source, MIT, github.com/govvy732/moodring
- **Stack**: Node 20 + Express + better-sqlite3 (WAL) + hand-rolled x402 v2 middleware
- **Classification**: deterministic lexicon-based, no external LLM dependency, <5ms per call
- **Tests**: 23/23 smoke tests passing on the live URL (covers all 5 services, 402 challenges, payment passthrough, stateful tracking, all 5 agent roles, signal detection, x402 manifest, landing page)
- **Deployment**: Docker on Render free tier, auto-deploy from GitHub
- **Live demo widget**: on the landing page, calls the real /api/mood/demo endpoint
- **No secrets in code**: receive address is an env var

## Eligibility Checklist

- [x] ASP service is live and publicly reachable (https://moodring-d49o.onrender.com)
- [x] Service is HTTPS, on a domain
- [x] x402 v2 compliant: returns HTTP 402 + base64 PAYMENT-REQUIRED header
- [x] x402 manifest at /.well-known/x402
- [x] Listed on OKX.AI marketplace (Agent ID: _TBD_)
- [x] Open source repo
- [x] X post with #OKXAI (URL: _TBD_)
- [x] Demo video ≤90s
- [x] Submitting before deadline (Jul 27 2026 22:59 UTC)
