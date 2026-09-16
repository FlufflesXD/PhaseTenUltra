import React, { useState } from 'react';
import { RoomState, GameSettings } from '@phase-ten/shared';

interface LobbyViewProps {
  roomState: RoomState | null;
  secretToken: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string, isSpectator?: boolean, claimPlayerId?: string) => void;
  onClaimSeat?: (targetPlayerId: string) => void;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onStartGame: () => void;
  onOpenRules: () => void;
  onLeaveRoom?: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomState,
  secretToken,
  playerName,
  setPlayerName,
  onCreateRoom,
  onJoinRoom,
  onClaimSeat,
  onUpdateSettings,
  onStartGame,
  onOpenRules,
  onLeaveRoom
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const isHost = roomState?.hostId === secretToken;

  const handleCopyCode = () => {
    if (!roomState) return;
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Screen 1: Home / Landing (Create or Join)
  if (!roomState) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm border border-neutral-700 bg-neutral-950 p-5 rounded space-y-4">
          <div className="border-b border-neutral-800 pb-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold uppercase tracking-wider">TenStages Online</h1>
              <span className="text-[10px] text-neutral-500 border border-neutral-800 px-1 py-0.5 rounded">v2.6</span>
            </div>
            <button
              onClick={onOpenRules}
              className="text-xs text-neutral-400 hover:text-white underline"
            >
              Rules
            </button>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-neutral-400">Player Name:</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={16}
              className="w-full bg-black border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white"
              placeholder="Enter name"
            />
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={onCreateRoom}
              className="w-full py-2 bg-white text-black font-bold text-xs uppercase rounded hover:bg-neutral-200"
            >
              Create Room
            </button>

            <div className="text-center text-xs text-neutral-600">— OR —</div>

            <div className="flex gap-1.5">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="4-LETTER CODE"
                maxLength={4}
                className="flex-1 bg-black border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-center uppercase tracking-widest text-white focus:outline-none focus:border-white"
              />
              <button
                onClick={() => onJoinRoom(joinCode)}
                disabled={joinCode.length < 3}
                className={`px-4 py-1.5 text-xs font-bold rounded border ${
                  joinCode.length >= 3
                    ? 'bg-neutral-800 border-neutral-600 hover:bg-neutral-700 text-white cursor-pointer'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed'
                }`}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2: Inside Room Lobby
  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md border border-neutral-700 bg-neutral-950 p-5 rounded space-y-4">
        {/* Room Header */}
        <div className="border-b border-neutral-800 pb-3 flex justify-between items-center">
          <div>
            <div className="text-[10px] text-neutral-500 uppercase">Room Code</div>
            <div className="text-xl font-bold tracking-widest">{roomState.code}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-2 py-1 text-xs border border-neutral-700 rounded hover:bg-neutral-900"
            >
              {copied ? 'Copied' : 'Copy Code'}
            </button>
            <button
              onClick={onOpenRules}
              className="px-2 py-1 text-xs border border-neutral-700 rounded hover:bg-neutral-900 text-neutral-400 hover:text-white"
            >
              Rules
            </button>
            {onLeaveRoom && (
              <button
                type="button"
                onClick={onLeaveRoom}
                className="px-2 py-1 text-xs border border-neutral-700 rounded hover:bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
              >
                Leave
              </button>
            )}
          </div>
        </div>

        {/* Player List */}
        <div>
          <div className="text-xs text-neutral-400 uppercase mb-2">
            Players ({roomState.players.length}/6)
          </div>
          <div className="border border-neutral-800 rounded divide-y divide-neutral-800">
            {roomState.players.map(p => (
              <div key={p.id} className="p-2 text-xs flex justify-between items-center">
                <span className="font-bold">
                  {p.name} {p.id === roomState.hostId && '(Host)'} {p.id === secretToken && '(You)'}
                </span>
                <span className="text-[10px] text-neutral-500">Connected</span>
              </div>
            ))}
          </div>
        </div>

        {/* Waitlist Section */}
        {roomState.waitlist && roomState.waitlist.length > 0 && (
          <div>
            <div className="text-xs text-neutral-400 uppercase mb-2 flex items-center justify-between">
              <span>Waitlist (Waiting for next match)</span>
              <span className="text-[10px] text-neutral-500">({roomState.waitlist.length})</span>
            </div>
            <div className="border border-neutral-800 rounded divide-y divide-neutral-800 bg-black">
              {roomState.waitlist.map(w => (
                <div key={w.id} className="p-2 text-xs flex justify-between items-center text-neutral-400">
                  <span>{w.name} {w.id === secretToken && '(You)'}</span>
                  <span className="text-[10px] text-neutral-600">On Waitlist</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Turn Timer Setting */}
        <div className="border border-neutral-800 p-2.5 rounded flex justify-between items-center text-xs">
          <span className="text-neutral-400">Turn Timer:</span>
          {isHost ? (
            <select
              value={roomState.settings.turnTimerSeconds}
              onChange={e => onUpdateSettings({ turnTimerSeconds: parseInt(e.target.value, 10) })}
              className="bg-black border border-neutral-700 rounded px-2 py-1 text-white focus:outline-none"
            >
              <option value="0">Unlimited</option>
              <option value="30">30s</option>
              <option value="45">45s</option>
              <option value="60">60s</option>
            </select>
          ) : (
            <span className="text-white">
              {roomState.settings.turnTimerSeconds ? `${roomState.settings.turnTimerSeconds}s` : 'Unlimited'}
            </span>
          )}
        </div>



        {/* Start Button */}
        <div>
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={roomState.players.length < 2}
              className={`w-full py-2.5 uppercase font-bold text-xs rounded border transition-colors ${
                roomState.players.length >= 2
                  ? 'bg-white text-black border-white hover:bg-neutral-200 cursor-pointer'
                  : 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed'
              }`}
            >
              {roomState.players.length >= 2 ? 'Start Game' : 'Waiting for 2nd player...'}
            </button>
          ) : (
            <div className="text-center text-xs text-neutral-500 italic py-1">
              Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
