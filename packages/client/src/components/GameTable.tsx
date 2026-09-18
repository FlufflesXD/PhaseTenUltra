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

  useEffect(() => {
    if (!discardFlightActiveRef.current) {
      setDisplayedDiscardCard(gameState.topDiscard);
    }
  }, [gameState.topDiscard]);

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

      setDiscardKey(prev => prev + 1);
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
          setDisplayedDiscardCard(gameState.topDiscard);
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
        className={`relative border p-1 rounded-lg flex flex-col gap-0.5 transition-all pointer-events-auto shadow-xl backdrop-blur-md shrink-0 select-none ${
          canHit
            ? 'border-amber-400 bg-amber-950/85 shadow-[0_0_15px_rgba(251,191,36,0.8)] cursor-pointer ring-2 ring-amber-300 animate-pulse'
            : 'border-white/20 bg-black/80 hover:border-white/40 cursor-pointer'
        }`}
      >
        <div className="text-[9px] text-neutral-300 flex justify-between items-center gap-1.5 font-bold">
          <span>{groupTitle}</span>
          <span className="text-neutral-400 font-normal">({group.cards.length})</span>
        </div>
        <div className="flex items-center -space-x-5 overflow-visible py-0.5">
          {sortedCards.map(c => (
            <div key={c.id} className="shrink-0 scale-90 origin-left hover:scale-100 transition-transform">
              <CardView card={c} size="sm" isSelectable={false} />
            </div>
          ))}
        </div>
        {canHit && (
          <div className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[9px] font-extrabold py-0.5 px-1 rounded shadow text-center">
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
    const visibleCardsCount = Math.min(cardCount, 14);

    if (position === 'top') {
      return (
        <div
          key={player.id}
          className="absolute top-10 sm:top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-20 pointer-events-auto select-none"
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

          {/* 3D Horizontal Fanned Cards with Reflection */}
          <div
            data-opponent-id={player.id}
            className="card-reflect mt-1 flex items-center justify-center pointer-events-none"
            style={{
              transform: 'perspective(900px) rotateX(32deg)',
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
                    marginLeft: i === 0 ? 0 : '-44px',
                    zIndex: i + 1
                  }}
                  className="w-16 h-24 sm:w-18 sm:h-26 rounded-md border border-neutral-700/80 overflow-hidden bg-neutral-900 shadow-xl shrink-0"
                >
                  <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
                </div>
              );
            })}
          </div>

          {/* Top Player Laid Down Melds in Front of their deck */}
          {player.laidDownPhases && player.laidDownPhases.length > 0 && (
            <div className="mt-1 flex items-center justify-center gap-2 pointer-events-auto">
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
                      marginTop: i === 0 ? 0 : '-52px',
                      zIndex: i + 1
                    }}
                    className="w-16 h-24 sm:w-18 sm:h-26 rounded-md border border-neutral-700/80 overflow-hidden bg-neutral-900 shadow-xl"
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
                    marginTop: i === 0 ? 0 : '-52px',
                    zIndex: i + 1
                  }}
                  className="w-16 h-24 sm:w-18 sm:h-26 rounded-md border border-neutral-700/80 overflow-hidden bg-neutral-900 shadow-xl"
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
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans select-none flex flex-col justify-between">
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

      {/* 2. Top Header Bar */}
      <header className="relative z-30 px-3 py-2 flex items-center justify-between text-xs bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={copyInviteLink}
            title="Click to copy invite link"
            className="border border-white/20 bg-black/60 px-2.5 py-1 rounded hover:bg-white/10 cursor-pointer flex items-center gap-1.5 transition-colors font-medium"
          >
            <span>🔗</span>
            <span className="font-bold">{copiedLink ? 'Link Copied!' : `Room: ${gameState.roomCode}`}</span>
          </button>
          <span className="text-[10px] text-neutral-400 border border-white/10 px-1.5 py-0.5 rounded font-medium">v4.1</span>
          <span className="text-neutral-300 font-bold">Round {gameState.roundNumber}</span>
          {gameState.settings?.gameMode && gameState.settings.gameMode !== 'classic' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/50 bg-amber-950/80 text-amber-300 uppercase">
              {gameState.settings.gameMode}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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
            <span className="text-amber-300 font-bold text-xs bg-black/60 border border-amber-500/30 px-2 py-0.5 rounded">
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
            className="text-neutral-400 hover:text-white px-2 py-0.5 border border-white/10 rounded bg-black/40 text-xs cursor-pointer"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <button
            onClick={onOpenRules}
            className="text-neutral-300 hover:text-white underline text-xs cursor-pointer font-bold"
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
            <div className="w-24 h-34 sm:w-28 sm:h-40 rounded-xl border border-neutral-700 overflow-hidden bg-neutral-900 shadow-2xl">
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
        <div className="relative w-full max-w-2xl h-[420px] flex items-center justify-center">
          {/* Central Circular Direction Arrow Indicator */}
          <div
            className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-cyan-500/20 pointer-events-none flex items-center justify-center ${
              gameState.playDirection === 1 ? 'animate-spin-cw' : 'animate-spin-ccw'
            }`}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-40">
              <path
                d="M 50,8 A 42,42 0 0,1 92,50"
                stroke="#38bdf8"
                strokeWidth="3"
                fill="none"
                strokeDasharray="6,4"
              />
              <path
                d="M 50,92 A 42,42 0 0,1 8,50"
                stroke="#38bdf8"
                strokeWidth="3"
                fill="none"
                strokeDasharray="6,4"
              />
            </svg>
          </div>

          {/* Draw & Discard Piles in the Arena Ring */}
          <div className="flex items-center gap-8 sm:gap-14 pointer-events-auto z-20">
            {/* Draw Pile (Upper-Left of Center) */}
            <div className="flex flex-col items-center">
              <button
                ref={deckRef}
                onClick={() => handleDraw('deck')}
                disabled={!isMyTurn || gameState.turnStage !== 'draw'}
                className={`relative w-24 h-34 sm:w-28 sm:h-40 rounded-xl flex flex-col items-center justify-center transition-transform deck-3d-stack overflow-hidden ${
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
                    <div className="absolute top-2 right-2 bg-black/85 text-white text-[11px] px-2 py-0.5 rounded-md font-bold border border-white/20">
                      {gameState.drawPileCount}
                    </div>
                    {isMyTurn && gameState.turnStage === 'draw' && (
                      <div className="absolute bottom-3 bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-xs px-2.5 py-1 rounded font-extrabold shadow-lg">
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
              <span className="text-[11px] text-neutral-300 font-bold mt-1.5 drop-shadow">Draw Pile</span>
            </div>

            {/* Discard Pile (Bottom-Center of Arena) */}
            <div className="flex flex-col items-center">
              <div
                ref={discardRef}
                className="relative w-24 h-34 sm:w-28 sm:h-40 discard-3d-shadow rounded-xl"
              >
                {/* Peek previous card underneath */}
                {gameState.discardHistory && gameState.discardHistory.length > 1 && (
                  <div
                    className="absolute inset-0 rounded-xl overflow-hidden border border-neutral-800 pointer-events-none opacity-60"
                    style={{ transform: 'rotate(-9deg) translate(-4px, 2px)' }}
                  >
                    <CardView card={gameState.discardHistory[gameState.discardHistory.length - 2]} size="lg" isSelectable={false} />
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
                    <CardView card={displayedDiscardCard} size="lg" isSelectable={false} />
                  </div>
                ) : (
                  <div className="w-full h-full border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center text-xs text-neutral-400 bg-black/40">
                    Empty
                  </div>
                )}
              </div>
              <span className="text-[11px] text-neutral-300 font-bold mt-1.5 drop-shadow">Discard Pile</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Client Station & Hand (Bottom) */}
      <footer ref={handRef} className="relative z-30 pb-3 pointer-events-auto flex flex-col items-center select-none">
        {/* Client Nameplate & Card Count (Bottom Left) */}
        {me && (
          <div className="absolute left-3 sm:left-8 bottom-3 sm:bottom-4 flex items-center gap-2 z-40">
            <div
              className={`flex flex-col rounded-lg overflow-hidden border transition-all ${
                isMyTurn
                  ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                  : 'border-white/20'
              }`}
            >
              <div
                className={`px-3 py-1 font-bold text-xs flex items-center gap-2 shadow ${
                  isMyTurn
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-extrabold'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                }`}
              >
                <span>{me.name} (You)</span>
                {me.isSkipped && <span className="text-[9px] text-red-300 font-bold">[SKIPPED]</span>}
              </div>
              <div className="bg-black/80 px-2.5 py-0.5 text-[10px] text-neutral-300 flex items-center justify-between gap-3">
                <span className="font-semibold">Stage {me.currentPhase} {me.phaseCompletedInRound ? '✓' : ''}</span>
              </div>
            </div>

            {/* Card Count Pill */}
            <div className="flex items-center gap-1.5 bg-white/95 text-black px-2.5 py-1 rounded-lg font-bold text-xs shadow-lg border border-neutral-300">
              <span className="text-sm">🂠</span>
              <span>{localHand.length}</span>
            </div>
          </div>
        )}

        {/* Client Laid Down Melds in Front of their hand */}
        {me && me.laidDownPhases && me.laidDownPhases.length > 0 && (
          <div className="mb-2 flex items-center justify-center gap-2 pointer-events-auto">
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

        {/* In-situ Stage Action Zone (Replaces the clunky drawer toggle button) */}
        {currentPhaseDef && (
          <div className="mb-2 flex items-center justify-center gap-2 pointer-events-auto">
            {!me?.phaseCompletedInRound ? (
              <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full shadow-xl">
                <span className="text-amber-400 font-bold text-xs">Stage {me?.currentPhase}:</span>
                <span className="text-neutral-200 text-xs font-medium">
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
                    className={`ml-1 px-3.5 py-1 rounded-full font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5 ${
                      isMyTurn && gameState.turnStage === 'play'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:scale-105 cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-pulse'
                        : 'bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-not-allowed'
                    }`}
                  >
                    <span>✨</span>
                    <span>{isMyTurn && gameState.turnStage === 'play' ? `Lay Down Stage ${me?.currentPhase}` : 'Draw Card First to Lay'}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-neutral-400 italic ml-1">(Incomplete)</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow">
                  <span>✓</span>
                  <span>Stage {me?.currentPhase} Completed</span>
                </div>
                {availableExtraMelds.length > 0 && isMyTurn && gameState.turnStage === 'play' && (
                  <button
                    type="button"
                    onClick={() => onLayExtraMeld(availableExtraMelds[0].cards.map(c => c.id))}
                    className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow hover:scale-105 cursor-pointer transition-all animate-pulse"
                  >
                    + Lay {availableExtraMelds[0].label}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Toolbar above hand */}
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/15 shadow-xl">
          <button
            type="button"
            onClick={() => setLocalHand(sortCardsByValue(localHand))}
            className="px-2.5 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-neutral-200 cursor-pointer transition-colors font-medium"
          >
            Sort: Value
          </button>
          <button
            type="button"
            onClick={() => setLocalHand(sortCardsByColor(localHand))}
            className="px-2.5 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-neutral-200 cursor-pointer transition-colors font-medium"
          >
            Sort: Color
          </button>

          {selectedCard && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-neutral-400 hover:text-white text-xs underline ml-1 cursor-pointer"
            >
              Deselect
            </button>
          )}

          {/* Discard Selected Card button */}
          {isMyTurn && gameState.turnStage !== 'draw' && (
            <button
              type="button"
              onClick={handleDiscardSelected}
              disabled={!selectedCard}
              className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all shadow-md ${
                selectedCard
                  ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white hover:scale-105 cursor-pointer shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              Discard Selected Card
            </button>
          )}
        </div>

        {/* Client Hand: Curved Arc in Perspective (Scaled Up) */}
        <div className="w-full max-w-5xl px-4 flex items-end justify-center overflow-visible pb-1 pt-4">
          <div className="flex items-end justify-center">
            {localHand.map((c, i) => {
              const count = localHand.length;
              const offset = i - (count - 1) / 2;
              const rot = Math.max(-14, Math.min(14, offset * (count > 12 ? 1.6 : 2.2)));
              const translateY = Math.abs(offset) * (count > 12 ? 1.4 : 2.0);
              const isSelected = selectedCardId === c.id;

              return (
                <div
                  key={c.id}
                  data-card-id={c.id}
                  style={{
                    transform: `rotate(${rot}deg) translateY(${isSelected ? -34 : translateY}px)`,
                    zIndex: isSelected ? 40 : i + 1,
                    marginLeft: i === 0 ? 0 : count > 12 ? '-52px' : count > 8 ? '-44px' : '-32px'
                  }}
                  className={`transition-all duration-200 cursor-pointer shrink-0 hover:-translate-y-8 hover:z-35 ${
                    isSelected ? 'scale-110 drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]' : ''
                  }`}
                  onClick={() => handleCardClick(c)}
                >
                  <CardView card={c} size="lg" isSelected={isSelected} isSelectable={true} />
                </div>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
};
