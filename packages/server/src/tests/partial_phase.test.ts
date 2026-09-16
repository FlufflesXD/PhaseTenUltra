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
});
