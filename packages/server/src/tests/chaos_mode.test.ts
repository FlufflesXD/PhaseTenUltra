import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createStandardDeck, createDeck, Card } from '@phase-ten/shared';
import { GameSession } from '../game/GameSession.js';

describe('Chaos Game Mode & Custom Card Tests', () => {
  test('Chaos Mode Deck Composition: Exactly 108 cards with 1 copy of each special card replacing 4 colored cards', () => {
    const deck = createStandardDeck('chaos');
    assert.strictEqual(deck.length, 108, 'Chaos deck must contain exactly 108 cards');

    const nukes = deck.filter(c => c.type === 'nuke');
    const jesters = deck.filter(c => c.type === 'jester');
    const plusTwos = deck.filter(c => c.type === 'plus_two');
    const plusThrees = deck.filter(c => c.type === 'plus_three');
    const wilds = deck.filter(c => c.type === 'wild');
    const skips = deck.filter(c => c.type === 'skip');
    const coloredCards = deck.filter(c => c.type === 'number');

    assert.strictEqual(nukes.length, 1, 'Exactly 1 nuke card in deck');
    assert.strictEqual(jesters.length, 1, 'Exactly 1 jester card in deck');
    assert.strictEqual(plusTwos.length, 1, 'Exactly 1 plus_two card in deck');
    assert.strictEqual(plusThrees.length, 1, 'Exactly 1 plus_three card in deck');
    assert.strictEqual(wilds.length, 8, 'Exactly 8 wilds in deck');
    assert.strictEqual(skips.length, 4, 'Exactly 4 skips in deck');
    assert.strictEqual(coloredCards.length, 92, '92 colored cards in deck (96 - 4 replaced)');
  });

  test('Nuke Card: Detonation reduces all players hands to 2 cards', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'CHAOS1',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
      () => {},
      (action) => { lastAction = action; }
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
        cardCount: 6,
        cards: [
          { id: 'n1', type: 'nuke', color: 'none', value: 0, points: 50 },
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 },
          { id: 'c2', type: 'number', color: 'red', value: 2, points: 5 },
          { id: 'c3', type: 'number', color: 'red', value: 3, points: 5 },
          { id: 'c4', type: 'number', color: 'red', value: 4, points: 5 },
          { id: 'c5', type: 'number', color: 'red', value: 5, points: 5 }
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
        cardCount: 5,
        cards: [
          { id: 'c6', type: 'number', color: 'blue', value: 1, points: 5 },
          { id: 'c7', type: 'number', color: 'blue', value: 2, points: 5 },
          { id: 'c8', type: 'number', color: 'blue', value: 3, points: 5 },
          { id: 'c9', type: 'number', color: 'blue', value: 4, points: 5 },
          { id: 'c10', type: 'number', color: 'blue', value: 5, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // Player 1 discards nuke
    session.discardCard('p1', 'n1');

    assert.strictEqual(lastAction?.type, 'nuke');
    assert.strictEqual(session.players[0].cards.length, 2, 'Player 1 hand reduced to 2 cards');
    assert.strictEqual(session.players[1].cards.length, 2, 'Player 2 hand reduced to 2 cards');
    assert.strictEqual(session.players[0].cardCount, 2);
    assert.strictEqual(session.players[1].cardCount, 2);
  });

  test('Jester Card: Swaps hands between current player and target player', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'CHAOS2',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
      () => {},
      (action) => { lastAction = action; }
    );

    const p1Card = { id: 'c_p1', type: 'number' as const, color: 'green' as const, value: 7, points: 5 };
    const p2CardA = { id: 'c_p2a', type: 'number' as const, color: 'yellow' as const, value: 11, points: 10 };
    const p2CardB = { id: 'c_p2b', type: 'number' as const, color: 'yellow' as const, value: 12, points: 10 };

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
          { id: 'j1', type: 'jester', color: 'none', value: 0, points: 25 },
          p1Card
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
        cards: [p2CardA, p2CardB],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // Player 1 discards Jester targeting Player 2
    session.discardCard('p1', 'j1', 'p2');

    assert.strictEqual(lastAction?.type, 'jester');
    assert.strictEqual(lastAction?.targetPlayerId, 'p2');

    // Player 1 should now hold Player 2's cards (p2CardA and p2CardB)
    assert.strictEqual(session.players[0].cards.length, 2);
    assert.ok(session.players[0].cards.some(c => c.id === 'c_p2a'));
    assert.ok(session.players[0].cards.some(c => c.id === 'c_p2b'));

    // Player 2 should now hold Player 1's remaining card (p1Card)
    assert.strictEqual(session.players[1].cards.length, 1);
    assert.strictEqual(session.players[1].cards[0].id, 'c_p1');
  });

  test('Plus Two and Plus Three Cards: Adds cards to next player without skipping them', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'CHAOS3',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
      () => {},
      (action) => { lastAction = action; }
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
          { id: 'p3_card', type: 'plus_three', color: 'none', value: 0, points: 25 },
          { id: 'c1', type: 'number', color: 'red', value: 2, points: 5 }
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
          { id: 'c2', type: 'number', color: 'blue', value: 4, points: 5 },
          { id: 'c3', type: 'number', color: 'blue', value: 5, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.drawPile = [
      { id: 'd1', type: 'number', color: 'green', value: 1, points: 5 },
      { id: 'd2', type: 'number', color: 'green', value: 2, points: 5 },
      { id: 'd3', type: 'number', color: 'green', value: 3, points: 5 }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // Player 1 discards plus_three
    session.discardCard('p1', 'p3_card');

    assert.strictEqual(lastAction?.type, 'plus_three');
    assert.strictEqual(lastAction?.targetPlayerId, 'p2');
    assert.strictEqual(session.players[1].cards.length, 5, 'Player 2 received 3 extra cards');
    assert.strictEqual(session.players[1].isSkipped, false, 'Player 2 is NOT skipped');
  });

  test('Special action cards cannot be drawn from the discard pile', () => {
    const session = new GameSession(
      'CHAOS4',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
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
        cardCount: 1,
        cards: [{ id: 'c1', type: 'number', color: 'red', value: 1, points: 5 }],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'draw';

    // Try drawing Nuke from discard
    session.discardPile = [{ id: 'n1', type: 'nuke', color: 'none', value: 0, points: 50 }];
    assert.throws(
      () => session.drawCard('p1', 'discard'),
      /Cannot draw a Wild or Skip card/
    );

    // Try drawing Jester from discard
    session.discardPile = [{ id: 'j1', type: 'jester', color: 'none', value: 0, points: 25 }];
    assert.throws(
      () => session.drawCard('p1', 'discard'),
      /Cannot draw a Wild or Skip card/
    );
  });
});
