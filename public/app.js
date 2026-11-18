// Moodring landing page. Vanilla JS, no build step.
// - Demo widget calls the real /api/mood/demo on whatever host serves this page.
// - Wallet weather is a clearly labelled, simulated preview (no onchain reads).
(() => {
  const API_BASE = window.location.origin;
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const PRESETS = {
    loss: "Just lost 30% on a position. The market's brutal today. Sleep is going to be tough tonight.",
    win: 'JUST HIT A HUGE WIN! 🚀 Finally paid off! So happy right now!! Best day ever!',
    tired: "Ugh, so tired. Couldn't sleep last night and I'm exhausted. Feeling pretty hopeless.",
    calm: 'Quiet morning. Coffee in hand, light through the window. Feeling calm and grateful.',
    angry: "FUCK. Got rugged. Lost everything. I am SO mad right now. Can't believe this happened again.",
    negation: "Honestly I'm not happy with how this week went.",
  };

  const MOOD = {
    energized: { emoji: '⚡', color: '#FF6B35' },
    content: { emoji: '🙂', color: '#4ECDC4' },
    peaceful: { emoji: '🌿', color: '#A8DADC' },
    activated: { emoji: '🔥', color: '#fb923c' },
    neutral: { emoji: '🌫️', color: '#d4d4d8' },
    agitated: { emoji: '⚠️', color: '#E63946' },
    subdued: { emoji: '🌧️', color: '#B5838D' },
    deflated: { emoji: '🪨', color: '#8b84a0' },
  };

  // Mirrors the role advice mood_oracle returns (src/moodEngine.js), so the free
  // demo can show what a paid oracle call would tell the agent.
  const ADVICE = {
    assistant: {
      energized: 'Ask what they want to ship next. Match their pace.',
      content: 'Good moment for the next-best-action suggestion.',
      peaceful: "Offer one optional thing. Don't fill the silence.",
      agitated: "Ask how they're doing before pitching anything.",
      subdued: 'No new tasks. Just acknowledge and stay close.',
      deflated: 'No upsell. No nudges. Just presence.',
      activated: 'Move the body with them. Walk, stretch, breathe.',
      neutral: 'Ask one open question and wait.',
    },
    trader: {
      energized: "Stick to your plan. Set alerts, don't chase.",
      content: 'Good time to rebalance. Take the small gains.',
      peaceful: 'Review your thesis. Quiet mind, clear decisions.',
      agitated: 'Close the app. The market will be here in 30 min.',
      subdued: 'Skip today. Even one forced trade is one too many.',
      deflated: "Don't check P&L. It's a number, not a verdict.",
      activated: 'Move first, trade second. Walk before you click.',
      neutral: 'Default to no-action unless the signal is clean.',
    },
    social: {
      energized: 'Post it. Ride the wave.',
      content: "A short, warm update. Don't overthink it.",
      peaceful: 'A single photo. Let the image speak.',
      agitated: "Don't post. Sleep on it.",
      subdued: 'Send a private message instead of a public post.',
      deflated: 'Reach out to one person, not the feed.',
      activated: 'Channel it. Write, make, move.',
      neutral: 'A check-in post. Low effort, real presence.',
    },
    dating: {
      energized: "Send the bold opener. You've got the runway.",
      content: "Genuine interest, light touch. Don't over-curate.",
      peaceful: 'A long message, not a short one. Depth wins here.',
      agitated: "Pause the swiping. You're projecting.",
      subdued: "Reply to one existing match. Build, don't browse.",
      deflated: 'No matches today. Connection starts with you.',
      activated: "Voice note > text. Let tone carry what words can't.",
      neutral: 'Ask one specific question. Skip "hey".',
    },
    creative: {
      energized: "Make the thing. Don't edit yet.",
      content: 'Good window for the second draft. First is done.',
      peaceful: 'Read something old. The reference bank needs refill.',
      agitated: 'No publishing. No posting. Just vent somewhere private.',
      subdued: "Look at your archive. Remind yourself what you've made.",
      deflated: 'Touch one tool. Even opening the file counts.',
      activated: 'Ship the rough version. Refinement can wait.',
      neutral: 'Sketch for 10 min. No goal. Just movement.',
    },
  };

  // ---------- Fill live origin into code snippets ----------
  document.querySelectorAll('.origin').forEach((el) => (el.textContent = API_BASE));

  // ---------- Hero moon reacts to the last read ----------
  function setMoon(label) {
    const m = MOOD[label] || MOOD.neutral;
    const moon = $('#hero-moon');
    if (!moon) return;
    moon.style.setProperty('--mood', m.color);
    $('#hero-emoji').textContent = m.emoji;
    $('#hero-caption').textContent = `last read: ${label}`;
  }

  // ---------- Demo ----------
  const input = $('#demo-text');
  const out = $('#demo-output');
  const runBtn = $('#demo-run');
  const roleSel = $('#demo-role');
  let last = null;

  document.querySelectorAll('.preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      input.value = PRESETS[btn.dataset.preset] || '';
      run();
    });
  });
  runBtn.addEventListener('click', run);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run();
  });
  roleSel.addEventListener('change', () => last && render(last));

  async function run() {
    const text = input.value.trim() || input.placeholder;
    if (!input.value.trim()) input.value = text;
    runBtn.disabled = true;
    runBtn.textContent = 'Reading…';
    try {
      const r = await fetch(`${API_BASE}/api/mood/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || `HTTP ${r.status}`);
      last = j;
      render(j);
    } catch (err) {
      out.innerHTML = `<p class="error">Couldn't reach the demo: ${esc(err.message)}</p>`;
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = 'Read the mood';
    }
  }

  function meter(name, value, centered) {
    // centered: -1..1 drawn from the middle; otherwise 0..1 from the left
    const v = Number(value) || 0;
    let style;
    if (centered) {
      const w = Math.abs(v) * 50;
      style = v >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`;
    } else {
      style = `left:0;width:${Math.max(0, Math.min(1, v)) * 100}%`;
    }
    return `<div class="meter"><span>${name}</span><div class="meter-track${centered ? ' center' : ''}"><div class="meter-fill" style="${style}"></div></div><span class="meter-val">${v.toFixed(2)}</span></div>`;
  }

  function render(j) {
    const m = MOOD[j.label] || MOOD.neutral;
    const role = roleSel.value;
    const advice = (ADVICE[role] || ADVICE.assistant)[j.label] || '—';
    const signals = Object.entries(j.signals || {});
    const raw = { ...j };
    out.innerHTML = `
      <div class="result" style="--mood:${m.color}">
        <div class="result-head">
          <div class="result-emoji" aria-hidden="true">${m.emoji}</div>
          <div>
            <div class="result-label">${esc(j.label)}</div>
            <div class="result-sub">mood label · from /api/mood/demo</div>
          </div>
        </div>
        <div class="meters">
          ${meter('Valence', j.valence, true)}
          ${meter('Arousal', j.arousal, true)}
          ${meter('Intensity', j.intensity, false)}
        </div>
        ${signals.length ? `<div class="signals">${signals.map(([k, v]) => `<span>${esc(k)} × ${esc(v)}</span>`).join('')}</div>` : ''}
        <div class="advice">
          <small>Advice for a ${esc(role)} agent · mood_oracle</small>
          <p>${esc(advice)}</p>
        </div>
        <details class="raw"><summary>Raw JSON response</summary><pre>${esc(JSON.stringify(raw, null, 2))}</pre></details>
      </div>`;
    setMoon(j.label);
  }

  // ---------- Code tabs + copy ----------
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      document.querySelectorAll('.code-block').forEach((b) => b.classList.add('hidden'));
      $(`#code-${tab.dataset.lang}`)?.classList.remove('hidden');
    });
  });
  $('#copy-code')?.addEventListener('click', async (e) => {
    const block = document.querySelector('.code-block:not(.hidden)');
    try {
      await navigator.clipboard.writeText(block.innerText);
      e.target.textContent = 'Copied';
    } catch {
      e.target.textContent = 'Select & copy';
    }
    setTimeout(() => (e.target.textContent = 'Copy'), 1500);
  });

  // ---------- Wallet weather (SIMULATED PREVIEW) ----------
  // Deterministic pseudo-forecast seeded from the address. No RPC calls, no real data.
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  $('#wallet-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const addr = $('#wallet-addr').value.trim();
    const wout = $('#wallet-output');
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      wout.innerHTML = '<p class="error" style="margin:0">Enter a valid 0x… address (40 hex characters).</p>';
      return;
    }
    let seed = hash(addr.toLowerCase());
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const heights = days.map(() => {
      seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0;
      return 25 + (seed % 70);
    });
    const avg = heights.reduce((a, b) => a + b, 0) / 7;
    const label = avg > 72 ? 'energized' : avg > 60 ? 'activated' : avg > 48 ? 'content' : avg > 38 ? 'subdued' : 'peaceful';
    const m = MOOD[label];
    wout.innerHTML = `
      <div style="--mood:${m.color}">
        <div class="weather">${heights
          .map((h, i) => `<div class="weather-day" style="height:${h}%;animation-delay:${i * 40}ms"><span>${days[i]}</span></div>`)
          .join('')}</div>
        <div class="weather-sum">
          <div>${m.emoji} <strong>${label}</strong> <span class="muted">· simulated forecast</span></div>
          <span class="tag-preview">Preview · not real onchain data</span>
        </div>
      </div>`;
  });
})();
