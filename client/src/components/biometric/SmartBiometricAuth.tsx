import { useState, useEffect } from 'react'
import { Scan, Fingerprint, Lock, AlertCircle, Eye } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import AnimatedCheckmark from '@/components/ui/AnimatedCheckmark'

interface SmartBiometricAuthProps {
  /** Whether biometric authentication is enabled */
  enabled: boolean
  /** Callback when authentication is successful */
  onSuccess: (method: 'face' | 'fingerprint' | 'password') => void
  /** Callback when authentication fails */
  onError: (error: string) => void
  /** Whether to show the component in setup mode */
  setupMode?: boolean
}

type AuthMethod = 'face' | 'fingerprint' | 'password'
type AuthState = 'idle' | 'scanning' | 'success' | 'error' | 'fallback'

export default function SmartBiometricAuth({
  enabled,
  onSuccess,
  onError,
  setupMode = false
}: SmartBiometricAuthProps) {
  const toast = useToast()
  const [currentMethod, setCurrentMethod] = useState<AuthMethod>('face')
  const [authState, setAuthState] = useState<AuthState>('idle')
  const [password, setPassword] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [maxAttempts] = useState(3)

  // Check for biometric support
  const [biometricSupport, setBiometricSupport] = useState({
    face: false,
    fingerprint: false
  })

  useEffect(() => {
    checkBiometricSupport()
  }, [])

  const checkBiometricSupport = async () => {
    try {
      // Check if Web Authentication API is supported
      if ('credentials' in navigator && 'create' in navigator.credentials) {
        // Check for platform authenticator (Face ID/Touch ID/Windows Hello)
        await navigator.credentials.get({
          publicKey: {
            challenge: new Uint8Array(32),
            allowCredentials: [],
            userVerification: 'preferred'
          }
        }).catch(() => null)

        setBiometricSupport({
          face: true, // Assume face ID is available on supported devices
          fingerprint: true // Assume fingerprint is available on supported devices
        })
      }
    } catch (error) {
      console.log('Biometric support check failed:', error)
      setBiometricSupport({ face: false, fingerprint: false })
    }
  }

  const startAuthentication = async (method: AuthMethod) => {
    if (!enabled && !setupMode) {
      onError('Biometric authentication is not enabled')
      return
    }

    setCurrentMethod(method)
    setAuthState('scanning')

    try {
      if (method === 'face' || method === 'fingerprint') {
        await simulateBiometricAuth(method)
      } else {
        // Password authentication
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }
        await simulatePasswordAuth()
      }
    } catch (error: any) {
      handleAuthError(error.message)
    }
  }

  const simulateBiometricAuth = async (method: AuthMethod) => {
    // Simulate biometric authentication delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Simulate success/failure (80% success rate for demo)
    const success = Math.random() > 0.2

    if (success) {
      setAuthState('success')
      setTimeout(() => {
        onSuccess(method)
      }, 1000)
    } else {
      throw new Error(`${method === 'face' ? 'Face ID' : 'Fingerprint'} authentication failed`)
    }
  }

  const simulatePasswordAuth = async () => {
    // Simulate password verification delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Simple password validation (in real app, this would be server-side)
    if (password === 'password123' || password.length >= 6) {
      setAuthState('success')
      setTimeout(() => {
        onSuccess('password')
      }, 1000)
    } else {
      throw new Error('Invalid password')
    }
  }

  const handleAuthError = (error: string) => {
    setAuthState('error')
    setAttempts(prev => prev + 1)
    
    setTimeout(() => {
      if (attempts + 1 >= maxAttempts) {
        // Force fallback to password after max attempts
        if (currentMethod !== 'password') {
          setCurrentMethod('password')
          setAuthState('fallback')
          toast.warning('Too many failed attempts. Please use password authentication.')
        } else {
          onError('Maximum authentication attempts exceeded')
        }
      } else {
        setAuthState('idle')
        // Suggest fallback method
        if (currentMethod === 'face' && biometricSupport.fingerprint) {
          toast.info('Face ID failed. Try fingerprint authentication.')
          setCurrentMethod('fingerprint')
        } else if (currentMethod === 'fingerprint') {
          toast.info('Fingerprint failed. Use password authentication.')
          setCurrentMethod('password')
          setAuthState('fallback')
        }
      }
    }, 2000)

    onError(error)
  }

  const resetAuth = () => {
    setAuthState('idle')
    setCurrentMethod('face')
    setAttempts(0)
    setPassword('')
  }

  const renderAuthMethod = () => {
    switch (currentMethod) {
      case 'face':
        return (
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <div className={`w-full h-full rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                authState === 'scanning' ? 'border-blue-500 animate-pulse bg-blue-50' :
                authState === 'success' ? 'border-green-500 bg-green-50' :
                authState === 'error' ? 'border-red-500 bg-red-50' :
                'border-gray-300 bg-gray-50'
              }`}>
                {authState === 'success' ? (
                  <AnimatedCheckmark size="lg" variant="success" />
                ) : authState === 'error' ? (
                  <AlertCircle className="w-12 h-12 text-red-500" />
                ) : (
                  <Scan className={`w-12 h-12 ${
                    authState === 'scanning' ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                )}
              </div>
              {authState === 'scanning' && (
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-75"></div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Face ID Authentication</h3>
            <p className="text-gray-600 mb-6">
              {authState === 'scanning' ? 'Look at your camera...' :
               authState === 'success' ? 'Face ID successful!' :
               authState === 'error' ? 'Face ID failed. Try again.' :
               'Position your face in front of the camera'}
            </p>
            {authState === 'idle' && (
              <button
                onClick={() => startAuthentication('face')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                <Eye className="w-5 h-5" />
                Start Face ID
              </button>
            )}
          </div>
        )

      case 'fingerprint':
        return (
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <div className={`w-full h-full rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                authState === 'scanning' ? 'border-green-500 animate-pulse bg-green-50' :
                authState === 'success' ? 'border-green-500 bg-green-50' :
                authState === 'error' ? 'border-red-500 bg-red-50' :
                'border-gray-300 bg-gray-50'
              }`}>
                {authState === 'success' ? (
                  <AnimatedCheckmark size="lg" variant="success" />
                ) : authState === 'error' ? (
                  <AlertCircle className="w-12 h-12 text-red-500" />
                ) : (
                  <Fingerprint className={`w-12 h-12 ${
                    authState === 'scanning' ? 'text-green-500' : 'text-gray-400'
                  }`} />
                )}
              </div>
              {authState === 'scanning' && (
                <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping opacity-75"></div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Fingerprint Authentication</h3>
            <p className="text-gray-600 mb-6">
              {authState === 'scanning' ? 'Keep your finger on the sensor...' :
               authState === 'success' ? 'Fingerprint verified!' :
               authState === 'error' ? 'Fingerprint failed. Try again.' :
               'Place your finger on the sensor'}
            </p>
            {authState === 'idle' && (
              <button
                onClick={() => startAuthentication('fingerprint')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                <Fingerprint className="w-5 h-5" />
                Start Fingerprint
              </button>
            )}
          </div>
        )

      case 'password':
        return (
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6">
              <div className={`w-full h-full rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                authState === 'success' ? 'border-green-500 bg-green-50' :
                authState === 'error' ? 'border-red-500 bg-red-50' :
                'border-gray-300 bg-gray-50'
              }`}>
                {authState === 'success' ? (
                  <AnimatedCheckmark size="lg" variant="success" />
                ) : authState === 'error' ? (
                  <AlertCircle className="w-12 h-12 text-red-500" />
                ) : (
                  <Lock className="w-12 h-12 text-gray-400" />
                )}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Password Authentication</h3>
            <p className="text-gray-600 mb-6">
              {authState === 'fallback' ? 'Biometric authentication failed. Please enter your password.' :
               authState === 'success' ? 'Password verified!' :
               authState === 'error' ? 'Invalid password. Try again.' :
               'Enter your password to continue'}
            </p>
            <div className="max-w-sm mx-auto mb-6">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                onKeyPress={(e) => e.key === 'Enter' && startAuthentication('password')}
              />
            </div>
            <button
              onClick={() => startAuthentication('password')}
              disabled={!password || authState === 'scanning'}
              className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto"
            >
              {authState === 'scanning' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Authenticate
                </>
              )}
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
      {renderAuthMethod()}

      {/* Alternative Methods */}
      {authState === 'idle' && currentMethod !== 'password' && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">Having trouble?</p>
          <div className="flex justify-center gap-3">
            {currentMethod !== 'fingerprint' && biometricSupport.fingerprint && (
              <button
                onClick={() => setCurrentMethod('fingerprint')}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                Try Fingerprint
              </button>
            )}
            {currentMethod !== 'face' && biometricSupport.face && (
              <button
                onClick={() => setCurrentMethod('face')}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                Try Face ID
              </button>
            )}
            <button
              onClick={() => setCurrentMethod('password')}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Use Password
            </button>
          </div>
        </div>
      )}

      {/* Reset Button */}
      {(authState === 'error' || authState === 'success') && (
        <div className="mt-6 text-center">
          <button
            onClick={resetAuth}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}