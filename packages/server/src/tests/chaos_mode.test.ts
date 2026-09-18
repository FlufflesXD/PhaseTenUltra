import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createStandardDeck, createDeck, Card } from '@phase-ten/shared';
import { GameSession } from '../game/GameSession.js';

describe('Chaos Game Mode & Custom Card Tests', () => {
  test('Chaos Mode Deck Composition: Exactly 108 cards with 1 copy of each of 6 special cards replacing 6 colored cards', () => {
    const deck = createStandardDeck('chaos');
    assert.strictEqual(deck.length, 108, 'Chaos deck must contain exactly 108 cards');

    const nukes = deck.filter(c => c.type === 'nuke');
    const jesters = deck.filter(c => c.type === 'jester');
    const plusTwos = deck.filter(c => c.type === 'plus_two');
    const plusThrees = deck.filter(c => c.type === 'plus_three');
    const redos = deck.filter(c => c.type === 'redo');
    const times = deck.filter(c => c.type === 'time');
    const wilds = deck.filter(c => c.type === 'wild');
    const skips = deck.filter(c => c.type === 'skip');
    const coloredCards = deck.filter(c => c.type === 'number');

    assert.strictEqual(nukes.length, 1, 'Exactly 1 nuke card in deck');
    assert.strictEqual(jesters.length, 1, 'Exactly 1 jester card in deck');
    assert.strictEqual(plusTwos.length, 1, 'Exactly 1 plus_two card in deck');
    assert.strictEqual(plusThrees.length, 1, 'Exactly 1 plus_three card in deck');
    assert.strictEqual(redos.length, 1, 'Exactly 1 redo card in deck');
    assert.strictEqual(times.length, 1, 'Exactly 1 time card in deck');
    assert.strictEqual(wilds.length, 8, 'Exactly 8 wilds in deck');
    assert.strictEqual(skips.length, 4, 'Exactly 4 skips in deck');
    assert.strictEqual(coloredCards.length, 90, '90 colored cards in deck (96 - 6 replaced)');
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
        phaseCompletedInRound: true,
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

  test('Nuke Card: Cannot be played unless player has completed their Stage', () => {
    const session = new GameSession(
      'CHAOS5',
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
        phaseCompletedInRound: false, // NOT opened
        cardCount: 2,
        cards: [
          { id: 'n1', type: 'nuke', color: 'none', value: 0, points: 50 },
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    assert.throws(
      () => session.discardCard('p1', 'n1'),
      /Cannot play Nuke before completing your Stage!/
    );
    // Hand should still have both cards
    assert.strictEqual(session.players[0].cards.length, 2);
  });

  test('Special Cards: Cannot be played on hits onto table groups', () => {
    const session = new GameSession(
      'CHAOS6',
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
        phaseCompletedInRound: true,
        cardCount: 6,
        cards: [
          { id: 'n1', type: 'nuke', color: 'none', value: 0, points: 50 },
          { id: 'j1', type: 'jester', color: 'none', value: 0, points: 25 },
          { id: 'p2', type: 'plus_two', color: 'none', value: 0, points: 25 },
          { id: 'p3', type: 'plus_three', color: 'none', value: 0, points: 25 },
          { id: 's1', type: 'skip', color: 'none', value: 0, points: 15 },
          { id: 'r1', type: 'reverse', color: 'none', value: 0, points: 15 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.allLaidDownPhases = [
      {
        id: 'grp1',
        playerId: 'p1',
        playerName: 'Player 1',
        requirementIndex: 0,
        type: 'set',
        targetValue: 7,
        cards: [
          { id: 't1', type: 'number', color: 'red', value: 7, points: 5 },
          { id: 't2', type: 'number', color: 'blue', value: 7, points: 5 },
          { id: 't3', type: 'number', color: 'green', value: 7, points: 5 }
        ]
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    for (const specialId of ['n1', 'j1', 'p2', 'p3', 's1', 'r1']) {
      assert.throws(
        () => session.hitCard('p1', specialId, 'grp1'),
        /Special cards cannot be played on hits/
      );
    }
  });

  test('Initial Discard Pile: Never starts with Wild, Skip, or Chaos Action cards', () => {
    for (let i = 0; i < 20; i++) {
      const session = new GameSession(
        `ROUND_${i}`,
        { turnTimerSeconds: 0, gameMode: 'chaos' },
        () => {},
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
          cardCount: 0,
          cards: [],
          laidDownPhases: [],
          isSkipped: false
        },
        {
          id: 'p2',
          secretToken: 'p2',
          name: 'P2',
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

      session.startRound();
      assert.strictEqual(session.discardPile.length, 1);
      const topDiscard = session.discardPile[0];
      assert.strictEqual(topDiscard.type, 'number', 'Initial discard must be a colored numbered card');
    }
  });

  test('Redo Card: Replaces entire hand with 10 cards drawn from a fresh deck', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'CHAOS_REDO',
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
        cardCount: 3,
        cards: [
          { id: 'redo_1', type: 'redo', color: 'none', value: 0, points: 30 },
          { id: 'old_1', type: 'number', color: 'red', value: 5, points: 5 },
          { id: 'old_2', type: 'number', color: 'blue', value: 8, points: 5 }
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
    session.turnStage = 'play';

    session.discardCard('p1', 'redo_1');

    assert.strictEqual(lastAction?.type, 'redo');
    assert.strictEqual(session.players[0].cards.length, 10, 'Player hand replaced with exactly 10 cards');
    assert.strictEqual(session.players[0].cardCount, 10);
    // Ensure fresh card ids
    assert.ok(session.players[0].cards.every(c => c.id.startsWith('fresh_')), 'Cards must be from fresh deck');
    // Ensure old cards are discarded
    assert.ok(!session.players[0].cards.some(c => c.id === 'old_1' || c.id === 'old_2'));
  });

  test('Time Card: Rejects invalid targets (Stage 1 and Stage 10) and handles 60/40 roll', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'CHAOS_TIME',
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
          { id: 'time_1', type: 'time', color: 'none', value: 0, points: 30 },
          { id: 'c1', type: 'number', color: 'red', value: 3, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2',
        name: 'Player 2 (Stage 1)',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 5,
        cards: [],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p3',
        secretToken: 'p3',
        name: 'Player 3 (Stage 5)',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 5,
        phaseCompletedInRound: true,
        cardCount: 2,
        cards: [{ id: 'rem_1', type: 'number', color: 'red', value: 4, points: 5 }],
        laidDownPhases: [{
          id: 'grp_p3',
          playerId: 'p3',
          playerName: 'Player 3 (Stage 5)',
          requirementIndex: 0,
          type: 'run',
          cards: [{ id: 'm1', type: 'number', color: 'red', value: 1, points: 5 }]
        }],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // Target p2 (Stage 1) -> Must throw
    assert.throws(
      () => session.discardCard('p1', 'time_1', 'p2'),
      /Cannot target a player on Stage 1 or Stage 10/
    );

    // Target p3 (Stage 5) -> Valid
    session.discardCard('p1', 'time_1', 'p3');

    assert.strictEqual(lastAction?.type, 'time');
    assert.strictEqual(lastAction?.targetPlayerId, 'p3');
    assert.ok(lastAction?.timeResult === 'green' || lastAction?.timeResult === 'red');
    if (lastAction?.timeResult === 'green') {
      assert.strictEqual(session.players[2].currentPhase, 4, 'Green rolls target back to Phase 4');
    } else {
      assert.strictEqual(session.players[2].currentPhase, 6, 'Red rolls target forward to Phase 6');
    }
    // Because p3 had completed their stage in round, it must be reset
    assert.strictEqual(session.players[2].phaseCompletedInRound, false);
    assert.strictEqual(session.players[2].laidDownPhases.length, 0);
    assert.strictEqual(session.players[2].cards.length, 2, 'Meld cards returned to hand');
  });
});

