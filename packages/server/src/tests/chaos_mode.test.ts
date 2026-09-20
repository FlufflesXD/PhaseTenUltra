import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createStandardDeck, createDeck, Card, isUltimateCard } from '@phase-ten/shared';
import { GameSession } from '../game/GameSession.js';
import { Room, RoomUser } from '../room/RoomManager.js';

describe('Chaos Game Mode & Custom Card Tests', () => {
  test('Full Deck Composition v6.0: Exactly 275 cards with 240 colored (~1:15 ratio), 15 custom special cards (status 2x), 4 ultimates, 8 wilds, 4 skips, 4 reverses', () => {
    const deck = createStandardDeck('chaos');
    assert.strictEqual(deck.length, 275, 'Full deck must contain exactly 275 cards');

    const nukes = deck.filter(c => c.type === 'nuke');
    const jesters = deck.filter(c => c.type === 'jester');
    const plusTwos = deck.filter(c => c.type === 'plus_two');
    const plusThrees = deck.filter(c => c.type === 'plus_three');
    const redos = deck.filter(c => c.type === 'redo');
    const times = deck.filter(c => c.type === 'time');
    const numberEyes = deck.filter(c => c.type === 'number_eye');
    const colorEyes = deck.filter(c => c.type === 'color_eye');
    const randoms = deck.filter(c => c.type === 'random');
    const cracks = deck.filter(c => c.type === 'crack');
    const statuses = deck.filter(c => c.type === 'status');
    const lucks = deck.filter(c => c.type === 'luck');
    const unluckies = deck.filter(c => c.type === 'unlucky');
    const doubles = deck.filter(c => c.type === 'double');
    const singularities = deck.filter(c => c.type === 'singularity');
    const voyances = deck.filter(c => c.type === 'voyance');
    const alternates = deck.filter(c => c.type === 'alternate');
    const avarices = deck.filter(c => c.type === 'avarice');
    const reverses = deck.filter(c => c.type === 'reverse');
    const wilds = deck.filter(c => c.type === 'wild');
    const skips = deck.filter(c => c.type === 'skip');
    const coloredCards = deck.filter(c => c.type === 'number');

    assert.strictEqual(nukes.length, 1, 'Exactly 1 nuke card in deck');
    assert.strictEqual(jesters.length, 1, 'Exactly 1 jester card in deck');
    assert.strictEqual(plusTwos.length, 1, 'Exactly 1 plus_two card in deck');
    assert.strictEqual(plusThrees.length, 1, 'Exactly 1 plus_three card in deck');
    assert.strictEqual(redos.length, 1, 'Exactly 1 redo card in deck');
    assert.strictEqual(times.length, 1, 'Exactly 1 time card in deck');
    assert.strictEqual(numberEyes.length, 1, 'Exactly 1 number_eye card in deck');
    assert.strictEqual(colorEyes.length, 1, 'Exactly 1 color_eye card in deck');
    assert.strictEqual(randoms.length, 1, 'Exactly 1 random card in deck');
    assert.strictEqual(cracks.length, 1, 'Exactly 1 crack card in deck');
    assert.strictEqual(statuses.length, 2, 'Exactly 2 status cards in deck');
    assert.strictEqual(lucks.length, 1, 'Exactly 1 luck card in deck');
    assert.strictEqual(unluckies.length, 1, 'Exactly 1 unlucky card in deck');
    assert.strictEqual(doubles.length, 1, 'Exactly 1 double card in deck');
    assert.strictEqual(singularities.length, 1, 'Exactly 1 singularity ultimate card in deck');
    assert.strictEqual(voyances.length, 1, 'Exactly 1 voyance ultimate card in deck');
    assert.strictEqual(alternates.length, 1, 'Exactly 1 alternate ultimate card in deck');
    assert.strictEqual(avarices.length, 1, 'Exactly 1 avarice ultimate card in deck');
    assert.strictEqual(reverses.length, 4, 'Exactly 4 reverse cards in deck');
    assert.strictEqual(wilds.length, 8, 'Exactly 8 wilds in deck');
    assert.strictEqual(skips.length, 4, 'Exactly 4 skips in deck');
    assert.strictEqual(coloredCards.length, 240, '240 colored cards maintain 16:1 (~1:15) ratio with 15 specials');
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

  test('Special Cards: Time card has exact 50/50 chance for rewind vs advance', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'CHAOS_TIME_5050',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
      () => {},
      (action) => { lastAction = action; }
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
        cardCount: 2,
        cards: [
          { id: 'time_a', type: 'time', color: 'none', value: 0, points: 30 },
          { id: 'c2', type: 'number', color: 'red', value: 5, points: 5 }
        ],
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
        currentPhase: 5,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'p2_c1', type: 'number', color: 'blue', value: 1, points: 5 },
          { id: 'p2_c2', type: 'number', color: 'blue', value: 2, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];
    session.status = 'in_game';
    session.turnStage = 'discard';
    session.currentTurnIndex = 0;

    const originalRandom = Math.random;
    try {
      // 0.49 should be rewind (< 0.50) -> green, Stage 5 -> 4
      Math.random = () => 0.49;
      session.discardCard('p1', 'time_a', 'p2');
      assert.strictEqual(lastAction?.timeResult, 'green');
      assert.strictEqual(session.players[1].currentPhase, 4);

      // Now test 0.50 which should be advance (>= 0.50) -> red, Stage 4 -> 5
      session.currentTurnIndex = 0;
      session.turnStage = 'discard';
      session.players[0].cards.push({ id: 'time_b', type: 'time', color: 'none', value: 0, points: 30 });
      Math.random = () => 0.50;
      session.discardCard('p1', 'time_b', 'p2');
      assert.strictEqual(lastAction?.timeResult, 'red');
      assert.strictEqual(session.players[1].currentPhase, 5);
    } finally {
      Math.random = originalRandom;
    }
  });

  test('Special Cards: Can always be discarded normally with activateAbility = false to prevent softlocks', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'CHAOS_NORMAL_DISCARD',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
      () => {},
      (action) => { lastAction = action; }
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
        phaseCompletedInRound: false, // NOT opened stage!
        cardCount: 2,
        cards: [
          { id: 'nuke_1', type: 'nuke', color: 'none', value: 0, points: 50 },
          { id: 'time_1', type: 'time', color: 'none', value: 0, points: 30 }
        ],
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
        currentPhase: 1, // Stage 1 (normally immune)
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

    // 1. Discarding Nuke with activateAbility = false succeeds even when stage is NOT completed!
    session.discardCard('p1', 'nuke_1', undefined, false);
    assert.strictEqual(lastAction?.type, 'discard', 'Action emitted must be standard discard, NOT nuke');
    assert.strictEqual(session.players[0].cards.length, 1);
    assert.strictEqual(session.players[1].cards.length, 0); // Opponent hand was not wiped by nuke

    // Advance turn back to p1 for testing Time card
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // 2. Discarding Time with activateAbility = false succeeds even when opponent is on Stage 1!
    // Also tests that player emptying their hand ends the round and wins!
    session.discardCard('p1', 'time_1', undefined, false);
    assert.strictEqual(lastAction?.type, 'discard', 'Action emitted must be standard discard, NOT time');
    assert.strictEqual(session.players[0].cards.length, 0);
    assert.strictEqual(session.status, 'round_end', 'Player emptying hand must end the round');
  });

  test('Time Card: Gracefully falls back to normal discard when no opponents are eligible and no target is given', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'CHAOS_TIME_FALLBACK',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
      () => {},
      (action) => { lastAction = action; }
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
        currentPhase: 2,
        phaseCompletedInRound: true,
        cardCount: 1,
        cards: [
          { id: 'time_last', type: 'time', color: 'none', value: 0, points: 30 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2',
        name: 'P2 (Stage 1)',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1, // Immune
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

    // Discarding without explicit target when no targets are eligible does NOT throw or softlock!
    session.discardCard('p1', 'time_last');
    assert.strictEqual(lastAction?.type, 'discard');
    assert.strictEqual(session.players[0].cards.length, 0);
    assert.strictEqual(session.status, 'round_end');
  });

  test('Resignation: Player can resign, turns are skipped, actions blocked, and resets next round', () => {
    const session = new GameSession(
      'RESIGN_TEST',
      { turnTimerSeconds: 0, gameMode: 'classic' },
      () => {},
      () => {},
      () => {}
    );

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1_tok',
        name: 'Alice',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 },
          { id: 'c2', type: 'number', color: 'red', value: 2, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2_tok',
        name: 'Bob',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'c3', type: 'number', color: 'blue', value: 3, points: 5 },
          { id: 'c4', type: 'number', color: 'blue', value: 4, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'draw';

    // Alice resigns while it is her turn
    session.resignPlayer('p1_tok');

    assert.strictEqual(session.players[0].isResigned, true, 'Alice should be marked as resigned');
    // Turn should have automatically advanced to Bob (index 1)
    assert.strictEqual(session.currentTurnIndex, 1, 'Turn should advance to Bob');
    assert.strictEqual(session.turnStage, 'draw', 'Bob turn stage should be draw');

    // Alice attempts to draw while resigned -> should fail
    assert.throws(() => {
      session.drawCard('p1_tok', 'deck');
    }, /resigned/i);

    // Bob draws a card
    session.drawPile = [{ id: 'd1', type: 'number', color: 'green', value: 5, points: 5 }];
    session.drawCard('p2_tok', 'deck');
    assert.strictEqual(session.turnStage, 'play');

    // Bob discards to finish turn
    session.discardCard('p2_tok', 'c3');

    // When Bob finishes turn, it tries to go to Alice (index 0), but Alice is resigned!
    // GameSession automatically advances past Alice back to Bob (index 1)!
    assert.strictEqual(session.currentTurnIndex, 1, 'Alice turn was skipped, so Bob is active again');

    // Start a new round: verify isResigned resets to false
    session.startRound();
    assert.strictEqual(session.players[0].isResigned, false, 'Alice resignation should reset on new round');
    assert.strictEqual(session.players[1].isResigned, false, 'Bob should not be resigned');
  });

  test('Reverse Card: Inverts play direction and turn progression in 3-player match', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'REV1',
      { turnTimerSeconds: 0, gameMode: 'classic' },
      () => {},
      () => {},
      (action) => { lastAction = action; }
    );

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1_tok',
        name: 'Player 1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'rev1', type: 'reverse', color: 'none', value: 0, points: 15 },
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2_tok',
        name: 'Player 2',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'c2', type: 'number', color: 'blue', value: 2, points: 5 },
          { id: 'c3', type: 'number', color: 'blue', value: 3, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p3',
        secretToken: 'p3_tok',
        name: 'Player 3',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'c4', type: 'number', color: 'green', value: 4, points: 5 },
          { id: 'c5', type: 'number', color: 'green', value: 5, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.playDirection = 1;
    session.turnStage = 'play';

    // Player 1 discards reverse card
    session.discardCard('p1_tok', 'rev1');

    assert.strictEqual(session.playDirection, -1, 'Play direction should now be -1');
    assert.strictEqual(lastAction.type, 'reverse');
    // With playDirection = -1, next turn from index 0 should be index (0 - 1 + 3) % 3 = 2 (Player 3) instead of index 1
    assert.strictEqual(session.currentTurnIndex, 2, 'Turn should go backwards to Player 3');
  });

  test('Number Eye Card: Chooses opponent and marks hasNumberEyeEffect until round reset', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'NUMEYE1',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
      () => {},
      (action) => { lastAction = action; }
    );

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1_tok',
        name: 'Player 1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'ne1', type: 'number_eye', color: 'none', value: 0, points: 30 },
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2_tok',
        name: 'Player 2',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'c2', type: 'number', color: 'blue', value: 2, points: 5 },
          { id: 'c3', type: 'number', color: 'blue', value: 3, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // Player 1 discards number_eye targeting Player 2
    session.discardCard('p1_tok', 'ne1', 'p2');

    assert.strictEqual(session.players[1].hasNumberEyeEffect, true, 'Player 2 should have number eye effect active');
    const pub = session.getPublicState();
    assert.strictEqual(pub.players.find(p => p.id === 'p2')?.hasNumberEyeEffect, true);
    assert.strictEqual(lastAction.type, 'number_eye');

    // Round reset clears it
    session.startRound();
    assert.strictEqual(session.players[1].hasNumberEyeEffect, false, 'Number eye effect should reset on new round');
  });

  test('Color Eye Card: Chooses opponent and marks hasColorEyeEffect until round reset', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'COLOREYE1',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
      () => {},
      (action) => { lastAction = action; }
    );

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1_tok',
        name: 'Player 1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'ce1', type: 'color_eye', color: 'none', value: 0, points: 30 },
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2_tok',
        name: 'Player 2',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'c2', type: 'number', color: 'blue', value: 2, points: 5 },
          { id: 'c3', type: 'number', color: 'blue', value: 3, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // Player 1 discards color_eye targeting Player 2
    session.discardCard('p1_tok', 'ce1', 'p2');

    assert.strictEqual(session.players[1].hasColorEyeEffect, true, 'Player 2 should have color eye effect active');
    const pub = session.getPublicState();
    assert.strictEqual(pub.players.find(p => p.id === 'p2')?.hasColorEyeEffect, true);
    assert.strictEqual(lastAction.type, 'color_eye');

    // Round reset clears it
    session.startRound();
    assert.strictEqual(session.players[1].hasColorEyeEffect, false, 'Color eye effect should reset on new round');
  });

  test('Random Card: Discarding triggers one of the eligible abilities', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'RAND1',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
      () => {},
      (action) => { lastAction = action; }
    );

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1_tok',
        name: 'Player 1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'rnd1', type: 'random', color: 'none', value: 0, points: 35 },
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2_tok',
        name: 'Player 2',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'c2', type: 'number', color: 'blue', value: 2, points: 5 },
          { id: 'c3', type: 'number', color: 'blue', value: 3, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    session.discardCard('p1_tok', 'rnd1', 'p2');
    assert.ok(lastAction, 'An action should have been emitted');
    // Random must roll into one of the known effects
    const validRollTypes = ['redo', 'jester', 'plus_two', 'plus_three', 'number_eye', 'color_eye', 'crack', 'status', 'luck', 'unlucky', 'double'];
    assert.ok(validRollTypes.includes(lastAction.type), `Rolled action type ${lastAction.type} must be in valid list`);
  });

  test('Skip and Reverse cards: Always activate their rules even if activateAbility is false', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'SKIPREV1',
      { turnTimerSeconds: 0, gameMode: 'classic' },
      () => {},
      () => {},
      (action) => { lastAction = action; }
    );

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1_tok',
        name: 'Player 1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 's1', type: 'skip', color: 'none', value: 0, points: 15 },
          { id: 'r1', type: 'reverse', color: 'none', value: 0, points: 15 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2_tok',
        name: 'Player 2',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 },
          { id: 'c2', type: 'number', color: 'red', value: 2, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p3',
        secretToken: 'p3_tok',
        name: 'Player 3',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'c3', type: 'number', color: 'blue', value: 3, points: 5 },
          { id: 'c4', type: 'number', color: 'blue', value: 4, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // Player 1 discards Skip with activateAbility = false (e.g. from generic discard button)
    session.discardCard('p1_tok', 's1', undefined, false);

    assert.strictEqual(lastAction.type, 'skip', 'Action type must be skip');
    // Player 2 was skipped, so turn passes directly to Player 3 (index 2)
    assert.strictEqual(session.currentTurnIndex, 2, 'Turn must skip Player 2 and land on Player 3');
    assert.strictEqual(session.getCurrentPlayer().id, 'p3');

    // Now give Player 3 a Reverse card and discard with activateAbility = false
    session.players[2].cards.push({ id: 'r2', type: 'reverse', color: 'none', value: 0, points: 15 });
    session.turnStage = 'play';
    session.discardCard('p3_tok', 'r2', undefined, false);

    assert.strictEqual(session.playDirection, -1, 'Reverse card must flip direction even if activateAbility was false');
    assert.strictEqual(lastAction.type, 'reverse');
  });

  test('Self-Targeting: Time card can be used on myself to advance or rewind stage', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'SELF_TIME',
      { turnTimerSeconds: 0, totalPhases: 10 },
      () => {},
      () => {},
      (action) => { lastAction = action; }
    );

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1_tok',
        name: 'P1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 4,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'time_self', type: 'time', color: 'none', value: 0, points: 30 },
          { id: 'num_1', type: 'number', color: 'red', value: 5, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2_tok',
        name: 'P2',
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

    const origRandom = Math.random;
    try {
      // 0.49 => rewind (4 -> 3)
      Math.random = () => 0.49;
      session.discardCard('p1_tok', 'time_self', 'p1'); // Targets self!
      assert.strictEqual(lastAction.type, 'time');
      assert.strictEqual(lastAction.targetPlayerId, 'p1');
      assert.strictEqual(session.players[0].currentPhase, 3, 'P1 rewound their own stage');
    } finally {
      Math.random = origRandom;
    }
  });

  test('Self-Targeting: +2 and +3 cards can be used on myself', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'SELF_PLUS',
      { turnTimerSeconds: 0, totalPhases: 10 },
      () => {},
      () => {},
      (action) => { lastAction = action; }
    );

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1_tok',
        name: 'P1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'p2_card', type: 'plus_two', color: 'none', value: 0, points: 20 },
          { id: 'num_1', type: 'number', color: 'red', value: 5, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2_tok',
        name: 'P2',
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

    session.drawPile = [
      { id: 'd1', type: 'number', color: 'blue', value: 1, points: 5 },
      { id: 'd2', type: 'number', color: 'blue', value: 2, points: 5 }
    ];
    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // Discard +2 targeting self 'p1'
    session.discardCard('p1_tok', 'p2_card', 'p1');
    assert.strictEqual(lastAction.type, 'plus_two');
    assert.strictEqual(lastAction.targetPlayerId, 'p1');
    // Hand was 2, minus discarded plus_two = 1, plus 2 drawn = 3
    assert.strictEqual(session.players[0].cards.length, 3, 'P1 gave +2 cards to self');
  });

  test('Crack Card: Shakes arena and cracks random card in each opponent deck; Softlock exemption allows discarding last card to win', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'CRACK_TEST',
      { turnTimerSeconds: 0, totalPhases: 10 },
      () => {},
      () => {},
      (action) => { lastAction = action; }
    );

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1_tok',
        name: 'P1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'crack_1', type: 'crack', color: 'none', value: 0, points: 35 },
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2_tok',
        name: 'P2',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'p2_c1', type: 'number', color: 'blue', value: 3, points: 5 },
          { id: 'p2_c2', type: 'number', color: 'blue', value: 4, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // P1 plays Crack
    session.discardCard('p1_tok', 'crack_1');
    assert.strictEqual(lastAction.type, 'crack');

    // Check that P2 has exactly 1 cracked card
    const p2Cracked = session.players[1].cards.filter(c => c.isCracked);
    assert.strictEqual(p2Cracked.length, 1, 'P2 must have 1 cracked card');
    assert.strictEqual(session.players[1].crackedCardCount, 1);

    // P2 tries to discard the cracked card when they have not completed stage -> should throw
    session.currentTurnIndex = 1;
    session.turnStage = 'play';
    assert.throws(() => {
      session.discardCard('p2_tok', p2Cracked[0].id);
    }, /Cracked cards cannot be discarded/);

    // Now test softlock exemption: P2 completes stage, only has 1 card left (which is cracked)
    session.players[1].phaseCompletedInRound = true;
    session.players[1].cards = [p2Cracked[0]];
    session.players[1].cardCount = 1;

    // Discarding last card to win succeeds even if cracked!
    session.discardCard('p2_tok', p2Cracked[0].id);
    assert.strictEqual(session.players[1].cards.length, 0);
    assert.strictEqual(session.status, 'round_end', 'Discarding last cracked card to win ends round');
  });

  test('Status Card: Purges all positive and negative effects and uncracks cards', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'STATUS_TEST',
      { turnTimerSeconds: 0, totalPhases: 10 },
      () => {},
      () => {},
      (action) => { lastAction = action; }
    );

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1_tok',
        name: 'P1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        hasNumberEyeEffect: true,
        hasColorEyeEffect: true,
        hasLuck: true,
        hasUnlucky: true,
        hasDoubleDebuff: true,
        cards: [
          { id: 'status_card', type: 'status', color: 'none', value: 0, points: 25 },
          { id: 'cracked_c', type: 'number', color: 'red', value: 7, points: 5, isCracked: true }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    session.discardCard('p1_tok', 'status_card');
    assert.strictEqual(lastAction.type, 'status');

    const p1 = session.players[0];
    assert.strictEqual(p1.hasNumberEyeEffect, false);
    assert.strictEqual(p1.hasColorEyeEffect, false);
    assert.strictEqual(p1.hasLuck, false);
    assert.strictEqual(p1.hasUnlucky, false);
    assert.strictEqual(p1.hasDoubleDebuff, false);
    assert.strictEqual(p1.crackedCardCount, 0);
    assert.strictEqual(p1.cards[0].isCracked, false, 'Cracked card was healed by Status');
  });

  test('Double Card: Target completes stage but must repeat it again next round', () => {
    let lastAction: any = null;
    const session = new GameSession(
      'DOUBLE_TEST',
      { turnTimerSeconds: 0, totalPhases: 10 },
      () => {},
      () => {},
      (action) => { lastAction = action; }
    );

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1_tok',
        name: 'P1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'double_card', type: 'double', color: 'none', value: 0, points: 35 },
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2_tok',
        name: 'P2',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 3,
        phaseCompletedInRound: true, // P2 laid down phase 3
        cardCount: 1,
        cards: [{ id: 'p2_c1', type: 'number', color: 'blue', value: 2, points: 5 }],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // P1 casts Double on P2
    session.discardCard('p1_tok', 'double_card', 'p2');
    assert.strictEqual(lastAction.type, 'double');
    assert.strictEqual(session.players[1].hasDoubleDebuff, true);

    // Now P1 goes out by discarding c1
    session.currentTurnIndex = 0;
    session.turnStage = 'play';
    session.discardCard('p1_tok', 'c1');

    assert.strictEqual(session.status, 'round_end');
    // Normally P2 would advance from stage 3 to 4, but due to Double, stays on stage 3!
    assert.strictEqual(session.players[1].currentPhase, 3, 'P2 must repeat Stage 3');
    assert.strictEqual(session.players[1].hasDoubleDebuff, false, 'Debuff cleared after repeat');
  });

  test('Configurable totalPhases and per-card toggles in settings', () => {
    // 1. totalPhases = 3
    const session = new GameSession(
      'CONFIG_TEST',
      {
        turnTimerSeconds: 0,
        totalPhases: 3,
        enabledSpecialCards: {
          nuke: false,
          jester: false,
          plus_two: false,
          plus_three: false,
          redo: false,
          time: false,
          number_eye: false,
          color_eye: false,
          random: false,
          crack: false,
          status: true, // Only status enabled
          luck: false,
          unlucky: false,
          double: false,
          reverse: false,
          skip: true
        }
      },
      () => {},
      () => {}
    );

    session.players = [
      { id: 'p1', secretToken: 'p1', name: 'P1', isHost: true, isSpectator: false, connected: true, score: 0, currentPhase: 1, phaseCompletedInRound: false, cardCount: 0, cards: [], laidDownPhases: [], isSkipped: false },
      { id: 'p2', secretToken: 'p2', name: 'P2', isHost: false, isSpectator: false, connected: true, score: 0, currentPhase: 1, phaseCompletedInRound: false, cardCount: 0, cards: [], laidDownPhases: [], isSkipped: false }
    ];

    session.startGame();
    assert.strictEqual(session.phaseDefinitions.length, 3, 'Only 3 stages initialized');

    // Deck must have: 96 colored + 2 status + 4 skips + 8 wilds = 110 cards
    // 20 cards dealt (10 each), so draw pile has 89 cards (and 1 on discard)
    const allCardsInGame = [...session.drawPile, ...session.discardPile, ...session.players[0].cards, ...session.players[1].cards];
    assert.strictEqual(allCardsInGame.length, 110);
    assert.strictEqual(allCardsInGame.filter(c => c.type === 'status').length, 2, 'Status enabled has 2 copies');
    assert.strictEqual(allCardsInGame.filter(c => c.type === 'nuke').length, 0, 'Disabled nuke not present');
    assert.strictEqual(allCardsInGame.filter(c => c.type === 'reverse').length, 0, 'Disabled reverse not present');
  });

  test('Randomize Stages per round: Shuffles stages per round for all players', () => {
    const session = new GameSession(
      'RANDOM_STAGES',
      {
        turnTimerSeconds: 0,
        totalPhases: 10,
        randomizePhasesPerRound: true
      },
      () => {},
      () => {}
    );

    session.players = [
      { id: 'p1', secretToken: 'p1', name: 'P1', isHost: true, isSpectator: false, connected: true, score: 0, currentPhase: 1, phaseCompletedInRound: false, cardCount: 0, cards: [], laidDownPhases: [], isSkipped: false },
      { id: 'p2', secretToken: 'p2', name: 'P2', isHost: false, isSpectator: false, connected: true, score: 0, currentPhase: 1, phaseCompletedInRound: false, cardCount: 0, cards: [], laidDownPhases: [], isSkipped: false }
    ];

    session.startGame();
    const round1Stages = session.phaseDefinitions.map(p => p.description);
    assert.strictEqual(session.phaseDefinitions.length, 10);
    // All players have phaseNumber 1..10
    session.phaseDefinitions.forEach((p, idx) => {
      assert.strictEqual(p.phaseNumber, idx + 1);
      assert.strictEqual(p.name, `Stage ${idx + 1}`);
    });

    // Advance to next round - should re-shuffle
    session.players[0].phaseCompletedInRound = true;
    session.nextRound();

    assert.strictEqual(session.phaseDefinitions.length, 10);
    session.phaseDefinitions.forEach((p, idx) => {
      assert.strictEqual(p.phaseNumber, idx + 1);
      assert.strictEqual(p.name, `Stage ${idx + 1}`);
    });
  });

  test('Custom totalPhases winner message says completed all X stages', () => {
    let gameOverMessage = '';
    const session = new GameSession(
      'CUSTOM_TOTAL_PHASES',
      {
        turnTimerSeconds: 0,
        totalPhases: 6
      },
      () => {},
      (notif) => {
        if (notif.type === 'game_over') {
          gameOverMessage = notif.message;
        }
      }
    );

    session.players = [
      { id: 'p1', secretToken: 'p1', name: 'Alice', isHost: true, isSpectator: false, connected: true, score: 0, currentPhase: 6, phaseCompletedInRound: true, cardCount: 0, cards: [], laidDownPhases: [], isSkipped: false },
      { id: 'p2', secretToken: 'p2', name: 'Bob', isHost: false, isSpectator: false, connected: true, score: 50, currentPhase: 3, phaseCompletedInRound: false, cardCount: 0, cards: [], laidDownPhases: [], isSkipped: false }
    ];

    session.status = 'in_game';
    session.phaseDefinitions = session.phaseDefinitions.slice(0, 6);
    (session as any).endRound(session.players[0]);

    assert.strictEqual(session.status, 'game_over');
    assert.strictEqual(session.winnerId, 'p1');
    assert.strictEqual(gameOverMessage, 'Alice has completed all 6 stages and won the game!');
  });

  test('Debuff Status Card Boost: 5 debuffs gives 10x chance to pick up status card', () => {
    const session = new GameSession(
      'STATUS_BOOST_TEST',
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
        cardCount: 2,
        cards: [
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5, isCracked: true }
        ],
        laidDownPhases: [],
        isSkipped: false,
        hasNumberEyeEffect: true,
        hasColorEyeEffect: true,
        hasUnlucky: true,
        hasDoubleDebuff: true
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
        cardCount: 1,
        cards: [{ id: 'c2', type: 'number', color: 'blue', value: 2, points: 5 }],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'draw';

    // Deck with 1 status card and 9 non-status cards
    session.drawPile = [
      { id: 'status_card', type: 'status', color: 'none', value: 0, points: 30 },
      ...Array.from({ length: 9 }, (_, i) => ({
        id: `num_${i}`,
        type: 'number' as const,
        color: 'red' as const,
        value: i + 1,
        points: 5
      }))
    ];

    // With 5 debuffs and status card at bottom, multiplier is 10x.
    // Base probability is 1/10 = 10%. With 10x boost, probability is 100%!
    const drawn = session.drawCard('p1', 'deck');
    assert.strictEqual(drawn.type, 'status', 'P1 with 5 debuffs gets status card with 10x multiplier');
  });

  test('v6.0 Solo Lobby with Bots: Host can start game alone against 1, 2, or 3 bots', () => {
    const hostUser: RoomUser = {
      socketId: 'sock_host',
      secretToken: 'tok_host',
      name: 'SoloHost',
      isSpectator: false
    };

    const room = new Room('SOLOBOT', hostUser, {
      broadcastRoom: () => {},
      broadcastGame: () => {},
      sendNotification: () => {},
      sendChat: () => {},
      deleteRoom: () => {}
    });

    // 0 bots: cannot start solo (need at least 2 players)
    assert.throws(() => room.startGame('tok_host'), /At least 2 players/);

    // Set 2 bots
    room.updateSettings('tok_host', { botCount: 2 });
    room.startGame('tok_host');

    assert.ok(room.gameSession, 'GameSession successfully started');
    assert.strictEqual(room.gameSession.players.length, 3, '1 human host + 2 bots = 3 players total');
    assert.strictEqual(room.gameSession.players[0].isBot, false, 'Host is not bot');
    assert.strictEqual(room.gameSession.players[1].isBot, true, 'Bot 1 is bot');
    assert.strictEqual(room.gameSession.players[2].isBot, true, 'Bot 2 is bot');
    assert.strictEqual(room.gameSession.status, 'in_game');
  });

  test('v6.0 Admin Card Spawner: Keybind L prompt with password 3115 spawns cards into hand', () => {
    const session = new GameSession(
      'ADMIN_SPAWN',
      { turnTimerSeconds: 0 },
      () => {},
      () => {}
    );

    session.players = [
      { id: 'admin1', secretToken: 'admin_tok', name: 'Admin', isHost: true, isSpectator: false, connected: true, score: 0, currentPhase: 1, phaseCompletedInRound: false, cardCount: 0, cards: [], laidDownPhases: [], isSkipped: false }
    ];

    // Invalid password must throw
    assert.throws(() => session.adminSpawnCard('admin_tok', 'time', 'wrong_pass'), /Invalid admin password/);

    // Valid password spawns special card
    const timeCard = session.adminSpawnCard('admin_tok', 'time', '3115');
    assert.strictEqual(timeCard.type, 'time');
    assert.strictEqual(session.players[0].cards.length, 1);

    // Spawns wild, skip, reverse
    const wildCard = session.adminSpawnCard('admin_tok', 'wild', '3115');
    assert.strictEqual(wildCard.type, 'wild');
    const skipCard = session.adminSpawnCard('admin_tok', 'skip', '3115');
    assert.strictEqual(skipCard.type, 'skip');
    const revCard = session.adminSpawnCard('admin_tok', 'reverse', '3115');
    assert.strictEqual(revCard.type, 'reverse');

    // Spawns ultimate card (with 100% progress for testing)
    const singCard = session.adminSpawnCard('admin_tok', 'singularity', '3115');
    assert.strictEqual(singCard.type, 'singularity');
    assert.strictEqual(singCard.ultimateProgress, 100);
    assert.strictEqual(session.players[0].cards.length, 5);
  });

  test('v6.0 Ultimate Sacrifice Mechanic: Requires 1 special + 1 wild/skip/reverse to charge to 100%', () => {
    const session = new GameSession(
      'SACRIFICE_TEST',
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
        cardCount: 4,
        cards: [
          { id: 'ult_voy', type: 'voyance', color: 'none', value: 0, points: 50, ultimateProgress: 0 },
          { id: 'spec_nuke', type: 'nuke', color: 'none', value: 0, points: 50 },
          { id: 'wild_card', type: 'wild', color: 'none', value: 0, points: 25 },
          { id: 'num_1', type: 'number', color: 'red', value: 1, points: 5 }
        ],
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
        cardCount: 2,
        cards: [{ id: 'c2', type: 'number', color: 'blue', value: 2, points: 5 }],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'discard';

    // First sacrifice: Special card (nuke)
    session.sacrificeCard('p1', 'spec_nuke', 'ult_voy');
    const ultCard = session.players[0].cards.find(c => c.id === 'ult_voy')!;
    assert.strictEqual(ultCard.ultimateProgress, 50, 'Progress reaches 50% after special card');
    assert.strictEqual(ultCard.sacrificedSpecial, true);
    assert.strictEqual(session.currentTurnIndex, 1, 'Sacrificing acts as discard and ends turn');

    // Advance back to P1
    session.turnStage = 'discard';
    session.currentTurnIndex = 0;

    // Second sacrifice: Wild card
    session.sacrificeCard('p1', 'wild_card', 'ult_voy');
    assert.strictEqual(ultCard.ultimateProgress, 100, 'Progress reaches 100% after wild card');
    assert.strictEqual(ultCard.sacrificedWildSkipReverse, true);
  });

  test('v6.0 Ultimate Protections: Nuke preserves, Jester keeps with owner, Crack avoids, Status does not clear Voyance', () => {
    const session = new GameSession(
      'PROTECT_TEST',
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
        phaseCompletedInRound: true,
        cardCount: 4,
        cards: [
          { id: 'ult_sing', type: 'singularity', color: 'none', value: 0, points: 50 },
          { id: 'n1', type: 'number', color: 'red', value: 1, points: 5 },
          { id: 'n2', type: 'number', color: 'red', value: 2, points: 5 },
          { id: 'n3', type: 'number', color: 'red', value: 3, points: 5 }
        ],
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
        cardCount: 2,
        cards: [
          { id: 'ult_voy', type: 'voyance', color: 'none', value: 0, points: 50 },
          { id: 'p2_n1', type: 'number', color: 'blue', value: 5, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'discard';

    // 1. Nuke protection: P1 plays nuke
    const nukeCard: Card = { id: 'nuke_c', type: 'nuke', color: 'none', value: 0, points: 50 };
    (session as any).applyNukeEffect(session.players[0], nukeCard);

    // P1 had ult_sing + 3 numbers. Nuke preserves ult_sing and leaves up to 2 numbers = 3 cards total!
    assert.ok(session.players[0].cards.some(c => c.id === 'ult_sing'), 'Ultimate singularity preserved from Nuke');
    assert.ok(session.players[1].cards.some(c => c.id === 'ult_voy'), 'Ultimate voyance preserved from Nuke');

    // 2. Jester protection: Swapping hands keeps ultimates with original owners
    const jesterCard: Card = { id: 'jest_c', type: 'jester', color: 'none', value: 0, points: 25 };
    (session as any).applyJesterEffect(session.players[0], jesterCard, 'p2');
    assert.ok(session.players[0].cards.some(c => c.id === 'ult_sing'), 'Ult singularity remained with P1');
    assert.ok(session.players[1].cards.some(c => c.id === 'ult_voy'), 'Ult voyance remained with P2');

    // 3. Crack protection: Crack never cracks ultimate cards
    const crackCard: Card = { id: 'crack_c', type: 'crack', color: 'none', value: 0, points: 35 };
    (session as any).applyCrackEffect(session.players[0], crackCard);
    const p2Ult = session.players[1].cards.find(c => c.id === 'ult_voy')!;
    assert.strictEqual(p2Ult.isCracked, undefined, 'Ultimate card was not cracked');

    // 4. Status protection: Status card does NOT purge Voyance debuff
    session.players[0].hasVoyanceDebuff = true;
    session.players[0].hasLuck = true;
    const statusCard: Card = { id: 'status_c', type: 'status', color: 'none', value: 0, points: 25 };
    (session as any).applyStatusEffect(session.players[0], statusCard);
    assert.strictEqual(session.players[0].hasLuck, false, 'Luck was purged');
    assert.strictEqual(session.players[0].hasVoyanceDebuff, true, 'Voyance debuff is immune to Status card');
  });

  test('v6.1 Singularity Ultimate Ability: Sucks in all players cards, shuffles, and redistributes them randomly with caster luck', () => {
    const session = new GameSession(
      'SINGULARITY_TEST',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
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
        cardCount: 2,
        cards: [
          { id: 'ult_sing', type: 'singularity', color: 'none', value: 0, points: 50, ultimateProgress: 100 },
          { id: 'n1', type: 'number', color: 'red', value: 1, points: 5 }
        ],
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
        cardCount: 5,
        cards: Array.from({ length: 5 }, (_, i) => ({ id: `p2_${i}`, type: 'number' as const, color: 'blue' as const, value: i + 1, points: 5 })),
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    session.playUltimateCard('p1', 'ult_sing');

    // Total non-ultimate cards sucked: 1 from p1 + 5 from p2 = 6 cards total
    // 6 cards distributed across 2 players = 3 each
    assert.strictEqual(session.players[0].cards.length, 3, 'P1 gets 3 redistributed cards');
    assert.strictEqual(session.players[1].cards.length, 3, 'P2 gets 3 redistributed cards');
    assert.strictEqual(session.players[0].hasLuck, true, 'Singularity caster gains 2x luck boost');
    assert.strictEqual(session.discardPile[session.discardPile.length - 1].type, 'singularity', 'Ultimate placed on discard pile');
  });

  test('v6.1 Ultimate Card: Can be discarded normally without activating ability', () => {
    const session = new GameSession(
      'ULT_DISCARD_TEST',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
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
        cardCount: 2,
        cards: [
          { id: 'ult_sing', type: 'singularity', color: 'none', value: 0, points: 50, ultimateProgress: 0 },
          { id: 'n1', type: 'number', color: 'red', value: 1, points: 5 }
        ],
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
        cardCount: 2,
        cards: [{ id: 'n2', type: 'number', color: 'blue', value: 2, points: 5 }],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'discard';

    // Discarding ultimate card should NOT throw and should advance turn
    session.discardCard('p1', 'ult_sing', undefined, false);

    assert.strictEqual(session.players[0].cards.length, 1, 'P1 has 1 card left');
    assert.strictEqual(session.discardPile[session.discardPile.length - 1].id, 'ult_sing', 'Ultimate in discard pile');
    assert.strictEqual(session.currentTurnIndex, 1, 'Turn advanced to P2');
  });

  test('v6.0 Voyance Ultimate Ability: Opponent cards visible only to caster', () => {
    const session = new GameSession(
      'VOYANCE_TEST',
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
        cardCount: 1,
        cards: [{ id: 'ult_voy', type: 'voyance', color: 'none', value: 0, points: 50, ultimateProgress: 100 }],
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
        cardCount: 2,
        cards: [
          { id: 'secret_1', type: 'number', color: 'green', value: 7, points: 5 },
          { id: 'secret_2', type: 'wild', color: 'none', value: 0, points: 25 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    session.playUltimateCard('p1', 'ult_voy');

    assert.strictEqual(session.voyanceCasterId, 'p1');
    assert.strictEqual(session.players[1].hasVoyanceDebuff, true, 'P2 has voyance debuff');

    // Check public state when viewed by P1 (caster)
    const stateForP1 = session.getPublicState('p1');
    const p2ForP1 = stateForP1.players.find(p => p.id === 'p2')!;
    assert.ok(p2ForP1.visibleCards, 'P2 cards are visible to Voyance caster');
    assert.strictEqual(p2ForP1.visibleCards!.length, 2);

    // Check public state when viewed by P2 (non-caster)
    const stateForP2 = session.getPublicState('p2');
    const p2ForP2 = stateForP2.players.find(p => p.id === 'p2')!;
    assert.strictEqual(p2ForP2.visibleCards, undefined, 'P2 cards are NOT visible to non-caster');
  });

  test('v6.0 Alternate Ultimate Ability: 10 pure number cards, switches every 2 turns', () => {
    const session = new GameSession(
      'ALT_TEST',
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
        cardCount: 1,
        cards: [{ id: 'ult_alt', type: 'alternate', color: 'none', value: 0, points: 50, ultimateProgress: 100 }],
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
        cardCount: 2,
        cards: [
          { id: 'main_1', type: 'wild', color: 'none', value: 0, points: 25 },
          { id: 'main_2', type: 'nuke', color: 'none', value: 0, points: 50 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    session.playUltimateCard('p1', 'ult_alt');

    assert.strictEqual(session.isAlternateWorld, true, 'Alternate dimension active');
    assert.strictEqual(session.players[0].cards.length, 10, 'P1 gets 10 alternate cards');
    assert.strictEqual(session.players[1].cards.length, 10, 'P2 gets 10 alternate cards');

    // Verify all cards in alternate world are strictly pure number cards
    for (const c of [...session.players[0].cards, ...session.players[1].cards, ...session.drawPile]) {
      assert.strictEqual(c.type, 'number', 'No specials, wilds, skips, reverses, or ultimates in Alternate World');
    }

    // Turn 1 passes
    (session as any).advanceTurn();
    assert.strictEqual(session.isAlternateWorld, true, 'Still in alternate world after 1 turn');

    // Turn 2 passes -> switches back to Main World!
    (session as any).advanceTurn();
    assert.strictEqual(session.isAlternateWorld, false, 'Switched back to Main World after 2 turns');
    assert.ok(session.players[1].cards.some(c => c.id === 'main_1'), 'Original main world cards restored');
  });

  test('v6.0 Avarice Ultimate Ability: Plunders all special cards from discard pile into caster hand', () => {
    const session = new GameSession(
      'AVARICE_TEST',
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
        cardCount: 1,
        cards: [{ id: 'ult_ava', type: 'avarice', color: 'none', value: 0, points: 50, ultimateProgress: 100 }],
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
        cardCount: 2,
        cards: [{ id: 'c2', type: 'number', color: 'blue', value: 2, points: 5 }],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.discardPile = [
      { id: 'd1', type: 'number', color: 'red', value: 5, points: 5 },
      { id: 'd2', type: 'nuke', color: 'none', value: 0, points: 50 },
      { id: 'd3', type: 'time', color: 'none', value: 0, points: 30 },
      { id: 'd4', type: 'number', color: 'blue', value: 8, points: 5 },
      { id: 'd5', type: 'crack', color: 'none', value: 0, points: 35 }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    session.playUltimateCard('p1', 'ult_ava');

    // P1 plundered all 3 special cards (nuke, time, crack)
    assert.strictEqual(session.players[0].cards.length, 3, 'P1 plundered 3 special cards');
    assert.ok(session.players[0].cards.some(c => c.type === 'nuke'));
    assert.ok(session.players[0].cards.some(c => c.type === 'time'));
    assert.ok(session.players[0].cards.some(c => c.type === 'crack'));

    // Discard pile no longer contains chaos specials
    assert.ok(!session.discardPile.some(c => c.type === 'nuke'));
    assert.ok(!session.discardPile.some(c => c.type === 'time'));
    assert.ok(!session.discardPile.some(c => c.type === 'crack'));
  });

  test('v6.2 Animation Lock: Special and Ultimate cards set animationLockUntil and lock turn actions', () => {
    const session = new GameSession(
      'LOCK_TEST',
      { turnTimerSeconds: 30 },
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
        phaseCompletedInRound: true,
        cardCount: 3,
        cards: [
          { id: 'nuke_card', type: 'nuke', color: 'none', value: 0, points: 50 },
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 },
          { id: 'c2', type: 'number', color: 'red', value: 2, points: 5 }
        ],
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
        cardCount: 2,
        cards: [{ id: 'c3', type: 'number', color: 'blue', value: 3, points: 5 }],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'discard';

    const now = Date.now();
    session.discardCard('p1', 'nuke_card');

    assert.ok(session.isAnimationLocked(), 'Game should be animation locked after Nuke');
    assert.ok(session.animationLockUntil >= now + 7900, 'Nuke animation lock should be ~8000ms');

    // Ultimate card test
    session.animationLockUntil = 0;
    const ultCard: Card = { id: 'ult_voy', type: 'voyance', color: 'none', value: 0, points: 50, ultimateProgress: 100 };
    session.players[1].cards.push(ultCard);
    session.currentTurnIndex = 1;
    session.turnStage = 'play';

    const nowUlt = Date.now();
    session.playUltimateCard('p2', 'ult_voy');
    assert.ok(session.isAnimationLocked(), 'Game should be animation locked after Ultimate card');
    assert.ok(session.animationLockUntil >= nowUlt + 5900, 'Ultimate animation lock should be ~6000ms');
  });

  test('v6.2 Bug 2: Alternate world shift is delayed while card animation is playing', async () => {
    const session = new GameSession(
      'ALT_BUG2',
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
        phaseCompletedInRound: true,
        cardCount: 2,
        cards: [
          { id: 'nuke_1', type: 'nuke', color: 'none', value: 0, points: 50 },
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 }
        ],
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
        cardCount: 2,
        cards: [{ id: 'c2', type: 'number', color: 'blue', value: 2, points: 5 }],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.isAlternateWorld = true;
    session.alternateDimensionActive = true;
    session.alternateTurnCounter = 1; // 1 turn passed. Next discard will be 2nd turn!
    session.currentTurnIndex = 0;
    session.turnStage = 'discard';

    // P1 discards Nuke on the 2nd turn of Alternate World
    session.discardCard('p1', 'nuke_1');

    // Crucial Bug 2 verification:
    // Because Nuke has an 8.0s animation, the world switch must NOT have happened immediately!
    assert.strictEqual(session.isAlternateWorld, true, 'World shift postponed while Nuke animation is playing');
  });

  test('v6.3 Multi-Caster Voyance: Both casters retain opponent card visibility without canceling each other', () => {
    const session = new GameSession(
      'VOYANCE_MULTI',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
      () => {},
      () => {}
    );

    const p1Cards = [
      { id: 'ult_voy_1', type: 'voyance' as const, color: 'none' as const, value: 0, points: 50, ultimateProgress: 100 },
      { id: 'p1_c1', type: 'number' as const, color: 'red' as const, value: 5, points: 5 }
    ];
    const p2Cards = [
      { id: 'ult_voy_2', type: 'voyance' as const, color: 'none' as const, value: 0, points: 50, ultimateProgress: 100 },
      { id: 'p2_c1', type: 'number' as const, color: 'blue' as const, value: 8, points: 10 }
    ];

    session.players = [
      {
        id: 'p1',
        secretToken: 'p1_tok',
        name: 'Player 1',
        isHost: true,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: p1Cards,
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'p2',
        secretToken: 'p2_tok',
        name: 'Player 2',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: p2Cards,
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'play';

    // Player 1 casts Voyance
    session.playUltimateCard('p1_tok', 'ult_voy_1');
    assert.ok(session.voyanceCasterIds.includes('p1'), 'P1 is in voyanceCasterIds');

    // Check P1 public state: P1 sees P2 cards
    const stateForP1 = session.getPublicState('p1_tok');
    const p2SeenByP1 = stateForP1.players.find(p => p.id === 'p2');
    assert.ok(p2SeenByP1?.visibleCards, 'P1 can see P2 cards');
    assert.ok(p2SeenByP1?.visibleCards?.some(c => c.id === 'p2_c1'), 'P1 sees p2_c1');

    // Advance turn to Player 2
    session.currentTurnIndex = 1;
    session.turnStage = 'play';

    // Player 2 casts Voyance
    session.playUltimateCard('p2_tok', 'ult_voy_2');
    assert.ok(session.voyanceCasterIds.includes('p2'), 'P2 is also in voyanceCasterIds');

    // CRITICAL: Player 1's voyance must STILL be working!
    const stateForP1AfterP2 = session.getPublicState('p1_tok');
    const p2SeenByP1AfterP2 = stateForP1AfterP2.players.find(p => p.id === 'p2');
    assert.ok(p2SeenByP1AfterP2?.visibleCards, 'P1 can STILL see P2 cards after P2 cast Voyance!');

    // Player 2 can also see Player 1 cards!
    const stateForP2 = session.getPublicState('p2_tok');
    const p1SeenByP2 = stateForP2.players.find(p => p.id === 'p1');
    assert.ok(p1SeenByP2?.visibleCards, 'P2 can also see P1 cards!');
  });

  test('v6.3 Effect Deferral: With enableAnimationDelays = true, mechanical effects execute after delay', (t, done) => {
    const session = new GameSession(
      'DELAY_TEST',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
      () => {},
      () => {}
    );
    session.enableAnimationDelays = true;

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
        phaseCompletedInRound: true,
        cardCount: 6,
        cards: [
          { id: 'nuke_card', type: 'nuke', color: 'none', value: 0, points: 50 },
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
        name: 'P2',
        isHost: false,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 5,
        cards: [
          { id: 'c6', type: 'number', color: 'blue', value: 6, points: 10 },
          { id: 'c7', type: 'number', color: 'blue', value: 7, points: 10 },
          { id: 'c8', type: 'number', color: 'blue', value: 8, points: 10 },
          { id: 'c9', type: 'number', color: 'blue', value: 9, points: 10 },
          { id: 'c10', type: 'number', color: 'blue', value: 10, points: 10 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'discard';

    session.discardCard('p1', 'nuke_card');

    // Right after discarding at t=0, Nuke Totem is hovering, so hands have NOT been reduced yet!
    assert.strictEqual(session.players[0].cards.length, 5, 'P1 hand has not been reduced to 2 yet at t=0');
    assert.strictEqual(session.players[1].cards.length, 5, 'P2 hand has not been reduced to 2 yet at t=0');
    assert.ok(session.isAnimationLocked(), 'Game session is locked during 8s Nuke animation');

    // Clean up timeouts
    session.cleanup();
    done();
  });

  test('v6.4 Ratio Toggle and Custom Card Counts in Deck Generation', () => {
    // 1. Ratio toggle OFF (scaleColoredCardsRatio: false) -> exactly 96 colored cards (2 sets)
    const deckWithoutRatio = createStandardDeck({
      gameMode: 'chaos',
      scaleColoredCardsRatio: false
    });
    const coloredCards = deckWithoutRatio.filter(c => c.type === 'number');
    assert.strictEqual(coloredCards.length, 96, 'Should have exactly 96 colored cards when ratio is OFF');

    // 2. Custom special and ultimate card copy counts
    const deckWithCustomCounts = createStandardDeck({
      gameMode: 'chaos',
      scaleColoredCardsRatio: false,
      specialCardCounts: { nuke: 4, jester: 3 },
      ultimateCardCounts: { singularity: 2 }
    });
    const nukeCards = deckWithCustomCounts.filter(c => c.type === 'nuke');
    const jesterCards = deckWithCustomCounts.filter(c => c.type === 'jester');
    const singularityCards = deckWithCustomCounts.filter(c => c.type === 'singularity');
    assert.strictEqual(nukeCards.length, 4, 'Should have exactly 4 Nuke cards');
    assert.strictEqual(jesterCards.length, 3, 'Should have exactly 3 Jester cards');
    assert.strictEqual(singularityCards.length, 2, 'Should have exactly 2 Singularity cards');
  });

  test('v6.4 Deferred Discard Placement and Bot Locking', (t, done) => {
    const session = new GameSession(
      'CHAOS_V64',
      { turnTimerSeconds: 0, gameMode: 'chaos' },
      () => {},
      () => {},
      () => {}
    );
    session.enableAnimationDelays = true;

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
        phaseCompletedInRound: true,
        cardCount: 3,
        cards: [
          { id: 'jester_card', type: 'jester', color: 'none', value: 0, points: 25 },
          { id: 'c1', type: 'number', color: 'red', value: 1, points: 5 },
          { id: 'c2', type: 'number', color: 'red', value: 2, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'bot1',
        secretToken: 'bot1',
        name: 'Bot 1',
        isHost: false,
        isSpectator: false,
        isBot: true,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [
          { id: 'b1', type: 'number', color: 'blue', value: 5, points: 5 },
          { id: 'b2', type: 'number', color: 'blue', value: 6, points: 5 }
        ],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'discard';

    // Discard Jester card targeting bot1
    session.discardCard('p1', 'jester_card', 'bot1');

    // 1. Jester card removed from P1 hand immediately at t=0
    assert.strictEqual(session.players[0].cards.some(c => c.id === 'jester_card'), false);

    // 2. Jester card is NOT yet on discard pile (held until animation concludes)
    assert.strictEqual(session.discardPile.some(c => c.id === 'jester_card'), false);
    assert.ok(session.isAnimationLocked());

    // 3. Actions rejected while locked
    assert.throws(() => session.drawCard('p1', 'deck'), /Turn is locked while animation is playing/);

    // 4. Bot does not act while locked
    session.takeTurnForBot(session.players[1]);
    assert.strictEqual(session.players[1].cardCount, 2, 'Bot should not draw or act during animation lock');

    session.cleanup();
    done();
  });

  test('v6.4.1 Skip and Reverse 3000ms Duration and Deferred Discard Placement', (t, done) => {
    const session = new GameSession(
      'TEST_SKIP_REV',
      {
        totalPhases: 10,
        turnTimerSeconds: 60,
        gameMode: 'chaos'
      },
      () => {},
      () => {}
    );

    const skipCard = { id: 's1', type: 'skip' as const, color: 'none' as const, value: 0, points: 15 };
    const revCard = { id: 'r1', type: 'reverse' as const, color: 'none' as const, value: 0, points: 15 };

    assert.strictEqual(session.getCardAnimationDuration(skipCard, true), 3000);
    assert.strictEqual(session.getCardAnimationDuration(revCard, true), 3000);
    assert.strictEqual(session.getCardAnimationDuration(skipCard, false), 0);

    session.enableAnimationDelays = true;
    session.players = [
      {
        id: 'p1',
        name: 'Player 1',
        isSpectator: false,
        isBot: false,
        isHost: true,
        secretToken: 'tok1',
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [skipCard, { id: 'c1', type: 'number', color: 'red', value: 2, points: 5 }],
        laidDownPhases: [],
        isSkipped: false
      },
      {
        id: 'bot1',
        name: 'Bot 1',
        isSpectator: false,
        isBot: true,
        isHost: false,
        secretToken: 'tok2',
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 2,
        cards: [{ id: 'b1', type: 'number', color: 'blue', value: 5, points: 5 }, { id: 'b2', type: 'number', color: 'blue', value: 6, points: 5 }],
        laidDownPhases: [],
        isSkipped: false
      }
    ];

    session.status = 'in_game';
    session.currentTurnIndex = 0;
    session.turnStage = 'discard';

    session.discardCard('p1', 's1');

    // Skip card removed from hand
    assert.strictEqual(session.players[0].cards.some(c => c.id === 's1'), false);
    // Not yet on discard pile
    assert.strictEqual(session.discardPile.some(c => c.id === 's1'), false);
    // Animation locked
    assert.ok(session.isAnimationLocked());

    session.cleanup();
    done();
  });
});



