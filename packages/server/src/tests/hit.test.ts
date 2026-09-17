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

  test('Wild card on run 5..12 extends low end to 4, allowing 3 to hit next and keeping cards strictly sorted', () => {
    const session = new GameSession(
      'TESTRUN',
      { turnTimerSeconds: 0 },
      () => {},
      () => {}
    );

    // Initial run from 5 to 12
    const runCards: Card[] = [
      { id: 'r5', type: 'number', color: 'red', value: 5, points: 5 },
      { id: 'r6', type: 'number', color: 'blue', value: 6, points: 5 },
      { id: 'r7', type: 'number', color: 'green', value: 7, points: 5 },
      { id: 'r8', type: 'number', color: 'yellow', value: 8, points: 5 },
      { id: 'r9', type: 'number', color: 'red', value: 9, points: 5 },
      { id: 'r10', type: 'number', color: 'blue', value: 10, points: 10 },
      { id: 'r11', type: 'number', color: 'green', value: 11, points: 10 },
      { id: 'r12', type: 'number', color: 'yellow', value: 12, points: 10 }
    ];

    session.allLaidDownPhases = [
      {
        id: 'group_run_5_12',
        playerId: 'p2',
        playerName: 'Erebos',
        requirementIndex: 0,
        type: 'run',
        cards: [...runCards],
        runMin: 5,
        runMax: 12
      }
    ];

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
        phaseCompletedInRound: true, // already laid down phase
        cardCount: 3,
        cards: [
          { id: 'wild1', type: 'wild', color: 'none', value: 0, points: 25 },
          { id: 'c3', type: 'number', color: 'red', value: 3, points: 5 },
          { id: 'c2', type: 'number', color: 'blue', value: 2, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    const tableGroup = session.allLaidDownPhases[0];

    // 1. Play WILD card on run 5..12.
    // Since high end is already 12, wild MUST extend the low end down to 4!
    session.hitCard('p1', 'wild1', tableGroup.id);

    assert.strictEqual(tableGroup.runMin, 4, 'runMin should be updated to 4');
    assert.strictEqual(tableGroup.runMax, 12, 'runMax should remain 12');
    assert.strictEqual(tableGroup.cards.length, 9);
    // Verify first card in sorted cards is the wild representing 4
    assert.strictEqual(tableGroup.cards[0].id, 'wild1', 'Wild card should be sorted at the beginning representing 4');

    // 2. Play card 3!
    // Since runMin is now 4, card 3 is completely valid (4 - 1 = 3)!
    session.hitCard('p1', 'c3', tableGroup.id);

    assert.strictEqual(tableGroup.runMin, 3, 'runMin should be updated to 3');
    assert.strictEqual(tableGroup.cards.length, 10);
    // Verify strictly ascending order: card 3 is now first, followed by wild (4), then 5..12
    assert.strictEqual(tableGroup.cards[0].id, 'c3', 'Card 3 should be at index 0');
    assert.strictEqual(tableGroup.cards[1].id, 'wild1', 'Wild card (representing 4) should be at index 1');
    assert.strictEqual(tableGroup.cards[2].value, 5);

    // 3. Play card 2!
    session.hitCard('p1', 'c2', tableGroup.id);
    assert.strictEqual(tableGroup.runMin, 2);
    assert.strictEqual(tableGroup.cards[0].id, 'c2');
    assert.strictEqual(tableGroup.cards[1].id, 'c3');
    assert.strictEqual(tableGroup.cards[2].id, 'wild1');
  });

  test('Completing Phase 10 caps currentPhase at 10 and marks completedAllPhases', () => {
    const session = new GameSession(
      'TESTP10',
      { turnTimerSeconds: 0 },
      () => {},
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
        score: 40,
        currentPhase: 10,
        phaseCompletedInRound: true,
        cardCount: 1,
        cards: [{ id: 'discardMe', type: 'number', color: 'red', value: 5, points: 5 }],
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
        score: 100,
        currentPhase: 8,
        phaseCompletedInRound: false,
        cardCount: 5,
        cards: [],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // Player 1 discards last card and goes out!
    session.discardCard('p1', 'discardMe');

    assert.strictEqual(session.status, 'game_over');
    assert.strictEqual(session.winnerId, 'p1');
    assert.strictEqual(session.players[0].currentPhase, 10, 'currentPhase must be capped at 10, never 11');
    assert.strictEqual(session.players[0].completedAllPhases, true);

    const pub = session.getPublicState();
    assert.strictEqual(pub.players[0].currentPhase, 10);
    assert.strictEqual(pub.players[0].completedAllPhases, true);

    // Now test restartGame via nextRound() when game_over
    session.nextRound();
    assert.strictEqual(session.status, 'in_game');
    assert.strictEqual(session.roundNumber, 1);
    assert.strictEqual(session.winnerId, undefined);
    assert.strictEqual(session.players[0].score, 0);
    assert.strictEqual(session.players[0].currentPhase, 1);
    assert.strictEqual(session.players[0].completedAllPhases, false);
    assert.strictEqual(session.players[0].cards.length, 10);
  });

  test('Action events: draw from deck hides card, hit exposes card', () => {
    const emittedActions: any[] = [];
    const session = new GameSession(
      'TESTACT',
      { turnTimerSeconds: 0 },
      () => {},
      () => {},
      (action) => { emittedActions.push(action); }
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
        phaseCompletedInRound: true,
        cardCount: 2,
        cards: [
          { id: 'hit1', type: 'number', color: 'red', value: 7, points: 5 },
          { id: 'disc1', type: 'number', color: 'blue', value: 1, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.allLaidDownPhases = [
      {
        id: 'group1',
        playerId: 'p1',
        playerName: 'Player 1',
        type: 'set',
        requirementIndex: 0,
        targetValue: 7,
        cards: [
          { id: 'c1', type: 'number', color: 'red', value: 7, points: 5 },
          { id: 'c2', type: 'number', color: 'blue', value: 7, points: 5 },
          { id: 'c3', type: 'number', color: 'green', value: 7, points: 5 }
        ]
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'draw';
    session.drawPile = [{ id: 'drawSecret', type: 'number', color: 'yellow', value: 12, points: 5 }];
    session.discardPile = [{ id: 'discPublic', type: 'number', color: 'green', value: 4, points: 5 }];

    // 1. Draw from deck
    session.drawCard('p1', 'deck');
    const drawAction = emittedActions.find(a => a.type === 'draw');
    assert.ok(drawAction);
    assert.strictEqual(drawAction.source, 'deck');
    assert.strictEqual(drawAction.card, undefined, 'Card drawn from deck must be secret/undefined');

    // 2. Hit card
    session.hitCard('p1', 'hit1', 'group1');
    const hitAction = emittedActions.find(a => a.type === 'hit');
    assert.ok(hitAction);
    assert.strictEqual(hitAction.card?.id, 'hit1', 'Hit card must be explicitly exposed in action');
    assert.strictEqual(hitAction.cards?.[0]?.id, 'hit1');
  });
});
