import React, { useMemo } from 'react';
import { Card, findValidPhaseCombination, PhaseDefinition } from '@phase-ten/shared';
import { CardView } from './CardView.js';

interface PhaseHelperProps {
  hand: Card[];
  phaseDef?: PhaseDefinition;
  hasLaidDown: boolean;
  isMyTurn: boolean;
  turnStage: string;
  onLayDown: (groups: Card[][]) => void;
}

export const PhaseHelperDrawer: React.FC<PhaseHelperProps> = ({
  hand,
  phaseDef,
  hasLaidDown,
  isMyTurn,
  turnStage,
  onLayDown
}) => {
  if (!phaseDef) return null;

  const validCombination = useMemo(() => {
    if (hasLaidDown) return null;
    return findValidPhaseCombination(hand, phaseDef);
  }, [hand, phaseDef, hasLaidDown]);

  const canPlayNow = isMyTurn && turnStage === 'play' && !hasLaidDown;

  return (
    <div className="bg-neutral-900 border border-neutral-700 p-3 rounded text-xs">
      <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-neutral-800">
        <div>
          <span className="font-bold">{phaseDef.name}: </span>
          <span className="text-neutral-300">{phaseDef.description}</span>
        </div>
        {hasLaidDown ? (
          <span className="text-neutral-400 font-mono">[COMPLETED]</span>
        ) : validCombination ? (
          <span className="text-white font-mono font-bold">[PHASE READY]</span>
        ) : (
          <span className="text-neutral-500 font-mono">[IN PROGRESS]</span>
        )}
      </div>

      {!hasLaidDown && validCombination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 overflow-x-auto">
            {validCombination.map((group, gIdx) => (
              <div key={gIdx} className="flex items-center gap-1 border border-neutral-700 p-1 rounded bg-black">
                <span className="text-[10px] text-neutral-400 font-mono mr-1">G{gIdx + 1}:</span>
                {group.map(c => (
                  <CardView key={c.id} card={c} size="sm" isSelectable={false} />
                ))}
              </div>
            ))}
          </div>

          <button
            onClick={() => onLayDown(validCombination)}
            disabled={!canPlayNow}
            className={`px-3 py-1.5 rounded font-mono text-xs font-bold border transition-colors ${
              canPlayNow
                ? 'bg-white text-black border-white hover:bg-neutral-200 cursor-pointer'
                : 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
            }`}
          >
            {canPlayNow ? 'Lay Down Phase' : 'Draw Card First'}
          </button>
        </div>
      )}
    </div>
  );
};
