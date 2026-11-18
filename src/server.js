// Long-lived server entry (Render, Docker, local). Vercel uses api/index.js instead.
import 'dotenv/config'; // loads .env if present (local dev); real env vars always win
import app from './app.js';
import { initMoodStore } from './moodStore.js';

const PORT = process.env.PORT || 10000;
const shownUrl =
  process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

await initMoodStore();
app.listen(PORT, () => {
  console.log(`🌙 Moodring listening on ${shownUrl}`);
  console.log(`   x402 manifest: ${shownUrl}/.well-known/x402`);
  console.log(`   receive address: ${process.env.RECEIVE_ADDRESS || '(unset — paid services will advertise 0x000…)'}`);
});
