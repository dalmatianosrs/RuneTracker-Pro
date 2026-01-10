
import { CmlGains } from '../types';

const PRIMARY_PROXY = 'https://api.allorigins.win/get?url=';
const FALLBACK_PROXY = 'https://api.codetabs.com/v1/proxy?quest=';
const CML_RS3_URL = 'https://crystalmathlabs.com/tracker-rs3/track.php?player=';

/**
 * Mapping of CML skill names to our internal Skill IDs.
 */
const NAME_TO_ID: Record<string, number> = {
  'Attack': 0, 'Defence': 1, 'Strength': 2, 'Constitution': 3, 'Ranged': 4,
  'Prayer': 5, 'Magic': 6, 'Cooking': 7, 'Woodcutting': 8, 'Fletching': 9,
  'Fishing': 10, 'Firemaking': 11, 'Crafting': 12, 'Smithing': 13, 'Mining': 14,
  'Herblore': 15, 'Agility': 16, 'Thieving': 17, 'Slayer': 18, 'Farming': 19,
  'Runecrafting': 20, 'Hunter': 21, 'Construction': 22, 'Summoning': 23,
  'Dungeoneering': 24, 'Divination': 25, 'Invention': 26, 'Archaeology': 27, 
  'Necromancy': 28, 'Overall': -1
};

export const cmlService = {
  fetchGains: async (rsn: string): Promise<CmlGains> => {
    const results: CmlGains = {
      '1d': {}, '7d': {}, '30d': {}, '365d': {},
      isAvailable: false
    };

    const targetUrl = `${CML_RS3_URL}${encodeURIComponent(rsn)}`;

    const tryScrape = async (proxyBase: string) => {
      const response = await fetch(`${proxyBase}${encodeURIComponent(targetUrl)}`);
      if (!response.ok) throw new Error(`Proxy status: ${response.status}`);
      
      const text = await response.text();
      let htmlString = '';
      
      try {
        const json = JSON.parse(text);
        htmlString = json.contents || text;
      } catch (e) {
        htmlString = text;
      }
      
      if (!htmlString || htmlString.includes('Player not found') || htmlString.includes('Invalid name')) {
        throw new Error('NOT_TRACKED');
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      
      // If we see an "Update" link but no stats, the player exists but CML hasn't indexed them yet.
      const hasUpdateLink = Array.from(doc.querySelectorAll('a')).some(a => a.textContent?.toLowerCase().includes('update'));

      /**
       * ADVANCED TABLE DETECTION
       * We iterate through all tables and "score" them based on how many skill names they contain.
       * This is much more resilient than looking for specific headers.
       */
      const tables = doc.querySelectorAll('table');
      let bestTable: HTMLTableElement | null = null;
      let highestScore = 0;
      let bestHeaderIndices: Record<string, number> = { skill: -1, day: -1, week: -1, month: -1, year: -1 };

      for (const table of Array.from(tables)) {
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length < 5) continue; // Stats tables are long

        let currentHeaderIndices = { skill: -1, day: -1, week: -1, month: -1, year: -1 };
        let tableScore = 0;

        // Try to find headers in the first 3 rows
        for (let r = 0; r < Math.min(rows.length, 3); r++) {
          const cells = Array.from(rows[r].querySelectorAll('th, td')).map(c => c.textContent?.trim().toLowerCase() || '');
          
          const sIdx = cells.findIndex(c => c.includes('skill') || c === 'name');
          const dIdx = cells.findIndex(c => c.includes('day') || c.includes('24h'));
          const wIdx = cells.findIndex(c => c.includes('week') || c.includes('7d'));
          const mIdx = cells.findIndex(c => c.includes('month') || c.includes('30d'));
          const yIdx = cells.findIndex(c => c.includes('year') || c.includes('365d'));

          if (sIdx !== -1) {
            currentHeaderIndices = { skill: sIdx, day: dIdx, week: wIdx, month: mIdx, year: yIdx };
            break;
          }
        }

        // If no explicit headers, try to score the content
        if (currentHeaderIndices.skill === -1) {
            // Assume first column is skill if it matches skill names
            rows.slice(0, 10).forEach(row => {
                const firstCell = row.querySelector('td')?.textContent?.trim() || '';
                if (NAME_TO_ID[firstCell] !== undefined) tableScore++;
            });
            if (tableScore > 3) currentHeaderIndices.skill = 0; // Likely first column
        } else {
            tableScore = 10; // Found headers, high initial score
        }

        if (tableScore > highestScore && currentHeaderIndices.skill !== -1) {
          highestScore = tableScore;
          bestTable = table;
          bestHeaderIndices = currentHeaderIndices;
        }
      }

      if (!bestTable) {
        if (hasUpdateLink) throw new Error('PLAYER_NEEDS_UPDATE');
        throw new Error('CML Table structure not recognized');
      }

      bestTable.querySelectorAll('tr').forEach((row) => {
        const cols = row.querySelectorAll('td');
        if (cols.length === 0) return;
        
        const skillName = cols[bestHeaderIndices.skill]?.textContent?.trim() || '';
        const skillId = NAME_TO_ID[skillName];

        if (skillId !== undefined) {
          const parseGain = (idx: number) => {
            if (idx === -1 || !cols[idx]) return 0;
            const text = cols[idx].textContent || '0';
            // Clean value: remove commas, pluses, and handle '0' strings
            const val = parseInt(text.replace(/,/g, '').replace(/\+/g, '').trim());
            return isNaN(val) ? 0 : val * 10;
          };
          
          if (bestHeaderIndices.day !== -1) results['1d'][skillId] = parseGain(bestHeaderIndices.day);
          if (bestHeaderIndices.week !== -1) results['7d'][skillId] = parseGain(bestHeaderIndices.week);
          if (bestHeaderIndices.month !== -1) results['30d'][skillId] = parseGain(bestHeaderIndices.month);
          if (bestHeaderIndices.year !== -1) results['365d'][skillId] = parseGain(bestHeaderIndices.year);
        }
      });
      
      results.isAvailable = true;
      return results;
    };

    try {
      return await tryScrape(PRIMARY_PROXY);
    } catch (err: any) {
      if (err.message === 'NOT_TRACKED') {
        results.error = 'Player not tracked on CML';
        return results;
      }
      if (err.message === 'PLAYER_NEEDS_UPDATE') {
        results.error = 'Player exists but needs "Update" on CML website';
        return results;
      }

      console.warn('Primary CML proxy failed, trying fallback...', err.message);
      try {
        return await tryScrape(FALLBACK_PROXY);
      } catch (fallbackErr: any) {
        if (fallbackErr.message === 'NOT_TRACKED') {
          results.error = 'Player not tracked on CML';
        } else if (fallbackErr.message === 'PLAYER_NEEDS_UPDATE') {
          results.error = 'Player exists but needs "Update" on CML website';
        } else {
          results.error = 'CML tracking service busy';
        }
        return results;
      }
    }
  }
};
