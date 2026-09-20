import React, { useState, useEffect, useRef } from 'react';
import {
  RoomState,
  GameSettings,
  SpecialCardType,
  UltimateCardType,
  ALL_SPECIAL_CARD_TYPES,
  DEFAULT_SPECIAL_CARDS,
  ALL_ULTIMATE_CARD_TYPES,
  DEFAULT_ULTIMATE_CARDS
} from '@phase-ten/shared';

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

const ULTIMATE_CARD_METADATA: Record<UltimateCardType, { name: string; image: string; desc: string }> = {
  singularity: { name: 'Singularity', image: '/cards/custom_ultimates/singularity.webp', desc: 'Sucks all player hands into black hole, shuffles & redistributes' },
  voyance: { name: 'Voyance', image: '/cards/custom_ultimates/voyance.webp', desc: 'Reveals all opponents hands face-up for the rest of round' },
  alternate: { name: 'Alternate', image: '/cards/custom_ultimates/alternate.webp', desc: 'Rifts reality to Alternate Dimension: only 1-12 number cards' },
  avarice: { name: 'Avarice', image: '/cards/custom_ultimates/avarice.webp', desc: 'Plunders target player: steal cards to match their stage progress' }
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
  const [cardCategoryTab, setCardCategoryTab] = useState<'special' | 'ultimate'>('special');

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

  // Screen 1: Home / Landing Page (Dark Theme)
  if (!roomState) {
    return (
      <div
        ref={rootRef}
        className="relative w-full h-screen h-[100dvh] overflow-hidden bg-neutral-950 flex items-center justify-center select-none text-white"
      >
        {/* Subtle Ambient Decorative Circles */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

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
            <div className="w-[520px] bg-neutral-900/90 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] rounded-3xl p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-black text-amber-400">
                    INV
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-white tracking-tight">Room Invitation</h1>
                    <p className="text-xs text-neutral-400 font-medium">You have been invited to a match</p>
                  </div>
                </div>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-white/5 text-amber-400 border border-white/10">
                  v6.8
                </span>
              </div>

              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Invited Room Code</span>
                <span className="text-3xl font-black font-mono tracking-widest text-amber-400 mt-1">{inviteCode}</span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!playerName.trim()) return;
                  onJoinRoom(inviteCode);
                }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Your Display Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your nickname..."
                    maxLength={14}
                    autoFocus
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 font-medium focus:outline-none focus:border-amber-400 transition-all shadow-inner"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInviteCode(null);
                      const cleanUrl = window.location.origin + window.location.pathname;
                      window.history.replaceState({}, document.title, cleanUrl);
                    }}
                    className="flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!playerName.trim()}
                    className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md ${
                      playerName.trim()
                        ? 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer active:scale-98 shadow-amber-500/20'
                        : 'bg-white/5 border border-white/10 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    Join Match
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Home Action Card */
            <div className="w-[520px] bg-neutral-900/90 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] rounded-3xl p-8 flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-amber-500/20">
                    10
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-black text-white tracking-tight">PhaseTen Ultra</h1>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        v6.8
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 font-medium">Ultimate Multiplayer Card Arena</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenRules}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-neutral-300 bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-colors"
                >
                  Rules
                </button>
              </div>

              {/* Player Name Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Your Display Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your nickname..."
                  maxLength={14}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 font-medium focus:outline-none focus:border-amber-400 transition-all shadow-inner"
                />
              </div>

              {/* Create Room Action */}
              <button
                type="button"
                onClick={onCreateRoom}
                disabled={!playerName.trim()}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
                  playerName.trim()
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black cursor-pointer active:scale-98 shadow-amber-500/25'
                    : 'bg-white/5 border border-white/10 text-neutral-500 cursor-not-allowed'
                }`}
              >
                Create Room
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative bg-neutral-900 px-3 text-[11px] font-black text-neutral-400 uppercase tracking-widest">
                  Or Join Existing
                </span>
              </div>

              {/* Join Room Code Input Form */}
              <div className="flex flex-col gap-2">
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
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-center uppercase tracking-widest text-amber-300 font-mono font-black focus:outline-none focus:border-amber-400 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => onJoinRoom(joinCode)}
                    disabled={joinCode.length < 3 || !playerName.trim()}
                    className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all border ${
                      joinCode.length >= 3 && playerName.trim()
                        ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white cursor-pointer active:scale-98 shadow-sm'
                        : 'bg-white/5 border-white/10 text-neutral-600 cursor-not-allowed'
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

  // Active Special & Ultimate Cards Counts
  const activeSpecialCards = roomState.settings.enabledSpecialCards || DEFAULT_SPECIAL_CARDS;
  const activeUltimateCards = roomState.settings.enabledUltimateCards || DEFAULT_ULTIMATE_CARDS;
  const specialCardCounts = roomState.settings.specialCardCounts || {};
  const ultimateCardCounts = roomState.settings.ultimateCardCounts || {};

  const activeSpecialCount = ALL_SPECIAL_CARD_TYPES.filter(t => activeSpecialCards[t] ?? true).length;
  const activeUltimateCount = ALL_ULTIMATE_CARD_TYPES.filter(t => activeUltimateCards[t] ?? true).length;

  const botCount = roomState.settings.botCount ?? 0;
  const totalCount = roomState.players.length + botCount;
  const canStart = totalCount >= 2 && totalCount <= 4;
  const isScaleRatioOn = roomState.settings.scaleColoredCardsRatio !== false;

  const handleUpdateSpecialCount = (type: SpecialCardType, delta: number) => {
    if (!isHost) return;
    const currentCount = specialCardCounts[type] !== undefined
      ? specialCardCounts[type]!
      : (type === 'status' ? 2 : (type === 'skip' || type === 'reverse' ? 4 : 1));
    const nextCount = Math.max(0, Math.min(20, currentCount + delta));
    onUpdateSettings({
      specialCardCounts: {
        ...specialCardCounts,
        [type]: nextCount
      }
    });
  };

  const handleUpdateUltimateCount = (type: UltimateCardType, delta: number) => {
    if (!isHost) return;
    const currentCount = ultimateCardCounts[type] !== undefined
      ? ultimateCardCounts[type]!
      : 1;
    const nextCount = Math.max(0, Math.min(10, currentCount + delta));
    onUpdateSettings({
      ultimateCardCounts: {
        ...ultimateCardCounts,
        [type]: nextCount
      }
    });
  };

  // Screen 2: Inside Room Lobby (Modern Dark Dashboard)
  return (
    <div
      ref={rootRef}
      className="relative w-full h-screen h-[100dvh] overflow-hidden bg-neutral-950 flex items-center justify-center select-none text-white"
    >
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-10 left-20 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-20 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

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
        <header className="w-full bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl px-8 py-4 flex items-center justify-between shadow-lg mb-6">
          {/* Logo & Version */}
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-black font-black text-lg shadow-md shadow-amber-500/20">
              10
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">PhaseTen Ultra</h1>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  v6.8
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-medium">Lobby & Game Configuration</p>
            </div>
          </div>

          {/* Center: Room Code Pill & Copy Actions */}
          <div className="flex items-center gap-3 bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">ROOM CODE</span>
              <span className="text-2xl font-black font-mono tracking-widest text-amber-400">{roomState.code}</span>
            </div>
            <div className="h-8 w-px bg-neutral-800 mx-1" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-black cursor-pointer transition-all shadow-sm active:scale-95"
              >
                {copiedLink ? 'Link Copied' : 'Copy Invite Link'}
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/15 cursor-pointer transition-all active:scale-95"
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
              className="px-4 py-2 text-xs font-bold rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 cursor-pointer transition-colors"
            >
              Rules
            </button>
            {onLeaveRoom && (
              <button
                type="button"
                onClick={onLeaveRoom}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 cursor-pointer transition-colors"
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
            <div className="bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 flex flex-col gap-4 shadow-lg flex-1">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Players ({roomState.players.length}/4)
                </span>
                <span className="text-xs font-bold text-neutral-400">
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
                          ? 'bg-neutral-950 border-amber-500/50 shadow-md shadow-amber-500/5'
                          : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center font-black text-sm text-neutral-200">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-white">{p.name}</span>
                            {isCurrentHost && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wide">
                                HOST
                              </span>
                            )}
                            {isCurrentMe && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wide">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-neutral-400 font-medium">Ready</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                        <span className="text-xs font-bold text-neutral-400">Connected</span>
                      </div>
                    </div>
                  );
                })}

                {/* Simulated Bots Indicator in Roster */}
                {botCount > 0 && (
                  Array.from({ length: botCount }).map((_, i) => (
                    <div
                      key={`bot_preview_${i}`}
                      className="p-3.5 rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-black text-sm text-neutral-400">
                          AI
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-neutral-300">Bot {['Charlie', 'Luna', 'Max'][i] || `AI ${i+1}`}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                              BOT
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-500 font-medium">Automated Opponent</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-neutral-500">Ready</span>
                    </div>
                  ))
                )}
              </div>

              {/* Waitlist Section */}
              {roomState.waitlist && roomState.waitlist.length > 0 && (
                <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    <span>Waitlist Spectators</span>
                    <span>({roomState.waitlist.length})</span>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto">
                    {roomState.waitlist.map((w) => (
                      <div
                        key={w.id}
                        className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 flex justify-between items-center text-xs"
                      >
                        <span className="font-bold text-neutral-300">{w.name} {w.id === secretToken && '(You)'}</span>
                        <span className="text-[10px] text-neutral-500">Next Round</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Button Area */}
              <div className="border-t border-white/10 pt-4">
                {isHost ? (
                  <button
                    type="button"
                    onClick={onStartGame}
                    disabled={!canStart}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg ${
                      canStart
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black cursor-pointer active:scale-98 shadow-amber-500/25'
                        : 'bg-white/5 border border-white/10 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    {totalCount > 4
                      ? `Too Many Players (${totalCount}/4 Max)`
                      : canStart
                      ? `Start Match (${totalCount} Players${botCount > 0 ? ` incl. ${botCount} Bot${botCount > 1 ? 's' : ''}` : ''})`
                      : 'Need 2 Players or Select Bots'}
                  </button>
                ) : (
                  <div className="w-full py-3.5 px-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-center text-xs font-bold text-neutral-400">
                    Waiting for host to start the match...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Room Settings & Custom Deck Config (8 Cols) */}
          <div className="col-span-8 flex flex-col gap-6 min-h-0">
            <div className="bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-7 flex flex-col gap-6 shadow-lg flex-1 min-h-0">
              {/* Settings Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-base font-black text-white tracking-tight">Room & Deck Settings</h2>
                  <p className="text-xs text-neutral-400 font-medium">
                    {isHost ? 'Configure match length, AI bots, card ratios, copy counts, and special powers' : 'Current game rules and card abilities set by host'}
                  </p>
                </div>
              </div>

              {/* Settings Grid: Bots, Phases, Timer, Randomize, 15:1 Ratio */}
              <div className="grid grid-cols-2 gap-4">
                {/* 1. Play With Bots Selector */}
                <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white uppercase tracking-wide">Play With Bots</span>
                    <span className="text-[11px] font-bold text-amber-400">{botCount} Bots</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight">
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
                              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                              : 'bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10'
                          } ${!isHost ? 'cursor-default opacity-80' : 'cursor-pointer active:scale-95'}`}
                        >
                          {count === 0 ? 'None' : `${count} Bot${count > 1 ? 's' : ''}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Total Phases to Complete */}
                <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white uppercase tracking-wide">Stages to Complete</span>
                    <span className="text-[11px] font-bold text-amber-400">
                      {roomState.settings.totalPhases ?? 10} Stages
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight">
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
                              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                              : 'bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10'
                          } ${!isHost ? 'cursor-default opacity-80' : 'cursor-pointer active:scale-95'}`}
                        >
                          {phaseNum}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Randomize Stages Per Round */}
                <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                  <div className="flex flex-col gap-1 pr-3">
                    <span className="text-xs font-black text-white uppercase tracking-wide">Randomize Stages</span>
                    <span className="text-[11px] text-neutral-400 leading-tight">
                      Shuffles stage requirements each round for all players.
                    </span>
                  </div>
                  {isHost ? (
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ randomizePhasesPerRound: !roomState.settings.randomizePhasesPerRound })}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                        roomState.settings.randomizePhasesPerRound
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                          : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {roomState.settings.randomizePhasesPerRound ? 'ON' : 'OFF'}
                    </button>
                  ) : (
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black border ${
                      roomState.settings.randomizePhasesPerRound
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}>
                      {roomState.settings.randomizePhasesPerRound ? 'ON' : 'OFF'}
                    </span>
                  )}
                </div>

                {/* 4. 15:1 Ratio Scaling Toggle */}
                <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                  <div className="flex flex-col gap-1 pr-3">
                    <span className="text-xs font-black text-white uppercase tracking-wide">15:1 Colored Card Ratio</span>
                    <span className="text-[11px] text-neutral-400 leading-tight">
                      {isScaleRatioOn ? 'ON: Scales colored sets with special card count.' : 'OFF: Fixed 96 colored number cards.'}
                    </span>
                  </div>
                  {isHost ? (
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ scaleColoredCardsRatio: !isScaleRatioOn })}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                        isScaleRatioOn
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {isScaleRatioOn ? 'ON' : 'OFF'}
                    </button>
                  ) : (
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black border ${
                      isScaleRatioOn
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}>
                      {isScaleRatioOn ? 'ON' : 'OFF'}
                    </span>
                  )}
                </div>

                {/* 5. Turn Timer */}
                <div className="col-span-2 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white uppercase tracking-wide">Turn Timer</span>
                    <span className="text-[11px] font-bold text-amber-400">
                      {roomState.settings.turnTimerSeconds ? `${roomState.settings.turnTimerSeconds}s` : 'Unlimited'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-1">
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
                              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                              : 'bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10'
                          } ${!isHost ? 'cursor-default opacity-80' : 'cursor-pointer active:scale-95'}`}
                        >
                          {seconds === 0 ? 'None' : `${seconds}s`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Custom Card Manager: Special Cards & Ultimate Cards with Copy Counts */}
              <div className="flex flex-col gap-3 min-h-0 flex-1">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  {/* Category Switch Tabs */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCardCategoryTab('special')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        cardCategoryTab === 'special'
                          ? 'bg-amber-400 text-black shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/5'
                      }`}
                    >
                      Special Cards ({activeSpecialCount}/{ALL_SPECIAL_CARD_TYPES.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardCategoryTab('ultimate')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        cardCategoryTab === 'ultimate'
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/5'
                      }`}
                    >
                      Ultimate Cards ({activeUltimateCount}/{ALL_ULTIMATE_CARD_TYPES.length})
                    </button>
                  </div>

                  {isHost && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (cardCategoryTab === 'special') {
                            const allOn = {} as Record<SpecialCardType, boolean>;
                            ALL_SPECIAL_CARD_TYPES.forEach(t => { allOn[t] = true; });
                            onUpdateSettings({ enabledSpecialCards: allOn });
                          } else {
                            const allOn = {} as Record<UltimateCardType, boolean>;
                            ALL_ULTIMATE_CARD_TYPES.forEach(t => { allOn[t] = true; });
                            onUpdateSettings({ enabledUltimateCards: allOn });
                          }
                        }}
                        className="text-xs font-bold text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        All On
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (cardCategoryTab === 'special') {
                            const allOff = {} as Record<SpecialCardType, boolean>;
                            ALL_SPECIAL_CARD_TYPES.forEach(t => { allOff[t] = false; });
                            onUpdateSettings({ enabledSpecialCards: allOff });
                          } else {
                            const allOff = {} as Record<UltimateCardType, boolean>;
                            ALL_ULTIMATE_CARD_TYPES.forEach(t => { allOff[t] = false; });
                            onUpdateSettings({ enabledUltimateCards: allOff });
                          }
                        }}
                        className="text-xs font-bold text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        All Off
                      </button>
                    </div>
                  )}
                </div>

                {/* Scrollable Card Grid */}
                <div className="grid grid-cols-2 gap-2.5 overflow-y-auto pr-1 flex-1">
                  {cardCategoryTab === 'special' ? (
                    ALL_SPECIAL_CARD_TYPES.map((type) => {
                      const meta = SPECIAL_CARD_METADATA[type];
                      const isEnabled = activeSpecialCards[type] ?? true;
                      const copyCount = specialCardCounts[type] !== undefined
                        ? specialCardCounts[type]!
                        : (type === 'status' ? 2 : (type === 'skip' || type === 'reverse' ? 4 : 1));

                      return (
                        <div
                          key={type}
                          className={`p-2.5 rounded-2xl border transition-all flex flex-col gap-2 select-none ${
                            isEnabled
                              ? 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                              : 'bg-neutral-950/30 border-white/5 opacity-50 hover:opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              onClick={() => {
                                if (!isHost) return;
                                onUpdateSettings({
                                  enabledSpecialCards: {
                                    ...activeSpecialCards,
                                    [type]: !isEnabled
                                  }
                                });
                              }}
                              className={`flex items-center gap-3 min-w-0 pr-2 ${isHost ? 'cursor-pointer' : ''}`}
                            >
                              <div className="w-9 h-12 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-white/10 shadow-sm flex items-center justify-center">
                                <img
                                  src={meta.image}
                                  alt={meta.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-white truncate">{meta.name}</span>
                                <span className="text-[10px] text-neutral-400 font-medium leading-tight line-clamp-1">
                                  {meta.desc}
                                </span>
                              </div>
                            </div>

                            {/* Status Toggle Switch */}
                            <button
                              type="button"
                              disabled={!isHost}
                              onClick={() => {
                                onUpdateSettings({
                                  enabledSpecialCards: {
                                    ...activeSpecialCards,
                                    [type]: !isEnabled
                                  }
                                });
                              }}
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all border ${
                                isEnabled
                                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm cursor-pointer'
                                  : 'bg-white/5 text-neutral-400 border-white/10 cursor-pointer'
                              }`}
                            >
                              {isEnabled ? 'ON' : 'OFF'}
                            </button>
                          </div>

                          {/* Stepper for Deck Copy Count */}
                          <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                              Deck Copies
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={!isHost || copyCount <= 0}
                                onClick={() => handleUpdateSpecialCount(type, -1)}
                                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center text-xs font-black cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                -
                              </button>
                              <span className="font-mono font-black text-xs px-2 text-amber-300">
                                {copyCount}
                              </span>
                              <button
                                type="button"
                                disabled={!isHost || copyCount >= 20}
                                onClick={() => handleUpdateSpecialCount(type, 1)}
                                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center text-xs font-black cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    ALL_ULTIMATE_CARD_TYPES.map((type) => {
                      const meta = ULTIMATE_CARD_METADATA[type];
                      const isEnabled = activeUltimateCards[type] ?? true;
                      const copyCount = ultimateCardCounts[type] !== undefined
                        ? ultimateCardCounts[type]!
                        : 1;

                      return (
                        <div
                          key={type}
                          className={`p-2.5 rounded-2xl border transition-all flex flex-col gap-2 select-none ${
                            isEnabled
                              ? 'bg-neutral-950/80 border-purple-500/40 hover:border-purple-500/60 shadow-sm shadow-purple-500/5'
                              : 'bg-neutral-950/30 border-white/5 opacity-50 hover:opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              onClick={() => {
                                if (!isHost) return;
                                onUpdateSettings({
                                  enabledUltimateCards: {
                                    ...activeUltimateCards,
                                    [type]: !isEnabled
                                  }
                                });
                              }}
                              className={`flex items-center gap-3 min-w-0 pr-2 ${isHost ? 'cursor-pointer' : ''}`}
                            >
                              <div className="w-9 h-12 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-purple-500/30 shadow-sm flex items-center justify-center">
                                <img
                                  src={meta.image}
                                  alt={meta.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-purple-300 truncate">{meta.name}</span>
                                <span className="text-[10px] text-neutral-400 font-medium leading-tight line-clamp-1">
                                  {meta.desc}
                                </span>
                              </div>
                            </div>

                            {/* Status Toggle Switch */}
                            <button
                              type="button"
                              disabled={!isHost}
                              onClick={() => {
                                onUpdateSettings({
                                  enabledUltimateCards: {
                                    ...activeUltimateCards,
                                    [type]: !isEnabled
                                  }
                                });
                              }}
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all border ${
                                isEnabled
                                  ? 'bg-purple-600 text-white border-purple-400 shadow-sm cursor-pointer'
                                  : 'bg-white/5 text-neutral-400 border-white/10 cursor-pointer'
                              }`}
                            >
                              {isEnabled ? 'ON' : 'OFF'}
                            </button>
                          </div>

                          {/* Stepper for Deck Copy Count */}
                          <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                              Deck Copies
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={!isHost || copyCount <= 0}
                                onClick={() => handleUpdateUltimateCount(type, -1)}
                                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center text-xs font-black cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                -
                              </button>
                              <span className="font-mono font-black text-xs px-2 text-purple-300">
                                {copyCount}
                              </span>
                              <button
                                type="button"
                                disabled={!isHost || copyCount >= 10}
                                onClick={() => handleUpdateUltimateCount(type, 1)}
                                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center text-xs font-black cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
