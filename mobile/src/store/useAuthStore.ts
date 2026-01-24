import { create } from 'zustand';

interface CompanySettings {
  id: string;
  name: string;
  biometrics_required: boolean; // Per company setting
}

interface UserProfile {
  id: string;
  email: string;
  companyId: string;
  role: string;
}

interface AuthState {
  user: UserProfile | null;
  companySettings: CompanySettings | null;
  setUser: (user: UserProfile | null) => void;
  setCompanySettings: (settings: CompanySettings | null) => void;
  fetchCompanySettings: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  companySettings: null,
  setUser: (user) => set({ user }),
  setCompanySettings: (settings) => set({ companySettings: settings }),
  fetchCompanySettings: async () => {
    const user = get().user;
    if (!user) return;
    
    try {
      // In a real app, this would be an API call
      // const response = await apiClient.get(`/api/company-settings`);
      // set({ companySettings: response.data.data });
      
      // Mocking for design purposes
      set({ 
        companySettings: { 
          id: user.companyId, 
          name: 'Teemplot Corp', 
          biometrics_required: true 
        } 
      });
    } catch (error) {
      console.error('Failed to fetch company settings', error);
    }
  },
}));
