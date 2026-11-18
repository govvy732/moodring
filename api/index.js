// Vercel serverless entry. Static files in public/ are served by Vercel's CDN;
// every API route is rewritten here (see vercel.json).
import app from '../src/app.js';
import { initMoodStore } from '../src/moodStore.js';

initMoodStore().catch((err) => console.error('mood store init failed', err));

export default app;
