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
  findSingleRequirementMatch,
  isChaosSpecialCard,
  isUltimateCard,
  UltimateCardType
} from '@phase-ten/shared';
import { CardView } from './CardView.js';
import { playSpecialSound } from '../utils/audio.js';

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
  onDiscardCard: (cardId: string, targetPlayerId?: string, activateAbility?: boolean) => void;
  onAdminSpawnCard?: (cardName: string, password: string, callback?: (res: any) => void) => void;
  onSacrificeCard?: (cardIdToSacrifice: string, ultimateCardId: string, callback?: (res: any) => void) => void;
  onPlayUltimateCard?: (ultimateCardId: string, callback?: (res: any) => void) => void;
  onResign: () => void;
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
  onAdminSpawnCard,
  onSacrificeCard,
  onPlayUltimateCard,
  onResign,
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
  const [nukeActive, setNukeActive] = useState(false);
  const [activeTotem, setActiveTotem] = useState<{
    type: string;
    image: string;
    title: string;
    playerName: string;
  } | null>(null);
  const [timeWarpEvent, setTimeWarpEvent] = useState<{
    sourceName: string;
    targetName: string;
    result: 'green' | 'red';
    oldPhase: number;
    newPhase: number;
  } | null>(null);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [isInfoTabOpen, setIsInfoTabOpen] = useState(false);
  const [isInfoPinned, setIsInfoPinned] = useState(false);

  // Admin spawner state
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminSpawner, setShowAdminSpawner] = useState(false);
  const [adminCardInput, setAdminCardInput] = useState('');
  const [adminSpawnFeedback, setAdminSpawnFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  // Ultimate Animations state
  const [divineDescentEvent, setDivineDescentEvent] = useState<{
    card: Card;
    playerName: string;
    ultType: string;
  } | null>(null);
  const [dimensionFadeActive, setDimensionFadeActive] = useState(false);

  const lastSoundActionIdRef = useRef<string | null>(null);

  const totemTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nukeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeWarpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const crackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flyingCardTimerRef = useRef<NodeJS.Timeout | null>(null);
  const divineDescentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dimensionFadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (totemTimerRef.current) clearTimeout(totemTimerRef.current);
      if (nukeTimerRef.current) clearTimeout(nukeTimerRef.current);
      if (timeWarpTimerRef.current) clearTimeout(timeWarpTimerRef.current);
      if (crackTimerRef.current) clearTimeout(crackTimerRef.current);
      if (flyingCardTimerRef.current) clearTimeout(flyingCardTimerRef.current);
      if (divineDescentTimerRef.current) clearTimeout(divineDescentTimerRef.current);
      if (dimensionFadeTimerRef.current) clearTimeout(dimensionFadeTimerRef.current);
    };
  }, []);

  // Global Shift + L key listener for Admin Spawner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        if (!isAdminAuthenticated) {
          setShowAdminPasswordModal(true);
        } else {
          setShowAdminSpawner(prev => !prev);
        }
      } else if (e.key === 'Escape') {
        setShowAdminPasswordModal(false);
        setShowAdminSpawner(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminAuthenticated]);

  const isDiscardOrSpecialAction = (type?: string) => {
    return (
      type === 'discard' ||
      type === 'skip' ||
      type === 'reverse' ||
      type === 'draw_two' ||
      type === 'nuke' ||
      type === 'jester' ||
      type === 'plus_two' ||
      type === 'plus_three' ||
      type === 'redo' ||
      type === 'time' ||
      type === 'number_eye' ||
      type === 'color_eye' ||
      type === 'random' ||
      type === 'crack' ||
      type === 'status' ||
      type === 'luck' ||
      type === 'unlucky' ||
      type === 'double' ||
      type === 'sacrifice' ||
      type === 'ultimate_descend'
    );
  };

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    // If a new discard action is pending or in flight, do NOT display the new top card yet!
    const isNewDiscardAction =
      latestAction &&
      lastHandledActionIdRef.current !== latestAction.id &&
      isDiscardOrSpecialAction(latestAction.type);

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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const lastHandledActionIdRef = useRef<string | null>(null);
  const selectedCardIdRef = useRef<string | null>(null);

  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);

  useEffect(() => {
    const updateScale = () => {
      const w = rootRef.current?.clientWidth || window.innerWidth;
      const h = rootRef.current?.clientHeight || window.innerHeight;
      const newScale = Math.min(w / 1920, h / 1080);
      setScale(newScale);
      scaleRef.current = newScale;
    };

    updateScale();
    window.addEventListener('resize', updateScale);

    let ro: ResizeObserver | null = null;
    if (rootRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateScale);
      ro.observe(rootRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    selectedCardIdRef.current = selectedCardId;
  }, [selectedCardId]);

  const getCenterCoords = (el: Element | null) => {
    if (!el || !tableRef.current) return null;
    const tableRect = tableRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    const currentScale = scaleRef.current || 1;
    return {
      x: (r.left + r.width / 2 - tableRect.left) / currentScale,
      y: (r.top + r.height / 2 - tableRect.top) / currentScale
    };
  };

  const me = gameState.players.find(p => p.id === secretToken);
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
        startCoords = getCenterCoords(discardRef.current) || { x: 1045, y: 535 };
      } else {
        startCoords = getCenterCoords(deckRef.current) || { x: 875, y: 535 };
      }

      if (isMe) {
        targetCoords = getCenterCoords(handRef.current) || { x: 960, y: 980 };
        startScale = 1;
        targetScale = 0.85;
        startRot = 0;
        targetRot = -4;
      } else {
        const oppEl =
          document.querySelector(`[data-opponent-id="${latestAction.playerId}"]`) ||
          document.querySelector(`[data-player-station="${latestAction.playerId}"]`) ||
          document.querySelector(`[data-station-header="${latestAction.playerId}"]`);
        let oppCoords = getCenterCoords(oppEl);
        if (!oppCoords) {
          if (topPlayer?.id === latestAction.playerId) oppCoords = { x: 960, y: 70 };
          else if (leftPlayer?.id === latestAction.playerId) oppCoords = { x: 140, y: 350 };
          else if (rightPlayer?.id === latestAction.playerId) oppCoords = { x: 1780, y: 350 };
          else oppCoords = { x: 960, y: 120 };
        }
        targetCoords = oppCoords;
        startScale = 1;
        targetScale = 0.65;
        startRot = 0;
        targetRot = 4;
      }
    } else if (isDiscardOrSpecialAction(latestAction.type)) {
      discardFlightActiveRef.current = true;
      // Hold previous discard on the pile while the new card is in the air
      const prevDiscard = gameState.discardHistory && gameState.discardHistory.length > 1
        ? gameState.discardHistory[gameState.discardHistory.length - 2]
        : null;
      setDisplayedDiscardCard(prevDiscard);
      targetCoords = getCenterCoords(discardRef.current) || { x: 1045, y: 535 };

      if (isMe) {
        let cardEl: Element | null = null;
        if (latestAction.card?.id) {
          cardEl = document.querySelector(`[data-card-id="${latestAction.card.id}"]`);
        }
        if (!cardEl && selectedCardIdRef.current) {
          cardEl = document.querySelector(`[data-card-id="${selectedCardIdRef.current}"]`);
        }
        startCoords = getCenterCoords(cardEl) || getCenterCoords(handRef.current) || { x: 960, y: 980 };
        startScale = 0.85;
        targetScale = 1;
        startRot = -3;
        targetRot = 0;
      } else {
        const oppEl =
          document.querySelector(`[data-opponent-id="${latestAction.playerId}"]`) ||
          document.querySelector(`[data-player-station="${latestAction.playerId}"]`) ||
          document.querySelector(`[data-station-header="${latestAction.playerId}"]`);
        let oppCoords = getCenterCoords(oppEl);
        if (!oppCoords) {
          if (topPlayer?.id === latestAction.playerId) oppCoords = { x: 960, y: 70 };
          else if (leftPlayer?.id === latestAction.playerId) oppCoords = { x: 140, y: 350 };
          else if (rightPlayer?.id === latestAction.playerId) oppCoords = { x: 1780, y: 350 };
          else oppCoords = { x: 960, y: 120 };
        }
        startCoords = oppCoords;
        startScale = 0.65;
        targetScale = 1;
        startRot = 4;
        targetRot = 0;
      }
    } else if (latestAction.type === 'hit') {
      const groupEl = latestAction.targetGroupId
        ? document.querySelector(`[data-group-id="${latestAction.targetGroupId}"]`)
        : null;
      targetCoords = getCenterCoords(groupEl) || getCenterCoords(discardRef.current) || { x: 960, y: 540 };

      const hitCard = latestAction.card || latestAction.cards?.[0];
      if (isMe) {
        let cardEl: Element | null = null;
        if (hitCard?.id) {
          cardEl = document.querySelector(`[data-card-id="${hitCard.id}"]`);
        }
        startCoords = getCenterCoords(cardEl) || getCenterCoords(handRef.current) || { x: 960, y: 980 };
        startScale = 0.85;
        targetScale = 0.75;
        startRot = -3;
        targetRot = 0;
      } else {
        const oppEl =
          document.querySelector(`[data-opponent-id="${latestAction.playerId}"]`) ||
          document.querySelector(`[data-player-station="${latestAction.playerId}"]`) ||
          document.querySelector(`[data-station-header="${latestAction.playerId}"]`);
        let oppCoords = getCenterCoords(oppEl);
        if (!oppCoords) {
          if (topPlayer?.id === latestAction.playerId) oppCoords = { x: 960, y: 70 };
          else if (leftPlayer?.id === latestAction.playerId) oppCoords = { x: 140, y: 350 };
          else if (rightPlayer?.id === latestAction.playerId) oppCoords = { x: 1780, y: 350 };
          else oppCoords = { x: 960, y: 120 };
        }
        startCoords = oppCoords;
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

      if (flyingCardTimerRef.current) {
        clearTimeout(flyingCardTimerRef.current);
        flyingCardTimerRef.current = null;
      }

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

      flyingCardTimerRef.current = setTimeout(() => {
        setActiveFlyingCard(null);
        flyingCardTimerRef.current = null;
        if (discardFlightActiveRef.current) {
          discardFlightActiveRef.current = false;
          setDiscardKey(prev => prev + 1);
          setDisplayedDiscardCard(gameStateRef.current.topDiscard);
        }
      }, 430);
    }
  }, [latestAction, secretToken, topPlayer?.id, leftPlayer?.id, rightPlayer?.id]);

  useEffect(() => {
    if (!latestAction || lastSoundActionIdRef.current === latestAction.id) return;
    lastSoundActionIdRef.current = latestAction.id;

    const SPECIAL_CARDS_MAP: Record<string, { image: string; title: string }> = {
      crack: { image: '/cards/custom/crack.png', title: 'Crack' },
      status: { image: '/cards/custom/status.png', title: 'Status' },
      luck: { image: '/cards/custom/luck.png', title: 'Luck' },
      unlucky: { image: '/cards/custom/unlucky.png', title: 'Unlucky' },
      double: { image: '/cards/custom/double.png', title: 'Double' },
      jester: { image: '/cards/custom/jester.png', title: 'Jester' },
      redo: { image: '/cards/custom/redo.png', title: 'Redo' },
      number_eye: { image: '/cards/custom/number_eye.png', title: 'Number Eye' },
      color_eye: { image: '/cards/custom/color_eye.png', title: 'Color Eye' },
      nuke: { image: '/cards/custom/nuke.png', title: 'Nuke' },
      time: { image: '/cards/custom/time.png', title: 'Time' },
      plus_two: { image: '/cards/custom/plus_two.png', title: '+2' },
      plus_three: { image: '/cards/custom/plus_three.png', title: '+3' },
      random: { image: '/cards/custom/random.png', title: 'Random' }
    };

    const specialInfo = SPECIAL_CARDS_MAP[latestAction.type];
    if (specialInfo) {
      if (totemTimerRef.current) clearTimeout(totemTimerRef.current);
      setActiveTotem({
        type: latestAction.type,
        image: specialInfo.image,
        title: specialInfo.title,
        playerName: latestAction.playerName
      });

      // Special card floats like a Totem of Undying for 2 seconds,
      // then sounds and follow-up custom animations execute:
      totemTimerRef.current = setTimeout(() => {
        setActiveTotem(null);
        totemTimerRef.current = null;

        if (!isMuted) {
          const soundTypes = [
            'nuke', 'jester', 'plus_two', 'plus_three', 'redo',
            'time', 'number_eye', 'color_eye', 'crack', 'status',
            'luck', 'unlucky', 'double'
          ];
          if (soundTypes.includes(latestAction.type)) {
            playSpecialSound(latestAction.type);
          }
        }

        const currentPlayers = gameStateRef.current.players;

        if (latestAction.type === 'crack') {
          if (crackTimerRef.current) clearTimeout(crackTimerRef.current);
          setIsScreenShaking(true);
          crackTimerRef.current = setTimeout(() => {
            setIsScreenShaking(false);
            crackTimerRef.current = null;
          }, 2000);
        } else if (latestAction.type === 'nuke') {
          if (nukeTimerRef.current) clearTimeout(nukeTimerRef.current);
          setNukeActive(true);
          nukeTimerRef.current = setTimeout(() => {
            setNukeActive(false);
            nukeTimerRef.current = null;
          }, 5000);
        } else if (latestAction.type === 'time') {
          if (timeWarpTimerRef.current) clearTimeout(timeWarpTimerRef.current);
          const targetName =
            currentPlayers.find(p => p.id === latestAction.targetPlayerId)?.name || 'Opponent';
          setTimeWarpEvent({
            sourceName: latestAction.playerName,
            targetName,
            result: latestAction.timeResult || 'green',
            oldPhase: latestAction.timeOldPhase ?? 2,
            newPhase: latestAction.timeNewPhase ?? (latestAction.timeResult === 'green' ? 1 : 3)
          });
          timeWarpTimerRef.current = setTimeout(() => {
            setTimeWarpEvent(null);
            timeWarpTimerRef.current = null;
          }, 5200);
        }
      }, 2000);
    }

    // Universal Divine Descent (5.5s)
    if (latestAction.type === 'ultimate_descend') {
      if (divineDescentTimerRef.current) clearTimeout(divineDescentTimerRef.current);
      setDivineDescentEvent({
        card: latestAction.card || { id: 'ult_card', type: (latestAction.ultimateCardType || 'singularity') as any, color: 'none', value: 0, points: 50 },
        playerName: latestAction.playerName,
        ultType: latestAction.ultimateCardType || 'singularity'
      });
      divineDescentTimerRef.current = setTimeout(() => {
        setDivineDescentEvent(null);
        divineDescentTimerRef.current = null;
      }, 5500);
    }

    // Alternate Dimension Entry or Shift (2s smooth black transition)
    if (latestAction.type === 'ultimate_alternate' || latestAction.type === 'alternate_shift') {
      if (dimensionFadeTimerRef.current) clearTimeout(dimensionFadeTimerRef.current);
      setDimensionFadeActive(true);
      dimensionFadeTimerRef.current = setTimeout(() => {
        setDimensionFadeActive(false);
        dimensionFadeTimerRef.current = null;
      }, 2000);
    }
  }, [latestAction, isMuted]);

  const prevRoundRef = useRef<number>(gameState.roundNumber);

  useEffect(() => {
    // When a new round starts, completely reset local hand with fresh dealt cards
    if (prevRoundRef.current !== gameState.roundNumber) {
      prevRoundRef.current = gameState.roundNumber;
      setLocalHand(hand.map(c => ({ ...c, isCracked: Boolean(c.isCracked) })));
      setSelectedCardId(null);
      return;
    }

    setLocalHand(prev => {
      const handMap = new Map(hand.map(c => [c.id, c]));
      const retained = prev
        .filter(c => handMap.has(c.id))
        .map(c => {
          const serverCard = handMap.get(c.id)!;
          return {
            ...c,
            ...serverCard,
            isCracked: Boolean(serverCard.isCracked)
          };
        });
      const added = hand
        .filter(c => !prev.some(p => p.id === c.id))
        .map(c => ({
          ...c,
          isCracked: Boolean(c.isCracked)
        }));
      return [...retained, ...added];
    });
    setSelectedCardId(prev => {
      if (!prev) return null;
      const matching = hand.find(c => c.id === prev);
      if (!matching) return null;
      if (matching.isCracked && !(hand.length === 1 && me?.phaseCompletedInRound)) return null;
      return prev;
    });
  }, [hand, gameState.roundNumber, me?.phaseCompletedInRound]);

  const isSpectator = !me || me.isSpectator;
  const isMyTurn = gameState.currentTurnPlayerId === secretToken;
  const botPlayers = gameState.players.filter(p => p.isBot || !p.connected);
  const currentPhaseDef = gameState.phaseDefinitions.find(p => p.phaseNumber === me?.currentPhase);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return localHand.find(c => c.id === selectedCardId) ?? null;
  }, [localHand, selectedCardId]);

  const isWinningSoftlockExemption = (card: Card) => {
    return Boolean(card.isCracked && localHand.length === 1 && me?.phaseCompletedInRound);
  };

  const isJesterSelected =
    selectedCard?.type === 'jester' &&
    isMyTurn &&
    (gameState.turnStage === 'play' || gameState.turnStage === 'discard');

  const isTimeSelected =
    selectedCard?.type === 'time' &&
    isMyTurn &&
    (gameState.turnStage === 'play' || gameState.turnStage === 'discard');

  const isNumberEyeSelected =
    selectedCard?.type === 'number_eye' &&
    isMyTurn &&
    (gameState.turnStage === 'play' || gameState.turnStage === 'discard');

  const isColorEyeSelected =
    selectedCard?.type === 'color_eye' &&
    isMyTurn &&
    (gameState.turnStage === 'play' || gameState.turnStage === 'discard');

  const isUnluckySelected =
    selectedCard?.type === 'unlucky' &&
    isMyTurn &&
    (gameState.turnStage === 'play' || gameState.turnStage === 'discard');

  const isDoubleSelected =
    selectedCard?.type === 'double' &&
    isMyTurn &&
    (gameState.turnStage === 'play' || gameState.turnStage === 'discard');

  const isPlusSelected =
    (selectedCard?.type === 'plus_two' || selectedCard?.type === 'draw_two' || selectedCard?.type === 'plus_three') &&
    isMyTurn &&
    (gameState.turnStage === 'play' || gameState.turnStage === 'discard');

  const unchargedUlt = useMemo(() => {
    return localHand.find(c => isUltimateCard(c.type) && (c.ultimateProgress ?? 0) < 100);
  }, [localHand]);

  const canSacrificeSelected = useMemo(() => {
    if (!selectedCard || !unchargedUlt) return false;
    if (!isMyTurn || (gameState.turnStage !== 'play' && gameState.turnStage !== 'discard')) return false;
    const isSpecial = isChaosSpecialCard(selectedCard.type) && !unchargedUlt.sacrificedSpecial;
    const isWildSkipRev =
      (selectedCard.type === 'wild' || selectedCard.type === 'skip' || selectedCard.type === 'reverse') &&
      !unchargedUlt.sacrificedWildSkipReverse;
    return isSpecial || isWildSkipRev;
  }, [selectedCard, unchargedUlt, isMyTurn, gameState.turnStage]);

  const isChargedUltimateSelected = useMemo(() => {
    if (!selectedCard || !isUltimateCard(selectedCard.type)) return false;
    return (selectedCard.ultimateProgress ?? 0) >= 100 && isMyTurn && (gameState.turnStage === 'play' || gameState.turnStage === 'discard');
  }, [selectedCard, isMyTurn, gameState.turnStage]);

  const opponents = useMemo(() => {
    return gameState.players.filter(p => p.id !== me?.id && !p.isSpectator);
  }, [gameState.players, me?.id]);

  const maxPhase = gameState.phaseDefinitions?.length || gameState.settings?.totalPhases || 10;

  const eligibleTimeTargets = useMemo(() => {
    return opponents.filter(p => p.currentPhase > 1 && p.currentPhase < maxPhase);
  }, [opponents, maxPhase]);

  const isSelfEligibleTimeTarget = Boolean(me && me.currentPhase > 1 && me.currentPhase < maxPhase);
  const hasEligibleTimeTargets = eligibleTimeTargets.length > 0;
  const hasAnyTimeTarget = hasEligibleTimeTargets || isSelfEligibleTimeTarget;

  const handleOpponentSwapClick = (targetPlayer: PlayerPublic) => {
    if (!isJesterSelected || !selectedCard) return;
    onDiscardCard(selectedCard.id, targetPlayer.id, true);
    clearSelection();
  };

  const handleOpponentTimeClick = (targetPlayer: PlayerPublic) => {
    if (!isTimeSelected || !selectedCard) return;
    if (targetPlayer.currentPhase <= 1 || targetPlayer.currentPhase >= maxPhase) return;
    onDiscardCard(selectedCard.id, targetPlayer.id, true);
    clearSelection();
  };

  const handleOpponentNumberEyeClick = (targetPlayer: PlayerPublic) => {
    if (!isNumberEyeSelected || !selectedCard) return;
    onDiscardCard(selectedCard.id, targetPlayer.id, true);
    clearSelection();
  };

  const handleOpponentColorEyeClick = (targetPlayer: PlayerPublic) => {
    if (!isColorEyeSelected || !selectedCard) return;
    onDiscardCard(selectedCard.id, targetPlayer.id, true);
    clearSelection();
  };

  const handleOpponentUnluckyClick = (targetPlayer: PlayerPublic) => {
    if (!isUnluckySelected || !selectedCard) return;
    onDiscardCard(selectedCard.id, targetPlayer.id, true);
    clearSelection();
  };

  const handleOpponentDoubleClick = (targetPlayer: PlayerPublic) => {
    if (!isDoubleSelected || !selectedCard) return;
    onDiscardCard(selectedCard.id, targetPlayer.id, true);
    clearSelection();
  };

  const handlePlusTargetClick = (targetPlayer: PlayerPublic) => {
    if (!isPlusSelected || !selectedCard) return;
    onDiscardCard(selectedCard.id, targetPlayer.id, true);
    clearSelection();
  };

  const handleSelfTargetClick = () => {
    if (!selectedCard || !me) return;
    if (isTimeSelected && isSelfEligibleTimeTarget) {
      onDiscardCard(selectedCard.id, me.id, true);
      clearSelection();
    } else if (isPlusSelected) {
      onDiscardCard(selectedCard.id, me.id, true);
      clearSelection();
    }
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${gameState.roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCardClick = (card: Card) => {
    if (me?.isResigned) return;
    if (card.isCracked && !isWinningSoftlockExemption(card)) return;
    setSelectedCardId(prev => (prev === card.id ? null : card.id));
  };

  const clearSelection = () => {
    setSelectedCardId(null);
  };

  const handleDraw = (source: 'deck' | 'discard') => {
    if (me?.isResigned || !isMyTurn || gameState.turnStage !== 'draw') return;
    if (source === 'discard' && gameState.topDiscard?.type !== 'number') return;
    onDrawCard(source);
  };

  const handleNormalDiscard = () => {
    if (me?.isResigned || !selectedCard || !isMyTurn || gameState.turnStage === 'draw') return;
    if (selectedCard.isCracked && !isWinningSoftlockExemption(selectedCard)) return;
    const isSpecial = isChaosSpecialCard(selectedCard.type);
    onDiscardCard(selectedCard.id, undefined, isSpecial ? false : true);
    clearSelection();
  };

  const handleDiscardSelected = (explicitTargetId?: string) => {
    if (!selectedCard || !isMyTurn || gameState.turnStage === 'draw') return;
    if (selectedCard.isCracked && !isWinningSoftlockExemption(selectedCard)) return;
    if (selectedCard.type === 'nuke' && !me?.phaseCompletedInRound) return;
    if (selectedCard.type === 'time') {
      const targetId = explicitTargetId || (eligibleTimeTargets.length > 0 ? eligibleTimeTargets[0].id : (isSelfEligibleTimeTarget ? me?.id : undefined));
      if (!targetId) return;
      onDiscardCard(selectedCard.id, targetId, true);
      clearSelection();
      return;
    }
    if (
      selectedCard.type === 'jester' ||
      selectedCard.type === 'number_eye' ||
      selectedCard.type === 'color_eye' ||
      selectedCard.type === 'unlucky' ||
      selectedCard.type === 'double' ||
      selectedCard.type === 'plus_two' ||
      selectedCard.type === 'draw_two' ||
      selectedCard.type === 'plus_three'
    ) {
      const targetId = explicitTargetId || (opponents.length > 0 ? opponents[0].id : me?.id);
      if (!targetId) return;
      onDiscardCard(selectedCard.id, targetId, true);
      clearSelection();
      return;
    }
    onDiscardCard(selectedCard.id, explicitTargetId, true);
    clearSelection();
  };

  const handleTableGroupClick = (group: LaidDownPhaseGroup, targetEnd?: 'low' | 'high') => {
    if (!isMyTurn || gameState.turnStage !== 'play' || !me?.phaseCompletedInRound) return;

    if (selectedCard && !selectedCard.isCracked && validateHit(selectedCard, group, targetEnd)) {
      onHitCard(selectedCard.id, group.id, targetEnd);
      clearSelection();
      return;
    }

    const matchingCard = localHand.find(c => !c.isCracked && validateHit(c, group));
    if (matchingCard) {
      setSelectedCardId(matchingCard.id);
    }
  };

  // Full combination check before phase is laid down
  const fullPhaseCombination = useMemo(() => {
    if (!currentPhaseDef || me?.phaseCompletedInRound) return null;
    const uncrackedHand = localHand.filter(c => !c.isCracked);
    return findValidPhaseCombination(uncrackedHand, currentPhaseDef);
  }, [localHand, currentPhaseDef, me?.phaseCompletedInRound]);

  // Extra meld / half rule checks after phase has been laid down
  const availableExtraMelds = useMemo(() => {
    if (!me?.phaseCompletedInRound || !currentPhaseDef || !(gameState.settings?.allowPartialAndExtraSets ?? true)) return [];
    let pool = localHand.filter(c => !c.isCracked);
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
        className={`relative border p-2 rounded-xl flex flex-col gap-1 transition-all pointer-events-auto shadow-2xl backdrop-blur-md shrink-0 select-none ${
          canHit
            ? 'border-amber-400 bg-amber-950/85 shadow-[0_0_18px_rgba(251,191,36,0.85)] cursor-pointer ring-2 ring-amber-300 animate-pulse'
            : 'border-white/20 bg-black/85 hover:border-white/40 cursor-pointer'
        }`}
      >
        <div className="text-xs text-neutral-200 flex justify-between items-center gap-2 font-bold px-1">
          <span>{groupTitle}</span>
          <span className="text-neutral-400 font-normal">({group.cards.length})</span>
        </div>
        <div className="flex items-center -space-x-8 overflow-visible py-0.5">
          {sortedCards.map(c => (
            <div key={c.id} className="shrink-0 hover:scale-105 hover:z-20 transition-transform">
              <CardView card={c} size="sm" isSelectable={false} />
            </div>
          ))}
        </div>
        {canHit && (
          <div className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-xs font-black py-1 px-1.5 rounded shadow text-center">
            HIT HERE
          </div>
        )}
      </div>
    );
  };

  const renderPlayerStatusBadges = (player: PlayerPublic) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      {player.hasNumberEyeEffect && (
        <span title="Number Blind" className="inline-flex items-center gap-1 bg-amber-950/80 text-amber-300 border border-amber-500/60 px-1.5 py-0.5 rounded text-[11px] font-bold">
          <img src="/status_effect_icons/number_eye.png" alt="Number Blind" className="w-3.5 h-3.5 object-contain" />
          <span>Number Blind</span>
        </span>
      )}
      {player.hasColorEyeEffect && (
        <span title="Color Blind" className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-300 border border-neutral-600 px-1.5 py-0.5 rounded text-[11px] font-bold">
          <img src="/status_effect_icons/color_eye.png" alt="Color Blind" className="w-3.5 h-3.5 object-contain" />
          <span>Color Blind</span>
        </span>
      )}
      {player.hasLuck && (
        <span title="2x Luck" className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 px-1.5 py-0.5 rounded text-[11px] font-bold animate-pulse">
          <img src="/status_effect_icons/luck.png" alt="Luck" className="w-3.5 h-3.5 object-contain" />
          <span>Luck</span>
        </span>
      )}
      {player.hasUnlucky && (
        <span title="Unlucky" className="inline-flex items-center gap-1 bg-rose-950/80 text-rose-300 border border-rose-500/60 px-1.5 py-0.5 rounded text-[11px] font-bold animate-pulse">
          <img src="/status_effect_icons/unlucky.png" alt="Unlucky" className="w-3.5 h-3.5 object-contain" />
          <span>Unlucky</span>
        </span>
      )}
      {player.hasDoubleDebuff && (
        <span title="Double Stage" className="inline-flex items-center gap-1 bg-purple-950/80 text-purple-300 border border-purple-500/60 px-1.5 py-0.5 rounded text-[11px] font-bold">
          <img src="/status_effect_icons/double.png" alt="Double" className="w-3.5 h-3.5 object-contain" />
          <span>Double</span>
        </span>
      )}
      {Boolean(player.crackedCardCount && player.crackedCardCount > 0) && (
        <span title={`${player.crackedCardCount} cracked card(s) locked`} className="inline-flex items-center gap-1 bg-stone-900/90 text-stone-300 border border-stone-500/80 px-1.5 py-0.5 rounded text-[11px] font-bold">
          <img src="/status_effect_icons/crack.png" alt="Cracked" className="w-3.5 h-3.5 object-contain" />
          <span>{player.crackedCardCount} Cracked</span>
        </span>
      )}
      {player.hasVoyanceDebuff && (
        <span title="Voyance Active" className="inline-flex items-center gap-1 bg-cyan-950/80 text-cyan-300 border border-cyan-500/60 px-1.5 py-0.5 rounded text-[11px] font-bold">
          <img src="/status_effect_icons/voyance.png" alt="Voyance" className="w-3.5 h-3.5 object-contain" />
          <span>Voyance</span>
        </span>
      )}
    </div>
  );

  // Render an opponent station (Nameplate, 3D fanned cards, and their laid melds)
  const renderOpponentStation = (
    player: PlayerPublic | null,
    position: 'left' | 'top' | 'right'
  ) => {
    if (!player) return null;
    const isPlayerTurn = gameState.currentTurnPlayerId === player.id;
    const cardCount = player.cardCount || 0;
    const visibleCardsCount = Math.min(10, cardCount);
    const isEligibleTimeTarget = isTimeSelected && player.currentPhase > 1 && player.currentPhase < maxPhase;
    const isImmuneTimeTarget = isTimeSelected && (player.currentPhase <= 1 || player.currentPhase >= maxPhase);
    const isTargetable =
      isJesterSelected ||
      isEligibleTimeTarget ||
      isNumberEyeSelected ||
      isColorEyeSelected ||
      isUnluckySelected ||
      isDoubleSelected ||
      isPlusSelected;

    const handleStationClick = () => {
      if (isJesterSelected) handleOpponentSwapClick(player);
      else if (isEligibleTimeTarget) handleOpponentTimeClick(player);
      else if (isNumberEyeSelected) handleOpponentNumberEyeClick(player);
      else if (isColorEyeSelected) handleOpponentColorEyeClick(player);
      else if (isUnluckySelected) handleOpponentUnluckyClick(player);
      else if (isDoubleSelected) handleOpponentDoubleClick(player);
      else if (isPlusSelected) handlePlusTargetClick(player);
    };

    const targetRingClass = isTargetable
      ? isJesterSelected
        ? 'ring-4 ring-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.95)] cursor-pointer hover:scale-105 animate-pulse'
        : isEligibleTimeTarget
        ? 'ring-4 ring-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.95)] cursor-pointer hover:scale-105 animate-pulse'
        : isNumberEyeSelected
        ? 'ring-4 ring-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.95)] cursor-pointer hover:scale-105 animate-pulse'
        : isColorEyeSelected
        ? 'ring-4 ring-neutral-400 shadow-[0_0_25px_rgba(200,200,200,0.95)] cursor-pointer hover:scale-105 animate-pulse'
        : isUnluckySelected
        ? 'ring-4 ring-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.95)] cursor-pointer hover:scale-105 animate-pulse'
        : isDoubleSelected
        ? 'ring-4 ring-purple-600 shadow-[0_0_25px_rgba(147,51,234,0.95)] cursor-pointer hover:scale-105 animate-pulse'
        : isPlusSelected
        ? 'ring-4 ring-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.95)] cursor-pointer hover:scale-105 animate-pulse'
        : ''
      : '';

    const targetCardBorderClass = isJesterSelected
      ? 'border-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]'
      : isEligibleTimeTarget
      ? 'border-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]'
      : isNumberEyeSelected
      ? 'border-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]'
      : isColorEyeSelected
      ? 'border-neutral-300 drop-shadow-[0_0_12px_rgba(200,200,200,0.8)]'
      : isUnluckySelected
      ? 'border-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]'
      : isDoubleSelected
      ? 'border-purple-400 drop-shadow-[0_0_12px_rgba(147,51,234,0.8)]'
      : isPlusSelected
      ? 'border-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.8)]'
      : 'border-neutral-600';

    const renderActionButtons = () => (
      <>
        {isJesterSelected && (
          <button
            type="button"
            onClick={handleStationClick}
            className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:brightness-125 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.9)] border border-white/60 animate-bounce cursor-pointer flex items-center gap-1 tracking-wider uppercase select-none transition-all shrink-0"
          >
            
            <span>Swap Hands!</span>
          </button>
        )}

        {isEligibleTimeTarget && (
          <button
            type="button"
            onClick={handleStationClick}
            className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:brightness-125 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.9)] border border-emerald-300 animate-bounce cursor-pointer flex items-center gap-1 tracking-wider uppercase select-none transition-all shrink-0"
          >
            <span>Time Warp!</span>
          </button>
        )}

        {isImmuneTimeTarget && (
          <div className="bg-neutral-900/90 text-neutral-400 border border-neutral-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 select-none pointer-events-none shrink-0">
            <span>Stage {player.currentPhase} Immune</span>
          </div>
        )}

        {isNumberEyeSelected && (
          <button
            type="button"
            onClick={handleStationClick}
            className="bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 hover:brightness-125 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.9)] border border-white/60 animate-bounce cursor-pointer flex items-center gap-1 tracking-wider uppercase select-none transition-all shrink-0"
          >
            <span>Blind Numbers!</span>
          </button>
        )}

        {isColorEyeSelected && (
          <button
            type="button"
            onClick={handleStationClick}
            className="bg-gradient-to-r from-neutral-600 via-stone-600 to-zinc-600 hover:brightness-125 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(163,163,163,0.9)] border border-white/60 animate-bounce cursor-pointer flex items-center gap-1 tracking-wider uppercase select-none transition-all shrink-0"
          >
            <span>Greyscale!</span>
          </button>
        )}

        {isUnluckySelected && (
          <button
            type="button"
            onClick={handleStationClick}
            className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:brightness-125 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.9)] border border-rose-300 animate-bounce cursor-pointer flex items-center gap-1 tracking-wider uppercase select-none transition-all shrink-0"
          >
            <span>Curse Bad Luck!</span>
          </button>
        )}

        {isDoubleSelected && (
          <button
            type="button"
            onClick={handleStationClick}
            className="bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-700 hover:brightness-125 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.9)] border border-purple-300 animate-bounce cursor-pointer flex items-center gap-1 tracking-wider uppercase select-none transition-all shrink-0"
          >
            <span>Double Stage!</span>
          </button>
        )}

        {isPlusSelected && (
          <button
            type="button"
            onClick={handleStationClick}
            className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 hover:brightness-125 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.9)] border border-indigo-300 animate-bounce cursor-pointer flex items-center gap-1 tracking-wider uppercase select-none transition-all shrink-0"
          >
            <span>Draw Cards!</span>
          </button>
        )}
      </>
    );

    if (position === 'top') {
      return (
        <div
          key={player.id}
          data-player-station={player.id}
          className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20 pointer-events-auto select-none max-w-[1200px]"
        >
          {/* Top Row: Player Banner & Action Option */}
          <div className="flex items-center gap-3">
            {/* Player Banner */}
            <div
              data-station-header={player.id}
              onClick={handleStationClick}
              className={`flex rounded-lg overflow-hidden border transition-all shrink-0 ${targetRingClass} ${
                isPlayerTurn
                  ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                  : 'border-white/20 shadow-lg'
              }`}
            >
              <div
                className={`px-4 py-1 font-bold text-sm flex items-center gap-2 shadow ${
                  isPlayerTurn
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold'
                    : 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white'
                }`}
              >
                <span>{player.name}</span>
                {player.isBot && <span className="text-xs opacity-80">[BOT]</span>}
                {player.isSkipped && <span className="text-xs text-red-300 font-bold">[SKIPPED]</span>}
                {player.isResigned && <span className="text-xs text-rose-400 font-extrabold">[RESIGNED]</span>}
                {player.hasVoyanceDebuff && (
                  <span className="text-[10px] text-cyan-300 font-black flex items-center gap-0.5 bg-cyan-950/80 border border-cyan-400/60 px-1.5 py-0.5 rounded shadow">
                    <img src="/status_effect_icons/voyance.png" alt="Exposed" className="w-3.5 h-3.5 object-contain" /><span>EXPOSED</span>
                  </span>
                )}
                {isPlayerTurn && gameState.turnTimeRemaining > 0 && (
                  <span className="text-xs font-black text-black">({gameState.turnTimeRemaining}s)</span>
                )}
              </div>
            </div>

            {renderActionButtons()}

            {isSpectator && player.isBot && onClaimSeat && (
              <button
                onClick={() => onClaimSeat(player.id)}
                className="bg-white text-black text-xs font-bold px-2.5 py-1 rounded hover:bg-neutral-200 cursor-pointer shadow shrink-0"
              >
                Take Seat
              </button>
            )}
          </div>

          {/* 3D Horizontal Fanned Cards with Floor Reflection */}
          <div
            data-opponent-id={player.id}
            onClick={handleStationClick}
            className={`card-reflect flex items-center justify-center my-0.5 ${
              isTargetable ? 'pointer-events-auto cursor-pointer hover:scale-105 transition-transform' : 'pointer-events-none'
            }`}
            style={{
              transform: 'perspective(900px) rotateX(24deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            {Array.from({ length: Math.max(1, visibleCardsCount) }).map((_, i) => {
              const rot = (i - (visibleCardsCount - 1) / 2) * 2.2;
              const exposedCard = player.visibleCards && player.visibleCards[i];
              return (
                <div
                  key={i}
                  style={{
                    transform: `rotateZ(${rot}deg)`,
                    marginLeft: i === 0 ? 0 : visibleCardsCount > 8 ? '-46px' : '-40px',
                    zIndex: i + 1
                  }}
                  className={`w-[84px] h-[118px] aspect-[5/7] rounded-lg border overflow-hidden bg-neutral-900 shadow-2xl shrink-0 ${targetCardBorderClass} ${
                    exposedCard ? 'ring-2 ring-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.6)]' : ''
                  }`}
                >
                  {exposedCard ? (
                    <CardView card={exposedCard} size="sm" isSelectable={false} />
                  ) : (
                    <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Top Player Laid Down Melds in Front of their deck */}
          {player.laidDownPhases && player.laidDownPhases.length > 0 && (
            <div className="mt-1 flex items-center justify-center gap-2.5 pointer-events-auto max-w-full overflow-x-auto px-4">
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
          data-player-station={player.id}
          className="absolute left-6 top-[28%] flex flex-col items-start gap-2 z-20 pointer-events-auto select-none max-w-[340px]"
        >
          {/* Left Player Action Buttons */}
          {renderActionButtons()}

          {/* Player Banner */}
          <div className="flex items-center gap-2.5">
            <div
              data-station-header={player.id}
              onClick={handleStationClick}
              className={`flex rounded-lg overflow-hidden border transition-all ${targetRingClass} ${
                isPlayerTurn
                  ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                  : 'border-white/20'
              }`}
            >
              <div
                className={`px-4 py-1 font-bold text-sm flex items-center gap-2 shadow ${
                  isPlayerTurn
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold'
                    : 'bg-gradient-to-r from-sky-600 to-cyan-500 text-white'
                }`}
              >
                <span>{player.name}</span>
                {player.isBot && <span className="text-xs opacity-80">[BOT]</span>}
                {player.isSkipped && <span className="text-xs text-red-300 font-bold">[SKIPPED]</span>}
                {player.isResigned && <span className="text-xs text-rose-400 font-extrabold">[RESIGNED]</span>}
                {player.hasVoyanceDebuff && (
                  <span className="text-[10px] text-cyan-300 font-black flex items-center gap-0.5 bg-cyan-950/80 border border-cyan-400/60 px-1.5 py-0.5 rounded shadow">
                    <img src="/status_effect_icons/voyance.png" alt="Exposed" className="w-3.5 h-3.5 object-contain" /><span>EXPOSED</span>
                  </span>
                )}
                {isPlayerTurn && gameState.turnTimeRemaining > 0 && (
                  <span className="text-xs font-black text-black">({gameState.turnTimeRemaining}s)</span>
                )}
              </div>
            </div>

            {isSpectator && player.isBot && onClaimSeat && (
              <button
                onClick={() => onClaimSeat(player.id)}
                className="bg-white text-black text-xs font-bold px-2.5 py-1 rounded hover:bg-neutral-200 cursor-pointer shadow"
              >
                Take Seat
              </button>
            )}
          </div>

          <div className="flex items-start gap-3">
            {/* 3D Horizontal Fanned Cards with Perspective */}
            <div
              data-opponent-id={player.id}
              onClick={handleStationClick}
              className={`card-reflect flex items-center justify-start my-1 ${
                isTargetable ? 'pointer-events-auto cursor-pointer hover:scale-105 transition-transform' : 'pointer-events-none'
              }`}
              style={{
                transform: 'perspective(900px) rotateY(26deg) rotateX(16deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              {Array.from({ length: Math.max(1, visibleCardsCount) }).map((_, i) => {
                const rot = (i - (visibleCardsCount - 1) / 2) * 2.2;
                const exposedCard = player.visibleCards && player.visibleCards[i];
                return (
                  <div
                    key={i}
                    style={{
                      transform: `rotateZ(${rot}deg)`,
                      marginLeft: i === 0 ? 0 : visibleCardsCount > 8 ? '-42px' : '-36px',
                      zIndex: i + 1
                    }}
                    className={`w-[56px] h-[78px] aspect-[5/7] rounded-lg border overflow-hidden bg-neutral-900 shadow-2xl shrink-0 ${targetCardBorderClass} ${
                      exposedCard ? 'ring-2 ring-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.6)]' : ''
                    }`}
                  >
                    {exposedCard ? (
                      <CardView card={exposedCard} size="xs" isSelectable={false} />
                    ) : (
                      <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Left Player Laid Down Melds in Front of their deck */}
            {player.laidDownPhases && player.laidDownPhases.length > 0 && (
              <div className="flex flex-col gap-2 pointer-events-auto">
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
        data-player-station={player.id}
        className="absolute right-6 top-[28%] flex flex-col items-end gap-2 z-20 pointer-events-auto select-none max-w-[340px]"
      >
        {/* Right Player Action Buttons */}
        {renderActionButtons()}

        {/* Player Banner */}
        <div className="flex items-center gap-2.5">
          {isSpectator && player.isBot && onClaimSeat && (
            <button
              onClick={() => onClaimSeat(player.id)}
              className="bg-white text-black text-xs font-bold px-2.5 py-1 rounded hover:bg-neutral-200 cursor-pointer shadow"
            >
              Take Seat
            </button>
          )}

          <div
            data-station-header={player.id}
            onClick={handleStationClick}
            className={`flex rounded-lg overflow-hidden border transition-all ${targetRingClass} ${
              isPlayerTurn
                ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                : 'border-white/20'
            }`}
          >
            <div
              className={`px-4 py-1 font-bold text-sm flex items-center gap-2 shadow ${
                isPlayerTurn
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white'
              }`}
            >
              <span>{player.name}</span>
              {player.isBot && <span className="text-xs opacity-80">[BOT]</span>}
              {player.isSkipped && <span className="text-xs text-red-300 font-bold">[SKIPPED]</span>}
              {player.isResigned && <span className="text-xs text-rose-400 font-extrabold">[RESIGNED]</span>}
              {player.hasVoyanceDebuff && (
                <span className="text-[10px] text-cyan-300 font-black flex items-center gap-0.5 bg-cyan-950/80 border border-cyan-400/60 px-1.5 py-0.5 rounded shadow">
                  <img src="/status_effect_icons/voyance.png" alt="Exposed" className="w-3.5 h-3.5 object-contain" /><span>EXPOSED</span>
                </span>
              )}
              {isPlayerTurn && gameState.turnTimeRemaining > 0 && (
                <span className="text-xs font-black text-black">({gameState.turnTimeRemaining}s)</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          {/* Right Player Laid Down Melds in Front of their deck */}
          {player.laidDownPhases && player.laidDownPhases.length > 0 && (
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
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

          {/* 3D Horizontal Fanned Cards with Perspective */}
          <div
            data-opponent-id={player.id}
            onClick={handleStationClick}
            className={`card-reflect flex items-center justify-end my-1 ${
              isTargetable ? 'pointer-events-auto cursor-pointer hover:scale-105 transition-transform' : 'pointer-events-none'
            }`}
            style={{
              transform: 'perspective(900px) rotateY(-26deg) rotateX(16deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            {Array.from({ length: Math.max(1, visibleCardsCount) }).map((_, i) => {
              const rot = (i - (visibleCardsCount - 1) / 2) * -2.2;
              const exposedCard = player.visibleCards && player.visibleCards[i];
              return (
                <div
                  key={i}
                  style={{
                    transform: `rotateZ(${rot}deg)`,
                    marginLeft: i === 0 ? 0 : visibleCardsCount > 8 ? '-42px' : '-36px',
                    zIndex: i + 1
                  }}
                  className={`w-[56px] h-[78px] aspect-[5/7] rounded-lg border overflow-hidden bg-neutral-900 shadow-2xl shrink-0 ${targetCardBorderClass} ${
                    exposedCard ? 'ring-2 ring-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.6)]' : ''
                  }`}
                >
                  {exposedCard ? (
                    <CardView card={exposedCard} size="xs" isSelectable={false} />
                  ) : (
                    <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      className="relative w-full h-screen h-[100dvh] overflow-hidden bg-black flex items-center justify-center select-none"
    >
      {/* 0. Ambient Looping Background Video filling pillarbox / letterbox borders */}
      <video
        src={gameState.isAlternateWorld ? "/cards/alternate_background.mp4" : "/cards/background.mp4"}
        onError={(e) => {
          if (e.currentTarget.src.includes('alternate_background')) {
            e.currentTarget.src = "/cards/background.mp4";
          }
        }}
        autoPlay
        loop
        muted={isMuted}
        playsInline
className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-30 blur-md z-0"
      />

      {/* 16:9 Virtual Arena Stage (1920x1080, scaled uniformly to fit any display) */}
      <div
        ref={tableRef}
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          ...(isScreenShaking ? { animation: 'screenShake 0.08s infinite' } : {})
        }}
        className="relative w-[1920px] h-[1080px] shrink-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.95)] z-10"
      >
        {/* 1. Main 3D Arena Video Background */}
        <video
          ref={videoRef}
          src={gameState.isAlternateWorld ? "/cards/alternate_background.mp4" : "/cards/background.mp4"}
          onError={(e) => {
            if (e.currentTarget.src.includes('alternate_background')) {
              e.currentTarget.src = "/cards/background.mp4";
            }
          }}
          autoPlay
          loop
          muted={isMuted}
          playsInline
className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        />

        {/* Subtle lighting vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none z-0" />

        {/* 2. Top Header HUD: Floating Left & Right Control Panels */}
        <header className="absolute top-0 inset-x-0 z-30 p-5 flex items-start justify-between pointer-events-none">
          {/* Left HUD Pill */}
          <div className="flex items-center gap-3 pointer-events-auto bg-neutral-950/85 backdrop-blur-md border border-white/15 px-4 py-2 rounded-xl shadow-2xl">
            <button
              onClick={copyInviteLink}
              title="Click to copy invite link"
              className="border border-white/20 bg-black/60 px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer flex items-center gap-2 transition-colors font-medium text-sm"
            >
              
              <span className="font-bold">{copiedLink ? 'Link Copied!' : `Room: ${gameState.roomCode}`}</span>
            </button>
            <span className="text-xs text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded font-bold">v6.1</span>
            {gameState.isAlternateWorld && (
              <span className="text-xs font-black px-2.5 py-0.5 rounded border border-purple-500/70 bg-purple-950/90 text-purple-200 flex items-center gap-1 shadow-[0_0_12px_rgba(168,85,247,0.7)] animate-pulse">
                
                <span>Alternate World</span>
                <span className="text-[10px] text-purple-300 font-mono">({(gameState.alternateTurnCounter ?? 0) % 2 + 1}/2 turns)</span>
              </span>
            )}
            <span className="text-neutral-300 font-bold text-sm">Round {gameState.roundNumber}</span>
            <span
              title={`Play Direction: ${gameState.playDirection === 1 ? 'Clockwise' : 'Counter-Clockwise'}`}
              className="text-xs font-bold px-2 py-0.5 rounded border border-sky-500/40 bg-sky-950/70 text-sky-300 flex items-center gap-1 cursor-default select-none shadow-sm"
            >
              <span className="text-sm font-black">{gameState.playDirection === 1 ? '↻' : '↺'}</span>
              <span>{gameState.playDirection === 1 ? 'Clockwise' : 'Counter-CW'}</span>
            </span>
            {gameState.settings?.randomizePhasesPerRound && (
              <span
                title="Stages are randomized each round"
                className="text-xs font-bold px-2 py-0.5 rounded border border-purple-500/50 bg-purple-950/80 text-purple-300 flex items-center gap-1 shadow-sm"
              >
                
                <span>Random Stages</span>
              </span>
            )}
            {gameState.settings?.gameMode && gameState.settings.gameMode !== 'classic' && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded border border-amber-500/50 bg-amber-950/80 text-amber-300 uppercase">
                {gameState.settings.gameMode}
              </span>
            )}
          </div>

          {/* Right HUD Pill */}
          <div className="flex items-center gap-3 pointer-events-auto bg-neutral-950/85 backdrop-blur-md border border-white/15 px-4 py-2 rounded-xl shadow-2xl">
            {isMyTurn ? (
              <span className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-extrabold px-4 py-1.5 rounded-full text-sm shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-pulse">
                YOUR TURN ({gameState.turnStage.toUpperCase()})
              </span>
            ) : (
              <span className="text-neutral-300 text-sm">
                Turn: <span className="font-bold text-white">{gameState.players.find(p => p.id === gameState.currentTurnPlayerId)?.name}</span>
              </span>
            )}

            {gameState.turnTimeRemaining > 0 && (
              <span className="text-amber-300 font-bold text-sm bg-black/60 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
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
              className="text-neutral-400 hover:text-white px-2.5 py-1 border border-white/10 rounded-lg bg-black/40 text-sm cursor-pointer transition-colors"
            >
              {isMuted ? 'MUTED' : 'AUDIO'}
            </button>

            <button
              onClick={onOpenRules}
              className="text-neutral-300 hover:text-white underline text-sm cursor-pointer font-bold px-1.5"
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
            className="absolute top-0 left-0 z-50 pointer-events-none drop-shadow-2xl animate-fly-card-exact"
          >
            {activeFlyingCard.card ? (
              <CardView card={activeFlyingCard.card} size="lg" isSelectable={false} />
            ) : (
              <div className="w-[115px] h-[161px] aspect-[5/7] rounded-xl border border-neutral-700 overflow-hidden bg-neutral-900 shadow-2xl">
                <img src="/cards/back.png" alt="Card" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* 4. Spectator Waitlist Banner */}
        {isSpectator && (
          <div className="relative z-30 mx-auto mt-4 max-w-md bg-neutral-950/85 backdrop-blur border border-amber-500/40 p-3 rounded-lg text-center text-sm shadow-xl">
            <div className="text-amber-300 font-bold flex items-center justify-center gap-2">
              <span>SPECTATING MATCH — YOU ARE ON THE WAITLIST</span>
            </div>
            {botPlayers.length > 0 && onClaimSeat && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1.5">
                <span className="text-neutral-400 text-xs">Available bot seat:</span>
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
          <div className="relative w-[600px] h-[520px] flex items-center justify-center">
            {/* Central Circular Direction Arrow Indicator */}
            <div
              key={`direction_disk_${gameState.playDirection}`}
              className={`absolute w-[520px] h-[520px] rounded-full pointer-events-none flex items-center justify-center transition-all ${
                gameState.playDirection === 1 ? 'animate-spin-cw' : 'animate-spin-ccw'
              }`}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full opacity-70 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
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
                  <marker
                    id="orbitArrow"
                    viewBox="0 0 10 10"
                    refX="5"
                    refY="5"
                    markerWidth="4"
                    markerHeight="4"
                    orient="auto"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
                  </marker>
                </defs>
                {gameState.playDirection === 1 ? (
                  <>
                    <path
                      d="M 50,6 A 44,44 0 0,1 94,50"
                      stroke="url(#orbitGrad1)"
                      strokeWidth="2.5"
                      fill="none"
                      strokeDasharray="9,5"
                      strokeLinecap="round"
                      markerEnd="url(#orbitArrow)"
                    />
                    <path
                      d="M 50,94 A 44,44 0 0,1 6,50"
                      stroke="url(#orbitGrad2)"
                      strokeWidth="2.5"
                      fill="none"
                      strokeDasharray="9,5"
                      strokeLinecap="round"
                      markerEnd="url(#orbitArrow)"
                    />
                  </>
                ) : (
                  <>
                    <path
                      d="M 50,6 A 44,44 0 0,0 6,50"
                      stroke="url(#orbitGrad1)"
                      strokeWidth="2.5"
                      fill="none"
                      strokeDasharray="9,5"
                      strokeLinecap="round"
                      markerEnd="url(#orbitArrow)"
                    />
                    <path
                      d="M 50,94 A 44,44 0 0,0 94,50"
                      stroke="url(#orbitGrad2)"
                      strokeWidth="2.5"
                      fill="none"
                      strokeDasharray="9,5"
                      strokeLinecap="round"
                      markerEnd="url(#orbitArrow)"
                    />
                  </>
                )}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  stroke="#06b6d4"
                  strokeWidth="0.5"
                  strokeDasharray="3,6"
                  fill="none"
                  opacity="0.3"
                />
              </svg>
            </div>

            {/* Draw & Discard Piles in the Arena Ring */}
            <div className="flex items-center gap-14 pointer-events-auto z-20">
              {/* Draw Pile */}
              <div className="flex flex-col items-center">
                <button
                  ref={deckRef}
                  onClick={() => handleDraw('deck')}
                  disabled={!isMyTurn || gameState.turnStage !== 'draw'}
                  className={`relative w-[110px] h-[154px] aspect-[5/7] rounded-xl flex flex-col items-center justify-center transition-transform deck-3d-stack overflow-hidden ${
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
                      <div className="absolute top-1.5 right-1.5 bg-black/85 text-white text-xs px-2 py-0.5 rounded-md font-bold border border-white/20">
                        {gameState.drawPileCount}
                      </div>
                      {isMyTurn && gameState.turnStage === 'draw' && (
                        <div className="absolute bottom-2.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-xs px-2.5 py-1 rounded font-extrabold shadow-lg">
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
                <span className="text-xs text-neutral-300 font-bold mt-1.5 drop-shadow">Draw Pile</span>
              </div>

              {/* Discard Pile */}
              <div className="flex flex-col items-center">
                <div
                  ref={discardRef}
                  className="relative w-[110px] h-[154px] aspect-[5/7] discard-3d-shadow rounded-xl"
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
                          if (displayedDiscardCard?.type === 'number') {
                            handleDraw('discard');
                          }
                        } else if (isMyTurn && selectedCard && gameState.turnStage !== 'draw') {
                          handleNormalDiscard();
                        }
                      }}
                      className={`relative z-10 animate-card-land ${
                        isMyTurn &&
                        ((gameState.turnStage === 'draw' && displayedDiscardCard?.type === 'number') ||
                          (selectedCard && gameState.turnStage !== 'draw'))
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
                <span className="text-xs text-neutral-300 font-bold mt-1.5 drop-shadow">Discard Pile</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Client Station & Hand (Bottom) */}
        <footer ref={handRef} className="absolute bottom-0 inset-x-0 z-30 pb-3 pointer-events-auto flex flex-col items-center select-none w-full">
          {/* Client Nameplate & Card Count (Bottom Left) */}
          {me && (() => {
            const isMyTimeTargetable = isTimeSelected && isSelfEligibleTimeTarget;
            const isMySelfTargetable = isMyTimeTargetable || isPlusSelected;
            const myTargetRingClass = isMySelfTargetable
              ? isMyTimeTargetable
                ? 'ring-4 ring-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.95)] cursor-pointer hover:scale-105 animate-pulse'
                : 'ring-4 ring-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.95)] cursor-pointer hover:scale-105 animate-pulse'
              : '';

            return (
              <div className="absolute left-6 bottom-4 flex items-center gap-2.5 z-40">
                <div
                  onClick={isMySelfTargetable ? handleSelfTargetClick : undefined}
                  className={`flex rounded-lg overflow-hidden border transition-all ${myTargetRingClass} ${
                    isMyTurn
                      ? 'border-amber-400 animate-turn-glow shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                      : 'border-white/20'
                  }`}
                >
                  <div
                    className={`px-3.5 py-1 font-bold text-xs flex items-center gap-1.5 shadow ${
                      isMyTurn
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-extrabold'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                    }`}
                  >
                    <span>{me.name} (You)</span>
                    {me.isSkipped && <span className="text-[10px] text-red-300 font-bold">[SKIPPED]</span>}
                    {me.isResigned && <span className="text-[10px] text-rose-400 font-extrabold">[RESIGNED]</span>}
                  </div>
                </div>

                {isMyTimeTargetable && (
                  <button
                    type="button"
                    onClick={handleSelfTargetClick}
                    className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:brightness-125 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.9)] border border-emerald-300 animate-bounce cursor-pointer flex items-center gap-1 tracking-wider uppercase select-none transition-all shrink-0"
                  >
                    
                    <span>Time Warp Self!</span>
                  </button>
                )}

                {isPlusSelected && (
                  <button
                    type="button"
                    onClick={handleSelfTargetClick}
                    className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 hover:brightness-125 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.9)] border border-indigo-300 animate-bounce cursor-pointer flex items-center gap-1 tracking-wider uppercase select-none transition-all shrink-0"
                  >
                    <span>Draw On Self!</span>
                  </button>
                )}
              </div>
            );
          })()}

          {/* Client Laid Down Melds in Front of their hand */}
          {me && me.laidDownPhases && me.laidDownPhases.length > 0 && (
            <div className="mb-2 flex items-center justify-center gap-2.5 pointer-events-auto max-w-full overflow-x-auto px-4">
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
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2.5 pointer-events-auto px-4">
            {/* Stage Goal / Lay Down Phase status */}
            {currentPhaseDef && (
              <>
                {!me?.phaseCompletedInRound ? (
                  <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/20 px-3.5 py-1 rounded-full shadow-lg text-xs">
                    <span className="text-amber-400 font-bold">Stage {me?.currentPhase}:</span>
                    <span className="text-neutral-200 font-medium text-xs">
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
                        className={`ml-1 px-3 py-1 rounded-full font-extrabold text-xs transition-all shadow-md flex items-center gap-1 ${
                          isMyTurn && gameState.turnStage === 'play'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:scale-105 cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-pulse'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-not-allowed'
                        }`}
                      >
                        <span>{isMyTurn && gameState.turnStage === 'play' ? `Lay Down Stage ${me?.currentPhase}` : 'Draw First'}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-neutral-400 italic ml-1">(Incomplete)</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold text-xs px-3.5 py-1 rounded-full flex items-center shadow">
                      <span>Stage {me?.currentPhase} Completed</span>
                    </div>
                    {availableExtraMelds.length > 0 && isMyTurn && gameState.turnStage === 'play' && (
                      <button
                        type="button"
                        onClick={() => onLayExtraMeld(availableExtraMelds[0].cards.map(c => c.id))}
                        className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-bold text-xs px-3.5 py-1 rounded-full shadow hover:scale-105 cursor-pointer transition-all animate-pulse"
                      >
                        + Lay {availableExtraMelds[0].label}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Jester Swap Guidance Banner */}
            {isJesterSelected && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-900/90 to-indigo-900/90 border border-purple-400/80 px-4 py-1 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.6)] text-xs text-purple-100 font-bold animate-pulse">
                
                <span>Click an opponent's deck or banner above to swap hands!</span>
              </div>
            )}

            {/* Redo Guidance Banner */}
            {selectedCard?.type === 'redo' && isMyTurn && gameState.turnStage !== 'draw' && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-pink-950/90 to-purple-950/90 border border-pink-400/80 px-4 py-1 rounded-full shadow-[0_0_15px_rgba(244,114,182,0.6)] text-xs text-pink-100 font-bold animate-pulse">
                
                <span>Click REDO HAND below to discard and draw 10 fresh cards from a new deck!</span>
              </div>
            )}

            {/* Time Guidance Banner */}
            {isTimeSelected && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border border-emerald-400/80 px-4 py-1 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.6)] text-xs text-emerald-100 font-bold animate-pulse">
                
                <span>
                  {hasEligibleTimeTargets
                    ? "Click an opponent's deck or banner above (Stage 2–9) to alter their timeline!"
                    : "No opponents can be targeted (must be Stage 2–9)."}
                </span>
              </div>
            )}

            {/* Nuke Locked Guidance Banner */}
            {selectedCard?.type === 'nuke' && !me?.phaseCompletedInRound && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/95 to-red-950/95 border border-amber-500/80 px-4 py-1 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.6)] text-xs text-amber-200 font-bold animate-pulse">
                
                <span>Nuke locked! Complete and lay down your Stage before detonating!</span>
              </div>
            )}

            {/* Number Eye Guidance Banner */}
            {isNumberEyeSelected && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/90 to-orange-950/90 border border-amber-400/80 px-4 py-1 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.6)] text-xs text-amber-100 font-bold animate-pulse">
                
                <span>Click an opponent's deck or banner above to blind their card numbers!</span>
              </div>
            )}

            {/* Color Eye Guidance Banner */}
            {isColorEyeSelected && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-neutral-900/90 to-stone-900/90 border border-neutral-400/80 px-4 py-1 rounded-full shadow-[0_0_15px_rgba(163,163,163,0.6)] text-xs text-neutral-100 font-bold animate-pulse">
                
                <span>Click an opponent's deck or banner above to turn their hand grayscale!</span>
              </div>
            )}

            {/* Random Guidance Banner */}
            {selectedCard?.type === 'random' && isMyTurn && gameState.turnStage !== 'draw' && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border border-cyan-400/80 px-4 py-1 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.6)] text-xs text-cyan-100 font-bold animate-pulse">
                
                <span>Click ROLL RANDOM below to trigger a random special card power!</span>
              </div>
            )}

            {/* Sort Controls, Deselect, and Resign */}
            {me?.isResigned ? (
              <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500/80 px-4 py-1 rounded-full text-xs text-red-200 font-bold shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                
                <span>You have resigned this round. Your turns are skipped until next round.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 shadow-lg text-xs">
                <button
                  type="button"
                  onClick={() => setLocalHand(sortCardsByValue(localHand))}
                  className="px-2.5 py-0.5 rounded text-xs bg-white/10 hover:bg-white/20 text-neutral-200 cursor-pointer transition-colors font-medium"
                >
                  Sort: Value
                </button>
                <button
                  type="button"
                  onClick={() => setLocalHand(sortCardsByColor(localHand))}
                  className="px-2.5 py-0.5 rounded text-xs bg-white/10 hover:bg-white/20 text-neutral-200 cursor-pointer transition-colors font-medium"
                >
                  Sort: Color
                </button>
                {/* 1. Charged Ultimate Button */}
                {isChargedUltimateSelected && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCard && onPlayUltimateCard) {
                        onPlayUltimateCard(selectedCard.id);
                        setSelectedCardId(null);
                      }
                    }}
                    className="px-3.5 py-0.5 rounded text-xs bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:brightness-125 text-black cursor-pointer transition-all font-black flex items-center gap-1 shadow-[0_0_20px_rgba(251,191,36,0.9)] animate-bounce ml-1 uppercase"
                  >
                    
                    <span>Activate Ultimate: {selectedCard?.type.toUpperCase()}</span>
                  </button>
                )}

                {/* 2. Sacrifice Button */}
                {canSacrificeSelected && unchargedUlt && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCard && unchargedUlt && onSacrificeCard) {
                        onSacrificeCard(selectedCard.id, unchargedUlt.id);
                        setSelectedCardId(null);
                      }
                    }}
                    className="px-3 py-0.5 rounded text-xs bg-gradient-to-r from-orange-600 to-amber-500 hover:brightness-125 text-black cursor-pointer transition-all font-extrabold flex items-center gap-1 shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse ml-1"
                  >
                    
                    <span>Sacrifice into {unchargedUlt.type.toUpperCase()} (+50%)</span>
                  </button>
                )}

                {selectedCard && isMyTurn && gameState.turnStage !== 'draw' && (
                  <button
                    type="button"
                    onClick={handleNormalDiscard}
                    className="px-2.5 py-0.5 rounded text-xs bg-red-600 hover:bg-red-500 text-white cursor-pointer transition-colors font-bold flex items-center gap-1 shadow-md ml-1"
                  >
                    
                    <span>{selectedCard.type === 'reverse' ? 'Play Reverse' : selectedCard.type === 'skip' ? 'Play Skip' : 'Discard'}</span>
                  </button>
                )}
                {selectedCard && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-neutral-400 hover:text-white text-xs underline ml-1 cursor-pointer"
                  >
                    Deselect
                  </button>
                )}
                {!isSpectator && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Resign from this round? You will not be able to play and your turns will be skipped until next round.')) {
                        onResign();
                      }
                    }}
                    title="Resign from this round"
                    className="px-2 py-0.5 rounded text-[11px] bg-red-950/60 hover:bg-red-900 border border-red-800/70 text-red-300 hover:text-white font-medium cursor-pointer transition-colors flex items-center gap-1 ml-1"
                  >
                    
                    <span>Resign</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Client Hand: Curved Arc in Perspective */}
          <div className="w-full max-w-5xl px-4 flex items-end justify-center overflow-visible pb-1 pt-2">
            <div className={`flex items-end justify-center ${me?.isResigned ? 'opacity-50 pointer-events-none' : ''}`}>
              {localHand.map((c, i) => {
                const count = localHand.length;
                const offset = i - (count - 1) / 2;
                const rot = Math.max(-14, Math.min(14, offset * (count > 12 ? 1.6 : 2.2)));
                const translateY = Math.abs(offset) * (count > 12 ? 1.2 : 1.8);
                const isSelected = selectedCardId === c.id;
                const isCardDisabled = Boolean(c.isCracked && !isWinningSoftlockExemption(c));

                return (
                  <div
                    key={c.id}
                    data-card-id={c.id}
                    style={{
                      transform: `rotate(${rot}deg) translateY(${isSelected ? -28 : translateY}px)`,
                      zIndex: isSelected ? 40 : i + 1,
                      marginLeft: i === 0 ? 0 : count > 12 ? '-42px' : count > 8 ? '-36px' : '-28px'
                    }}
                    className={`relative transition-all duration-200 shrink-0 ${
                      isCardDisabled
                        ? 'cursor-not-allowed opacity-85 pointer-events-none'
                        : 'cursor-pointer hover:-translate-y-7 hover:z-35'
                    } ${isSelected ? 'scale-105 drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]' : ''}`}
                    onClick={() => {
                      if (isCardDisabled) return;
                      handleCardClick(c);
                    }}
                  >
                    <CardView
                      card={c}
                      size="lg"
                      isSelected={isSelected}
                      isSelectable={!c.isCracked || isWinningSoftlockExemption(c)}
                      isNumberEyeActive={Boolean(me?.hasNumberEyeEffect)}
                      isColorEyeActive={Boolean(me?.hasColorEyeEffect)}
                    />

                    {/* Action buttons right on the selected card */}
                    {isSelected && isMyTurn && gameState.turnStage !== 'draw' && (
                      isUltimateCard(c.type) ? (
                        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 bg-black/95 backdrop-blur-md p-3 rounded-2xl border-2 border-amber-400/90 shadow-[0_0_30px_rgba(251,191,36,0.8)] select-none min-w-[150px]">
                          <div className="text-[11px] font-black text-amber-300 tracking-wider uppercase drop-shadow flex items-center gap-1">
                            
                            <span>{c.type}</span>
                          </div>
                          <div className="w-28 bg-neutral-800 rounded-full h-2.5 overflow-hidden border border-white/20">
                            <div
                              className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 h-full transition-all duration-300 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                              style={{ width: `${c.ultimateProgress ?? 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-amber-200 font-extrabold">
                            {c.ultimateProgress ?? 0}% Charged
                          </span>

                          {(c.ultimateProgress ?? 0) >= 100 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPlayUltimateCard?.(c.id);
                                setSelectedCardId(null);
                              }}
                              className="py-1.5 px-3 rounded-xl border border-yellow-300 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 text-black font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(251,191,36,1)] animate-bounce whitespace-nowrap"
                            >
                              
                              <span>ACTIVATE ULTIMATE</span>
                            </button>
                          ) : (
                            <div className="text-[9px] text-neutral-300 text-center font-medium max-w-[130px] leading-tight">
                              {!c.sacrificedSpecial && !c.sacrificedWildSkipReverse
                                ? 'Sacrifice 1 Special + 1 Wild/Skip/Reverse'
                                : !c.sacrificedSpecial
                                ? 'Sacrifice 1 Special Card'
                                : 'Sacrifice 1 Wild/Skip/Reverse'}
                            </div>
                          )}

                          {/* Regular Discard */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNormalDiscard();
                            }}
                            className="py-1 px-3 rounded-lg border border-red-500/80 bg-red-600/85 hover:bg-red-600 active:scale-95 text-white font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all shadow whitespace-nowrap"
                          >
                            
                            <span>DISCARD</span>
                          </button>
                        </div>
                      ) : isChaosSpecialCard(c.type) ? (
                        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1.5 bg-black/85 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-2xl select-none">
                          {/* Ability Option or Lock Indicator */}
                          {c.type === 'nuke' && !me?.phaseCompletedInRound ? (
                            <div
                              title="Complete and lay down your Stage before detonating Nuke"
                              className="bg-neutral-900/90 border border-amber-500/50 text-amber-300 font-extrabold text-[10px] py-1 px-2 rounded-lg flex items-center justify-center gap-1 select-none whitespace-nowrap"
                            >
                              <span>Stage Locked</span>
                            </div>
                          ) : c.type === 'time' ? (
                            !hasAnyTimeTarget ? (
                              <div
                                title="No eligible targets on Stage 2–9"
                                className="bg-neutral-900/90 border border-emerald-500/50 text-emerald-300 font-extrabold text-[10px] py-1 px-2 rounded-lg flex items-center justify-center gap-1 select-none whitespace-nowrap"
                              >
                                <span>No Targets</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 w-full">
                                {hasEligibleTimeTargets && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDiscardSelected(eligibleTimeTargets[0].id);
                                    }}
                                    className="py-1 px-2.5 rounded-lg border text-white font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap bg-emerald-600/90 hover:bg-emerald-600 border-emerald-400"
                                  >
                                    
                                    <span>WARP ENEMY</span>
                                  </button>
                                )}
                                {isSelfEligibleTimeTarget && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDiscardSelected(me?.id);
                                    }}
                                    className="py-1 px-2.5 rounded-lg border text-white font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap bg-teal-600/90 hover:bg-teal-600 border-teal-400"
                                  >
                                    
                                    <span>WARP SELF</span>
                                  </button>
                                )}
                              </div>
                            )
                          ) : (c.type === 'plus_two' || c.type === 'draw_two' || c.type === 'plus_three') ? (
                            <div className="flex flex-col gap-1 w-full">
                              {opponents.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDiscardSelected(opponents[0].id);
                                  }}
                                  className="py-1 px-2.5 rounded-lg border text-white font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap bg-indigo-600/90 hover:bg-indigo-600 border-indigo-400"
                                >
                                  <span>DRAW ENEMY</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDiscardSelected(me?.id);
                                }}
                                className="py-1 px-2.5 rounded-lg border text-white font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap bg-sky-600/90 hover:bg-sky-600 border-sky-400"
                              >
                                <span>DRAW SELF</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDiscardSelected();
                              }}
                              className={`py-1 px-2.5 rounded-lg border text-white font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap ${
                                c.type === 'nuke'
                                  ? 'bg-amber-600/90 hover:bg-amber-600 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                                  : c.type === 'jester'
                                  ? 'bg-purple-600/90 hover:bg-purple-600 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]'
                                  : c.type === 'redo'
                                  ? 'bg-pink-600/90 hover:bg-pink-600 border-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.8)]'
                                  : c.type === 'number_eye'
                                  ? 'bg-amber-600/90 hover:bg-amber-600 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                                  : c.type === 'color_eye'
                                  ? 'bg-stone-600/90 hover:bg-stone-600 border-stone-400 shadow-[0_0_12px_rgba(163,163,163,0.8)]'
                                  : c.type === 'random'
                                  ? 'bg-cyan-600/90 hover:bg-cyan-600 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)]'
                                  : c.type === 'crack'
                                  ? 'bg-stone-600/90 hover:bg-stone-600 border-stone-400 shadow-[0_0_12px_rgba(168,162,158,0.8)]'
                                  : c.type === 'status'
                                  ? 'bg-teal-600/90 hover:bg-teal-600 border-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.8)]'
                                  : c.type === 'luck'
                                  ? 'bg-green-600/90 hover:bg-green-600 border-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]'
                                  : c.type === 'unlucky'
                                  ? 'bg-rose-600/90 hover:bg-rose-600 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                                  : c.type === 'double'
                                  ? 'bg-purple-600/90 hover:bg-purple-600 border-purple-400 shadow-[0_0_12px_rgba(147,51,234,0.8)]'
                                  : 'bg-indigo-600/90 hover:bg-indigo-600 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.8)]'
                              }`}
                            >
                              <span>
                                {c.type === 'nuke'
                                  ? 'DETONATE'
                                  : c.type === 'jester'
                                  ? 'SWAP HAND'
                                  : c.type === 'redo'
                                  ? 'REDO HAND'
                                  : c.type === 'number_eye'
                                  ? 'BLIND NUMBERS'
                                  : c.type === 'color_eye'
                                  ? 'GREYSCALE'
                                  : c.type === 'random'
                                  ? 'ROLL RANDOM'
                                  : c.type === 'crack'
                                  ? 'SHATTER'
                                  : c.type === 'status'
                                  ? 'PURGE STATUS'
                                  : c.type === 'luck'
                                  ? 'BLESSING'
                                  : c.type === 'unlucky'
                                  ? 'CURSE'
                                  : c.type === 'double'
                                  ? 'DOUBLE TRAP'
                                  : 'USE ABILITY'}
                              </span>
                            </button>
                          )}

                          {/* Sacrifice Option into uncharged ultimate */}
                          {canSacrificeSelected && unchargedUlt && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSacrificeCard?.(c.id, unchargedUlt.id);
                                setSelectedCardId(null);
                              }}
                              className="py-1 px-2.5 rounded-lg border border-orange-400 bg-gradient-to-r from-orange-600 to-amber-500 hover:brightness-110 active:scale-95 text-black font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-[0_0_12px_rgba(249,115,22,0.8)] whitespace-nowrap"
                            >
                              
                              <span>SACRIFICE (+50%)</span>
                            </button>
                          )}

                          {/* Regular Discard Button - ALWAYS available on special cards */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNormalDiscard();
                            }}
                            className="py-1 px-2.5 rounded-lg border border-red-500/80 bg-red-600/85 hover:bg-red-600 active:scale-95 text-white font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-[0_0_10px_rgba(239,68,68,0.7)] whitespace-nowrap"
                          >
                            
                            <span>DISCARD</span>
                          </button>
                        </div>
                      ) : (
                        /* Standard Card */
                        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1.5 select-none">
                          {canSacrificeSelected && unchargedUlt && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSacrificeCard?.(c.id, unchargedUlt.id);
                                setSelectedCardId(null);
                              }}
                              className="border border-orange-400 bg-gradient-to-r from-orange-600 to-amber-500 text-black font-black text-xs py-1.5 px-3 rounded-lg shadow-[0_0_15px_rgba(249,115,22,0.85)] active:scale-95 flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 whitespace-nowrap"
                            >
                              
                              <span>SACRIFICE (+50%)</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNormalDiscard();
                            }}
                            className={`border shadow-[0_0_15px_rgba(239,68,68,0.85)] active:scale-95 text-white font-black text-xs py-1.5 px-3 rounded-lg backdrop-blur-sm flex items-center justify-center gap-1 cursor-pointer transition-all animate-fade-in hover:scale-105 whitespace-nowrap select-none ${
                              c.type === 'reverse'
                                ? 'bg-sky-600/85 hover:bg-sky-600 border-sky-400'
                                : c.type === 'skip'
                                ? 'bg-blue-600/85 hover:bg-blue-600 border-blue-400'
                                : 'bg-red-600/75 hover:bg-red-600/95 border-red-400/80'
                            }`}
                          >
                            
                            <span>{c.type === 'reverse' ? 'PLAY REVERSE' : c.type === 'skip' ? 'PLAY SKIP' : 'DISCARD'}</span>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </footer>
      </div>

      {/* 5-Second Nuclear Blast VFX Screen Overlay */}
      {nukeActive && (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center overflow-hidden animate-nuke-flash">
          <div className="relative w-full h-full flex flex-col items-center justify-center animate-nuke-shake">
            <div className="w-[500px] h-[500px] rounded-full border-8 border-yellow-400/80 animate-ping absolute opacity-50" />
            <div className="relative z-10 flex flex-col items-center gap-3 drop-shadow-[0_0_40px_rgba(255,0,0,1)] select-none">
              <img src="/cards/custom/nuke.png" alt="Nuke" className="w-28 h-40 md:w-36 md:h-52 object-contain drop-shadow-[0_0_35px_rgba(245,158,11,0.9)]" />
              <div className="text-4xl md:text-6xl font-black tracking-widest text-yellow-300 drop-shadow-[0_0_30px_rgba(239,68,68,0.9)] uppercase">
                NUCLEAR DETONATION
              </div>
              <div className="text-lg md:text-2xl font-extrabold text-white bg-red-950/80 border border-red-500/80 px-6 py-1.5 rounded-full uppercase tracking-wider shadow-2xl">
                ALL HANDS REDUCED TO 2 CARDS!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JoJo Dio "Za Warudo" Time Warp Cinematic Overlay */}
      {timeWarpEvent && (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center overflow-hidden animate-za-warudo">
          <div className="relative w-full h-full flex flex-col items-center justify-center animate-za-warudo-rumble">
            {/* Menacing Floating Kanji Symbols */}
            <div className="absolute top-12 left-12 text-6xl md:text-8xl font-black text-purple-400/80 animate-menacing select-none">
              ゴゴゴゴ
            </div>
            <div
              className="absolute top-16 right-16 text-5xl md:text-7xl font-black text-yellow-400/80 animate-menacing select-none"
              style={{ animationDelay: '0.4s' }}
            >
              ゴゴゴゴ
            </div>
            <div
              className="absolute bottom-16 left-20 text-5xl md:text-7xl font-black text-yellow-300/80 animate-menacing select-none"
              style={{ animationDelay: '0.8s' }}
            >
              ゴゴゴゴ
            </div>
            <div
              className="absolute bottom-20 right-20 text-6xl md:text-8xl font-black text-purple-300/80 animate-menacing select-none"
              style={{ animationDelay: '1.2s' }}
            >
              ゴゴゴゴ
            </div>

            {/* Time Warp Header */}
            <div className="relative z-10 flex flex-col items-center gap-2 drop-shadow-[0_0_40px_rgba(234,179,8,1)] select-none mb-6">
              <div className="text-5xl md:text-7xl font-black tracking-widest text-yellow-400 drop-shadow-[0_0_35px_rgba(245,158,11,1)] uppercase italic text-center">
                ZA WARUDO!
              </div>
              <div className="text-sm md:text-lg font-black tracking-widest text-purple-300 uppercase">
                TOKI WO TOMARE — TIME HAS STOPPED
              </div>
              <div className="text-base md:text-xl font-bold text-white bg-black/70 border border-yellow-500/80 px-6 py-1 rounded-full shadow-2xl">
                <span className="text-yellow-300 font-black">{timeWarpEvent.sourceName}</span> invoked Time Warp on{' '}
                <span className="text-pink-300 font-black">{timeWarpEvent.targetName}</span>!
              </div>
            </div>

            {/* Center Area: Spinning Roulette -> Outcome Slam */}
            <div className="relative w-72 h-80 flex items-center justify-center">
              {/* Spinning Time Clock (Phase 1: Roulette 0s - 2.3s) */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center animate-time-roulette"
                style={{
                  animationFillMode: 'forwards'
                }}
              >
                <img
                  src="/cards/custom/time.png"
                  alt="Time Roulette"
                  className="w-44 h-64 object-contain rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.9)] border-4 border-yellow-400"
                />
              </div>

              {/* Outcome Card Slam (Phase 2: Slams at 2.2s) */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center animate-time-slam"
                style={{
                  animationDelay: '2.2s',
                  animationFillMode: 'both'
                }}
              >
                <img
                  src={
                    timeWarpEvent.result === 'green'
                      ? '/cards/custom/time/green.png'
                      : '/cards/custom/time/red.png'
                  }
                  alt={timeWarpEvent.result === 'green' ? 'Stage Rewind' : 'Stage Advance'}
                  className={`w-48 h-68 object-contain rounded-2xl shadow-2xl border-4 ${
                    timeWarpEvent.result === 'green'
                      ? 'shadow-[0_0_60px_rgba(34,197,94,1)] border-emerald-400'
                      : 'shadow-[0_0_60px_rgba(239,68,68,1)] border-red-500'
                  }`}
                />
              </div>
            </div>

            {/* Outcome Result Text (Slams at 2.4s) */}
            <div
              className="mt-6 flex flex-col items-center gap-2 animate-time-slam"
              style={{
                animationDelay: '2.4s',
                animationFillMode: 'both'
              }}
            >
              {timeWarpEvent.result === 'green' ? (
                <>
                  <div className="text-2xl md:text-4xl font-black text-emerald-400 tracking-wider drop-shadow-[0_0_25px_rgba(34,197,94,1)] uppercase">
                    REWOUND 1 STAGE! (-1)
                  </div>
                  <div className="text-base md:text-xl font-extrabold text-white bg-emerald-950/90 border border-emerald-500 px-6 py-1.5 rounded-full shadow-lg">
                    {timeWarpEvent.targetName}: Stage {timeWarpEvent.oldPhase} → Stage {timeWarpEvent.newPhase}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl md:text-4xl font-black text-rose-400 tracking-wider drop-shadow-[0_0_25px_rgba(239,68,68,1)] uppercase">
                    ADVANCED 1 STAGE! (+1)
                  </div>
                  <div className="text-base md:text-xl font-extrabold text-white bg-rose-950/90 border border-rose-500 px-6 py-1.5 rounded-full shadow-lg">
                    {timeWarpEvent.targetName}: Stage {timeWarpEvent.oldPhase} → Stage {timeWarpEvent.newPhase}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Minecraft Totem of Undying Popping Animation (2.0s) */}
      {activeTotem && (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
          {/* Golden Radiance Aura Glow */}
          <div className="absolute w-[520px] h-[520px] rounded-full bg-gradient-to-r from-amber-400/40 via-yellow-300/30 to-emerald-400/20 blur-3xl animate-totem-radiance" />

          {/* Radiating Sparkle Particles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[
              { x: -140, y: -160, color: 'bg-amber-300', delay: '0ms', size: 12 },
              { x: 160, y: -130, color: 'bg-yellow-200', delay: '100ms', size: 14 },
              { x: -190, y: 40, color: 'bg-emerald-400', delay: '150ms', size: 12 },
              { x: 180, y: 70, color: 'bg-amber-400', delay: '50ms', size: 16 },
              { x: -90, y: -220, color: 'bg-yellow-300', delay: '200ms', size: 14 },
              { x: 100, y: -210, color: 'bg-emerald-300', delay: '120ms', size: 12 },
              { x: -160, y: 160, color: 'bg-amber-200', delay: '80ms', size: 10 },
              { x: 150, y: 180, color: 'bg-yellow-400', delay: '220ms', size: 12 },
              { x: 0, y: -240, color: 'bg-amber-300', delay: '60ms', size: 18 },
              { x: 0, y: 220, color: 'bg-emerald-400', delay: '140ms', size: 14 },
              { x: -220, y: -60, color: 'bg-yellow-100', delay: '180ms', size: 12 },
              { x: 230, y: -40, color: 'bg-amber-300', delay: '90ms', size: 14 }
            ].map((p, idx) => (
              <span
                key={idx}
                className={`absolute rounded-full ${p.color} shadow-[0_0_15px_rgba(251,191,36,0.9)] animate-totem-sparkle`}
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  '--tx': `${p.x}px`,
                  '--ty': `${p.y}px`,
                  animationDelay: p.delay
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* Floating Card Item */}
          <div className="relative animate-totem-card flex flex-col items-center">
            <div className="relative p-2.5 rounded-2xl bg-gradient-to-b from-amber-300/60 via-yellow-500/40 to-amber-600/60 border-2 border-amber-300 shadow-[0_0_60px_rgba(251,191,36,1)]">
              <img
                src={activeTotem.image}
                alt={activeTotem.title}
                className="w-36 h-52 sm:w-44 sm:h-64 object-contain rounded-xl shadow-2xl drop-shadow-[0_0_25px_rgba(255,255,255,0.9)]"
              />
            </div>
            <div className="mt-3 px-4 py-1 rounded-full bg-black/85 border border-amber-400/80 text-amber-300 font-extrabold text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(251,191,36,0.8)] backdrop-blur-md flex items-center gap-2">
              <span>{activeTotem.playerName}</span>
            </div>
          </div>
        </div>
      )}

      {/* Left-Edge Game Standings & Information Slide-Out Tab */}
      <div
        onMouseEnter={() => setIsInfoTabOpen(true)}
        onMouseLeave={() => {
          if (!isInfoPinned) setIsInfoTabOpen(false);
        }}
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-stretch transition-transform duration-300 ease-out select-none ${
          isInfoTabOpen || isInfoPinned ? 'translate-x-0' : '-translate-x-[calc(100%-40px)]'
        }`}
      >
        {/* Expanded Standings Modal Panel */}
        <div className="bg-neutral-950/95 backdrop-blur-2xl border-y border-r border-cyan-500/40 shadow-[0_0_50px_rgba(0,0,0,0.95)] rounded-r-2xl p-5 text-white w-[540px] max-w-[90vw] flex flex-col gap-3.5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              
              <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-cyan-400 to-sky-200 bg-clip-text text-transparent">
                GAME STANDINGS
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                Round {gameState.roundNumber}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsInfoPinned(prev => !prev)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                isInfoPinned
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                  : 'bg-white/5 border-white/15 text-neutral-400 hover:text-white'
              }`}
              title={isInfoPinned ? 'Unpin Standings Tab' : 'Pin Standings Tab Open'}
            >
              
              <span>{isInfoPinned ? 'Pinned' : 'Pin'}</span>
            </button>
          </div>

          {/* Standings Table */}
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto pr-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-neutral-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-2.5">Player</th>
                  <th className="py-2 px-2 text-center">Phase</th>
                  <th className="py-2 px-2 text-center">Points</th>
                  <th className="py-2 px-2 text-center">Cards</th>
                  <th className="py-2 px-2.5">Status Effects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {[...gameState.players]
                  .sort((a, b) => b.currentPhase - a.currentPhase || a.score - b.score)
                  .map((player, idx) => {
                    const isMe = player.id === secretToken;
                    const isCurrentTurn = player.id === gameState.currentTurnPlayerId;
                    const hasStatus = Boolean(
                      player.hasNumberEyeEffect ||
                      player.hasColorEyeEffect ||
                      player.hasLuck ||
                      player.hasUnlucky ||
                      player.hasDoubleDebuff ||
                      player.hasVoyanceDebuff ||
                      (player.crackedCardCount && player.crackedCardCount > 0)
                    );

                    return (
                      <tr
                        key={player.id}
                        className={`transition-colors ${
                          isMe
                            ? 'bg-cyan-950/35 hover:bg-cyan-950/50'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        {/* Player Column */}
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-neutral-400 text-[10px] w-4">
                              #{idx + 1}
                            </span>
                            <span className={`font-bold ${isMe ? 'text-cyan-300' : 'text-white'}`}>
                              {player.name}
                            </span>
                            {isMe && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 font-extrabold">
                                YOU
                              </span>
                            )}
                            {player.isHost && <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold">HOST</span>}
                            {player.isBot && (
                              <span className="text-[9px] text-neutral-400 font-bold">[BOT]</span>
                            )}
                            {isCurrentTurn && (
                              <span
                                className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block"
                                title="Current Turn"
                              />
                            )}
                            {player.isResigned && (
                              <span className="text-[9px] text-rose-400 font-extrabold">[RESIGNED]</span>
                            )}
                            {player.isSkipped && (
                              <span className="text-[9px] text-red-300 font-bold">[SKIPPED]</span>
                            )}
                          </div>
                        </td>

                        {/* Phase Column */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="inline-flex items-center gap-1 font-bold text-neutral-200">
                            <span>Phase {player.currentPhase}</span>
                            {player.phaseCompletedInRound && (
                              <span
                                className="text-emerald-400 font-bold text-[10px] bg-emerald-950/80 border border-emerald-500/40 px-1 py-0.5 rounded"
                                title="Completed in current round"
                              >
                                DONE
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Points Column */}
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-black text-amber-300 text-sm">
                            {player.score}
                          </span>
                        </td>

                        {/* Cards In Hand Column */}
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-bold text-neutral-300">
                            {player.cardCount}
                          </span>
                        </td>

                        {/* Status Effects Column */}
                        <td className="py-2.5 px-2.5">
                          {hasStatus ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {renderPlayerStatusBadges(player)}
                            </div>
                          ) : (
                            <span className="text-neutral-500 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Footer Info */}
          <div className="text-[10px] text-neutral-400 border-t border-white/10 pt-2 flex items-center justify-between">
            <span>Target: {gameState.settings?.totalPhases ?? 10} Phases</span>
            <span>Direction: {gameState.playDirection === 1 ? 'Clockwise (CW)' : 'Counter-Clockwise (CCW)'}</span>
          </div>
        </div>

        {/* The Sleek Handle Tab */}
        <div
          onClick={() => setIsInfoPinned(prev => !prev)}
          className="w-10 bg-gradient-to-b from-cyan-600 via-sky-700 to-blue-800 border-y border-r border-cyan-400 rounded-r-xl cursor-pointer flex flex-col items-center justify-center py-5 gap-3 shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:brightness-125 transition-all"
        >
          
          <span
            className="text-[10px] font-black tracking-widest text-cyan-100 uppercase"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            STANDINGS
          </span>
        </div>
      </div>

      {/* Universal Divine Descent (5.5s) */}
      {divineDescentEvent && (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
          {/* Vertical Descending God Rays */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                linear-gradient(180deg, rgba(251,191,36,0.35) 0%, rgba(251,191,36,0.1) 60%, transparent 100%),
                repeating-linear-gradient(90deg, rgba(255,235,140,0.18) 0px, rgba(255,235,140,0.18) 50px, transparent 50px, transparent 120px)
              `,
              maskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 60%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 60%, transparent 100%)'
            }}
          />

          {/* Central God Ray Light Beam Column from Top */}
          <div
            className="absolute top-0 w-[450px] md:w-[650px] h-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 50% 100% at 50% 0%, rgba(255,245,180,0.65) 0%, rgba(251,191,36,0.25) 45%, transparent 80%)'
            }}
          />

          {/* Descending Card & Banner */}
          <div
            className="relative z-10 flex flex-col items-center gap-5"
            style={{
              animation: 'divineDescend 5.5s cubic-bezier(0.25, 1, 0.5, 1) forwards'
            }}
          >
            <div className="flex flex-col items-center gap-2 select-none text-center">
              <h2 className="text-3xl md:text-5xl font-black text-amber-300 tracking-widest uppercase drop-shadow-[0_0_30px_rgba(251,191,36,0.9)]">
                DIVINE DESCENT
              </h2>
              <p className="text-base md:text-xl font-extrabold text-white tracking-wider drop-shadow-[0_0_15px_rgba(0,0,0,0.9)]">
                {divineDescentEvent.playerName} INVOKED {divineDescentEvent.ultType.toUpperCase()}!
              </p>
            </div>

            <div className="relative rounded-2xl p-2 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600 shadow-[0_0_80px_rgba(251,191,36,1)] scale-125">
              <CardView card={divineDescentEvent.card} size="lg" isSelectable={false} />
            </div>
          </div>
        </div>
      )}

      {/* Alternate World 2-Second Smooth Pitch-Black Transition */}
      {dimensionFadeActive && (
        <div
          className="fixed inset-0 z-[100] pointer-events-none bg-black select-none"
          style={{ animation: 'dimension-fade 2s ease-in-out forwards' }}
        />
      )}

      {/* Admin Password Prompt Modal */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-neutral-950 border-2 border-amber-500/80 rounded-2xl p-6 w-[340px] shadow-[0_0_40px_rgba(245,158,11,0.5)] flex flex-col gap-4 text-white select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                
                <h3 className="text-base font-black tracking-wider text-amber-400 uppercase">Admin Access</h3>
              </div>
              <button
                onClick={() => {
                  setShowAdminPasswordModal(false);
                  setAdminPasswordInput('');
                  setAdminPasswordError(false);
                }}
                className="text-neutral-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-400">Enter server admin password to unlock developer card spawner.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (adminPasswordInput === '3115') {
                  setIsAdminAuthenticated(true);
                  setShowAdminPasswordModal(false);
                  setShowAdminSpawner(true);
                  setAdminPasswordError(false);
                  setAdminPasswordInput('');
                } else {
                  setAdminPasswordError(true);
                }
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="password"
                autoFocus
                placeholder="Password..."
                value={adminPasswordInput}
                onChange={(e) => {
                  setAdminPasswordInput(e.target.value);
                  setAdminPasswordError(false);
                }}
                className="bg-neutral-900 border border-neutral-700 focus:border-amber-400 px-3 py-2 rounded-lg text-sm text-white font-mono outline-none"
              />
              {adminPasswordError && (
                <span className="text-xs text-red-400 font-bold">Incorrect password. Access denied.</span>
              )}
              <div className="flex items-center justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPasswordModal(false);
                    setAdminPasswordInput('');
                    setAdminPasswordError(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black cursor-pointer shadow-lg transition-colors"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Admin Spawner Bar */}
      {showAdminSpawner && (
        <div className="fixed top-16 right-6 z-[95] bg-neutral-950/95 border border-amber-500/60 rounded-2xl p-4 w-[380px] shadow-[0_0_35px_rgba(245,158,11,0.4)] backdrop-blur-xl text-white select-none animate-fade-in flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              
              <span className="text-xs font-black tracking-wider text-amber-400 uppercase">Admin Card Spawner</span>
              <span className="text-[10px] text-neutral-500 font-mono">(Shift+L)</span>
            </div>
            <button
              onClick={() => setShowAdminSpawner(false)}
              className="text-neutral-400 hover:text-white text-xs cursor-pointer p-1"
              title="Close Spawner"
            >
              ✕
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = adminCardInput.trim().toLowerCase().replace(/\.(png|webp)$/i, '');
              if (!trimmed) return;
              onAdminSpawnCard?.(trimmed, '3115', (res) => {
                if (res && res.success) {
                  setAdminSpawnFeedback({ msg: `Spawned ${trimmed}!`, isError: false });
                  setAdminCardInput('');
                } else {
                  setAdminSpawnFeedback({ msg: res?.error || 'Spawn failed', isError: true });
                }
                setTimeout(() => setAdminSpawnFeedback(null), 3000);
              });
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              autoFocus
              placeholder="Card name (e.g. time, singularity, red_10)..."
              value={adminCardInput}
              onChange={(e) => setAdminCardInput(e.target.value)}
              className="flex-1 bg-neutral-900 border border-neutral-700 focus:border-amber-400 px-3 py-1.5 rounded-lg text-xs text-white font-mono outline-none placeholder:text-neutral-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-lg cursor-pointer transition-colors shadow"
            >
              Spawn
            </button>
          </form>

          {adminSpawnFeedback && (
            <div
              className={`text-xs px-2.5 py-1 rounded font-bold ${
                adminSpawnFeedback.isError
                  ? 'bg-red-950/80 text-red-300 border border-red-500/50'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
              }`}
            >
              {adminSpawnFeedback.isError ? 'Error: ' : 'Success: '}
              {adminSpawnFeedback.msg}
            </div>
          )}

          {/* Quick Spawn Chips */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Quick Spawn:</span>
            <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto pr-1">
              {[
                'singularity', 'voyance', 'alternate', 'avarice',
                'nuke', 'jester', 'time', 'crack', 'status', 'luck',
                'unlucky', 'double', 'redo', 'number_eye', 'color_eye',
                'plus_two', 'plus_three', 'wild', 'skip', 'reverse',
                'red_10', 'blue_7', 'yellow_1', 'green_12'
              ].map((cardName) => (
                <button
                  key={cardName}
                  type="button"
                  onClick={() => {
                    onAdminSpawnCard?.(cardName, '3115', (res) => {
                      if (res && res.success) {
                        setAdminSpawnFeedback({ msg: `Spawned ${cardName}!`, isError: false });
                      } else {
                        setAdminSpawnFeedback({ msg: res?.error || 'Spawn failed', isError: true });
                      }
                      setTimeout(() => setAdminSpawnFeedback(null), 3000);
                    });
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-700/80 hover:border-amber-400/80 cursor-pointer transition-all"
                >
                  {cardName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes screenShake {
          0% { transform: scale(${scale}) translate(0, 0) rotate(0deg); }
          20% { transform: scale(${scale}) translate(-8px, 6px) rotate(-0.5deg); }
          40% { transform: scale(${scale}) translate(8px, -5px) rotate(0.5deg); }
          60% { transform: scale(${scale}) translate(-7px, -4px) rotate(-0.3deg); }
          80% { transform: scale(${scale}) translate(7px, 5px) rotate(0.4deg); }
          100% { transform: scale(${scale}) translate(0, 0) rotate(0deg); }
        }
        @keyframes divineDescend {
          0% {
            transform: translateY(-260px) scale(1.4);
            opacity: 0;
          }
          18% {
            transform: translateY(0px) scale(1.1);
            opacity: 1;
          }
          80% {
            transform: translateY(0px) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translateY(160px) scale(0.6);
            opacity: 0;
          }
        }
        @keyframes suctionCard {
          0% {
            transform: rotate(0deg) translateY(-220px) scale(0.9);
            opacity: 1;
          }
          100% {
            transform: rotate(720deg) translateY(0px) scale(0.1);
            opacity: 0;
          }
        }
        @keyframes dimension-fade {
          0% { opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
