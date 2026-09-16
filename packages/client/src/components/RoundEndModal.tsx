import React from 'react';
import { PublicGameState } from '@phase-ten/shared';

interface RoundEndModalProps {
  gameState: PublicGameState;
  isHost: boolean;
  onNextRound: () => void;
  onStartNewMatch?: () => void;
  onReturnToLobby?: () => void;
}

export const RoundEndModal: React.FC<RoundEndModalProps> = ({
  gameState,
  isHost,
  onNextRound,
  onStartNewMatch,
  onReturnToLobby
}) => {
  const isGameOver = gameState.status === 'game_over';
  const winner = gameState.players.find(p => p.id === (isGameOver ? gameState.winnerId : gameState.roundWinnerId));

  const getPhaseStatusText = (p: typeof gameState.players[0]) => {
    if (p.completedAllPhases) {
      return 'Completed All 10 Stages (Winner!)';
    }
    if (p.phaseCompletedInRound) {
      if (p.currentPhase >= 10) {
        return 'Completed Stage 10!';
      }
      return `Advanced to Stage ${p.currentPhase}`;
    }
    return `Repeating Stage ${p.currentPhase}`;
  };

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
              .sort((a, b) => {
                if (a.completedAllPhases !== b.completedAllPhases) {
                  return a.completedAllPhases ? -1 : 1;
                }
                if (b.currentPhase !== a.currentPhase) {
                  return b.currentPhase - a.currentPhase;
                }
                return a.score - b.score;
              })
              .map(p => (
                <div key={p.id} className="p-2 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{p.name}</div>
                    <div className="text-[10px] text-neutral-400">
                      {getPhaseStatusText(p)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>Stage {Math.min(10, p.currentPhase)}</div>
                    <div className="text-neutral-400">{p.score} pts</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div>
          {isHost ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={isGameOver ? (onStartNewMatch || onNextRound) : onNextRound}
                className="w-full py-2 bg-white text-black font-bold uppercase rounded hover:bg-neutral-200 cursor-pointer"
              >
                {isGameOver ? 'Start New Match' : 'Next Round'}
              </button>
              {isGameOver && onReturnToLobby && (
                <button
                  type="button"
                  onClick={onReturnToLobby}
                  className="w-full py-2 bg-neutral-900 border border-neutral-700 text-white font-bold uppercase rounded hover:bg-neutral-800 cursor-pointer"
                >
                  Return to Lobby
                </button>
              )}
            </div>
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
