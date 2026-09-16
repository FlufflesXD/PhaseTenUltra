import { test, describe } from 'node:test';
import assert from 'node:assert';
import { RoomManager } from '../room/RoomManager.js';

describe('End-to-End Game Flow with Two Players', () => {
  test('Lobby creation, player join, and game start', () => {
    const manager = new RoomManager();

    const hostUser = {
      socketId: 'sock_host_1',
      secretToken: 'token_host_1',
      name: 'Alice',
      isSpectator: false
    };

    const room = manager.createRoom(hostUser, {
      broadcastRoom: () => {},
      broadcastGame: () => {},
      sendNotification: () => {},
      sendChat: () => {}
    });

    assert.strictEqual(room.users.size, 1);

    // Second player joins
    const player2 = {
      socketId: 'sock_p2',
      secretToken: 'token_p2',
      name: 'Bob',
      isSpectator: false
    };
    room.addOrReconnectUser(player2);
    assert.strictEqual(room.users.size, 2);

    // Host starts game
    room.startGame(hostUser.secretToken);
    assert.ok(room.gameSession);
    assert.strictEqual(room.gameSession.status, 'in_game');

    const session = room.gameSession;
    assert.strictEqual(session.players.length, 2);
    assert.strictEqual(session.players[0].cards.length, 10);
    assert.strictEqual(session.players[1].cards.length, 10);
    assert.strictEqual(session.discardPile.length, 1);

    room.cleanup();
  });
});
