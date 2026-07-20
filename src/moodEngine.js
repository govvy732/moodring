// Moodring core engine — pure functions, no external AI dependency.
// Deterministic classification so any agent can rely on the output.

const POSITIVE_WORDS = new Set([
  'love', 'great', 'amazing', 'awesome', 'happy', 'excited', 'win', 'won', 'profit',
  'gain', 'moon', 'pump', 'bullish', 'best', 'fantastic', 'wonderful', 'thrilled',
  'grateful', 'blessed', 'fire', 'lit', 'based', 'wagmi', 'lfg', 'good', 'nice',
  'thanks', 'thank', 'appreciate', 'kind', 'proud', 'celebrate', 'celebration',
  'incredible', 'perfect', 'beautiful', 'gorgeous', 'stunning', 'glad', 'delighted',
  'peaceful', 'calm', 'serene', 'content', 'joyful', 'joy',
]);

const NEGATIVE_WORDS = new Set([
  'hate', 'terrible', 'awful', 'sad', 'angry', 'lost', 'lose', 'loss', 'rugpull',
  'rug', 'scam', 'dump', 'crash', 'bearish', 'worst', 'horrible', 'devastated',
  'frustrated', 'frustrating', 'tired', 'exhausted', 'anxious', 'worried', 'scared', 'afraid',
  'lonely', 'depressed', 'stressed', 'overwhelmed', 'broken', 'hurt', 'pain',
  'sick', 'tough', 'hard', 'difficult', 'fail', 'failed', 'rekt', 'ngmi',
  'furious', 'fury', 'rage', 'mad', 'pissed', 'outraged', 'infuriated',
  'useless', 'hopeless', 'miserable', 'suffering',
]);

const HIGH_AROUSAL = new Set([
  '!', '!!', '!!!', 'WTF', 'OMG', 'FUCK', 'SHIT', 'DAMN', 'WHAT', 'HUH', 'WOW',
  'AHH', 'AHHH', 'GAAAH', 'FFFF', 'AAAA', 'NOOO', 'YESSS', 'YESS', 'NOOOO',
  'LFG', 'WAGMI', 'REKT', 'FOMO', 'FUD', 'WTF', 'SMH', 'BRUH',
]);

const LIFESTYLE_SIGNALS = {
  sleep: ['sleep', 'tired', 'exhausted', 'insomnia', 'awake', 'rest', 'bed', 'nap', 'dream'],
  food: ['eat', 'eating', 'food', 'hungry', 'meal', 'breakfast', 'lunch', 'dinner', 'snack'],
  movement: ['run', 'running', 'walk', 'walking', 'gym', 'workout', 'lift', 'lifting', 'yoga', 'stretch'],
  social: ['friend', 'family', 'partner', 'date', 'lonely', 'alone', 'together', 'meet', 'party'],
  money: ['paid', 'salary', 'rent', 'broke', 'bill', 'money', 'cash', 'income', 'budget'],
  health: ['sick', 'headache', 'fever', 'cough', 'pain', 'doctor', 'meds', 'medicine'],
};

// =====================================================================
// classifyMood — returns a 5-axis mood vector
// valence:   -1 (negative)  to +1 (positive)
// arousal:   -1 (calm)      to +1 (intense)
// intensity:  0 (flat)      to  1 (strong)
// label:     1 of 9 categorical labels
// signals:   detected lifestyle domains (for downstream filtering)
// =====================================================================
export function classifyMood({ text = '', wallet = null, transaction = null } = {}) {
  const lower = (text || '').toLowerCase();
  const tokens = lower.split(/\s+/).filter(Boolean);

  let positiveCount = 0;
  let negativeCount = 0;
  let arousalBoost = 0;
  const signals = {};

  for (const tok of tokens) {
    const clean = tok.replace(/[^a-z0-9!]/g, '');
    const upper = clean.toUpperCase();
    if (POSITIVE_WORDS.has(clean) || POSITIVE_WORDS.has(tok)) positiveCount++;
    if (NEGATIVE_WORDS.has(clean) || NEGATIVE_WORDS.has(tok)) negativeCount++;
    if (clean.includes('!')) arousalBoost += 0.05;
    if (clean === clean.toUpperCase() && clean.length > 1) arousalBoost += 0.15;
    if (HIGH_AROUSAL.has(upper)) arousalBoost += 0.2;
  }

  for (const [domain, words] of Object.entries(LIFESTYLE_SIGNALS)) {
    const hits = words.filter((w) => lower.includes(w)).length;
    if (hits > 0) signals[domain] = hits;
  }

  // Wallet-derived signals (if passed)
  if (wallet) {
    if (wallet.balanceChange24h !== undefined) {
      if (wallet.balanceChange24h > 0.05) positiveCount += 2;
      if (wallet.balanceChange24h < -0.05) negativeCount += 2;
      signals.money = (signals.money || 0) + 1;
    }
    if (wallet.recentTxCount !== undefined && wallet.recentTxCount > 20) {
      arousalBoost += 0.3;
      signals.activity = wallet.recentTxCount;
    }
  }

  // Transaction-derived signals
  if (transaction) {
    if (transaction.type === 'sell' && transaction.loss) {
      negativeCount += 3;
      signals.money = (signals.money || 0) + 1;
    }
    if (transaction.type === 'buy') {
      positiveCount += 1;
      signals.money = (signals.money || 0) + 1;
    }
  }

  const total = positiveCount + negativeCount;
  // More sensitive valence: use a smaller denominator so strong inputs register
  const valence = total === 0 ? 0 : (positiveCount - negativeCount) / Math.max(total, 2.5);
  const arousal = Math.max(-1, Math.min(1, arousalBoost * 1.5));
  const intensity = Math.min(1, total / 6 + arousalBoost);

  // Map to 9 categorical labels
  let label;
  if (intensity < 0.15) label = 'neutral';
  else if (valence > 0.15 && arousal > 0.15) label = 'energized';
  else if (valence > 0.15 && arousal <= 0.15) label = 'content';
  else if (valence > 0.15 && arousal < -0.15) label = 'peaceful';
  else if (valence < -0.15 && arousal > 0.15) label = 'agitated';
  else if (valence < -0.15 && arousal <= 0.15) label = 'subdued';
  else if (valence < -0.15 && arousal < -0.15) label = 'deflated';
  else if (valence >= -0.15 && valence <= 0.15 && arousal > 0.15) label = 'activated';
  else label = 'neutral';

  return {
    valence: +valence.toFixed(3),
    arousal: +arousal.toFixed(3),
    intensity: +intensity.toFixed(3),
    label,
    signals,
    positiveCount,
    negativeCount,
  };
}

// =====================================================================
// generateIntervention — returns a 60-second ritual (breath + affirmation
// + color + song) tailored to the detected mood. Stateless, deterministic.
// =====================================================================
const INTERVENTIONS = {
  energized: {
    breath: { pattern: 'box', seconds: 16, steps: ['inhale 4s', 'hold 4s', 'exhale 4s', 'hold 4s'] },
    affirmation: 'Your fire is real. Channel it into one specific thing in the next hour.',
    color: '#FF6B35',
    song: { title: 'Don\'t Stop Me Now', artist: 'Queen', mood: 'amplify' },
  },
  content: {
    breath: { pattern: '4-7-8', seconds: 19, steps: ['inhale 4s', 'hold 7s', 'exhale 8s'] },
    affirmation: 'Steady wins. The slow path is the real path.',
    color: '#4ECDC4',
    song: { title: 'Here Comes the Sun', artist: 'The Beatles', mood: 'savor' },
  },
  peaceful: {
    breath: { pattern: 'coherent', seconds: 30, steps: ['inhale 5s', 'exhale 5s — repeat 3x'] },
    affirmation: 'This calm is earned. Stay here a little longer.',
    color: '#A8DADC',
    song: { title: 'Weightless', artist: 'Marconi Union', mood: 'anchor' },
  },
  agitated: {
    breath: { pattern: 'extended-exhale', seconds: 24, steps: ['inhale 4s', 'exhale 8s — repeat 3x'] },
    affirmation: 'You don\'t have to decide anything in the next 10 minutes.',
    color: '#457B9D',
    song: { title: 'Breathe Me', artist: 'Sia', mood: 'soften' },
  },
  subdued: {
    breath: { pattern: 'belly', seconds: 20, steps: ['hand on belly, inhale 4s, feel it rise, exhale 6s'] },
    affirmation: 'Small steps count. One tiny thing, then the next.',
    color: '#B5838D',
    song: { title: 'Holocene', artist: 'Bon Iver', mood: 'rebuild' },
  },
  deflated: {
    breath: { pattern: 'coherent', seconds: 30, steps: ['inhale 5s, exhale 5s — 3 rounds'] },
    affirmation: 'This is a chapter, not the whole book.',
    color: '#6D6875',
    song: { title: 'Everything In Its Right Place', artist: 'Radiohead', mood: 'reset' },
  },
  activated: {
    breath: { pattern: 'physiological-sigh', seconds: 18, steps: ['double inhale through nose, long exhale through mouth — 3x'] },
    affirmation: 'Move the body. The mind will follow.',
    color: '#E63946',
    song: { title: 'Lose Yourself', artist: 'Eminem', mood: 'channel' },
  },
  neutral: {
    breath: { pattern: 'box', seconds: 16, steps: ['inhale 4s', 'hold 4s', 'exhale 4s', 'hold 4s'] },
    affirmation: 'A blank page is also a beginning.',
    color: '#F1FAEE',
    song: { title: 'Clair de Lune', artist: 'Debussy', mood: 'open' },
  },
};

export function generateIntervention(mood) {
  const ritual = INTERVENTIONS[mood.label] || INTERVENTIONS.neutral;
  return {
    durationSeconds: ritual.breath.seconds,
    breath: ritual.breath,
    affirmation: ritual.affirmation,
    color: ritual.color,
    colorName: colorName(ritual.color),
    song: ritual.song,
    shareable: {
      text: `My current mood: ${mood.label}. Today's ritual: ${ritual.song.title} by ${ritual.song.artist}. ${ritual.affirmation}`,
      url: 'https://moodring.onrender.com',
    },
  };
}

// =====================================================================
// suggestAgentAction — returns the recommended next action for the
// calling agent given the emotional state and the agent's role.
// =====================================================================
const ROLE_ADVICE = {
  trader: {
    energized: { do: 'Stick to your plan. Set alerts, don\'t chase.', tone: 'measured', intensity: 'low' },
    content: { do: 'Good time to rebalance. Take the small gains.', tone: 'encouraging', intensity: 'medium' },
    peaceful: { do: 'Review your thesis. Quiet mind, clear decisions.', tone: 'calm', intensity: 'low' },
    agitated: { do: 'Close the app. The market will be here in 30 min.', tone: 'gentle', intensity: 'zero' },
    subdued: { do: 'Skip today. Even one forced trade is one too many.', tone: 'gentle', intensity: 'zero' },
    deflated: { do: 'Don\'t check P&L. It\'s a number, not a verdict.', tone: 'gentle', intensity: 'zero' },
    activated: { do: 'Move first, trade second. Walk before you click.', tone: 'urgent', intensity: 'high' },
    neutral: { do: 'Default to no-action unless the signal is clean.', tone: 'neutral', intensity: 'low' },
  },
  assistant: {
    energized: { do: 'Ask what they want to ship next. Match their pace.', tone: 'matching', intensity: 'high' },
    content: { do: 'Good moment for the next-best-action suggestion.', tone: 'warm', intensity: 'medium' },
    peaceful: { do: 'Offer one optional thing. Don\'t fill the silence.', tone: 'soft', intensity: 'low' },
    agitated: { do: 'Ask how they\'re doing before pitching anything.', tone: 'gentle', intensity: 'zero' },
    subdued: { do: 'No new tasks. Just acknowledge and stay close.', tone: 'gentle', intensity: 'zero' },
    deflated: { do: 'No upsell. No nudges. Just presence.', tone: 'gentle', intensity: 'zero' },
    activated: { do: 'Move the body with them. Walk, stretch, breathe.', tone: 'urgent', intensity: 'high' },
    neutral: { do: 'Ask one open question and wait.', tone: 'neutral', intensity: 'low' },
  },
  social: {
    energized: { do: 'Post it. Ride the wave.', tone: 'matching', intensity: 'high' },
    content: { do: 'A short, warm update. Don\'t overthink it.', tone: 'warm', intensity: 'medium' },
    peaceful: { do: 'A single photo. Let the image speak.', tone: 'soft', intensity: 'low' },
    agitated: { do: 'Don\'t post. Sleep on it.', tone: 'gentle', intensity: 'zero' },
    subdued: { do: 'Send a private message instead of a public post.', tone: 'gentle', intensity: 'zero' },
    deflated: { do: 'Reach out to one person, not the feed.', tone: 'gentle', intensity: 'zero' },
    activated: { do: 'Channel it. Write, make, move.', tone: 'urgent', intensity: 'high' },
    neutral: { do: 'A check-in post. Low effort, real presence.', tone: 'neutral', intensity: 'low' },
  },
  dating: {
    energized: { do: 'Send the bold opener. You\'ve got the runway.', tone: 'playful', intensity: 'high' },
    content: { do: 'Genuine interest, light touch. Don\'t over-curate.', tone: 'warm', intensity: 'medium' },
    peaceful: { do: 'A long message, not a short one. Depth wins here.', tone: 'soft', intensity: 'low' },
    agitated: { do: 'Pause the swiping. You\'re projecting.', tone: 'gentle', intensity: 'zero' },
    subdued: { do: 'Reply to one existing match. Build, don\'t browse.', tone: 'gentle', intensity: 'zero' },
    deflated: { do: 'No matches today. Connection starts with you.', tone: 'gentle', intensity: 'zero' },
    activated: { do: 'Voice note > text. Let tone carry what words can\'t.', tone: 'urgent', intensity: 'high' },
    neutral: { do: 'Ask one specific question. Skip "hey".', tone: 'neutral', intensity: 'low' },
  },
  creative: {
    energized: { do: 'Make the thing. Don\'t edit yet.', tone: 'matching', intensity: 'high' },
    content: { do: 'Good window for the second draft. First is done.', tone: 'warm', intensity: 'medium' },
    peaceful: { do: 'Read something old. The reference bank needs refill.', tone: 'soft', intensity: 'low' },
    agitated: { do: 'No publishing. No posting. Just vent somewhere private.', tone: 'gentle', intensity: 'zero' },
    subdued: { do: 'Look at your archive. Remind yourself what you\'ve made.', tone: 'gentle', intensity: 'zero' },
    deflated: { do: 'Touch one tool. Even opening the file counts.', tone: 'gentle', intensity: 'zero' },
    activated: { do: 'Ship the rough version. Refinement can wait.', tone: 'urgent', intensity: 'high' },
    neutral: { do: 'Sketch for 10 min. No goal. Just movement.', tone: 'neutral', intensity: 'low' },
  },
};

export function suggestAgentAction(mood, agentRole = 'assistant') {
  const role = ROLE_ADVICE[agentRole] || ROLE_ADVICE.assistant;
  const advice = role[mood.label] || role.neutral;
  return {
    agentRole,
    ...advice,
    moodContext: {
      label: mood.label,
      valence: mood.valence,
      arousal: mood.arousal,
      intensity: mood.intensity,
    },
  };
}

function colorName(hex) {
  const names = {
    '#FF6B35': 'amber-coral',
    '#4ECDC4': 'mint-cyan',
    '#A8DADC': 'mist-blue',
    '#457B9D': 'slate-blue',
    '#B5838D': 'dusty-rose',
    '#6D6875': 'muted-lilac',
    '#E63946': 'signal-red',
    '#F1FAEE': 'paper-white',
  };
  return names[hex] || 'unknown';
}
