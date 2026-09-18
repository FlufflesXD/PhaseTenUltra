export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'none';

export type CardType = 'number' | 'wild' | 'skip' | 'reverse' | 'draw_two';

export interface Card {
  id: string;
  type: CardType;
  color: CardColor;
  value: number; // 1-12 for number, 0 for special
  points: number; // 1-9: 5pts, 10-12: 10pts, Skip: 15pts, Wild: 25pts, Reverse: 20pts, Draw Two: 20pts
}

export type RequirementType = 'set' | 'run' | 'color';

export interface PhaseRequirement {
  type: RequirementType;
  count: number;
  color?: CardColor;
}

export interface PhaseDefinition {
  phaseNumber: number;
  name: string;
  description: string;
  requirements: PhaseRequirement[];
}

export interface LaidDownPhaseGroup {
  id: string;
  playerId: string;
  playerName: string;
  requirementIndex: number;
  type: RequirementType;
  cards: Card[];
  targetValue?: number; // for sets
  targetColor?: CardColor; // for colors
  runMin?: number; // for runs
  runMax?: number;
}

export interface PlayerPublic {
  id: string;
  name: string;
  isHost: boolean;
  isSpectator: boolean;
  isBot?: boolean;
  connected: boolean;
  score: number;
  currentPhase: number;
  phaseCompletedInRound: boolean;
  completedAllPhases?: boolean;
  cardCount: number;
  laidDownPhases: LaidDownPhaseGroup[];
  isSkipped: boolean;
}

export interface PlayerPrivate extends PlayerPublic {
  cards: Card[];
}

export type TurnStage = 'draw' | 'play' | 'discard';

export type GameMode = 'classic' | 'speed';

export interface GameSettings {
  turnTimerSeconds: number; // 0 = unlimited, 30, 45, 60
  allowPartialAndExtraSets?: boolean; // House rule: allow laying either side of '+' and extra sets
  gameMode?: GameMode; // 'classic' (10 stages), 'speed' (5 stages)
  customActionCards?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface WaitlistPlayer {
  id: string;
  name: string;
}

export interface GameActionEvent {
  id: string;
  type: 'draw' | 'discard' | 'lay_phase' | 'lay_extra' | 'hit' | 'skip' | 'reverse' | 'draw_two';
  playerId: string;
  playerName: string;
  source?: 'deck' | 'discard';
  targetGroupId?: string;
  targetPlayerId?: string;
  card?: Card;
  cards?: Card[];
  message?: string;
  timestamp: number;
}

export interface PublicGameState {
  roomCode: string;
  status: 'lobby' | 'in_game' | 'round_end' | 'game_over';
  roundNumber: number;
  currentTurnPlayerId: string;
  playDirection: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  turnStage: TurnStage;
  turnTimeRemaining: number;
  drawPileCount: number;
  topDiscard: Card | null;
  discardHistory: Card[];
  players: PlayerPublic[];
  waitlist?: WaitlistPlayer[];
  allLaidDownPhases: LaidDownPhaseGroup[];
  winnerId?: string;
  roundWinnerId?: string;
  phaseDefinitions: PhaseDefinition[];
  settings?: GameSettings;
}

export interface RoomState {
  code: string;
  hostId: string;
  status: 'lobby' | 'in_game' | 'round_end' | 'game_over';
  settings: GameSettings;
  players: PlayerPublic[];
  waitlist?: WaitlistPlayer[];
  chatMessages: ChatMessage[];
}

export interface GameNotification {
  id: string;
  type: 'info' | 'phase_complete' | 'skip' | 'round_end' | 'game_over';
  message: string;
  playerId?: string;
  timestamp: number;
}
