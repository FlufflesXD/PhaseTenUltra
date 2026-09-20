import React, { useState, useEffect, useRef } from 'react';
import { RoomState, GameSettings, SpecialCardType, ALL_SPECIAL_CARD_TYPES, DEFAULT_SPECIAL_CARDS } from '@phase-ten/shared';

const SPECIAL_CARD_METADATA: Record<SpecialCardType, { name: string; image: string; desc: string }> = {
  nuke: { name: 'Nuke', image: '/cards/custom/nuke.png', desc: 'Resets all opponents to 2 cards once your Stage is laid' },
  jester: { name: 'Jester', image: '/cards/custom/jester.png', desc: 'Swap your entire hand with any chosen opponent' },
  plus_two: { name: '+2 Draw', image: '/cards/custom/plus_two.png', desc: 'Forces target opponent to draw 2 penalty cards' },
  plus_three: { name: '+3 Draw', image: '/cards/custom/plus_three.png', desc: 'Forces target opponent to draw 3 penalty cards' },
  redo: { name: 'Redo Hand', image: '/cards/custom/redo.png', desc: 'Replaces your hand with 10 cards drawn from a fresh deck' },
  time: { name: 'Time Warp', image: '/cards/custom/time.png', desc: '50/50 roll: Rewinds or advances target player 1 Stage' },
  number_eye: { name: 'Number Eye', image: '/cards/custom/number_eye.png', desc: 'Converts target opponent number cards to ?' },
  color_eye: { name: 'Color Eye', image: '/cards/custom/color_eye.png', desc: 'Turns target opponent cards grayscale' },
  random: { name: 'Chaos Die', image: '/cards/custom/random.png', desc: 'Triggers a randomized special card ability' },
  crack: { name: 'Crack', image: '/cards/custom/crack.png', desc: 'Shakes the arena and cracks opponent cards' },
  status: { name: 'Status Clear', image: '/cards/custom/status.png', desc: 'Cleanses all active buffs, debuffs, and cracks' },
  luck: { name: 'Luck', image: '/cards/custom/luck.png', desc: '2x chance to draw wilds, reverses, skips, and specials' },
  unlucky: { name: 'Unlucky', image: '/cards/custom/unlucky.png', desc: 'Halves special and wild card draw chance for target' },
  double: { name: 'Double Stage', image: '/cards/custom/double.png', desc: 'Target must repeat their Stage after completing it' },
  reverse: { name: 'Reverse', image: '/cards/reverse.png', desc: 'Inverts turn direction and table rotation' },
  skip: { name: 'Skip', image: '/cards/skip.png', desc: 'Skips the nearest player in play direction' }
};

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
  onClaimSeat: _onClaimSeat,
  onUpdateSettings,
  onStartGame,
  onOpenRules,
  onLeaveRoom
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [scale, setScale] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);

  const [inviteCode, setInviteCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room') || params.get('join');
    return code ? code.trim().toUpperCase() : null;
  });

  // 16:9 Constant Ratio Virtual Stage Scaling
  useEffect(() => {
    const updateScale = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const s = Math.min(w / 1920, h / 1080);
      setScale(s);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

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

  // Screen 1: Home / Landing Page
  if (!roomState) {
    return (
      <div
        ref={rootRef}
        className="relative w-full h-screen h-[100dvh] overflow-hidden bg-slate-100 flex items-center justify-center select-none"
      >
        {/* Subtle Ambient Decorative Circles */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />

        {/* 16:9 Virtual Arena Stage Container */}
        <div
          style={{
            width: 1920,
            height: 1080,
            transform: `scale(${scale})`,
            transformOrigin: 'center center'
          }}
          className="relative w-[1920px] h-[1080px] shrink-0 overflow-hidden flex items-center justify-center z-10"
        >
          {inviteCode ? (
            /* Invite Modal */
            <div className="w-[520px] bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_25px_60px_rgba(0,0,0,0.08)] rounded-3xl p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center font-black text-amber-700">
                    INV
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">Room Invitation</h1>
                    <p className="text-xs text-slate-500 font-medium">You have been invited to a match</p>
                  </div>
                </div>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  v6.1
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Invited Room Code</span>
                <span className="text-3xl font-black font-mono tracking-widest text-slate-900 mt-1">{inviteCode}</span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!playerName.trim()) return;
                  window.history.replaceState({}, document.title, window.location.pathname);
                  onJoinRoom(inviteCode, false, undefined, playerName.trim());
                  setInviteCode(null);
                }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Enter Your Player Name
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={16}
                    placeholder="Player Name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-all shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!playerName.trim()}
                  className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-md ${
                    playerName.trim()
                      ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-98'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
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
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer text-center"
                >
                  Create New Room or Enter Another Code
                </button>
              </form>
            </div>
          ) : (
            /* Main Landing Card */
            <div className="w-[540px] bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_30px_70px_rgba(0,0,0,0.08)] rounded-3xl p-9 flex flex-col gap-7">
              {/* Brand Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white font-black text-lg shadow-md">
                    10
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">PhaseTen Ultra</h1>
                    <p className="text-xs text-slate-500 font-medium">Ultimate Chaos Card Game</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenRules}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Rules
                  </button>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    v6.1
                  </span>
                </div>
              </div>

              {/* Player Name Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Player Display Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={16}
                  placeholder="Enter your name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-all shadow-inner"
                />
              </div>

              {/* Primary Actions */}
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={onCreateRoom}
                  disabled={!playerName.trim()}
                  className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-md ${
                    playerName.trim()
                      ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-98'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Create New Room
                </button>

                <div className="relative flex items-center justify-center my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    OR JOIN EXISTING
                  </span>
                </div>

                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && joinCode.length >= 3 && playerName.trim()) {
                        onJoinRoom(joinCode);
                      }
                    }}
                    placeholder="4-LETTER CODE"
                    maxLength={4}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-center uppercase tracking-widest text-slate-900 font-mono font-black focus:outline-none focus:border-slate-800 focus:bg-white transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => onJoinRoom(joinCode)}
                    disabled={joinCode.length < 3 || !playerName.trim()}
                    className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all border ${
                      joinCode.length >= 3 && playerName.trim()
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900 cursor-pointer active:scale-98 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Special Cards Count
  const activeCards = roomState.settings.enabledSpecialCards || DEFAULT_SPECIAL_CARDS;
  const activeSpecialCount = ALL_SPECIAL_CARD_TYPES.filter(t => activeCards[t] ?? true).length;
  const botCount = roomState.settings.botCount ?? 0;
  const totalCount = roomState.players.length + botCount;
  const canStart = totalCount >= 2 && totalCount <= 4;

  // Screen 2: Inside Room Lobby (Modern Dual-Column Dashboard)
  return (
    <div
      ref={rootRef}
      className="relative w-full h-screen h-[100dvh] overflow-hidden bg-slate-100 flex items-center justify-center select-none"
    >
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-10 left-20 w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-20 w-[500px] h-[500px] bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />

      {/* 16:9 Virtual Arena Stage Container */}
      <div
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
        className="relative w-[1920px] h-[1080px] shrink-0 overflow-hidden flex flex-col p-12 z-10"
      >
        {/* Top Modern Header Bar */}
        <header className="w-full bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl px-8 py-4 flex items-center justify-between shadow-sm mb-6">
          {/* Logo & Version */}
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-lg shadow-sm">
              10
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">PhaseTen Ultra</h1>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  v6.1
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Lobby & Game Configuration</p>
            </div>
          </div>

          {/* Center: Room Code Pill & Copy Actions */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ROOM CODE</span>
              <span className="text-2xl font-black font-mono tracking-widest text-slate-900">{roomState.code}</span>
            </div>
            <div className="h-8 w-px bg-slate-200 mx-1" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white cursor-pointer transition-all shadow-sm active:scale-95"
              >
                {copiedLink ? 'Link Copied' : 'Copy Invite Link'}
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer transition-all active:scale-95"
              >
                {copied ? 'Code Copied' : 'Copy Code'}
              </button>
            </div>
          </div>

          {/* Right: Quick Navigation Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenRules}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 cursor-pointer transition-colors"
            >
              Rules
            </button>
            {onLeaveRoom && (
              <button
                type="button"
                onClick={onLeaveRoom}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-colors"
              >
                Leave Lobby
              </button>
            )}
          </div>
        </header>

        {/* Main Dashboard: Dual-Column Layout */}
        <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
          {/* Left Column: Player Rosters & Match Action (4 Cols) */}
          <div className="col-span-4 flex flex-col gap-6">
            {/* Active Players Card */}
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 flex flex-col gap-4 shadow-sm flex-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Players ({roomState.players.length}/4)
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {totalCount} Total in Match
                </span>
              </div>

              {/* Player List */}
              <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 flex-1">
                {roomState.players.map((p) => {
                  const isCurrentMe = p.id === secretToken;
                  const isCurrentHost = p.id === roomState.hostId;

                  return (
                    <div
                      key={p.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        isCurrentMe
                          ? 'bg-slate-50 border-slate-300/90 shadow-sm'
                          : 'bg-white border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-sm text-slate-800">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-slate-900">{p.name}</span>
                            {isCurrentHost && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wide">
                                HOST
                              </span>
                            )}
                            {isCurrentMe && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-white uppercase tracking-wide">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">Ready</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-xs font-bold text-slate-500">Connected</span>
                      </div>
                    </div>
                  );
                })}

                {/* Simulated Bots Indicator in Roster */}
                {botCount > 0 && (
                  Array.from({ length: botCount }).map((_, i) => (
                    <div
                      key={`bot_preview_${i}`}
                      className="p-3.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-200/80 flex items-center justify-center font-black text-sm text-slate-600">
                          AI
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-slate-700">Bot {['Charlie', 'Luna', 'Max'][i] || `AI ${i+1}`}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                              BOT
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">Automated Opponent</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-400">Ready</span>
                    </div>
                  ))
                )}
              </div>

              {/* Waitlist Section */}
              {roomState.waitlist && roomState.waitlist.length > 0 && (
                <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>Waitlist Spectators</span>
                    <span>({roomState.waitlist.length})</span>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto">
                    {roomState.waitlist.map((w) => (
                      <div
                        key={w.id}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs"
                      >
                        <span className="font-bold text-slate-700">{w.name} {w.id === secretToken && '(You)'}</span>
                        <span className="text-[10px] text-slate-400">Next Round</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Button Area */}
              <div className="border-t border-slate-100 pt-4">
                {isHost ? (
                  <button
                    type="button"
                    onClick={onStartGame}
                    disabled={!canStart}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-md ${
                      canStart
                        ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-98 shadow-slate-900/10'
                        : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {totalCount > 4
                      ? `Too Many Players (${totalCount}/4 Max)`
                      : canStart
                      ? `Start Match (${totalCount} Players${botCount > 0 ? ` incl. ${botCount} Bot${botCount > 1 ? 's' : ''}` : ''})`
                      : 'Need 2 Players or Select Bots'}
                  </button>
                ) : (
                  <div className="w-full py-3.5 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs font-bold text-slate-500">
                    Waiting for host to start the match...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Room Settings & Special Cards (8 Cols) */}
          <div className="col-span-8 flex flex-col gap-6 min-h-0">
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-7 flex flex-col gap-6 shadow-sm flex-1 min-h-0">
              {/* Settings Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">Room Settings</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {isHost ? 'Configure game rules, match length, AI bots, and special abilities' : 'Current game rules and card abilities set by host'}
                  </p>
                </div>
              </div>

              {/* Settings Grid: Bots, Phases, Timer, Randomize */}
              <div className="grid grid-cols-2 gap-4">
                {/* 1. Play With Bots Selector */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Play With Bots</span>
                    <span className="text-[11px] font-bold text-slate-500">{botCount} Bots</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Add automated AI opponents to play solo or fill empty spots (max 4 players total).
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {[0, 1, 2, 3].map((count) => {
                      const isSelected = botCount === count;
                      return (
                        <button
                          key={count}
                          type="button"
                          disabled={!isHost}
                          onClick={() => onUpdateSettings({ botCount: count })}
                          className={`py-2 rounded-xl text-xs font-black transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          } ${!isHost ? 'cursor-default opacity-80' : 'cursor-pointer active:scale-95'}`}
                        >
                          {count === 0 ? 'None' : `${count} Bot${count > 1 ? 's' : ''}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Total Phases to Complete */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Stages to Complete</span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {roomState.settings.totalPhases ?? 10} Stages
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    First player to complete all required stages wins the match.
                  </p>
                  <div className="grid grid-cols-5 gap-1.5 mt-1">
                    {[1, 3, 5, 8, 10].map((phaseNum) => {
                      const isSelected = (roomState.settings.totalPhases ?? 10) === phaseNum;
                      return (
                        <button
                          key={phaseNum}
                          type="button"
                          disabled={!isHost}
                          onClick={() => onUpdateSettings({ totalPhases: phaseNum })}
                          className={`py-2 rounded-xl text-xs font-black transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          } ${!isHost ? 'cursor-default opacity-80' : 'cursor-pointer active:scale-95'}`}
                        >
                          {phaseNum}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Randomize Stages Per Round */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex flex-col gap-1 pr-3">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Randomize Stages</span>
                    <span className="text-[11px] text-slate-500 leading-tight">
                      Shuffles the stage requirements each round for all players.
                    </span>
                  </div>
                  {isHost ? (
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ randomizePhasesPerRound: !roomState.settings.randomizePhasesPerRound })}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                        roomState.settings.randomizePhasesPerRound
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {roomState.settings.randomizePhasesPerRound ? 'ON' : 'OFF'}
                    </button>
                  ) : (
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black border ${
                      roomState.settings.randomizePhasesPerRound
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {roomState.settings.randomizePhasesPerRound ? 'ON' : 'OFF'}
                    </span>
                  )}
                </div>

                {/* 4. Turn Timer */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Turn Timer</span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {roomState.settings.turnTimerSeconds ? `${roomState.settings.turnTimerSeconds}s` : 'Unlimited'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {[0, 30, 45, 60].map((seconds) => {
                      const isSelected = (roomState.settings.turnTimerSeconds ?? 0) === seconds;
                      return (
                        <button
                          key={seconds}
                          type="button"
                          disabled={!isHost}
                          onClick={() => onUpdateSettings({ turnTimerSeconds: seconds })}
                          className={`py-2 rounded-xl text-xs font-black transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          } ${!isHost ? 'cursor-default opacity-80' : 'cursor-pointer active:scale-95'}`}
                        >
                          {seconds === 0 ? 'None' : `${seconds}s`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Special Cards Toggle Roster */}
              <div className="flex flex-col gap-3 min-h-0 flex-1">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Special Chaos Cards
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {activeSpecialCount} / {ALL_SPECIAL_CARD_TYPES.length} Active
                    </span>
                  </div>

                  {isHost && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allOn = {} as Record<SpecialCardType, boolean>;
                          ALL_SPECIAL_CARD_TYPES.forEach(t => { allOn[t] = true; });
                          onUpdateSettings({ enabledSpecialCards: allOn });
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        All On
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const allOff = {} as Record<SpecialCardType, boolean>;
                          ALL_SPECIAL_CARD_TYPES.forEach(t => { allOff[t] = false; });
                          onUpdateSettings({ enabledSpecialCards: allOff });
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        All Off
                      </button>
                    </div>
                  )}
                </div>

                {/* Scrollable Special Cards Grid */}
                <div className="grid grid-cols-2 gap-2.5 overflow-y-auto pr-1 flex-1">
                  {ALL_SPECIAL_CARD_TYPES.map((type) => {
                    const meta = SPECIAL_CARD_METADATA[type];
                    const isEnabled = activeCards[type] ?? true;

                    return (
                      <div
                        key={type}
                        onClick={() => {
                          if (!isHost) return;
                          onUpdateSettings({
                            enabledSpecialCards: {
                              ...activeCards,
                              [type]: !isEnabled
                            }
                          });
                        }}
                        title={meta.desc}
                        className={`group p-2.5 rounded-2xl border transition-all flex items-center justify-between select-none ${
                          isEnabled
                            ? 'bg-slate-50/90 border-slate-200 hover:border-slate-400'
                            : 'bg-white/50 border-slate-100 opacity-50 hover:opacity-75'
                        } ${isHost ? 'cursor-pointer active:scale-98' : 'cursor-default'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          {/* Render Real Card Image (No Emojis!) */}
                          <div className="w-9 h-12 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-300 shadow-sm flex items-center justify-center">
                            <img
                              src={meta.image}
                              alt={meta.name}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-black text-slate-900 truncate">{meta.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium leading-tight line-clamp-1">
                              {meta.desc}
                            </span>
                          </div>
                        </div>

                        {/* Status Toggle Switch */}
                        <div
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all border ${
                            isEnabled
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                              : 'bg-slate-200 text-slate-500 border-slate-300'
                          }`}
                        >
                          {isEnabled ? 'ON' : 'OFF'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
