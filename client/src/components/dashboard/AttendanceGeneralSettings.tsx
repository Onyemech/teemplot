import { useState, useEffect } from 'react';
import { Clock, Fingerprint, MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface CompanySettings {
  auto_clockin_enabled: boolean;
  auto_clockout_enabled: boolean;
  geofence_radius_meters: number;
  require_geofence_for_clockin: boolean;
  biometrics_required: boolean;
  biometric_timeout_minutes: number;
}

export default function AttendanceGeneralSettings() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [savingAuto, setSavingAuto] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/company-settings');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      showError('Failed to load attendance settings');
    } finally {
      setLoading(false);
    }
  };

  const updateAutoAttendance = async (key: keyof CompanySettings, value: boolean | number) => {
    if (!settings) return;

    try {
      setSavingAuto(true);
      // Optimistic update
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      const response = await apiClient.patch('/api/company-settings/auto-attendance', {
        autoCheckinEnabled: newSettings.auto_clockin_enabled,
        autoCheckoutEnabled: newSettings.auto_clockout_enabled,
        geofenceRadiusMeters: newSettings.geofence_radius_meters,
        requireGeofenceForCheckin: newSettings.require_geofence_for_clockin,
      });

      if (response.data.success) {
        success('Auto-attendance settings updated');
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Failed to update auto-attendance:', error);
      showError('Failed to update settings');
      // Revert optimistic update
      setSettings(settings);
    } finally {
      setSavingAuto(false);
    }
  };

  const updateBiometrics = async (enabled: boolean) => {
    if (!settings) return;

    try {
      setSavingBio(true);
      // Optimistic update
      const newSettings = { ...settings, biometrics_required: enabled };
      setSettings(newSettings);

      const response = await apiClient.patch('/api/company-settings/biometrics', {
        biometricsRequired: enabled,
      });

      if (response.data.success) {
        success(`Biometrics ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Failed to update biometrics:', error);
      showError('Failed to update biometrics settings');
      setSettings(settings);
    } finally {
      setSavingBio(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Auto Clock-in Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Auto Attendance</h3>
              <p className="text-sm text-gray-500">Automate employee clock-ins based on location</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-base font-semibold text-gray-900">Enable Auto Clock-in</label>
              <p className="text-sm text-gray-500 max-w-md">
                Automatically clock employees in when they enter the office geofence.
                Requires location permissions on employee devices.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_clockin_enabled}
                onChange={(e) => updateAutoAttendance('auto_clockin_enabled', e.target.checked)}
                className="sr-only peer"
                disabled={savingAuto}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <div className="space-y-1">
              <label className="text-base font-semibold text-gray-900">Enable Auto Clock-out</label>
              <p className="text-sm text-gray-500 max-w-md">
                Automatically clock employees out when they leave the office geofence.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_clockout_enabled}
                onChange={(e) => updateAutoAttendance('auto_clockout_enabled', e.target.checked)}
                className="sr-only peer"
                disabled={savingAuto}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Geofence Info */}
          <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
            <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Geofence Configuration</p>
              <p>
                Current radius: {settings.geofence_radius_meters} meters. 
                Configure office locations in the "Multiple Clock-in Setup" tab.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Biometrics Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg">
              <Fingerprint className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Biometric Security</h3>
              <p className="text-sm text-gray-500">Enhance security with fingerprint and face recognition</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-base font-semibold text-gray-900">Require Biometrics</label>
              <p className="text-sm text-gray-500 max-w-md">
                Force employees to verify their identity using biometrics before clocking in/out.
                Ensures the right person is at work.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.biometrics_required}
                onChange={(e) => updateBiometrics(e.target.checked)}
                className="sr-only peer"
                disabled={savingBio}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="bg-teal-50 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-teal-600 mt-0.5" />
            <div className="text-sm text-teal-800">
              <p className="font-medium">Secure & Private</p>
              <p>
                Biometric data is stored securely on the user's device and never transmitted to our servers.
                We only receive a cryptographic proof of identity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
