import {
  Card,
  CardColor,
  CLASSIC_PHASES,
  findExtraMeldMatch,
  findValidPhaseCombination,
  GameNotification,
  GameSettings,
  LaidDownPhaseGroup,
  PhaseDefinition,
  PlayerPrivate,
  PublicGameState,
  RequirementType,
  sortCardsByValue,
  sortGroupCards,
  TurnStage,
  validateColorGroup,
  validateHit,
  validatePhase,
  validateRun,
  validateSet
} from '@phase-ten/shared';
import { createDeck, shuffleDeck } from '@phase-ten/shared';

export interface GamePlayerInternal extends PlayerPrivate {
  secretToken: string;
}

export class GameSession {
  public readonly roomCode: string;
  public settings: GameSettings;
  public phaseDefinitions: PhaseDefinition[] = CLASSIC_PHASES;
  public players: GamePlayerInternal[] = [];
  public currentTurnIndex: number = 0;
  public turnStage: TurnStage = 'draw';
  public drawPile: Card[] = [];
  public discardPile: Card[] = [];
  public allLaidDownPhases: LaidDownPhaseGroup[] = [];
  public roundNumber: number = 1;
  public status: 'lobby' | 'in_game' | 'round_end' | 'game_over' = 'lobby';
  public winnerId?: string;
  public roundWinnerId?: string;

  private turnTimerInterval?: NodeJS.Timeout;
  public turnTimeRemaining: number = 0;

  private onStateChange: () => void;
  private onNotification: (notif: GameNotification) => void;

  constructor(
    roomCode: string,
    settings: GameSettings,
    onStateChange: () => void,
    onNotification: (notif: GameNotification) => void
  ) {
    this.roomCode = roomCode;
    this.settings = settings;
    this.onStateChange = onStateChange;
    this.onNotification = onNotification;
  }

  public startGame(): void {
    if (this.players.length < 2) {
      throw new Error('At least 2 players are required to start the game');
    }

    this.status = 'in_game';
    this.roundNumber = 1;
    this.allLaidDownPhases = [];
    this.winnerId = undefined;
    this.roundWinnerId = undefined;

    for (const player of this.players) {
      player.score = 0;
      player.currentPhase = 1;
      player.phaseCompletedInRound = false;
      player.cards = [];
      player.cardCount = 0;
      player.laidDownPhases = [];
      player.isSkipped = false;
    }

    this.startRound();
  }

  public startRound(): void {
    this.status = 'in_game';
    this.allLaidDownPhases = [];
    this.roundWinnerId = undefined;

    for (const player of this.players) {
      player.phaseCompletedInRound = false;
      player.laidDownPhases = [];
      player.isSkipped = false;
      player.cards = [];
      player.cardCount = 0;
    }

    this.drawPile = createDeck();
    this.discardPile = [];

    // Deal 10 cards to each player
    for (let i = 0; i < 10; i++) {
      for (const player of this.players) {
        if (!player.isSpectator) {
          const card = this.drawPile.pop()!;
          player.cards.push(card);
        }
      }
    }

    for (const player of this.players) {
      player.cardCount = player.cards.length;
      player.cards = sortCardsByValue(player.cards);
    }

    // Flip top card for discard pile (re-shuffle if skip)
    let firstDiscard = this.drawPile.pop()!;
    while (firstDiscard.type === 'skip') {
      this.drawPile.unshift(firstDiscard);
      this.drawPile = shuffleDeck(this.drawPile);
      firstDiscard = this.drawPile.pop()!;
    }
    this.discardPile.push(firstDiscard);

    this.currentTurnIndex = (this.roundNumber - 1) % this.getActivePlayers().length;
    this.turnStage = 'draw';

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `Round ${this.roundNumber} started.`,
      timestamp: Date.now()
    });

    this.startTurn();
  }

  public getActivePlayers(): GamePlayerInternal[] {
    return this.players.filter(p => !p.isSpectator);
  }

  public getCurrentPlayer(): GamePlayerInternal {
    const active = this.getActivePlayers();
    return active[this.currentTurnIndex % active.length];
  }

  private startTurn(): void {
    const current = this.getCurrentPlayer();

    if (current.isSkipped) {
      current.isSkipped = false;
      this.notify({
        id: `notif_${Date.now()}`,
        type: 'skip',
        message: `${current.name} was skipped this turn.`,
        playerId: current.id,
        timestamp: Date.now()
      });
      this.advanceTurn();
      return;
    }

    this.turnStage = 'draw';
    this.resetTurnTimer();
    this.onStateChange();

    if (current.isBot || !current.connected) {
      this.scheduleBotTurn(current);
    }
  }

  private resetTurnTimer(): void {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = undefined;
    }

    if (this.settings.turnTimerSeconds > 0) {
      this.turnTimeRemaining = this.settings.turnTimerSeconds;
      this.turnTimerInterval = setInterval(() => {
        this.turnTimeRemaining -= 1;
        if (this.turnTimeRemaining <= 0) {
          clearInterval(this.turnTimerInterval);
          this.turnTimerInterval = undefined;
          this.handleTurnTimeout();
        } else {
          this.onStateChange();
        }
      }, 1000);
      this.turnTimerInterval.unref?.();
    } else {
      this.turnTimeRemaining = 0;
    }
  }

  private handleTurnTimeout(): void {
    const current = this.getCurrentPlayer();
    if (this.turnStage === 'draw') {
      this.drawCard(current.id, 'deck');
    }
    if (this.turnStage === 'play' || this.turnStage === 'discard') {
      const highestCard = current.cards.slice().sort((a, b) => b.points - a.points)[0];
      if (highestCard) {
        this.discardCard(current.id, highestCard.id);
      }
    }
  }

  public drawCard(playerId: string, source: 'deck' | 'discard'): Card {
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'draw') throw new Error('Already drawn a card this turn');

    this.ensureDrawPileHasCards();

    let drawnCard: Card;
    if (source === 'discard') {
      if (this.discardPile.length === 0) throw new Error('Discard pile is empty');
      drawnCard = this.discardPile.pop()!;
    } else {
      drawnCard = this.drawPile.pop()!;
    }

    current.cards.push(drawnCard);
    current.cardCount = current.cards.length;
    this.turnStage = 'play';

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} drew a card.`,
      playerId: current.id,
      timestamp: Date.now()
    });

    this.onStateChange();
    return drawnCard;
  }

  public layDownPhase(playerId: string, cardGroups: Card[][]): void {
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'play') throw new Error('Must draw a card first');
    if (current.phaseCompletedInRound) throw new Error('You have already laid down your phase this round');

    const phaseDef = this.phaseDefinitions.find(p => p.phaseNumber === current.currentPhase);
    if (!phaseDef) throw new Error(`Phase ${current.currentPhase} not found`);

    const validation = validatePhase(cardGroups, phaseDef);
    if (!validation.isValid || !validation.annotatedGroups) {
      throw new Error(validation.error || 'Invalid phase');
    }

    const usedCardIds = new Set<string>();
    for (const group of cardGroups) {
      for (const c of group) {
        usedCardIds.add(c.id);
      }
    }

    const hasAllCards = Array.from(usedCardIds).every(id => current.cards.some(c => c.id === id));
    if (!hasAllCards) {
      throw new Error('Cards not found in hand');
    }

    current.cards = current.cards.filter(c => !usedCardIds.has(c.id));
    current.cardCount = current.cards.length;
    current.phaseCompletedInRound = true;

    validation.annotatedGroups.forEach((group, index) => {
      const sortedCards = sortGroupCards(group.cards, group.type, group.runMin, group.runMax);
      const laidDownGroup: LaidDownPhaseGroup = {
        id: `group_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`,
        playerId: current.id,
        playerName: current.name,
        requirementIndex: index,
        type: group.type,
        cards: sortedCards,
        targetValue: group.targetValue,
        targetColor: group.targetColor,
        runMin: group.runMin,
        runMax: group.runMax
      };
      this.allLaidDownPhases.push(laidDownGroup);
      current.laidDownPhases.push(laidDownGroup);
    });

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'phase_complete',
      message: `${current.name} completed ${phaseDef.name} (${phaseDef.description}).`,
      playerId: current.id,
      timestamp: Date.now()
    });

    if (current.cards.length === 0) {
      this.endRound(current);
      return;
    }

    this.onStateChange();
  }

  public layPhaseRequirement(playerId: string, _reqIndex: number, cardIds: string[]): void {
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'play') throw new Error('Must draw a card first');
    if (!current.phaseCompletedInRound) {
      throw new Error('Must lay down your full phase first before laying extra groups/halves');
    }
    this.layExtraGroup(playerId, cardIds);
  }

  public layExtraGroup(playerId: string, cardIds: string[]): void {
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'play') throw new Error('Must draw a card first');
    if (!current.phaseCompletedInRound) throw new Error('Must complete your phase before laying extra sets');

    const cards = current.cards.filter(c => cardIds.includes(c.id));
    if (cards.length !== cardIds.length) {
      throw new Error('Cards not found in hand');
    }

    const phaseDef = this.phaseDefinitions.find(p => p.phaseNumber === current.currentPhase);
    let groupType: RequirementType | undefined;
    let targetValue: number | undefined;
    let targetColor: CardColor | undefined;
    let runMin: number | undefined;
    let runMax: number | undefined;

    // Check if cards match any requirement in current phase
    if (phaseDef) {
      for (const req of phaseDef.requirements) {
        if (req.type === 'set') {
          const res = validateSet(cards, req.count);
          if (res.valid) {
            groupType = 'set';
            targetValue = res.value;
            break;
          }
        } else if (req.type === 'run') {
          const res = validateRun(cards, req.count);
          if (res.valid) {
            groupType = 'run';
            runMin = res.min;
            runMax = res.max;
            break;
          }
        } else if (req.type === 'color') {
          const res = validateColorGroup(cards, req.count);
          if (res.valid) {
            groupType = 'color';
            targetColor = res.color;
            break;
          }
        }
      }
    }

    if (!groupType) {
      const setRes = validateSet(cards, 3);
      if (setRes.valid) {
        groupType = 'set';
        targetValue = setRes.value;
      } else {
        const runRes = validateRun(cards, 4);
        if (runRes.valid) {
          groupType = 'run';
          runMin = runRes.min;
          runMax = runRes.max;
        } else {
          throw new Error('Extra group must match a requirement of your phase, a set of 3+, or a run of 4+');
        }
      }
    }

    const usedCardIds = new Set(cardIds);
    current.cards = current.cards.filter(c => !usedCardIds.has(c.id));
    current.cardCount = current.cards.length;

    const sortedCards = sortGroupCards(cards, groupType, runMin, runMax);
    const laidGroup: LaidDownPhaseGroup = {
      id: `group_${Date.now()}_extra_${Math.random().toString(36).substring(2, 6)}`,
      playerId: current.id,
      playerName: current.name,
      requirementIndex: 99,
      type: groupType,
      cards: sortedCards,
      targetValue,
      targetColor,
      runMin,
      runMax
    };

    this.allLaidDownPhases.push(laidGroup);
    current.laidDownPhases.push(laidGroup);

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} laid down an extra ${groupType} of ${cards.length} cards.`,
      playerId: current.id,
      timestamp: Date.now()
    });

    if (current.cards.length === 0) {
      this.endRound(current);
      return;
    }

    this.onStateChange();
  }

  public hitCard(
    playerId: string,
    cardId: string | string[],
    targetGroupId: string,
    targetEnd?: 'low' | 'high'
  ): void {
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'play') throw new Error('Must draw first');
    if (!current.phaseCompletedInRound) throw new Error('Must complete your phase before hitting');

    const cardIds = Array.isArray(cardId) ? cardId : [cardId];
    if (cardIds.length === 0) throw new Error('No cards selected to hit');

    const targetGroup = this.allLaidDownPhases.find(g => g.id === targetGroupId);
    if (!targetGroup) throw new Error('Target phase group not found');

    for (const cId of cardIds) {
      const cardIndex = current.cards.findIndex(c => c.id === cId);
      if (cardIndex === -1) throw new Error('Card not in hand');
      const card = current.cards[cardIndex];

      const canHit = validateHit(card, targetGroup, targetEnd);
      if (!canHit) throw new Error('Card cannot hit this group');

      current.cards.splice(cardIndex, 1);
      current.cardCount = current.cards.length;

      targetGroup.cards.push(card);

      if (targetGroup.type === 'run') {
        const min = targetGroup.runMin ?? 1;
        const max = targetGroup.runMax ?? 12;

        if (card.type === 'number') {
          if (card.value < min) {
            targetGroup.runMin = card.value;
          } else if (card.value > max) {
            targetGroup.runMax = card.value;
          }
        } else {
          // Wild card on run
          // If high end is already 12 or targetEnd is 'low', extend low end!
          // If low end is already 1 or targetEnd is 'high', extend high end!
          if (targetEnd === 'low' || (max >= 12 && min > 1)) {
            targetGroup.runMin = min - 1;
          } else if (targetEnd === 'high' || (min <= 1 && max < 12)) {
            targetGroup.runMax = max + 1;
          } else if (min > 1) {
            targetGroup.runMin = min - 1;
          } else if (max < 12) {
            targetGroup.runMax = max + 1;
          }
        }
      }

      // Always maintain strictly ordered cards in the group!
      targetGroup.cards = sortGroupCards(
        targetGroup.cards,
        targetGroup.type,
        targetGroup.runMin,
        targetGroup.runMax
      );
    }

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} hit ${cardIds.length} card${cardIds.length > 1 ? 's' : ''} onto ${targetGroup.playerName}'s ${targetGroup.type}.`,
      playerId: current.id,
      timestamp: Date.now()
    });

    if (current.cards.length === 0) {
      this.endRound(current);
      return;
    }

    this.onStateChange();
  }

  public discardCard(playerId: string, cardId: string, skipTargetPlayerId?: string): void {
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'play' && this.turnStage !== 'discard') {
      throw new Error('Cannot discard before drawing');
    }

    const cardIndex = current.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) throw new Error('Card not in hand');
    const card = current.cards.splice(cardIndex, 1)[0];
    current.cardCount = current.cards.length;

    this.discardPile.push(card);

    if (card.type === 'skip') {
      const active = this.getActivePlayers();
      let target = active.find(p => p.id === skipTargetPlayerId && p.id !== current.id);
      if (!target) {
        const nextIndex = (this.currentTurnIndex + 1) % active.length;
        target = active[nextIndex];
      }
      target.isSkipped = true;
      this.notify({
        id: `notif_${Date.now()}`,
        type: 'skip',
        message: `${current.name} skipped ${target.name}.`,
        playerId: target.id,
        timestamp: Date.now()
      });
    } else {
      this.notify({
        id: `notif_${Date.now()}`,
        type: 'info',
        message: `${current.name} discarded a card.`,
        playerId: current.id,
        timestamp: Date.now()
      });
    }

    if (current.cards.length === 0) {
      this.endRound(current);
      return;
    }

    this.advanceTurn();
  }

  private advanceTurn(): void {
    const active = this.getActivePlayers();
    this.currentTurnIndex = (this.currentTurnIndex + 1) % active.length;
    this.startTurn();
  }

  private endRound(roundWinner: GamePlayerInternal): void {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = undefined;
    }

    this.status = 'round_end';
    this.roundWinnerId = roundWinner.id;

    for (const player of this.getActivePlayers()) {
      if (player.id !== roundWinner.id) {
        const handPoints = player.cards.reduce((sum, c) => sum + c.points, 0);
        player.score += handPoints;
      }

      if (player.phaseCompletedInRound) {
        if (player.currentPhase >= 10) {
          player.completedAllPhases = true;
          player.currentPhase = 10;
        } else {
          player.currentPhase += 1;
        }
      }
    }

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'round_end',
      message: `${roundWinner.name} went out. Round ${this.roundNumber} ended.`,
      playerId: roundWinner.id,
      timestamp: Date.now()
    });

    const winningCandidates = this.getActivePlayers().filter(p => p.completedAllPhases);
    if (winningCandidates.length > 0) {
      winningCandidates.sort((a, b) => a.score - b.score);
      const gameWinner = winningCandidates[0];
      this.status = 'game_over';
      this.winnerId = gameWinner.id;

      this.notify({
        id: `notif_${Date.now()}`,
        type: 'game_over',
        message: `${gameWinner.name} has completed all 10 phases and won the game!`,
        playerId: gameWinner.id,
        timestamp: Date.now()
      });
    }

    this.onStateChange();
  }

  public restartGame(): void {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = undefined;
    }
    this.status = 'in_game';
    this.roundNumber = 1;
    this.allLaidDownPhases = [];
    this.winnerId = undefined;
    this.roundWinnerId = undefined;

    for (const player of this.players) {
      player.score = 0;
      player.currentPhase = 1;
      player.phaseCompletedInRound = false;
      player.completedAllPhases = false;
      player.cards = [];
      player.cardCount = 0;
      player.laidDownPhases = [];
      player.isSkipped = false;
    }

    this.startRound();
  }

  public nextRound(): void {
    if (this.status === 'game_over') {
      this.restartGame();
      return;
    }
    if (this.status !== 'round_end') return;
    this.roundNumber += 1;
    this.startRound();
  }

  private ensureDrawPileHasCards(): void {
    if (this.drawPile.length === 0) {
      if (this.discardPile.length <= 1) {
        this.drawPile = createDeck();
      } else {
        const top = this.discardPile.pop()!;
        this.drawPile = shuffleDeck(this.discardPile);
        this.discardPile = [top];
      }
    }
  }

  private notify(notif: GameNotification): void {
    this.onNotification(notif);
  }

  public getPublicState(): PublicGameState {
    const active = this.getActivePlayers();
    const current = active.length > 0 ? active[this.currentTurnIndex % active.length] : null;

    return {
      roomCode: this.roomCode,
      status: this.status,
      roundNumber: this.roundNumber,
      currentTurnPlayerId: current ? current.id : '',
      turnStage: this.turnStage,
      turnTimeRemaining: this.turnTimeRemaining,
      drawPileCount: this.drawPile.length,
      topDiscard: this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null,
      discardHistory: this.discardPile.slice(-5),
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isSpectator: p.isSpectator,
        isBot: p.isBot,
        connected: p.connected,
        score: p.score,
        currentPhase: p.currentPhase,
        phaseCompletedInRound: p.phaseCompletedInRound,
        completedAllPhases: p.completedAllPhases,
        cardCount: p.cards.length,
        laidDownPhases: p.laidDownPhases,
        isSkipped: p.isSkipped
      })),
      allLaidDownPhases: this.allLaidDownPhases,
      winnerId: this.winnerId,
      roundWinnerId: this.roundWinnerId,
      phaseDefinitions: this.phaseDefinitions,
      settings: this.settings
    };
  }

  public getPlayerHand(playerId: string): Card[] {
    const p = this.players.find(pl => pl.id === playerId);
    return p ? p.cards : [];
  }

  private botActionTimeout?: NodeJS.Timeout;

  public scheduleBotTurn(bot: GamePlayerInternal): void {
    if (this.botActionTimeout) {
      clearTimeout(this.botActionTimeout);
      this.botActionTimeout = undefined;
    }

    this.botActionTimeout = setTimeout(() => {
      if (this.status !== 'in_game') return;
      const current = this.getCurrentPlayer();
      if (current && current.id === bot.id && (current.isBot || !current.connected)) {
        this.executeBotTurn(current);
      }
    }, 1200);
    this.botActionTimeout.unref?.();
  }

  public executeBotTurn(bot: GamePlayerInternal): void {
    if (this.status !== 'in_game') return;
    const current = this.getCurrentPlayer();
    if (!current || current.id !== bot.id) return;

    // 1. Draw
    if (this.turnStage === 'draw') {
      try {
        this.drawCard(bot.id, 'deck');
      } catch (e) {
        return;
      }
    }

    if (this.turnStage !== 'play') return;

    const phaseDef = this.phaseDefinitions.find(p => p.phaseNumber === bot.currentPhase);

    // 2. Play Stage if not yet completed
    if (!bot.phaseCompletedInRound && phaseDef) {
      const combination = findValidPhaseCombination(bot.cards, phaseDef);
      if (combination) {
        try {
          this.layDownPhase(bot.id, combination);
        } catch (e) {}
      }
    }

    // 3. Play extra melds and hit onto table groups if stage is made
    if (bot.phaseCompletedInRound && phaseDef) {
      if (this.settings.allowPartialAndExtraSets) {
        const extra = findExtraMeldMatch(bot.cards, phaseDef);
        if (extra && extra.cards.length > 0) {
          try {
            this.layExtraGroup(bot.id, extra.cards.map(c => c.id));
          } catch (e) {}
        }
      }

      if (bot.cards.length > 0) {
        for (const group of this.allLaidDownPhases) {
          if (bot.cards.length === 0) break;
          const candidateCards = [...bot.cards];
          for (const card of candidateCards) {
            if (bot.cards.length === 0) break;
            if (validateHit(card, group, 'high')) {
              try {
                this.hitCard(bot.id, card.id, group.id, 'high');
              } catch (e) {}
            } else if (validateHit(card, group, 'low')) {
              try {
                this.hitCard(bot.id, card.id, group.id, 'low');
              } catch (e) {}
            }
          }
        }
      }
    }

    if (bot.cards.length === 0 || this.status !== 'in_game') {
      return;
    }

    // 4. Discard
    if (this.turnStage === 'play' || this.turnStage === 'discard') {
      const nonSkipCards = bot.cards.filter(c => c.type !== 'skip');
      const cardToDiscard = nonSkipCards.length > 0
        ? nonSkipCards.sort((a, b) => b.points - a.points)[0]
        : bot.cards[0];

      let skipTargetId: string | undefined = undefined;
      if (cardToDiscard.type === 'skip') {
        const opponents = this.getActivePlayers().filter(p => p.id !== bot.id);
        const target = opponents.find(p => !p.isBot && !p.isSkipped) || opponents.find(p => !p.isSkipped) || opponents[0];
        skipTargetId = target?.id;
      }

      try {
        this.discardCard(bot.id, cardToDiscard.id, skipTargetId);
      } catch (e) {
        if (bot.cards.length > 0) {
          try {
            this.discardCard(bot.id, bot.cards[0].id);
          } catch (err) {}
        }
      }
    }
  }

  public replaceWithBot(secretTokenOrId: string): void {
    const player = this.players.find(p => p.secretToken === secretTokenOrId || p.id === secretTokenOrId);
    if (!player) return;

    player.connected = false;
    player.isBot = true;

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${player.name} disconnected. A bot is now playing for them.`,
      playerId: player.id,
      timestamp: Date.now()
    });

    this.onStateChange();

    if (this.status === 'in_game') {
      const cur = this.getCurrentPlayer();
      if (cur && cur.id === player.id) {
        this.scheduleBotTurn(player);
      }
    }
  }

  public reclaimPlayerSeat(targetIdOrToken: string, newSecretToken: string, newName?: string): GamePlayerInternal | null {
    const player = this.players.find(p => p.id === targetIdOrToken || p.secretToken === targetIdOrToken);
    if (!player) return null;

    player.id = newSecretToken;
    player.secretToken = newSecretToken;
    if (newName && newName.trim()) {
      player.name = newName.trim();
    }
    player.connected = true;
    player.isBot = false;

    if (this.botActionTimeout) {
      clearTimeout(this.botActionTimeout);
      this.botActionTimeout = undefined;
    }

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${player.name} reconnected and took back their seat!`,
      playerId: player.id,
      timestamp: Date.now()
    });

    this.resumeTimer();
    this.onStateChange();
    return player;
  }

  public pauseTimer(): void {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = undefined;
    }
  }

  public resumeTimer(): void {
    if (this.turnStage !== 'draw' && this.turnStage !== 'play' && this.turnStage !== 'discard') return;
    if (this.turnTimerInterval) return;
    if (this.settings.turnTimerSeconds > 0 && this.turnTimeRemaining > 0) {
      this.turnTimerInterval = setInterval(() => {
        this.turnTimeRemaining -= 1;
        if (this.turnTimeRemaining <= 0) {
          clearInterval(this.turnTimerInterval);
          this.turnTimerInterval = undefined;
          this.handleTurnTimeout();
        } else {
          this.onStateChange();
        }
      }, 1000);
      this.turnTimerInterval.unref?.();
    }
  }

  public cleanup(): void {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = undefined;
    }
    if (this.botActionTimeout) {
      clearTimeout(this.botActionTimeout);
      this.botActionTimeout = undefined;
    }
  }
}
