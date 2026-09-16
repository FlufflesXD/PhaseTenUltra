import { Card, CardColor } from './types.js';

export function createStandardDeck(): Card[] {
  const cards: Card[] = [];
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  let idCounter = 1;

  // 2 sets of 1-12 in 4 colors = 96 cards
  for (let set = 0; set < 2; set++) {
    for (const color of colors) {
      for (let val = 1; val <= 12; val++) {
        const points = val <= 9 ? 5 : 10;
        cards.push({
          id: `card_${idCounter++}`,
          type: 'number',
          color,
          value: val,
          points
        });
      }
    }
  }

  // 8 Wild cards = 25 points each
  for (let i = 0; i < 8; i++) {
    cards.push({
      id: `card_${idCounter++}`,
      type: 'wild',
      color: 'none',
      value: 0,
      points: 25
    });
  }

  // 4 Skip cards = 15 points each
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `card_${idCounter++}`,
      type: 'skip',
      color: 'none',
      value: 0,
      points: 15
    });
  }

  return cards;
}

export function createDeck(): Card[] {
  return shuffleDeck(createStandardDeck());
}

export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
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
