import React, { useState } from 'react';
import { ChatMessage } from '@phase-ten/shared';

interface ChatDrawerProps {
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  chatMessages,
  onSendMessage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="fixed bottom-3 right-3 z-40">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 px-3 py-1.5 rounded text-xs font-mono font-bold"
        >
          Chat ({chatMessages.length})
        </button>
      ) : (
        <div className="w-72 sm:w-80 bg-neutral-950 border border-neutral-700 rounded shadow-lg flex flex-col text-xs font-mono">
          <div className="p-2 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
            <span className="font-bold text-white">Chat</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white px-1.5"
            >
              ✕
            </button>
          </div>

          <div className="p-2 h-44 overflow-y-auto space-y-1.5 text-neutral-300">
            {chatMessages.length === 0 ? (
              <div className="text-neutral-600 italic">No messages.</div>
            ) : (
              chatMessages.map(msg => (
                <div key={msg.id} className="border-b border-neutral-900 pb-1">
                  <span className="font-bold text-white">{msg.senderName}: </span>
                  <span>{msg.text}</span>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="p-1.5 border-t border-neutral-800 flex gap-1">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Message..."
              maxLength={150}
              className="flex-1 bg-black border border-neutral-700 rounded px-2 py-1 text-white focus:outline-none focus:border-white"
            />
            <button
              type="submit"
              className="bg-white text-black font-bold px-3 py-1 rounded hover:bg-neutral-200"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
