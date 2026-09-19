export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'none';

export type CardType =
  | 'number'
  | 'wild'
  | 'skip'
  | 'reverse'
  | 'draw_two'
  | 'nuke'
  | 'jester'
  | 'plus_two'
  | 'plus_three'
  | 'redo'
  | 'time'
  | 'number_eye'
  | 'color_eye'
  | 'random'
  | 'crack'
  | 'status'
  | 'luck'
  | 'unlucky'
  | 'double';

export type SpecialCardType =
  | 'nuke'
  | 'jester'
  | 'plus_two'
  | 'plus_three'
  | 'redo'
  | 'time'
  | 'number_eye'
  | 'color_eye'
  | 'random'
  | 'crack'
  | 'status'
  | 'luck'
  | 'unlucky'
  | 'double'
  | 'reverse'
  | 'skip';

export const ALL_SPECIAL_CARD_TYPES: SpecialCardType[] = [
  'nuke',
  'jester',
  'plus_two',
  'plus_three',
  'redo',
  'time',
  'number_eye',
  'color_eye',
  'random',
  'crack',
  'status',
  'luck',
  'unlucky',
  'double',
  'reverse',
  'skip'
];

export const DEFAULT_SPECIAL_CARDS: Record<SpecialCardType, boolean> = {
  nuke: true,
  jester: true,
  plus_two: true,
  plus_three: true,
  redo: true,
  time: true,
  number_eye: true,
  color_eye: true,
  random: true,
  crack: true,
  status: true,
  luck: true,
  unlucky: true,
  double: true,
  reverse: true,
  skip: true
};

export interface Card {
  id: string;
  type: CardType;
  color: CardColor;
  value: number; // 1-12 for number, 0 for special
  points: number; // 1-9: 5pts, 10-12: 10pts, Skip/Reverse: 15pts, Wild: 25pts, Specials: 20-50pts
  isCracked?: boolean;
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
  isResigned?: boolean;
  hasNumberEyeEffect?: boolean;
  hasColorEyeEffect?: boolean;
  hasLuck?: boolean;
  hasUnlucky?: boolean;
  hasDoubleDebuff?: boolean;
  crackedCardCount?: number;
}

export interface PlayerPrivate extends PlayerPublic {
  cards: Card[];
}

export type TurnStage = 'draw' | 'play' | 'discard';

export type GameMode = 'classic' | 'speed' | 'chaos';

export interface GameSettings {
  turnTimerSeconds: number; // 0 = unlimited, 30, 45, 60
  allowPartialAndExtraSets?: boolean; // House rule: allow laying either side of '+' and extra sets
  totalPhases?: number; // 1-10 (default 10)
  enabledSpecialCards?: Record<SpecialCardType, boolean>;
  gameMode?: GameMode; // Optional legacy fallback
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
  type:
    | 'draw'
    | 'discard'
    | 'lay_phase'
    | 'lay_extra'
    | 'hit'
    | 'skip'
    | 'reverse'
    | 'draw_two'
    | 'nuke'
    | 'jester'
    | 'plus_two'
    | 'plus_three'
    | 'redo'
    | 'time'
    | 'number_eye'
    | 'color_eye'
    | 'random'
    | 'crack'
    | 'status'
    | 'luck'
    | 'unlucky'
    | 'double';
  playerId: string;
  playerName: string;
  source?: 'deck' | 'discard';
  targetGroupId?: string;
  targetPlayerId?: string;
  card?: Card;
  cards?: Card[];
  timeResult?: 'green' | 'red';
  timeOldPhase?: number;
  timeNewPhase?: number;
  randomChosenType?: CardType;
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
