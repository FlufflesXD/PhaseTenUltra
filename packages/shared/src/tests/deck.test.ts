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

  test('createDeck returns 108 shuffled cards with exact distribution', () => {
    const deck = createDeck();
    assert.strictEqual(deck.length, 108);

    // 8 wilds and 4 skips
    assert.strictEqual(deck.filter(c => c.type === 'wild').length, 8);
    assert.strictEqual(deck.filter(c => c.type === 'skip').length, 4);

    // 96 numbers total (24 per color, 8 of each number 1-12)
    const numbers = deck.filter(c => c.type === 'number');
    assert.strictEqual(numbers.length, 96);

    for (const color of ['red', 'blue', 'green', 'yellow'] as const) {
      const colorCards = numbers.filter(c => c.color === color);
      assert.strictEqual(colorCards.length, 24, `Each color must have 24 numbered cards`);
    }

    for (let val = 1; val <= 12; val++) {
      const valCards = numbers.filter(c => c.value === val);
      assert.strictEqual(valCards.length, 8, `Each number ${val} must appear exactly 8 times across the deck`);
    }

    // Verify shuffling changes card order compared to standard ordered deck
    const standard = createStandardDeck();
    let diffCount = 0;
    for (let i = 0; i < standard.length; i++) {
      if (standard[i].id !== deck[i].id) diffCount++;
    }
    // A truly shuffled deck of 108 cards will differ in almost every position (> 90 positions)
    assert.ok(diffCount > 90, `Shuffled deck must differ from standard ordered deck`);
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
