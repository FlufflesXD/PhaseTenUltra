import {
  Card,
  CardColor,
  CardType,
  UltimateCardType,
  isUltimateCard,
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
  validateSet,
  GameActionEvent
} from '@phase-ten/shared';
import {
  createDeck,
  shuffleDeck,
  isChaosSpecialCard,
  CHAOS_SPECIAL_CARDS,
  CHAOS_ULTIMATE_CARDS,
  createAlternateDeck
} from '@phase-ten/shared';

export interface GamePlayerInternal extends PlayerPrivate {
  secretToken: string;
}

export class GameSession {
  public readonly roomCode: string;
  public settings: GameSettings;
  public phaseDefinitions: PhaseDefinition[] = CLASSIC_PHASES;
  public players: GamePlayerInternal[] = [];
  public currentTurnIndex: number = 0;
  public playDirection: 1 | -1 = 1;
  public turnStage: TurnStage = 'draw';
  public drawPile: Card[] = [];
  public discardPile: Card[] = [];
  public allLaidDownPhases: LaidDownPhaseGroup[] = [];
  public roundNumber: number = 1;
  public status: 'lobby' | 'in_game' | 'round_end' | 'game_over' = 'lobby';
  public winnerId?: string;
  public roundWinnerId?: string;

  public voyanceCasterIds: string[] = [];
  public get voyanceCasterId(): string | undefined {
    return this.voyanceCasterIds[0];
  }
  public set voyanceCasterId(id: string | undefined) {
    if (!id) this.voyanceCasterIds = [];
    else if (!this.voyanceCasterIds.includes(id)) this.voyanceCasterIds.push(id);
  }
  public enableAnimationDelays: boolean = false;
  private pendingEffectTimeouts: NodeJS.Timeout[] = [];

  public clearPendingEffectTimeouts(): void {
    for (const t of this.pendingEffectTimeouts) {
      clearTimeout(t);
    }
    this.pendingEffectTimeouts = [];
  }

  public addPendingEffectTimeout(fn: () => void, delayMs: number): NodeJS.Timeout {
    const t = setTimeout(() => {
      this.pendingEffectTimeouts = this.pendingEffectTimeouts.filter(item => item !== t);
      fn();
    }, delayMs);
    this.pendingEffectTimeouts.push(t);
    return t;
  }

  public isAlternateWorld: boolean = false;
  public alternateDimensionActive: boolean = false;
  public alternateTurnCounter: number = 0;
  public animationLockUntil: number = 0;

  public isAnimationLocked(): boolean {
    return Date.now() < this.animationLockUntil;
  }

  public getCardAnimationDuration(card: Card, shouldActivate: boolean): number {
    if (!shouldActivate) return 0;
    if (isUltimateCard(card.type)) {
      if (card.type === 'alternate') return 7600;
      return 6000;
    }
    if (isChaosSpecialCard(card.type)) {
      if (card.type === 'nuke') return 8000;
      if (card.type === 'time') return 8200;
      if (card.type === 'crack') return 5000;
      if (card.type === 'number_eye' || card.type === 'color_eye') return 6000;
      if (card.type === 'plus_two') return 4400;
      if (card.type === 'plus_three') return 5100;
      if (card.type === 'jester') return 4250;
      return 3000;
    }
    return 0;
  }
  private mainWorldState: {
    drawPile: Card[];
    discardPile: Card[];
    allLaidDownPhases: LaidDownPhaseGroup[];
    playerHands: Map<string, Card[]>;
    playerLaidPhases: Map<string, LaidDownPhaseGroup[]>;
  } | null = null;
  private alternateWorldState: {
    drawPile: Card[];
    discardPile: Card[];
    allLaidDownPhases: LaidDownPhaseGroup[];
    playerHands: Map<string, Card[]>;
    playerLaidPhases: Map<string, LaidDownPhaseGroup[]>;
  } | null = null;

  private turnTimerInterval?: NodeJS.Timeout;
  public turnTimeRemaining: number = 0;

  private onStateChange: () => void;
  private onNotification: (notif: GameNotification) => void;
  private onActionEvent?: (action: GameActionEvent) => void;
  private actionCounter: number = 0;

  constructor(
    roomCode: string,
    settings: GameSettings,
    onStateChange: () => void,
    onNotification: (notif: GameNotification) => void,
    onActionEvent?: (action: GameActionEvent) => void
  ) {
    this.roomCode = roomCode;
    this.settings = settings;
    this.onStateChange = onStateChange;
    this.onNotification = onNotification;
    this.onActionEvent = onActionEvent;
  }

  public emitAction(action: Omit<GameActionEvent, 'id' | 'timestamp'>): void {
    const event: GameActionEvent = {
      ...action,
      id: `act_${Date.now()}_${++this.actionCounter}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now()
    };
    if (this.onActionEvent) {
      this.onActionEvent(event);
    }
  }

  public setupPhaseDefinitions(): void {
    let totalPhases = this.settings.totalPhases;
    if (!totalPhases) {
      if (this.settings.gameMode === 'speed') {
        totalPhases = 5;
      } else {
        totalPhases = 10;
      }
    }
    const count = Math.max(1, Math.min(10, totalPhases));
    let basePhases = CLASSIC_PHASES.map(p => ({
      ...p,
      requirements: p.requirements.map(r => ({ ...r }))
    }));

    if (this.settings.randomizePhasesPerRound) {
      // Fisher-Yates shuffle
      for (let i = basePhases.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [basePhases[i], basePhases[j]] = [basePhases[j], basePhases[i]];
      }
    }

    this.phaseDefinitions = basePhases.slice(0, count).map((p, idx) => ({
      ...p,
      phaseNumber: idx + 1,
      name: `Stage ${idx + 1}`
    }));
  }

  public startGame(): void {
    if (this.players.length < 2) {
      throw new Error('At least 2 players are required to start the game');
    }
    if (this.players.length > 4) {
      throw new Error('A maximum of 4 players are allowed per game');
    }

    this.playDirection = 1;
    this.setupPhaseDefinitions();

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
      player.hasLuck = false;
      player.hasUnlucky = false;
      player.hasDoubleDebuff = false;
      player.crackedCardCount = 0;
    }

    this.startRound();
  }

  public startRound(): void {
    this.status = 'in_game';
    this.allLaidDownPhases = [];
    this.roundWinnerId = undefined;
    this.voyanceCasterIds = [];
    this.clearPendingEffectTimeouts();
    this.isAlternateWorld = false;
    this.alternateDimensionActive = false;
    this.alternateTurnCounter = 0;
    this.mainWorldState = null;
    this.alternateWorldState = null;

    if (this.settings.randomizePhasesPerRound) {
      this.setupPhaseDefinitions();
    }

    for (const player of this.players) {
      player.phaseCompletedInRound = false;
      player.laidDownPhases = [];
      player.isSkipped = false;
      player.isResigned = false;
      player.hasNumberEyeEffect = false;
      player.hasColorEyeEffect = false;
      player.hasLuck = false;
      player.hasUnlucky = false;
      player.hasDoubleDebuff = false;
      player.hasVoyanceDebuff = false;
      player.crackedCardCount = 0;
      player.cards = [];
      player.cardCount = 0;
    }

    this.drawPile = createDeck(this.settings, `r${this.roundNumber}_${Date.now()}_`);
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

    // Flip top card for discard pile (re-shuffle until a regular number card is drawn - no special, wild, or skip)
    let firstDiscard = this.drawPile.pop()!;
    while (firstDiscard.type !== 'number') {
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
    const active = this.getActivePlayers();
    const nonResigned = active.filter(p => !p.isResigned);
    if (nonResigned.length === 0) {
      this.endRound();
      return;
    }

    const current = this.getCurrentPlayer();

    if (current.isResigned) {
      this.advanceTurn();
      return;
    }

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
        if (this.isAnimationLocked()) {
          return;
        }
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
      const active = this.getActivePlayers();
      const maxPhase = this.phaseDefinitions.length;
      const hasEligibleTimeTargets = active.some(p => p.currentPhase > 1 && p.currentPhase < maxPhase);
      const eligible = current.cards.filter(c => {
        if (c.type === 'nuke' && !current.phaseCompletedInRound) return false;
        if (c.type === 'time' && !hasEligibleTimeTargets) return false;
        return true;
      });
      const candidates = eligible.length > 0 ? eligible : current.cards;
      const highestCard = candidates.slice().sort((a, b) => b.points - a.points)[0];
      if (highestCard) {
        const canUseAbility =
          (highestCard.type !== 'nuke' || current.phaseCompletedInRound) &&
          (highestCard.type !== 'time' || hasEligibleTimeTargets);
        this.discardCard(current.id, highestCard.id, undefined, canUseAbility);
      }
    }
  }

  public drawCard(playerId: string, source: 'deck' | 'discard'): Card {
    if (this.enableAnimationDelays && this.isAnimationLocked()) {
      throw new Error('Turn is locked while animation is playing');
    }
    const player = this.players.find(p => p.id === playerId || p.secretToken === playerId);
    if (player?.isResigned) throw new Error('Player has resigned this round');
    const current = this.getCurrentPlayer();
    if (current.id !== playerId && current.secretToken !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'draw') throw new Error('Already drawn a card this turn');

    this.ensureDrawPileHasCards();

    let drawnCard: Card;
    if (source === 'discard') {
      if (this.discardPile.length === 0) throw new Error('Discard pile is empty');
      const top = this.discardPile[this.discardPile.length - 1];
      if (top.type !== 'number') {
        throw new Error('Cannot draw a Wild or Skip card (or Special card) from the discard pile');
      }
      drawnCard = this.discardPile.pop()!;
    } else {
      drawnCard = this.drawPile.pop()!;
      if (current.hasLuck && drawnCard.type === 'number') {
        // Luck: 2x chance of obtaining wilds, reverses, skips, and special cards
        // 50% chance to swap drawn number card with a lucky non-number card from the draw pile
        if (Math.random() < 0.50) {
          const luckyIdx = this.drawPile.findIndex(c => c.type !== 'number');
          if (luckyIdx !== -1) {
            const luckyCard = this.drawPile[luckyIdx];
            this.drawPile[luckyIdx] = drawnCard;
            drawnCard = luckyCard;
          }
        }
      } else if (current.hasUnlucky && drawnCard.type !== 'number') {
        // Unlucky: 2x decrease (halved chance) of getting wilds, skips, reverse, and special cards
        // 50% chance to swap drawn lucky card with a regular number card from the draw pile
        if (Math.random() < 0.50) {
          const numberIdx = this.drawPile.findIndex(c => c.type === 'number');
          if (numberIdx !== -1) {
            const numberCard = this.drawPile[numberIdx];
            this.drawPile[numberIdx] = drawnCard;
            drawnCard = numberCard;
          }
        }
      }

      // Debuff-based status clearing card pickup boost:
      // Per each active debuff, adds a 2x chance to pick up the status special card from the deck.
      // Up to a max of 5 debuffs at once (10x chance).
      if (drawnCard.type !== 'status') {
        let debuffCount = 0;
        if (current.hasNumberEyeEffect) debuffCount++;
        if (current.hasColorEyeEffect) debuffCount++;
        if (current.hasUnlucky) debuffCount++;
        if (current.hasDoubleDebuff) debuffCount++;
        if (current.cards.some(c => c.isCracked) || (current.crackedCardCount ?? 0) > 0) debuffCount++;

        if (debuffCount > 0) {
          const statusCount = this.drawPile.filter(c => c.type === 'status').length;
          const nonStatusCount = this.drawPile.length - statusCount;
          if (statusCount > 0 && nonStatusCount > 0) {
            const multiplier = Math.min(10, debuffCount * 2);
            const swapProb = Math.min(1.0, ((multiplier - 1) * statusCount) / nonStatusCount);
            if (Math.random() < swapProb) {
              const statusIdx = this.drawPile.findIndex(c => c.type === 'status');
              if (statusIdx !== -1) {
                const statusCard = this.drawPile[statusIdx];
                this.drawPile[statusIdx] = drawnCard;
                drawnCard = statusCard;
              }
            }
          }
        }
      }
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

    this.emitAction({
      type: 'draw',
      playerId: current.id,
      playerName: current.name,
      source,
      card: source === 'discard' ? drawnCard : undefined
    });

    this.onStateChange();
    return drawnCard;
  }

  public layDownPhase(playerId: string, cardGroups: Card[][]): void {
    const player = this.players.find(p => p.id === playerId || p.secretToken === playerId);
    if (player?.isResigned) throw new Error('Player has resigned this round');
    const current = this.getCurrentPlayer();
    if (current.id !== playerId && current.secretToken !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'play') throw new Error('Must draw a card first');
    if (current.phaseCompletedInRound) throw new Error('You have already laid down your phase this round');

    const phaseDef = this.phaseDefinitions.find(p => p.phaseNumber === current.currentPhase);
    if (!phaseDef) throw new Error('Invalid phase definition');

    for (const group of cardGroups) {
      for (const card of group) {
        if (card.isCracked) {
          throw new Error('Cannot include cracked cards in a lay down');
        }
      }
    }

    const validation = validatePhase(cardGroups, phaseDef);
    if (!validation.isValid || !validation.annotatedGroups) {
      throw new Error(validation.error || 'Invalid phase layout');
    }

    const laidCardIds = new Set(cardGroups.flatMap(g => g.map(c => c.id)));
    current.cards = current.cards.filter(c => !laidCardIds.has(c.id));
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

    this.emitAction({
      type: 'lay_phase',
      playerId: current.id,
      playerName: current.name,
      message: `${current.name} laid down Stage ${current.currentPhase}!`
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
    if (!this.settings.allowPartialAndExtraSets) {
      throw new Error('House rules are not enabled');
    }
    throw new Error('Must lay down your full phase first before laying extra groups');
  }

  public layExtraGroup(playerId: string, cardIds: string[]): void {
    if (this.enableAnimationDelays && this.isAnimationLocked()) throw new Error('Turn is locked while animation is playing');
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'play') throw new Error('Must draw a card first');
    if (!this.settings.allowPartialAndExtraSets) {
      throw new Error('House rules are not enabled');
    }
    if (!current.phaseCompletedInRound) {
      throw new Error('Must complete your phase before laying extra groups');
    }

    const cards = cardIds.map(id => {
      const c = current.cards.find(card => card.id === id);
      if (!c) throw new Error(`Card ${id} not in hand`);
      if (c.isCracked) throw new Error('Cannot include cracked cards in an extra group');
      return c;
    });

    const phaseDef = this.phaseDefinitions.find(p => p.phaseNumber === current.currentPhase);
    if (!phaseDef) throw new Error('Invalid phase definition');

    let groupType: RequirementType | null = null;
    let targetValue: number | undefined;
    let targetColor: CardColor | undefined;
    let runMin: number | undefined;
    let runMax: number | undefined;

    for (const req of phaseDef.requirements) {
      if (req.type === 'set' && cards.length >= req.count) {
        const res = validateSet(cards, req.count);
        if (res.valid) {
          groupType = 'set';
          targetValue = res.value;
          break;
        }
      } else if (req.type === 'run' && cards.length >= req.count) {
        const res = validateRun(cards, req.count);
        if (res.valid) {
          groupType = 'run';
          runMin = res.min;
          runMax = res.max;
          break;
        }
      } else if (req.type === 'color' && cards.length >= req.count) {
        const res = validateColorGroup(cards, req.count);
        if (res.valid) {
          groupType = 'color';
          targetColor = res.color;
          break;
        }
      }
    }

    if (!groupType) {
      throw new Error('Extra group must match one of the requirements of your current Stage');
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

    this.emitAction({
      type: 'lay_extra',
      playerId: current.id,
      playerName: current.name,
      cards,
      message: `${current.name} laid down an extra ${groupType}!`
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
    if (this.enableAnimationDelays && this.isAnimationLocked()) throw new Error('Turn is locked while animation is playing');
    const player = this.players.find(p => p.id === playerId || p.secretToken === playerId);
    if (player?.isResigned) throw new Error('Player has resigned this round');
    const current = this.getCurrentPlayer();
    if (current.id !== playerId && current.secretToken !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'play') throw new Error('Must draw a card first');
    if (!current.phaseCompletedInRound) {
      throw new Error('Must lay down your phase before hitting on other groups');
    }

    const cardIds = Array.isArray(cardId) ? cardId : [cardId];
    if (cardIds.length === 0) throw new Error('No cards selected to hit');

    const cardsToHit: Card[] = [];
    for (const cid of cardIds) {
      const c = current.cards.find(card => card.id === cid);
      if (!c) throw new Error(`Card ${cid} not in hand`);
      if (c.type !== 'number' && c.type !== 'wild') {
        throw new Error('Special cards cannot be played on hits');
      }
      if (c.isCracked) {
        throw new Error('Cracked cards cannot be played on hits');
      }
      cardsToHit.push(c);
    }

    const targetGroup = this.allLaidDownPhases.find(g => g.id === targetGroupId);
    if (!targetGroup) throw new Error('Target group not found');

    for (const c of cardsToHit) {
      const hitRes = validateHit(c, targetGroup, targetEnd);
      if (!hitRes) {
        throw new Error(`Card ${c.color} ${c.value || c.type} cannot hit on this group`);
      }

      const cIdx = current.cards.findIndex(card => card.id === c.id);
      current.cards.splice(cIdx, 1);
      current.cardCount = current.cards.length;

      targetGroup.cards.push(c);

      if (targetGroup.type === 'run') {
        const min = targetGroup.runMin ?? 1;
        const max = targetGroup.runMax ?? 12;

        if (c.type === 'number') {
          if (c.value < min) {
            targetGroup.runMin = c.value;
          } else if (c.value > max) {
            targetGroup.runMax = c.value;
          }
        } else {
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

    this.emitAction({
      type: 'hit',
      playerId: current.id,
      playerName: current.name,
      targetGroupId,
      card: cardsToHit[0],
      cards: cardsToHit,
      message: `${current.name} hit on ${targetGroup.playerName}'s ${targetGroup.type}!`
    });

    if (current.cards.length === 0) {
      this.endRound(current);
      return;
    }

    this.onStateChange();
  }

  public discardCard(
    playerId: string,
    cardId: string,
    _skipTargetPlayerId?: string,
    activateAbility: boolean = true
  ): void {
    if (this.enableAnimationDelays && this.isAnimationLocked()) {
      throw new Error('Turn is locked while animation is playing');
    }
    const player = this.players.find(p => p.id === playerId || p.secretToken === playerId);
    if (player?.isResigned) throw new Error('Player has resigned this round');
    const current = this.getCurrentPlayer();
    if (current.id !== playerId && current.secretToken !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'play' && this.turnStage !== 'discard') {
      throw new Error('Cannot discard before drawing');
    }

    const cardIndex = current.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) throw new Error('Card not in hand');
    const card = current.cards[cardIndex];

    if (card.isCracked) {
      const isLastCardToWin = current.cards.length === 1 && Boolean(current.phaseCompletedInRound);
      if (!isLastCardToWin) {
        throw new Error('Cracked cards cannot be discarded or played unless cleansed by Status');
      }
    }

    const isSpecialChaosCard = isChaosSpecialCard(card.type);
    const isUnoSpecial = card.type === 'skip' || card.type === 'reverse';
    let shouldActivate = isSpecialChaosCard ? (activateAbility !== false) : isUnoSpecial;

    if (shouldActivate) {
      if (card.type === 'nuke' && !current.phaseCompletedInRound) {
        throw new Error('Cannot play Nuke before completing your Stage!');
      }

      if (card.type === 'time') {
        const active = this.getActivePlayers();
        const maxPhase = this.phaseDefinitions.length;
        const eligibleOpponents = active.filter(p => p.id !== current.id && p.currentPhase > 1 && p.currentPhase < maxPhase);
        if (_skipTargetPlayerId) {
          const target = active.find(p => p.id === _skipTargetPlayerId);
          if (!target) throw new Error('Target player not found');
          if (target.currentPhase <= 1 || target.currentPhase >= maxPhase) {
            throw new Error(`Cannot target a player on Stage 1 or Stage ${maxPhase} with Time card`);
          }
        } else if (eligibleOpponents.length === 0) {
          // If no target was specified and no eligible opponents exist, gracefully fall back to normal discard
          shouldActivate = false;
        }
      }
    }

    current.cards.splice(cardIndex, 1);
    current.cardCount = current.cards.length;

    const animDuration = this.getCardAnimationDuration(card, shouldActivate);
    if (animDuration > 0) {
      this.animationLockUntil = Date.now() + animDuration;
    }

    if (!this.enableAnimationDelays || animDuration === 0) {
      this.discardPile.push(card);
    }

    if (!shouldActivate) {
      this.notify({
        id: `notif_${Date.now()}`,
        type: 'info',
        message: `${current.name} discarded a card.`,
        playerId: current.id,
        timestamp: Date.now()
      });

      this.emitAction({
        type: 'discard',
        playerId: current.id,
        playerName: current.name,
        card
      });
    } else if (card.type === 'skip') {
      // UNO rule: Always skip the nearest player in direction order (no choosing)
      const active = this.getActivePlayers();
      const nextIndex = (this.currentTurnIndex + this.playDirection + active.length) % active.length;
      const target = active[nextIndex];
      target.isSkipped = true;

      this.notify({
        id: `notif_${Date.now()}`,
        type: 'skip',
        message: `${current.name} played Skip! ${target.name} is skipped.`,
        playerId: target.id,
        timestamp: Date.now()
      });

      this.emitAction({
        type: 'skip',
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target.id,
        card,
        message: `${current.name} skipped ${target.name}!`
      });
    } else if (card.type === 'reverse') {
      this.playDirection = this.playDirection === 1 ? -1 : 1;
      this.notify({
        id: `notif_${Date.now()}`,
        type: 'info',
        message: `${current.name} played Reverse! Turn order reversed (${this.playDirection === 1 ? 'Clockwise ↻' : 'Counter-Clockwise ↺'}).`,
        playerId: current.id,
        timestamp: Date.now()
      });
      this.emitAction({
        type: 'reverse',
        playerId: current.id,
        playerName: current.name,
        card,
        message: `${current.name} reversed play direction!`
      });
    } else if (this.enableAnimationDelays && isSpecialChaosCard) {
      // Execute special card with animation delay: Totem hover (3.0s) plays first,
      // then mechanical state mutation applies at 3.0s, and turn advances at animDuration.
      this.executeSpecialCardWithAnimationDelay(current, card, _skipTargetPlayerId, animDuration);
      return;
    } else if (card.type === 'nuke') {
      this.applyNukeEffect(current, card);
    } else if (card.type === 'jester') {
      this.applyJesterEffect(current, card, _skipTargetPlayerId);
    } else if (card.type === 'plus_two' || card.type === 'plus_three') {
      const count = card.type === 'plus_three' ? 3 : 2;
      this.applyPlusCardsEffect(current, card, count, _skipTargetPlayerId);
    } else if (card.type === 'draw_two') {
      this.applyDrawTwoEffect(current, card);
    } else if (card.type === 'redo') {
      this.applyRedoEffect(current, card);
    } else if (card.type === 'time') {
      this.applyTimeEffect(current, card, _skipTargetPlayerId);
    } else if (card.type === 'number_eye') {
      this.applyNumberEyeEffect(current, card, _skipTargetPlayerId);
    } else if (card.type === 'color_eye') {
      this.applyColorEyeEffect(current, card, _skipTargetPlayerId);
    } else if (card.type === 'crack') {
      this.applyCrackEffect(current, card);
    } else if (card.type === 'status') {
      this.applyStatusEffect(current, card);
    } else if (card.type === 'luck') {
      this.applyLuckEffect(current, card);
    } else if (card.type === 'unlucky') {
      this.applyUnluckyEffect(current, card, _skipTargetPlayerId);
    } else if (card.type === 'double') {
      this.applyDoubleEffect(current, card, _skipTargetPlayerId);
    } else if (card.type === 'random') {
      this.applyRandomEffect(current, card, _skipTargetPlayerId);
    } else {
      this.notify({
        id: `notif_${Date.now()}`,
        type: 'info',
        message: `${current.name} discarded a card.`,
        playerId: current.id,
        timestamp: Date.now()
      });

      this.emitAction({
        type: 'discard',
        playerId: current.id,
        playerName: current.name,
        card
      });
    }

    // When Alternate Reality is active, every 2 turns triggers a dimension shift
    const triggersDimensionShift = Boolean(
      this.alternateDimensionActive &&
      this.alternateTurnCounter >= 1 &&
      (!shouldActivate || card.type === 'skip' || card.type === 'reverse')
    );

    if (triggersDimensionShift) {
      this.alternateTurnCounter = 0;

      if (this.enableAnimationDelays) {
        // 600ms discard animation + 1600ms dimension flip transition = 2200ms
        this.animationLockUntil = Date.now() + 2200;

        this.addPendingEffectTimeout(() => {
          if (this.status !== 'in_game') return;
          const targetIsAlternate = !this.isAlternateWorld;
          this.emitAction({
            type: 'alternate_shift',
            playerId: 'system',
            playerName: 'Dimension Rift',
            isAlternateWorld: targetIsAlternate,
            message: `Dimensional shift! Entering ${targetIsAlternate ? 'the Alternate Dimension' : 'the Main Dimension'}!`
          });

          // Under cover of pitch black at 380ms into flip:
          this.addPendingEffectTimeout(() => {
            if (this.status !== 'in_game') return;
            this.toggleDimension(false);
            this.onStateChange();
          }, 380);

          // Advance turn after 1600ms flip concludes:
          this.addPendingEffectTimeout(() => {
            if (this.status !== 'in_game') return;
            if (current.cards.length === 0) {
              this.endRound(current);
              return;
            }
            this.advanceTurn(0, true);
          }, 1600);
        }, 600);
        return;
      } else {
        this.toggleDimension(true);
        if (current.cards.length === 0) {
          this.endRound(current);
          return;
        }
        this.advanceTurn(0, true);
        return;
      }
    }

    if (current.cards.length === 0) {
      this.endRound(current);
      return;
    }

    this.advanceTurn(animDuration);
  }

  private applyNukeEffect(current: GamePlayerInternal, card: Card, randomChosenType?: CardType, skipEmitAction: boolean = false): void {
    const active = this.getActivePlayers();
    for (const player of active) {
      // Ultimate cards cannot be erased by Nuke
      const ultimateCards = player.cards.filter(c => isUltimateCard(c.type));
      const nonUltimateCards = player.cards.filter(c => !isUltimateCard(c.type));

      if (nonUltimateCards.length > 2) {
        const excess = nonUltimateCards.splice(2);
        for (const extraCard of excess) {
          this.discardPile.push(extraCard);
        }
      } else if (nonUltimateCards.length < 2) {
        while (nonUltimateCards.length < 2) {
          this.ensureDrawPileHasCards();
          if (this.drawPile.length > 0) {
            nonUltimateCards.push(this.drawPile.pop()!);
          } else {
            break;
          }
        }
      }

      player.cards = [...ultimateCards, ...nonUltimateCards];
      player.cardCount = player.cards.length;
      player.cards = sortCardsByValue(player.cards);
    }

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} detonated a NUKE! Everyone's hand is reduced to 2 cards! (Ultimate cards preserved)`,
      playerId: current.id,
      timestamp: Date.now()
    });

    if (!skipEmitAction) {
      this.emitAction({
        type: 'nuke',
        playerId: current.id,
        playerName: current.name,
        card,
        randomChosenType,
        message: `${current.name} detonated a NUKE! Everyone's hand was set to 2 cards!`
      });
    }
  }

  private applyJesterEffect(
    current: GamePlayerInternal,
    card: Card,
    skipTargetPlayerId?: string,
    randomChosenType?: CardType,
    skipEmitAction: boolean = false
  ): void {
    const active = this.getActivePlayers();
    let target = skipTargetPlayerId
      ? active.find(p => p.id === skipTargetPlayerId && p.id !== current.id)
      : undefined;

    if (!target) {
      const opponents = active.filter(p => p.id !== current.id);
      opponents.sort((a, b) => a.cards.length - b.cards.length);
      target = opponents[0];
    }

    if (target) {
      // Ultimate cards remain with their original owner when Jester swaps hands
      const currentUltimates = current.cards.filter(c => isUltimateCard(c.type));
      const currentOthers = current.cards.filter(c => !isUltimateCard(c.type));
      const targetUltimates = target.cards.filter(c => isUltimateCard(c.type));
      const targetOthers = target.cards.filter(c => !isUltimateCard(c.type));

      current.cards = [...currentUltimates, ...targetOthers];
      target.cards = [...targetUltimates, ...currentOthers];

      current.cardCount = current.cards.length;
      target.cardCount = target.cards.length;

      current.cards = sortCardsByValue(current.cards);
      target.cards = sortCardsByValue(target.cards);

      this.notify({
        id: `notif_${Date.now()}`,
        type: 'info',
        message: `${current.name} played Jester and swapped hands with ${target.name}! (Ultimate cards remained with owners)`,
        playerId: current.id,
        timestamp: Date.now()
      });

      if (!skipEmitAction) {
        this.emitAction({
          type: 'jester',
          playerId: current.id,
          playerName: current.name,
          targetPlayerId: target.id,
          card,
          randomChosenType,
          message: `${current.name} swapped hands with ${target.name}!`
        });
      }
    } else {
      if (!skipEmitAction) {
        this.emitAction({
          type: 'jester',
          playerId: current.id,
          playerName: current.name,
          card,
          randomChosenType,
          message: `${current.name} played Jester!`
        });
      }
    }
  }

  private applyPlusCardsEffect(
    current: GamePlayerInternal,
    card: Card,
    count: 2 | 3,
    skipTargetPlayerId?: string,
    randomChosenType?: CardType,
    skipEmitAction: boolean = false
  ): void {
    const active = this.getActivePlayers();
    let target = skipTargetPlayerId
      ? active.find(p => p.id === skipTargetPlayerId)
      : undefined;

    if (!target) {
      const nextIndex = (this.currentTurnIndex + this.playDirection + active.length) % active.length;
      target = active[nextIndex];
    }

    for (let i = 0; i < count; i++) {
      this.ensureDrawPileHasCards();
      if (this.drawPile.length > 0) {
        target.cards.push(this.drawPile.pop()!);
      }
    }
    target.cardCount = target.cards.length;
    target.cards = sortCardsByValue(target.cards);

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} played +${count} on ${target.name}!`,
      playerId: target.id,
      timestamp: Date.now()
    });

    if (!skipEmitAction) {
      this.emitAction({
        type: count === 3 ? 'plus_three' : 'plus_two',
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target.id,
        card,
        randomChosenType,
        message: `${current.name} gave +${count} cards to ${target.name}!`
      });
    }
  }

  private applyDrawTwoEffect(current: GamePlayerInternal, card: Card, skipEmitAction: boolean = false): void {
    const active = this.getActivePlayers();
    const nextIndex = (this.currentTurnIndex + this.playDirection + active.length) % active.length;
    const target = active[nextIndex];
    for (let i = 0; i < 2; i++) {
      this.ensureDrawPileHasCards();
      if (this.drawPile.length > 0) {
        target.cards.push(this.drawPile.pop()!);
      }
    }
    target.cardCount = target.cards.length;
    target.cards = sortCardsByValue(target.cards);
    target.isSkipped = true;

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} played Draw Two! ${target.name} draws 2 cards and is skipped.`,
      playerId: target.id,
      timestamp: Date.now()
    });

    if (!skipEmitAction) {
      this.emitAction({
        type: 'draw_two',
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target.id,
        card,
        message: `${current.name} played Draw Two on ${target.name}!`
      });
    }
  }

  private applyRedoEffect(current: GamePlayerInternal, card: Card, randomChosenType?: CardType, skipEmitAction: boolean = false): void {
    const freshDeck = createDeck(this.settings);
    const freshHand = freshDeck.slice(0, 10).map((c, idx) => ({
      ...c,
      id: `fresh_${c.type}_${Date.now()}_${idx}`
    }));
    current.cards = sortCardsByValue(freshHand);
    current.cardCount = current.cards.length;

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} played REDO! Hand replaced with 10 cards from a fresh deck!`,
      playerId: current.id,
      timestamp: Date.now()
    });

    if (!skipEmitAction) {
      this.emitAction({
        type: 'redo',
        playerId: current.id,
        playerName: current.name,
        card,
        randomChosenType,
        message: `${current.name} replaced their hand with 10 cards from a fresh deck!`
      });
    }
  }

  private applyTimeEffect(
    current: GamePlayerInternal,
    card: Card,
    skipTargetPlayerId?: string,
    randomChosenType?: CardType,
    skipEmitAction: boolean = false
  ): void {
    const active = this.getActivePlayers();
    const maxPhase = this.phaseDefinitions.length;
    let target = skipTargetPlayerId
      ? active.find(p => p.id === skipTargetPlayerId)
      : undefined;

    if (!target) {
      const eligibleOpponents = active.filter(p => p.id !== current.id && p.currentPhase > 1 && p.currentPhase < maxPhase);
      eligibleOpponents.sort((a, b) => b.currentPhase - a.currentPhase);
      if (eligibleOpponents.length > 0) {
        target = eligibleOpponents[0];
      }
    }

    if (!target) {
      throw new Error(`No eligible targets for Time card (target must be between Stage 2 and ${maxPhase - 1})`);
    }

    if (target.currentPhase <= 1 || target.currentPhase >= maxPhase) {
      throw new Error(`Cannot target a player on Stage 1 or Stage ${maxPhase} with Time card`);
    }

    const isRewind = Math.random() < 0.50;
    const oldPhase = target.currentPhase;
    const newPhase = isRewind ? oldPhase - 1 : oldPhase + 1;
    target.currentPhase = newPhase;

    if (target.phaseCompletedInRound) {
      target.phaseCompletedInRound = false;
      const returnedCards: Card[] = [];
      for (const group of target.laidDownPhases) {
        returnedCards.push(...group.cards);
      }
      this.allLaidDownPhases = this.allLaidDownPhases.filter(g => g.playerId !== target!.id);
      target.laidDownPhases = [];
      target.cards.push(...returnedCards);
      target.cards = sortCardsByValue(target.cards);
      target.cardCount = target.cards.length;
    }

    const rollResult: 'green' | 'red' = isRewind ? 'green' : 'red';

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: isRewind
        ? `${current.name} used TIME on ${target.name}! Rewound from Stage ${oldPhase} back to Stage ${newPhase}!`
        : `${current.name} used TIME on ${target.name}! Fast-forwarded from Stage ${oldPhase} to Stage ${newPhase}!`,
      playerId: current.id,
      timestamp: Date.now()
    });

    if (!skipEmitAction) {
      this.emitAction({
        type: 'time',
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target.id,
        card,
        randomChosenType,
        timeResult: rollResult,
        timeOldPhase: oldPhase,
        timeNewPhase: newPhase,
        message: isRewind
          ? `${current.name} rewound ${target.name} to Stage ${newPhase}!`
          : `${current.name} advanced ${target.name} to Stage ${newPhase}!`
      });
    }
  }

  private applyNumberEyeEffect(
    current: GamePlayerInternal,
    card: Card,
    skipTargetPlayerId?: string,
    randomChosenType?: CardType,
    skipEmitAction: boolean = false
  ): void {
    const active = this.getActivePlayers();
    let target = skipTargetPlayerId
      ? active.find(p => p.id === skipTargetPlayerId && p.id !== current.id)
      : undefined;

    if (!target) {
      const opponents = active.filter(p => p.id !== current.id);
      target = opponents[0];
    }

    if (!target) {
      throw new Error('No opponents available to target with Number Eye');
    }

    target.hasNumberEyeEffect = true;

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} played NUMBER EYE on ${target.name}! Their number cards are now question marks!`,
      playerId: current.id,
      timestamp: Date.now()
    });

    if (!skipEmitAction) {
      this.emitAction({
        type: 'number_eye',
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target.id,
        card,
        randomChosenType,
        message: `${current.name} obscured ${target.name}'s card numbers with question marks!`
      });
    }
  }

  private applyColorEyeEffect(
    current: GamePlayerInternal,
    card: Card,
    skipTargetPlayerId?: string,
    randomChosenType?: CardType,
    skipEmitAction: boolean = false
  ): void {
    const active = this.getActivePlayers();
    let target = skipTargetPlayerId
      ? active.find(p => p.id === skipTargetPlayerId && p.id !== current.id)
      : undefined;

    if (!target) {
      const opponents = active.filter(p => p.id !== current.id);
      target = opponents[0];
    }

    if (!target) {
      throw new Error('No opponents available to target with Color Eye');
    }

    target.hasColorEyeEffect = true;

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} played COLOR EYE on ${target.name}! Their cards are now grayscale!`,
      playerId: current.id,
      timestamp: Date.now()
    });

    if (!skipEmitAction) {
      this.emitAction({
        type: 'color_eye',
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target.id,
        card,
        randomChosenType,
        message: `${current.name} turned ${target.name}'s cards grayscale!`
      });
    }
  }

  private applyCrackEffect(
    current: GamePlayerInternal,
    card: Card,
    randomChosenType?: CardType,
    skipEmitAction: boolean = false
  ): void {
    const active = this.getActivePlayers();
    const opponents = active.filter(p => p.id !== current.id);

    for (const opp of opponents) {
      if (opp.cards.length === 0) continue;
      // Crack never targets ultimate cards
      const uncracked = opp.cards.filter(c => !c.isCracked && !isUltimateCard(c.type));
      if (uncracked.length === 0) continue;
      const targetCard = uncracked[Math.floor(Math.random() * uncracked.length)];
      targetCard.isCracked = true;
      opp.crackedCardCount = opp.cards.filter(c => c.isCracked).length;
    }

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} played CRACK! The table shook violently and a random card cracked in each opponent's hand!`,
      playerId: current.id,
      timestamp: Date.now()
    });

    if (!skipEmitAction) {
      this.emitAction({
        type: 'crack',
        playerId: current.id,
        playerName: current.name,
        card,
        randomChosenType,
        message: `${current.name} cracked opponents' cards with a ground-shaking tremor!`
      });
    }
  }

  private applyStatusEffect(
    current: GamePlayerInternal,
    card: Card,
    randomChosenType?: CardType,
    skipEmitAction: boolean = false
  ): void {
    current.hasNumberEyeEffect = false;
    current.hasColorEyeEffect = false;
    current.hasLuck = false;
    current.hasUnlucky = false;
    current.hasDoubleDebuff = false;
    for (const c of current.cards) {
      c.isCracked = false;
    }
    current.crackedCardCount = 0;

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} played STATUS! All positive and negative status effects were purged!`,
      playerId: current.id,
      timestamp: Date.now()
    });

    if (!skipEmitAction) {
      this.emitAction({
        type: 'status',
        playerId: current.id,
        playerName: current.name,
        card,
        randomChosenType,
        message: `${current.name} cleansed all active buffs and debuffs!`
      });
    }
  }

  private applyLuckEffect(
    current: GamePlayerInternal,
    card: Card,
    randomChosenType?: CardType,
    skipEmitAction: boolean = false
  ): void {
    current.hasLuck = true;

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} gained LUCK! 2x chance to draw wilds, reverses, skips, and specials for the rest of the round!`,
      playerId: current.id,
      timestamp: Date.now()
    });

    if (!skipEmitAction) {
      this.emitAction({
        type: 'luck',
        playerId: current.id,
        playerName: current.name,
        card,
        randomChosenType,
        message: `${current.name} gained 2x Luck for card draws!`
      });
    }
  }

  private applyUnluckyEffect(
    current: GamePlayerInternal,
    card: Card,
    skipTargetPlayerId?: string,
    randomChosenType?: CardType,
    skipEmitAction: boolean = false
  ): void {
    const active = this.getActivePlayers();
    let target = skipTargetPlayerId
      ? active.find(p => p.id === skipTargetPlayerId)
      : undefined;

    if (!target) {
      const opponents = active.filter(p => p.id !== current.id);
      target = opponents.length > 0 ? opponents[0] : current;
    }

    target.hasUnlucky = true;

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} cursed ${target.name} with BAD LUCK! Chance of drawing special/wild cards halved!`,
      playerId: target.id,
      timestamp: Date.now()
    });

    if (!skipEmitAction) {
      this.emitAction({
        type: 'unlucky',
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target.id,
        card,
        randomChosenType,
        message: `${current.name} gave Bad Luck to ${target.name}!`
      });
    }
  }

  private applyDoubleEffect(
    current: GamePlayerInternal,
    card: Card,
    skipTargetPlayerId?: string,
    randomChosenType?: CardType,
    skipEmitAction: boolean = false
  ): void {
    const active = this.getActivePlayers();
    let target = skipTargetPlayerId
      ? active.find(p => p.id === skipTargetPlayerId)
      : undefined;

    if (!target) {
      const opponents = active.filter(p => p.id !== current.id);
      target = opponents.length > 0 ? opponents[0] : current;
    }

    target.hasDoubleDebuff = true;

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} played DOUBLE on ${target.name}! If they complete this Stage, they must repeat it again!`,
      playerId: target.id,
      timestamp: Date.now()
    });

    if (!skipEmitAction) {
      this.emitAction({
        type: 'double',
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target.id,
        card,
        randomChosenType,
        message: `${current.name} cursed ${target.name} with Repeat Stage (Double)!`
      });
    }
  }

  private applyRandomEffect(
    current: GamePlayerInternal,
    card: Card,
    skipTargetPlayerId?: string,
    skipEmitAction: boolean = false
  ): void {
    const active = this.getActivePlayers();
    const opponents = active.filter(p => p.id !== current.id);
    const maxPhase = this.phaseDefinitions.length;
    const eligibleTimeTargets = opponents.filter(p => p.currentPhase > 1 && p.currentPhase < maxPhase);

    const possibleAbilities: CardType[] = ['redo', 'luck', 'status'];
    if (current.phaseCompletedInRound) {
      possibleAbilities.push('nuke');
    }
    if (opponents.length > 0) {
      possibleAbilities.push('jester', 'plus_two', 'plus_three', 'number_eye', 'color_eye', 'crack', 'unlucky', 'double');
      if (eligibleTimeTargets.length > 0) {
        possibleAbilities.push('time');
      }
    }

    const chosen = possibleAbilities[Math.floor(Math.random() * possibleAbilities.length)];

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} played RANDOM and rolled: ${chosen.toUpperCase().replace(/_/g, ' ')}!`,
      playerId: current.id,
      timestamp: Date.now()
    });

    if (chosen === 'nuke') {
      this.applyNukeEffect(current, card, chosen, skipEmitAction);
    } else if (chosen === 'jester') {
      this.applyJesterEffect(current, card, skipTargetPlayerId, chosen, skipEmitAction);
    } else if (chosen === 'plus_two') {
      this.applyPlusCardsEffect(current, card, 2, skipTargetPlayerId, chosen, skipEmitAction);
    } else if (chosen === 'plus_three') {
      this.applyPlusCardsEffect(current, card, 3, skipTargetPlayerId, chosen, skipEmitAction);
    } else if (chosen === 'redo') {
      this.applyRedoEffect(current, card, chosen, skipEmitAction);
    } else if (chosen === 'time') {
      this.applyTimeEffect(current, card, skipTargetPlayerId, chosen, skipEmitAction);
    } else if (chosen === 'number_eye') {
      this.applyNumberEyeEffect(current, card, skipTargetPlayerId, chosen, skipEmitAction);
    } else if (chosen === 'color_eye') {
      this.applyColorEyeEffect(current, card, skipTargetPlayerId, chosen, skipEmitAction);
    } else if (chosen === 'crack') {
      this.applyCrackEffect(current, card, chosen, skipEmitAction);
    } else if (chosen === 'status') {
      this.applyStatusEffect(current, card, chosen, skipEmitAction);
    } else if (chosen === 'luck') {
      this.applyLuckEffect(current, card, chosen, skipEmitAction);
    } else if (chosen === 'unlucky') {
      this.applyUnluckyEffect(current, card, skipTargetPlayerId, chosen, skipEmitAction);
    } else if (chosen === 'double') {
      this.applyDoubleEffect(current, card, skipTargetPlayerId, chosen, skipEmitAction);
    }
  }

  private executeSpecialCardWithAnimationDelay(
    current: GamePlayerInternal,
    card: Card,
    skipTargetPlayerId: string | undefined,
    animDuration: number
  ): void {
    // 1. Emit action event at t = 0 so clients launch 3.0s Totem hover
    const active = this.getActivePlayers();
    let target = skipTargetPlayerId
      ? active.find(p => p.id === skipTargetPlayerId && (card.type === 'time' || card.type === 'plus_two' || card.type === 'plus_three' || p.id !== current.id))
      : undefined;

    if (!target) {
      const opponents = active.filter(p => p.id !== current.id);
      opponents.sort((a, b) => a.cards.length - b.cards.length);
      target = opponents[0];
    }

    if (card.type === 'nuke') {
      this.emitAction({
        type: 'nuke',
        playerId: current.id,
        playerName: current.name,
        card,
        message: `${current.name} detonated a NUKE!`
      });
    } else if (card.type === 'jester') {
      this.emitAction({
        type: 'jester',
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target?.id,
        card,
        message: `${current.name} played Jester on ${target?.name || 'an opponent'}!`
      });
    } else if (card.type === 'plus_two' || card.type === 'plus_three') {
      this.emitAction({
        type: card.type,
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target?.id,
        card,
        message: `${current.name} played ${card.type.toUpperCase()} on ${target?.name || 'an opponent'}!`
      });
    } else if (card.type === 'redo') {
      this.emitAction({
        type: 'redo',
        playerId: current.id,
        playerName: current.name,
        card,
        message: `${current.name} played REDO!`
      });
    } else if (card.type === 'time') {
      const rollResult = Math.random() < 0.5 ? 'green' : 'red';
      const isRewind = rollResult === 'green';
      const oldPhase = target?.currentPhase ?? 2;
      const newPhase = isRewind ? Math.max(1, oldPhase - 1) : Math.min(this.phaseDefinitions.length, oldPhase + 1);
      this.emitAction({
        type: 'time',
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target?.id,
        card,
        timeResult: rollResult,
        timeOldPhase: oldPhase,
        timeNewPhase: newPhase,
        message: `${current.name} used TIME on ${target?.name || 'an opponent'}!`
      });
    } else if (card.type === 'crack') {
      this.emitAction({
        type: 'crack',
        playerId: current.id,
        playerName: current.name,
        card,
        message: `${current.name} played CRACK!`
      });
    } else if (card.type === 'status') {
      this.emitAction({
        type: 'status',
        playerId: current.id,
        playerName: current.name,
        card,
        message: `${current.name} played STATUS CLEAR!`
      });
    } else if (card.type === 'luck') {
      this.emitAction({
        type: 'luck',
        playerId: current.id,
        playerName: current.name,
        card,
        message: `${current.name} gained LUCK!`
      });
    } else if (card.type === 'unlucky') {
      this.emitAction({
        type: 'unlucky',
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target?.id,
        card,
        message: `${current.name} played UNLUCKY on ${target?.name || 'an opponent'}!`
      });
    } else if (card.type === 'double') {
      this.emitAction({
        type: 'double',
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target?.id,
        card,
        message: `${current.name} played DOUBLE on ${target?.name || 'an opponent'}!`
      });
    } else if (card.type === 'random') {
      const allowed = ['nuke', 'jester', 'plus_two', 'plus_three', 'redo', 'time', 'crack', 'status', 'luck', 'unlucky', 'double'];
      const chosen = allowed[Math.floor(Math.random() * allowed.length)] as CardType;
      this.emitAction({
        type: chosen as any,
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target?.id,
        card,
        randomChosenType: chosen,
        message: `${current.name} played RANDOM: ${chosen.toUpperCase()} triggered!`
      });
    } else if (card.type === 'number_eye' || card.type === 'color_eye') {
      this.emitAction({
        type: card.type,
        playerId: current.id,
        playerName: current.name,
        targetPlayerId: target?.id,
        card,
        message: `${current.name} used ${card.type === 'number_eye' ? 'NUMBER EYE' : 'COLOR EYE'} on ${target?.name || 'an opponent'}!`
      });
    } else {
      this.emitAction({
        type: card.type as any,
        playerId: current.id,
        playerName: current.name,
        card,
        message: `${current.name} played ${card.type.toUpperCase()}!`
      });
    }

    // 2. Schedule mechanical state mutation at the exact moment its animation completes
    // Card mutations occur when visual impact lands, passing skipEmitAction: true
    let effectDelay = 3000;
    if (card.type === 'nuke') effectDelay = 8000;
    else if (card.type === 'time') effectDelay = 8200;
    else if (card.type === 'crack') effectDelay = 5000;
    else if (card.type === 'number_eye' || card.type === 'color_eye') effectDelay = 6000;
    else if (card.type === 'plus_two') effectDelay = 4400;
    else if (card.type === 'plus_three') effectDelay = 5100;
    else if (card.type === 'jester') effectDelay = 4250;

    this.addPendingEffectTimeout(() => {
      if (this.status !== 'in_game') return;

      if (card.type === 'nuke') {
        this.applyNukeEffect(current, card, undefined, true);
      } else if (card.type === 'jester') {
        this.applyJesterEffect(current, card, skipTargetPlayerId, undefined, true);
      } else if (card.type === 'plus_two' || card.type === 'plus_three') {
        const count = card.type === 'plus_three' ? 3 : 2;
        this.applyPlusCardsEffect(current, card, count, skipTargetPlayerId, undefined, true);
      } else if (card.type === 'draw_two') {
        this.applyDrawTwoEffect(current, card, true);
      } else if (card.type === 'redo') {
        this.applyRedoEffect(current, card, undefined, true);
      } else if (card.type === 'time') {
        this.applyTimeEffect(current, card, skipTargetPlayerId, undefined, true);
      } else if (card.type === 'number_eye') {
        this.applyNumberEyeEffect(current, card, skipTargetPlayerId, undefined, true);
      } else if (card.type === 'color_eye') {
        this.applyColorEyeEffect(current, card, skipTargetPlayerId, undefined, true);
      } else if (card.type === 'crack') {
        this.applyCrackEffect(current, card, undefined, true);
      } else if (card.type === 'status') {
        this.applyStatusEffect(current, card, undefined, true);
      } else if (card.type === 'luck') {
        this.applyLuckEffect(current, card, undefined, true);
      } else if (card.type === 'unlucky') {
        this.applyUnluckyEffect(current, card, skipTargetPlayerId, undefined, true);
      } else if (card.type === 'double') {
        this.applyDoubleEffect(current, card, skipTargetPlayerId, undefined, true);
      } else if (card.type === 'random') {
        this.applyRandomEffect(current, card, skipTargetPlayerId, true);
      }

      this.onStateChange();
    }, effectDelay);

    // 3. Advance turn after full animation concludes and push card to discard pile
    this.addPendingEffectTimeout(() => {
      if (this.status !== 'in_game') return;
      this.discardPile.push(card);
      this.onStateChange();

      if (current.cards.length === 0) {
        this.endRound(current);
        return;
      }

      if (this.alternateDimensionActive && this.alternateTurnCounter >= 1) {
        this.alternateTurnCounter = 0;
        this.animationLockUntil = Date.now() + 1600;

        const targetIsAlternate = !this.isAlternateWorld;
        this.emitAction({
          type: 'alternate_shift',
          playerId: 'system',
          playerName: 'Dimension Rift',
          isAlternateWorld: targetIsAlternate,
          message: `Dimensional shift! Entering ${targetIsAlternate ? 'the Alternate Dimension' : 'the Main Dimension'}!`
        });

        // Under cover of pitch black at 380ms into flip:
        this.addPendingEffectTimeout(() => {
          if (this.status !== 'in_game') return;
          this.toggleDimension(false);
          this.onStateChange();
        }, 380);

        // Advance turn after 1600ms flip concludes:
        this.addPendingEffectTimeout(() => {
          if (this.status !== 'in_game') return;
          if (current.cards.length === 0) {
            this.endRound(current);
            return;
          }
          this.advanceTurn(0, true);
        }, 1600);
        return;
      }

      this.advanceTurn();
    }, animDuration);
  }

  private advanceTurn(animationDuration: number = 0, skipDimensionIncrement: boolean = false): void {
    const active = this.getActivePlayers();
    if (active.length === 0) return;

    if (this.alternateDimensionActive && !skipDimensionIncrement) {
      this.alternateTurnCounter++;
      if (this.alternateTurnCounter >= 2) {
        this.alternateTurnCounter = 0;
        if (animationDuration > 0) {
          // Bug 2 fix: Delay world switch until card animation finishes in current verse!
          setTimeout(() => {
            if (this.status === 'in_game') {
              this.toggleDimension();
            }
          }, animationDuration);
        } else {
          this.toggleDimension();
        }
      }
    }

    this.currentTurnIndex = (this.currentTurnIndex + this.playDirection + active.length) % active.length;
    this.startTurn();
  }

  private endRound(roundWinner?: GamePlayerInternal): void {
    this.clearPendingEffectTimeouts();
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = undefined;
    }

    if (this.isAlternateWorld && this.mainWorldState) {
      this.toggleDimension(false);
    }
    this.alternateDimensionActive = false;
    this.alternateTurnCounter = 0;

    this.status = 'round_end';
    this.roundWinnerId = roundWinner ? roundWinner.id : undefined;

    const maxPhase = this.phaseDefinitions.length;
    for (const player of this.getActivePlayers()) {
      if (!roundWinner || player.id !== roundWinner.id) {
        const handPoints = player.cards.reduce((sum, c) => sum + c.points, 0);
        player.score += handPoints;
      }

      if (player.phaseCompletedInRound) {
        if (player.hasDoubleDebuff) {
          player.hasDoubleDebuff = false;
          this.notify({
            id: `notif_${Date.now()}`,
            type: 'info',
            message: `${player.name} had Double active! They must repeat Stage ${player.currentPhase} again next round!`,
            playerId: player.id,
            timestamp: Date.now()
          });
        } else if (player.currentPhase >= maxPhase) {
          player.completedAllPhases = true;
          player.currentPhase = maxPhase;
        } else {
          player.currentPhase += 1;
        }
      }
    }

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'round_end',
      message: roundWinner
        ? `${roundWinner.name} went out. Round ${this.roundNumber} ended.`
        : `All players resigned. Round ${this.roundNumber} ended.`,
      playerId: roundWinner ? roundWinner.id : undefined,
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
        message: `${gameWinner.name} has completed all ${maxPhase} stages and won the game!`,
        playerId: gameWinner.id,
        timestamp: Date.now()
      });
    }

    this.onStateChange();

    // If the game is round_end and there is no human host (or host is a bot), auto advance to next round
    if (this.status === 'round_end') {
      const hasHumanHost = this.players.some(p => p.isHost && !p.isBot && p.connected);
      if (!hasHumanHost) {
        if (this.roundEndAutoTimeout) {
          clearTimeout(this.roundEndAutoTimeout);
        }
        this.roundEndAutoTimeout = setTimeout(() => {
          if (this.status === 'round_end') {
            this.nextRound();
          }
        }, 8000);
        this.roundEndAutoTimeout.unref?.();
      }
    }
  }

  public restartGame(): void {
    if (this.roundEndAutoTimeout) {
      clearTimeout(this.roundEndAutoTimeout);
      this.roundEndAutoTimeout = undefined;
    }
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
      player.hasLuck = false;
      player.hasUnlucky = false;
      player.hasDoubleDebuff = false;
      player.crackedCardCount = 0;
    }

    this.startRound();
  }

  public nextRound(): void {
    if (this.roundEndAutoTimeout) {
      clearTimeout(this.roundEndAutoTimeout);
      this.roundEndAutoTimeout = undefined;
    }
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
        if (this.isAlternateWorld) {
          this.drawPile = createAlternateDeck(`alt_res_${Date.now()}_`);
        } else {
          this.drawPile = createDeck(this.settings, `r${this.roundNumber}_res_${Date.now()}_`);
        }
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

  public getPublicState(requestingPlayerId?: string): PublicGameState {
    const active = this.getActivePlayers();
    const current = active.length > 0 ? active[this.currentTurnIndex % active.length] : null;

    const isVoyanceCaster = Boolean(
      requestingPlayerId &&
      (this.voyanceCasterIds.includes(requestingPlayerId) ||
        this.players.some(p => (p.id === requestingPlayerId || p.secretToken === requestingPlayerId) &&
          (this.voyanceCasterIds.includes(p.id) || this.voyanceCasterIds.includes(p.secretToken))))
    );

    return {
      roomCode: this.roomCode,
      status: this.status,
      roundNumber: this.roundNumber,
      currentTurnPlayerId: current ? current.id : '',
      playDirection: this.playDirection,
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
        isSkipped: p.isSkipped,
        isResigned: p.isResigned,
        hasNumberEyeEffect: p.hasNumberEyeEffect,
        hasColorEyeEffect: p.hasColorEyeEffect,
        hasLuck: p.hasLuck,
        hasUnlucky: p.hasUnlucky,
        hasDoubleDebuff: p.hasDoubleDebuff,
        hasVoyanceDebuff: p.hasVoyanceDebuff,
        crackedCardCount: p.cards.filter(c => c.isCracked).length,
        visibleCards: (isVoyanceCaster && p.id !== requestingPlayerId && p.secretToken !== requestingPlayerId) ? p.cards : undefined
      })),
      allLaidDownPhases: this.allLaidDownPhases,
      winnerId: this.winnerId,
      roundWinnerId: this.roundWinnerId,
      phaseDefinitions: this.phaseDefinitions,
      settings: this.settings,
      isAlternateWorld: this.isAlternateWorld,
      alternateDimensionActive: this.alternateDimensionActive,
      voyanceActive: this.voyanceCasterIds.length > 0,
      alternateTurnCounter: this.alternateTurnCounter,
      animationLockUntil: this.animationLockUntil
    };
  }

  public getPlayerHand(playerId: string): Card[] {
    const p = this.players.find(pl => pl.id === playerId);
    return p ? p.cards : [];
  }

  private botActionTimeout?: NodeJS.Timeout;
  private roundEndAutoTimeout?: NodeJS.Timeout;

  public setHost(newHostSecretToken: string): void {
    for (const player of this.players) {
      player.isHost = (player.secretToken === newHostSecretToken || player.id === newHostSecretToken);
    }
    this.onStateChange();
  }

  public scheduleBotTurn(bot: GamePlayerInternal): void {
    if (this.botActionTimeout) {
      clearTimeout(this.botActionTimeout);
      this.botActionTimeout = undefined;
    }

    const remainingAnim = Math.max(0, this.animationLockUntil - Date.now());
    const delay = remainingAnim + 1200;

    this.botActionTimeout = setTimeout(() => {
      if (this.status !== 'in_game') return;
      const current = this.getCurrentPlayer();
      if (current && current.id === bot.id && (current.isBot || !current.connected)) {
        this.takeTurnForBot(current);
      }
    }, delay);
    this.botActionTimeout.unref?.();
  }

  public executeBotTurn(bot: GamePlayerInternal): void {
    this.takeTurnForBot(bot);
  }

  public takeTurnForBot(bot: GamePlayerInternal): void {
    if (this.status !== 'in_game') return;
    if (this.isAnimationLocked()) {
      this.scheduleBotTurn(bot);
      return;
    }
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

    // 2. Play Stage if not yet completed (exclude cracked cards)
    if (!bot.phaseCompletedInRound && phaseDef) {
      const uncrackedCards = bot.cards.filter(c => !c.isCracked);
      const combination = findValidPhaseCombination(uncrackedCards, phaseDef);
      if (combination) {
        try {
          this.layDownPhase(bot.id, combination);
        } catch (e) {}
      }
    }

    // 3. Play extra melds and hit onto table groups if stage is made
    if (bot.phaseCompletedInRound && phaseDef) {
      if (this.settings.allowPartialAndExtraSets) {
        const uncrackedCards = bot.cards.filter(c => !c.isCracked);
        const extra = findExtraMeldMatch(uncrackedCards, phaseDef);
        if (extra && extra.cards.length > 0) {
          try {
            this.layExtraGroup(bot.id, extra.cards.map(c => c.id));
          } catch (e) {}
        }
      }

      if (bot.cards.length > 0) {
        for (const group of this.allLaidDownPhases) {
          if (bot.cards.length === 0) break;
          const candidateCards = bot.cards.filter(c => !c.isCracked);
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
      const opponents = this.getActivePlayers().filter(p => p.id !== bot.id);
      const maxPhase = this.phaseDefinitions.length;
      const eligibleTimeTargets = opponents.filter(p => p.currentPhase > 1 && p.currentPhase < maxPhase);
      const isLastCardToWin = bot.cards.length === 1 && Boolean(bot.phaseCompletedInRound);

      const eligibleCards = bot.cards.filter(c => {
        if (c.isCracked && !isLastCardToWin) return false;
        if (c.type === 'skip') return false;
        if (c.type === 'nuke' && !bot.phaseCompletedInRound) return false;
        if (c.type === 'time' && eligibleTimeTargets.length === 0 && (bot.currentPhase <= 1 || bot.currentPhase >= maxPhase)) return false;
        return true;
      });
      const cardToDiscard = eligibleCards.length > 0
        ? eligibleCards.sort((a, b) => b.points - a.points)[0]
        : (bot.cards.find(c => {
            if (c.isCracked && !isLastCardToWin) return false;
            if (c.type === 'nuke' && !bot.phaseCompletedInRound) return false;
            if (c.type === 'time' && eligibleTimeTargets.length === 0) return false;
            return true;
          }) || (isLastCardToWin ? bot.cards[0] : bot.cards.find(c => !c.isCracked) || bot.cards[0]));

      let targetPlayerId: string | undefined;
      if (cardToDiscard && cardToDiscard.type === 'jester') {
        if (opponents.length > 0) {
          opponents.sort((a, b) => a.cards.length - b.cards.length);
          targetPlayerId = opponents[0].id;
        }
      } else if (cardToDiscard && cardToDiscard.type === 'time') {
        if (eligibleTimeTargets.length > 0) {
          eligibleTimeTargets.sort((a, b) => b.currentPhase - a.currentPhase);
          targetPlayerId = eligibleTimeTargets[0].id;
        } else if (bot.currentPhase > 1 && bot.currentPhase < maxPhase) {
          targetPlayerId = bot.id;
        }
      } else if (cardToDiscard && (cardToDiscard.type === 'unlucky' || cardToDiscard.type === 'double')) {
        if (opponents.length > 0) {
          opponents.sort((a, b) => b.currentPhase - a.currentPhase);
          targetPlayerId = opponents[0].id;
        }
      }

      try {
        if (cardToDiscard) {
          const canUseAbility =
            (cardToDiscard.type !== 'nuke' || bot.phaseCompletedInRound) &&
            (cardToDiscard.type !== 'time' || eligibleTimeTargets.length > 0 || (bot.currentPhase > 1 && bot.currentPhase < maxPhase));
          this.discardCard(bot.id, cardToDiscard.id, targetPlayerId, canUseAbility);
        }
      } catch (e) {
        const fallback = bot.cards.find(c => !c.isCracked || isLastCardToWin) || bot.cards[0];
        if (fallback) {
          try {
            this.discardCard(bot.id, fallback.id, undefined, false);
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

    if (player.isHost) {
      player.isHost = false;
      const nextHuman = this.players.find(p => !p.isBot && p.connected);
      if (nextHuman) {
        nextHuman.isHost = true;
      }
    }

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

    if (!this.players.some(p => p.isHost && p.connected && !p.isBot)) {
      player.isHost = true;
    }

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

  public resignPlayer(secretTokenOrId: string): void {
    const player = this.players.find(p => p.secretToken === secretTokenOrId || p.id === secretTokenOrId);
    if (!player || player.isSpectator || player.isResigned) return;

    player.isResigned = true;

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${player.name} resigned for this round. Turns will be skipped until next round.`,
      playerId: player.id,
      timestamp: Date.now()
    });

    const active = this.getActivePlayers();
    const nonResigned = active.filter(p => !p.isResigned);
    if (nonResigned.length === 0) {
      this.endRound();
      return;
    }

    const current = this.getCurrentPlayer();
    if (current && current.id === player.id) {
      if (this.turnTimerInterval) {
        clearInterval(this.turnTimerInterval);
        this.turnTimerInterval = undefined;
      }
      this.advanceTurn();
    } else {
      this.onStateChange();
    }
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

  public adminSpawnCard(playerId: string, cardName: string, password: string): Card {
    if (password !== '3115') {
      throw new Error('Invalid admin password');
    }

    const player = this.players.find(p => p.id === playerId || p.secretToken === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const cleanName = cardName.trim().toLowerCase().replace(/\.(png|webp)$/i, '');
    let spawnedCard: Card | null = null;
    const id = `card_admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (cleanName === 'wild') {
      spawnedCard = { id, type: 'wild', color: 'none', value: 0, points: 25 };
    } else if (cleanName === 'skip') {
      spawnedCard = { id, type: 'skip', color: 'none', value: 0, points: 15 };
    } else if (cleanName === 'reverse') {
      spawnedCard = { id, type: 'reverse', color: 'none', value: 0, points: 15 };
    } else {
      const special = CHAOS_SPECIAL_CARDS.find(s => s.type === cleanName);
      if (special) {
        spawnedCard = { id, type: special.type, color: 'none', value: 0, points: special.points };
      } else {
        const ultimate = CHAOS_ULTIMATE_CARDS.find(u => u.type === cleanName);
        if (ultimate) {
          spawnedCard = {
            id,
            type: ultimate.type,
            color: 'none',
            value: 0,
            points: ultimate.points,
            ultimateProgress: 100
          };
        } else {
          const numMatch = cleanName.match(/^(red|blue|green|yellow)_(\d+)$/i);
          if (numMatch) {
            const color = numMatch[1].toLowerCase() as CardColor;
            const val = parseInt(numMatch[2], 10);
            if (val >= 1 && val <= 12) {
              spawnedCard = {
                id,
                type: 'number',
                color,
                value: val,
                points: val <= 9 ? 5 : 10
              };
            }
          }
        }
      }
    }

    if (!spawnedCard) {
      throw new Error(
        `Unknown card name: "${cleanName}". Allowed: wild, skip, reverse, nuke, jester, plus_two, plus_three, redo, time, number_eye, color_eye, random, crack, status, luck, unlucky, double, singularity, voyance, alternate, avarice, or <color>_<1-12>`
      );
    }

    player.cards.push(spawnedCard);
    player.cardCount = player.cards.length;
    player.cards = sortCardsByValue(player.cards);

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `Admin spawned a ${spawnedCard.type.toUpperCase()} card into ${player.name}'s hand.`,
      playerId: player.id,
      timestamp: Date.now()
    });

    this.onStateChange();
    return spawnedCard;
  }

  public sacrificeCard(playerId: string, cardIdToSacrifice: string, ultimateCardId: string): void {
    const player = this.players.find(p => p.id === playerId || p.secretToken === playerId);
    if (player?.isResigned) throw new Error('Player has resigned this round');
    const current = this.getCurrentPlayer();
    if (current.id !== playerId && current.secretToken !== playerId) throw new Error('Not your turn');
    if (this.turnStage !== 'play' && this.turnStage !== 'discard') {
      throw new Error('Can only sacrifice when discarding at the end of your turn');
    }

    const ultIndex = current.cards.findIndex(c => c.id === ultimateCardId);
    if (ultIndex === -1) throw new Error('Ultimate card not found in hand');
    const ultimateCard = current.cards[ultIndex];
    if (!isUltimateCard(ultimateCard.type)) throw new Error('Target card is not an ultimate card');
    if ((ultimateCard.ultimateProgress ?? 0) >= 100) throw new Error('Ultimate card is already fully charged');

    const sacIndex = current.cards.findIndex(c => c.id === cardIdToSacrifice);
    if (sacIndex === -1) throw new Error('Card to sacrifice not found in hand');
    const sacCard = current.cards[sacIndex];

    const isSpecial = isChaosSpecialCard(sacCard.type);
    const isWildSkipRev = sacCard.type === 'wild' || sacCard.type === 'skip' || sacCard.type === 'reverse';

    if (!isSpecial && !isWildSkipRev) {
      throw new Error('Can only sacrifice a Special card or a Wild/Skip/Reverse card');
    }

    if (isSpecial) {
      if (ultimateCard.sacrificedSpecial) {
        throw new Error('This ultimate card has already absorbed a Special card');
      }
      ultimateCard.sacrificedSpecial = true;
    } else if (isWildSkipRev) {
      if (ultimateCard.sacrificedWildSkipReverse) {
        throw new Error('This ultimate card has already absorbed a Wild/Skip/Reverse card');
      }
      ultimateCard.sacrificedWildSkipReverse = true;
    }

    if (ultimateCard.sacrificedSpecial && ultimateCard.sacrificedWildSkipReverse) {
      ultimateCard.ultimateProgress = 100;
    } else {
      ultimateCard.ultimateProgress = 50;
    }

    // Remove sacrificed card from hand and move to discard pile
    current.cards.splice(sacIndex, 1);
    current.cardCount = current.cards.length;
    this.discardPile.push(sacCard);

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} sacrificed ${sacCard.type.toUpperCase()} to charge ${ultimateCard.type.toUpperCase()} (${ultimateCard.ultimateProgress}%)!`,
      playerId: current.id,
      timestamp: Date.now()
    });

    this.emitAction({
      type: 'sacrifice',
      playerId: current.id,
      playerName: current.name,
      sacrificedCard: sacCard,
      targetUltimateCard: ultimateCard,
      message: `${current.name} sacrificed ${sacCard.type} to charge ${ultimateCard.type} (${ultimateCard.ultimateProgress}%)!`
    });

    if (current.cards.length === 0) {
      this.endRound(current);
      return;
    }

    this.advanceTurn();
  }

  public playUltimateCard(playerId: string, ultimateCardId: string): void {
    if (this.enableAnimationDelays && this.isAnimationLocked()) {
      throw new Error('Turn is locked while animation is playing');
    }
    const player = this.players.find(p => p.id === playerId || p.secretToken === playerId);
    if (player?.isResigned) throw new Error('Player has resigned this round');
    const current = this.getCurrentPlayer();
    if (current.id !== playerId && current.secretToken !== playerId) throw new Error('Not your turn');

    const ultIndex = current.cards.findIndex(c => c.id === ultimateCardId);
    if (ultIndex === -1) throw new Error('Ultimate card not in hand');
    const ultimateCard = current.cards[ultIndex];
    if (!isUltimateCard(ultimateCard.type)) throw new Error('Card is not an ultimate card');
    if ((ultimateCard.ultimateProgress ?? 0) < 100) {
      throw new Error('Ultimate card is not fully charged (requires 100% charge)');
    }

    // Remove ultimate card from hand; defer placement on discard pile until animation finishes
    current.cards.splice(ultIndex, 1);
    current.cardCount = current.cards.length;
    if (!this.enableAnimationDelays) {
      this.discardPile.push(ultimateCard);
    }

    // Universal divine descent action event
    this.emitAction({
      type: 'ultimate_descend',
      playerId: current.id,
      playerName: current.name,
      card: ultimateCard,
      ultimateCardType: ultimateCard.type as UltimateCardType,
      message: `${current.name} invoked ${ultimateCard.type.toUpperCase()}! God rays illuminate the heavens as the ultimate card descends!`
    });

    this.notify({
      id: `notif_${Date.now()}`,
      type: 'info',
      message: `${current.name} activated ULTIMATE: ${ultimateCard.type.toUpperCase()}!`,
      playerId: current.id,
      timestamp: Date.now()
    });

    const animDuration = this.getCardAnimationDuration(ultimateCard, true);
    this.animationLockUntil = Date.now() + animDuration;

    if (this.enableAnimationDelays) {
      if (ultimateCard.type === 'alternate') {
        // Wait for 6.0s Divine Descent to finish, then trigger the 180deg dimension flip:
        this.addPendingEffectTimeout(() => {
          if (this.status !== 'in_game') return;
          this.emitAction({
            type: 'ultimate_alternate',
            playerId: current.id,
            playerName: current.name,
            card: ultimateCard,
            ultimateCardType: 'alternate',
            isAlternateWorld: true,
            message: `Reality shifted! Entered the Alternate World with 10 pure number cards!`
          });

          // Under cover of pitch black at 380ms into the flip, switch world:
          this.addPendingEffectTimeout(() => {
            if (this.status !== 'in_game') return;
            this.applyAlternateEffect(current, ultimateCard, false);
            this.onStateChange();
          }, 380);

          // Advance turn after the full 1600ms flip transition concludes:
          this.addPendingEffectTimeout(() => {
            if (this.status !== 'in_game') return;
            this.discardPile.push(ultimateCard);
            this.onStateChange();
            if (current.cards.length === 0) {
              this.endRound(current);
              return;
            }
            this.advanceTurn();
          }, 1600);
        }, 6000);
      } else {
        // Singularity, Voyance, Avarice: Execute effect at 6.0s when Divine Descent finishes
        this.addPendingEffectTimeout(() => {
          if (this.status !== 'in_game') return;
          this.discardPile.push(ultimateCard);
          if (ultimateCard.type === 'singularity') {
            this.applySingularityEffect(current, ultimateCard);
          } else if (ultimateCard.type === 'voyance') {
            this.applyVoyanceEffect(current, ultimateCard, true);
          } else if (ultimateCard.type === 'avarice') {
            this.applyAvariceEffect(current, ultimateCard);
          }
          this.onStateChange();

          if (current.cards.length === 0) {
            this.endRound(current);
            return;
          }
          this.advanceTurn();
        }, 6000);
      }
    } else {
      // Synchronous execution for test suites
      if (ultimateCard.type === 'singularity') {
        this.applySingularityEffect(current, ultimateCard);
      } else if (ultimateCard.type === 'voyance') {
        this.applyVoyanceEffect(current, ultimateCard);
      } else if (ultimateCard.type === 'alternate') {
        this.applyAlternateEffect(current, ultimateCard);
      } else if (ultimateCard.type === 'avarice') {
        this.applyAvariceEffect(current, ultimateCard);
      }

      if (current.cards.length === 0) {
        this.endRound(current);
        return;
      }

      this.advanceTurn(animDuration);
    }
  }

  private applySingularityEffect(current: GamePlayerInternal, card: Card): void {
    const active = this.getActivePlayers();

    // Caster gets 2x luck boost on wilds, special cards, reverses, skips, and ultimates
    current.hasLuck = true;

    // Sucking in everyone's cards (including special cards and ultimates)
    const suckedCards: Card[] = [];
    for (const player of active) {
      suckedCards.push(...player.cards);
      player.cards = [];
    }

    // Mix (shuffle) all sucked cards thoroughly
    for (let i = suckedCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [suckedCards[i], suckedCards[j]] = [suckedCards[j], suckedCards[i]];
    }

    // Redistribute randomly to everyone (round-robin starting with caster)
    const casterIdx = active.findIndex(p => p.id === current.id);
    const startIdx = casterIdx !== -1 ? casterIdx : 0;

    let playerIdx = startIdx;
    while (suckedCards.length > 0) {
      const drawn = suckedCards.pop()!;
      active[playerIdx].cards.push(drawn);
      playerIdx = (playerIdx + 1) % active.length;
    }

    for (const player of active) {
      player.cardCount = player.cards.length;
      player.cards = sortCardsByValue(player.cards);
    }

    this.emitAction({
      type: 'ultimate_singularity',
      playerId: current.id,
      playerName: current.name,
      card,
      ultimateCardType: 'singularity',
      message: `Singularity erupted! All cards were consumed by the black hole and redistributed!`
    });
  }

  private applyVoyanceEffect(current: GamePlayerInternal, card: Card, skipEmitAction: boolean = false): void {
    if (!this.voyanceCasterIds.includes(current.id)) {
      this.voyanceCasterIds.push(current.id);
    }
    if (current.secretToken && !this.voyanceCasterIds.includes(current.secretToken)) {
      this.voyanceCasterIds.push(current.secretToken);
    }

    const active = this.getActivePlayers();
    for (const p of active) {
      const isExposedToOthers = this.voyanceCasterIds.some(
        cId => cId !== p.id && cId !== p.secretToken
      );
      p.hasVoyanceDebuff = isExposedToOthers;
    }

    if (!skipEmitAction) {
      this.emitAction({
        type: 'ultimate_voyance',
        playerId: current.id,
        playerName: current.name,
        card,
        ultimateCardType: 'voyance',
        message: `Voyance activated! All opponent cards are permanently revealed to ${current.name}!`
      });
    }
  }

  private applyAlternateEffect(current: GamePlayerInternal, card: Card, emitEvent: boolean = true): void {
    const active = this.getActivePlayers();

    // Save main world state
    this.mainWorldState = {
      drawPile: [...this.drawPile],
      discardPile: [...this.discardPile],
      allLaidDownPhases: [...this.allLaidDownPhases],
      playerHands: new Map(active.map(p => [p.id, [...p.cards]])),
      playerLaidPhases: new Map(active.map(p => [p.id, [...p.laidDownPhases]]))
    };

    // Setup alternate dimension
    const altDeck = createAlternateDeck('alt_');
    this.drawPile = altDeck;
    this.discardPile = [this.drawPile.pop()!];
    this.allLaidDownPhases = [];

    for (const p of active) {
      p.cards = [];
      for (let i = 0; i < 10; i++) {
        if (this.drawPile.length > 0) {
          p.cards.push(this.drawPile.pop()!);
        }
      }
      p.cardCount = p.cards.length;
      p.cards = sortCardsByValue(p.cards);
      p.laidDownPhases = [];
      // Buffs & debuffs carry over!
    }

    this.isAlternateWorld = true;
    this.alternateDimensionActive = true;
    this.alternateTurnCounter = -1;

    if (emitEvent) {
      this.emitAction({
        type: 'ultimate_alternate',
        playerId: current.id,
        playerName: current.name,
        card,
        ultimateCardType: 'alternate',
        isAlternateWorld: true,
        message: `Reality shifted! Entered the Alternate World with 10 pure number cards!`
      });
    }
  }

  public toggleDimension(emitEvent: boolean = true): void {
    const active = this.getActivePlayers();
    if (this.isAlternateWorld) {
      // Save Alternate World
      this.alternateWorldState = {
        drawPile: [...this.drawPile],
        discardPile: [...this.discardPile],
        allLaidDownPhases: [...this.allLaidDownPhases],
        playerHands: new Map(active.map(p => [p.id, [...p.cards]])),
        playerLaidPhases: new Map(active.map(p => [p.id, [...p.laidDownPhases]]))
      };

      // Restore Main World
      if (this.mainWorldState) {
        this.drawPile = [...this.mainWorldState.drawPile];
        this.discardPile = [...this.mainWorldState.discardPile];
        this.allLaidDownPhases = [...this.mainWorldState.allLaidDownPhases];
        for (const p of active) {
          p.cards = [...(this.mainWorldState.playerHands.get(p.id) || [])];
          p.cardCount = p.cards.length;
          p.laidDownPhases = [...(this.mainWorldState.playerLaidPhases.get(p.id) || [])];
        }
      }
      this.isAlternateWorld = false;
    } else {
      // Save Main World
      this.mainWorldState = {
        drawPile: [...this.drawPile],
        discardPile: [...this.discardPile],
        allLaidDownPhases: [...this.allLaidDownPhases],
        playerHands: new Map(active.map(p => [p.id, [...p.cards]])),
        playerLaidPhases: new Map(active.map(p => [p.id, [...p.laidDownPhases]]))
      };

      // Restore Alternate World
      if (this.alternateWorldState) {
        this.drawPile = [...this.alternateWorldState.drawPile];
        this.discardPile = [...this.alternateWorldState.discardPile];
        this.allLaidDownPhases = [...this.alternateWorldState.allLaidDownPhases];
        for (const p of active) {
          p.cards = [...(this.alternateWorldState.playerHands.get(p.id) || [])];
          p.cardCount = p.cards.length;
          p.laidDownPhases = [...(this.alternateWorldState.playerLaidPhases.get(p.id) || [])];
        }
      }
      this.isAlternateWorld = true;
    }

    if (emitEvent) {
      this.emitAction({
        type: 'alternate_shift',
        playerId: 'system',
        playerName: 'Dimension Rift',
        isAlternateWorld: this.isAlternateWorld,
        message: `Dimensional shift! Entering ${this.isAlternateWorld ? 'the Alternate Dimension' : 'the Main Dimension'}!`
      });

      this.notify({
        id: `notif_${Date.now()}`,
        type: 'info',
        message: `Dimensional shift! Entering ${this.isAlternateWorld ? 'the Alternate Dimension' : 'the Main Dimension'}!`,
        timestamp: Date.now()
      });
    }
  }

  private applyAvariceEffect(current: GamePlayerInternal, card: Card): void {
    // Collect all special cards from the discard pile
    const specialCards = this.discardPile.filter(c => isChaosSpecialCard(c.type));
    this.discardPile = this.discardPile.filter(c => !isChaosSpecialCard(c.type));

    // Ensure discard pile is not empty
    if (this.discardPile.length === 0) {
      this.ensureDrawPileHasCards();
      if (this.drawPile.length > 0) {
        this.discardPile.push(this.drawPile.pop()!);
      }
    }

    current.cards.push(...specialCards);
    current.cards = sortCardsByValue(current.cards);
    current.cardCount = current.cards.length;

    this.emitAction({
      type: 'ultimate_avarice',
      playerId: current.id,
      playerName: current.name,
      card,
      ultimateCardType: 'avarice',
      stolenCards: specialCards,
      message: `Avarice activated! ${current.name} plundered ${specialCards.length} special cards from the discard pile!`
    });
  }

  public cleanup(): void {
    this.clearPendingEffectTimeouts();
    if (this.roundEndAutoTimeout) {
      clearTimeout(this.roundEndAutoTimeout);
      this.roundEndAutoTimeout = undefined;
    }
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
