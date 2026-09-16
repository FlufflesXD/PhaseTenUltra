import React from 'react';
import { PublicGameState } from '@phase-ten/shared';

interface RoundEndModalProps {
  gameState: PublicGameState;
  isHost: boolean;
  onNextRound: () => void;
}

export const RoundEndModal: React.FC<RoundEndModalProps> = ({
  gameState,
  isHost,
  onNextRound
}) => {
  const isGameOver = gameState.status === 'game_over';
  const winner = gameState.players.find(p => p.id === (isGameOver ? gameState.winnerId : gameState.roundWinnerId));

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-700 w-full max-w-md rounded p-5 font-mono text-xs text-white space-y-4">
        <div className="border-b border-neutral-800 pb-2">
          <h2 className="text-base font-bold uppercase tracking-wider">
            {isGameOver ? 'Match Finished' : `Round ${gameState.roundNumber} Ended`}
          </h2>
          <p className="text-neutral-400 mt-0.5">
            {winner?.name} {isGameOver ? 'won the game!' : 'went out first.'}
          </p>
        </div>

        <div>
          <div className="text-[11px] font-bold text-neutral-400 uppercase mb-2">Standings</div>
          <div className="border border-neutral-800 rounded divide-y divide-neutral-800">
            {gameState.players
              .slice()
              .sort((a, b) => b.currentPhase !== a.currentPhase ? b.currentPhase - a.currentPhase : a.score - b.score)
              .map(p => (
                <div key={p.id} className="p-2 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{p.name}</div>
                    <div className="text-[10px] text-neutral-400">
                      {p.phaseCompletedInRound ? 'Advanced to Phase ' + p.currentPhase : 'Repeating Phase ' + p.currentPhase}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>Phase {Math.min(10, p.currentPhase)}</div>
                    <div className="text-neutral-400">{p.score} pts</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div>
          {isHost ? (
            <button
              onClick={onNextRound}
              className="w-full py-2 bg-white text-black font-bold uppercase rounded hover:bg-neutral-200"
            >
              {isGameOver ? 'Start New Match' : 'Next Round'}
            </button>
          ) : (
            <div className="text-center text-neutral-500 italic">
              Waiting for host to continue...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
