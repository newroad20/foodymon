import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MIND_WEATHER, pickReply } from './mindWeather.ts';

const BANNED = ['과식', '결식', '참아', '야식', '배달', '살 빼', '살찌', '다이어트'];

test('every feeling has a unique id and at least one reply', () => {
  assert.equal(new Set(MIND_WEATHER.map((m) => m.id)).size, MIND_WEATHER.length);
  for (const m of MIND_WEATHER) assert.ok(m.replies.length >= 1, m.id);
});

test('no label or reply uses blaming or diet words', () => {
  for (const m of MIND_WEATHER) {
    for (const text of [m.label, ...m.replies]) {
      for (const word of BANNED) assert.ok(!text.includes(word), `"${text}" contains ${word}`);
    }
  }
});

test('pickReply returns one of that feeling’s replies, covering all of them', () => {
  for (const m of MIND_WEATHER) {
    assert.equal(pickReply(m.id, () => 0), m.replies[0]);
    assert.equal(pickReply(m.id, () => 0.999), m.replies[m.replies.length - 1]);
  }
  assert.ok(typeof pickReply('nope') === 'string');
});
