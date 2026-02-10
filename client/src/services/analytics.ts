
import { apiClient } from '@/lib/api';

export const analyticsApi = {
  getCompanyRanking: async (params?: { departmentId?: string }) => {
    const response = await apiClient.get('/api/analytics/admin/employees', { params });
    return response.data.data;
  },

  getMyPerformance: async () => {
    const response = await apiClient.get('/api/analytics/me');
    return response.data.data;
  },

  getAdminOverview: async (params?: { departmentId?: string; startDate?: string; endDate?: string }) => {
    const response = await apiClient.get('/api/analytics/admin/overview', { params });
    return response.data.data;
  },

  getAdminDashboard: async (params?: { departmentId?: string; startDate?: string; endDate?: string }) => {
    const response = await apiClient.get('/api/analytics/admin/dashboard', { params });
    return response.data.data;
  },

  getDepartments: async () => {
    const response = await apiClient.get('/api/analytics/admin/overview');
    return response.data.data.departments;
  },

  runSnapshots: async () => {
    const response = await apiClient.post('/api/analytics/admin/snapshots/run');
    return response.data;
  }
};
