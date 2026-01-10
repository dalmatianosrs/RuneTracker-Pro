
import { SkillDefinition } from './types';

export const SKILL_DEFINITIONS: Record<number, SkillDefinition> = {
  0: { id: 0, name: 'Attack', maxLevel: 99, isElite: false, category: 'Combat' },
  1: { id: 1, name: 'Defence', maxLevel: 99, isElite: false, category: 'Combat' },
  2: { id: 2, name: 'Strength', maxLevel: 99, isElite: false, category: 'Combat' },
  3: { id: 3, name: 'Constitution', maxLevel: 99, isElite: false, category: 'Combat' },
  4: { id: 4, name: 'Ranged', maxLevel: 99, isElite: false, category: 'Combat' },
  5: { id: 5, name: 'Prayer', maxLevel: 99, isElite: false, category: 'Combat' },
  6: { id: 6, name: 'Magic', maxLevel: 99, isElite: false, category: 'Combat' },
  7: { id: 7, name: 'Cooking', maxLevel: 99, isElite: false, category: 'Artisan' },
  8: { id: 8, name: 'Woodcutting', maxLevel: 99, isElite: false, category: 'Gathering' },
  9: { id: 9, name: 'Fletching', maxLevel: 99, isElite: false, category: 'Artisan' },
  10: { id: 10, name: 'Fishing', maxLevel: 99, isElite: false, category: 'Gathering' },
  11: { id: 11, name: 'Firemaking', maxLevel: 99, isElite: false, category: 'Artisan' },
  12: { id: 12, name: 'Crafting', maxLevel: 99, isElite: false, category: 'Artisan' },
  13: { id: 13, name: 'Smithing', maxLevel: 99, isElite: false, category: 'Artisan' },
  14: { id: 14, name: 'Mining', maxLevel: 99, isElite: false, category: 'Gathering' },
  15: { id: 15, name: 'Herblore', maxLevel: 120, isElite: false, category: 'Artisan' },
  16: { id: 16, name: 'Agility', maxLevel: 99, isElite: false, category: 'Support' },
  17: { id: 17, name: 'Thieving', maxLevel: 99, isElite: false, category: 'Support' },
  18: { id: 18, name: 'Slayer', maxLevel: 120, isElite: false, category: 'Combat' },
  19: { id: 19, name: 'Farming', maxLevel: 120, isElite: false, category: 'Gathering' },
  20: { id: 20, name: 'Runecrafting', maxLevel: 99, isElite: false, category: 'Artisan' },
  21: { id: 21, name: 'Hunter', maxLevel: 99, isElite: false, category: 'Gathering' },
  22: { id: 22, name: 'Construction', maxLevel: 99, isElite: false, category: 'Support' },
  23: { id: 23, name: 'Summoning', maxLevel: 99, isElite: false, category: 'Combat' },
  24: { id: 24, name: 'Dungeoneering', maxLevel: 120, isElite: false, category: 'Support' },
  25: { id: 25, name: 'Divination', maxLevel: 99, isElite: false, category: 'Gathering' },
  26: { id: 26, name: 'Invention', maxLevel: 120, isElite: true, category: 'Elite' },
  27: { id: 27, name: 'Archaeology', maxLevel: 120, isElite: false, category: 'Gathering' },
  28: { id: 28, name: 'Necromancy', maxLevel: 120, isElite: false, category: 'Combat' },
};

export const CATEGORY_COLORS: Record<string, string> = {
  Combat: '#ef4444',
  Gathering: '#22c55e',
  Artisan: '#3b82f6',
  Support: '#a855f7',
  Elite: '#f59e0b',
};

export const getXpForLevel = (level: number, isElite: boolean = false): number => {
  if (level <= 1) return 0;
  
  // Elite Experience Curve (Invention)
  if (isElite) {
    if (level > 150) return 200000000;
    // Approximation for the Invention curve floor(1.1^(L-1) * 1000)
    // The official curve is specific, but this geometric progression is the design
    let xp = 0;
    for (let i = 1; i < level; i++) {
        xp = Math.floor(Math.pow(1.1, i - 1) * 1000);
    }
    // Hardcoded milestones for accuracy where the formula might drift
    const eliteMilestones: Record<number, number> = {
        99: 36073511,
        120: 80610333,
        150: 200000000
    };
    if (eliteMilestones[level]) return eliteMilestones[level];
    
    // Better approximation for Invention levels
    return Math.floor(Math.pow(level, 3.8) * 0.22); 
  }

  // Standard Experience Curve
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += Math.floor(i + 300 * Math.pow(2, i / 7));
  }
  return Math.floor(total / 4);
};
