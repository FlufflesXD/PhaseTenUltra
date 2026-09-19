import {
  ChatMessage,
  GameNotification,
  GameSettings,
  PlayerPublic,
  RoomState,
  GameActionEvent,
  DEFAULT_SPECIAL_CARDS
} from '@phase-ten/shared';
import { GameSession } from '../game/GameSession.js';

export interface RoomUser {
  socketId: string;
  secretToken: string;
  name: string;
  isSpectator: boolean;
}

export class Room {
  public readonly code: string;
  public hostSecretToken: string;
  public settings: GameSettings;
  public users: Map<string, RoomUser> = new Map();
  public chatMessages: ChatMessage[] = [];
  public gameSession: GameSession | null = null;

  private onBroadcastRoom: (room: Room) => void;
  private onBroadcastGame: (room: Room) => void;
  private onSendNotification: (room: Room, notif: GameNotification) => void;
  private onSendChat: (room: Room, chat: ChatMessage) => void;
  private onBroadcastAction?: (room: Room, action: GameActionEvent) => void;
  private onDeleteRoom: (code: string) => void;
  private emptyRoomTimeout?: NodeJS.Timeout;

  constructor(
    code: string,
    hostUser: RoomUser,
    callbacks: {
      broadcastRoom: (room: Room) => void;
      broadcastGame: (room: Room) => void;
      sendNotification: (room: Room, notif: GameNotification) => void;
      sendChat: (room: Room, chat: ChatMessage) => void;
      deleteRoom: (code: string) => void;
      broadcastAction?: (room: Room, action: GameActionEvent) => void;
    }
  ) {
    this.code = code;
    this.hostSecretToken = hostUser.secretToken;
    this.settings = {
      turnTimerSeconds: 45,
      allowPartialAndExtraSets: true,
      totalPhases: 10,
      randomizePhasesPerRound: false,
      enabledSpecialCards: { ...DEFAULT_SPECIAL_CARDS }
    };
    this.users.set(hostUser.socketId, hostUser);
    this.onBroadcastRoom = callbacks.broadcastRoom;
    this.onBroadcastGame = callbacks.broadcastGame;
    this.onSendNotification = callbacks.sendNotification;
    this.onSendChat = callbacks.sendChat;
    this.onBroadcastAction = callbacks.broadcastAction;
    this.onDeleteRoom = callbacks.deleteRoom;
  }

  public getPlayers(): PlayerPublic[] {
    if (this.gameSession) {
      return this.gameSession.getPublicState().players;
    }

    const list: PlayerPublic[] = [];
    for (const u of this.users.values()) {
      if (u.isSpectator) continue;
      list.push({
        id: u.secretToken,
        name: u.name,
        isHost: u.secretToken === this.hostSecretToken,
        isSpectator: false,
        connected: true,
        score: 0,
        currentPhase: 1,
        phaseCompletedInRound: false,
        cardCount: 0,
        laidDownPhases: [],
        isSkipped: false
      });
    }
    return list;
  }

  public getWaitlist(): { id: string; name: string }[] {
    if (!this.gameSession) {
      return Array.from(this.users.values())
        .filter(u => u.isSpectator)
        .map(u => ({ id: u.secretToken, name: u.name }));
    }
    const activePlayerTokens = new Set(this.gameSession.players.map(p => p.secretToken));
    return Array.from(this.users.values())
      .filter(u => !activePlayerTokens.has(u.secretToken) || u.isSpectator)
      .map(u => ({ id: u.secretToken, name: u.name }));
  }

  public getRoomState(): RoomState {
    return {
      code: this.code,
      hostId: this.hostSecretToken,
      status: this.gameSession ? this.gameSession.status : 'lobby',
      settings: this.settings,
      players: this.getPlayers(),
      waitlist: this.getWaitlist(),
      chatMessages: this.chatMessages.slice(-50)
    };
  }

  public addOrReconnectUser(user: RoomUser, claimPlayerId?: string): { reconnected: boolean } {
    if (this.emptyRoomTimeout) {
      clearTimeout(this.emptyRoomTimeout);
      this.emptyRoomTimeout = undefined;
    }

    let existingSocketId: string | null = null;
    let wasSpectator: boolean | undefined = undefined;
    for (const [sId, existing] of this.users.entries()) {
      if (existing.secretToken === user.secretToken) {
        existingSocketId = sId;
        wasSpectator = existing.isSpectator;
        break;
      }
    }

    if (existingSocketId) {
      this.users.delete(existingSocketId);
    }

    if (wasSpectator !== undefined) {
      user.isSpectator = wasSpectator;
    } else if (!this.gameSession && !user.isSpectator) {
      // In lobby: cap active (non-spectator) players to 4
      const activeCount = Array.from(this.users.values()).filter(
        u => !u.isSpectator && u.secretToken !== user.secretToken
      ).length;
      if (activeCount >= 4) {
        user.isSpectator = true;
      }
    }

    this.users.set(user.socketId, user);

    let reconnected = false;

    if (this.gameSession) {
      let p = this.gameSession.players.find(pl => pl.secretToken === user.secretToken || pl.id === user.secretToken);

      if (!p && claimPlayerId) {
        p = this.gameSession.players.find(pl => (pl.id === claimPlayerId || pl.secretToken === claimPlayerId) && (pl.isBot || !pl.connected));
      }

      if (!p && user.name) {
        p = this.gameSession.players.find(pl => (pl.isBot || !pl.connected) && pl.name.trim().toLowerCase() === user.name.trim().toLowerCase());
      }

      if (p) {
        this.gameSession.reclaimPlayerSeat(p.id, user.secretToken, user.name);
        user.isSpectator = false;
        reconnected = true;
      } else {
        user.isSpectator = true;
      }
    }

    this.onBroadcastRoom(this);
    if (this.gameSession) {
      this.onBroadcastGame(this);
    }

    return { reconnected };
  }

  public claimSeat(userSecretToken: string, targetPlayerId: string): { user: RoomUser; player: any } | null {
    if (!this.gameSession) return null;
    const user = Array.from(this.users.values()).find(u => u.secretToken === userSecretToken);
    if (!user) return null;

    const player = this.gameSession.reclaimPlayerSeat(targetPlayerId, user.secretToken, user.name);
    if (!player) return null;

    user.isSpectator = false;
    this.onBroadcastRoom(this);
    this.onBroadcastGame(this);
    return { user, player };
  }

  public removeSocket(socketId: string): void {
    const user = this.users.get(socketId);
    if (!user) return;

    this.users.delete(socketId);

    if (this.gameSession) {
      this.gameSession.replaceWithBot(user.secretToken);
    }

    if (user.secretToken === this.hostSecretToken && this.users.size > 0) {
      const nextHost = Array.from(this.users.values()).find(u => !u.isSpectator) || Array.from(this.users.values())[0];
      if (nextHost) {
        this.hostSecretToken = nextHost.secretToken;
        if (this.gameSession) {
          this.gameSession.setHost(nextHost.secretToken);
        }
      }
    }

    this.onBroadcastRoom(this);
    if (this.gameSession) {
      this.onBroadcastGame(this);
    }

    if (this.users.size === 0) {
      if (this.gameSession) {
        this.gameSession.pauseTimer();
      }
      this.scheduleEmptyRoomCleanup();
    }
  }

  private scheduleEmptyRoomCleanup(): void {
    if (this.emptyRoomTimeout) {
      clearTimeout(this.emptyRoomTimeout);
    }
    const timeoutMs = (this.gameSession && this.gameSession.status === 'in_game') ? 15000 : 5000;
    this.emptyRoomTimeout = setTimeout(() => {
      if (this.users.size === 0) {
        this.cleanup();
        this.onDeleteRoom(this.code);
      }
    }, timeoutMs);
    this.emptyRoomTimeout.unref?.();
  }

  public returnToLobby(hostToken: string): void {
    if (this.hostSecretToken !== hostToken) {
      throw new Error('Only the lobby host can return to lobby');
    }
    if (this.gameSession) {
      this.gameSession.cleanup();
      this.gameSession = null;
    }
    this.onBroadcastRoom(this);
  }

  public updateSettings(hostToken: string, newSettings: Partial<GameSettings>): void {
    if (this.hostSecretToken !== hostToken) {
      throw new Error('Only the lobby host can modify settings');
    }
    this.settings = {
      ...this.settings,
      ...newSettings,
      enabledSpecialCards: newSettings.enabledSpecialCards
        ? { ...this.settings.enabledSpecialCards, ...newSettings.enabledSpecialCards }
        : this.settings.enabledSpecialCards,
      allowPartialAndExtraSets: true
    };
    if (this.gameSession) {
      this.gameSession.settings = this.settings;
    }
    this.onBroadcastRoom(this);
  }

  public startGame(hostToken: string): void {
    if (this.hostSecretToken !== hostToken) {
      throw new Error('Only the lobby host can start the game');
    }

    const activeUsers = Array.from(this.users.values()).filter(u => !u.isSpectator);
    if (activeUsers.length < 2) {
      throw new Error('At least 2 players are required to start the game');
    }
    if (activeUsers.length > 4) {
      throw new Error('A maximum of 4 players are allowed per game');
    }

    this.gameSession = new GameSession(
      this.code,
      this.settings,
      () => {
        this.onBroadcastGame(this);
      },
      (notif) => {
        this.onSendNotification(this, notif);
      },
      (action) => {
        this.onBroadcastAction?.(this, action);
      }
    );

    this.gameSession.players = activeUsers.map(u => ({
      id: u.secretToken,
      secretToken: u.secretToken,
      name: u.name,
      isHost: u.secretToken === this.hostSecretToken,
      isSpectator: false,
      connected: true,
      score: 0,
      currentPhase: 1,
      phaseCompletedInRound: false,
      cardCount: 0,
      cards: [],
      laidDownPhases: [],
      isSkipped: false
    }));

    this.gameSession.startGame();
    this.onBroadcastGame(this);
  }

  public addChatMessage(senderToken: string, text: string): void {
    const sender = Array.from(this.users.values()).find(u => u.secretToken === senderToken);
    if (!sender || !text.trim()) return;

    const chat: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: sender.secretToken,
      senderName: sender.name,
      text: text.trim().substring(0, 200),
      timestamp: Date.now()
    };

    this.chatMessages.push(chat);
    this.onSendChat(this, chat);
  }

  public cleanup(): void {
    if (this.emptyRoomTimeout) {
      clearTimeout(this.emptyRoomTimeout);
      this.emptyRoomTimeout = undefined;
    }
    if (this.gameSession) {
      this.gameSession.cleanup();
      this.gameSession = null;
    }
    this.users.clear();
    this.chatMessages = [];
  }
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private sweeperInterval?: NodeJS.Timeout;

  constructor() {
    this.sweeperInterval = setInterval(() => {
      this.cleanupEmptyRooms();
    }, 15000);
    this.sweeperInterval.unref?.();
  }

  public cleanupEmptyRooms(): void {
    for (const [code, room] of this.rooms.entries()) {
      if (room.users.size === 0) {
        room.cleanup();
        this.rooms.delete(code);
      }
    }
  }

  public createRoom(
    hostUser: RoomUser,
    callbacks: {
      broadcastRoom: (room: Room) => void;
      broadcastGame: (room: Room) => void;
      sendNotification: (room: Room, notif: GameNotification) => void;
      sendChat: (room: Room, chat: ChatMessage) => void;
      broadcastAction?: (room: Room, action: GameActionEvent) => void;
    }
  ): Room {
    const code = this.generateUniqueCode();
    const room = new Room(code, hostUser, {
      ...callbacks,
      deleteRoom: (c) => this.deleteRoom(c)
    });
    this.rooms.set(code, room);
    return room;
  }

  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  public deleteRoom(code: string): void {
    const upper = code.toUpperCase();
    const room = this.rooms.get(upper);
    if (room) {
      room.cleanup();
      this.rooms.delete(upper);
    }
  }

  public leaveRoom(socketId: string): void {
    const room = this.findRoomBySocketId(socketId);
    if (room) {
      room.removeSocket(socketId);
    }
  }

  public findRoomBySocketId(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.users.has(socketId)) {
        return room;
      }
    }
    return undefined;
  }

  private generateUniqueCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let attempt = 0; attempt < 100; attempt++) {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!this.rooms.has(code)) {
        return code;
      }
    }
    return `P${Date.now().toString().slice(-3)}`;
  }
}

export const roomManager = new RoomManager();
