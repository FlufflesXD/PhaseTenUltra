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
  validateHit
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

// 4 distinct Ubisoft UNO inspired stylized robot avatars
const RobotAvatar: React.FC<{ type: 'dusty' | 'luna' | 'pudding' | 'mecha'; isTurn: boolean }> = ({ type, isTurn }) => {
  if (type === 'dusty') {
    // Red/Orange robot with curved antenna & glowing eyes
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md">
        <circle cx="32" cy="10" r="4" fill="#f97316" />
        <line x1="32" y1="14" x2="32" y2="22" stroke="#ea580c" strokeWidth="3" />
        <rect x="14" y="22" width="36" height="30" rx="10" fill="#dc2626" stroke="#f87171" strokeWidth="2" />
        <rect x="18" y="28" width="28" height="15" rx="5" fill="#18181b" />
        <circle cx="26" cy="35" r="3.5" fill="#facc15" />
        <circle cx="38" cy="35" r="3.5" fill="#facc15" />
        <rect x="8" y="32" width="6" height="10" rx="2" fill="#ef4444" />
        <rect x="50" y="32" width="6" height="10" rx="2" fill="#ef4444" />
      </svg>
    );
  }
  if (type === 'luna') {
    // Purple/Gold celestial robot with star crown
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md">
        <polygon points="32,4 35,12 43,12 37,17 39,25 32,20 25,25 27,17 21,12 29,12" fill="#facc15" />
        <rect x="16" y="22" width="32" height="32" rx="12" fill="#7c3aed" stroke="#c084fc" strokeWidth="2" />
        <ellipse cx="32" cy="37" rx="12" ry="8" fill="#09090b" />
        <ellipse cx="27" cy="36" rx="3" ry="4" fill="#67e8f9" />
        <ellipse cx="37" cy="36" rx="3" ry="4" fill="#67e8f9" />
        <circle cx="28" cy="35" r="1" fill="#ffffff" />
        <circle cx="38" cy="35" r="1" fill="#ffffff" />
      </svg>
    );
  }
  if (type === 'pudding') {
    // Teal/Mint retro CRT monitor robot with bouncy antenna
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md">
        <circle cx="24" cy="8" r="3.5" fill="#34d399" />
        <line x1="24" y1="11" x2="32" y2="20" stroke="#059669" strokeWidth="2.5" />
        <rect x="12" y="20" width="40" height="32" rx="6" fill="#0d9488" stroke="#5eead4" strokeWidth="2" />
        <rect x="17" y="25" width="30" height="20" rx="4" fill="#042f2e" />
        <circle cx="26" cy="34" r="3" fill="#a7f3d0" />
        <circle cx="38" cy="34" r="3" fill="#a7f3d0" />
        <path d="M 28 41 Q 32 44 36 41" stroke="#a7f3d0" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  // Mecha / UNOLover: Cyber Blue/White robot with glowing visor
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md">
      <polygon points="32,6 38,18 26,18" fill="#38bdf8" />
      <rect x="14" y="20" width="36" height="34" rx="8" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
      <rect x="18" y="28" width="28" height="11" rx="4" fill="#082f49" />
      <rect x="20" y="31" width="24" height="5" rx="2" fill="#38bdf8" />
      <circle cx="10" cy="36" r="3" fill="#0284c7" />
      <circle cx="54" cy="36" r="3" fill="#0284c7" />
    </svg>
  );
};

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
  const [showPhaseDrawer, setShowPhaseDrawer] = useState(false);
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

  // Render an opponent station (Avatar, Nameplate, Card count pill, and 3D fanned cards with reflection)
  const renderOpponentStation = (
    player: PlayerPublic | null,
    position: 'left' | 'top' | 'right',
    avatarType: 'dusty' | 'luna' | 'pudding'
  ) => {
    if (!player) return null;
    const isPlayerTurn = gameState.currentTurnPlayerId === player.id;
    const cardCount = player.cardCount || 0;
    const visibleCardsCount = Math.min(cardCount, 14);

    if (position === 'top') {
      return (
        <div
          key={player.id}
          className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-20 pointer-events-auto select-none"
        >
          {/* Player Banner & Avatar */}
          <div className="flex items-center gap-2">
            <div
              className={`w-11 h-11 sm:w-13 sm:h-13 rounded-xl p-1 bg-neutral-950/80 border transition-all ${
                isPlayerTurn
                  ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                  : 'border-white/20'
              }`}
            >
              <RobotAvatar type={avatarType} isTurn={isPlayerTurn} />
            </div>

            <div className="flex flex-col">
              <div
                className={`px-2.5 py-0.5 rounded-t font-bold text-xs flex items-center gap-1.5 shadow ${
                  isPlayerTurn
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black'
                    : 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white'
                }`}
              >
                <span>{player.name}</span>
                {player.isBot && <span className="text-[9px] opacity-80">[BOT]</span>}
                {player.isSkipped && <span className="text-[9px] text-red-300 font-bold">[SKIPPED]</span>}
              </div>
              <div className="bg-black/70 border border-t-0 border-white/10 px-2 py-0.5 rounded-b text-[10px] text-neutral-300 flex items-center justify-between gap-2">
                <span>Stage {player.currentPhase} {player.phaseCompletedInRound ? '✓' : ''}</span>
                {isPlayerTurn && gameState.turnTimeRemaining > 0 && (
                  <span className="text-amber-400 font-bold">({gameState.turnTimeRemaining}s)</span>
                )}
              </div>
            </div>

            {/* Card count pill */}
            <div className="flex items-center gap-1 bg-white/95 text-black px-2 py-1 rounded-lg font-bold text-xs shadow-lg border border-neutral-300">
              <span className="text-[11px]">🂠</span>
              <span>{cardCount}</span>
            </div>

            {isSpectator && player.isBot && onClaimSeat && (
              <button
                onClick={() => onClaimSeat(player.id)}
                className="bg-white text-black text-[9px] font-bold px-2 py-1 rounded hover:bg-neutral-200 cursor-pointer shadow"
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
                    marginLeft: i === 0 ? 0 : '-38px',
                    zIndex: i + 1
                  }}
                  className="w-12 h-18 sm:w-14 sm:h-20 rounded-md border border-neutral-700/80 overflow-hidden bg-neutral-900 shadow-xl shrink-0"
                >
                  <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (position === 'left') {
      return (
        <div
          key={player.id}
          className="absolute left-3 sm:left-6 top-[32%] sm:top-[30%] flex flex-col items-start gap-2 z-20 pointer-events-auto select-none"
        >
          {/* Player Banner & Avatar */}
          <div className="flex items-center gap-2">
            <div
              className={`w-11 h-11 sm:w-13 sm:h-13 rounded-xl p-1 bg-neutral-950/80 border transition-all ${
                isPlayerTurn
                  ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                  : 'border-white/20'
              }`}
            >
              <RobotAvatar type={avatarType} isTurn={isPlayerTurn} />
            </div>

            <div className="flex flex-col">
              <div
                className={`px-2.5 py-0.5 rounded-t font-bold text-xs flex items-center gap-1.5 shadow ${
                  isPlayerTurn
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black'
                    : 'bg-gradient-to-r from-sky-600 to-cyan-500 text-white'
                }`}
              >
                <span>{player.name}</span>
                {player.isBot && <span className="text-[9px] opacity-80">[BOT]</span>}
                {player.isSkipped && <span className="text-[9px] text-red-300 font-bold">[SKIPPED]</span>}
              </div>
              <div className="bg-black/70 border border-t-0 border-white/10 px-2 py-0.5 rounded-b text-[10px] text-neutral-300 flex items-center justify-between gap-2">
                <span>Stage {player.currentPhase} {player.phaseCompletedInRound ? '✓' : ''}</span>
                {isPlayerTurn && gameState.turnTimeRemaining > 0 && (
                  <span className="text-amber-400 font-bold">({gameState.turnTimeRemaining}s)</span>
                )}
              </div>
            </div>

            {/* Card count pill */}
            <div className="flex items-center gap-1 bg-white/95 text-black px-2 py-1 rounded-lg font-bold text-xs shadow-lg border border-neutral-300">
              <span className="text-[11px]">🂠</span>
              <span>{cardCount}</span>
            </div>

            {isSpectator && player.isBot && onClaimSeat && (
              <button
                onClick={() => onClaimSeat(player.id)}
                className="bg-white text-black text-[9px] font-bold px-2 py-1 rounded hover:bg-neutral-200 cursor-pointer shadow"
              >
                Take Seat
              </button>
            )}
          </div>

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
                  className="w-13 h-19 sm:w-15 sm:h-22 rounded-md border border-neutral-700/80 overflow-hidden bg-neutral-900 shadow-xl"
                >
                  <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Right opponent
    return (
      <div
        key={player.id}
        className="absolute right-3 sm:right-6 top-[32%] sm:top-[30%] flex flex-col items-end gap-2 z-20 pointer-events-auto select-none"
      >
        {/* Player Banner & Avatar */}
        <div className="flex items-center gap-2">
          {isSpectator && player.isBot && onClaimSeat && (
            <button
              onClick={() => onClaimSeat(player.id)}
              className="bg-white text-black text-[9px] font-bold px-2 py-1 rounded hover:bg-neutral-200 cursor-pointer shadow"
            >
              Take Seat
            </button>
          )}

          {/* Card count pill */}
          <div className="flex items-center gap-1 bg-white/95 text-black px-2 py-1 rounded-lg font-bold text-xs shadow-lg border border-neutral-300">
            <span className="text-[11px]">🂠</span>
            <span>{cardCount}</span>
          </div>

          <div className="flex flex-col items-end">
            <div
              className={`px-2.5 py-0.5 rounded-t font-bold text-xs flex items-center gap-1.5 shadow ${
                isPlayerTurn
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white'
              }`}
            >
              <span>{player.name}</span>
              {player.isBot && <span className="text-[9px] opacity-80">[BOT]</span>}
              {player.isSkipped && <span className="text-[9px] text-red-300 font-bold">[SKIPPED]</span>}
            </div>
            <div className="bg-black/70 border border-t-0 border-white/10 px-2 py-0.5 rounded-b text-[10px] text-neutral-300 flex items-center justify-between gap-2">
              <span>Stage {player.currentPhase} {player.phaseCompletedInRound ? '✓' : ''}</span>
              {isPlayerTurn && gameState.turnTimeRemaining > 0 && (
                <span className="text-amber-400 font-bold">({gameState.turnTimeRemaining}s)</span>
              )}
            </div>
          </div>

          <div
            className={`w-11 h-11 sm:w-13 sm:h-13 rounded-xl p-1 bg-neutral-950/80 border transition-all ${
              isPlayerTurn
                ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                : 'border-white/20'
            }`}
          >
            <RobotAvatar type={avatarType} isTurn={isPlayerTurn} />
          </div>
        </div>

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
                className="w-13 h-19 sm:w-15 sm:h-22 rounded-md border border-neutral-700/80 overflow-hidden bg-neutral-900 shadow-xl"
              >
                <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-mono select-none flex flex-col justify-between">
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
            className="border border-white/20 bg-black/60 px-2.5 py-1 rounded hover:bg-white/10 cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <span>🔗</span>
            <span className="font-bold">{copiedLink ? 'Link Copied!' : `Room: ${gameState.roomCode}`}</span>
          </button>
          <span className="text-[10px] text-neutral-400 border border-white/10 px-1.5 py-0.5 rounded">v4.0</span>
          <span className="text-neutral-300 font-bold">Round {gameState.roundNumber}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-white/20 bg-neutral-900/80 text-cyan-300">
            {gameState.playDirection === -1 ? '↺ CCW' : '↻ CW'}
          </span>
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
            className="text-neutral-400 hover:text-white px-1.5 py-0.5 border border-white/10 rounded bg-black/40 text-xs cursor-pointer"
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
            <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-lg border border-neutral-700 overflow-hidden bg-neutral-900 shadow-2xl">
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
      {renderOpponentStation(leftPlayer, 'left', 'dusty')}
      {renderOpponentStation(topPlayer, 'top', 'luna')}
      {renderOpponentStation(rightPlayer, 'right', 'pudding')}

      {/* 6. Center Table Arena (Deck, Discard, Direction Arrows, Laid Down Stages) */}
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

          {/* Completed Stages on Table (Floating Glass Shelf directly above center piles) */}
          {gameState.allLaidDownPhases.length > 0 && (
            <div className="absolute -top-6 sm:-top-8 w-full max-w-xl px-2 z-20 pointer-events-auto">
              <div className="bg-black/75 backdrop-blur-md border border-white/20 p-2.5 rounded-xl shadow-2xl max-h-36 overflow-y-auto">
                <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1.5 flex justify-between items-center">
                  <span>Completed Stages on Table</span>
                  {me?.phaseCompletedInRound && isMyTurn && gameState.turnStage === 'play' && (
                    <span className="text-amber-300 font-normal">Click matching pile to HIT</span>
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
                        className={`border p-1.5 rounded-lg flex flex-col gap-1 transition-all pointer-events-auto ${
                          canHitSingle
                            ? 'border-amber-400 bg-amber-950/70 shadow-[0_0_12px_rgba(251,191,36,0.6)] cursor-pointer ring-1 ring-amber-300'
                            : 'border-white/20 bg-neutral-900/80 hover:border-white/40 cursor-pointer'
                        }`}
                      >
                        <div className="text-[9px] text-neutral-300 flex justify-between items-center gap-2">
                          <span className="font-bold">{groupTitle}</span>
                          <span className="text-neutral-500">({group.cards.length})</span>
                        </div>
                        <div className="flex items-center -space-x-4">
                          {sortedCards.map(c => (
                            <div key={c.id} className="shrink-0 scale-75 origin-left">
                              <CardView card={c} size="sm" isSelectable={false} />
                            </div>
                          ))}
                        </div>
                        {canHitSingle && (
                          <button
                            type="button"
                            className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[9px] font-extrabold py-0.5 px-1 rounded shadow"
                          >
                            HIT CARD HERE
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Draw & Discard Piles in the Arena Ring */}
          <div className="flex items-center gap-8 sm:gap-14 pointer-events-auto z-20">
            {/* Draw Pile (Upper-Left of Center) */}
            <div className="flex flex-col items-center">
              <button
                ref={deckRef}
                onClick={() => handleDraw('deck')}
                disabled={!isMyTurn || gameState.turnStage !== 'draw'}
                className={`relative w-20 h-28 sm:w-24 sm:h-34 rounded-lg flex flex-col items-center justify-center transition-transform deck-3d-stack overflow-hidden ${
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
                    <div className="absolute top-1.5 right-1.5 bg-black/85 text-white text-[10px] px-1.5 py-0.5 rounded font-bold border border-white/20">
                      {gameState.drawPileCount}
                    </div>
                    {isMyTurn && gameState.turnStage === 'draw' && (
                      <div className="absolute bottom-2 bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[10px] px-2 py-0.5 rounded font-extrabold shadow-lg">
                        DRAW
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="font-bold text-xs">DECK</div>
                    <div className="text-[10px] text-neutral-400">({gameState.drawPileCount})</div>
                  </>
                )}
              </button>
              <span className="text-[10px] text-neutral-400 font-bold mt-1.5 drop-shadow">Draw Pile</span>
            </div>

            {/* Discard Pile (Bottom-Center of Arena) */}
            <div className="flex flex-col items-center">
              <div
                ref={discardRef}
                className="relative w-20 h-28 sm:w-24 sm:h-34 discard-3d-shadow rounded-lg"
              >
                {/* Peek previous card underneath for realistic physical table feel */}
                {gameState.discardHistory && gameState.discardHistory.length > 1 && (
                  <div
                    className="absolute inset-0 rounded-lg overflow-hidden border border-neutral-800 pointer-events-none opacity-60"
                    style={{ transform: 'rotate(-9deg) translate(-3px, 2px)' }}
                  >
                    <CardView card={gameState.discardHistory[gameState.discardHistory.length - 2]} size="lg" isSelectable={false} />
                  </div>
                )}

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
                    className={`relative z-10 animate-card-land ${
                      isMyTurn &&
                      ((gameState.turnStage === 'draw' && gameState.topDiscard?.type !== 'skip' && gameState.topDiscard?.type !== 'wild') ||
                        selectedCard)
                        ? 'cursor-pointer hover:scale-105'
                        : ''
                    }`}
                  >
                    <CardView card={gameState.topDiscard} size="lg" isSelectable={false} />
                  </div>
                ) : (
                  <div className="w-full h-full border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center text-xs text-neutral-400 bg-black/40">
                    Empty
                  </div>
                )}
              </div>
              <span className="text-[10px] text-neutral-400 font-bold mt-1.5 drop-shadow">Discard Pile</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Client Station & Hand (Bottom) */}
      <footer ref={handRef} className="relative z-30 pb-3 pointer-events-auto flex flex-col items-center select-none">
        {/* Client Avatar & Nameplate (Bottom Left) */}
        {me && (
          <div className="absolute left-3 sm:left-8 bottom-3 sm:bottom-4 flex items-center gap-2 z-40">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl p-1 bg-neutral-950/80 border transition-all ${
                isMyTurn
                  ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                  : 'border-white/20'
              }`}
            >
              <RobotAvatar type="mecha" isTurn={isMyTurn} />
            </div>

            <div className="flex flex-col">
              <div
                className={`px-3 py-0.5 rounded-t font-extrabold text-xs flex items-center gap-1.5 shadow ${
                  isMyTurn
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                }`}
              >
                <span>{me.name} (You)</span>
                {me.isSkipped && <span className="text-[9px] text-red-300 font-bold">[SKIPPED]</span>}
              </div>
              <div className="bg-black/70 border border-t-0 border-white/10 px-2.5 py-0.5 rounded-b text-[10px] text-neutral-200 flex items-center justify-between gap-2">
                <span>Stage {me.currentPhase} {me.phaseCompletedInRound ? '✓' : ''}</span>
              </div>
            </div>

            {/* Card Count Pill */}
            <div className="flex items-center gap-1 bg-white/95 text-black px-2.5 py-1 rounded-lg font-extrabold text-xs shadow-lg border border-neutral-300">
              <span className="text-[11px]">🂠</span>
              <span>{localHand.length}</span>
            </div>
          </div>
        )}

        {/* Action Toolbar above hand */}
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/15 shadow-xl">
          <button
            type="button"
            onClick={() => setLocalHand(sortCardsByValue(localHand))}
            className="px-2.5 py-0.5 rounded text-[11px] bg-white/10 hover:bg-white/20 text-neutral-200 cursor-pointer transition-colors"
          >
            Sort: Value
          </button>
          <button
            type="button"
            onClick={() => setLocalHand(sortCardsByColor(localHand))}
            className="px-2.5 py-0.5 rounded text-[11px] bg-white/10 hover:bg-white/20 text-neutral-200 cursor-pointer transition-colors"
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

          {/* Discard Selected Card button */}
          {isMyTurn && gameState.turnStage !== 'draw' && (
            <button
              type="button"
              onClick={handleDiscardSelected}
              disabled={!selectedCard}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-md ${
                selectedCard
                  ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white hover:scale-105 cursor-pointer shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              Discard Selected Card
            </button>
          )}

          {/* Stage helper drawer toggle */}
          {currentPhaseDef && (
            <button
              type="button"
              onClick={() => setShowPhaseDrawer(!showPhaseDrawer)}
              className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:scale-105 cursor-pointer shadow transition-all"
            >
              {showPhaseDrawer ? 'Hide Stage Drawer' : `Stage ${me?.currentPhase} Helper`}
            </button>
          )}
        </div>

        {/* Phase Helper Drawer (expandable) */}
        {showPhaseDrawer && (
          <div className="w-full max-w-2xl mb-2">
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
          </div>
        )}

        {/* Client Hand: Curved Arc in Perspective */}
        <div className="w-full max-w-4xl px-4 flex items-end justify-center overflow-visible pb-1 pt-4">
          <div className="flex items-end justify-center">
            {localHand.map((c, i) => {
              const count = localHand.length;
              const offset = i - (count - 1) / 2;
              const rot = Math.max(-14, Math.min(14, offset * (count > 12 ? 1.8 : 2.5)));
              const translateY = Math.abs(offset) * (count > 12 ? 1.4 : 2.0);
              const isSelected = selectedCardId === c.id;

              return (
                <div
                  key={c.id}
                  data-card-id={c.id}
                  style={{
                    transform: `rotate(${rot}deg) translateY(${isSelected ? -30 : translateY}px)`,
                    zIndex: isSelected ? 40 : i + 1,
                    marginLeft: i === 0 ? 0 : count > 12 ? '-42px' : count > 8 ? '-36px' : '-28px'
                  }}
                  className={`transition-all duration-200 cursor-pointer shrink-0 hover:-translate-y-8 hover:z-35 ${
                    isSelected ? 'scale-110 drop-shadow-[0_0_18px_rgba(255,255,255,0.9)]' : ''
                  }`}
                  onClick={() => handleCardClick(c)}
                >
                  <CardView card={c} size="md" isSelected={isSelected} isSelectable={true} />
                </div>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
};
