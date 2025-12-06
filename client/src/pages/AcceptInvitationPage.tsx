import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Check, Loader2, AlertCircle } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface InvitationData {
  email: string
  firstName: string
  lastName: string
  role: string
  position: string
  companyName: string
  companyLogo: string | null
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
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
      if (!token) {
        setError('Invalid invitation link')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/employee-invitations/invitation/${token}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load invitation')
        }

        setInvitation(data.data)
        setFormData(prev => ({
          ...prev,
          firstName: data.data.firstName || '',
          lastName: data.data.lastName || '',
        }))
      } catch (err: any) {
        setError(err.message || 'Failed to load invitation')
        toast.error(err.message || 'Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [token, toast])

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
      const response = await fetch(`${API_URL}/employee-invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password,
          phoneNumber: '', // Optional
          dateOfBirth: '', // Optional
        }),
      })

      const data = await response.json()

      if (!response.ok) {
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
            </div>

            <Input
              label="Email"
              type="email"
              value={invitation?.email || ''}
              disabled
              fullWidth
            />

            <div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="Create a strong password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  fullWidth
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
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

            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                label="Confirm Password"
                placeholder="Re-enter password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : undefined}
                fullWidth
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              fullWidth
              loading={submitting}
              loadingText="Creating Account..."
              disabled={!passwordValidation.isValid || formData.password !== formData.confirmPassword}
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
