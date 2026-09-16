import {
  Card,
  CardColor,
  CLASSIC_PHASES,
  GameNotification,
  GameSettings,
  LaidDownPhaseGroup,
  PhaseDefinition,
  PlayerPrivate,
  PublicGameState,
  RequirementType,
  sortCardsByValue,
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
      const laidDownGroup: LaidDownPhaseGroup = {
        id: `group_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`,
        playerId: current.id,
        playerName: current.name,
        requirementIndex: index,
        type: group.type,
        cards: group.cards,
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

  public layPhaseRequirement(playerId: string, reqIndex: number, cardIds: string[]): void {
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'play') throw new Error('Must draw a card first');
    if (current.phaseCompletedInRound) throw new Error('You have already completed your phase this round');

    const phaseDef = this.phaseDefinitions.find(p => p.phaseNumber === current.currentPhase);
    if (!phaseDef) throw new Error(`Phase ${current.currentPhase} not found`);

    if (reqIndex < 0 || reqIndex >= phaseDef.requirements.length) {
      throw new Error('Invalid requirement index');
    }

    const alreadyLaid = current.laidDownPhases.some(g => g.requirementIndex === reqIndex);
    if (alreadyLaid) {
      throw new Error(`Part ${reqIndex + 1} is already laid down`);
    }

    const req = phaseDef.requirements[reqIndex];
    const cards = current.cards.filter(c => cardIds.includes(c.id));
    if (cards.length !== cardIds.length) {
      throw new Error('Cards not found in hand');
    }

    let targetValue: number | undefined;
    let targetColor: CardColor | undefined;
    let runMin: number | undefined;
    let runMax: number | undefined;

    if (req.type === 'set') {
      const res = validateSet(cards, req.count);
      if (!res.valid) throw new Error(res.error || 'Invalid set');
      targetValue = res.value;
    } else if (req.type === 'run') {
      const res = validateRun(cards, req.count);
      if (!res.valid) throw new Error(res.error || 'Invalid run');
      runMin = res.min;
      runMax = res.max;
    } else if (req.type === 'color') {
      const res = validateColorGroup(cards, req.count);
      if (!res.valid) throw new Error(res.error || 'Invalid color group');
      targetColor = res.color;
    }

    const usedCardIds = new Set(cardIds);
    current.cards = current.cards.filter(c => !usedCardIds.has(c.id));
    current.cardCount = current.cards.length;

    const laidGroup: LaidDownPhaseGroup = {
      id: `group_${Date.now()}_${reqIndex}_${Math.random().toString(36).substring(2, 5)}`,
      playerId: current.id,
      playerName: current.name,
      requirementIndex: reqIndex,
      type: req.type,
      cards,
      targetValue,
      targetColor,
      runMin,
      runMax
    };

    this.allLaidDownPhases.push(laidGroup);
    current.laidDownPhases.push(laidGroup);

    // Check if all requirements for current phase are now fulfilled
    const allMet = phaseDef.requirements.every((_, idx) =>
      current.laidDownPhases.some(g => g.requirementIndex === idx)
    );

    if (allMet) {
      current.phaseCompletedInRound = true;
      this.notify({
        id: `notif_${Date.now()}`,
        type: 'phase_complete',
        message: `${current.name} completed all parts of ${phaseDef.name} (${phaseDef.description})!`,
        playerId: current.id,
        timestamp: Date.now()
      });
    } else {
      this.notify({
        id: `notif_${Date.now()}`,
        type: 'info',
        message: `${current.name} laid down Part ${reqIndex + 1} of ${phaseDef.name}.`,
        playerId: current.id,
        timestamp: Date.now()
      });
    }

    if (current.cards.length === 0) {
      this.endRound(current);
      return;
    }

    this.onStateChange();
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

    let groupType: RequirementType;
    let targetValue: number | undefined;
    let runMin: number | undefined;
    let runMax: number | undefined;

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
        throw new Error('Extra group must be a valid set of 3+ or a run of 4+');
      }
    }

    const usedCardIds = new Set(cardIds);
    current.cards = current.cards.filter(c => !usedCardIds.has(c.id));
    current.cardCount = current.cards.length;

    const laidGroup: LaidDownPhaseGroup = {
      id: `group_${Date.now()}_extra_${Math.random().toString(36).substring(2, 6)}`,
      playerId: current.id,
      playerName: current.name,
      requirementIndex: 99,
      type: groupType,
      cards,
      targetValue,
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

  public hitCard(playerId: string, cardId: string | string[], targetGroupId: string): void {
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

      const canHit = validateHit(card, targetGroup);
      if (!canHit) throw new Error('Card cannot hit this group');

      current.cards.splice(cardIndex, 1);
      current.cardCount = current.cards.length;

      if (targetGroup.type === 'run') {
        if (card.type === 'number') {
          if (targetGroup.runMin !== undefined && card.value < targetGroup.runMin) {
            targetGroup.runMin = card.value;
            targetGroup.cards.unshift(card);
          } else {
            targetGroup.cards.push(card);
            if (targetGroup.runMax !== undefined && card.value > targetGroup.runMax) {
              targetGroup.runMax = card.value;
            }
          }
        } else {
          // Wild card on run
          if (targetGroup.runMax !== undefined && targetGroup.runMax < 12) {
            targetGroup.runMax += 1;
            targetGroup.cards.push(card);
          } else if (targetGroup.runMin !== undefined && targetGroup.runMin > 1) {
            targetGroup.runMin -= 1;
            targetGroup.cards.unshift(card);
          } else {
            targetGroup.cards.push(card);
          }
        }
      } else {
        targetGroup.cards.push(card);
      }
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
        player.currentPhase += 1;
      }
    }

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'round_end',
      message: `${roundWinner.name} went out. Round ${this.roundNumber} ended.`,
      playerId: roundWinner.id,
      timestamp: Date.now()
    });

    const winningCandidates = this.getActivePlayers().filter(p => p.currentPhase > 10);
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

  public nextRound(): void {
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
        connected: p.connected,
        score: p.score,
        currentPhase: p.currentPhase,
        phaseCompletedInRound: p.phaseCompletedInRound,
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

  public cleanup(): void {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
    }
  }
}
