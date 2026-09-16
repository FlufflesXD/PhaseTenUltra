import { test, describe } from 'node:test';
import assert from 'node:assert';
import { RoomManager } from '../room/RoomManager.js';

describe('Bot Takeover, Reconnection, and Waitlist Tests', () => {
  test('disconnected player is replaced by bot and plays automatically', () => {
    const rm = new RoomManager();
    const room = rm.createRoom(
      { socketId: 'sock1', secretToken: 'token1', name: 'Alice', isSpectator: false },
      {
        broadcastRoom: () => {},
        broadcastGame: () => {},
        sendNotification: () => {},
        sendChat: () => {}
      }
    );

    room.addOrReconnectUser({ socketId: 'sock2', secretToken: 'token2', name: 'Bob', isSpectator: false });
    room.settings.turnTimerSeconds = 0;
    room.startGame('token1');

    assert.strictEqual(room.gameSession?.status, 'in_game');
    assert.strictEqual(room.gameSession.players.length, 2);

    // Bob disconnects
    room.removeSocket('sock2');

    const bobPlayer = room.gameSession.players.find(p => p.name === 'Bob');
    assert.ok(bobPlayer);
    assert.strictEqual(bobPlayer.connected, false);
    assert.strictEqual(bobPlayer.isBot, true);

    // Bot executes turn without error
    if (room.gameSession.getCurrentPlayer().id === bobPlayer.id) {
      room.gameSession.executeBotTurn(bobPlayer);
      assert.notStrictEqual(room.gameSession.getCurrentPlayer().id, bobPlayer.id);
    }
    room.cleanup();
  });

  test('reconnecting player reclaims bot seat and returns to active play', () => {
    const rm = new RoomManager();
    const room = rm.createRoom(
      { socketId: 'sock1', secretToken: 'token1', name: 'Alice', isSpectator: false },
      {
        broadcastRoom: () => {},
        broadcastGame: () => {},
        sendNotification: () => {},
        sendChat: () => {}
      }
    );

    room.addOrReconnectUser({ socketId: 'sock2', secretToken: 'token2', name: 'Bob', isSpectator: false });
    room.settings.turnTimerSeconds = 0;
    room.startGame('token1');

    // Bob disconnects
    room.removeSocket('sock2');

    // Bob re-enters with new socket and token (e.g. reopened browser) but same name
    const result = room.addOrReconnectUser({ socketId: 'sock3', secretToken: 'token_new_bob', name: 'Bob', isSpectator: false });

    assert.strictEqual(result.reconnected, true);
    const reclaimedPlayer = room.gameSession?.players.find(p => p.id === 'token_new_bob');
    assert.ok(reclaimedPlayer);
    assert.strictEqual(reclaimedPlayer.isBot, false);
    assert.strictEqual(reclaimedPlayer.connected, true);
    assert.strictEqual(reclaimedPlayer.name, 'Bob');
    room.cleanup();
  });

  test('new player joining mid-match is placed on waitlist', () => {
    const rm = new RoomManager();
    const room = rm.createRoom(
      { socketId: 'sock1', secretToken: 'token1', name: 'Alice', isSpectator: false },
      {
        broadcastRoom: () => {},
        broadcastGame: () => {},
        sendNotification: () => {},
        sendChat: () => {}
      }
    );

    room.addOrReconnectUser({ socketId: 'sock2', secretToken: 'token2', name: 'Bob', isSpectator: false });
    room.settings.turnTimerSeconds = 0;
    room.startGame('token1');

    // Charlie joins while match is active
    const result = room.addOrReconnectUser({ socketId: 'sock3', secretToken: 'token3', name: 'Charlie', isSpectator: false });

    assert.strictEqual(result.reconnected, false);
    const waitlist = room.getWaitlist();
    assert.strictEqual(waitlist.length, 1);
    assert.strictEqual(waitlist[0].name, 'Charlie');
    room.cleanup();
  });
});
