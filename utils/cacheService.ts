import { CACHE_EXPIRY, CACHE_KEYS, CacheMetadata } from '@/types/stock';
import AsyncStorage from '@react-native-async-storage/async-storage';

class CacheService {
  private async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const metadata: CacheMetadata = JSON.parse(cached);
      
      // Check if cache has expired
      if (Date.now() > metadata.expiresAt) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return metadata.data as T;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  private async setCachedData<T>(key: string, data: T, expiryMs: number): Promise<void> {
    try {
      const metadata: CacheMetadata = {
        timestamp: Date.now(),
        expiresAt: Date.now() + expiryMs,
        data,
      };

      await AsyncStorage.setItem(key, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error writing to cache:', error);
    }
  }

  // Search cache methods
  async getSearchCache(query: string): Promise<any[] | null> {
    const key = `${CACHE_KEYS.SEARCH}${query.toLowerCase()}`;
    return this.getCachedData<any[]>(key);
  }

  async setSearchCache(query: string, data: any[]): Promise<void> {
    const key = `${CACHE_KEYS.SEARCH}${query.toLowerCase()}`;
    return this.setCachedData(key, data, CACHE_EXPIRY.SEARCH);
  }

  // Quote cache methods
  async getQuoteCache(symbol: string): Promise<any | null> {
    const key = `${CACHE_KEYS.QUOTE}${symbol.toUpperCase()}`;
    return this.getCachedData<any>(key);
  }

  async setQuoteCache(symbol: string, data: any): Promise<void> {
    const key = `${CACHE_KEYS.QUOTE}${symbol.toUpperCase()}`;
    return this.setCachedData(key, data, CACHE_EXPIRY.QUOTE);
  }

  // Details cache methods
  async getDetailsCache(symbol: string): Promise<any | null> {
    const key = `${CACHE_KEYS.DETAILS}${symbol.toUpperCase()}`;
    return this.getCachedData<any>(key);
  }

  async setDetailsCache(symbol: string, data: any): Promise<void> {
    const key = `${CACHE_KEYS.DETAILS}${symbol.toUpperCase()}`;
    return this.setCachedData(key, data, CACHE_EXPIRY.DETAILS);
  }

  // Historical data cache methods
  async getHistoricalCache(symbol: string, period: string): Promise<any[] | null> {
    const key = `${CACHE_KEYS.HISTORICAL}${symbol.toUpperCase()}:${period}`;
    return this.getCachedData<any[]>(key);
  }

  async setHistoricalCache(symbol: string, period: string, data: any[]): Promise<void> {
    const key = `${CACHE_KEYS.HISTORICAL}${symbol.toUpperCase()}:${period}`;
    return this.setCachedData(key, data, CACHE_EXPIRY.HISTORICAL);
  }

  // Logo cache methods
  async getLogoCache(domain: string): Promise<string | null> {
    const key = `${CACHE_KEYS.LOGO}${domain.toLowerCase()}`;
    return this.getCachedData<string>(key);
  }

  async setLogoCache(domain: string, logoUrl: string): Promise<void> {
    const key = `${CACHE_KEYS.LOGO}${domain.toLowerCase()}`;
    return this.setCachedData(key, logoUrl, CACHE_EXPIRY.LOGO);
  }

  // Clear expired cache entries
  async clearExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(CACHE_KEYS.SEARCH) ||
        key.startsWith(CACHE_KEYS.QUOTE) ||
        key.startsWith(CACHE_KEYS.DETAILS) ||
        key.startsWith(CACHE_KEYS.HISTORICAL) ||
        key.startsWith(CACHE_KEYS.LOGO)
      );

      const expiredKeys: string[] = [];

      for (const key of cacheKeys) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const metadata: CacheMetadata = JSON.parse(cached);
            if (Date.now() > metadata.expiresAt) {
              expiredKeys.push(key);
            }
          }
        } catch (error) {
          // If we can't parse the cache entry, remove it
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        console.log(`Cleared ${expiredKeys.length} expired cache entries`);
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  // Clear all cache
  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(CACHE_KEYS.SEARCH) ||
        key.startsWith(CACHE_KEYS.QUOTE) ||
        key.startsWith(CACHE_KEYS.DETAILS) ||
        key.startsWith(CACHE_KEYS.HISTORICAL) ||
        key.startsWith(CACHE_KEYS.LOGO)
      );

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  // Generic cache methods
  async getCache<T>(key: string): Promise<T | null> {
    return this.getCachedData<T>(key);
  }

  async setCache<T>(key: string, data: T, expiryMs: number = CACHE_EXPIRY.QUOTE): Promise<void> {
    return this.setCachedData(key, data, expiryMs);
  }

  // Get cache info for debugging
  async getCacheInfo(): Promise<{ totalKeys: number; expiredKeys: number; cacheSize: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(CACHE_KEYS.SEARCH) ||
        key.startsWith(CACHE_KEYS.QUOTE) ||
        key.startsWith(CACHE_KEYS.DETAILS) ||
        key.startsWith(CACHE_KEYS.HISTORICAL) ||
        key.startsWith(CACHE_KEYS.LOGO)
      );

      let expiredKeys = 0;
      let totalSize = 0;

      for (const key of cacheKeys) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            totalSize += cached.length;
            const metadata: CacheMetadata = JSON.parse(cached);
            if (Date.now() > metadata.expiresAt) {
              expiredKeys++;
            }
          }
        } catch (error) {
          expiredKeys++;
        }
      }

      return {
        totalKeys: cacheKeys.length,
        expiredKeys,
        cacheSize: totalSize,
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { totalKeys: 0, expiredKeys: 0, cacheSize: 0 };
    }
  }
}

export const cacheService = new CacheService();
