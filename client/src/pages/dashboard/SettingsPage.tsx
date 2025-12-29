import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { apiClient } from '@/lib/api';
import BiometricSettings from '@/components/settings/BiometricSettings';
import { Loader2, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/company-settings');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (newSettings: any) => {
    setSettings((prev: any) => ({ ...prev, ...newSettings }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only Owner and Admin can access this page
  if (user?.role !== 'owner' && user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <SettingsIcon className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p>Only administrators can access company settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
        <p className="text-gray-500">Manage your company preferences and security settings.</p>
      </div>

      <div className="grid gap-6">
        {/* Biometric Settings Section */}
        <section>
          <BiometricSettings 
            companyId={user?.companyId || ''} 
            currentSettings={settings}
            onSettingsChange={handleSettingsChange}
          />
        </section>

        {/* Placeholder for other settings sections */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-50">
            <h3 className="text-lg font-semibold mb-4">General Settings</h3>
            <p className="text-sm text-gray-500">More settings coming soon...</p>
        </div>
      </div>
    </div>
  );
}
