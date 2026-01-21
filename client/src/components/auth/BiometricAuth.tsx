import { useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint, ScanFace, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';

interface BiometricAuthProps {
  action: 'register' | 'authenticate';
  onSuccess: () => void;
  onCancel: () => void;
  email?: string;
  deviceType?: 'fingerprint' | 'face' | 'voice' | 'iris';
}

interface BiometricCredential {
  id: string;
  deviceName: string;
  deviceType: string;
  createdAt: string;
  lastUsedAt?: string;
}

export default function BiometricAuth({ action, onSuccess, onCancel, email, deviceType = 'fingerprint' }: BiometricAuthProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const toast = useToast();

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'face':
        return <ScanFace className="h-6 w-6" />;
      case 'voice':
        return <AlertCircle className="h-6 w-6" />;
      case 'iris':
        return <Fingerprint className="h-6 w-6" />;
      default:
        return <Fingerprint className="h-6 w-6" />;
    }
  };

  const getDeviceName = (type: string) => {
    switch (type) {
      case 'face':
        return 'Face Recognition';
      case 'voice':
        return 'Voice Recognition';
      case 'iris':
        return 'Iris Scan';
      default:
        return 'Fingerprint';
    }
  };

  const checkWebAuthnSupport = () => {
    if (!window.PublicKeyCredential) {
      setError('Biometric authentication is not supported on this device/browser');
      return false;
    }
    return true;
  };

  const handleBiometricRegister = async () => {
    if (!checkWebAuthnSupport()) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get registration options from server
      const response = await apiClient.post('/api/webauthn/register/options', {
        deviceName: `${getDeviceName(deviceType)} - ${new Date().toLocaleDateString()}`,
        deviceType,
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || 'Failed to get registration options');
      }

      // Step 2: Start WebAuthn registration with browser
      const attResp = await startRegistration(data.data.options);

      // Step 3: Verify registration with server
      const verifyResponse = await apiClient.post('/api/webauthn/register/verify', {
        credentialId: attResp.id,
        registrationResponse: attResp,
        deviceType
      });

      const verifyData = verifyResponse.data;

      if (verifyData.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error(verifyData.message || 'Verification failed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to register biometric authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuthenticate = async () => {
    if (!email) {
      setError('Email is required for biometric authentication');
      return;
    }

    if (!checkWebAuthnSupport()) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get authentication options from server
      const response = await apiClient.post('/api/webauthn/authenticate/options', {
        email,
        deviceType,
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || 'Failed to get authentication options');
      }

      // Step 2: Start WebAuthn authentication with browser
      const asseResp = await startAuthentication(data.data.options);

      // Step 3: Verify authentication with server
      const verifyResponse = await apiClient.post('/api/webauthn/authenticate/verify', {
        email,
        credentialId: asseResp.id,
        response: asseResp,
        challengeId: data.data.challengeId,
      });

      const verifyData = verifyResponse.data;

      if (!verifyData.success) {
        throw new Error(verifyData.message || 'Authentication verification failed');
      }

      setSuccess(true);
      toast.success('Biometric authentication successful!');

      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      console.error('Biometric authentication error:', err);

      if (err.name === 'NotAllowedError') {
        setError('Biometric authentication was cancelled or denied');
      } else if (err.name === 'NotSupportedError') {
        setError('Biometric authentication is not supported on this device');
      } else {
        setError(err.message || 'Failed to authenticate with biometrics');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAction = () => {
    if (action === 'register') {
      handleBiometricRegister();
    } else {
      handleBiometricAuthenticate();
    }
  };

  const fetchUserCredentials = async () => {
    try {
      const response = await apiClient.get('/api/webauthn/credentials');
      const data = response.data;

      if (data.success) {
        setCredentials(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
    }
  };

  useEffect(() => {
    if (action === 'register') {
      fetchUserCredentials();
    }
  }, [action]);

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {action === 'register' ? 'Registration Successful!' : 'Authentication Successful!'}
        </h3>
        <p className="text-gray-600">
          {action === 'register'
            ? 'Your biometric authentication has been set up successfully.'
            : 'You have been successfully authenticated.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
      <div className="h-20 w-20 bg-teal-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
        {getDeviceIcon(deviceType)}
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {action === 'register'
          ? `Register ${getDeviceName(deviceType)}`
          : `Authenticate with ${getDeviceName(deviceType)}`}
      </h3>

      <p className="text-gray-600 mb-8">
        {action === 'register'
          ? 'Place your finger on the sensor or look at the camera to register your biometric authentication.'
          : 'Place your finger on the sensor or look at the camera to authenticate.'}
      </p>

      {error && (
        <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {action === 'register' && credentials.length > 0 && (
        <div className="w-full bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-2">Existing credentials:</p>
          <div className="space-y-2">
            {credentials.map((cred) => (
              <div key={cred.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  {getDeviceIcon(cred.deviceType)}
                  <span className="ml-2 text-gray-700">{cred.deviceName}</span>
                </div>
                <span className="text-gray-500">
                  {new Date(cred.lastUsedAt || cred.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleBiometricAction}
        disabled={loading}
        className="w-full py-4 px-6 bg-[#0F5D5D] text-white font-bold rounded-xl hover:bg-[#0a4545] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-900/20 flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {getDeviceIcon(deviceType)}
            <span>
              {action === 'register'
                ? `Register ${getDeviceName(deviceType)}`
                : `Authenticate with ${getDeviceName(deviceType)}`}
            </span>
          </>
        )}
      </button>

      <button
        onClick={onCancel}
        disabled={loading}
        className="w-full mt-4 py-3 px-6 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Cancel
      </button>

      <p className="text-xs text-gray-500 mt-6">
        Biometric authentication uses your device's secure hardware. Your biometric data never leaves your device.
      </p>
    </div>
  );
}