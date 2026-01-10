
import React from 'react';
import { Skill, ProgressData } from '../types';
import { getXpForLevel, SKILL_DEFINITIONS, CATEGORY_COLORS } from '../constants';

interface SkillCardProps {
  skill: Skill;
  gain?: number;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, gain }) => {
  const def = SKILL_DEFINITIONS[skill.id];
  if (!def) return null;
  
  const calculateProgress = (): ProgressData => {
    const currentXp = skill.xp / 10;
    const currentLevel = skill.level;
    const nextLevel = Math.min(currentLevel + 1, def.maxLevel);
    
    const xpCurrentLevel = getXpForLevel(currentLevel, def.isElite);
    const xpNextLevel = getXpForLevel(nextLevel, def.isElite);
    
    const remainingXp = Math.max(0, xpNextLevel - currentXp);
    let progressPercent = 0;
    if (currentLevel >= def.maxLevel) {
       progressPercent = (currentXp / 200000000) * 100; // Progress toward 200m
    } else {
       progressPercent = Math.min(100, ((currentXp - xpCurrentLevel) / (xpNextLevel - xpCurrentLevel)) * 100);
    }

    return {
      currentXp,
      currentLevel,
      xpToNext: xpNextLevel,
      remainingXp,
      progressPercent,
      nextLevel
    };
  };

  const progress = calculateProgress();
  const accentColor = CATEGORY_COLORS[def.category];

  return (
    <div className="bg-[#121214] border border-[#222226] rounded-xl p-3 flex flex-col gap-2 hover:bg-[#18181b] transition-all group overflow-hidden relative">
      <div 
        className="absolute top-0 left-0 w-1 h-full opacity-50 group-hover:opacity-100 transition-opacity" 
        style={{ backgroundColor: accentColor }} 
      />
      
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-[#1c1c21] border border-[#2d2d35] flex items-center justify-center text-xl shadow-inner group-hover:border-sky-500/30 transition-colors">
             <span className="grayscale group-hover:grayscale-0 transition-all transform group-hover:scale-110 duration-300">
               {getSkillEmoji(def.name)}
             </span>
          </div>
          <div>
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 group-hover:text-slate-300 transition-colors">
              {def.name}
            </h4>
            <div className="flex items-baseline gap-1.5">
              <p className="text-xl font-black text-white leading-none">
                {progress.currentLevel}
                {progress.currentLevel >= def.maxLevel && <span className="text-[10px] text-yellow-500 ml-0.5">★</span>}
              </p>
              <span className="text-[9px] font-bold text-slate-600 bg-[#0a0a0c] px-1.5 py-0.5 rounded border border-[#222226]">
                #{skill.rank > 0 ? skill.rank.toLocaleString() : '---'}
              </span>
            </div>
          </div>
        </div>
        
        {gain !== undefined && gain > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-emerald-400 font-black">+{Math.floor(gain / 10).toLocaleString()}</p>
            <p className="text-[7px] text-slate-600 uppercase font-black tracking-tighter">7d Gain</p>
          </div>
        )}
      </div>

      <div className="mt-1">
        <div className="w-full bg-[#1c1c21] rounded-full h-1.5 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${progress.progressPercent}%`,
              backgroundColor: accentColor,
              boxShadow: `0 0 10px ${accentColor}44`
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] font-bold">
          <span className="text-slate-500">{(progress.currentXp / 1000000).toFixed(1)}M XP</span>
          <span className="text-slate-400">
            {progress.currentLevel >= 120 ? 'Maxed' : `${Math.floor(progress.remainingXp).toLocaleString()} to ${progress.nextLevel}`}
          </span>
        </div>
      </div>
    </div>
  );
};

const getSkillEmoji = (name: string) => {
  const map: Record<string, string> = {
    'Attack': '⚔️', 'Defence': '🛡️', 'Strength': '💪', 'Constitution': '❤️',
    'Ranged': '🏹', 'Prayer': '✨', 'Magic': '🧙', 'Cooking': '🍳',
    'Woodcutting': '🪓', 'Fletching': '🏹', 'Fishing': '🎣', 'Firemaking': '🔥',
    'Crafting': '🧵', 'Smithing': '⚒️', 'Mining': '⛏️', 'Herblore': '🧪',
    'Agility': '🏃', 'Thieving': '💰', 'Slayer': '💀', 'Farming': '🌿',
    'Runecrafting': '🌀', 'Hunter': '🐾', 'Construction': '🔨', 'Summoning': '🐺',
    'Dungeoneering': '🗝️', 'Divination': '🔮', 'Invention': '💡', 'Archaeology': '🏺', 'Necromancy': '👻'
  };
  return map[name] || '📈';
};

export default SkillCard;
