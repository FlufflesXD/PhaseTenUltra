import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  GameNotification,
  LaidDownPhaseGroup,
  PublicGameState,
  GameActionEvent,
  findValidPhaseCombination,
  sortCardsByColor,
  sortCardsByValue,
  sortGroupCards,
  validateColorGroup,
  validateHit,
  validatePhase,
  validateRun,
  validateSet
} from '@phase-ten/shared';
import { CardView } from './CardView.js';
import { PhaseHelperDrawer } from './PhaseHelperDrawer.js';

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
  const [localHand, setLocalHand] = useState<Card[]>(hand);
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

  const deckRef = useRef<HTMLButtonElement | null>(null);
  const discardRef = useRef<HTMLDivElement | null>(null);
  const opponentsBarRef = useRef<HTMLElement | null>(null);
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
      // Source is deck or discard pile
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
        targetCoords = getCenterCoords(oppEl) || getCenterCoords(opponentsBarRef.current);
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
      setDiscardKey(prev => prev + 1);

      // Target is always the center of the discard pile
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
        startCoords = getCenterCoords(oppEl) || getCenterCoords(opponentsBarRef.current);
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

      if (isMe) {
        startCoords = getCenterCoords(handRef.current);
      } else {
        const oppEl = document.querySelector(`[data-opponent-id="${latestAction.playerId}"]`);
        startCoords = getCenterCoords(oppEl) || getCenterCoords(opponentsBarRef.current);
      }
      startScale = 0.85;
      targetScale = 0.75;
    }

    if (startCoords && targetCoords) {
      setActiveFlyingCard({
        id: `${latestAction.id}_${Date.now()}`,
        card: latestAction.card,
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
  const opponents = isSpectator ? gameState.players : gameState.players.filter(p => p.id !== secretToken);
  const botPlayers = gameState.players.filter(p => p.isBot || !p.connected);
  const currentPhaseDef = gameState.phaseDefinitions.find(p => p.phaseNumber === me?.currentPhase);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return localHand.find(c => c.id === selectedCardId) ?? null;
  }, [localHand, selectedCardId]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(gameState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${gameState.roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCardClick = (card: Card) => {
    // Single-select: clicking the active card unselects it, clicking another card selects it instead
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

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col justify-between p-3 select-none">
      {/* 1. Header */}
      <header className="border-b border-neutral-800 pb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={copyInviteLink}
            title="Click to copy invite link"
            className="border border-neutral-700 px-2 py-1 rounded hover:bg-neutral-900 cursor-pointer flex items-center gap-1.5"
          >
            <span>🔗</span>
            <span>{copiedLink ? 'Link Copied!' : `Room: ${gameState.roomCode}`}</span>
          </button>
          <span className="text-[10px] text-neutral-500 border border-neutral-800 px-1 py-0.5 rounded">v3.4</span>
          <span>Round {gameState.roundNumber}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-neutral-300">
            {gameState.playDirection === -1 ? '↺ CCW' : '↻ CW'}
          </span>
          {gameState.settings?.gameMode && gameState.settings.gameMode !== 'classic' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-800 bg-amber-950 text-amber-300 uppercase">
              {gameState.settings.gameMode}
            </span>
          )}
          {gameState.waitlist && gameState.waitlist.length > 0 && (
            <span className="text-[10px] text-neutral-400 border border-neutral-800 px-1.5 py-0.5 rounded">
              Waitlist: {gameState.waitlist.map(w => w.name).join(', ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isMyTurn ? (
            <span className="bg-white text-black font-bold px-2 py-0.5 rounded">
              YOUR TURN ({gameState.turnStage.toUpperCase()})
            </span>
          ) : (
            <span className="text-neutral-400">
              Turn: {gameState.players.find(p => p.id === gameState.currentTurnPlayerId)?.name}
            </span>
          )}

          {gameState.turnTimeRemaining > 0 && (
            <span className="text-neutral-400">({gameState.turnTimeRemaining}s)</span>
          )}

          <button
            onClick={onOpenRules}
            className="text-neutral-400 hover:text-white underline cursor-pointer"
          >
            Rules
          </button>
        </div>
      </header>

      {/* Visual Flying Card Animation Layer (Exact Element Coordinates) */}
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
            <div className="w-20 h-28 sm:w-24 sm:h-34 rounded border border-neutral-700 overflow-hidden bg-neutral-900 shadow-2xl">
              <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* Waitlist Banner for Spectators */}
      {isSpectator && (
        <div className="bg-neutral-900 border border-neutral-700 p-2.5 rounded my-2 text-center text-xs space-y-1.5">
          <div className="text-white font-bold flex items-center justify-center gap-2">
            <span>👀 MATCH IN PROGRESS — YOU ARE ON THE WAITLIST</span>
          </div>
          <p className="text-neutral-400 text-[11px]">
            You are in the lobby with this room and will join the next match when this round/match finishes.
          </p>
          {botPlayers.length > 0 && onClaimSeat && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="text-neutral-300 font-bold">Disconnected player available:</span>
              {botPlayers.map(bot => (
                <button
                  key={bot.id}
                  onClick={() => onClaimSeat(bot.id)}
                  className="bg-white text-black font-bold px-3 py-1 rounded text-xs border border-white hover:bg-neutral-200 cursor-pointer shadow"
                >
                  Take Back Seat: {bot.name} (Stage {bot.currentPhase})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Opponents Bar */}
      <section ref={opponentsBarRef} className="py-2 flex items-center justify-center gap-2 overflow-x-auto">
        {opponents.map(opp => {
          const isOppTurn = gameState.currentTurnPlayerId === opp.id;
          return (
            <div
              key={opp.id}
              data-opponent-id={opp.id}
              className={`border p-2 rounded text-xs min-w-[130px] ${
                isOppTurn ? 'border-white bg-neutral-900 font-bold' : 'border-neutral-800 bg-neutral-950'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <span>{opp.name}</span>
                  {opp.isBot && (
                    <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1 py-0.2 rounded border border-neutral-700 font-normal">
                      [BOT]
                    </span>
                  )}
                </span>
                {opp.isSkipped && <span className="text-neutral-400">[SKIPPED]</span>}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1 flex justify-between">
                <span>S{opp.currentPhase} {opp.phaseCompletedInRound && '✓'}</span>
                <span>{opp.cardCount} cards ({opp.score}pts)</span>
              </div>
              {isSpectator && opp.isBot && onClaimSeat && (
                <button
                  onClick={() => onClaimSeat(opp.id)}
                  className="w-full mt-1.5 bg-white text-black text-[10px] font-bold py-0.5 rounded hover:bg-neutral-200 cursor-pointer"
                >
                  Take Over Seat
                </button>
              )}
            </div>
          );
        })}
      </section>

      {/* 3. Center Table (Draw, Discard, Laid Down Phases) */}
      <section className="flex-1 flex flex-col items-center justify-center my-2 gap-4">
        {/* Draw & Discard */}
        <div className="flex items-center gap-6 border border-neutral-800 p-4 rounded bg-neutral-950">
          {/* Draw Pile */}
          <div className="flex flex-col items-center">
            <button
              ref={deckRef}
              onClick={() => handleDraw('deck')}
              disabled={!isMyTurn || gameState.turnStage !== 'draw'}
              className={`relative w-20 h-28 sm:w-24 sm:h-34 border rounded flex flex-col items-center justify-center text-xs p-2 transition-colors overflow-hidden ${
                isMyTurn && gameState.turnStage === 'draw'
                  ? 'border-white bg-neutral-900 hover:bg-neutral-800 cursor-pointer font-bold'
                  : 'border-neutral-800 bg-black text-neutral-600 cursor-default'
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
                  <div className="absolute top-1 right-1 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded font-bold">
                    {gameState.drawPileCount}
                  </div>
                  {isMyTurn && gameState.turnStage === 'draw' && (
                    <div className="absolute bottom-1 bg-white text-black text-[9px] px-1.5 py-0.5 rounded font-bold">
                      DRAW
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>DECK</div>
                  <div className="text-[10px] mt-1">({gameState.drawPileCount})</div>
                  {isMyTurn && gameState.turnStage === 'draw' && (
                    <div className="text-[9px] mt-2 underline">DRAW</div>
                  )}
                </>
              )}
            </button>
            <span className="text-[10px] text-neutral-500 mt-1">Draw Pile</span>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center">
            <div ref={discardRef} className="relative">
              {gameState.topDiscard ? (
                <div
                  key={`${gameState.topDiscard.id}_${discardKey}`}
                  onClick={() => {
                    if (isMyTurn && gameState.turnStage === 'draw') {
                      if (gameState.topDiscard?.type !== 'skip' && gameState.topDiscard?.type !== 'wild') {
                        handleDraw('discard');
                      }
                    } else if (isMyTurn && selectedCard && gameState.turnStage !== 'draw') {
                      handleDiscardSelected();
                    }
                  }}
                  className={`animate-card-land ${
                    isMyTurn && ((gameState.turnStage === 'draw' && gameState.topDiscard?.type !== 'skip' && gameState.topDiscard?.type !== 'wild') || selectedCard)
                      ? 'cursor-pointer'
                      : ''
                  }`}
                >
                  <CardView card={gameState.topDiscard} size="lg" isSelectable={false} />
                </div>
              ) : (
                <div className="w-20 h-28 sm:w-24 sm:h-34 border border-dashed border-neutral-800 rounded flex items-center justify-center text-xs text-neutral-600">
                  Empty
                </div>
              )}
            </div>
            <span className="text-[10px] text-neutral-500 mt-1">Discard Pile</span>
          </div>
        </div>

        {/* Laid Down Phases on Table */}
        {gameState.allLaidDownPhases.length > 0 && (
          <div className="w-full max-w-2xl border border-neutral-800 p-2.5 rounded bg-neutral-950 text-xs">
            <div className="text-[10px] text-neutral-500 uppercase mb-1.5 flex justify-between items-center">
              <span>Completed Stages on Table</span>
              {me?.phaseCompletedInRound && (
                <span className="text-neutral-400">Select card in hand to hit matching groups</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {gameState.allLaidDownPhases.map(group => {
                const sortedCards = sortGroupCards(group.cards, group.type, group.runMin, group.runMax);
                const min = group.runMin ?? 1;
                const max = group.runMax ?? 12;
                const isRun = group.type === 'run';
                const isWildSelected = selectedCard?.type === 'wild';

                const canHitSingle =
                  me?.phaseCompletedInRound &&
                  isMyTurn &&
                  gameState.turnStage === 'play' &&
                  selectedCard &&
                  validateHit(selectedCard, group);

                const allMatchingInHand =
                  me?.phaseCompletedInRound && isMyTurn && gameState.turnStage === 'play'
                    ? localHand.filter(c => validateHit(c, group))
                    : [];

                const groupTitle =
                  group.type === 'set'
                    ? `${group.playerName}'s Set of ${group.targetValue}s`
                    : group.type === 'run'
                    ? `${group.playerName}'s Run (${min}-${max})`
                    : `${group.playerName}'s ${group.targetColor?.toUpperCase()} Group`;

                return (
                  <div
                    key={group.id}
                    data-group-id={group.id}
                    onClick={() => handleTableGroupClick(group)}
                    className={`border p-2 rounded flex flex-col gap-1.5 transition-all animate-card-deal ${
                      canHitSingle
                        ? 'border-white bg-neutral-900 shadow-md ring-1 ring-white'
                        : allMatchingInHand.length > 0
                        ? 'border-neutral-700 bg-neutral-950 cursor-pointer hover:border-neutral-500'
                        : 'border-neutral-800 bg-black'
                    }`}
                  >
                    <div className="text-[10px] text-neutral-300 flex justify-between items-center gap-2">
                      <span className="font-bold">{groupTitle}</span>
                      <span className="text-[9px] text-neutral-500 uppercase">({group.cards.length} cards)</span>
                    </div>

                    <div className="flex gap-1 overflow-x-auto py-0.5">
                      {sortedCards.map((c, idx) => {
                        let badge: string | undefined = undefined;
                        if (isRun && c.type === 'wild') {
                          badge = `${min + idx}`;
                        }
                        return <CardView key={c.id} card={c} size="sm" isSelectable={false} badge={badge} />;
                      })}
                    </div>

                    {/* Explicit HIT Actions on Table */}
                    {canHitSingle && !isWildSelected && (
                      <div className="space-y-1 pt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onHitCard(selectedCard.id, group.id);
                            clearSelection();
                          }}
                          className="w-full bg-white text-black font-bold text-xs py-1 px-2 rounded hover:bg-neutral-200 cursor-pointer transition-colors"
                        >
                          HIT CARD ({selectedCard.value})
                        </button>
                      </div>
                    )}

                    {canHitSingle && isWildSelected && !isRun && (
                      <div className="space-y-1 pt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onHitCard(selectedCard.id, group.id);
                            clearSelection();
                          }}
                          className="w-full bg-white text-black font-bold text-xs py-1 px-2 rounded hover:bg-neutral-200 cursor-pointer transition-colors"
                        >
                          HIT WILD
                        </button>
                      </div>
                    )}

                    {canHitSingle && isWildSelected && isRun && (
                      <div className="space-y-1 pt-0.5">
                        {min > 1 && max < 12 ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onHitCard(selectedCard.id, group.id, 'low');
                                clearSelection();
                              }}
                              className="flex-1 bg-white text-black font-bold text-[10px] py-1 px-1 rounded hover:bg-neutral-200 cursor-pointer transition-colors text-center"
                            >
                              HIT AS {min - 1} (LOW)
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onHitCard(selectedCard.id, group.id, 'high');
                                clearSelection();
                              }}
                              className="flex-1 bg-white text-black font-bold text-[10px] py-1 px-1 rounded hover:bg-neutral-200 cursor-pointer transition-colors text-center"
                            >
                              HIT AS {max + 1} (HIGH)
                            </button>
                          </div>
                        ) : min > 1 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onHitCard(selectedCard.id, group.id, 'low');
                              clearSelection();
                            }}
                            className="w-full bg-white text-black font-bold text-xs py-1 px-2 rounded hover:bg-neutral-200 cursor-pointer transition-colors"
                          >
                            HIT WILD AS {min - 1} (LOW)
                          </button>
                        ) : max < 12 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onHitCard(selectedCard.id, group.id, 'high');
                              clearSelection();
                            }}
                            className="w-full bg-white text-black font-bold text-xs py-1 px-2 rounded hover:bg-neutral-200 cursor-pointer transition-colors"
                          >
                            HIT WILD AS {max + 1} (HIGH)
                          </button>
                        ) : null}
                      </div>
                    )}

                    {!selectedCard && allMatchingInHand.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCardId(allMatchingInHand[0].id);
                        }}
                        className="w-full text-neutral-400 hover:text-white text-[10px] py-0.5 border border-dashed border-neutral-700 rounded text-center cursor-pointer"
                      >
                        Select Matching Card ({allMatchingInHand.length} in hand)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 4. Player Hand & Actions */}
      <footer ref={handRef} className="space-y-2">
        <PhaseHelperDrawer
          hand={localHand}
          phaseDef={currentPhaseDef}
          hasLaidDown={me?.phaseCompletedInRound || false}
          isMyTurn={isMyTurn}
          turnStage={gameState.turnStage}
          allowPartialAndExtraSets={gameState.settings?.allowPartialAndExtraSets ?? true}
          onLayDown={onLayDownPhase}
          onLayExtraMeld={onLayExtraMeld}
        />

        <div className="border border-neutral-800 p-2.5 rounded bg-neutral-950 space-y-2">
          {/* Hand Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-neutral-900 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">Your Hand ({localHand.length})</span>
              <button
                type="button"
                onClick={() => setLocalHand(sortCardsByValue(localHand))}
                className="border border-neutral-700 px-2 py-0.5 rounded text-[11px] hover:bg-neutral-900 cursor-pointer"
              >
                Sort: Value
              </button>
              <button
                type="button"
                onClick={() => setLocalHand(sortCardsByColor(localHand))}
                className="border border-neutral-700 px-2 py-0.5 rounded text-[11px] hover:bg-neutral-900 cursor-pointer"
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

            {/* Action Buttons: Hit / Discard */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Discard Button (active only when 1 card selected) */}
              {isMyTurn && gameState.turnStage !== 'draw' && (
                <button
                  type="button"
                  onClick={handleDiscardSelected}
                  disabled={!selectedCard}
                  className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                    selectedCard
                      ? 'bg-white text-black border-white hover:bg-neutral-200 cursor-pointer'
                      : 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed'
                  }`}
                >
                  Discard Selected Card
                </button>
              )}
            </div>
          </div>

          {/* Cards Tray */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {localHand.map(c => (
              <div key={c.id} data-card-id={c.id} className="shrink-0">
                <CardView
                  card={c}
                  isSelected={selectedCardId === c.id}
                  isSelectable={true}
                  size="md"
                  onClick={() => handleCardClick(c)}
                />
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};
