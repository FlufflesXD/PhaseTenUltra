import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GameSession } from '../game/GameSession.js';

describe('UNO-Style Directional Skips & Game Modes Tests', () => {
  test('2-Player UNO Skip: Playing a Skip card skips the opponent, letting player go again', () => {
    let actionCount = 0;
    const session = new GameSession(
      'ROOM1',
      { turnTimerSeconds: 0, gameMode: 'classic' },
      () => {},
      () => {},
      () => { actionCount++; }
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
        cardCount: 2,
        cards: [
          { id: 'c1', type: 'number', color: 'red', value: 5, points: 5 },
          { id: 's1', type: 'skip', color: 'none', value: 0, points: 15 }
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
        cardCount: 2,
        cards: [
          { id: 'c2', type: 'number', color: 'blue', value: 8, points: 5 },
          { id: 'c3', type: 'number', color: 'green', value: 9, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';
    session.drawPile = [{ id: 'draw1', type: 'number', color: 'yellow', value: 2, points: 5 }];
    session.discardPile = [{ id: 'disc1', type: 'number', color: 'red', value: 1, points: 5 }];

    // Player 1 discards Skip card
    session.discardCard('p1', 's1');

    // In 2-player UNO, Player 2 is skipped and turn returns immediately to Player 1
    assert.strictEqual(session.currentTurnIndex, 0);
    assert.strictEqual(session.getCurrentPlayer().id, 'p1');
    assert.strictEqual(session.turnStage, 'draw');
    assert.ok(actionCount > 0, 'Action event was emitted');
  });

  test('3-Player UNO Skip: Playing a Skip card skips the immediate next player, passing to 3rd player', () => {
    const session = new GameSession(
      'ROOM2',
      { turnTimerSeconds: 0, gameMode: 'classic' },
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
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'c1', type: 'number', color: 'red', value: 5, points: 5 },
          { id: 's1', type: 'skip', color: 'none', value: 0, points: 15 }
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
        cardCount: 2,
        cards: [],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p3',
        secretToken: 'p3',
        name: 'Player 3',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';
    session.drawPile = [{ id: 'draw1', type: 'number', color: 'yellow', value: 2, points: 5 }];

    // Player 1 discards Skip
    session.discardCard('p1', 's1');

    // Player 2 was skipped, so turn passes directly to Player 3 (index 2)
    assert.strictEqual(session.currentTurnIndex, 2);
    assert.strictEqual(session.getCurrentPlayer().id, 'p3');
    assert.strictEqual(session.turnStage, 'draw');
  });

  test('Reverse Card: Inverts play direction from clockwise to counter-clockwise in 3+ players', () => {
    const session = new GameSession(
      'ROOM3',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
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
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'c1', type: 'number', color: 'red', value: 5, points: 5 },
          { id: 'rev1', type: 'reverse', color: 'none', value: 0, points: 20 }
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
        cardCount: 2,
        cards: [],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p3',
        secretToken: 'p3',
        name: 'Player 3',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.playDirection = 1; // clockwise
    session.turnStage = 'play';
    session.drawPile = [{ id: 'draw1', type: 'number', color: 'yellow', value: 2, points: 5 }];

    // Player 1 plays Reverse
    session.discardCard('p1', 'rev1');

    // Direction should now be -1 (counter-clockwise)
    assert.strictEqual(session.playDirection, -1);
    // Turn should move counter-clockwise from index 0 -> index 2 (Player 3)
    assert.strictEqual(session.currentTurnIndex, 2);
    assert.strictEqual(session.getCurrentPlayer().id, 'p3');
  });

  test('Speed Mode: Initializes game with 5 stages instead of 10', () => {
    const session = new GameSession(
      'ROOM4',
      { turnTimerSeconds: 15, gameMode: 'speed' },
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
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 0,
        cards: [],
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
        cardCount: 0,
        cards: [],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.startGame();
    assert.strictEqual(session.phaseDefinitions.length, 5);
    const pub = session.getPublicState();
    assert.strictEqual(pub.phaseDefinitions.length, 5);
    assert.strictEqual(pub.playDirection, 1);
  });
});
