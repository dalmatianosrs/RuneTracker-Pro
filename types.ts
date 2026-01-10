
export interface Skill {
  id: number;
  level: number;
  xp: number;
  rank: number;
}

export interface PlayerProfile {
  name: string;
  rank: string;
  totalskill: number;
  totalxp: number;
  combatlevel: number;
  skillvalues: Skill[];
}

export type SkillCategory = 'Combat' | 'Gathering' | 'Artisan' | 'Support' | 'Elite';

export interface SkillDefinition {
  id: number;
  name: string;
  maxLevel: number;
  isElite: boolean;
  category: SkillCategory;
}

export interface CmlGains {
  '1d': Record<number, number>;
  '7d': Record<number, number>;
  '30d': Record<number, number>;
  '365d': Record<number, number>;
  isAvailable: boolean;
  error?: string;
}

export interface ProgressData {
  currentXp: number;
  currentLevel: number;
  xpToNext: number;
  remainingXp: number;
  progressPercent: number;
  nextLevel: number;
}

export interface SkillSnapshot {
  timestamp: number;
  skills: Record<number, { xp: number; level: number; rank: number }>;
  totalXp: number;
  totalLevel: number;
}

export interface UserData {
  rsn: string;
  snapshots: SkillSnapshot[];
}
