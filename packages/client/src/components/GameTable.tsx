import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  GameNotification,
  LaidDownPhaseGroup,
  PublicGameState,
  GameActionEvent,
  PlayerPublic,
  sortCardsByColor,
  sortCardsByValue,
  sortGroupCards,
  validateHit,
  findValidPhaseCombination,
  findSingleRequirementMatch
} from '@phase-ten/shared';
import { CardView } from './CardView.js';

interface GameTableProps {
  gameState: PublicGameState;
  hand: Card[];
  secretToken: string;
  notifications: GameNotification[];
  latestAction?: GameActionEvent | null;
  onDrawCard: (source: 'deck' | 'discard') => void;
  onLayDownPhase: (groups: Card[][]) => void;
  onLayRequirement: (reqIndex: number, cardIds: string[]) => void;
  onLayExtraMeld: (cardIds: string[]) => void;
  onHitCard: (cardId: string | string[], targetGroupId: string, targetEnd?: 'low' | 'high') => void;
  onDiscardCard: (cardId: string, targetPlayerId?: string) => void;
  onClaimSeat?: (targetPlayerId: string) => void;
  onOpenRules: () => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  gameState,
  hand,
  secretToken,
  notifications,
  latestAction,
  onDrawCard,
  onLayDownPhase,
  onLayRequirement,
  onLayExtraMeld,
  onHitCard,
  onDiscardCard,
  onClaimSeat,
  onOpenRules
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deckBackError, setDeckBackError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [localHand, setLocalHand] = useState<Card[]>(hand);
  const [displayedDiscardCard, setDisplayedDiscardCard] = useState<Card | null>(gameState.topDiscard);
  const discardFlightActiveRef = useRef<boolean>(false);
  const [activeFlyingCard, setActiveFlyingCard] = useState<{
    id: string;
    card?: Card;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    startScale: number;
    targetScale: number;
    startRot: number;
    targetRot: number;
  } | null>(null);
  const [discardKey, setDiscardKey] = useState(0);

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    // If a new discard action is pending or in flight, do NOT display the new top card yet!
    const isNewDiscardAction =
      latestAction &&
      lastHandledActionIdRef.current !== latestAction.id &&
      (latestAction.type === 'discard' ||
        latestAction.type === 'skip' ||
        latestAction.type === 'reverse' ||
        latestAction.type === 'draw_two');

    if (discardFlightActiveRef.current || isNewDiscardAction) {
      const prevDiscard =
        gameState.discardHistory && gameState.discardHistory.length > 1
          ? gameState.discardHistory[gameState.discardHistory.length - 2]
          : null;
      setDisplayedDiscardCard(prevDiscard);
      return;
    }

    setDisplayedDiscardCard(gameState.topDiscard);
  }, [gameState.topDiscard, latestAction]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const deckRef = useRef<HTMLButtonElement | null>(null);
  const discardRef = useRef<HTMLDivElement | null>(null);
  const handRef = useRef<HTMLElement | null>(null);
  const lastHandledActionIdRef = useRef<string | null>(null);
  const selectedCardIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedCardIdRef.current = selectedCardId;
  }, [selectedCardId]);

  const getCenterCoords = (el: Element | null) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    };
  };

  useEffect(() => {
    if (!latestAction || lastHandledActionIdRef.current === latestAction.id) return;
    lastHandledActionIdRef.current = latestAction.id;

    const isMe = latestAction.playerId === secretToken;
    let startCoords: { x: number; y: number } | null = null;
    let targetCoords: { x: number; y: number } | null = null;
    let startScale = 1;
    let targetScale = 1;
    let startRot = 0;
    let targetRot = 0;

    if (latestAction.type === 'draw') {
      if (latestAction.source === 'discard') {
        startCoords = getCenterCoords(discardRef.current);
      } else {
        startCoords = getCenterCoords(deckRef.current);
      }

      if (isMe) {
        targetCoords = getCenterCoords(handRef.current);
        startScale = 1;
        targetScale = 0.85;
        startRot = 0;
        targetRot = -4;
      } else {
        const oppEl = document.querySelector(`[data-opponent-id="${latestAction.playerId}"]`);
        targetCoords = getCenterCoords(oppEl);
        startScale = 1;
        targetScale = 0.65;
        startRot = 0;
        targetRot = 4;
      }
    } else if (
      latestAction.type === 'discard' ||
      latestAction.type === 'skip' ||
      latestAction.type === 'reverse' ||
      latestAction.type === 'draw_two'
    ) {
      discardFlightActiveRef.current = true;
      // Hold previous discard on the pile while the new card is in the air
      const prevDiscard = gameState.discardHistory && gameState.discardHistory.length > 1
        ? gameState.discardHistory[gameState.discardHistory.length - 2]
        : null;
      setDisplayedDiscardCard(prevDiscard);
      targetCoords = getCenterCoords(discardRef.current);

      if (isMe) {
        let cardEl: Element | null = null;
        if (latestAction.card?.id) {
          cardEl = document.querySelector(`[data-card-id="${latestAction.card.id}"]`);
        }
        if (!cardEl && selectedCardIdRef.current) {
          cardEl = document.querySelector(`[data-card-id="${selectedCardIdRef.current}"]`);
        }
        startCoords = getCenterCoords(cardEl) || getCenterCoords(handRef.current);
        startScale = 0.85;
        targetScale = 1;
        startRot = -3;
        targetRot = 0;
      } else {
        const oppEl = document.querySelector(`[data-opponent-id="${latestAction.playerId}"]`);
        startCoords = getCenterCoords(oppEl);
        startScale = 0.65;
        targetScale = 1;
        startRot = 4;
        targetRot = 0;
      }
    } else if (latestAction.type === 'hit') {
      const groupEl = latestAction.targetGroupId
        ? document.querySelector(`[data-group-id="${latestAction.targetGroupId}"]`)
        : null;
      targetCoords = getCenterCoords(groupEl) || getCenterCoords(discardRef.current);

      const hitCard = latestAction.card || latestAction.cards?.[0];
      if (isMe) {
        let cardEl: Element | null = null;
        if (hitCard?.id) {
          cardEl = document.querySelector(`[data-card-id="${hitCard.id}"]`);
        }
        startCoords = getCenterCoords(cardEl) || getCenterCoords(handRef.current);
        startScale = 0.85;
        targetScale = 0.75;
        startRot = -3;
        targetRot = 0;
      } else {
        const oppEl = document.querySelector(`[data-opponent-id="${latestAction.playerId}"]`);
        startCoords = getCenterCoords(oppEl);
        startScale = 0.65;
        targetScale = 0.75;
        startRot = 4;
        targetRot = 0;
      }
    }

    if (startCoords && targetCoords) {
      const flyingCard =
        latestAction.type === 'draw' && latestAction.source !== 'discard'
          ? undefined
          : latestAction.card || latestAction.cards?.[0];

      setActiveFlyingCard({
        id: `${latestAction.id}_${Date.now()}`,
        card: flyingCard,
        startX: startCoords.x,
        startY: startCoords.y,
        targetX: targetCoords.x,
        targetY: targetCoords.y,
        startScale,
        targetScale,
        startRot,
        targetRot
      });

      const timer = setTimeout(() => {
        setActiveFlyingCard(null);
        if (discardFlightActiveRef.current) {
          discardFlightActiveRef.current = false;
          setDiscardKey(prev => prev + 1);
          setDisplayedDiscardCard(gameStateRef.current.topDiscard);
        }
      }, 430);
      return () => clearTimeout(timer);
    }
  }, [latestAction, secretToken]);

  useEffect(() => {
    setLocalHand(prev => {
      const currentIds = new Set(hand.map(c => c.id));
      const retained = prev.filter(c => currentIds.has(c.id));
      const added = hand.filter(c => !prev.some(p => p.id === c.id));
      return [...retained, ...added];
    });
    setSelectedCardId(prev => {
      if (!prev) return null;
      return hand.some(c => c.id === prev) ? prev : null;
    });
  }, [hand]);

  const me = gameState.players.find(p => p.id === secretToken);
  const isSpectator = !me || me.isSpectator;
  const isMyTurn = gameState.currentTurnPlayerId === secretToken;
  const botPlayers = gameState.players.filter(p => p.isBot || !p.connected);
  const currentPhaseDef = gameState.phaseDefinitions.find(p => p.phaseNumber === me?.currentPhase);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return localHand.find(c => c.id === selectedCardId) ?? null;
  }, [localHand, selectedCardId]);

  // Seating relative to the client
  // Clockwise order starting from client
  const myIndex = me ? gameState.players.findIndex(p => p.id === me.id) : 0;
  const numPlayers = gameState.players.length;

  let leftPlayer: PlayerPublic | null = null;
  let topPlayer: PlayerPublic | null = null;
  let rightPlayer: PlayerPublic | null = null;

  if (numPlayers === 2) {
    topPlayer = gameState.players[(myIndex + 1) % 2];
  } else if (numPlayers === 3) {
    leftPlayer = gameState.players[(myIndex + 1) % 3];
    rightPlayer = gameState.players[(myIndex + 2) % 3];
  } else if (numPlayers >= 4) {
    leftPlayer = gameState.players[(myIndex + 1) % numPlayers];
    topPlayer = gameState.players[(myIndex + 2) % numPlayers];
    rightPlayer = gameState.players[(myIndex + 3) % numPlayers];
  }

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${gameState.roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCardClick = (card: Card) => {
    setSelectedCardId(prev => (prev === card.id ? null : card.id));
  };

  const clearSelection = () => {
    setSelectedCardId(null);
  };

  const handleDraw = (source: 'deck' | 'discard') => {
    if (!isMyTurn || gameState.turnStage !== 'draw') return;
    if (source === 'discard' && (gameState.topDiscard?.type === 'skip' || gameState.topDiscard?.type === 'wild')) return;
    onDrawCard(source);
  };

  const handleDiscardSelected = () => {
    if (!selectedCard || !isMyTurn || gameState.turnStage === 'draw') return;
    onDiscardCard(selectedCard.id);
    clearSelection();
  };

  const handleTableGroupClick = (group: LaidDownPhaseGroup, targetEnd?: 'low' | 'high') => {
    if (!isMyTurn || gameState.turnStage !== 'play' || !me?.phaseCompletedInRound) return;

    if (selectedCard && validateHit(selectedCard, group, targetEnd)) {
      onHitCard(selectedCard.id, group.id, targetEnd);
      clearSelection();
      return;
    }

    const matchingCard = localHand.find(c => validateHit(c, group));
    if (matchingCard) {
      setSelectedCardId(matchingCard.id);
    }
  };

  // Full combination check before phase is laid down
  const fullPhaseCombination = useMemo(() => {
    if (!currentPhaseDef || me?.phaseCompletedInRound) return null;
    return findValidPhaseCombination(localHand, currentPhaseDef);
  }, [localHand, currentPhaseDef, me?.phaseCompletedInRound]);

  // Extra meld / half rule checks after phase has been laid down
  const availableExtraMelds = useMemo(() => {
    if (!me?.phaseCompletedInRound || !currentPhaseDef || !(gameState.settings?.allowPartialAndExtraSets ?? true)) return [];
    let pool = [...localHand];
    const results: { label: string; type: string; cards: Card[] }[] = [];

    for (let i = 0; i < currentPhaseDef.requirements.length; i++) {
      const req = currentPhaseDef.requirements[i];
      const match = findSingleRequirementMatch(pool, req);
      if (match) {
        const label =
          req.type === 'set'
            ? `Set of ${req.count}`
            : req.type === 'run'
            ? `Run of ${req.count}`
            : `${req.count} of Color`;
        results.push({
          label: `Extra ${label}`,
          type: req.type,
          cards: match
        });
        const usedIds = new Set(match.map(c => c.id));
        pool = pool.filter(c => !usedIds.has(c.id));
      }
    }

    return results;
  }, [localHand, me?.phaseCompletedInRound, currentPhaseDef, gameState.settings?.allowPartialAndExtraSets]);

  const renderLaidDownGroup = (group: LaidDownPhaseGroup, canHit: boolean) => {
    const sortedCards = sortGroupCards(group.cards, group.type, group.runMin, group.runMax);
    const min = group.runMin ?? 1;
    const max = group.runMax ?? 12;

    const groupTitle =
      group.type === 'set'
        ? `Set of ${group.targetValue}s`
        : group.type === 'run'
        ? `Run ${min}-${max}`
        : `${group.targetColor?.toUpperCase()} Group`;

    return (
      <div
        key={group.id}
        data-group-id={group.id}
        onClick={() => handleTableGroupClick(group)}
        className={`relative border p-1 sm:p-1.5 rounded-xl flex flex-col gap-1 transition-all pointer-events-auto shadow-2xl backdrop-blur-md shrink-0 select-none ${
          canHit
            ? 'border-amber-400 bg-amber-950/85 shadow-[0_0_18px_rgba(251,191,36,0.85)] cursor-pointer ring-2 ring-amber-300 animate-pulse'
            : 'border-white/20 bg-black/85 hover:border-white/40 cursor-pointer'
        }`}
      >
        <div className="text-[10px] sm:text-xs text-neutral-200 flex justify-between items-center gap-2 font-bold px-1">
          <span>{groupTitle}</span>
          <span className="text-neutral-400 font-normal">({group.cards.length})</span>
        </div>
        <div className="flex items-center -space-x-7 sm:-space-x-8 md:-space-x-9 overflow-visible py-0.5">
          {sortedCards.map(c => (
            <div key={c.id} className="shrink-0 hover:scale-105 hover:z-20 transition-transform">
              <CardView card={c} size="sm" isSelectable={false} />
            </div>
          ))}
        </div>
        {canHit && (
          <div className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[10px] sm:text-xs font-black py-0.5 sm:py-1 px-1.5 rounded shadow text-center">
            HIT HERE
          </div>
        )}
      </div>
    );
  };

  // Render an opponent station (Nameplate, Card count pill, 3D fanned cards, and their laid melds)
  const renderOpponentStation = (
    player: PlayerPublic | null,
    position: 'left' | 'top' | 'right'
  ) => {
    if (!player) return null;
    const isPlayerTurn = gameState.currentTurnPlayerId === player.id;
    const cardCount = player.cardCount || 0;
    const visibleCardsCount = Math.min(10, cardCount);

    if (position === 'top') {
      return (
        <div
          key={player.id}
          className="absolute top-12 sm:top-13 md:top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-20 pointer-events-auto select-none max-w-[95vw]"
        >
          {/* Top Row: Player Banner & Card Count */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Player Banner */}
            <div
              className={`flex flex-col rounded-lg overflow-hidden border transition-all shrink-0 ${
                isPlayerTurn
                  ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                  : 'border-white/20 shadow-lg'
              }`}
            >
              <div
                className={`px-3 py-0.5 sm:py-1 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow ${
                  isPlayerTurn
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold'
                    : 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white'
                }`}
              >
                <span>{player.name}</span>
                {player.isBot && <span className="text-[10px] opacity-80">[BOT]</span>}
                {player.isSkipped && <span className="text-[10px] text-red-300 font-bold">[SKIPPED]</span>}
              </div>
              <div className="bg-black/80 px-2.5 py-0.5 text-[10px] text-neutral-300 flex items-center justify-between gap-3">
                <span className="font-semibold">Stage {player.currentPhase} {player.phaseCompletedInRound ? '✓' : ''}</span>
                {isPlayerTurn && gameState.turnTimeRemaining > 0 && (
                  <span className="text-amber-400 font-bold">({gameState.turnTimeRemaining}s)</span>
                )}
              </div>
            </div>

            {/* Card count pill */}
            <div className="flex items-center gap-1.5 bg-white/95 text-black px-2.5 py-1 rounded-lg font-bold text-xs sm:text-sm shadow-xl border border-neutral-300 shrink-0">
              <span className="text-sm sm:text-base">🂠</span>
              <span>{cardCount}</span>
            </div>

            {isSpectator && player.isBot && onClaimSeat && (
              <button
                onClick={() => onClaimSeat(player.id)}
                className="bg-white text-black text-[10px] font-bold px-2 py-1 rounded hover:bg-neutral-200 cursor-pointer shadow shrink-0"
              >
                Take Seat
              </button>
            )}
          </div>

          {/* 3D Horizontal Fanned Cards with Floor Reflection */}
          <div
            data-opponent-id={player.id}
            className="card-reflect flex items-center justify-center pointer-events-none my-0.5"
            style={{
              transform: 'perspective(900px) rotateX(24deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            {Array.from({ length: Math.max(1, visibleCardsCount) }).map((_, i) => {
              const rot = (i - (visibleCardsCount - 1) / 2) * 2.2;
              return (
                <div
                  key={i}
                  style={{
                    transform: `rotateZ(${rot}deg)`,
                    marginLeft: i === 0 ? 0 : visibleCardsCount > 8 ? '-46px' : '-40px',
                    zIndex: i + 1
                  }}
                  className="w-13 h-18 sm:w-16 sm:h-22 md:w-18 md:h-25 max-h-[12vh] aspect-[5/7] rounded-lg border border-neutral-600 overflow-hidden bg-neutral-900 shadow-2xl shrink-0"
                >
                  <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
                </div>
              );
            })}
          </div>

          {/* Top Player Laid Down Melds in Front of their deck */}
          {player.laidDownPhases && player.laidDownPhases.length > 0 && (
            <div className="mt-0.5 flex items-center justify-center gap-2 pointer-events-auto max-w-full overflow-x-auto px-2">
              {player.laidDownPhases.map(group => {
                const canHit = Boolean(
                  me?.phaseCompletedInRound &&
                  isMyTurn &&
                  gameState.turnStage === 'play' &&
                  selectedCard &&
                  validateHit(selectedCard, group)
                );
                return renderLaidDownGroup(group, canHit);
              })}
            </div>
          )}
        </div>
      );
    }

    if (position === 'left') {
      return (
        <div
          key={player.id}
          className="absolute left-3 sm:left-6 top-[28%] sm:top-[26%] flex flex-col items-start gap-2 z-20 pointer-events-auto select-none"
        >
          {/* Player Banner */}
          <div className="flex items-center gap-2">
            <div
              className={`flex flex-col rounded-lg overflow-hidden border transition-all ${
                isPlayerTurn
                  ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                  : 'border-white/20'
              }`}
            >
              <div
                className={`px-3 py-1 font-bold text-xs flex items-center gap-2 shadow ${
                  isPlayerTurn
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold'
                    : 'bg-gradient-to-r from-sky-600 to-cyan-500 text-white'
                }`}
              >
                <span>{player.name}</span>
                {player.isBot && <span className="text-[10px] opacity-80">[BOT]</span>}
                {player.isSkipped && <span className="text-[10px] text-red-300 font-bold">[SKIPPED]</span>}
              </div>
              <div className="bg-black/80 px-2.5 py-0.5 text-[10px] text-neutral-300 flex items-center justify-between gap-3">
                <span className="font-semibold">Stage {player.currentPhase} {player.phaseCompletedInRound ? '✓' : ''}</span>
                {isPlayerTurn && gameState.turnTimeRemaining > 0 && (
                  <span className="text-amber-400 font-bold">({gameState.turnTimeRemaining}s)</span>
                )}
              </div>
            </div>

            {/* Card count pill */}
            <div className="flex items-center gap-1.5 bg-white/95 text-black px-2.5 py-1 rounded-lg font-bold text-xs shadow-lg border border-neutral-300">
              <span className="text-sm">🂠</span>
              <span>{cardCount}</span>
            </div>

            {isSpectator && player.isBot && onClaimSeat && (
              <button
                onClick={() => onClaimSeat(player.id)}
                className="bg-white text-black text-[10px] font-bold px-2 py-1 rounded hover:bg-neutral-200 cursor-pointer shadow"
              >
                Take Seat
              </button>
            )}
          </div>

          <div className="flex items-start gap-2">
            {/* 3D Angled Vertical Fanned Cards with Reflection */}
            <div
              data-opponent-id={player.id}
              className="card-reflect mt-1 flex flex-col pointer-events-none"
              style={{
                transform: 'perspective(900px) rotateY(48deg) rotateX(16deg) rotateZ(-8deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              {Array.from({ length: Math.max(1, visibleCardsCount) }).map((_, i) => {
                const rot = (i - (visibleCardsCount - 1) / 2) * 2;
                return (
                  <div
                    key={i}
                    style={{
                      transform: `rotateZ(${rot}deg)`,
                      marginTop: i === 0 ? 0 : '-48px',
                      zIndex: i + 1
                    }}
                    className="w-14 h-20 sm:w-16 sm:h-22 md:w-18 md:h-25 max-h-[12vh] aspect-[5/7] rounded-lg border border-neutral-600 overflow-hidden bg-neutral-900 shadow-2xl"
                  >
                    <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
                  </div>
                );
              })}
            </div>

            {/* Left Player Laid Down Melds in Front of their deck */}
            {player.laidDownPhases && player.laidDownPhases.length > 0 && (
              <div className="mt-1 flex flex-col gap-2 pointer-events-auto">
                {player.laidDownPhases.map(group => {
                  const canHit = Boolean(
                    me?.phaseCompletedInRound &&
                    isMyTurn &&
                    gameState.turnStage === 'play' &&
                    selectedCard &&
                    validateHit(selectedCard, group)
                  );
                  return renderLaidDownGroup(group, canHit);
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Right opponent
    return (
      <div
        key={player.id}
        className="absolute right-3 sm:right-6 top-[28%] sm:top-[26%] flex flex-col items-end gap-2 z-20 pointer-events-auto select-none"
      >
        {/* Player Banner */}
        <div className="flex items-center gap-2">
          {isSpectator && player.isBot && onClaimSeat && (
            <button
              onClick={() => onClaimSeat(player.id)}
              className="bg-white text-black text-[10px] font-bold px-2 py-1 rounded hover:bg-neutral-200 cursor-pointer shadow"
            >
              Take Seat
            </button>
          )}

          {/* Card count pill */}
          <div className="flex items-center gap-1.5 bg-white/95 text-black px-2.5 py-1 rounded-lg font-bold text-xs shadow-lg border border-neutral-300">
            <span className="text-sm">🂠</span>
            <span>{cardCount}</span>
          </div>

          <div
            className={`flex flex-col items-end rounded-lg overflow-hidden border transition-all ${
              isPlayerTurn
                ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                : 'border-white/20'
            }`}
          >
            <div
              className={`px-3 py-1 font-bold text-xs flex items-center gap-2 shadow ${
                isPlayerTurn
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white'
              }`}
            >
              <span>{player.name}</span>
              {player.isBot && <span className="text-[10px] opacity-80">[BOT]</span>}
              {player.isSkipped && <span className="text-[10px] text-red-300 font-bold">[SKIPPED]</span>}
            </div>
            <div className="bg-black/80 px-2.5 py-0.5 text-[10px] text-neutral-300 flex items-center justify-between gap-3">
              <span className="font-semibold">Stage {player.currentPhase} {player.phaseCompletedInRound ? '✓' : ''}</span>
              {isPlayerTurn && gameState.turnTimeRemaining > 0 && (
                <span className="text-amber-400 font-bold">({gameState.turnTimeRemaining}s)</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          {/* Right Player Laid Down Melds in Front of their deck */}
          {player.laidDownPhases && player.laidDownPhases.length > 0 && (
            <div className="mt-1 flex flex-col items-end gap-2 pointer-events-auto">
              {player.laidDownPhases.map(group => {
                const canHit = Boolean(
                  me?.phaseCompletedInRound &&
                  isMyTurn &&
                  gameState.turnStage === 'play' &&
                  selectedCard &&
                  validateHit(selectedCard, group)
                );
                return renderLaidDownGroup(group, canHit);
              })}
            </div>
          )}

          {/* 3D Angled Vertical Fanned Cards with Reflection */}
          <div
            data-opponent-id={player.id}
            className="card-reflect mt-1 flex flex-col pointer-events-none items-end"
            style={{
              transform: 'perspective(900px) rotateY(-48deg) rotateX(16deg) rotateZ(8deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            {Array.from({ length: Math.max(1, visibleCardsCount) }).map((_, i) => {
              const rot = (i - (visibleCardsCount - 1) / 2) * -2;
              return (
                <div
                  key={i}
                  style={{
                    transform: `rotateZ(${rot}deg)`,
                    marginTop: i === 0 ? 0 : '-48px',
                    zIndex: i + 1
                  }}
                  className="w-14 h-20 sm:w-16 sm:h-22 md:w-18 md:h-25 max-h-[12vh] aspect-[5/7] rounded-lg border border-neutral-600 overflow-hidden bg-neutral-900 shadow-2xl"
                >
                  <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-screen h-[100dvh] overflow-hidden bg-black text-white font-sans select-none flex flex-col justify-end">
      {/* 1. Looping 3D Arena Video Background */}
      <video
        ref={videoRef}
        src="/cards/background.mp4"
        autoPlay
        loop
        muted={isMuted}
        playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      />

      {/* Subtle lighting vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none z-0" />

      {/* 2. Top Header HUD: Floating Left & Right Control Panels (Leaves top-center open) */}
      <header className="absolute top-0 inset-x-0 z-30 p-2 sm:p-3 flex items-start justify-between pointer-events-none">
        {/* Left HUD Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5 pointer-events-auto bg-neutral-950/85 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl shadow-2xl">
          <button
            onClick={copyInviteLink}
            title="Click to copy invite link"
            className="border border-white/20 bg-black/60 px-2.5 py-1 rounded-lg hover:bg-white/10 cursor-pointer flex items-center gap-1.5 transition-colors font-medium text-xs"
          >
            <span>🔗</span>
            <span className="font-bold">{copiedLink ? 'Link Copied!' : `Room: ${gameState.roomCode}`}</span>
          </button>
          <span className="text-[10px] text-neutral-400 border border-white/10 px-1.5 py-0.5 rounded font-medium">v4.5</span>
          <span className="text-neutral-300 font-bold text-xs">Round {gameState.roundNumber}</span>
          {gameState.settings?.gameMode && gameState.settings.gameMode !== 'classic' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/50 bg-amber-950/80 text-amber-300 uppercase">
              {gameState.settings.gameMode}
            </span>
          )}
        </div>

        {/* Right HUD Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5 pointer-events-auto bg-neutral-950/85 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl shadow-2xl">
          {isMyTurn ? (
            <span className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-extrabold px-3 py-1 rounded-full text-xs shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-pulse">
              YOUR TURN ({gameState.turnStage.toUpperCase()})
            </span>
          ) : (
            <span className="text-neutral-300 text-xs">
              Turn: <span className="font-bold text-white">{gameState.players.find(p => p.id === gameState.currentTurnPlayerId)?.name}</span>
            </span>
          )}

          {gameState.turnTimeRemaining > 0 && (
            <span className="text-amber-300 font-bold text-xs bg-black/60 border border-amber-500/30 px-2 py-0.5 rounded-lg">
              {gameState.turnTimeRemaining}s
            </span>
          )}

          <button
            onClick={() => {
              setIsMuted(!isMuted);
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
              }
            }}
            title={isMuted ? 'Unmute Arena Audio' : 'Mute Arena Audio'}
            className="text-neutral-400 hover:text-white px-2 py-1 border border-white/10 rounded-lg bg-black/40 text-xs cursor-pointer transition-colors"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <button
            onClick={onOpenRules}
            className="text-neutral-300 hover:text-white underline text-xs cursor-pointer font-bold px-1"
          >
            Rules
          </button>
        </div>
      </header>

      {/* 3. Visual Flying Card Animation Layer */}
      {activeFlyingCard && (
        <div
          key={activeFlyingCard.id}
          style={
            {
              '--start-x': `${activeFlyingCard.startX}px`,
              '--start-y': `${activeFlyingCard.startY}px`,
              '--target-x': `${activeFlyingCard.targetX}px`,
              '--target-y': `${activeFlyingCard.targetY}px`,
              '--start-scale': activeFlyingCard.startScale,
              '--target-scale': activeFlyingCard.targetScale,
              '--start-rot': `${activeFlyingCard.startRot}deg`,
              '--target-rot': `${activeFlyingCard.targetRot}deg`
            } as React.CSSProperties
          }
          className="fixed top-0 left-0 z-50 pointer-events-none drop-shadow-2xl animate-fly-card-exact"
        >
          {activeFlyingCard.card ? (
            <CardView card={activeFlyingCard.card} size="lg" isSelectable={false} />
          ) : (
            <div className="w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-40 rounded-xl border border-neutral-700 overflow-hidden bg-neutral-900 shadow-2xl">
              <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* 4. Spectator Waitlist Banner */}
      {isSpectator && (
        <div className="relative z-30 mx-auto mt-2 max-w-md bg-neutral-950/85 backdrop-blur border border-amber-500/40 p-2.5 rounded-lg text-center text-xs shadow-xl">
          <div className="text-amber-300 font-bold flex items-center justify-center gap-2">
            <span>👀 SPECTATING MATCH — YOU ARE ON THE WAITLIST</span>
          </div>
          {botPlayers.length > 0 && onClaimSeat && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1.5">
              <span className="text-neutral-400 text-[11px]">Available bot seat:</span>
              {botPlayers.map(bot => (
                <button
                  key={bot.id}
                  onClick={() => onClaimSeat(bot.id)}
                  className="bg-white text-black font-bold px-2.5 py-0.5 rounded text-xs hover:bg-neutral-200 cursor-pointer shadow"
                >
                  Take Seat: {bot.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Opponent Stations (Left, Top, Right) */}
      {renderOpponentStation(leftPlayer, 'left')}
      {renderOpponentStation(topPlayer, 'top')}
      {renderOpponentStation(rightPlayer, 'right')}

      {/* 6. Center Table Arena (Deck, Discard, Direction Arrows) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="relative w-full max-w-2xl h-[min(420px,48vh)] flex items-center justify-center">
          {/* Central Circular Direction Arrow Indicator (Enlarged orbital ring centered in video background) */}
          <div
            className={`absolute w-[min(520px,46vh,88vw)] h-[min(520px,46vh,88vw)] rounded-full pointer-events-none flex items-center justify-center transition-all ${
              gameState.playDirection === 1 ? 'animate-spin-cw' : 'animate-spin-ccw'
            }`}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-60 drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]">
              <defs>
                <linearGradient id="orbitGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="orbitGrad2" x1="100%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {/* Outer Glowing Neon Dashed Arc 1 */}
              <path
                d="M 50,6 A 44,44 0 0,1 94,50"
                stroke="url(#orbitGrad1)"
                strokeWidth="2.5"
                fill="none"
                strokeDasharray="9,5"
                strokeLinecap="round"
              />
              {/* Outer Glowing Neon Dashed Arc 2 */}
              <path
                d="M 50,94 A 44,44 0 0,1 6,50"
                stroke="url(#orbitGrad2)"
                strokeWidth="2.5"
                fill="none"
                strokeDasharray="9,5"
                strokeLinecap="round"
              />
              {/* Concentric Guide Ring */}
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="#06b6d4"
                strokeWidth="0.5"
                strokeDasharray="3,6"
                fill="none"
                opacity="0.25"
              />
            </svg>
          </div>

          {/* Draw & Discard Piles in the Arena Ring */}
          <div className="flex items-center gap-4 sm:gap-8 md:gap-12 pointer-events-auto z-20">
            {/* Draw Pile (Upper-Left of Center) */}
            <div className="flex flex-col items-center">
              <button
                ref={deckRef}
                onClick={() => handleDraw('deck')}
                disabled={!isMyTurn || gameState.turnStage !== 'draw'}
                className={`relative w-18 h-26 sm:w-22 sm:h-30 md:w-24 md:h-32 max-h-[16vh] aspect-[5/7] rounded-xl flex flex-col items-center justify-center transition-transform deck-3d-stack overflow-hidden ${
                  isMyTurn && gameState.turnStage === 'draw'
                    ? 'border-2 border-yellow-300 ring-4 ring-yellow-400/50 hover:scale-105 cursor-pointer animate-pulse'
                    : 'border border-neutral-700 cursor-default opacity-90'
                }`}
              >
                {!deckBackError ? (
                  <>
                    <img
                      src="/cards/back.png"
                      alt="Deck"
                      onError={() => setDeckBackError(true)}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute top-1.5 right-1.5 bg-black/85 text-white text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-md font-bold border border-white/20">
                      {gameState.drawPileCount}
                    </div>
                    {isMyTurn && gameState.turnStage === 'draw' && (
                      <div className="absolute bottom-2.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded font-extrabold shadow-lg">
                        DRAW
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="font-bold text-sm">DECK</div>
                    <div className="text-xs text-neutral-400">({gameState.drawPileCount})</div>
                  </>
                )}
              </button>
              <span className="text-[10px] sm:text-[11px] text-neutral-300 font-bold mt-1 drop-shadow">Draw Pile</span>
            </div>

            {/* Discard Pile (Bottom-Center of Arena) */}
            <div className="flex flex-col items-center">
              <div
                ref={discardRef}
                className="relative w-18 h-26 sm:w-22 sm:h-30 md:w-24 md:h-32 max-h-[16vh] aspect-[5/7] discard-3d-shadow rounded-xl"
              >
                {/* Peek previous card underneath */}
                {gameState.discardHistory && gameState.discardHistory.length > 1 && (
                  <div
                    className="absolute inset-0 rounded-xl overflow-hidden border border-neutral-800 pointer-events-none opacity-60"
                    style={{ transform: 'rotate(-9deg) translate(-4px, 2px)' }}
                  >
                    <CardView card={gameState.discardHistory[gameState.discardHistory.length - 2]} size="md" isSelectable={false} />
                  </div>
                )}

                {displayedDiscardCard ? (
                  <div
                    key={`${displayedDiscardCard.id}_${discardKey}`}
                    onClick={() => {
                      if (isMyTurn && gameState.turnStage === 'draw') {
                        if (displayedDiscardCard?.type !== 'skip' && displayedDiscardCard?.type !== 'wild') {
                          handleDraw('discard');
                        }
                      } else if (isMyTurn && selectedCard && gameState.turnStage !== 'draw') {
                        handleDiscardSelected();
                      }
                    }}
                    className={`relative z-10 animate-card-land ${
                      isMyTurn &&
                      ((gameState.turnStage === 'draw' && displayedDiscardCard?.type !== 'skip' && displayedDiscardCard?.type !== 'wild') ||
                        selectedCard)
                        ? 'cursor-pointer hover:scale-105'
                        : ''
                    }`}
                  >
                    <CardView card={displayedDiscardCard} size="md" isSelectable={false} />
                  </div>
                ) : (
                  <div className="w-full h-full border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center text-xs text-neutral-400 bg-black/40">
                    Empty
                  </div>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] text-neutral-300 font-bold mt-1 drop-shadow">Discard Pile</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Client Station & Hand (Bottom) */}
      <footer ref={handRef} className="absolute bottom-0 inset-x-0 z-30 pb-2 sm:pb-3 pointer-events-auto flex flex-col items-center select-none w-full">
        {/* Client Nameplate & Card Count (Bottom Left) */}
        {me && (
          <div className="absolute left-2 sm:left-6 bottom-2 sm:bottom-4 flex items-center gap-1.5 sm:gap-2 z-40">
            <div
              className={`flex flex-col rounded-lg overflow-hidden border transition-all ${
                isMyTurn
                  ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                  : 'border-white/20'
              }`}
            >
              <div
                className={`px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold text-[11px] sm:text-xs flex items-center gap-1.5 shadow ${
                  isMyTurn
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-extrabold'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                }`}
              >
                <span>{me.name} (You)</span>
                {me.isSkipped && <span className="text-[9px] text-red-300 font-bold">[SKIPPED]</span>}
              </div>
              <div className="bg-black/80 px-2 py-0.5 text-[9px] sm:text-[10px] text-neutral-300 flex items-center justify-between gap-2">
                <span className="font-semibold">Stage {me.currentPhase} {me.phaseCompletedInRound ? '✓' : ''}</span>
              </div>
            </div>

            {/* Card Count Pill */}
            <div className="flex items-center gap-1 bg-white/95 text-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-bold text-xs shadow-lg border border-neutral-300">
              <span className="text-xs sm:text-sm">🂠</span>
              <span>{localHand.length}</span>
            </div>
          </div>
        )}

        {/* Client Laid Down Melds in Front of their hand */}
        {me && me.laidDownPhases && me.laidDownPhases.length > 0 && (
          <div className="mb-1.5 sm:mb-2 flex items-center justify-center gap-1.5 sm:gap-2 pointer-events-auto max-w-full overflow-x-auto px-2">
            {me.laidDownPhases.map(group => {
              const canHit = Boolean(
                me?.phaseCompletedInRound &&
                isMyTurn &&
                gameState.turnStage === 'play' &&
                selectedCard &&
                validateHit(selectedCard, group)
              );
              return renderLaidDownGroup(group, canHit);
            })}
          </div>
        )}

        {/* Unified Stage Action Zone & Hand Toolbar */}
        <div className="mb-1.5 sm:mb-2 flex flex-wrap items-center justify-center gap-2 pointer-events-auto px-2">
          {/* Stage Goal / Lay Down Phase status */}
          {currentPhaseDef && (
            <>
              {!me?.phaseCompletedInRound ? (
                <div className="flex items-center gap-1.5 sm:gap-2 bg-black/80 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full shadow-lg text-xs">
                  <span className="text-amber-400 font-bold">Stage {me?.currentPhase}:</span>
                  <span className="text-neutral-200 font-medium text-[11px] sm:text-xs">
                    {currentPhaseDef.requirements
                      .map(r => r.type === 'set' ? `Set of ${r.count}` : r.type === 'run' ? `Run of ${r.count}` : `${r.count} Same Color`)
                      .join(' + ')}
                  </span>
                  {fullPhaseCombination ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isMyTurn && gameState.turnStage === 'play') {
                          onLayDownPhase(fullPhaseCombination);
                        }
                      }}
                      disabled={!isMyTurn || gameState.turnStage !== 'play'}
                      className={`ml-1 px-3 py-0.5 sm:py-1 rounded-full font-extrabold text-[11px] sm:text-xs transition-all shadow-md flex items-center gap-1 ${
                        isMyTurn && gameState.turnStage === 'play'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:scale-105 cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-pulse'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-not-allowed'
                      }`}
                    >
                      <span>✨</span>
                      <span>{isMyTurn && gameState.turnStage === 'play' ? `Lay Down Stage ${me?.currentPhase}` : 'Draw First'}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-neutral-400 italic ml-1">(Incomplete)</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold text-[11px] sm:text-xs px-3 py-1 rounded-full flex items-center gap-1 shadow">
                    <span>✓</span>
                    <span>Stage {me?.currentPhase} Completed</span>
                  </div>
                  {availableExtraMelds.length > 0 && isMyTurn && gameState.turnStage === 'play' && (
                    <button
                      type="button"
                      onClick={() => onLayExtraMeld(availableExtraMelds[0].cards.map(c => c.id))}
                      className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-bold text-[11px] sm:text-xs px-3 py-1 rounded-full shadow hover:scale-105 cursor-pointer transition-all animate-pulse"
                    >
                      + Lay {availableExtraMelds[0].label}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Sort Controls & Deselect */}
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-lg text-xs">
            <button
              type="button"
              onClick={() => setLocalHand(sortCardsByValue(localHand))}
              className="px-2 py-0.5 rounded text-[11px] bg-white/10 hover:bg-white/20 text-neutral-200 cursor-pointer transition-colors font-medium"
            >
              Sort: Value
            </button>
            <button
              type="button"
              onClick={() => setLocalHand(sortCardsByColor(localHand))}
              className="px-2 py-0.5 rounded text-[11px] bg-white/10 hover:bg-white/20 text-neutral-200 cursor-pointer transition-colors font-medium"
            >
              Sort: Color
            </button>
            {selectedCard && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-neutral-400 hover:text-white text-[11px] underline ml-1 cursor-pointer"
              >
                Deselect
              </button>
            )}
          </div>
        </div>

        {/* Client Hand: Curved Arc in Perspective */}
        <div className="w-full max-w-5xl px-2 sm:px-4 flex items-end justify-center overflow-x-auto sm:overflow-visible pb-1 pt-1 sm:pt-2">
          <div className="flex items-end justify-center">
            {localHand.map((c, i) => {
              const count = localHand.length;
              const offset = i - (count - 1) / 2;
              const rot = Math.max(-14, Math.min(14, offset * (count > 12 ? 1.6 : 2.2)));
              const translateY = Math.abs(offset) * (count > 12 ? 1.2 : 1.8);
              const isSelected = selectedCardId === c.id;

              return (
                <div
                  key={c.id}
                  data-card-id={c.id}
                  style={{
                    transform: `rotate(${rot}deg) translateY(${isSelected ? -26 : translateY}px)`,
                    zIndex: isSelected ? 40 : i + 1,
                    marginLeft: i === 0 ? 0 : count > 12 ? '-40px' : count > 8 ? '-34px' : '-26px'
                  }}
                  className={`relative transition-all duration-200 cursor-pointer shrink-0 hover:-translate-y-6 hover:z-35 ${
                    isSelected ? 'scale-105 drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]' : ''
                  }`}
                  onClick={() => handleCardClick(c)}
                >
                  <CardView card={c} size="lg" isSelected={isSelected} isSelectable={true} />

                  {/* Red low-opacity DISCARD button right on the selected card */}
                  {isSelected && isMyTurn && gameState.turnStage !== 'draw' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDiscardSelected();
                      }}
                      className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-50 bg-red-600/75 hover:bg-red-600/95 active:bg-red-700 text-white font-black text-[10px] sm:text-xs py-1.5 px-2.5 rounded-lg border border-red-400/80 shadow-[0_0_15px_rgba(239,68,68,0.85)] backdrop-blur-sm flex items-center justify-center gap-1 cursor-pointer transition-all animate-fade-in hover:scale-105 whitespace-nowrap select-none"
                    >
                      <span className="text-xs">🗑️</span>
                      <span>DISCARD</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
};
