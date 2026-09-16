import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GameSession } from '../game/GameSession.js';
import { Card } from '@phase-ten/shared';

describe('Hit Card Tests', () => {
  test('Player can hit on a laid down set', () => {
    let stateUpdates = 0;
    const session = new GameSession(
      'TEST',
      { turnTimerSeconds: 0 },
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
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 10,
        cards: [
          // Set 1: three 7s
          { id: 'c1', type: 'number', color: 'red', value: 7, points: 5 },
          { id: 'c2', type: 'number', color: 'blue', value: 7, points: 5 },
          { id: 'c3', type: 'number', color: 'green', value: 7, points: 5 },
          // Set 2: three 8s
          { id: 'c4', type: 'number', color: 'red', value: 8, points: 5 },
          { id: 'c5', type: 'number', color: 'blue', value: 8, points: 5 },
          { id: 'c6', type: 'number', color: 'green', value: 8, points: 5 },
          // Extra cards
          { id: 'c7', type: 'number', color: 'yellow', value: 7, points: 5 }, // matching 7!
          { id: 'c8', type: 'number', color: 'red', value: 2, points: 5 },
          { id: 'c9', type: 'number', color: 'blue', value: 3, points: 5 },
          { id: 'c10', type: 'number', color: 'green', value: 4, points: 5 }
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
    session.drawPile = [{ id: 'draw1', type: 'number', color: 'red', value: 7, points: 5 }];
    session.discardPile = [{ id: 'disc1', type: 'number', color: 'blue', value: 1, points: 5 }];

    // 1. Draw
    session.drawCard('p1', 'deck');
    assert.strictEqual(session.turnStage, 'play');

    // 2. Lay down Phase 1
    const group1 = session.players[0].cards.slice(0, 3);
    const group2 = session.players[0].cards.slice(3, 6);
    session.layDownPhase('p1', [group1, group2]);

    assert.strictEqual(session.players[0].phaseCompletedInRound, true);
    assert.strictEqual(session.allLaidDownPhases.length, 2);

    const laidSetOf7 = session.allLaidDownPhases[0];
    assert.strictEqual(laidSetOf7.targetValue, 7);

    // 3. Hit card 'c7' (which is value 7) onto laidSetOf7
    session.hitCard('p1', 'c7', laidSetOf7.id);

    assert.strictEqual(laidSetOf7.cards.length, 4);
    assert.strictEqual(session.players[0].cards.some(c => c.id === 'c7'), false);
  });
});
