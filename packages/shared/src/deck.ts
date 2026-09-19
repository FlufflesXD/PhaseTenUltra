import {
  Card,
  CardColor,
  CardType,
  GameMode,
  GameSettings,
  SpecialCardType,
  DEFAULT_SPECIAL_CARDS
} from './types.js';

export const CHAOS_SPECIAL_CARDS: { type: CardType; points: number }[] = [
  { type: 'nuke', points: 50 },
  { type: 'jester', points: 25 },
  { type: 'plus_two', points: 20 },
  { type: 'plus_three', points: 25 },
  { type: 'redo', points: 30 },
  { type: 'time', points: 30 },
  { type: 'number_eye', points: 30 },
  { type: 'color_eye', points: 30 },
  { type: 'random', points: 35 },
  { type: 'crack', points: 35 },
  { type: 'status', points: 25 },
  { type: 'luck', points: 30 },
  { type: 'unlucky', points: 30 },
  { type: 'double', points: 35 }
];

export function isChaosSpecialCard(type: CardType): boolean {
  return CHAOS_SPECIAL_CARDS.some(c => c.type === type);
}

export function createStandardDeck(settingsOrMode?: GameSettings | GameMode, idPrefix = ''): Card[] {
  const cards: Card[] = [];
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  let idCounter = 1;

  // 2 sets of 1-12 in 4 colors = 96 cards
  for (let set = 0; set < 2; set++) {
    for (const color of colors) {
      for (let val = 1; val <= 12; val++) {
        const points = val <= 9 ? 5 : 10;
        cards.push({
          id: `card_${idPrefix}${idCounter++}`,
          type: 'number',
          color,
          value: val,
          points
        });
      }
    }
  }

  // Determine enabled special cards
  let enabled: Record<SpecialCardType, boolean> = {
    nuke: false,
    jester: false,
    plus_two: false,
    plus_three: false,
    redo: false,
    time: false,
    number_eye: false,
    color_eye: false,
    random: false,
    crack: false,
    status: false,
    luck: false,
    unlucky: false,
    double: false,
    reverse: true,
    skip: true
  };

  if (typeof settingsOrMode === 'object' && settingsOrMode?.enabledSpecialCards) {
    enabled = { ...settingsOrMode.enabledSpecialCards };
  } else if (settingsOrMode === 'chaos') {
    enabled = { ...DEFAULT_SPECIAL_CARDS };
  }

  // Add custom special cards based on host toggles
  for (const special of CHAOS_SPECIAL_CARDS) {
    if (enabled[special.type as SpecialCardType]) {
      const count = special.type === 'status' ? 2 : 1;
      for (let i = 0; i < count; i++) {
        cards.push({
          id: `card_${idPrefix}${idCounter++}`,
          type: special.type,
          color: 'none',
          value: 0,
          points: special.points
        });
      }
    }
  }

  // 8 Wild cards = 25 points each (always present)
  for (let i = 0; i < 8; i++) {
    cards.push({
      id: `card_${idPrefix}${idCounter++}`,
      type: 'wild',
      color: 'none',
      value: 0,
      points: 25
    });
  }

  // 4 Skip cards = 15 points each (if enabled)
  if (enabled.skip !== false) {
    for (let i = 0; i < 4; i++) {
      cards.push({
        id: `card_${idPrefix}${idCounter++}`,
        type: 'skip',
        color: 'none',
        value: 0,
        points: 15
      });
    }
  }

  // 4 Reverse cards = 15 points each (if enabled)
  if (enabled.reverse !== false) {
    for (let i = 0; i < 4; i++) {
      cards.push({
        id: `card_${idPrefix}${idCounter++}`,
        type: 'reverse',
        color: 'none',
        value: 0,
        points: 15
      });
    }
  }

  return cards;
}

export function createDeck(settingsOrMode?: GameSettings | GameMode, idPrefix = ''): Card[] {
  return shuffleDeck(createStandardDeck(settingsOrMode, idPrefix));
}

function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    const maxUint32 = 0xffffffff;
    const limit = maxUint32 - (maxUint32 % maxExclusive);
    let rand: number;
    do {
      globalThis.crypto.getRandomValues(arr);
      rand = arr[0];
    } while (rand >= limit);
    return rand % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  // 3-pass Fisher-Yates with cryptographically secure random values
  for (let pass = 0; pass < 3; pass++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }
  return shuffled;
}

export function sortCardsByValue(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.type !== 'number' && b.type === 'number') return 1;
    if (a.type === 'number' && b.type !== 'number') return -1;
    if (a.value !== b.value) return a.value - b.value;
    return a.color.localeCompare(b.color);
  });
}

export function sortCardsByColor(cards: Card[]): Card[] {
  const colorOrder: Record<CardColor, number> = {
    red: 1,
    blue: 2,
    green: 3,
    yellow: 4,
    none: 5
  };

  return [...cards].sort((a, b) => {
    const colA = colorOrder[a.color] || 99;
    const colB = colorOrder[b.color] || 99;
    if (colA !== colB) return colA - colB;
    return a.value - b.value;
  });
}
