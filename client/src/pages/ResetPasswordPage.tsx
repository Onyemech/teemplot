import { useState, useEffect, useRef, Suspense } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import BackButton from '@/components/ui/BackButton'
import { Lock, Check, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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

function ResetPasswordContent() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')
  const toast = useToast()
  
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
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
  const [step, setStep] = useState<'code' | 'password'>('code')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Validate password on change
  useEffect(() => {
    if (formData.password) {
      setPasswordValidation(validatePassword(formData.password))
    }
  }, [formData.password])

  useEffect(() => {
    if (step === 'code') {
      inputRefs.current[0]?.focus()
    }
  }, [step])

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0]
    }

    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerifyCode(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return

    const newCode = pastedData.split('').concat(Array(6 - pastedData.length).fill(''))
    setCode(newCode)

    if (pastedData.length === 6) {
      handleVerifyCode(pastedData)
    } else {
      inputRefs.current[pastedData.length]?.focus()
    }
  }

  const handleVerifyCode = async (verificationCode: string) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Code verified! Now set your new password.')
        setStep('password')
      } else {
        const errorMsg = data.message || 'Invalid verification code'
        setError(errorMsg)
        toast.error(errorMsg)
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (err: any) {
      const errorMsg = 'Verification failed. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg)
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setResendLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('New code sent! Check your email.')
        setError('')
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      } else {
        toast.error(data.message || 'Failed to resend code')
      }
    } catch (err: any) {
      toast.error('Failed to resend code. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      const errorMsg = 'Passwords do not match'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    // Validate password strength
    if (!passwordValidation.isValid) {
      const errorMsg = `Password must have: ${passwordValidation.errors.join(', ')}`
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          code: code.join(''), 
          password: formData.password 
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Password reset successfully!')
        setSuccess(true)
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else {
        const errorMsg = data.message || 'Failed to reset password'
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (err: any) {
      const errorMsg = 'Failed to reset password. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <Link to="/login" className="inline-block mb-6 w-full">
              <div className="text-center">
                <img src="/logo.png"
                  alt="Teemplot"
                  className="h-16 w-auto mx-auto"
                />
              </div>
            </Link>

            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Password Reset!</h1>
            <p className="text-sm text-gray-600 mb-6">
              Your password has been successfully reset. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'code') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <Link to="/forgot-password" className="inline-block mb-6 w-full">
              <div className="text-center">
                <img src="/logo.png"
                  alt="Teemplot"
                  className="h-16 w-auto mx-auto"
                />
              </div>
            </Link>
            
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Enter Verification Code</h1>
              <p className="text-sm text-gray-600">
                Enter the code we sent to <span className="font-medium">{email}</span>
              </p>
            </div>
            {error && (
              <p className="text-sm text-red-600 mb-4 text-center">{error}</p>
            )}

            <div className="flex gap-2 sm:gap-3 mb-6 justify-center" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  disabled={loading}
                  className="w-10 h-12 sm:w-14 sm:h-14 text-center text-lg sm:text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-[#1a5f3f] focus:ring-2 focus:ring-[#1a5f3f]/20 outline-none transition-all disabled:opacity-50 touch-manipulation"
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            <p className="text-sm text-gray-600 mb-6 text-center">
              Didn't receive the code?{' '}
              <button 
                onClick={handleResendCode} 
                disabled={resendLoading}
                className="text-[#1a5f3f] font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendLoading ? 'Sending...' : 'Resend'}
              </button>
            </p>

            <Button
              onClick={() => handleVerifyCode(code.join(''))}
              disabled={code.some(d => !d) || loading}
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
              loadingText="Verifying..."
            >
              Verify Code
            </Button>

            <div className="mt-6 flex justify-center">
              <Link to="/forgot-password">
                <BackButton variant="minimal" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Link to="/login" className="inline-block mb-6 w-full">
            <div className="text-center">
              <img src="/logo.png"
                alt="Teemplot"
                className="h-16 w-auto mx-auto"
              />
            </div>
          </Link>
          
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Create New Password</h1>
            <p className="text-sm text-gray-600">Enter your new password below</p>
          </div>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="New Password"
                  placeholder="Enter strong password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  icon={<Lock className="w-5 h-5" />}
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
                icon={<Lock className="w-5 h-5" />}
                error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : undefined}
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
              className="w-full" 
              loading={loading}
              loadingText="Resetting Password..."
              disabled={!passwordValidation.isValid || formData.password !== formData.confirmPassword}
            >
              Reset Password
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{' '}
            <Link to="/login" className="text-[#1a5f3f] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By resetting your password, you agree to our{' '}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#1a5f3f] border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
