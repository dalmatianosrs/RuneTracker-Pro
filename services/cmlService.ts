
import { CmlGains } from '../types';

const PROXIES = [
  'https://api.allorigins.win/get?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://corsproxy.io/?'
];

const CML_RS3_URL = 'https://crystalmathlabs.com/tracker-rs3/track.php?player=';

/**
 * IF THE STRUCTURE CHANGES:
 * 1. Check NAME_TO_ID mapping. Ensure the names here match what CML displays.
 * 2. Look for the main table ID. Currently CML uses 'trackertable'.
 * 3. Check 'Header Indices' logic. CML uses keywords like '24h', '7d', '30d', '365d'.
 */

const NAME_TO_ID: Record<string, number> = {
  'attack': 0, 'defence': 1, 'strength': 2, 'constitution': 3, 'hitpoints': 3, 'con': 3,
  'ranged': 4, 'prayer': 5, 'magic': 6, 'cooking': 7, 'woodcutting': 8, 'wc': 8,
  'fletching': 9, 'fishing': 10, 'firemaking': 11, 'fm': 11, 'crafting': 12,
  'smithing': 13, 'mining': 14, 'herblore': 15, 'herb': 15, 'agility': 16,
  'thieving': 17, 'slayer': 18, 'farming': 19, 'runecrafting': 20, 'rc': 20,
  'hunter': 21, 'construction': 22, 'summoning': 23, 'summ': 23,
  'dungeoneering': 24, 'dg': 24, 'dung': 24, 'divination': 25, 'div': 25,
  'invention': 26, 'inv': 26, 'archaeology': 27, 'arch': 27, 'necromancy': 28, 'necro': 28,
  'overall': -1, 'total': -1
};

export const cmlService = {
  fetchGains: async (rsn: string): Promise<CmlGains> => {
    const results: CmlGains = {
      '1d': {}, '7d': {}, '30d': {}, '365d': {},
      isAvailable: false
    };

    const targetUrl = `${CML_RS3_URL}${encodeURIComponent(rsn)}`;

    const tryScrape = async (proxyBase: string) => {
      const fullUrl = `${proxyBase}${encodeURIComponent(targetUrl)}`;
      const response = await fetch(fullUrl);
      
      if (!response.ok) throw new Error(`Proxy status: ${response.status}`);
      
      const text = await response.text();
      let htmlString = '';
      
      try {
        // AllOrigins and sometimes others wrap in JSON
        const json = JSON.parse(text);
        htmlString = json.contents || text;
      } catch (e) {
        htmlString = text;
      }
      
      if (!htmlString || htmlString.length < 500) {
        throw new Error('PROXY_RETURNED_EMPTY_OR_SHORT');
      }

      if (htmlString.toLowerCase().includes('player not found') || htmlString.toLowerCase().includes('invalid name')) {
        throw new Error('NOT_TRACKED');
      }

      // 1. Clean up HTML
      const cleanHtml = htmlString
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ");

      const parser = new DOMParser();
      const doc = parser.parseFromString(cleanHtml, 'text/html');
      
      const hasUpdateLink = Array.from(doc.querySelectorAll('a, button'))
        .some(el => el.textContent?.toLowerCase().includes('update'));

      // 2. Target the table
      // Preference 1: Explicit ID
      let statsTable = doc.getElementById('trackertable') as HTMLTableElement | null;
      let skillColumnIndex = -1;
      // Fixed: Define highestScore here so it's accessible to the check on line 126.
      let highestScore = 0;

      // Preference 2: Best scoring table
      if (!statsTable) {
        const tables = Array.from(doc.querySelectorAll('table'));

        for (const table of tables) {
          const rows = Array.from(table.querySelectorAll('tr'));
          if (rows.length < 5) continue;

          const uniqueSkillsFound = new Set<number>();
          let localSkillColIdx = -1;

          rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            cells.forEach((cell, idx) => {
              const txt = cell.textContent?.trim().toLowerCase() || '';
              const alt = cell.querySelector('img')?.getAttribute('alt')?.toLowerCase() || '';
              const title = cell.querySelector('img')?.getAttribute('title')?.toLowerCase() || '';
              
              const id = NAME_TO_ID[txt] ?? NAME_TO_ID[alt] ?? NAME_TO_ID[title];
              if (id !== undefined) {
                uniqueSkillsFound.add(id);
                if (localSkillColIdx === -1) localSkillColIdx = idx;
              }
            });
          });

          if (uniqueSkillsFound.size > highestScore) {
            highestScore = uniqueSkillsFound.size;
            statsTable = table;
            skillColumnIndex = localSkillColIdx;
          }
        }
      } else {
        // If we found 'trackertable', still need the skill column index
        const firstRowCells = Array.from(statsTable.querySelectorAll('tr td, tr th'));
        skillColumnIndex = firstRowCells.findIndex(cell => {
           const txt = cell.textContent?.trim().toLowerCase() || '';
           return NAME_TO_ID[txt] !== undefined || !!cell.querySelector('img');
        });
        if (skillColumnIndex === -1) skillColumnIndex = 0; // Default fallback
      }

      if (!statsTable || highestScore < 3 && !doc.getElementById('trackertable')) {
        if (hasUpdateLink) throw new Error('PLAYER_NEEDS_UPDATE');
        throw new Error('CML Table structure not recognized');
      }

      // 3. Robust Header Detection
      const allRows = Array.from(statsTable.querySelectorAll('tr'));
      let headerIndices = { day: -1, week: -1, month: -1, year: -1 };

      // Scan rows for headers
      for (const row of allRows) {
        const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim().toLowerCase() || '');
        const findCol = (keys: string[]) => cells.findIndex(c => keys.some(k => c === k || c.includes(k)));
        
        const d = findCol(['day', '24h', '1d']);
        const w = findCol(['week', '7d']);
        const m = findCol(['month', '30d']);
        const y = findCol(['year', '365d']);

        if (d !== -1 && d !== skillColumnIndex) headerIndices.day = d;
        if (w !== -1 && w !== skillColumnIndex) headerIndices.week = w;
        if (m !== -1 && m !== skillColumnIndex) headerIndices.month = m;
        if (y !== -1 && y !== skillColumnIndex) headerIndices.year = y;

        if (headerIndices.day !== -1 && headerIndices.week !== -1) break;
      }

      // Standard CML RS3 relative layout fallback
      if (headerIndices.day === -1) headerIndices.day = skillColumnIndex + 2;
      if (headerIndices.week === -1) headerIndices.week = skillColumnIndex + 3;
      if (headerIndices.month === -1) headerIndices.month = skillColumnIndex + 4;
      if (headerIndices.year === -1) headerIndices.year = skillColumnIndex + 5;

      // 4. Data Extraction
      allRows.forEach((row) => {
        const cols = Array.from(row.querySelectorAll('td, th'));
        if (cols.length <= skillColumnIndex) return;
        
        const cell = cols[skillColumnIndex];
        const txt = cell.textContent?.trim().toLowerCase() || '';
        const alt = cell.querySelector('img')?.getAttribute('alt')?.toLowerCase() || '';
        const title = cell.querySelector('img')?.getAttribute('title')?.toLowerCase() || '';
        
        const skillNameKey = [txt, alt, title].find(s => NAME_TO_ID[s] !== undefined);
        const skillId = skillNameKey ? NAME_TO_ID[skillNameKey] : undefined;

        if (skillId !== undefined) {
          const parseVal = (idx: number) => {
            if (idx === -1 || idx >= cols.length) return 0;
            const text = cols[idx].textContent?.trim() || '0';
            const cleaned = text.replace(/[^-0-9]/g, '');
            const val = parseInt(cleaned);
            // CML RS3 often tracks in 0.1 XP increments internally
            return isNaN(val) ? 0 : val * 10;
          };
          
          results['1d'][skillId] = parseVal(headerIndices.day);
          results['7d'][skillId] = parseVal(headerIndices.week);
          results['30d'][skillId] = parseVal(headerIndices.month);
          results['365d'][skillId] = parseVal(headerIndices.year);
        }
      });
      
      results.isAvailable = true;
      return results;
    };

    // Sequential retry through proxies
    for (const proxy of PROXIES) {
      try {
        console.log(`CML: Trying proxy ${proxy}`);
        return await tryScrape(proxy);
      } catch (err: any) {
        if (err.message === 'NOT_TRACKED') {
          results.error = 'Player not tracked on CML';
          return results;
        }
        if (err.message === 'PLAYER_NEEDS_UPDATE') {
          results.error = 'Player data stale on CML. Click "Update" on CML website.';
          return results;
        }
        console.warn(`CML: Proxy ${proxy} failed: ${err.message}`);
      }
    }

    results.error = 'CML services busy or structure changed.';
    return results;
  }
};
