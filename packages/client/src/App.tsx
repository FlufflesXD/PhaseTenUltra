import React, { useState } from 'react';
import { useSocket } from './hooks/useSocket.js';
import { LobbyView } from './components/LobbyView.js';
import { GameTable } from './components/GameTable.js';
import { RoundEndModal } from './components/RoundEndModal.js';
import { RulesModal } from './components/RulesModal.js';
import { ChatDrawer } from './components/ChatDrawer.js';

export function App() {
  const {
    connected,
    secretToken,
    playerName,
    setPlayerName,
    roomState,
    gameState,
    hand,
    notifications,
    chatMessages,
    latestAction,
    error,
    clearError,
    createRoom,
    joinRoom,
    claimSeat,
    updateSettings,
    startGame,
    drawCard,
    layDownPhase,
    layPhaseRequirement,
    layExtraMeld,
    hitCard,
    discardCard,
    resign,
    nextRound,
    startNewMatch,
    returnToLobby,
    leaveRoom,
    sendChat
  } = useSocket();

  const [rulesOpen, setRulesOpen] = useState(false);

  const isInGame = gameState && gameState.status !== 'lobby';
  const isHost = roomState?.hostId === secretToken;

  return (
    <div className="min-h-screen bg-black text-white font-sans relative">
      {/* Error Toast */}
      {error && (
        <div
          onClick={() => clearError()}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-white text-black border border-black px-3 py-1.5 text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer hover:bg-neutral-200 transition-colors"
          title="Click to dismiss"
        >
          <span>[ERROR] {error}</span>
          <span className="text-neutral-500 hover:text-black font-normal ml-1">✕</span>
        </div>
      )}

      {/* Disconnected Toast */}
      {!connected && (
        <div className="fixed top-2 left-2 z-50 bg-neutral-900 border border-neutral-700 text-neutral-400 px-2 py-0.5 text-[10px]">
          Connecting...
        </div>
      )}

      {/* Main View */}
      {isInGame ? (
        <GameTable
          gameState={gameState}
          hand={hand}
          secretToken={secretToken}
          notifications={notifications}
          latestAction={latestAction}
          onDrawCard={drawCard}
          onLayDownPhase={layDownPhase}
          onLayRequirement={layPhaseRequirement}
          onLayExtraMeld={layExtraMeld}
          onHitCard={hitCard}
          onDiscardCard={discardCard}
          onResign={resign}
          onClaimSeat={claimSeat}
          onOpenRules={() => setRulesOpen(true)}
        />
      ) : (
        <LobbyView
          roomState={roomState}
          secretToken={secretToken}
          playerName={playerName}
          setPlayerName={setPlayerName}
          onCreateRoom={() => createRoom()}
          onJoinRoom={(code, isSpec, claimId, overrideName) => joinRoom(code, isSpec, claimId, overrideName)}
          onClaimSeat={claimSeat}
          onUpdateSettings={updateSettings}
          onStartGame={startGame}
          onOpenRules={() => setRulesOpen(true)}
          onLeaveRoom={leaveRoom}
        />
      )}

      {/* Chat */}
      {roomState && (
        <ChatDrawer
          chatMessages={chatMessages}
          onSendMessage={sendChat}
        />
      )}

      {/* Round End / Game Over Modal */}
      {isInGame && (gameState.status === 'round_end' || gameState.status === 'game_over') && (
        <RoundEndModal
          gameState={gameState}
          isHost={isHost}
          onNextRound={nextRound}
          onStartNewMatch={startNewMatch}
          onReturnToLobby={returnToLobby}
        />
      )}

      {/* Rules Guide Modal */}
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </div>
  );
}
