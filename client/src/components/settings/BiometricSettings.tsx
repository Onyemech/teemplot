import { useState, useEffect } from 'react';
import { Fingerprint, Settings, CheckCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface BiometricSettingsProps {
  companyId: string;
  currentSettings?: {
    biometrics_required?: boolean;
    biometric_timeout_minutes?: number;
    biometric_device_types?: string[];
  };
  onSettingsChange?: (settings: any) => void;
}

interface BiometricCredential {
  id: string;
  deviceName: string;
  deviceType: string;
  createdAt: string;
  lastUsedAt?: string;
}

export default function BiometricSettings({ companyId, currentSettings, onSettingsChange }: BiometricSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [biometricsRequired, setBiometricsRequired] = useState(currentSettings?.biometrics_required || false);
  const [biometricTimeout, setBiometricTimeout] = useState(currentSettings?.biometric_timeout_minutes || 30);
  const [deviceTypes, setDeviceTypes] = useState<string[]>(currentSettings?.biometric_device_types || ['fingerprint', 'face']);
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const toast = useToast();

  const deviceTypeOptions = [
    { value: 'fingerprint', label: 'Fingerprint', icon: '👆' },
    { value: 'face', label: 'Face Recognition', icon: '😊' },
    { value: 'voice', label: 'Voice Recognition', icon: '🗣️' },
    { value: 'iris', label: 'Iris Scan', icon: '👁️' },
  ];

  useEffect(() => {
    fetchUserCredentials();
  }, [companyId]);

  useEffect(() => {
    if (currentSettings) {
      setBiometricsRequired(currentSettings.biometrics_required || false);
      setBiometricTimeout(currentSettings.biometric_timeout_minutes || 30);
      setDeviceTypes(currentSettings.biometric_device_types || ['fingerprint', 'face']);
    }
  }, [currentSettings]);

  const fetchUserCredentials = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/webauthn/credentials');
      if (response.data.success) {
        setCredentials(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const response = await apiClient.patch('/company-settings/biometrics', {
        biometricsRequired,
      });

      if (response.data.success) {
        toast.success('Biometric settings updated successfully');
        onSettingsChange?.({
          biometrics_required: biometricsRequired,
          biometric_timeout_minutes: biometricTimeout,
          biometric_device_types: deviceTypes,
        });
      } else {
        toast.error('Failed to update biometric settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to update biometric settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCredential = async (credentialId: string) => {
    if (!confirm('Are you sure you want to remove this biometric credential?')) return;

    try {
      const response = await apiClient.delete(`/webauthn/credentials/${credentialId}`);
      if (response.data.success) {
        toast.success('Credential removed successfully');
        fetchUserCredentials();
      } else {
        toast.error('Failed to remove credential');
      }
    } catch (error) {
      console.error('Failed to remove credential:', error);
      toast.error('Failed to remove credential');
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'face': return '😊';
      case 'voice': return '🗣️';
      case 'iris': return '👁️';
      default: return '👆';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Fingerprint className="h-6 w-6 text-[#0F5D5D] mr-3" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Biometric Authentication</h3>
            <p className="text-sm text-gray-600">Enable secure authentication using fingerprints, face recognition, or other biometric methods.</p>
          </div>
        </div>
        <Settings className="h-5 w-5 text-gray-400" />
      </div>

      {/* Main Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">Require Biometric Authentication</h4>
            <p className="text-sm text-gray-600">Force users to use biometric authentication for sensitive operations like clocking in/out.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={biometricsRequired}
              onChange={(e) => setBiometricsRequired(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0F5D5D]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F5D5D]"></div>
          </label>
        </div>
      </div>

      {/* Device Type Selection */}
      {biometricsRequired && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Allowed Biometric Methods</h4>
          <div className="grid grid-cols-2 gap-3">
            {deviceTypeOptions.map((option) => (
              <label key={option.value} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={deviceTypes.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setDeviceTypes([...deviceTypes, option.value]);
                    } else {
                      setDeviceTypes(deviceTypes.filter(type => type !== option.value));
                    }
                  }}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{option.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{option.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Timeout Setting */}
      {biometricsRequired && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Biometric Timeout</h4>
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-600">Timeout after</label>
            <select
              value={biometricTimeout}
              onChange={(e) => setBiometricTimeout(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
            </select>
          </div>
        </div>
      )}

      {/* User's Biometric Credentials */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 mb-3">Your Biometric Credentials</h4>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-[#0F5D5D]" />
          </div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-4">
            <Fingerprint className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No biometric credentials registered</p>
            <p className="text-xs text-gray-500 mt-1">Register a biometric method to use secure authentication</p>
          </div>
        ) : (
          <div className="space-y-3">
            {credentials.map((credential) => (
              <div key={credential.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getDeviceIcon(credential.deviceType)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{credential.deviceName}</p>
                    <p className="text-xs text-gray-500">
                      Added {new Date(credential.createdAt).toLocaleDateString()}
                      {credential.lastUsedAt && ` • Last used ${new Date(credential.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveCredential(credential.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex-1 bg-[#0F5D5D] text-white font-bold py-3 px-4 rounded-xl hover:bg-[#0a4545] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-teal-900/20"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
        <button
          onClick={() => {
            // Navigate to biometric registration
            window.location.href = '/dashboard/biometric-setup';
          }}
          className="px-6 py-3 border border-[#0F5D5D] text-[#0F5D5D] font-bold rounded-xl hover:bg-[#0F5D5D]/5 transition-colors"
        >
          Register New
        </button>
      </div>

      {/* Security Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Secure Authentication</p>
            <p>Biometric authentication uses WebAuthn standards and never stores your actual biometric data. Only cryptographic credentials are kept.</p>
          </div>
        </div>
      </div>
    </div>
  );
}