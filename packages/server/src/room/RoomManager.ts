import {
  ChatMessage,
  GameNotification,
  GameSettings,
  PlayerPublic,
  RoomState
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

  constructor(
    code: string,
    hostUser: RoomUser,
    callbacks: {
      broadcastRoom: (room: Room) => void;
      broadcastGame: (room: Room) => void;
      sendNotification: (room: Room, notif: GameNotification) => void;
      sendChat: (room: Room, chat: ChatMessage) => void;
    }
  ) {
    this.code = code;
    this.hostSecretToken = hostUser.secretToken;
    this.settings = {
      turnTimerSeconds: 45,
      allowPartialAndExtraSets: true
    };
    this.users.set(hostUser.socketId, hostUser);
    this.onBroadcastRoom = callbacks.broadcastRoom;
    this.onBroadcastGame = callbacks.broadcastGame;
    this.onSendNotification = callbacks.sendNotification;
    this.onSendChat = callbacks.sendChat;
  }

  public getPlayers(): PlayerPublic[] {
    if (this.gameSession) {
      return this.gameSession.getPublicState().players;
    }

    const list: PlayerPublic[] = [];
    for (const u of this.users.values()) {
      list.push({
        id: u.secretToken,
        name: u.name,
        isHost: u.secretToken === this.hostSecretToken,
        isSpectator: u.isSpectator,
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

  public getRoomState(): RoomState {
    return {
      code: this.code,
      hostId: this.hostSecretToken,
      status: this.gameSession ? this.gameSession.status : 'lobby',
      settings: this.settings,
      players: this.getPlayers(),
      chatMessages: this.chatMessages.slice(-50)
    };
  }

  public addOrReconnectUser(user: RoomUser): void {
    let existingSocketId: string | null = null;
    for (const [sId, existing] of this.users.entries()) {
      if (existing.secretToken === user.secretToken) {
        existingSocketId = sId;
        break;
      }
    }

    if (existingSocketId) {
      this.users.delete(existingSocketId);
    }
    this.users.set(user.socketId, user);

    if (this.gameSession) {
      const p = this.gameSession.players.find(pl => pl.secretToken === user.secretToken);
      if (p) {
        p.id = user.secretToken;
        p.connected = true;
      }
    }

    this.onBroadcastRoom(this);
    if (this.gameSession) {
      this.onBroadcastGame(this);
    }
  }

  public removeSocket(socketId: string): void {
    const user = this.users.get(socketId);
    if (!user) return;

    this.users.delete(socketId);

    if (this.gameSession) {
      const p = this.gameSession.players.find(pl => pl.secretToken === user.secretToken);
      if (p) {
        p.connected = false;
      }
      this.onBroadcastGame(this);
    } else {
      if (user.secretToken === this.hostSecretToken && this.users.size > 0) {
        const nextHost = Array.from(this.users.values())[0];
        this.hostSecretToken = nextHost.secretToken;
      }
      this.onBroadcastRoom(this);
    }
  }

  public updateSettings(hostToken: string, newSettings: Partial<GameSettings>): void {
    if (this.hostSecretToken !== hostToken) {
      throw new Error('Only the lobby host can modify settings');
    }
    this.settings = { ...this.settings, ...newSettings };
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

    this.gameSession = new GameSession(
      this.code,
      this.settings,
      () => {
        this.onBroadcastGame(this);
      },
      (notif) => {
        this.onSendNotification(this, notif);
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
    if (this.gameSession) {
      this.gameSession.cleanup();
    }
  }
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  public createRoom(
    hostUser: RoomUser,
    callbacks: {
      broadcastRoom: (room: Room) => void;
      broadcastGame: (room: Room) => void;
      sendNotification: (room: Room, notif: GameNotification) => void;
      sendChat: (room: Room, chat: ChatMessage) => void;
    }
  ): Room {
    const code = this.generateUniqueCode();
    const room = new Room(code, hostUser, callbacks);
    this.rooms.set(code, room);
    return room;
  }

  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  public deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room) {
      room.cleanup();
      this.rooms.delete(code);
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
