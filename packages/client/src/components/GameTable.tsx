import React, { useState, useEffect } from 'react';
import {
  Card,
  GameNotification,
  PublicGameState,
  sortCardsByColor,
  sortCardsByValue,
  validateHit
} from '@phase-ten/shared';
import { CardView } from './CardView.js';
import { PhaseHelperDrawer } from './PhaseHelperDrawer.js';

interface GameTableProps {
  gameState: PublicGameState;
  hand: Card[];
  secretToken: string;
  notifications: GameNotification[];
  onDrawCard: (source: 'deck' | 'discard') => void;
  onLayDownPhase: (groups: Card[][]) => void;
  onHitCard: (cardId: string, targetGroupId: string) => void;
  onDiscardCard: (cardId: string, skipTargetId?: string) => void;
  onOpenRules: () => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  gameState,
  hand,
  secretToken,
  notifications,
  onDrawCard,
  onLayDownPhase,
  onHitCard,
  onDiscardCard,
  onOpenRules
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [skipTargetModalOpen, setSkipTargetModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [localHand, setLocalHand] = useState<Card[]>(hand);

  useEffect(() => {
    setLocalHand(prev => {
      const currentIds = new Set(hand.map(c => c.id));
      const retained = prev.filter(c => currentIds.has(c.id));
      const added = hand.filter(c => !prev.some(p => p.id === c.id));
      return [...retained, ...added];
    });
  }, [hand]);

  const me = gameState.players.find(p => p.id === secretToken);
  const isMyTurn = gameState.currentTurnPlayerId === secretToken;
  const opponents = gameState.players.filter(p => p.id !== secretToken);
  const currentPhaseDef = gameState.phaseDefinitions.find(p => p.phaseNumber === me?.currentPhase);

  const selectedCard = localHand.find(c => c.id === selectedCardId);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(gameState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCardClick = (card: Card) => {
    setSelectedCardId(prev => (prev === card.id ? null : card.id));
  };

  const handleDraw = (source: 'deck' | 'discard') => {
    if (!isMyTurn || gameState.turnStage !== 'draw') return;
    if (source === 'discard' && gameState.topDiscard?.type === 'skip') return;
    onDrawCard(source);
  };

  const handleDiscardSelected = () => {
    if (!selectedCard || !isMyTurn || gameState.turnStage === 'draw') return;

    if (selectedCard.type === 'skip') {
      setSkipTargetModalOpen(true);
      return;
    }

    onDiscardCard(selectedCard.id);
    setSelectedCardId(null);
  };

  const handleConfirmSkip = (targetId: string) => {
    if (!selectedCard) return;
    onDiscardCard(selectedCard.id, targetId);
    setSelectedCardId(null);
    setSkipTargetModalOpen(false);
  };

  const handleHitOnGroup = (groupId: string) => {
    if (!selectedCard || !isMyTurn || gameState.turnStage !== 'play' || !me?.phaseCompletedInRound) return;
    onHitCard(selectedCard.id, groupId);
    setSelectedCardId(null);
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col justify-between p-3 select-none">
      {/* 1. Header */}
      <header className="border-b border-neutral-800 pb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={copyRoomCode}
            className="border border-neutral-700 px-2 py-1 rounded hover:bg-neutral-900"
          >
            {copiedCode ? 'Copied' : `Room: ${gameState.roomCode}`}
          </button>
          <span>Round {gameState.roundNumber}</span>
        </div>

        <div className="flex items-center gap-3">
          {isMyTurn ? (
            <span className="bg-white text-black font-bold px-2 py-0.5 rounded">
              YOUR TURN ({gameState.turnStage.toUpperCase()})
            </span>
          ) : (
            <span className="text-neutral-400">
              Turn: {gameState.players.find(p => p.id === gameState.currentTurnPlayerId)?.name}
            </span>
          )}

          {gameState.turnTimeRemaining > 0 && (
            <span className="text-neutral-400">({gameState.turnTimeRemaining}s)</span>
          )}

          <button
            onClick={onOpenRules}
            className="text-neutral-400 hover:text-white underline"
          >
            Rules
          </button>
        </div>
      </header>

      {/* 2. Opponents Bar */}
      <section className="py-2 flex items-center justify-center gap-2 overflow-x-auto">
        {opponents.map(opp => {
          const isOppTurn = gameState.currentTurnPlayerId === opp.id;
          return (
            <div
              key={opp.id}
              className={`border p-2 rounded text-xs min-w-[130px] ${
                isOppTurn ? 'border-white bg-neutral-900 font-bold' : 'border-neutral-800 bg-neutral-950'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>{opp.name}</span>
                {opp.isSkipped && <span className="text-neutral-400">[SKIPPED]</span>}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1 flex justify-between">
                <span>P{opp.currentPhase} {opp.phaseCompletedInRound && '✓'}</span>
                <span>{opp.cardCount} cards ({opp.score}pts)</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* 3. Center Table (Draw, Discard, Laid Down Phases) */}
      <section className="flex-1 flex flex-col items-center justify-center my-2 gap-4">
        {/* Draw & Discard */}
        <div className="flex items-center gap-6 border border-neutral-800 p-4 rounded bg-neutral-950">
          {/* Draw Pile */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleDraw('deck')}
              disabled={!isMyTurn || gameState.turnStage !== 'draw'}
              className={`w-20 h-28 sm:w-24 sm:h-34 border rounded flex flex-col items-center justify-center text-xs p-2 transition-colors ${
                isMyTurn && gameState.turnStage === 'draw'
                  ? 'border-white bg-neutral-900 hover:bg-neutral-800 cursor-pointer font-bold'
                  : 'border-neutral-800 bg-black text-neutral-600 cursor-default'
              }`}
            >
              <div>DECK</div>
              <div className="text-[10px] mt-1">({gameState.drawPileCount})</div>
              {isMyTurn && gameState.turnStage === 'draw' && (
                <div className="text-[9px] mt-2 underline">DRAW</div>
              )}
            </button>
            <span className="text-[10px] text-neutral-500 mt-1">Draw Pile</span>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center">
            {gameState.topDiscard ? (
              <div
                onClick={() => {
                  if (isMyTurn && gameState.turnStage === 'draw') {
                    handleDraw('discard');
                  } else if (isMyTurn && selectedCard && gameState.turnStage !== 'draw') {
                    handleDiscardSelected();
                  }
                }}
                className={
                  isMyTurn && (gameState.turnStage === 'draw' || selectedCard)
                    ? 'cursor-pointer'
                    : ''
                }
              >
                <CardView card={gameState.topDiscard} size="lg" isSelectable={false} />
              </div>
            ) : (
              <div className="w-20 h-28 sm:w-24 sm:h-34 border border-dashed border-neutral-800 rounded flex items-center justify-center text-xs text-neutral-600">
                Empty
              </div>
            )}
            <span className="text-[10px] text-neutral-500 mt-1">Discard Pile</span>
          </div>
        </div>

        {/* Laid Down Phases on Table */}
        {gameState.allLaidDownPhases.length > 0 && (
          <div className="w-full max-w-2xl border border-neutral-800 p-2.5 rounded bg-neutral-950 text-xs">
            <div className="text-[10px] text-neutral-500 uppercase mb-1.5">
              Completed Phases on Table
            </div>
            <div className="flex flex-wrap gap-2">
              {gameState.allLaidDownPhases.map(group => {
                const canHit =
                  me?.phaseCompletedInRound &&
                  isMyTurn &&
                  selectedCard &&
                  validateHit(selectedCard, group);

                return (
                  <div
                    key={group.id}
                    onClick={() => canHit && handleHitOnGroup(group.id)}
                    className={`border p-1.5 rounded flex flex-col gap-1 transition-colors ${
                      canHit
                        ? 'border-white bg-neutral-900 cursor-pointer'
                        : 'border-neutral-800 bg-black'
                    }`}
                  >
                    <div className="text-[10px] text-neutral-400 flex justify-between gap-2">
                      <span>{group.playerName}</span>
                      <span className="uppercase">{group.type}</span>
                    </div>
                    <div className="flex gap-1">
                      {group.cards.map(c => (
                        <CardView key={c.id} card={c} size="sm" isSelectable={false} />
                      ))}
                    </div>
                    {canHit && (
                      <div className="text-[9px] text-center bg-white text-black font-bold rounded py-0.5">
                        HIT
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 4. Player Hand & Actions */}
      <footer className="space-y-2">
        <PhaseHelperDrawer
          hand={localHand}
          phaseDef={currentPhaseDef}
          hasLaidDown={me?.phaseCompletedInRound || false}
          isMyTurn={isMyTurn}
          turnStage={gameState.turnStage}
          onLayDown={onLayDownPhase}
        />

        <div className="border border-neutral-800 p-2.5 rounded bg-neutral-950 space-y-2">
          {/* Hand Action Toolbar */}
          <div className="flex items-center justify-between text-xs border-b border-neutral-900 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">Your Hand ({localHand.length})</span>
              <button
                onClick={() => setLocalHand(sortCardsByValue(localHand))}
                className="border border-neutral-700 px-2 py-0.5 rounded text-[11px] hover:bg-neutral-900"
              >
                Sort: Value
              </button>
              <button
                onClick={() => setLocalHand(sortCardsByColor(localHand))}
                className="border border-neutral-700 px-2 py-0.5 rounded text-[11px] hover:bg-neutral-900"
              >
                Sort: Color
              </button>
            </div>

            {/* Discard Button */}
            {isMyTurn && gameState.turnStage !== 'draw' && (
              <button
                onClick={handleDiscardSelected}
                disabled={!selectedCard}
                className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                  selectedCard
                    ? 'bg-white text-black border-white hover:bg-neutral-200 cursor-pointer'
                    : 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed'
                }`}
              >
                Discard Selected Card
              </button>
            )}
          </div>

          {/* Cards Tray */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {localHand.map(c => (
              <CardView
                key={c.id}
                card={c}
                isSelected={selectedCardId === c.id}
                isSelectable={true}
                size="md"
                onClick={() => handleCardClick(c)}
              />
            ))}
          </div>
        </div>
      </footer>

      {/* Skip Target Modal */}
      {skipTargetModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-700 w-full max-w-xs rounded p-4 space-y-3 text-xs">
            <div className="font-bold uppercase">Choose player to skip:</div>
            <div className="space-y-1.5">
              {opponents.map(opp => (
                <button
                  key={opp.id}
                  onClick={() => handleConfirmSkip(opp.id)}
                  className="w-full p-2 rounded border border-neutral-800 hover:border-white text-left flex justify-between"
                >
                  <span>{opp.name}</span>
                  <span className="text-neutral-500">Phase {opp.currentPhase}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setSkipTargetModalOpen(false)}
              className="w-full py-1 text-neutral-400 hover:text-white border border-neutral-800 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
