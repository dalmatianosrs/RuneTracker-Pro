
import { UserData, SkillSnapshot, CmlGains } from '../types';

const STORAGE_KEY = 'rs3_tracker_v2_data';
const CML_CACHE_KEY = 'rs3_tracker_v2_cml_cache';

export const dbService = {
  getUsers: (): Record<string, UserData> => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Failed to load storage data from localStorage', e);
      return {};
    }
  },

  getUser: (rsn: string): UserData | null => {
    const users = dbService.getUsers();
    return users[rsn.toLowerCase()] || null;
  },

  /**
   * Resets all locally stored player data.
   */
  clearAllData: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CML_CACHE_KEY);
    window.location.reload();
  },

  saveSnapshot: (rsn: string, snapshot: SkillSnapshot) => {
    const users = dbService.getUsers();
    const key = rsn.toLowerCase();
    
    if (!users[key]) {
      users[key] = { rsn, snapshots: [] };
    }

    const currentSnapshots = users[key].snapshots;
    const lastSnapshot = currentSnapshots[currentSnapshots.length - 1];
    
    if (lastSnapshot && lastSnapshot.totalXp === snapshot.totalXp) {
      const timeDiff = snapshot.timestamp - lastSnapshot.timestamp;
      if (timeDiff < 60000) return; 
    }

    currentSnapshots.push(snapshot);
    if (currentSnapshots.length > 100) {
      users[key].snapshots = currentSnapshots.slice(-100);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch (e: any) {
      const isQuotaError = 
        e.name === 'QuotaExceededError' || 
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 ||
        e.code === 1014;

      if (isQuotaError) {
        throw new Error('STORAGE_FULL: Your browser storage is full. Please clear old history or track fewer players to save new snapshots.');
      }
      throw new Error('Could not save data to your device.');
    }
  },

  // CML Caching Logic
  getCmlCache: (): Record<string, { data: CmlGains; timestamp: number }> => {
    try {
      const data = localStorage.getItem(CML_CACHE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveCmlCache: (rsn: string, data: CmlGains) => {
    const cache = dbService.getCmlCache();
    cache[rsn.toLowerCase()] = { data, timestamp: Date.now() };
    try {
      localStorage.setItem(CML_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('CML Cache persistence failed', e);
    }
  }
};
