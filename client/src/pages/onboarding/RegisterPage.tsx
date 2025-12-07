import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { apiClient } from '@/lib/api'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Mail, Lock, ArrowRight, Eye, EyeOff, Check } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { formatErrorForToast } from '@/utils/errorHandler'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  // Password validation
  const hasMinLength = formData.password.length >= 8
  const hasLetter = /[a-zA-Z]/.test(formData.password)
  const hasNumber = /[0-9]/.test(formData.password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
  const isPasswordValid = hasMinLength && hasLetter && hasNumber && hasSpecialChar

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError('')

    // Validate password strength
    if (!isPasswordValid) {
      setError('Please meet all password requirements')
      return
    }

    setLoading(true)

    try {
      // Call backend registration API
      const response = await apiClient.post('/api/auth/register', {
        email: formData.email,
        password: formData.password,
        firstName: 'User', // Temporary - will be collected later
        lastName: 'Account', // Temporary - will be collected later
        companyName: 'My Company', // Temporary - will be collected later
      })

      const data = response.data

      if (!data.success) {
        throw new Error(data.message || 'Registration failed')
      }

      // No need to store anything - backend will set httpOnly cookies after verification
      
      // Show success toast
      toast.success('Account created! Check your email for verification code.')

      // Navigate to verification page
      navigate(`/onboarding/verify?email=${encodeURIComponent(formData.email)}`)
    } catch (err: any) {
      console.error('Registration error:', err)
      const errorMessage = formatErrorForToast(err)
      setError(errorMessage)
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    await signInWithGoogle()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-2/5 bg-[#0F5D5D] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-[#FF5722] rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#FF5722] rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 p-12 flex flex-col justify-center text-white">
          <div className="mb-12">
            <img src="/logo.png" alt="Teemplot" className="h-32 w-auto" />
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-3">Welcome to Teemplot</h2>
              <p className="text-white/80 text-lg">
                Transform your workforce management with our comprehensive HRMS platform
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">✓</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Smart Attendance</h3>
                  <p className="text-white/70">GPS-enabled clock-in with geofencing</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">✓</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Task Management</h3>
                  <p className="text-white/70">Assign, track, and review tasks</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">✓</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Real-time Analytics</h3>
                  <p className="text-white/70">Performance metrics and insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo for mobile */}
          <div className="lg:hidden text-center mb-6">
            <img src="/logo.png" alt="Teemplot" className="h-20 w-auto mx-auto" />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
              {error}
            </div>
          )}

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleGoogleSignIn}
            loading={googleLoading}
            className="mb-6 border-gray-300 hover:bg-gray-50"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            }
            iconPosition="left"
          >
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-700 font-medium">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email Address"
              placeholder="your-mail@company.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon={<Mail className="w-5 h-5" />}
              fullWidth
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasMinLength ? 'bg-green-500' : 'bg-gray-300'}`}>
                      {hasMinLength && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={hasMinLength ? 'text-green-600' : 'text-gray-600'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasLetter ? 'bg-green-500' : 'bg-gray-300'}`}>
                      {hasLetter && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={hasLetter ? 'text-green-600' : 'text-gray-600'}>
                      Contains letters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasNumber ? 'bg-green-500' : 'bg-gray-300'}`}>
                      {hasNumber && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={hasNumber ? 'text-green-600' : 'text-gray-600'}>
                      Contains numbers
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasSpecialChar ? 'bg-green-500' : 'bg-gray-300'}`}>
                      {hasSpecialChar && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={hasSpecialChar ? 'text-green-600' : 'text-gray-600'}>
                      Contains special character (!@#$%^&*)
                    </span>
                  </div>

                  {/* Success message when password is valid and eye is CLOSED (not visible) */}
                  {isPasswordValid && !showPassword && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">
                        ✓ Strong password! Click the eye icon to view and remember it.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={!isPasswordValid || loading}
              icon={<ArrowRight className="w-5 h-5" />}
              iconPosition="right"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <p className="text-center text-sm text-gray-600">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="text-primary-600 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-primary-600 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
