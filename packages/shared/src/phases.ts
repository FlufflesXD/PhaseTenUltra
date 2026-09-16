import { PhaseDefinition } from './types.js';

export const CLASSIC_PHASES: PhaseDefinition[] = [
  {
    phaseNumber: 1,
    name: 'Stage 1',
    description: '2 sets of 3',
    requirements: [
      { type: 'set', count: 3 },
      { type: 'set', count: 3 }
    ]
  },
  {
    phaseNumber: 2,
    name: 'Stage 2',
    description: '1 set of 3 + 1 run of 4',
    requirements: [
      { type: 'set', count: 3 },
      { type: 'run', count: 4 }
    ]
  },
  {
    phaseNumber: 3,
    name: 'Stage 3',
    description: '1 set of 4 + 1 run of 4',
    requirements: [
      { type: 'set', count: 4 },
      { type: 'run', count: 4 }
    ]
  },
  {
    phaseNumber: 4,
    name: 'Stage 4',
    description: '1 run of 7',
    requirements: [
      { type: 'run', count: 7 }
    ]
  },
  {
    phaseNumber: 5,
    name: 'Stage 5',
    description: '1 run of 8',
    requirements: [
      { type: 'run', count: 8 }
    ]
  },
  {
    phaseNumber: 6,
    name: 'Stage 6',
    description: '1 run of 9',
    requirements: [
      { type: 'run', count: 9 }
    ]
  },
  {
    phaseNumber: 7,
    name: 'Stage 7',
    description: '2 sets of 4',
    requirements: [
      { type: 'set', count: 4 },
      { type: 'set', count: 4 }
    ]
  },
  {
    phaseNumber: 8,
    name: 'Stage 8',
    description: '7 cards of 1 color',
    requirements: [
      { type: 'color', count: 7 }
    ]
  },
  {
    phaseNumber: 9,
    name: 'Stage 9',
    description: '1 set of 5 + 1 set of 2',
    requirements: [
      { type: 'set', count: 5 },
      { type: 'set', count: 2 }
    ]
  },
  {
    phaseNumber: 10,
    name: 'Stage 10',
    description: '1 set of 5 + 1 set of 3',
    requirements: [
      { type: 'set', count: 5 },
      { type: 'set', count: 3 }
    ]
  }
];
