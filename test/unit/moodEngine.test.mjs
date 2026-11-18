// Unit tests for the deterministic mood engine. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyMood,
  generateIntervention,
  suggestAgentAction,
  MOOD_LABELS,
} from '../../src/moodEngine.js';

const read = (text) => classifyMood({ text });

test('positive text is positive', () => {
  const m = read('I am so happy today, this is great');
  assert.ok(m.valence > 0, `valence ${m.valence}`);
  assert.equal(m.label, 'content');
});

test('negation: "not happy" is not positive', () => {
  const m = read('I am not happy');
  assert.ok(m.valence < 0, `valence ${m.valence}`);
  assert.notEqual(m.label, 'content');
  assert.notEqual(m.label, 'energized');
});

test("negation with contraction: \"don't love\" is not positive", () => {
  const m = read("I don't love this at all");
  assert.ok(m.valence < 0, `valence ${m.valence}`);
});

test('negation of a negative word is mildly positive ("not terrible")', () => {
  const m = read('honestly not terrible');
  assert.ok(m.valence > 0, `valence ${m.valence}`);
});

test('negation does not leak across sentences', () => {
  const m = read('Not today. I am happy now.');
  assert.ok(m.valence > 0, `valence ${m.valence}`);
});

test('signals use word boundaries: "interest" does not trigger sleep (rest)', () => {
  const m = read('I have a lot of interest in this project');
  assert.equal(m.signals.sleep, undefined, JSON.stringify(m.signals));
});

test('signals use word boundaries: "breakfast" yes, "feat" does not trigger food (eat)', () => {
  assert.ok(read('Need breakfast').signals.food);
  assert.equal(read('What a feat').signals.food, undefined);
});

test('"I\'ll" is not read as the health word "ill"', () => {
  assert.equal(read("I'll be there soon").signals.health, undefined);
});

test('sleep domain is detected', () => {
  const m = read("So tired. Can't sleep. Exhausted.");
  assert.ok(m.signals.sleep >= 2, JSON.stringify(m.signals));
});

test('ALL CAPS raises arousal (detected before lowercasing)', () => {
  const calm = read('this is amazing');
  const loud = read('THIS IS AMAZING');
  assert.ok(loud.arousal > calm.arousal, `${loud.arousal} vs ${calm.arousal}`);
  assert.equal(loud.label, 'energized');
});

test('lowercase "what" is not treated as shouting', () => {
  assert.equal(read('what is happening').arousal, 0);
  assert.ok(read('WHAT IS HAPPENING').arousal > 0);
});

test('single capital letters and "I" do not count as caps', () => {
  assert.equal(read('I think I am okay').arousal, 0);
});

test('exclamation marks raise arousal', () => {
  assert.ok(read('great!!!').arousal > read('great').arousal);
});

test('every advertised label is reachable', () => {
  const samples = {
    energized: 'AMAZING!! Just hit a huge win! So happy, best day ever!',
    content: 'Feeling good, grateful for my friends',
    peaceful: 'Quiet morning, calm and grateful',
    activated: 'WHAT IS HAPPENING RIGHT NOW',
    neutral: 'Just a regular Tuesday.',
    agitated: 'FUCK. Got rugged. I am SO mad right now.',
    subdued: 'I hate this market, lost again',
    deflated: 'So tired and hopeless. Exhausted.',
  };
  assert.deepEqual(Object.keys(samples).sort(), [...MOOD_LABELS].sort());
  for (const [label, text] of Object.entries(samples)) {
    assert.equal(read(text).label, label, `"${text}" → ${read(text).label}, expected ${label}`);
  }
});

test('empty input is neutral and well-formed', () => {
  const m = classifyMood();
  assert.equal(m.label, 'neutral');
  assert.equal(m.valence, 0);
  assert.equal(m.arousal, 0);
  assert.equal(m.intensity, 0);
  assert.deepEqual(m.signals, {});
});

test('output ranges are bounded', () => {
  const m = read('WTF WTF WTF!!! FUCK SHIT DAMN '.repeat(20));
  assert.ok(m.valence >= -1 && m.valence <= 1);
  assert.ok(m.arousal >= -1 && m.arousal <= 1);
  assert.ok(m.intensity >= 0 && m.intensity <= 1);
});

test('deterministic: same input, same output', () => {
  const t = 'Lost money but grateful for my family. Not sleeping well!';
  assert.deepEqual(read(t), read(t));
});

test('wallet and transaction signals', () => {
  const up = classifyMood({ wallet: { balanceChange24h: 0.2, recentTxCount: 30 } });
  assert.ok(up.valence > 0);
  assert.ok(up.signals.money && up.signals.activity === 30);
  const loss = classifyMood({ transaction: { type: 'sell', loss: true } });
  assert.ok(loss.valence < 0);
});

test('fast: 10k classifications well under a second', () => {
  const t0 = performance.now();
  for (let i = 0; i < 10_000; i++) read('Just lost 30% on a position. Sleep is going to be tough. I hate this market.');
  const ms = performance.now() - t0;
  assert.ok(ms < 1000, `took ${ms.toFixed(0)}ms`);
});

test('generateIntervention: shape and shareable url from baseUrl', () => {
  for (const label of MOOD_LABELS) {
    const r = generateIntervention({ label }, { baseUrl: 'https://example.test' });
    assert.ok(r.breath.steps.length > 0);
    assert.ok(r.affirmation && r.color && r.song.title);
    assert.equal(r.shareable.url, 'https://example.test');
    assert.ok(!JSON.stringify(r).includes('onrender.com'));
  }
});

test('suggestAgentAction: every role × label has advice', () => {
  for (const role of ['trader', 'assistant', 'social', 'dating', 'creative']) {
    for (const label of MOOD_LABELS) {
      const a = suggestAgentAction({ label, valence: 0, arousal: 0, intensity: 0 }, role);
      assert.equal(a.agentRole, role);
      assert.ok(a.do, `${role}/${label}`);
    }
  }
  assert.equal(suggestAgentAction({ label: 'neutral' }, 'unknown-role').do, suggestAgentAction({ label: 'neutral' }, 'assistant').do);
});
