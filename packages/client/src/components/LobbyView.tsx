import React, { useState } from 'react';
import { RoomState, GameSettings } from '@phase-ten/shared';

interface LobbyViewProps {
  roomState: RoomState | null;
  secretToken: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string, isSpectator?: boolean, claimPlayerId?: string, overrideName?: string) => void;
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room') || params.get('join');
    return code ? code.trim().toUpperCase() : null;
  });

  const isHost = roomState?.hostId === secretToken;

  const handleCopyCode = () => {
    if (!roomState) return;
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!roomState) return;
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomState.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Screen 1: Home / Landing (Create or Join, or Invite Prompt)
  if (!roomState) {
    if (inviteCode) {
      return (
        <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm border border-amber-500/70 bg-neutral-950 p-5 rounded space-y-4 shadow-xl shadow-amber-950/30">
            <div className="border-b border-neutral-800 pb-2 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">🔗</span>
                <h1 className="text-sm font-bold uppercase tracking-wider text-amber-200">Room Invitation</h1>
              </div>
              <span className="text-[10px] text-neutral-500 border border-neutral-800 px-1 py-0.5 rounded">v3.5</span>
            </div>

            <div className="text-center py-2.5 bg-neutral-900/60 border border-neutral-800 rounded">
              <div className="text-[11px] text-neutral-400">You've been invited to join room</div>
              <div className="text-2xl font-bold tracking-widest text-white mt-1 font-mono">{inviteCode}</div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!playerName.trim()) return;
                window.history.replaceState({}, document.title, window.location.pathname);
                onJoinRoom(inviteCode, false, undefined, playerName.trim());
                setInviteCode(null);
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="block text-xs text-neutral-300 font-bold">
                  Enter your player name to join:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  maxLength={16}
                  className="w-full bg-black border border-neutral-700 rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-white"
                  placeholder="Enter your name"
                />
              </div>

              <button
                type="submit"
                disabled={!playerName.trim()}
                className={`w-full py-2.5 font-bold text-xs uppercase rounded border transition-colors ${
                  playerName.trim()
                    ? 'bg-white text-black border-white hover:bg-neutral-200 cursor-pointer'
                    : 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed'
                }`}
              >
                Join Lobby
              </button>

              <button
                type="button"
                onClick={() => {
                  window.history.replaceState({}, document.title, window.location.pathname);
                  setInviteCode(null);
                }}
                className="w-full py-1 text-[11px] text-neutral-400 hover:text-white underline cursor-pointer text-center"
              >
                Or enter a different code / create room
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm border border-neutral-700 bg-neutral-950 p-5 rounded space-y-4">
          <div className="border-b border-neutral-800 pb-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold uppercase tracking-wider">TenStages Online</h1>
              <span className="text-[10px] text-neutral-500 border border-neutral-800 px-1 py-0.5 rounded">v3.5</span>
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
                onKeyDown={e => {
                  if (e.key === 'Enter' && joinCode.length >= 3) {
                    onJoinRoom(joinCode);
                  }
                }}
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
              onClick={handleCopyLink}
              className="px-2 py-1 text-xs bg-white text-black font-bold rounded hover:bg-neutral-200 cursor-pointer transition-colors"
            >
              {copiedLink ? 'Link Copied!' : 'Copy Invite Link'}
            </button>
            <button
              onClick={handleCopyCode}
              className="px-2 py-1 text-xs border border-neutral-700 rounded hover:bg-neutral-900 cursor-pointer"
            >
              {copied ? 'Code Copied' : 'Copy Code'}
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
            Players ({roomState.players.length}/4)
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

        {/* Game Mode Setting */}
        <div className="border border-neutral-800 p-2.5 rounded flex justify-between items-center text-xs">
          <div className="flex flex-col">
            <span className="text-neutral-400">Game Mode:</span>
            <span className="text-[10px] text-neutral-500">
              {roomState.settings.gameMode === 'speed' ? '5 Stages (Fast Pace)' : '10 Standard Stages'}
            </span>
          </div>
          {isHost ? (
            <select
              value={roomState.settings.gameMode || 'classic'}
              onChange={e => onUpdateSettings({ gameMode: e.target.value as any })}
              className="bg-black border border-neutral-700 rounded px-2 py-1 text-white focus:outline-none capitalize cursor-pointer"
            >
              <option value="classic">Classic (10 Stages)</option>
              <option value="speed">Speed (5 Stages)</option>
            </select>
          ) : (
            <span className="text-white uppercase font-bold text-[11px]">
              {roomState.settings.gameMode || 'classic'}
            </span>
          )}
        </div>



        {/* Start Button */}
        <div>
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={roomState.players.length < 2 || roomState.players.length > 4}
              className={`w-full py-2.5 uppercase font-bold text-xs rounded border transition-colors ${
                roomState.players.length >= 2 && roomState.players.length <= 4
                  ? 'bg-white text-black border-white hover:bg-neutral-200 cursor-pointer'
                  : 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed'
              }`}
            >
              {roomState.players.length >= 2
                ? roomState.players.length > 4
                  ? 'Too many players (Max 4)'
                  : 'Start Game'
                : 'Waiting for 2nd player...'}
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
