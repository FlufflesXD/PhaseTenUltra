import React from 'react';
import { CLASSIC_PHASES } from '@phase-ten/shared';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-700 w-full max-w-lg rounded p-5 font-mono text-xs text-white space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
          <span className="font-bold text-sm uppercase">Phase 10 Rules</span>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-3 text-neutral-300">
          <div>
            <div className="font-bold text-white mb-1">Turn Flow:</div>
            <div>1. <span className="text-white">Draw:</span> Take 1 card from the Draw Pile or Discard Pile.</div>
            <div>2. <span className="text-white">Play:</span> Lay down phase requirements (either side of the '+' when acquired), lay extra sets, and/or hit matching cards onto table groups.</div>
            <div>3. <span className="text-white">Discard:</span> Discard 1 card to end your turn.</div>
          </div>

          <div>
            <div className="font-bold text-white mb-1">Making Phases & Hitting:</div>
            <div>• <span className="text-white">Piece-by-Piece Laydown:</span> For multi-part phases (separated by '+'), you can lay down either side when acquired! When all parts are down, your phase is completed.</div>
            <div>• <span className="text-white">Extra Sets/Runs:</span> Once your phase is made, if you acquire an extra set of 3+ (or run of 4+), you can lay it down as an extra group to empty your hand.</div>
            <div>• <span className="text-white">Hitting:</span> After completing your phase, you can hit matching cards directly onto any player's laid-down sets or runs on the table (individually or all matching cards at once).</div>
            <div>• <span className="text-white">Going Out:</span> The round ends as soon as a player gets rid of all cards in their hand. That player scores 0 penalty points, and players who finished their phase advance to the next phase!</div>
          </div>

          <div>
            <div className="font-bold text-white mb-1">The 10 Phases:</div>
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
            <div>• Skip: 15 pts</div>
            <div>• Wild: 25 pts</div>
          </div>
        </div>
      </div>
    </div>
  );
};
