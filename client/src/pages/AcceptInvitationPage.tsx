import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Loader2, AlertCircle, Fingerprint } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import { isBiometricAvailable } from '@/utils/pwa'
import { isMobile, isPWA } from '@/utils/pwa'
import IOSInstallPrompt from '@/components/pwa/IOSInstallPrompt'


interface InvitationData {
  email: string
  firstName: string
  lastName: string
  role: string
  position: string
  companyId: string
  companyName: string
  companyLogo: string | null
  biometricsEnabled?: boolean
  biometricsMandatory?: boolean
}

// Password validation helper
const validatePassword = (password: string) => {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
  
  const errors = []
  if (!requirements.length) errors.push('at least 8 characters')
  if (!requirements.uppercase) errors.push('one uppercase letter')
  if (!requirements.lowercase) errors.push('one lowercase letter')
  if (!requirements.number) errors.push('one number')
  if (!requirements.special) errors.push('one special character')
  
  return {
    isValid: Object.values(requirements).every(Boolean),
    errors,
    requirements
  }
}

export default function AcceptInvitationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
  })
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    errors: [] as string[],
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    }
  })
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [biometricCaptured, setBiometricCaptured] = useState<null | {
    type: 'webauthn'
    credentialId: string
    attestationObject?: string
    clientDataJSON?: string
    signCount?: number
  }>(null)
  const [biometricError, setBiometricError] = useState('')
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  // Validate password on change
  useEffect(() => {
    if (formData.password) {
      setPasswordValidation(validatePassword(formData.password))
    }
  }, [formData.password])

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link')
        setLoading(false)
        return
      }

      // If we already have an error, don't retry unless token changed
      if (error) {
        setLoading(false)
        return
      }

      try {
        const response = await apiClient.get(`/api/employee-invitations/invitation/${token}`)
        const data = response.data

        if (!data.success) {
          throw new Error(data.message || 'Failed to load invitation')
        }

        setInvitation(data.data)
        try {
          const supported = await isBiometricAvailable()
          setBiometricSupported(supported)
        } catch {
          setBiometricSupported(false)
        }
        setFormData(prev => ({
          ...prev,
          firstName: data.data.firstName || '',
          lastName: data.data.lastName || '',
        }))
      } catch (err: any) {
        // Only set error state, do NOT show toast here to prevent loop if toast context triggers re-render
        // The UI will show the error message anyway
        const message = err.message || 'Failed to load invitation'
        setError(message)
        console.error('Invitation fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]) // Removed 'toast' and 'error' from deps to prevent loops

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!isPWA() && isMobile()) {
        setShowInstallBanner(true)
      }
    }
    const handleInstalled = () => {
      setShowInstallBanner(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall as any)
    window.addEventListener('appinstalled', handleInstalled as any)
    if (!isPWA() && isMobile()) {
      setShowInstallBanner(true)
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall as any)
      window.removeEventListener('appinstalled', handleInstalled as any)
    }
  }, [])

  const toBase64 = (buffer: ArrayBuffer | undefined) => {
    if (!buffer) return undefined
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  const captureBiometrics = async () => {
    setBiometricError('')
    try {
      if (!biometricSupported) {
        setBiometricError('Biometrics not supported on this device')
        return
      }

      const challenge = new Uint8Array(32)
      window.crypto.getRandomValues(challenge)

      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: 'Teemplot' },
        user: {
          id: new Uint8Array(16),
          name: (invitation?.email || 'user').toLowerCase(),
          displayName: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Employee'
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      }

      const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential
      const response = credential.response as AuthenticatorAttestationResponse

      setBiometricCaptured({
        type: 'webauthn',
        credentialId: toBase64(credential.rawId) || '',
        attestationObject: toBase64(response.attestationObject || undefined),
        clientDataJSON: toBase64(response.clientDataJSON || undefined),
      })
      toast.success('Biometrics captured')
    } catch (err: any) {
      console.error('Biometric capture error:', err)
      setBiometricError(err?.message || 'Failed to capture biometrics')
      toast.error(err?.message || 'Failed to capture biometrics')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      const errorMsg = 'Passwords do not match'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    if (!passwordValidation.isValid) {
      const errorMsg = `Password must have: ${passwordValidation.errors.join(', ')}`
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    if (invitation?.biometricsEnabled && invitation?.biometricsMandatory && !biometricCaptured) {
      const errorMsg = 'Biometrics are required. Please capture biometrics to continue.'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    setSubmitting(true)

    try {
      const response = await apiClient.post('/api/employee-invitations/accept', {
        token,
        password: formData.password,
        phoneNumber: '', // Optional
        dateOfBirth: formData.dateOfBirth || undefined,
        biometric: biometricCaptured || undefined,
      })

      const data = response.data

      if (!data.success) {
        throw new Error(data.message || 'Failed to accept invitation')
      }

      toast.success('Welcome to the team! Please log in with your new account.')

      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to accept invitation'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  // Error state (invalid/expired invitation)
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => navigate('/')}
              variant="primary"
              fullWidth
            >
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <IOSInstallPrompt />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {showInstallBanner && (
            <div className="mb-4 p-3 border border-gray-200 rounded-xl bg-gray-50">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Install Employee App</p>
                  <p className="text-xs text-gray-600">Get faster clock-ins and offline access</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    if (deferredPrompt) {
                      await deferredPrompt.prompt()
                      const choice = await deferredPrompt.userChoice
                      if (choice.outcome === 'accepted') {
                        setShowInstallBanner(false)
                      }
                      setDeferredPrompt(null)
                    } else {
                      window.location.href = '/'
                    }
                  }}
                >
                  Install
                </Button>
              </div>
            </div>
          )}
          {/* Company Logo */}
          <div className="text-center mb-6">
            {invitation?.companyLogo ? (
              <img 
                src={invitation.companyLogo} 
                alt={invitation.companyName}
                className="h-16 w-auto mx-auto mb-4"
              />
            ) : (
              <img 
                src="/logo.png" 
                alt="Teemplot"
                className="h-16 w-auto mx-auto mb-4"
              />
            )}
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Join {invitation?.companyName}
            </h1>
            <p className="text-sm text-gray-600">
              You've been invited as a <span className="font-medium">{invitation?.role}</span>
              {invitation?.position && ` - ${invitation.position}`}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
                fullWidth
              />

              <Input
                label="Last Name"
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Doe"
                fullWidth
              />

              <div className="col-span-2">
                <Input
                  label="Date of Birth"
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  fullWidth
                />
              </div>
            </div>

            <Input
              label="Email"
              type="email"
              value={invitation?.email || ''}
              disabled
              fullWidth
            />

            <div>
              <Input
                type="password"
                label="Password"
                placeholder="Create a strong password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                fullWidth
              />
              
              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-700">Password must contain:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.requirements.length ? 'text-green-600' : 'text-gray-500'}`}>
                      <Check className={`w-4 h-4 ${passwordValidation.requirements.length ? 'opacity-100' : 'opacity-30'}`} />
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.requirements.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                      <Check className={`w-4 h-4 ${passwordValidation.requirements.uppercase ? 'opacity-100' : 'opacity-30'}`} />
                      <span>Uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.requirements.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                      <Check className={`w-4 h-4 ${passwordValidation.requirements.lowercase ? 'opacity-100' : 'opacity-30'}`} />
                      <span>Lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.requirements.number ? 'text-green-600' : 'text-gray-500'}`}>
                      <Check className={`w-4 h-4 ${passwordValidation.requirements.number ? 'opacity-100' : 'opacity-30'}`} />
                      <span>Number</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.requirements.special ? 'text-green-600' : 'text-gray-500'}`}>
                      <Check className={`w-4 h-4 ${passwordValidation.requirements.special ? 'opacity-100' : 'opacity-30'}`} />
                      <span>Special character</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Input
              type="password"
              label="Confirm Password"
              placeholder="Re-enter password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : undefined}
              fullWidth
            />

            {invitation?.biometricsEnabled && (
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint className="w-5 h-5 text-[#0F5D5D]" />
                  <h3 className="text-sm font-semibold text-gray-900">Biometrics</h3>
                  {invitation?.biometricsMandatory && (
                    <span className="ml-2 text-xs text-red-600">Required</span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  Capture a device-backed biometric credential to secure your account on this device.
                </p>
                {biometricCaptured ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-700">Biometrics captured</span>
                    <button
                      type="button"
                      onClick={captureBiometrics}
                      className="text-xs text-[#0F5D5D] underline"
                    >
                      Re-capture
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={captureBiometrics}
                    disabled={!biometricSupported}
                  >
                    {biometricSupported ? 'Capture Biometrics' : 'Device Not Supported'}
                  </Button>
                )}
                {biometricError && (
                  <p className="mt-2 text-xs text-red-600">{biometricError}</p>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              fullWidth
              loading={submitting}
              loadingText="Creating Account..."
              disabled={
                !formData.firstName ||
                !formData.lastName ||
                !formData.dateOfBirth ||
                !passwordValidation.isValid || 
                formData.password !== formData.confirmPassword ||
                (invitation?.biometricsEnabled && invitation?.biometricsMandatory && !biometricCaptured)
              }
            >
              Accept Invitation & Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            By creating an account, you agree to Teemplot's{' '}
            <a href="/terms" className="underline hover:text-gray-700">Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
