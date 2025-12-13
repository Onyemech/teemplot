import { query } from '../config/database';
import { logger } from '../utils/logger';

interface Timezone {
  name: string;
  abbrev: string;
  utc_offset: string;
  is_dst: boolean;
}

class TimezoneService {
  private cache: Timezone[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  async getAllTimezones(): Promise<Timezone[]> {
    try {
      // Check if cache is valid
      if (this.cache && Date.now() < this.cacheExpiry) {
        return this.cache;
      }

      // Use materialized view for much faster performance
      const result = await query(`
        SELECT name, abbrev, utc_offset, is_dst 
        FROM timezone_cache 
        ORDER BY name
      `);

      this.cache = result.rows;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      logger.info(`Loaded ${result.rows.length} timezones from cache`);
      return result.rows;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch timezones from cache, falling back to pg_timezone_names');
      
      // Fallback to original query if materialized view fails
      const result = await query(`
        SELECT name, abbrev, utc_offset, is_dst 
        FROM pg_timezone_names 
        ORDER BY name
      `);
      
      return result.rows;
    }
  }

  async searchTimezones(searchTerm: string): Promise<Timezone[]> {
    try {
      const timezones = await this.getAllTimezones();
      
      if (!searchTerm) {
        return timezones;
      }

      const lowerSearchTerm = searchTerm.toLowerCase();
      return timezones.filter(tz => 
        tz.name.toLowerCase().includes(lowerSearchTerm) ||
        tz.abbrev.toLowerCase().includes(lowerSearchTerm)
      );
    } catch (error) {
      logger.error({ error, searchTerm }, 'Failed to search timezones');
      throw error;
    }
  }

  async getPopularTimezones(): Promise<Timezone[]> {
    try {
      const timezones = await this.getAllTimezones();
      
      // Return commonly used timezones
      const popularNames = [
        'UTC',
        'America/New_York',
        'America/Los_Angeles',
        'America/Chicago',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Australia/Sydney',
        'Africa/Lagos',
        'America/Sao_Paulo'
      ];

      return timezones.filter(tz => popularNames.includes(tz.name));
    } catch (error) {
      logger.error({ error }, 'Failed to get popular timezones');
      throw error;
    }
  }

  async refreshCache(): Promise<void> {
    try {
      await query('SELECT refresh_timezone_cache()');
      this.cache = null; // Clear memory cache to force reload
      logger.info('Timezone cache refreshed successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to refresh timezone cache');
      throw error;
    }
  }
}

export const timezoneService = new TimezoneService();