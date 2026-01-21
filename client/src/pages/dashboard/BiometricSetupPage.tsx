import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/contexts/ToastContext';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, Loader2, CheckCircle, AlertCircle, Settings, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface BiometricCredential {
  id: string;
  deviceName: string;
  deviceType: string;
  createdAt: string;
  lastUsedAt?: string;
}

export default function BiometricSetupPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [registering, setRegistering] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<'fingerprint' | 'face' | 'voice' | 'iris'>('fingerprint');
  const [deviceName, setDeviceName] = useState('');

  const deviceTypeOptions = [
    { value: 'fingerprint', label: 'Fingerprint', icon: '👆', description: 'Use your fingerprint sensor' },
    { value: 'face', label: 'Face Recognition', icon: '😊', description: 'Use your device camera for face recognition' },
    { value: 'voice', label: 'Voice Recognition', icon: '🗣️', description: 'Use your microphone for voice authentication' },
    { value: 'iris', label: 'Iris Scan', icon: '👁️', description: 'Use your device camera for iris scanning' },
  ];

  useEffect(() => {
    fetchUserCredentials();
  }, []);

  useEffect(() => {
    // Set default device name based on selected type
    const selectedOption = deviceTypeOptions.find(opt => opt.value === selectedDeviceType);
    if (selectedOption) {
      setDeviceName(`${selectedOption.label} - ${new Date().toLocaleDateString()}`);
    }
  }, [selectedDeviceType]);

  const fetchUserCredentials = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/webauthn/credentials');
      const data = response.data;

      if (data.success) {
        setCredentials(data.data);
      } else {
        toast.error('Failed to fetch biometric credentials');
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
      toast.error('Failed to fetch biometric credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterBiometric = async () => {
    if (!deviceName.trim()) {
      toast.error('Please enter a device name');
      return;
    }

    try {
      setRegistering(true);

      // Step 1: Get registration options from server
      const optionsResponse = await apiClient.post('/api/webauthn/register/options', {
        deviceName: deviceName.trim(),
        deviceType: selectedDeviceType,
      });

      const optionsData = optionsResponse.data;

      if (!optionsData.success) {
        throw new Error(optionsData.message || 'Failed to get registration options');
      }

      // Step 2: Start WebAuthn registration with browser
      const attResp = await startRegistration(optionsData.data.options);

      // Step 3: Verify registration with server
      const verifyResponse = await apiClient.post('/api/webauthn/register/verify', {
        credentialId: attResp.id,
        response: attResp,
        challengeId: optionsData.data.challengeId,
      });

      const verifyData = verifyResponse.data;

      if (!verifyData.success) {
        throw new Error(verifyData.message || 'Registration verification failed');
      }

      toast.success('Biometric authentication registered successfully!');
      fetchUserCredentials(); // Refresh credentials list

    } catch (err: any) {
      console.error('Biometric registration error:', err);

      if (err.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled or denied');
      } else if (err.name === 'InvalidStateError') {
        toast.error('This device is already registered');
      } else if (err.name === 'NotSupportedError') {
        toast.error('Biometric authentication is not supported on this device');
      } else {
        toast.error(err.message || 'Failed to register biometric authentication');
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleRemoveCredential = async (credentialId: string) => {
    if (!confirm('Are you sure you want to remove this biometric credential?')) return;

    try {
      const response = await apiClient.delete(`/api/webauthn/credentials/${credentialId}`);
      const data = response.data;

      if (data.success) {
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

  const getDeviceName = (type: string) => {
    switch (type) {
      case 'face': return 'Face Recognition';
      case 'voice': return 'Voice Recognition';
      case 'iris': return 'Iris Scan';
      default: return 'Fingerprint';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Please log in to access biometric settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Biometric Authentication</h1>
              <p className="text-gray-600 mt-2">Set up secure biometric authentication for your account</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Registration Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Register New Biometric</h2>

            {/* Device Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Choose Authentication Method</label>
              <div className="grid grid-cols-2 gap-3">
                {deviceTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDeviceType(option.value as any)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${selectedDeviceType === option.value
                      ? 'border-[#0F5D5D] bg-[#0F5D5D]/5'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="text-3xl mb-2">{option.icon}</div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Device Name Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Device Name
              </label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={`${getDeviceName(selectedDeviceType)} - ${new Date().toLocaleDateString()}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Give your device a memorable name (e.g., "iPhone 14 Fingerprint")
              </p>
            </div>

            {/* Register Button */}
            <button
              onClick={handleRegisterBiometric}
              disabled={registering || !deviceName.trim()}
              className="w-full bg-[#0F5D5D] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#0a4545] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {registering ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Fingerprint className="h-5 w-5" />
                  Register {getDeviceName(selectedDeviceType)}
                </>
              )}
            </button>

            {/* Security Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Secure Authentication</p>
                  <p>Your biometric data never leaves your device. Only cryptographic credentials are stored securely on our servers.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Existing Credentials Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Your Biometric Credentials</h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#0F5D5D]" />
              </div>
            ) : credentials.length === 0 ? (
              <div className="text-center py-8">
                <Fingerprint className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Biometric Credentials</h3>
                <p className="text-gray-600 mb-4">You haven't registered any biometric authentication methods yet.</p>
                <p className="text-sm text-gray-500">Register a biometric method above to use secure authentication.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {credentials.map((credential) => (
                  <div key={credential.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getDeviceIcon(credential.deviceType)}</span>
                      <div>
                        <p className="font-medium text-gray-900">{credential.deviceName}</p>
                        <p className="text-sm text-gray-500">
                          Added {new Date(credential.createdAt).toLocaleDateString()}
                          {credential.lastUsedAt && ` • Last used ${new Date(credential.lastUsedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCredential(credential.id)}
                      className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove credential"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Troubleshooting Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Troubleshooting</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Biometric Not Working?</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Ensure your device supports biometric authentication</li>
                <li>• Check that biometrics are enabled in your device settings</li>
                <li>• Make sure you're using a compatible browser (Chrome, Safari, Firefox)</li>
                <li>• Try restarting your browser or device</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Security Information</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Your biometric data never leaves your device</li>
                <li>• We use industry-standard WebAuthn technology</li>
                <li>• Each credential is unique to your device</li>
                <li>• You can remove credentials at any time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}