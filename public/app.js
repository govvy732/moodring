// Moodring interactive front-end. Hits the live /api/mood/demo endpoint
// for the demo widget, and computes a 7-day synthetic mood for any wallet
// for the "wallet weather" widget.

// Auto-detect API base — works locally, on Render, and on custom domains
const API_BASE = window.location.origin;

const PRESETS = {
  loss: "Just lost 30% on a position. The market's brutal today. I should have sold earlier. Sleep is going to be tough tonight.",
  win: "JUST HIT A HUGE WIN! 🚀🚀 Finally paid off! I'm so hyped right now!! Best day ever!",
  tired: "Ugh I'm so tired. Couldn't fall asleep last night. Brain won't shut off. Got a big day tomorrow too.",
  calm: "Quiet morning. Coffee in hand. Light coming through the window. Feeling pretty good actually.",
  angry: "FUCK. Got rugged. Lost everything. I am SO mad right now. Can't believe this happened again.",
};

const MOOD_EMOJI = {
  energized: '⚡',
  content: '🙂',
  peaceful: '🌿',
  agitated: '⚠️',
  subdued: '🌧️',
  deflated: '🪨',
  activated: '🔥',
  neutral: '🌫️',
};

const MOOD_COLOR = {
  energized: '#FF6B35',
  content: '#4ECDC4',
  peaceful: '#A8DADC',
  agitated: '#E63946',
  subdued: '#B5838D',
  deflated: '#6D6875',
  activated: '#fb923c',
  neutral: '#F1FAEE',
};

// ============================================================
// DEMO WIDGET
// ============================================================
const demoText = document.getElementById('demo-text');
const demoRun = document.getElementById('demo-run');
const demoOutput = document.getElementById('demo-output');

document.querySelectorAll('.chip[data-preset]').forEach((chip) => {
  chip.addEventListener('click', () => {
    demoText.value = PRESETS[chip.dataset.preset];
  });
});

demoRun.addEventListener('click', async () => {
  const text = demoText.value.trim();
  if (!text) {
    demoOutput.innerHTML = '<div class="demo-empty"><p>Type something or pick a preset first.</p></div>';
    return;
  }
  demoOutput.innerHTML = '<div class="demo-empty"><div class="demo-empty-ring"></div><p>Classifying…</p></div>';
  try {
    const res = await fetch(`${API_BASE}/api/mood/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      demoOutput.innerHTML = `<div class="demo-empty"><p style="color: var(--red)">${data.error}: ${data.message}</p></div>`;
      return;
    }
    renderDemoResult(data);
  } catch (err) {
    demoOutput.innerHTML = `<div class="demo-empty"><p style="color: var(--red)">Network error: ${err.message}</p></div>`;
  }
});

function renderDemoResult(mood) {
  const emoji = MOOD_EMOJI[mood.label] || '🌫️';
  const signals = mood.signals || {};
  const signalTags = Object.entries(signals)
    .map(([k, v]) => `<span class="signal-tag">${k} × ${v}</span>`)
    .join('') || '<span class="signal-tag">no signals</span>';

  demoOutput.innerHTML = `
    <div class="demo-output-result">
      <div class="mood-card">
        <div class="mood-emoji">${emoji}</div>
        <div class="mood-label" style="color: ${MOOD_COLOR[mood.label] || '#fff'}">${mood.label}</div>
        <div class="mood-vals">
          <div>valence<strong>${mood.valence}</strong></div>
          <div>arousal<strong>${mood.arousal}</strong></div>
          <div>intensity<strong>${mood.intensity}</strong></div>
        </div>
      </div>
      <div class="mood-section">
        <h4>Detected signals</h4>
        <div>${signalTags}</div>
      </div>
      <div class="mood-section">
        <h4>What an agent should do</h4>
        <div class="action-card">
          <strong>trader:</strong> ${getActionForRole(mood.label, 'trader')}<br/>
          <strong>assistant:</strong> ${getActionForRole(mood.label, 'assistant')}<br/>
          <strong>social:</strong> ${getActionForRole(mood.label, 'social')}<br/>
          <strong>dating:</strong> ${getActionForRole(mood.label, 'dating')}
        </div>
      </div>
    </div>
  `;
}

const QUICK_ACTIONS = {
  trader: {
    energized: 'Stick to your plan. Set alerts, don\'t chase.',
    content: 'Good time to rebalance. Take the small gains.',
    peaceful: 'Review your thesis. Quiet mind, clear decisions.',
    agitated: 'Close the app. The market will be here in 30 min.',
    subdued: 'Skip today. Even one forced trade is one too many.',
    deflated: 'Don\'t check P&L. It\'s a number, not a verdict.',
    activated: 'Move first, trade second. Walk before you click.',
    neutral: 'Default to no-action unless the signal is clean.',
  },
  assistant: {
    energized: 'Ask what they want to ship next. Match their pace.',
    content: 'Good moment for the next-best-action suggestion.',
    peaceful: 'Offer one optional thing. Don\'t fill the silence.',
    agitated: 'Ask how they\'re doing before pitching anything.',
    subdued: 'No new tasks. Just acknowledge and stay close.',
    deflated: 'No upsell. No nudges. Just presence.',
    activated: 'Move the body with them. Walk, stretch, breathe.',
    neutral: 'Ask one open question and wait.',
  },
  social: {
    energized: 'Post it. Ride the wave.',
    content: 'A short, warm update. Don\'t overthink it.',
    peaceful: 'A single photo. Let the image speak.',
    agitated: 'Don\'t post. Sleep on it.',
    subdued: 'Send a private message instead of a public post.',
    deflated: 'Reach out to one person, not the feed.',
    activated: 'Channel it. Write, make, move.',
    neutral: 'A check-in post. Low effort, real presence.',
  },
  dating: {
    energized: 'Send the bold opener. You\'ve got the runway.',
    content: 'Genuine interest, light touch. Don\'t over-curate.',
    peaceful: 'A long message, not a short one. Depth wins here.',
    agitated: 'Pause the swiping. You\'re projecting.',
    subdued: 'Reply to one existing match. Build, don\'t browse.',
    deflated: 'No matches today. Connection starts with you.',
    activated: 'Voice note > text. Let tone carry what words can\'t.',
    neutral: 'Ask one specific question. Skip "hey".',
  },
};

function getActionForRole(label, role) {
  return QUICK_ACTIONS[role]?.[label] || '—';
}

// ============================================================
// WALLET WEATHER WIDGET
// ============================================================
const walletAddr = document.getElementById('wallet-addr');
const walletRun = document.getElementById('wallet-run');
const walletOutput = document.getElementById('wallet-output');

walletRun.addEventListener('click', () => {
  const addr = walletAddr.value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    walletOutput.innerHTML = '<div class="demo-empty"><p style="color: var(--red)">Enter a valid 0x… address.</p></div>';
    return;
  }
  // Compute a deterministic 7-day synthetic forecast from the address.
  // In a real implementation, this would call the X Layer RPC and feed
  // recent transactions to /api/mood/track. For the demo, we hash the
  // address to seed a stable but unique pattern per wallet.
  const seed = hashCode(addr);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const heights = [];
  for (let i = 0; i < 7; i++) {
    const h = 30 + ((Math.abs(seed + i * 17) % 60));
    heights.push(h);
  }
  const dominantMood =
    heights.reduce((a, b) => a + b, 0) / 7 > 60 ? 'agitated' : 'subdued';
  const emoji = MOOD_EMOJI[dominantMood];
  const color = MOOD_COLOR[dominantMood];

  walletOutput.innerHTML = `
    <div class="weather-bar">
      ${heights
        .map(
          (h, i) =>
            `<div class="weather-day" style="height: ${h}%; background: linear-gradient(180deg, ${color}, #a78bfa);"><span class="day-label">${days[i]}</span></div>`
        )
        .join('')}
    </div>
    <div class="weather-summary">
      <div>
        <div style="font-size: 24px">${emoji}</div>
        <strong style="text-transform: capitalize; color: ${color}">${dominantMood}</strong>
      </div>
      <div style="text-align: right">
        <div style="font-size: 11px; color: var(--fg-faint); margin-bottom: 4px">7-day average intensity</div>
        <strong>${(heights.reduce((a, b) => a + b, 0) / 700).toFixed(2)}</strong>
      </div>
    </div>
    <div style="margin-top: 16px; padding: 12px; background: var(--bg); border-radius: 8px; font-size: 13px; color: var(--fg-dim);">
      <strong style="color: var(--accent)">Demo mode</strong> — synthetic forecast from address hash. Live version pipes real X Layer activity to <code>/api/mood/track</code> via x402.
    </div>
  `;
});

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

// ============================================================
// CODE TABS
// ============================================================
document.querySelectorAll('.code-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.code-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.code-block').forEach((b) => b.classList.add('hidden'));
    const target = document.getElementById(`code-${tab.dataset.lang}`);
    if (target) target.classList.remove('hidden');
  });
});
