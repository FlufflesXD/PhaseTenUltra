import React, { useState } from 'react';

interface CardInfo {
  name: string;
  category: 'Standard' | 'Chaos Special' | 'Ultimate';
  points: number;
  image: string;
  desc: string;
}

const ALL_CARDS_DATA: CardInfo[] = [
  // Standard Cards
  {
    name: 'Number Cards (1 - 9)',
    category: 'Standard',
    points: 5,
    image: '/cards/blue_7.png',
    desc: 'Standard colored number cards (Red, Blue, Green, Yellow) used to form Stage sets and runs.'
  },
  {
    name: 'Number Cards (10 - 12)',
    category: 'Standard',
    points: 10,
    image: '/cards/red_10.png',
    desc: 'High-value colored number cards. Lay them down quickly or risk higher penalty points.'
  },
  {
    name: 'Wild Card',
    category: 'Standard',
    points: 25,
    image: '/cards/wild.png',
    desc: 'Can substitute for any number or color in Stage sets, runs, or hits. Always worth 25 points.'
  },
  {
    name: 'Skip Card',
    category: 'Standard',
    points: 15,
    image: '/cards/skip.png',
    desc: 'Skips the nearest player in current turn direction, forcing them to lose their turn.'
  },
  {
    name: 'Reverse Card',
    category: 'Standard',
    points: 15,
    image: '/cards/reverse.png',
    desc: 'Inverts the table play direction between Clockwise and Counter-Clockwise.'
  },

  // Chaos Special Cards
  {
    name: 'Nuke',
    category: 'Chaos Special',
    points: 50,
    image: '/cards/custom/nuke.png',
    desc: 'Requires your Stage completed! Detonates a blinding nuclear explosion, slashing every hand to 2 cards.'
  },
  {
    name: 'Jester',
    category: 'Chaos Special',
    points: 25,
    image: '/cards/custom/jester.png',
    desc: 'Swaps your entire hand with any chosen opponent across the table (Ultimate cards stay with owner).'
  },
  {
    name: '+2 Draw',
    category: 'Chaos Special',
    points: 20,
    image: '/cards/custom/plus_two.png',
    desc: 'Forces target opponent to draw 2 penalty cards sequentially from the draw pile.'
  },
  {
    name: '+3 Draw',
    category: 'Chaos Special',
    points: 25,
    image: '/cards/custom/plus_three.png',
    desc: 'Forces target opponent to draw 3 penalty cards sequentially from the draw pile.'
  },
  {
    name: 'Redo Hand',
    category: 'Chaos Special',
    points: 30,
    image: '/cards/custom/redo.png',
    desc: 'Discards your remaining hand and deals 10 fresh cards drawn directly from a brand-new deck.'
  },
  {
    name: 'Time Warp',
    category: 'Chaos Special',
    points: 30,
    image: '/cards/custom/time.png',
    desc: '50/50 time stop roll: Rewinds target player back 1 Stage or fast-forwards them 1 Stage forward.'
  },
  {
    name: 'Number Eye',
    category: 'Chaos Special',
    points: 30,
    image: '/cards/custom/number_eye.png',
    desc: 'Pulses the arena and blinds target opponent: turns all their card numbers into question marks.'
  },
  {
    name: 'Color Eye',
    category: 'Chaos Special',
    points: 30,
    image: '/cards/custom/color_eye.png',
    desc: 'Pulses the arena and turns target opponent cards into grayscale, obscuring their suits.'
  },
  {
    name: 'Chaos Die',
    category: 'Chaos Special',
    points: 35,
    image: '/cards/custom/random.png',
    desc: 'Rolls the die of chaos, triggering any random special card ability upon discard.'
  },
  {
    name: 'Crack',
    category: 'Chaos Special',
    points: 35,
    image: '/cards/custom/crack.png',
    desc: 'Ground-shattering tremor cracks a card in each opponent deck (cracked cards cannot be played).'
  },
  {
    name: 'Status Clear',
    category: 'Chaos Special',
    points: 25,
    image: '/cards/custom/status.png',
    desc: 'Cleanses all active debuffs, eyes, double curses, and repairs cracked cards back to normal.'
  },
  {
    name: 'Luck',
    category: 'Chaos Special',
    points: 30,
    image: '/cards/custom/luck.png',
    desc: 'Gives the player 2x probability to draw wilds, reverses, skips, and special cards.'
  },
  {
    name: 'Unlucky',
    category: 'Chaos Special',
    points: 30,
    image: '/cards/custom/unlucky.png',
    desc: 'Curses target opponent with bad luck: halves their probability of drawing special or wild cards.'
  },
  {
    name: 'Double Stage',
    category: 'Chaos Special',
    points: 35,
    image: '/cards/custom/double.png',
    desc: 'Curses target opponent: even if they finish their Stage, they must repeat it again next round!'
  },

  // Ultimate Cards
  {
    name: 'Singularity',
    category: 'Ultimate',
    points: 50,
    image: '/cards/custom_ultimates/singularity.webp',
    desc: 'Sucks all players hands into a cosmic black hole, thoroughly shuffles and redistributes them with caster luck.'
  },
  {
    name: 'Voyance',
    category: 'Ultimate',
    points: 50,
    image: '/cards/custom_ultimates/voyance.webp',
    desc: 'Pierces the veil of secrecy, revealing all opponents hands face-up for the caster for the round.'
  },
  {
    name: 'Alternate',
    category: 'Ultimate',
    points: 50,
    image: '/cards/custom_ultimates/alternate.webp',
    desc: 'Rifts reality to the Alternate Dimension! Deals 10 pure number cards, switching every 2 turns.'
  },
  {
    name: 'Avarice',
    category: 'Ultimate',
    points: 50,
    image: '/cards/custom_ultimates/avarice.webp',
    desc: 'Plunders all discarded special cards directly into your hand to match your stage progress.'
  }
];

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'cards'>('rules');
  const [filterCategory, setFilterCategory] = useState<'All' | 'Standard' | 'Chaos Special' | 'Ultimate'>('All');

  const filteredCards = ALL_CARDS_DATA.filter(
    c => filterCategory === 'All' || c.category === filterCategory
  );

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[120] flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-950/95 border border-white/10 w-full max-w-4xl rounded-3xl p-6 md:p-8 font-sans text-xs text-white shadow-[0_0_80px_rgba(0,0,0,0.95)] max-h-[90vh] flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
              10
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">Game Rules & Card Compendium</h2>
              <p className="text-xs text-neutral-400">PhaseTen Ultra Gameplay, Scoring & Card Encyclopedic Reference</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/5'
              }`}
            >
              How to Play & Turn Flow
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/5'
              }`}
            >
              All Cards & Point Weights
            </button>
          </div>

          {activeTab === 'cards' && (
            <div className="flex items-center gap-1.5">
              {(['All', 'Standard', 'Chaos Special', 'Ultimate'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    filterCategory === cat
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-neutral-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto pr-2 flex-1 space-y-4 text-neutral-300 min-h-0">
          {activeTab === 'rules' ? (
            <div className="space-y-5">
              {/* Turn Flow Section */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Turn Flow
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                    <span className="text-xs font-black text-amber-400 uppercase">1. Draw</span>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Draw 1 card from either the face-down Draw Pile or the top of the Discard Pile. Note: Only numbered cards can be drawn from the discard pile (Wilds, Skips, and Specials cannot).
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                    <span className="text-xs font-black text-cyan-400 uppercase">2. Play</span>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Lay down your full Stage requirement all at once! Once your Stage is completed, you can hit matching cards onto any laid groups or lay extra sets/runs.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                    <span className="text-xs font-black text-rose-400 uppercase">3. Discard</span>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Discard 1 card into the center pile to end your turn. Special action cards trigger powerful animations and effects upon being discarded!
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Mechanics */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Stage Laydowns & Hitting
                </div>
                <div className="space-y-2 text-xs leading-relaxed text-neutral-300">
                  <p>
                    <strong className="text-white">Full Stage Laydown:</strong> You must lay down both requirements of your current Stage simultaneously before you can hit on other players groups.
                  </p>
                  <p>
                    <strong className="text-white">The Half Rule:</strong> Once your Stage is placed on the table, if you form another group matching either requirement of your current Stage, you may lay it down as an extra meld to help empty your hand.
                  </p>
                  <p>
                    <strong className="text-white">Hitting:</strong> After finishing your Stage, you can hit matching number cards and wilds onto any laid set or run on the table. Special cards cannot be used for hits.
                  </p>
                  <p>
                    <strong className="text-white">Going Out & Scoring:</strong> The round ends the instant any player empties their entire hand. That player receives 0 penalty points, while all other players accumulate penalty points for each card left in hand!
                  </p>
                </div>
              </div>

              {/* Alternate Dimension & Ultimates */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Sacrifice & Ultimate Cards
                </div>
                <div className="space-y-2 text-xs leading-relaxed text-neutral-300">
                  <p>
                    <strong className="text-white">Sacrifice to Charge:</strong> Ultimate cards begin in hand at 0% charge. To charge an ultimate to 100%, sacrifice 1 Special card (adds 50%) and 1 Wild/Skip/Reverse card (adds 50%).
                  </p>
                  <p>
                    <strong className="text-white">Unleash Ultimate Power:</strong> Once fully charged to 100%, activate the card to trigger the 6-second Divine Descent and unleash cosmic abilities like Black Hole Singularity or Alternate Reality Rifts.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Card Compendium List */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCards.map((c, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center gap-3.5"
                >
                  <div className="w-12 h-16 rounded-xl overflow-hidden bg-neutral-900 border border-white/15 shrink-0 flex items-center justify-center shadow-md">
                    <img src={c.image} alt={c.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-white truncate">{c.name}</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                        {c.points} PTS
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
                      {c.category}
                    </span>
                    <p className="text-[11px] text-neutral-300 leading-tight mt-1">
                      {c.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
