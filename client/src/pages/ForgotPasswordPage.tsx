import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import BackButton from '@/components/ui/BackButton'
import { Mail } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Verification code sent! Check your email.')
        // Redirect to reset password page with email
        setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email)}`), 500)
      } else {
        const errorMsg = data.message || 'Failed to send verification code'
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (err: any) {
      const errorMsg = 'Failed to send verification code. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <Link to="/login" className="inline-block">
              <img src="/logo.png"
                alt="Teemplot"
                className="h-16 w-auto mx-auto mb-3"
              />
            </Link>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Forgot Password?</h2>
            <p className="text-sm text-gray-600">Enter your email to receive a verification code</p>
          </div>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              label="Email Address"
              placeholder="you@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-5 h-5" />}
            />

            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              className="w-full" 
              loading={loading}
              loadingText="Sending Code..."
            >
              Send Verification Code
            </Button>
          </form>

          <div className="mt-6 flex justify-center">
            <Link to="/login">
              <BackButton label="Back to Login" variant="minimal" />
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Remember your password?{' '}
          <Link to="/login" className="text-[#1a5f3f] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
