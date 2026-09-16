import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GameSession } from '../game/GameSession.js';

describe('GameSession Standard Logic Tests', () => {
  test('initializes and starts round with 10 cards per player', () => {
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

    assert.strictEqual(session.status, 'in_game');
    assert.strictEqual(session.players[0].cards.length, 10);
    assert.strictEqual(session.players[1].cards.length, 10);
    assert.strictEqual(session.discardPile.length, 1);
    assert.strictEqual(session.turnStage, 'draw');
  });

  test('turn transitions: draw then discard passes turn to next player', () => {
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
    const current = session.getCurrentPlayer();
    assert.strictEqual(current.id, 'p1');

    session.drawCard('p1', 'deck');
    assert.strictEqual(current.cards.length, 11);
    assert.strictEqual(session.turnStage, 'play');

    const normalCard = current.cards.find(c => c.type !== 'skip') || current.cards[0];
    session.discardCard('p1', normalCard.id);

    assert.strictEqual(session.getCurrentPlayer().id, 'p2');
    assert.strictEqual(session.turnStage, 'draw');
  });
});
