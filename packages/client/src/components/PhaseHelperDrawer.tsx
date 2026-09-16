import React, { useMemo } from 'react';
import {
  Card,
  findExtraMeldMatch,
  findSingleRequirementMatch,
  findValidPhaseCombination,
  LaidDownPhaseGroup,
  PhaseDefinition
} from '@phase-ten/shared';
import { CardView } from './CardView.js';

interface PhaseHelperProps {
  hand: Card[];
  phaseDef?: PhaseDefinition;
  hasLaidDown: boolean;
  laidDownPhases?: LaidDownPhaseGroup[];
  isMyTurn: boolean;
  turnStage: string;
  allowPartialAndExtraSets?: boolean;
  onLayDown: (groups: Card[][]) => void;
  onLayRequirement: (reqIndex: number, cardIds: string[]) => void;
  onLayExtraMeld: (cardIds: string[]) => void;
}

export const PhaseHelperDrawer: React.FC<PhaseHelperProps> = ({
  hand,
  phaseDef,
  hasLaidDown,
  laidDownPhases = [],
  isMyTurn,
  turnStage,
  allowPartialAndExtraSets = true,
  onLayDown,
  onLayRequirement,
  onLayExtraMeld
}) => {
  if (!phaseDef) return null;

  const canPlayNow = isMyTurn && turnStage === 'play';

  // Check which requirements have already been laid down by this player
  const laidIndices = useMemo(() => {
    return new Set(laidDownPhases.map(g => g.requirementIndex));
  }, [laidDownPhases]);

  // Full combination check (if laying all remaining unlaid requirements at once)
  const unlaidRequirements = useMemo(() => {
    return phaseDef.requirements
      .map((req, idx) => ({ req, idx }))
      .filter(({ idx }) => !laidIndices.has(idx));
  }, [phaseDef, laidIndices]);

  // Matches for individual requirements
  const requirementMatches = useMemo(() => {
    if (hasLaidDown) return [];

    let available = [...hand];
    const matches: { index: number; cards: Card[] | null }[] = [];

    for (let i = 0; i < phaseDef.requirements.length; i++) {
      if (laidIndices.has(i)) {
        matches.push({ index: i, cards: null });
        continue;
      }

      const match = findSingleRequirementMatch(available, phaseDef.requirements[i]);
      if (match) {
        matches.push({ index: i, cards: match });
        const usedIds = new Set(match.map(c => c.id));
        available = available.filter(c => !usedIds.has(c.id));
      } else {
        matches.push({ index: i, cards: null });
      }
    }
    return matches;
  }, [hand, phaseDef, laidIndices, hasLaidDown]);

  // Can lay all remaining requirements?
  const canLayFullPhase = useMemo(() => {
    if (hasLaidDown || unlaidRequirements.length === 0) return false;
    return unlaidRequirements.every(({ idx }) => {
      return requirementMatches.find(m => m.index === idx)?.cards !== null;
    });
  }, [hasLaidDown, unlaidRequirements, requirementMatches]);

  // Extra meld check when phase is already completed
  const extraMeld = useMemo(() => {
    if (!hasLaidDown) return null;
    return findExtraMeldMatch(hand, phaseDef);
  }, [hand, hasLaidDown, phaseDef]);

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
        ) : canLayFullPhase ? (
          <span className="text-black bg-white font-mono font-bold px-2 py-0.5 rounded">
            [PHASE READY]
          </span>
        ) : (
          <span className="text-neutral-400 font-mono">
            [INCOMPLETE]
          </span>
        )}
      </div>

      {/* When Phase is NOT fully completed */}
      {!hasLaidDown && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {phaseDef.requirements.map((req, idx) => {
              const isLaid = laidIndices.has(idx);
              const match = requirementMatches.find(m => m.index === idx)?.cards;
              const reqLabel =
                req.type === 'set'
                  ? `Set of ${req.count}`
                  : req.type === 'run'
                  ? `Run of ${req.count}`
                  : `${req.count} Cards of One Color`;

              return (
                <div
                  key={idx}
                  className={`border p-2 rounded flex flex-col justify-between gap-1.5 ${
                    isLaid
                      ? 'border-neutral-800 bg-black/40 text-neutral-500'
                      : match
                      ? 'border-white/40 bg-black'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      Part {idx + 1}: {reqLabel}
                    </span>
                    {isLaid ? (
                      <span className="text-white font-bold text-[10px]">[ON TABLE ✓]</span>
                    ) : match ? (
                      <span className="text-white font-bold text-[10px]">[READY]</span>
                    ) : (
                      <span className="text-neutral-500 text-[10px]">[NEED CARDS]</span>
                    )}
                  </div>

                  {/* Cards preview if ready */}
                  {!isLaid && match && (
                    <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                      {match.map(c => (
                        <CardView key={c.id} card={c} size="sm" isSelectable={false} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Full Phase Laydown Button */}
          {canLayFullPhase && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  const groups = unlaidRequirements.map(({ idx }) => {
                    return requirementMatches.find(m => m.index === idx)!.cards!;
                  });
                  onLayDown(groups);
                }}
                disabled={!canPlayNow}
                className={`px-4 py-1.5 rounded font-bold text-xs border transition-colors ${
                  canPlayNow
                    ? 'bg-white text-black border-white hover:bg-neutral-200 cursor-pointer'
                    : 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                }`}
              >
                {canPlayNow ? 'Lay Down Full Phase' : 'Draw Card First to Lay Phase'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* When Phase IS completed */}
      {hasLaidDown && (
        <div className="space-y-2 pt-1 text-xs">
          <div className="text-neutral-300">
            <span className="font-bold text-white">Goal: Go Out!</span> Empty your hand to win this round.
            Hit matching cards onto table groups, lay extra sets/runs, or discard.
          </div>

          {/* Extra Meld Option */}
          {allowPartialAndExtraSets && extraMeld && (
            <div className="border border-white/40 bg-black p-2 rounded flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>Extra {extraMeld.type === 'set' ? 'Set' : extraMeld.type === 'run' ? 'Run' : 'Color Group'} Ready:</span>
                  <span className="text-[10px] text-neutral-400 font-normal">({extraMeld.cards.length} cards)</span>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto mt-1">
                  {extraMeld.cards.map(c => (
                    <CardView key={c.id} card={c} size="sm" isSelectable={false} />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onLayExtraMeld(extraMeld.cards.map(c => c.id))}
                disabled={!canPlayNow}
                className={`px-3 py-1.5 rounded font-bold text-xs border transition-colors whitespace-nowrap ${
                  canPlayNow
                    ? 'bg-white text-black border-white hover:bg-neutral-200 cursor-pointer'
                    : 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                }`}
              >
                {canPlayNow
                  ? `Lay Extra ${extraMeld.type === 'set' ? 'Set' : extraMeld.type === 'run' ? 'Run' : 'Color Group'} (${extraMeld.cards.length})`
                  : 'Draw Card First'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
