import { test, describe } from 'node:test';
import assert from 'node:assert';
import { RoomManager } from '../room/RoomManager.js';
import { ChatMessage } from '@phase-ten/shared';

describe('Chat System Tests', () => {
  test('User can send chat messages in a room', () => {
    const manager = new RoomManager();
    const sentMessages: ChatMessage[] = [];

    const host = {
      socketId: 'sock_host',
      secretToken: 'tok_host',
      name: 'HostPlayer',
      isSpectator: false
    };

    const room = manager.createRoom(host, {
      broadcastRoom: () => {},
      broadcastGame: () => {},
      sendNotification: () => {},
      sendChat: (_, chat) => {
        sentMessages.push(chat);
      }
    });

    room.addChatMessage('tok_host', 'Hello from host!');
    assert.strictEqual(sentMessages.length, 1);
    assert.strictEqual(sentMessages[0].text, 'Hello from host!');
    assert.strictEqual(sentMessages[0].senderName, 'HostPlayer');
    assert.strictEqual(room.chatMessages.length, 1);

    // Empty text ignored
    room.addChatMessage('tok_host', '   ');
    assert.strictEqual(sentMessages.length, 1);

    // Non-existent sender token ignored
    room.addChatMessage('fake_token', 'Should not send');
    assert.strictEqual(sentMessages.length, 1);

    room.cleanup();
  });
});
