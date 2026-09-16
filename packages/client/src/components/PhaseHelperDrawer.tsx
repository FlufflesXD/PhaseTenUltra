import React, { useMemo } from 'react';
import {
  Card,
  findExtraMeldMatch,
  findSingleRequirementMatch,
  findValidPhaseCombination,
  PhaseDefinition
} from '@phase-ten/shared';
import { CardView } from './CardView.js';

interface PhaseHelperProps {
  hand: Card[];
  phaseDef?: PhaseDefinition;
  hasLaidDown: boolean;
  isMyTurn: boolean;
  turnStage: string;
  allowPartialAndExtraSets?: boolean;
  onLayDown: (groups: Card[][]) => void;
  onLayExtraMeld: (cardIds: string[]) => void;
}

export const PhaseHelperDrawer: React.FC<PhaseHelperProps> = ({
  hand,
  phaseDef,
  hasLaidDown,
  isMyTurn,
  turnStage,
  allowPartialAndExtraSets = true,
  onLayDown,
  onLayExtraMeld
}) => {
  if (!phaseDef) return null;

  const canPlayNow = isMyTurn && turnStage === 'play';

  // Full combination check before phase is laid down
  const fullPhaseCombination = useMemo(() => {
    if (hasLaidDown) return null;
    return findValidPhaseCombination(hand, phaseDef);
  }, [hand, phaseDef, hasLaidDown]);

  // Extra meld / half rule checks after phase has been laid down
  const availableExtraMelds = useMemo(() => {
    if (!hasLaidDown || !allowPartialAndExtraSets) return [];
    let pool = [...hand];
    const results: { label: string; type: string; cards: Card[] }[] = [];

    // Check each requirement of current phase (e.g. either half separated by +)
    for (let i = 0; i < phaseDef.requirements.length; i++) {
      const req = phaseDef.requirements[i];
      const match = findSingleRequirementMatch(pool, req);
      if (match) {
        const label =
          req.type === 'set'
            ? `Set of ${req.count}`
            : req.type === 'run'
            ? `Run of ${req.count}`
            : `${req.count} Cards of One Color`;
        results.push({
          label: `Extra Part ${i + 1} (${label})`,
          type: req.type,
          cards: match
        });
        const usedIds = new Set(match.map(c => c.id));
        pool = pool.filter(c => !usedIds.has(c.id));
      }
    }

    // If neither phase requirement matched, check generic set of 3+ or run of 4+
    if (results.length === 0) {
      const generic = findExtraMeldMatch(pool, phaseDef);
      if (generic) {
        results.push({
          label: `Extra ${generic.type === 'set' ? 'Set' : generic.type === 'run' ? 'Run' : 'Color Group'}`,
          type: generic.type,
          cards: generic.cards
        });
      }
    }

    return results;
  }, [hand, hasLaidDown, allowPartialAndExtraSets, phaseDef]);

  return (
    <div className="bg-neutral-900 border border-neutral-700 p-3 rounded text-xs space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-neutral-800">
        <div>
          <span className="font-bold">{phaseDef.name}: </span>
          <span className="text-neutral-300">{phaseDef.description}</span>
        </div>
        {hasLaidDown ? (
          <span className="text-white font-mono font-bold bg-neutral-800 px-2 py-0.5 rounded">
            [PHASE COMPLETED]
          </span>
        ) : fullPhaseCombination ? (
          <span className="text-black bg-white font-mono font-bold px-2 py-0.5 rounded">
            [PHASE READY]
          </span>
        ) : (
          <span className="text-neutral-400 font-mono">
            [INCOMPLETE]
          </span>
        )}
      </div>

      {/* 1. Before Phase Completed: Only show the unified full lay down table if requirements are met */}
      {!hasLaidDown && fullPhaseCombination && (
        <div className="border border-white/40 bg-black p-3 rounded space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-bold text-white text-xs">
                Full Phase Ready to Lay Down:
              </div>
              <div className="text-[10px] text-neutral-400">
                {phaseDef.requirements.map(r => r.type === 'set' ? `Set of ${r.count}` : r.type === 'run' ? `Run of ${r.count}` : `${r.count} of Same Color`).join(' + ')}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLayDown(fullPhaseCombination)}
              disabled={!canPlayNow}
              className={`px-4 py-1.5 rounded font-bold text-xs border transition-colors whitespace-nowrap ${
                canPlayNow
                  ? 'bg-white text-black border-white hover:bg-neutral-200 cursor-pointer'
                  : 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
              }`}
            >
              {canPlayNow ? 'Lay Down Full Phase' : 'Draw Card First to Lay Phase'}
            </button>
          </div>

          {/* Single Lay Down Table: Shows all groups together */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-neutral-800">
            {fullPhaseCombination.map((group, idx) => {
              const req = phaseDef.requirements[idx];
              const groupTitle =
                req?.type === 'set'
                  ? `Set of ${req.count}`
                  : req?.type === 'run'
                  ? `Run of ${req.count}`
                  : req?.type === 'color'
                  ? `${req.count} Cards of Color`
                  : `Group ${idx + 1}`;

              return (
                <div key={idx} className="flex flex-col gap-1">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">
                    {groupTitle}
                  </span>
                  <div className="flex items-center gap-1">
                    {group.map(card => (
                      <CardView key={card.id} card={card} size="sm" isSelectable={false} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. After Phase Completed: Show goal & extra meld preview rack(s) if requirements are met */}
      {hasLaidDown && (
        <div className="space-y-2 pt-1 text-xs">
          <div className="text-neutral-300">
            <span className="font-bold text-white">Goal: Go Out!</span> Empty your hand to win this round.
            Hit matching cards onto table groups, lay extra halves, or discard.
          </div>

          {/* Extra Melds / Halves Rack: Only shows if player has the requirements */}
          {availableExtraMelds.length > 0 && (
            <div className="space-y-2">
              {availableExtraMelds.map((meld, idx) => (
                <div
                  key={idx}
                  className="border border-white/40 bg-black p-2 rounded flex flex-col sm:flex-row items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{meld.label} Ready:</span>
                      <span className="text-[10px] text-neutral-400 font-normal">({meld.cards.length} cards)</span>
                    </div>
                    <div className="flex items-center gap-1 overflow-x-auto mt-1">
                      {meld.cards.map(c => (
                        <CardView key={c.id} card={c} size="sm" isSelectable={false} />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLayExtraMeld(meld.cards.map(c => c.id))}
                    disabled={!canPlayNow}
                    className={`px-3 py-1.5 rounded font-bold text-xs border transition-colors whitespace-nowrap ${
                      canPlayNow
                        ? 'bg-white text-black border-white hover:bg-neutral-200 cursor-pointer'
                        : 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                    }`}
                  >
                    {canPlayNow
                      ? `Lay ${meld.label} (${meld.cards.length})`
                      : 'Draw Card First'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
