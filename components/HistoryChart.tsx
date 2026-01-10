
import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { UserData } from '../types';
import { SKILL_DEFINITIONS } from '../constants';

interface HistoryChartProps {
  userData: UserData;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ userData }) => {
  const [selectedSkillId, setSelectedSkillId] = useState<number>(-1);

  const data = useMemo(() => {
    return userData.snapshots.map(s => ({
      time: new Date(s.timestamp).toLocaleDateString(),
      fullTime: new Date(s.timestamp).toLocaleString(),
      xp: selectedSkillId === -1 ? s.totalXp / 10 : (s.skills[selectedSkillId]?.xp || 0) / 10,
    }));
  }, [userData, selectedSkillId]);

  const skillName = selectedSkillId === -1 ? 'Total XP' : SKILL_DEFINITIONS[selectedSkillId]?.name || 'Unknown';

  if (userData.snapshots.length < 2) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-[#121214] rounded-3xl border border-dashed border-[#222226] text-slate-500 gap-3">
        <span className="text-3xl">📊</span>
        <p className="font-bold text-sm uppercase tracking-widest">Historical Data Pending</p>
        <p className="text-xs opacity-60">Need at least 2 trackings to generate charts.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#121214] rounded-3xl border border-[#222226] p-6 shadow-2xl relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            Progress Analytics
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            Analyzing {data.length} data points for {skillName}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="skill-selector" className="hidden sm:block text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Metric:</label>
          <select 
            id="skill-selector"
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(parseInt(e.target.value))}
            className="bg-[#1c1c21] border border-[#2d2d35] text-white text-xs font-bold px-4 py-2 rounded-xl outline-none focus:border-sky-500 transition-all cursor-pointer w-full sm:w-48 rs-shadow"
          >
            <option value="-1">Total XP</option>
            {Object.values(SKILL_DEFINITIONS).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222226" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#475569" 
              fontSize={10} 
              fontWeight="bold"
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#475569" 
              fontSize={10} 
              fontWeight="bold"
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : `${(val/1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1c1c21', 
                border: '1px solid #2d2d35', 
                borderRadius: '12px', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                padding: '12px'
              }}
              itemStyle={{ color: '#0ea5e9', fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '8px' }}
              formatter={(value: any) => [Math.floor(value).toLocaleString(), 'XP']}
              labelFormatter={(label) => `Snapshot: ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="xp" 
              stroke="#0ea5e9" 
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorXp)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex justify-between items-center px-2">
        <div className="flex gap-4">
           <div className="flex flex-col">
              <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Growth</span>
              <span className="text-xs font-black text-emerald-400">
                +{Math.floor(data[data.length-1].xp - data[0].xp).toLocaleString()}
              </span>
           </div>
           <div className="flex flex-col border-l border-[#222226] pl-4">
              <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Timeframe</span>
              <span className="text-xs font-black text-slate-400">
                {data.length > 0 ? `${data[0].time} — ${data[data.length-1].time}` : 'N/A'}
              </span>
           </div>
        </div>
        <div className="bg-[#1c1c21] px-3 py-1.5 rounded-lg border border-[#2d2d35]">
           <p className="text-[10px] font-black text-slate-500 uppercase">Live Indexing Enabled</p>
        </div>
      </div>
    </div>
  );
};

export default HistoryChart;
