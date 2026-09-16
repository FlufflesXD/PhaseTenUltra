import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createStandardDeck, createDeck, sortCardsByValue } from '../deck.js';

describe('Deck Creation and Manipulation Tests', () => {
  test('createStandardDeck creates exactly 108 cards', () => {
    const deck = createStandardDeck();
    assert.strictEqual(deck.length, 108);

    const wilds = deck.filter(c => c.type === 'wild');
    const skips = deck.filter(c => c.type === 'skip');
    const numbers = deck.filter(c => c.type === 'number');

    assert.strictEqual(wilds.length, 8);
    assert.strictEqual(skips.length, 4);
    assert.strictEqual(numbers.length, 96);
  });

  test('createDeck returns 108 shuffled cards', () => {
    const deck = createDeck();
    assert.strictEqual(deck.length, 108);
  });

  test('sortCardsByValue sorts correctly', () => {
    const sample = [
      { id: '1', type: 'number' as const, color: 'blue' as const, value: 9, points: 5 },
      { id: '2', type: 'wild' as const, color: 'none' as const, value: 0, points: 25 },
      { id: '3', type: 'number' as const, color: 'red' as const, value: 2, points: 5 }
    ];

    const sorted = sortCardsByValue(sample);
    assert.strictEqual(sorted[0].value, 2);
    assert.strictEqual(sorted[1].value, 9);
    assert.strictEqual(sorted[2].type, 'wild');
  });
});
