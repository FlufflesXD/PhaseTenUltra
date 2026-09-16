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
    error,
    createRoom,
    joinRoom,
    updateSettings,
    startGame,
    drawCard,
    layDownPhase,
    hitCard,
    discardCard,
    nextRound,
    sendChat
  } = useSocket();

  const [rulesOpen, setRulesOpen] = useState(false);

  const isInGame = gameState && gameState.status !== 'lobby';
  const isHost = roomState?.hostId === secretToken;

  return (
    <div className="min-h-screen bg-black text-white font-mono relative">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-white text-black border border-black px-3 py-1 text-xs font-bold shadow">
          [ERROR] {error}
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
          onDrawCard={drawCard}
          onLayDownPhase={layDownPhase}
          onHitCard={hitCard}
          onDiscardCard={discardCard}
          onOpenRules={() => setRulesOpen(true)}
        />
      ) : (
        <LobbyView
          roomState={roomState}
          secretToken={secretToken}
          playerName={playerName}
          setPlayerName={setPlayerName}
          onCreateRoom={() => createRoom()}
          onJoinRoom={(code) => joinRoom(code)}
          onUpdateSettings={updateSettings}
          onStartGame={startGame}
          onOpenRules={() => setRulesOpen(true)}
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
        />
      )}

      {/* Rules Guide Modal */}
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </div>
  );
}
