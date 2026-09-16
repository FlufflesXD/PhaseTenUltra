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
            <div>1. Draw 1 card from Draw Pile or Discard Pile.</div>
            <div>2. Lay down phase (if complete) and/or hit on laid-down phases.</div>
            <div>3. Discard 1 card to end turn.</div>
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
            <div className="font-bold text-white mb-1">Scoring (Cards left in hand at round end):</div>
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
