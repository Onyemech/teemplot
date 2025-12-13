import { apiClient } from '@/lib/api';

interface Timezone {
  name: string;
  abbrev: string;
  utc_offset: string;
  is_dst: boolean;
}

class TimezoneService {
  private cache: Timezone[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  async getAllTimezones(): Promise<Timezone[]> {
    try {
      // Check if cache is valid
      if (this.cache && Date.now() < this.cacheExpiry) {
        return this.cache;
      }

      const response = await apiClient.get('/api/timezones');
      if (response.data.success) {
        this.cache = response.data.data;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        return this.cache || [];
      }
      
      throw new Error('Failed to fetch timezones');
    } catch (error) {
      console.error('Failed to fetch timezones:', error);
      throw error;
    }
  }

  async searchTimezones(searchTerm: string): Promise<Timezone[]> {
    try {
      if (!searchTerm) {
        return this.getAllTimezones();
      }

      const response = await apiClient.get(`/api/timezones/search?q=${encodeURIComponent(searchTerm)}`);
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to search timezones');
    } catch (error) {
      console.error('Failed to search timezones:', error);
      throw error;
    }
  }

  async getPopularTimezones(): Promise<Timezone[]> {
    try {
      const response = await apiClient.get('/api/timezones/popular');
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch popular timezones');
    } catch (error) {
      console.error('Failed to fetch popular timezones:', error);
      throw error;
    }
  }

  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }
}

export const timezoneService = new TimezoneService();