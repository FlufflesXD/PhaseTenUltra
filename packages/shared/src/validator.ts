import { Card, CardColor, LaidDownPhaseGroup, PhaseDefinition, PhaseRequirement, RequirementType } from './types.js';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  annotatedGroups?: {
    type: PhaseRequirement['type'];
    targetValue?: number;
    targetColor?: CardColor;
    runMin?: number;
    runMax?: number;
    cards: Card[];
  }[];
}

export function validateSet(cards: Card[], minCount: number): { valid: boolean; value?: number; error?: string } {
  if (cards.length < minCount) {
    return { valid: false, error: `Need at least ${minCount} cards for this set (got ${cards.length})` };
  }

  if (cards.some(c => c.type !== 'number' && c.type !== 'wild')) {
    return { valid: false, error: 'Special cards cannot be part of a set' };
  }

  const naturalCards = cards.filter(c => c.type === 'number');
  if (naturalCards.length === 0) {
    return { valid: false, error: 'A set must contain at least one natural number card' };
  }

  const targetValue = naturalCards[0].value;
  const allMatch = naturalCards.every(c => c.value === targetValue);
  if (!allMatch) {
    return { valid: false, error: `All natural cards in this set must match (target was ${targetValue})` };
  }

  return { valid: true, value: targetValue };
}

export function validateRun(
  cards: Card[],
  minCount: number
): { valid: boolean; min?: number; max?: number; error?: string } {
  if (cards.length < minCount) {
    return { valid: false, error: `Need at least ${minCount} cards for this run (got ${cards.length})` };
  }

  if (cards.some(c => c.type !== 'number' && c.type !== 'wild')) {
    return { valid: false, error: 'Special cards cannot be part of a run' };
  }

  const naturalCards = cards.filter(c => c.type === 'number');
  const wildsCount = cards.length - naturalCards.length;

  if (naturalCards.length === 0) {
    return { valid: false, error: 'A run must contain at least one natural number card' };
  }

  const values = naturalCards.map(c => c.value).sort((a, b) => a - b);
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] === values[i + 1]) {
      return { valid: false, error: `Duplicate number ${values[i]} found in run` };
    }
  }

  const minVal = values[0];
  const maxVal = values[values.length - 1];
  const span = maxVal - minVal + 1;
  const gaps = span - naturalCards.length;

  if (gaps > wildsCount) {
    return { valid: false, error: `Not enough wild cards to bridge the gap between ${minVal} and ${maxVal}` };
  }

  const totalCards = cards.length;
  let foundValidWindow = false;
  let bestRunMin = 1;
  let bestRunMax = totalCards;

  for (let start = 1; start <= 13 - totalCards; start++) {
    const end = start + totalCards - 1;
    if (start <= minVal && end >= maxVal) {
      foundValidWindow = true;
      bestRunMin = start;
      bestRunMax = end;
      break;
    }
  }

  if (!foundValidWindow) {
    return { valid: false, error: `Cards cannot form a consecutive run within 1 to 12` };
  }

  return { valid: true, min: bestRunMin, max: bestRunMax };
}

export function validateColorGroup(
  cards: Card[],
  minCount: number
): { valid: boolean; color?: CardColor; error?: string } {
  if (cards.length < minCount) {
    return { valid: false, error: `Need at least ${minCount} cards for this color group (got ${cards.length})` };
  }

  if (cards.some(c => c.type !== 'number' && c.type !== 'wild')) {
    return { valid: false, error: 'Special cards cannot be part of a color group' };
  }

  const naturalCards = cards.filter(c => c.type === 'number');
  if (naturalCards.length === 0) {
    return { valid: false, error: 'A color group must have at least one natural card' };
  }

  const targetColor = naturalCards[0].color;
  const allMatch = naturalCards.every(c => c.color === targetColor);
  if (!allMatch) {
    return { valid: false, error: `All cards in this color group must be ${targetColor}` };
  }

  return { valid: true, color: targetColor };
}

export function validatePhase(
  cardGroups: Card[][],
  phase: PhaseDefinition
): ValidationResult {
  if (cardGroups.length !== phase.requirements.length) {
    return {
      isValid: false,
      error: `Phase requires ${phase.requirements.length} groups, but ${cardGroups.length} provided`
    };
  }

  const allCardIds = new Set<string>();
  for (const group of cardGroups) {
    for (const card of group) {
      if (allCardIds.has(card.id)) {
        return { isValid: false, error: `Card ${card.id} cannot be used in multiple groups` };
      }
      allCardIds.add(card.id);
    }
  }

  const annotatedGroups: ValidationResult['annotatedGroups'] = [];

  for (let i = 0; i < phase.requirements.length; i++) {
    const req = phase.requirements[i];
    const group = cardGroups[i];

    if (req.type === 'set') {
      const res = validateSet(group, req.count);
      if (!res.valid) {
        return { isValid: false, error: `Group ${i + 1} (${phase.name}): ${res.error}` };
      }
      annotatedGroups.push({
        type: 'set',
        targetValue: res.value,
        cards: group
      });
    } else if (req.type === 'run') {
      const res = validateRun(group, req.count);
      if (!res.valid) {
        return { isValid: false, error: `Group ${i + 1} (${phase.name}): ${res.error}` };
      }
      annotatedGroups.push({
        type: 'run',
        runMin: res.min,
        runMax: res.max,
        cards: group
      });
    } else if (req.type === 'color') {
      const res = validateColorGroup(group, req.count);
      if (!res.valid) {
        return { isValid: false, error: `Group ${i + 1} (${phase.name}): ${res.error}` };
      }
      annotatedGroups.push({
        type: 'color',
        targetColor: res.color,
        cards: group
      });
    }
  }

  return { isValid: true, annotatedGroups };
}

export function sortGroupCards(
  cards: Card[],
  type: RequirementType,
  runMin?: number,
  runMax?: number
): Card[] {
  if (cards.length <= 1) return [...cards];

  if (type === 'set') {
    return [...cards].sort((a, b) => {
      if (a.type === 'number' && b.type === 'wild') return -1;
      if (a.type === 'wild' && b.type === 'number') return 1;
      return a.value - b.value;
    });
  }

  if (type === 'color') {
    return [...cards].sort((a, b) => {
      if (a.type === 'number' && b.type === 'wild') return -1;
      if (a.type === 'wild' && b.type === 'number') return 1;
      return a.value - b.value;
    });
  }

  if (type === 'run') {
    const min = runMin ?? 1;
    const max = runMax ?? (min + cards.length - 1);

    const naturalCards = cards.filter(c => c.type === 'number');
    const wildCards = cards.filter(c => c.type === 'wild');

    const naturalMap = new Map<number, Card[]>();
    for (const c of naturalCards) {
      if (!naturalMap.has(c.value)) naturalMap.set(c.value, []);
      naturalMap.get(c.value)!.push(c);
    }

    const sortedRun: Card[] = [];
    let wildIdx = 0;

    for (let val = min; val <= max; val++) {
      if (naturalMap.has(val) && naturalMap.get(val)!.length > 0) {
        sortedRun.push(naturalMap.get(val)!.shift()!);
      } else if (wildIdx < wildCards.length) {
        sortedRun.push(wildCards[wildIdx++]);
      }
    }

    for (const remainingList of naturalMap.values()) {
      for (const rem of remainingList) {
        sortedRun.push(rem);
      }
    }
    while (wildIdx < wildCards.length) {
      sortedRun.push(wildCards[wildIdx++]);
    }

    return sortedRun;
  }

  return [...cards];
}

export function validateHit(
  card: Card,
  targetGroup: LaidDownPhaseGroup,
  targetEnd?: 'low' | 'high'
): boolean {
  if (card.type !== 'number' && card.type !== 'wild') return false;
  const isWild = card.type === 'wild';

  if (targetGroup.type === 'set') {
    if (isWild) return true;
    return card.value === targetGroup.targetValue;
  }

  if (targetGroup.type === 'color') {
    if (isWild) return true;
    return card.color === targetGroup.targetColor;
  }

  if (targetGroup.type === 'run') {
    const min = targetGroup.runMin ?? 1;
    const max = targetGroup.runMax ?? 12;

    if (isWild) {
      if (targetEnd === 'low') return min > 1;
      if (targetEnd === 'high') return max < 12;
      return min > 1 || max < 12;
    }

    return card.value === min - 1 || card.value === max + 1;
  }

  return false;
}

export function findValidPhaseCombination(cards: Card[], phase: PhaseDefinition): Card[][] | null {
  const usable = cards.filter(c => c.type === 'number' || c.type === 'wild');
  if (usable.length < phase.requirements.reduce((acc, r) => acc + r.count, 0)) {
    return null;
  }

  return searchPhaseGroups(usable, phase.requirements, 0);
}

function searchPhaseGroups(
  availableCards: Card[],
  requirements: PhaseRequirement[],
  reqIndex: number
): Card[][] | null {
  if (reqIndex >= requirements.length) {
    return [];
  }

  const req = requirements[reqIndex];
  const count = req.count;
  const subsets = getCombinations(availableCards, count);

  for (const subset of subsets) {
    let isValid = false;
    if (req.type === 'set') {
      isValid = validateSet(subset, count).valid;
    } else if (req.type === 'run') {
      isValid = validateRun(subset, count).valid;
    } else if (req.type === 'color') {
      isValid = validateColorGroup(subset, count).valid;
    }

    if (isValid) {
      const remaining = availableCards.filter(c => !subset.some(s => s.id === c.id));
      const rest = searchPhaseGroups(remaining, requirements, reqIndex + 1);
      if (rest !== null) {
        return [subset, ...rest];
      }
    }
  }

  return null;
}

function getCombinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [head, ...tail] = items;
  const withHead = getCombinations(tail, k - 1).map(c => [head, ...c]);
  const withoutHead = getCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

export function findSingleRequirementMatch(cards: Card[], req: PhaseRequirement): Card[] | null {
  const usable = cards.filter(c => c.type === 'number' || c.type === 'wild');
  if (usable.length < req.count) return null;

  const subsets = getCombinations(usable, req.count);
  for (const subset of subsets) {
    if (req.type === 'set' && validateSet(subset, req.count).valid) {
      return subset;
    }
    if (req.type === 'run' && validateRun(subset, req.count).valid) {
      return subset;
    }
    if (req.type === 'color' && validateColorGroup(subset, req.count).valid) {
      return subset;
    }
  }
  return null;
}

export function findExtraMeldMatch(
  cards: Card[],
  phaseDef?: PhaseDefinition
): { type: RequirementType; cards: Card[] } | null {
  const usable = cards.filter(c => c.type === 'number' || c.type === 'wild');
  if (usable.length < 2) return null;

  // Check if cards match any requirement in player's current phase (the "half rule")
  if (phaseDef) {
    for (const req of phaseDef.requirements) {
      const match = findSingleRequirementMatch(usable, req);
      if (match) {
        return { type: req.type, cards: match };
      }
    }
  }

  return null;
}

