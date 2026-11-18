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
   | `PUBLIC_URL` | (optional) Only needed for a custom domain. If unset, URLs come from the request host, e.g. `https://<your-service>.onrender.com` |
   | `AGENT_ID` | (after registration) The numeric ID from OKX.AI marketplace |

6. Click **Apply** — first build takes ~2-3 minutes
7. Hit `https://<your-service>.onrender.com/health` — should return `{"status":"ok",...}`

That's it. The free tier sleeps after 15 min of inactivity; the first request after sleep takes ~30s to wake.

## Vercel

The repo deploys to Vercel as-is:

- `public/` is served by Vercel's CDN (landing page, CSS, JS).
- `api/index.js` exports the Express app as one serverless function. `vercel.json` rewrites `/health`, `/x402`, `/.well-known/x402` and `/api/*` to it.
- URLs are derived from the request host, so previews and production both advertise the right endpoints. Set `PUBLIC_URL` only for a custom domain.

```bash
npm i -g vercel
vercel deploy          # preview
vercel deploy --prod   # production
```

Set `RECEIVE_ADDRESS` (and optionally `AGENT_ID`, `PUBLIC_URL`) under **Project → Settings → Environment Variables**.

### Mood history on Vercel

Serverless functions have no persistent disk. Out of the box Moodring stores `mood_track` history in SQLite under `/tmp`, which **only lasts while a function instance is warm**. Nothing crashes, but history can reset and different instances don't share it.

For persistent history, add an Upstash Redis database (Vercel Marketplace → Upstash, or upstash.com) and set:

| Key | Value |
|---|---|
| `UPSTASH_REDIS_REST_URL` | REST URL from Upstash (Vercel KV's `KV_REST_API_URL` also works) |
| `UPSTASH_REDIS_REST_TOKEN` | REST token (or `KV_REST_API_TOKEN`) |

The store picks Redis automatically when both are set. You can force a backend with `MOOD_STORE=redis|sqlite|memory`. `/health` reports which backend is active (`store`) and whether history is persistent (`persistentHistory`).

The demo rate limit (60 calls/min per IP) is kept in memory per instance, so on Vercel it is approximate.

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

Expected: `HTTP 402`, `PAYMENT-REQUIRED` header present, body contains `x402Version: 2`, `accepts[0].amount: "3000"` and an `https://` `resource.url`. Paid calls are retried with a `PAYMENT-SIGNATURE` header.

## Verify the x402 manifest

```bash
curl https://your-domain.com/.well-known/x402 | jq
```

Should return the full x402 v2 manifest with all 5 services, network `eip155:196`, and the correct receive address.

## Troubleshooting

- **Render auto-deploy doesn't fire** — go to the Render dashboard and click "Manual Deploy". Free-tier services that sleep sometimes miss the GitHub auto-deploy hook.
- **First call after sleep is slow** — Render's free tier spins down after 15 min. The first request takes ~30s to wake the service. This is normal.
- **SQLite locked** — we use WAL mode, but if you scale beyond a single instance you'll need a shared store. Set the Upstash Redis variables above.
- **Render free tier disk** — Render's free web services have an ephemeral disk, so SQLite history resets on each deploy or restart. Attach a persistent disk and point `DATA_DIR` at it, or use Upstash Redis.
- **OKX marketplace rejects the listing** — check the email for the specific reason. Most common: description too long (500 char limit) or services JSON not properly escaped. The CLI gives better error messages than the web UI.

## Environment variables reference

| Key | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `10000` | HTTP port |
| `PUBLIC_URL` | no | (derived from request host) | Override the base URL in the x402 manifest, agent card and ritual share links. Use for custom domains |
| `RECEIVE_ADDRESS` | **yes (for paid services)** | `0x000...` | X Layer wallet that receives USDT0 payments |
| `AGENT_ID` | no | (unset) | Set after OKX.AI registration for display in `/api/agents/moodring` |
| `DATA_DIR` | no | `./data` (`/tmp/moodring` on Vercel) | Where the SQLite database lives |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | no | (unset) | Persistent mood history via Upstash Redis (recommended on Vercel) |
| `MOOD_STORE` | no | auto | Force `redis`, `sqlite` or `memory` |
| `NODE_ENV` | no | `development` | Set to `production` for live deploys |
