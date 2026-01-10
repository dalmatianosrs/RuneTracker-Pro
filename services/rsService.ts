
import { PlayerProfile } from '../types';

const PRIMARY_PROXY = 'https://api.allorigins.win/get?url=';
const FALLBACK_PROXY = 'https://api.codetabs.com/v1/proxy?quest=';
const BASE_API = 'https://apps.runescape.com/runemetrics/profile/profile?activities=0&user=';

export const rsService = {
  fetchProfile: async (rsn: string): Promise<PlayerProfile> => {
    const targetUrl = `${BASE_API}${encodeURIComponent(rsn)}`;
    
    const tryFetch = async (proxyBase: string) => {
      const response = await fetch(`${proxyBase}${encodeURIComponent(targetUrl)}`);
      if (!response.ok) throw new Error(`Proxy returned status ${response.status}`);
      
      const data = await response.json();
      // AllOrigins returns it in 'contents', CodeTabs returns it directly
      const content = data.contents !== undefined ? data.contents : JSON.stringify(data);
      
      if (!content) throw new Error('Proxy returned empty content');
      
      let profile;
      try {
        profile = typeof content === 'string' ? JSON.parse(content) : content;
      } catch (e) {
        throw new Error('Failed to parse profile data');
      }

      if (profile.error) {
        if (profile.error === 'PROFILE_PRIVATE') throw new Error('User profile is PRIVATE. Enable public sharing in RS3 settings.');
        if (profile.error === 'NO_PROFILE') throw new Error('User not found on RuneMetrics.');
        throw new Error(`RS API Error: ${profile.error}`);
      }

      return profile;
    };

    try {
      return await tryFetch(PRIMARY_PROXY);
    } catch (err: any) {
      console.warn('Primary proxy failed, trying fallback...', err.message);
      try {
        return await tryFetch(FALLBACK_PROXY);
      } catch (fallbackErr: any) {
        // If both fail, provide a helpful error message
        if (fallbackErr.message.includes('Failed to fetch')) {
          throw new Error('Connection failed. This is usually caused by proxy service outages or CORS blocking. Please try again in a few minutes.');
        }
        throw fallbackErr;
      }
    }
  }
};
