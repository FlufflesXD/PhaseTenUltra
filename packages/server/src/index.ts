import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { roomManager, Room, RoomUser } from './room/RoomManager.js';
import { GameNotification, ChatMessage } from '@phase-ten/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '6969', 10);
const HOST = '0.0.0.0';

const app = fastify({ logger: true });

await app.register(fastifyCors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});

// REST Endpoints
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: Date.now() };
});

// Serve frontend static files if client build exists
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  await app.register(fastifyStatic, {
    root: clientDistPath,
    prefix: '/'
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url && req.raw.url.startsWith('/api')) {
      reply.status(404).send({ error: 'Endpoint not found' });
    } else {
      reply.sendFile('index.html');
    }
  });
}

// Attach Socket.io
const io = new SocketIOServer(app.server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

function broadcastRoom(room: Room): void {
  io.to(room.code).emit('room_state', room.getRoomState());
}

function broadcastGame(room: Room): void {
  if (!room.gameSession) return;
  const publicState = room.gameSession.getPublicState();
  publicState.waitlist = room.getWaitlist();
  io.to(room.code).emit('game_state', publicState);

  // Send private hands
  for (const [socketId, user] of room.users.entries()) {
    const hand = room.gameSession.getPlayerHand(user.secretToken);
    io.to(socketId).emit('player_hand', hand);
  }
}

function sendNotification(room: Room, notif: GameNotification): void {
  io.to(room.code).emit('game_notification', notif);
}

function sendChat(room: Room, chat: ChatMessage): void {
  io.to(room.code).emit('chat_message', chat);
}

io.on('connection', (socket) => {
  socket.on('create_room', (data: { name: string; secretToken: string }, callback) => {
    try {
      const user: RoomUser = {
        socketId: socket.id,
        secretToken: data.secretToken || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: data.name?.trim() || 'Host',
        isSpectator: false
      };

      const room = roomManager.createRoom(user, {
        broadcastRoom,
        broadcastGame,
        sendNotification,
        sendChat
      });

      socket.join(room.code);
      broadcastRoom(room);

      if (typeof callback === 'function') {
        callback({ success: true, roomCode: room.code, secretToken: user.secretToken });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  socket.on('join_room', (data: { roomCode: string; name: string; secretToken: string; isSpectator?: boolean; claimPlayerId?: string }, callback) => {
    try {
      const room = roomManager.getRoom(data.roomCode);
      if (!room) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
        return;
      }

      const user: RoomUser = {
        socketId: socket.id,
        secretToken: data.secretToken || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: data.name?.trim() || 'Player',
        isSpectator: !!data.isSpectator
      };

      const result = room.addOrReconnectUser(user, data.claimPlayerId);
      socket.join(room.code);

      if (room.gameSession) {
        const hand = room.gameSession.getPlayerHand(user.secretToken);
        socket.emit('player_hand', hand);
      }

      if (typeof callback === 'function') {
        callback({ success: true, roomCode: room.code, secretToken: user.secretToken, reconnected: result.reconnected });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  socket.on('update_settings', (data: { roomCode: string; secretToken: string; settings: any }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room) {
      try {
        room.updateSettings(data.secretToken, data.settings);
      } catch (err: any) {
        socket.emit('error_message', err.message);
      }
    }
  });

  socket.on('start_game', (data: { roomCode: string; secretToken: string }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room) {
      try {
        room.startGame(data.secretToken);
      } catch (err: any) {
        socket.emit('error_message', err.message);
      }
    }
  });

  socket.on('draw_card', (data: { roomCode: string; secretToken: string; source: 'deck' | 'discard' }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room && room.gameSession) {
      try {
        room.gameSession.drawCard(data.secretToken, data.source);
      } catch (err: any) {
        socket.emit('error_message', err.message);
      }
    }
  });

  socket.on('lay_down_phase', (data: { roomCode: string; secretToken: string; cardGroups: any[][] }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room && room.gameSession) {
      try {
        room.gameSession.layDownPhase(data.secretToken, data.cardGroups);
      } catch (err: any) {
        socket.emit('error_message', err.message);
      }
    }
  });

  socket.on('lay_phase_requirement', (data: { roomCode: string; secretToken: string; reqIndex: number; cardIds: string[] }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room && room.gameSession) {
      try {
        room.gameSession.layPhaseRequirement(data.secretToken, data.reqIndex, data.cardIds);
      } catch (err: any) {
        socket.emit('error_message', err.message);
      }
    }
  });

  socket.on('lay_extra_meld', (data: { roomCode: string; secretToken: string; cardIds: string[] }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room && room.gameSession) {
      try {
        room.gameSession.layExtraGroup(data.secretToken, data.cardIds);
      } catch (err: any) {
        socket.emit('error_message', err.message);
      }
    }
  });

  socket.on('hit_card', (data: { roomCode: string; secretToken: string; cardId: string | string[]; targetGroupId: string; targetEnd?: 'low' | 'high' }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room && room.gameSession) {
      try {
        room.gameSession.hitCard(data.secretToken, data.cardId, data.targetGroupId, data.targetEnd);
      } catch (err: any) {
        socket.emit('error_message', err.message);
      }
    }
  });

  socket.on('discard_card', (data: { roomCode: string; secretToken: string; cardId: string; skipTargetPlayerId?: string }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room && room.gameSession) {
      try {
        room.gameSession.discardCard(data.secretToken, data.cardId, data.skipTargetPlayerId);
      } catch (err: any) {
        socket.emit('error_message', err.message);
      }
    }
  });

  socket.on('next_round', (data: { roomCode: string; secretToken: string }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room && room.gameSession && room.hostSecretToken === data.secretToken) {
      room.gameSession.nextRound();
    }
  });

  socket.on('start_new_match', (data: { roomCode: string; secretToken: string }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room && room.gameSession && room.hostSecretToken === data.secretToken) {
      room.gameSession.restartGame();
    }
  });

  socket.on('return_to_lobby', (data: { roomCode: string; secretToken: string }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room && room.hostSecretToken === data.secretToken) {
      room.returnToLobby(data.secretToken);
    }
  });

  socket.on('claim_seat', (data: { roomCode: string; secretToken: string; targetPlayerId: string }, callback) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room) {
      try {
        const reclaimed = room.claimSeat(data.secretToken, data.targetPlayerId);
        if (reclaimed) {
          const hand = room.gameSession!.getPlayerHand(reclaimed.user.secretToken);
          socket.emit('player_hand', hand);
          if (typeof callback === 'function') callback({ success: true });
        } else {
          if (typeof callback === 'function') callback({ success: false, error: 'Seat not available' });
        }
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    }
  });

  socket.on('leave_room', (data: { roomCode: string; secretToken: string }, callback) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (room) {
      room.removeSocket(socket.id);
      socket.leave(room.code);
    }
    if (typeof callback === 'function') {
      callback({ success: true });
    }
  });

  socket.on('send_chat', (data: { roomCode: string; secretToken: string; text: string }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room) {
      room.addChatMessage(data.secretToken, data.text);
    }
  });

  socket.on('disconnect', () => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (room) {
      room.removeSocket(socket.id);
    }
  });
});

async function start() {
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`TenStages Server running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
