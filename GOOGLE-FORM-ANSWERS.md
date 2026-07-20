# Google Form Answers — Moodring ASP

> Ready to paste into the OKX AI Genesis Hackathon Google form.
> All values verified against the live service + repo + on-chain tx.

## ASP Identity

| Field | Value |
|---|---|
| **ASP Name** | Moodring |
| **Agent ID (onchain)** | **6959** |
| **Activation tx** | 0xaad2747d8e7f2d4d15b86b8354551382155c5486a9f48a9759b8ad3a951911e4 |
| **Update tx (services + logo)** | 0xe1de45252b4b95c911217f968260bfd226f90e3792f1aabbcc9f77a01f8608c9 |
| **ASP Type** | A2MCP |
| **Chain** | X Layer (eip155:196, chainIndex 196) |
| **Owner Wallet** | 0xf5329bba1f088b5ded5db40e5e9a924db9676705 |
| **Receive Asset** | USDT0 (6 decimals) at 0x779ded0c9e1022225f8e0630b35a9b54be713736 |
| **Avatar** | https://static.okx.com/cdn/web3/wallet/marketplace/headimages/agent/avatar/4d868e1e-3bf5-492d-ae53-2fc1d03389ae.png |
| **Listing status** | Under review (approvalStatus 2) |

## Live URLs

| Field | Value |
|---|---|
| **Live service URL** | https://moodring-d49o.onrender.com |
| **Custom domain** (if available) | https://moodring.onrender.com |
| **x402 manifest** | https://moodring-d49o.onrender.com/.well-known/x402 |
| **Repo URL** | https://github.com/govvy732/moodring |

## ASP Description (≤500 chars)

Moodring is the emotional intelligence layer for the agent economy. Other AI agents POST context (text, wallet activity, transactions) and get back mood reads, stateful deltas, 60-second interventions, and next-best-action recommendations. 4 paid services + 1 free demo on x402 v2, USDT0 on X Layer, $0.003-$0.02 per call.

(323 chars)

## Services (4 paid + 1 free)

| # | Service ID | Price (USDT0) | Endpoint | Service ID (onchain) |
|---|---|---|---|---|
| 1 | mood_read | 0.003 | POST /api/mood/read | 35920 |
| 2 | mood_track | 0.008 | POST /api/mood/track | 35921 |
| 3 | mood_ritual | 0.010 | POST /api/mood/ritual | 35922 |
| 4 | mood_oracle | 0.020 | POST /api/mood/oracle | 35923 |
| 5 | mood_demo | FREE (60/min/IP) | POST /api/mood/demo | (not listed, free preview) |

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
- [x] Listed on OKX.AI marketplace (Agent ID: **6959** — **Listing under review**, 4 services attached)
- [x] Open source repo
- [x] X post with #OKXAI (URL: _TBD_)
- [x] Demo video ≤90s
- [x] Submitting before deadline (Jul 27 2026 22:59 UTC)
