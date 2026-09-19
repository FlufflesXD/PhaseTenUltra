import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Card,
  ChatMessage,
  GameNotification,
  PublicGameState,
  RoomState,
  GameActionEvent
} from '@phase-ten/shared';

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [hand, setHand] = useState<Card[]>([]);
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [latestAction, setLatestAction] = useState<GameActionEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((msg: string | null) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    setError(msg);
    if (msg) {
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
        errorTimeoutRef.current = null;
      }, 4000);
    }
  }, []);

  const [secretToken] = useState<string>(() => {
    let t = localStorage.getItem('phaseten_secret_token');
    if (!t) {
      t = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('phaseten_secret_token', t);
    }
    return t;
  });

  const [playerName, setPlayerNameState] = useState<string>(() => {
    return localStorage.getItem('phaseten_player_name') || 'Player';
  });

  const socketRef = useRef<Socket | null>(null);

  const setPlayerName = (name: string) => {
    setPlayerNameState(name);
    localStorage.setItem('phaseten_player_name', name);
  };

  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      showError(null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('room_state', (state: RoomState) => {
      setRoomState(state);
      if (state.chatMessages) {
        setChatMessages(state.chatMessages);
      }
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      setChatMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('game_state', (state: PublicGameState) => {
      setGameState(state);
    });

    socket.on('player_hand', (cards: Card[]) => {
      setHand(cards);
    });

    socket.on('game_notification', (notif: GameNotification) => {
      setNotifications(prev => [notif, ...prev.slice(0, 4)]);
    });

    socket.on('game_action', (action: GameActionEvent) => {
      setLatestAction(action);
    });

    socket.on('error_message', (msg: string) => {
      showError(msg);
    });

    return () => {
      socket.disconnect();
    };
  }, [showError]);

  const createRoom = useCallback((callback?: (res: any) => void) => {
    if (!socketRef.current) return;
    socketRef.current.emit(
      'create_room',
      { name: playerName, secretToken },
      (res: any) => {
        if (!res.success && res.error) showError(res.error);
        if (callback) callback(res);
      }
    );
  }, [playerName, secretToken, showError]);

  const joinRoom = useCallback((roomCode: string, isSpectator = false, claimPlayerId?: string, overrideName?: string, callback?: (res: any) => void) => {
    if (!socketRef.current) return;
    const finalName = overrideName?.trim() || playerName;
    socketRef.current.emit(
      'join_room',
      { roomCode: roomCode.toUpperCase(), name: finalName, secretToken, isSpectator, claimPlayerId },
      (res: any) => {
        if (!res.success && res.error) showError(res.error);
        if (callback) callback(res);
      }
    );
  }, [playerName, secretToken, showError]);

  const updateSettings = useCallback((settings: any) => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('update_settings', {
      roomCode: code,
      secretToken,
      settings
    });
  }, [gameState, roomState, secretToken]);

  const startGame = useCallback(() => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('start_game', { roomCode: code, secretToken });
  }, [gameState, roomState, secretToken]);

  const drawCard = useCallback((source: 'deck' | 'discard') => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('draw_card', { roomCode: code, secretToken, source });
  }, [gameState, roomState, secretToken]);

  const layDownPhase = useCallback((cardGroups: Card[][]) => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('lay_down_phase', { roomCode: code, secretToken, cardGroups });
  }, [gameState, roomState, secretToken]);

  const layPhaseRequirement = useCallback((reqIndex: number, cardIds: string[]) => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('lay_phase_requirement', { roomCode: code, secretToken, reqIndex, cardIds });
  }, [gameState, roomState, secretToken]);

  const layExtraMeld = useCallback((cardIds: string[]) => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('lay_extra_meld', { roomCode: code, secretToken, cardIds });
  }, [gameState, roomState, secretToken]);

  const hitCard = useCallback((cardId: string | string[], targetGroupId: string, targetEnd?: 'low' | 'high') => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('hit_card', { roomCode: code, secretToken, cardId, targetGroupId, targetEnd });
  }, [gameState, roomState, secretToken]);

  const discardCard = useCallback((cardId: string, skipTargetPlayerId?: string, activateAbility?: boolean) => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('discard_card', { roomCode: code, secretToken, cardId, skipTargetPlayerId, activateAbility });
  }, [gameState, roomState, secretToken]);

  const nextRound = useCallback(() => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('next_round', { roomCode: code, secretToken });
  }, [gameState, roomState, secretToken]);

  const startNewMatch = useCallback(() => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('start_new_match', { roomCode: code, secretToken });
  }, [gameState, roomState, secretToken]);

  const returnToLobby = useCallback(() => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('return_to_lobby', { roomCode: code, secretToken });
    setGameState(null);
  }, [gameState, roomState, secretToken]);

  const leaveRoom = useCallback(() => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('leave_room', { roomCode: code, secretToken }, () => {
      setRoomState(null);
      setGameState(null);
      setHand([]);
      setChatMessages([]);
    });
  }, [gameState, roomState, secretToken]);

  const sendChat = useCallback((text: string) => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('send_chat', { roomCode: code, secretToken, text });
  }, [gameState, roomState, secretToken]);

  const claimSeat = useCallback((targetPlayerId: string, callback?: (res: any) => void) => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('claim_seat', { roomCode: code, secretToken, targetPlayerId }, (res: any) => {
      if (callback) callback(res);
    });
  }, [gameState, roomState, secretToken]);

  const adminSpawnCard = useCallback(
    (cardName: string, password: string, callback?: (res: any) => void) => {
      const code = gameState?.roomCode || roomState?.code;
      if (!socketRef.current || !code) return;
      socketRef.current.emit(
        'admin_spawn_card',
        { roomCode: code, secretToken, cardName, password },
        (res: any) => {
          if (callback) callback(res);
          if (res && !res.success && res.error) {
            showError(res.error);
          }
        }
      );
    },
    [gameState, roomState, secretToken, showError]
  );

  const sacrificeCard = useCallback(
    (cardIdToSacrifice: string, ultimateCardId: string, callback?: (res: any) => void) => {
      const code = gameState?.roomCode || roomState?.code;
      if (!socketRef.current || !code) return;
      socketRef.current.emit(
        'sacrifice_card',
        { roomCode: code, secretToken, cardIdToSacrifice, ultimateCardId },
        (res: any) => {
          if (callback) callback(res);
          if (res && !res.success && res.error) {
            showError(res.error);
          }
        }
      );
    },
    [gameState, roomState, secretToken, showError]
  );

  const playUltimateCard = useCallback(
    (ultimateCardId: string, callback?: (res: any) => void) => {
      const code = gameState?.roomCode || roomState?.code;
      if (!socketRef.current || !code) return;
      socketRef.current.emit(
        'play_ultimate_card',
        { roomCode: code, secretToken, ultimateCardId },
        (res: any) => {
          if (callback) callback(res);
          if (res && !res.success && res.error) {
            showError(res.error);
          }
        }
      );
    },
    [gameState, roomState, secretToken, showError]
  );

  const resign = useCallback(() => {
    const code = gameState?.roomCode || roomState?.code;
    if (!socketRef.current || !code) return;
    socketRef.current.emit('resign', { roomCode: code, secretToken });
  }, [gameState, roomState, secretToken]);

  return {
    socket: socketRef.current,
    connected,
    secretToken,
    playerName,
    setPlayerName,
    roomState,
    gameState,
    hand,
    notifications,
    chatMessages,
    latestAction,
    error,
    clearError: () => showError(null),
    showError,
    createRoom,
    joinRoom,
    claimSeat,
    updateSettings,
    startGame,
    drawCard,
    layDownPhase,
    layPhaseRequirement,
    layExtraMeld,
    hitCard,
    discardCard,
    adminSpawnCard,
    sacrificeCard,
    playUltimateCard,
    resign,
    nextRound,
    startNewMatch,
    returnToLobby,
    leaveRoom,
    sendChat
  };
}
