import { useState, useEffect, useRef, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogoLoader } from '@/components/LogoLoader'
import BackButton from '@/components/ui/BackButton'
import Button from '@/components/ui/Button'

function VerifyEmailContent() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')
  
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
    // Prefetch next page for instant navigation
    // prefetch not needed in React Router: '/onboarding/company-setup')
  }, [])

  const handleChange = (index: number, value: string) => {
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
      handleVerify(newCode.join(''))
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
      handleVerify(pastedData)
    } else {
      inputRefs.current[pastedData.length]?.focus()
    }
  }

  const handleVerify = async (verificationCode: string) => {
    setIsVerifying(true)
    setError('')

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      })

      const data = await response.json()

      if (data.success) {
        // Store token and user data
        const userData = {
          id: data.data.user.id,
          email: data.data.user.email,
          companyId: data.data.user.companyId,
          company_id: data.data.user.companyId,
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          role: data.data.user.role,
        }
        
        // Backend sets httpOnly cookies automatically - no client-side storage needed!
        
        // After email verification, proceed to company setup
        navigate('/onboarding/company-setup')
      } else {
        setError(data.message || 'Invalid verification code. Please try again.')
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    setIsResending(true)
    setError('')
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend code')
      }
      
      // Show success message
      alert('✅ Verification code sent! Check your email.')
      console.log('Verification code resent to:', email)
    } catch (err: any) {
      console.error('Failed to resend code:', err)
      setError(err.message || 'Failed to resend code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Dark teal branded section */}
      <div className="hidden lg:flex lg:w-2/5 bg-[#0F5D5D] relative overflow-hidden">
        {/* Decorative circles */}
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
              <h2 className="text-3xl font-bold mb-3 text-white">Get started quickly</h2>
              <p className="text-white/90 text-lg">
                Breeze through our seamless onboarding process and get your company started in minutes not days
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-white">For companies of all size</h3>
              <p className="text-white/90">
                Whether you're a startup, SME or a Large corporation - Our solutions got you covered
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-white">Stay in the loop</h3>
              <p className="text-white/90">
                Keep updated on your staff's and company's procedure to make running your company a whole lot easier
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form section */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <BackButton className="mb-6" />

          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Email</h1>
            <p className="text-gray-600 mb-8">
              Enter the code we just sent to <span className="font-medium">{email}</span>
            </p>

            <div className="flex gap-2 sm:gap-3 mb-6 justify-center" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  className="w-10 h-12 sm:w-14 sm:h-14 text-center text-lg sm:text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all touch-manipulation"
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

            <p className="text-sm text-gray-600 mb-6">
              Didn't receive the code?{' '}
              <button 
                onClick={handleResend} 
                disabled={isResending}
                className="text-primary font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? 'Sending...' : 'Resend'}
              </button>
            </p>

            <Button
              onClick={() => handleVerify(code.join(''))}
              disabled={code.some(d => !d) || isVerifying}
              loading={isVerifying}
              variant="primary"
              fullWidth
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LogoLoader />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
