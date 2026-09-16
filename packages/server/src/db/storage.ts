import fs from 'fs';
import path from 'path';
import { PhaseDefinition } from '@phase-ten/shared';

export interface MatchRecord {
  id: string;
  roomCode: string;
  completedAt: number;
  winnerName: string;
  roundsPlayed: number;
  players: {
    name: string;
    finalPhase: number;
    score: number;
    isBot: boolean;
  }[];
}

export interface PlayerStats {
  name: string;
  matchesPlayed: number;
  wins: number;
  totalPoints: number;
  phasesCompleted: number;
}

export interface StorageData {
  matches: MatchRecord[];
  leaderboard: Record<string, PlayerStats>;
  customPresets: { id: string; name: string; phases: PhaseDefinition[] }[];
}

export class DataStore {
  private dataDir: string;
  private filePath: string;
  private data: StorageData;

  constructor() {
    this.dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    this.filePath = path.join(this.dataDir, 'phaseten_data.json');
    this.data = {
      matches: [],
      leaderboard: {},
      customPresets: []
    };
    this.init();
  }

  private init(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Failed to initialize data store:', err);
    }
  }

  private save(): void {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('Failed to save data store:', err);
    }
  }

  public recordMatch(record: MatchRecord): void {
    this.data.matches.unshift(record);
    // Keep last 100 matches
    if (this.data.matches.length > 100) {
      this.data.matches.pop();
    }

    // Update leaderboard
    for (const p of record.players) {
      if (!this.data.leaderboard[p.name]) {
        this.data.leaderboard[p.name] = {
          name: p.name,
          matchesPlayed: 0,
          wins: 0,
          totalPoints: 0,
          phasesCompleted: 0
        };
      }
      const entry = this.data.leaderboard[p.name];
      entry.matchesPlayed += 1;
      if (p.name === record.winnerName) {
        entry.wins += 1;
      }
      entry.totalPoints += p.score;
      entry.phasesCompleted += (p.finalPhase - 1);
    }

    this.save();
  }

  public getRecentMatches(): MatchRecord[] {
    return this.data.matches.slice(0, 20);
  }

  public getLeaderboard(): PlayerStats[] {
    return Object.values(this.data.leaderboard).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.totalPoints - b.totalPoints;
    });
  }

  public saveCustomPreset(name: string, phases: PhaseDefinition[]): string {
    const id = `preset_${Date.now()}`;
    this.data.customPresets.push({ id, name, phases });
    this.save();
    return id;
  }

  public getCustomPresets() {
    return this.data.customPresets;
  }
}

export const dataStore = new DataStore();
