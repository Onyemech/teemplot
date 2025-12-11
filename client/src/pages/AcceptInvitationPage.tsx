import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import Input from '@/components/ui/Input'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import { getErrorMessage } from '@/utils/errorHandler'
import BiometricEnrollment from '@/components/biometric/BiometricEnrollment'


interface InvitationData {
  email: string
  firstName: string
  lastName: string
  role: string
  position: string
  companyName: string
  companyLogo: string | null
  biometricEnabled: boolean
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
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [showBiometricEnrollment, setShowBiometricEnrollment] = useState(false)
  const [biometricData, setBiometricData] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
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

  // Validate password on change
  useEffect(() => {
    if (formData.password) {
      setPasswordValidation(validatePassword(formData.password))
    }
  }, [formData.password])

  useEffect(() => {
    const fetchInvitation = async () => {
      // Don't fetch if already accepted
      if (accepted) return
      
      if (!token) {
        setError('Invalid invitation link')
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
        setFormData(prev => ({
          ...prev,
          firstName: data.data.firstName || '',
          lastName: data.data.lastName || '',
        }))
      } catch (err: any) {
        const errorMsg = getErrorMessage(err)
        setError(errorMsg)
        // Only show toast if not already accepted
        if (!accepted) {
          toast.error(errorMsg)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]) // Only depend on token to prevent repeated calls

  const handleBiometricComplete = (data: any) => {
    setBiometricData(data)
    setShowBiometricEnrollment(false)
    toast.success('Biometric enrollment completed! Welcome to the team!')
    setTimeout(() => {
      navigate('/login')
    }, 1500)
  }

  const handleSkipBiometric = () => {
    setShowBiometricEnrollment(false)
    toast.success('Welcome to the team! Please log in with your new account.')
    setTimeout(() => {
      navigate('/login')
    }, 1500)
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

    setSubmitting(true)

    try {
      // Use longer timeout for invitation acceptance (includes password hashing)
      const { createApiClientWithTimeout, TIMEOUTS } = await import('@/lib/api')
      const slowApiClient = createApiClientWithTimeout(TIMEOUTS.slow)
      
      const response = await slowApiClient.post('/api/employee-invitations/accept', {
        token,
        password: formData.password,
        phoneNumber: '', // Optional
        dateOfBirth: '', // Optional
        biometricData: biometricData // Include biometric data if enrolled
      })

      const data = response.data

      if (!data.success) {
        throw new Error(data.message || 'Failed to accept invitation')
      }

      // Mark as accepted to prevent further API calls
      setAccepted(true)
      
      // Show biometric enrollment only if company has it enabled and not already done
      if (invitation?.biometricEnabled && !biometricData) {
        setShowBiometricEnrollment(true)
      } else {
        toast.success('Welcome to the team! Please log in with your new account.')
        setTimeout(() => {
          navigate('/login')
        }, 1500)
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err)
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
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
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
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm shadow-sm">
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

            <button 
              type="submit" 
              disabled={!passwordValidation.isValid || formData.password !== formData.confirmPassword || submitting}
              className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Accept Invitation & Create Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            By creating an account, you agree to Teemplot's{' '}
            <a href="/terms" className="underline hover:text-gray-700">Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>
          </p>
        </div>
      </div>

      {/* Biometric Enrollment Modal */}
      <BiometricEnrollment
        isOpen={showBiometricEnrollment}
        onClose={handleSkipBiometric}
        onComplete={handleBiometricComplete}
        onSkip={handleSkipBiometric}
        employeeName={`${formData.firstName} ${formData.lastName}`}
        isOptional={true}
      />
    </div>
  )
}
