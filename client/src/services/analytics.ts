import { apiClient } from '@/lib/api';

export const analyticsApi = {
  getCompanyRanking: async () => {
    const response = await apiClient.get('/api/analytics/rankings');
    return response.data.data;
  }
};
