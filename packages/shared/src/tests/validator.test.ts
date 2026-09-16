import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CLASSIC_PHASES } from '../phases.js';
import { validatePhase, validateSet, validateRun, validateColorGroup, validateHit } from '../validator.js';
import { Card } from '../types.js';

describe('Phase 10 Validator Tests', () => {
  const card = (id: string, value: number, color: any, type: any = 'number'): Card => ({
    id,
    type,
    color,
    value,
    points: value <= 9 ? 5 : 10
  });

  const wild = (id: string): Card => ({
    id,
    type: 'wild',
    color: 'none',
    value: 0,
    points: 25
  });

  const skip = (id: string): Card => ({
    id,
    type: 'skip',
    color: 'none',
    value: 0,
    points: 15
  });

  test('validateSet: valid natural set', () => {
    const cards = [card('1', 7, 'red'), card('2', 7, 'blue'), card('3', 7, 'green')];
    const res = validateSet(cards, 3);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.value, 7);
  });

  test('validateSet: set with wild cards', () => {
    const cards = [card('1', 5, 'red'), wild('w1'), wild('w2')];
    const res = validateSet(cards, 3);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.value, 5);
  });

  test('validateSet: rejected if cards do not match', () => {
    const cards = [card('1', 5, 'red'), card('2', 6, 'blue'), wild('w1')];
    const res = validateSet(cards, 3);
    assert.strictEqual(res.valid, false);
  });

  test('validateSet: rejected if only wilds (no natural cards)', () => {
    const cards = [wild('w1'), wild('w2'), wild('w3')];
    const res = validateSet(cards, 3);
    assert.strictEqual(res.valid, false);
  });

  test('validateRun: valid natural run', () => {
    const cards = [
      card('1', 3, 'red'),
      card('2', 4, 'blue'),
      card('3', 5, 'yellow'),
      card('4', 6, 'green')
    ];
    const res = validateRun(cards, 4);
    assert.strictEqual(res.valid, true);
  });

  test('validateRun: run with wild card filling middle gap', () => {
    const cards = [
      card('1', 3, 'red'),
      wild('w1'),
      card('2', 5, 'yellow'),
      card('3', 6, 'green')
    ];
    const res = validateRun(cards, 4);
    assert.strictEqual(res.valid, true);
  });

  test('validateRun: rejected if duplicate numbers present', () => {
    const cards = [
      card('1', 3, 'red'),
      card('2', 3, 'blue'),
      card('3', 4, 'yellow'),
      card('4', 5, 'green')
    ];
    const res = validateRun(cards, 4);
    assert.strictEqual(res.valid, false);
  });

  test('validateColorGroup: 7 cards of same color', () => {
    const cards = [
      card('1', 1, 'red'),
      card('2', 3, 'red'),
      card('3', 4, 'red'),
      card('4', 7, 'red'),
      card('5', 9, 'red'),
      card('6', 11, 'red'),
      wild('w1')
    ];
    const res = validateColorGroup(cards, 7);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.color, 'red');
  });

  test('validatePhase: Phase 1 (2 sets of 3)', () => {
    const phase1 = CLASSIC_PHASES[0];
    const group1 = [card('1', 8, 'red'), card('2', 8, 'blue'), wild('w1')];
    const group2 = [card('3', 2, 'yellow'), card('4', 2, 'green'), card('5', 2, 'red')];

    const result = validatePhase([group1, group2], phase1);
    assert.strictEqual(result.isValid, true);
  });

  test('validatePhase: Phase 2 (1 set of 3 + 1 run of 4)', () => {
    const phase2 = CLASSIC_PHASES[1];
    const group1 = [card('1', 4, 'red'), card('2', 4, 'blue'), card('3', 4, 'green')];
    const group2 = [
      card('4', 9, 'yellow'),
      card('5', 10, 'green'),
      wild('w1'),
      card('6', 12, 'red')
    ];

    const result = validatePhase([group1, group2], phase2);
    assert.strictEqual(result.isValid, true);
  });

  test('validateHit: hitting on a set', () => {
    const targetGroup = {
      id: 'g1',
      playerId: 'p1',
      playerName: 'Alice',
      requirementIndex: 0,
      type: 'set' as const,
      targetValue: 8,
      cards: []
    };

    assert.strictEqual(validateHit(card('h1', 8, 'blue'), targetGroup), true);
    assert.strictEqual(validateHit(wild('w1'), targetGroup), true);
    assert.strictEqual(validateHit(card('h2', 9, 'blue'), targetGroup), false);
    assert.strictEqual(validateHit(skip('s1'), targetGroup), false);
  });
});
