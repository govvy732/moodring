# 🚀 Deploying Moodring

## One-click on Render (recommended)

1. Fork or use this repo: https://github.com/govvy732/moodring
2. Sign in to [Render](https://dashboard.render.com) (free tier works)
3. Click **New** → **Blueprint** → connect your fork
4. Render reads `render.yaml` automatically
5. Set these environment variables in the Render dashboard before first deploy:

   | Key | Value |
   |---|---|
   | `RECEIVE_ADDRESS` | Your X Layer wallet (USDT0 receiver) — e.g. `0x8bfc0f414be2f70c5930f7713be1db188eb0c3bd` |
   | `AGENT_PRIVATE_KEY` | (optional) EVM private key for in-app payment verification — not required for the basic x402 challenge flow |
   | `PUBLIC_URL` | Your Render service URL — e.g. `https://moodring.onrender.com` |
   | `AGENT_ID` | (after registration) The numeric ID from OKX.AI marketplace |

6. Click **Apply** — first build takes ~2-3 minutes
7. Hit `https://<your-service>.onrender.com/health` — should return `{"status":"ok",...}`

That's it. The free tier sleeps after 15 min of inactivity; the first request after sleep takes ~30s to wake.

## Manual deploy (any Docker host)

```bash
# 1. Clone
git clone https://github.com/govvy732/moodring
cd moodring

# 2. Set env
export RECEIVE_ADDRESS=0xYourXLayerWallet
export PUBLIC_URL=https://your-domain.com

# 3. Build + run
docker build -t moodring .
docker run -d -p 10000:10000 \
  -e RECEIVE_ADDRESS=$RECEIVE_ADDRESS \
  -e PUBLIC_URL=$PUBLIC_URL \
  --name moodring \
  moodring

# 4. Verify
curl https://your-domain.com/health
```

## Register on OKX.AI marketplace

1. Install the OnchainOS CLI: `npm i -g @okx/onchainos-cli` (or use `onchainos` via npx)
2. Set up your Agentic Wallet: `npx skills add okx/onchainos-skills` and follow the prompts
3. Upload an avatar: `onchainos agent upload --file ./avatar.png`
4. Register the ASP:

```bash
onchainos agent create \
  --name "Moodring" \
  --description "Onchain Emotional Intelligence Layer for AI Agents. Other agents call Moodring to read emotional context, track mood over time, generate interventions, and decide the right next action. 4 paid services (mood_read, mood_track, mood_ritual, mood_oracle) plus 1 free demo, all x402 v2 on X Layer." \
  --picture "https://your-cdn-url/avatar.png" \
  --chain 196 \
  --services '[
    {"id":"mood_read","price":"0.003","description":"Single-snapshot emotional read"},
    {"id":"mood_track","price":"0.008","description":"Stateful emotional delta vs prior call"},
    {"id":"mood_ritual","price":"0.01","description":"60-second intervention (breath + affirmation + color + song)"},
    {"id":"mood_oracle","price":"0.02","description":"Next-best-action for the calling agent (role-aware)"}
  ]' \
  --fee "0"
```

5. Activate: `onchainos agent activate --agent-id <ID>`
6. Wait for OKX review email (24h-2 business days)

## Verify the x402 endpoint format

```bash
curl -i -X POST https://your-domain.com/api/mood/read \
  -H "Content-Type: application/json" \
  -d '{"text":"test"}'
```

Expected: `HTTP 402`, `PAYMENT-REQUIRED` header present, body contains `x402Version: 2` and `accepts[].maxAmountRequired: "3000"`.

## Verify the x402 manifest

```bash
curl https://your-domain.com/.well-known/x402 | jq
```

Should return the full x402 v2 manifest with all 5 services, network `eip155:196`, and the correct receive address.

## Troubleshooting

- **Render auto-deploy doesn't fire** — go to the Render dashboard and click "Manual Deploy". Free-tier services that sleep sometimes miss the GitHub auto-deploy hook.
- **First call after sleep is slow** — Render's free tier spins down after 15 min. The first request takes ~30s to wake the service. This is normal.
- **SQLite locked** — we use WAL mode, but if you scale beyond a single instance you'll need to switch to Postgres. For hackathon demo, single instance is fine.
- **OKX marketplace rejects the listing** — check the email for the specific reason. Most common: description too long (500 char limit) or services JSON not properly escaped. The CLI gives better error messages than the web UI.

## Environment variables reference

| Key | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `10000` | HTTP port |
| `PUBLIC_URL` | no | `http://localhost:10000` | Base URL for x402 manifest and landing page links |
| `RECEIVE_ADDRESS` | **yes (for paid services)** | `0x000...` | X Layer wallet that receives USDT0 payments |
| `AGENT_ID` | no | (unset) | Set after OKX.AI registration for display in `/api/agents/moodring` |
| `DATA_DIR` | no | `./data` | Where the SQLite database lives |
| `NODE_ENV` | no | `development` | Set to `production` for live deploys |
