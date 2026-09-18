import React from 'react';
import { CLASSIC_PHASES } from '@phase-ten/shared';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-700 w-full max-w-lg rounded-xl p-5 font-sans text-xs text-white space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
          <span className="font-bold text-sm uppercase">TenStages Rules</span>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-3 text-neutral-300">
          <div>
            <div className="font-bold text-white mb-1">Turn Flow:</div>
            <div>1. <span className="text-white">Draw:</span> Take 1 card from the Draw Pile or Discard Pile (Only numbered cards can be drawn from the Discard Pile; Discard pile never starts with Wilds, Skips, or Special cards).</div>
            <div>2. <span className="text-white">Play:</span> Lay down your full Stage requirement, lay extra halves/groups, and/or hit matching cards onto table groups.</div>
            <div>3. <span className="text-white">Discard:</span> Discard 1 card to end your turn.</div>
          </div>

          <div>
            <div className="font-bold text-white mb-1">Making Stages & Hitting:</div>
            <div>• <span className="text-white">Full Stage Laydown:</span> You must lay down your complete Stage requirements first all at once!</div>
            <div>• <span className="text-white">The Half Rule:</span> Once your Stage is made, if you acquire an extra set or run matching either requirement of your current Stage, you can lay it down as an extra group to help empty your hand.</div>
            <div>• <span className="text-white">Hitting:</span> After completing your Stage, you can hit matching cards directly onto any player's laid-down sets or runs on the table (Special cards cannot be used on hits).</div>
            <div>• <span className="text-white">Going Out:</span> The round ends as soon as a player gets rid of all cards in their hand. That player scores 0 penalty points, and players who finished their Stage advance to the next Stage!</div>
          </div>

          <div>
            <div className="font-bold text-white mb-1">The 10 Stages:</div>
            <div className="border border-neutral-800 rounded divide-y divide-neutral-800">
              {CLASSIC_PHASES.map(p => (
                <div key={p.phaseNumber} className="p-1.5 flex justify-between">
                  <span className="font-bold text-white">{p.name}:</span>
                  <span className="text-neutral-300">{p.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="font-bold text-white mb-1">Scoring (Penalty points for cards remaining in hand):</div>
            <div>• Cards 1-9: 5 pts each</div>
            <div>• Cards 10-12: 10 pts each</div>
            <div>• Skip: 15 pts | Wild: 25 pts</div>
            <div>• Chaos Cards: +2 Draw (20 pts), Jester (25 pts), +3 Draw (25 pts), Redo (30 pts), Time (30 pts), Nuke (50 pts)</div>
          </div>

          <div className="border-t border-neutral-800 pt-2.5">
            <div className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Chaos Mode & Custom Cards:</span>
            </div>
            <div className="space-y-1.5 text-neutral-300">
              <div>• <span className="text-red-400 font-semibold">☢ Nuke:</span> Can only be played once you have laid down your Stage! Triggers a 5-second blinding nuclear detonation. Immediately reduces every player's hand to exactly 2 cards!</div>
              <div>• <span className="text-purple-400 font-semibold">🃏 Jester:</span> Click on any opponent's cards or nameplate to swap hands with them instantly!</div>
              <div>• <span className="text-cyan-400 font-semibold">🔄 Redo:</span> Replaces your entire remaining hand with a fresh 10-card hand drawn from a brand-new deck (duplicating special cards if lucky!).</div>
              <div>• <span className="text-amber-400 font-semibold">⏳ Time Warp:</span> Target an opponent on Stage 2–9 in Dio "Za Warudo" time-stop style. 60% chance (Green) rewinds them 1 Stage back; 40% chance (Red) accelerates them 1 Stage forward! Stage 1 & 10 are immune.</div>
              <div>• <span className="text-emerald-400 font-semibold">+2 & +3 Draw:</span> Forces the next player in line to draw 2 or 3 extra penalty cards from the draw pile.</div>
              <div>• <span className="text-yellow-400 font-semibold">Deck Balance:</span> Exactly 1 copy of each of the 6 special cards replaces a standard colored card (90 colored, 6 special, 8 wilds, 4 skips = 108 cards total).</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
