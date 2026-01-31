
import { apiClient } from '@/lib/api';

export const analyticsApi = {
  getCompanyRanking: async () => {
    // Calls the new admin endpoint
    const response = await apiClient.get('/api/analytics/admin/employees');
    return response.data.data;
  },

  getMyPerformance: async () => {
    const response = await apiClient.get('/api/analytics/me');
    return response.data.data;
  },

  getAdminOverview: async () => {
    const response = await apiClient.get('/api/analytics/admin/overview');
    return response.data.data;
  }
};
