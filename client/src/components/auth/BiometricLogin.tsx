import { useState, useEffect } from 'react';
import { Fingerprint, Loader2, AlertCircle } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';

interface BiometricLoginProps {
  onSuccess: (user: any) => void;
  onCancel: () => void;
  email?: string;
}

export default function BiometricLogin({ onSuccess, onCancel, email }: BiometricLoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSupport, setCheckingSupport] = useState(true);
  const [isSupported, setIsSupported] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  // const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    checkBiometricSupport();
  }, [email]);

  const checkBiometricSupport = async () => {
    setCheckingSupport(true);
    setError(null);

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        setIsSupported(false);
        setError('Biometric authentication is not supported on this device/browser');
        return;
      }

      setIsSupported(true);

      // If email is provided, check if user has biometrics enabled
      if (email) {
        const response = await apiClient.get(`/webauthn/status/${email}`);
        if (response.data.success) {
          setHasBiometrics(response.data.data.hasBiometrics);
          if (!response.data.data.hasBiometrics) {
            setError('No biometric credentials found for this account');
          }
        } else {
          setError('Failed to check biometric status');
        }
      }
    } catch (err: any) {
      console.error('Biometric support check error:', err);
      setError('Failed to check biometric support');
    } finally {
      setCheckingSupport(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!email) {
      setError('Email is required for biometric authentication');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get authentication options from server
      const optionsResponse = await apiClient.post('/webauthn/authenticate/options', {
        email,
      });

      if (!optionsResponse.data.success) {
        throw new Error(optionsResponse.data.message || 'Failed to get authentication options');
      }

      // Import the browser WebAuthn library dynamically
      const { startAuthentication } = await import('@simplewebauthn/browser');

      // Step 2: Start WebAuthn authentication with browser
      const authenticationResponse = await startAuthentication(optionsResponse.data.data.options);

      // Step 3: Verify authentication with server
      const verifyResponse = await apiClient.post('/webauthn/authenticate/verify', {
        email,
        credentialId: authenticationResponse.id,
        response: authenticationResponse,
        challengeId: optionsResponse.data.data.challengeId,
      });

      if (!verifyResponse.data.success) {
        throw new Error(verifyResponse.data.message || 'Authentication verification failed');
      }

      toast.success('Biometric authentication successful!');
      
      // Success - pass user data to parent
      setTimeout(() => {
        onSuccess(verifyResponse.data.data.user);
      }, 1000);

    } catch (err: any) {
      console.error('Biometric login error:', err);
      
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

  const getDeviceInstructions = () => {
    if (!isSupported) return null;
    
    return (
      <div className="text-xs text-gray-500 text-center">
        <p>Place your finger on the sensor or look at the camera to authenticate.</p>
        <p className="mt-1">Make sure your device supports fingerprint or face recognition.</p>
      </div>
    );
  };

  if (checkingSupport) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        <div className="h-16 w-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
          <Loader2 className="h-8 w-8 text-[#0F5D5D] animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Checking Biometric Support</h3>
        <p className="text-gray-600">Please wait while we verify your device capabilities...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] max-w-md mx-auto">
      {!isSupported || !hasBiometrics ? (
        <>
          <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {isSupported ? 'No Biometric Credentials' : 'Biometric Not Supported'}
          </h3>
          <p className="text-gray-600 mb-6">
            {error || 'Biometric authentication is not available on this device or for this account.'}
          </p>
          <button
            onClick={onCancel}
            className="w-full py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Use Password Instead
          </button>
        </>
      ) : (
        <>
          <div className="h-20 w-20 bg-teal-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <Fingerprint className="h-10 w-10 text-[#0F5D5D]" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">Biometric Authentication</h3>
          
          <p className="text-gray-600 mb-8">
            Place your finger on the sensor or look at the camera to authenticate with biometrics.
          </p>

          {error && (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleBiometricLogin}
            disabled={loading}
            className="w-full py-4 px-6 bg-[#0F5D5D] text-white font-bold rounded-xl hover:bg-[#0a4545] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-900/20 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <Fingerprint className="h-5 w-5" />
                <span>Scan to Authenticate</span>
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full mt-4 py-3 px-4 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Use Password Instead
          </button>

          <div className="w-full mt-6">
            {getDeviceInstructions()}
          </div>

          <p className="text-xs text-gray-500 mt-6">
            Biometric authentication uses your device's secure hardware. Your biometric data never leaves your device.
          </p>
        </>
      )}
    </div>
  );
}