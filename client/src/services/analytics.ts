
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
  },

  getAdminDashboard: async (params?: { departmentId?: string; startDate?: string; endDate?: string }) => {
    const response = await apiClient.get('/api/analytics/admin/dashboard', { params });
    return response.data.data;
  },

  runSnapshots: async () => {
    const response = await apiClient.post('/api/analytics/admin/snapshots/run');
    return response.data;
  }
};
