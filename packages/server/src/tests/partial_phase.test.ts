import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GameSession } from '../game/GameSession.js';

describe('Partial Phase & Extra Groups Tests', () => {
  test('Player must lay full phase first; extra halves/groups can only be laid after', () => {
    let stateUpdates = 0;
    const session = new GameSession(
      'TEST',
      { turnTimerSeconds: 0, allowPartialAndExtraSets: true },
      () => { stateUpdates++; },
      () => {}
    );

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1',
        name: 'Player 1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1, // Phase 1: 2 sets of 3
        phaseCompletedInRound: false,
        cardCount: 10,
        cards: [
          // Set 1
          { id: 'c1', type: 'number', color: 'red', value: 7, points: 5 },
          { id: 'c2', type: 'number', color: 'blue', value: 7, points: 5 },
          { id: 'c3', type: 'number', color: 'green', value: 7, points: 5 },
          // Set 2
          { id: 'c4', type: 'number', color: 'red', value: 8, points: 5 },
          { id: 'c5', type: 'number', color: 'blue', value: 8, points: 5 },
          { id: 'c6', type: 'number', color: 'green', value: 8, points: 5 },
          // Extra half / meld (three 10s)
          { id: 'c7', type: 'number', color: 'red', value: 10, points: 5 },
          { id: 'c8', type: 'number', color: 'blue', value: 10, points: 5 },
          { id: 'c9', type: 'number', color: 'green', value: 10, points: 5 },
          // Extra 7 to hit
          { id: 'c10', type: 'number', color: 'yellow', value: 7, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2',
        name: 'Player 2',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 10,
        cards: [],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'draw';
    session.drawPile = [{ id: 'draw1', type: 'number', color: 'yellow', value: 7, points: 5 }];
    session.discardPile = [{ id: 'disc1', type: 'number', color: 'blue', value: 1, points: 5 }];

    // 1. Draw card
    session.drawCard('p1', 'deck');
    assert.strictEqual(session.turnStage, 'play');

    // 2. Attempting to lay down only half/partial requirement before full phase must throw
    assert.throws(() => {
      session.layPhaseRequirement('p1', 0, ['c1', 'c2', 'c3']);
    }, /Must lay down your full phase first/);

    assert.throws(() => {
      session.layExtraGroup('p1', ['c1', 'c2', 'c3']);
    }, /Must complete your phase/);

    // 3. Lay down FULL Phase 1 (both sets of 3 together)
    const set1 = session.players[0].cards.filter(c => ['c1', 'c2', 'c3'].includes(c.id));
    const set2 = session.players[0].cards.filter(c => ['c4', 'c5', 'c6'].includes(c.id));
    session.layDownPhase('p1', [set1, set2]);

    assert.strictEqual(session.allLaidDownPhases.length, 2);
    assert.strictEqual(session.players[0].phaseCompletedInRound, true);

    // 4. Once full phase is laid, player CAN lay down an extra half / meld (three 10s)
    session.layExtraGroup('p1', ['c7', 'c8', 'c9']);

    assert.strictEqual(session.allLaidDownPhases.length, 3);
    assert.strictEqual(session.allLaidDownPhases[2].targetValue, 10);

    // 5. Batch hit remaining 7s onto the first laid set of 7s
    const laidSetOf7 = session.allLaidDownPhases[0];
    session.hitCard('p1', ['c10', 'draw1'], laidSetOf7.id);

    assert.strictEqual(laidSetOf7.cards.length, 5); // 3 original + 2 hit
    // Hand should now be 0 cards, which ends the round
    assert.strictEqual(session.players[0].cards.length, 0);
    assert.strictEqual(session.status, 'round_end');
  });

  test('Cannot draw Wild or Skip from discard pile', () => {
    const session = new GameSession(
      'TEST',
      { turnTimerSeconds: 0 },
      () => {},
      () => {}
    );
    session.players = [
      {
        id: 'p1',
        secretToken: 'p1',
        name: 'P1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 10,
        cards: [],
        laidDownPhases: [],
        isSkipped: false
      }
    ];
    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'draw';
    session.drawPile = [{ id: 'd1', type: 'number', color: 'red', value: 5, points: 5 }];

    // Test with Wild on discard pile
    session.discardPile = [{ id: 'w1', type: 'wild', color: 'none', value: 0, points: 25 }];
    assert.throws(() => {
      session.drawCard('p1', 'discard');
    }, /Cannot draw a Wild or Skip card/);

    // Test with Skip on discard pile
    session.discardPile = [{ id: 's1', type: 'skip', color: 'none', value: 0, points: 15 }];
    assert.throws(() => {
      session.drawCard('p1', 'discard');
    }, /Cannot draw a Wild or Skip card/);

    // Test with normal number card on discard pile
    session.discardPile = [{ id: 'n1', type: 'number', color: 'red', value: 2, points: 5 }];
    session.drawCard('p1', 'discard');
    assert.strictEqual(session.players[0].cards.length, 1);
    assert.strictEqual(session.players[0].cards[0].id, 'n1');
  });

  test('Extra meld in Phase 7 (two sets of 4) must strictly match Phase 7 requirements, not a generic run', () => {
    const session = new GameSession(
      'TEST',
      { turnTimerSeconds: 0, allowPartialAndExtraSets: true },
      () => {},
      () => {}
    );
    session.players = [
      {
        id: 'p1',
        secretToken: 'p1',
        name: 'P1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 7, // Phase 7: 2 sets of 4
        phaseCompletedInRound: true, // already laid down Phase 7
        cardCount: 8,
        cards: [
          // A run of 4 (1, 2, 3, 4) - valid run, but Phase 7 only allows sets of 4!
          { id: 'r1', type: 'number', color: 'red', value: 1, points: 5 },
          { id: 'r2', type: 'number', color: 'blue', value: 2, points: 5 },
          { id: 'r3', type: 'number', color: 'green', value: 3, points: 5 },
          { id: 'r4', type: 'number', color: 'yellow', value: 4, points: 5 },
          // A set of 4 (four 9s) - matches Phase 7 requirement
          { id: 's1', type: 'number', color: 'red', value: 9, points: 5 },
          { id: 's2', type: 'number', color: 'blue', value: 9, points: 5 },
          { id: 's3', type: 'number', color: 'green', value: 9, points: 5 },
          { id: 's4', type: 'number', color: 'yellow', value: 9, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];
    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // Attempting to lay the run of 4 should fail
    assert.throws(() => {
      session.layExtraGroup('p1', ['r1', 'r2', 'r3', 'r4']);
    }, /Extra group must match one of the requirements of your current Stage/);

    // Laying the set of 4 should succeed
    session.layExtraGroup('p1', ['s1', 's2', 's3', 's4']);
    assert.strictEqual(session.allLaidDownPhases.length, 1);
    assert.strictEqual(session.allLaidDownPhases[0].type, 'set');
    assert.strictEqual(session.allLaidDownPhases[0].cards.length, 4);
  });
});

