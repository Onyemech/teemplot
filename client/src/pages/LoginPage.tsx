import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress'
import { useUser } from '@/contexts/UserContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function LoginPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth()
  const { resumeOnboarding } = useOnboardingProgress()
  const { refetch: refetchUser } = useUser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Prevent double submission
    if (loading) return
    
    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: formData.email,
        password: formData.password,
      })

      if (response.data.success) {
        const { user } = response.data.data
        
        // Backend sets httpOnly cookies automatically - NO localStorage storage
        toast.success('Login successful! Redirecting...')

        // Refetch user data to populate context
        await refetchUser()

        // Check if onboarding is completed
        if (!user.onboardingCompleted) {
          // Resume onboarding from where they left off
          const redirectPath = await resumeOnboarding(user.id)
          setTimeout(() => navigate(redirectPath), 500)
        } else {
          // Go to dashboard
          setTimeout(() => navigate('/dashboard'), 500)
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Login failed. Please try again.'

      if (err.response?.status === 429) {
        setError(err.response.data.message || 'Too many attempts. Please try again later.')
      } else if (err.response?.data?.requiresVerification) {
        toast.warning('Please verify your email first')
        setTimeout(() => navigate(`/onboarding/verify?email=${encodeURIComponent(formData.email)}`), 1000)
      } else {
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    await signInWithGoogle()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo at top of card */}
          <div className="text-center mb-6">
            <img src="/logo.png"
              alt="Teemplot"
              className="h-16 w-auto mx-auto mb-3"
            />
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome Back</h2>
            <p className="text-sm text-gray-600">Sign in to continue to your dashboard</p>
          </div>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Google Login */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            className="mb-6 border-gray-300 hover:bg-gray-50"
            onClick={handleGoogleLogin}
            loading={googleLoading}
            loadingText="Connecting..."
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
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-700 font-medium">Or continue with email</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input
              type="email"
              label="Email Address"
              placeholder="you@company.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-[#1a5f3f] focus:ring-[#1a5f3f]" />
                <span className="text-gray-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-[#1a5f3f] hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
              loadingText="Signing In..."
            >
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/onboarding/register" className="text-[#1a5f3f] font-medium hover:underline">
              Create Account
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By signing in, you agree to our{' '}
          <Link to="/terms" className="underline hover:text-gray-700">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline hover:text-gray-700">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
