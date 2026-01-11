
// Import React hooks and types to resolve compilation errors
import React, { useState, useMemo } from 'react';
import { rsService } from './services/rsService';
import { cmlService } from './services/cmlService';
import { dbService } from './services/dbService';
import { PlayerProfile, UserData, SkillSnapshot, CmlGains, Skill } from './types';
import SkillCard from './components/SkillCard';
import HistoryChart from './components/HistoryChart';
import { SKILL_DEFINITIONS, CATEGORY_COLORS } from './constants';

const CML_CACHE_TTL = 5 * 60 * 1000;

const App: React.FC = () => {
  const [rsn, setRsn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [localUser, setLocalUser] = useState<UserData | null>(null);
  const [cmlGains, setCmlGains] = useState<CmlGains | null>(null);
  const [isCached, setIsCached] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanRsn = rsn.trim();
    if (!cleanRsn) return;

    setLoading(true);
    setError(null);
    setIsCached(false);

    try {
      // 1. Fetch Real-time RuneMetrics Profile (MANDATORY)
      const data = await rsService.fetchProfile(cleanRsn);
      setProfile(data);

      // 2. Manage CML Cache (TTL 5 mins, Persistent in localStorage) (OPTIONAL)
      try {
        const now = Date.now();
        const cacheKey = cleanRsn.toLowerCase();
        const cache = dbService.getCmlCache();
        const cachedEntry = cache[cacheKey];

        let cmlData: CmlGains;
        if (cachedEntry && (now - cachedEntry.timestamp < CML_CACHE_TTL)) {
          cmlData = cachedEntry.data;
          setIsCached(true);
        } else {
          cmlData = await cmlService.fetchGains(cleanRsn);
          dbService.saveCmlCache(cleanRsn, cmlData);
          setIsCached(false);
        }
        setCmlGains(cmlData);
      } catch (cmlErr) {
        console.warn('CML Tracking failed, but profile loaded:', cmlErr);
        setCmlGains({ '1d': {}, '7d': {}, '30d': {}, '365d': {}, isAvailable: false, error: 'CML unreachable' });
      }

      // 3. Local History Snapshot
      const snapshot: SkillSnapshot = {
        timestamp: Date.now(),
        skills: data.skillvalues.reduce((acc, s) => ({ 
          ...acc, 
          [s.id]: { xp: s.xp, level: s.level, rank: s.rank } 
        }), {}),
        totalXp: data.totalxp,
        totalLevel: data.totalskill,
      };

      dbService.saveSnapshot(cleanRsn, snapshot);
      setLocalUser(dbService.getUser(cleanRsn));
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const topGains = useMemo(() => {
    if (!cmlGains?.isAvailable) return [];
    return Object.entries(cmlGains['7d'])
      .map(([id, gain]) => ({ id: parseInt(id), gain: gain as number }))
      .filter(g => g.id !== -1 && g.gain > 0) // Exclude "Overall" and zero gains
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 3);
  }, [cmlGains]);

  const isStorageError = error?.startsWith('STORAGE_FULL');

  // Helper to format rank safely
  const formatRank = (rank: string | number) => {
    if (!rank) return '---';
    const cleanRank = typeof rank === 'string' ? rank.replace(/,/g, '') : rank;
    const num = Number(cleanRank);
    return isNaN(num) ? rank.toString() : num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200">
      {/* Navigation */}
      <nav className="bg-[#121214] border-b border-[#222226] py-3 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-600 rounded flex items-center justify-center font-black text-white text-lg shadow-[0_0_15px_rgba(2,132,199,0.3)]">R</div>
          <h1 className="text-lg font-black tracking-tighter text-white">RuneTracker <span className="text-sky-500">PRO</span></h1>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full ml-auto">
          <input 
            type="text" 
            value={rsn}
            onChange={(e) => setRsn(e.target.value)}
            placeholder="Search RSN..."
            className="bg-[#1c1c21] border border-[#2d2d35] text-white px-4 py-2 rounded-lg text-sm w-full outline-none focus:border-sky-500 transition-colors"
          />
          <button 
            type="submit"
            disabled={loading}
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 min-w-[80px]"
          >
            {loading ? <span className="animate-pulse">Tracking</span> : 'Track'}
          </button>
        </form>
      </nav>

      <main className="max-w-[1400px] mx-auto p-6 md:p-8">
        {!profile ? (
          <div className="py-24 text-center">
            <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Real-time RS3 Analytics</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">The gold standard for player tracking. View real-time hiscores, historical gains, and competitive analytics for RuneScape 3.</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Profile Section */}
            <header className="flex flex-col md:flex-row gap-6 items-start md:items-center bg-gradient-to-r from-[#121214] to-[#1a1a1e] p-8 rounded-3xl border border-[#222226] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-sky-600/5 blur-[100px]" />
               
               <div className="flex-1 space-y-2 relative z-10">
                  <div className="flex items-center gap-3">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tight">{profile.name}</h2>
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2 py-1 rounded border border-emerald-500/20 uppercase tracking-widest">Active</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-500">
                    <div className="flex items-center gap-1.5"><span className="text-sky-500">LVL</span> {profile.totalskill} Total</div>
                    <div className="flex items-center gap-1.5"><span className="text-red-500">CMB</span> {profile.combatlevel} Combat</div>
                    <div className="flex items-center gap-1.5"><span className="text-amber-500">RANK</span> {formatRank(profile.rank)} Global</div>
                  </div>
               </div>

               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full md:w-auto relative z-10">
                  <div className="bg-[#0a0a0c]/50 p-4 rounded-xl border border-[#222226]">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total XP</p>
                    <p className="text-2xl font-black text-white">{(Number(profile?.totalxp || 0) / 1000000).toFixed(1)}M</p>
                  </div>
                  <div className="bg-[#0a0a0c]/50 p-4 rounded-xl border border-[#222226] relative">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">7d Gain</p>
                      {isCached && (
                        <span className="text-[7px] bg-slate-800 text-slate-400 px-1 rounded border border-slate-700 font-bold uppercase tracking-tighter">Cached</span>
                      )}
                    </div>
                    <p className={`text-2xl font-black ${cmlGains?.isAvailable ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {cmlGains?.isAvailable ? `+${((Object.values(cmlGains['7d'] || {}) as number[]).reduce((a: number, b: number) => a + b, 0) / 10000000).toFixed(1)}M` : 'N/A'}
                    </p>
                    {cmlGains?.error && !cmlGains.isAvailable && (
                      <span className="absolute -bottom-1 left-4 text-[7px] text-red-500 font-bold uppercase">{cmlGains.error}</span>
                    )}
                  </div>
               </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Sidebar - Quick Stats & Gains */}
              <aside className="lg:col-span-3 space-y-8">
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                    Top Weekly Gains
                    <span className="w-12 h-px bg-[#222226] ml-2" />
                  </h3>
                  <div className="space-y-3">
                    {topGains.length > 0 ? topGains.map(g => (
                      <div key={g.id} className="bg-[#121214] p-3 rounded-xl border border-[#222226] flex items-center justify-between group hover:border-emerald-500/30 transition-colors">
                        <span className="text-sm font-bold text-white">{SKILL_DEFINITIONS[g.id]?.name || 'Unknown Skill'}</span>
                        <span className="text-sm font-black text-emerald-400">+{Math.floor(g.gain / 10).toLocaleString()}</span>
                      </div>
                    )) : (
                      <div className="bg-[#121214] p-6 rounded-xl border border-dashed border-[#222226] text-center">
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                          {cmlGains?.error ? 'Tracking Unavailable' : 'No Recent Gains'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#121214] p-5 rounded-2xl border border-[#222226] space-y-4">
                  <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest">Mastery Progress</h3>
                  <div className="space-y-4">
                    {['Combat', 'Gathering', 'Artisan', 'Support'].map(cat => {
                      const skills = (profile?.skillvalues || []).filter(s => SKILL_DEFINITIONS[s.id]?.category === cat);
                      const avgLevel = (skills.reduce((a: number, b: Skill) => a + Number(b.level), 0) / (skills.length || 1));
                      const color = CATEGORY_COLORS[cat];
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-black uppercase">
                            <span className="text-slate-500">{cat}</span>
                            <span style={{ color }}>{avgLevel.toFixed(0)} Avg</span>
                          </div>
                          <div className="h-1 w-full bg-[#1c1c21] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(avgLevel / 120) * 100}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </aside>

              {/* Main Content - Skill Grid */}
              <div className="lg:col-span-9 space-y-8">
                {/* Historical Chart Card */}
                {localUser && (
                  <HistoryChart userData={localUser} />
                )}

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Skill Matrix</h3>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Live Stats from RuneMetrics
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {(profile?.skillvalues || [])
                      .sort((a, b) => a.id - b.id)
                      .map(s => (
                        <SkillCard key={s.id} skill={s} gain={cmlGains?.['7d'][s.id]} />
                      ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>

      {error && (
        <div className="fixed bottom-8 right-8 bg-[#1a1a1e] border border-red-500/30 text-white p-6 rounded-2xl shadow-2xl flex flex-col gap-4 animate-in slide-in-from-right-8 duration-300 max-w-sm z-[100]">
          <div className="flex items-start gap-3">
             <span className="text-red-500 text-2xl">⚠️</span>
             <div className="flex-1">
                <p className="font-black text-sm text-red-400 uppercase tracking-tighter mb-1">System Error</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                   {isStorageError ? error.replace('STORAGE_FULL: ', '') : error}
                </p>
             </div>
          </div>
          <div className="flex gap-2">
            {isStorageError && (
              <button 
                onClick={() => dbService.clearAllData()}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black py-2 rounded uppercase tracking-widest transition-colors"
              >
                Reset All Local Data
              </button>
            )}
            <button 
              onClick={() => setError(null)}
              className="px-4 bg-[#222226] hover:bg-[#2d2d35] text-slate-400 text-[10px] font-black py-2 rounded uppercase tracking-widest transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
