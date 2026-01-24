import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '@/lib/api'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying')
  const [message, setMessage] = useState('Verifying your payment...')

  useEffect(() => {
    verifyPayment()
  }, [])

  const verifyPayment = async () => {
    try {
      const reference = searchParams.get('reference')
      
      if (!reference) {
        setStatus('failed')
        setMessage('Invalid payment reference')
        return
      }

      // Verify payment with backend
      const response = await apiClient.post('/api/subscription/verify-payment', {
        reference,
      })

      if (response.data.success) {
        setStatus('success')
        setMessage('Payment successful! Redirecting...')
        
        // Redirect based on payment purpose
        setTimeout(() => {
          const purpose = response.data.data.purpose
          
          if (purpose === 'subscription') {
            // Redirect to onboarding complete page
            navigate('/onboarding/complete')
          } else if (purpose === 'employee_limit_upgrade') {
            // Redirect to employee management
            navigate('/dashboard/employees')
          } else {
            // Default to dashboard
            navigate('/dashboard')
          }
        }, 2000)
      } else {
        setStatus('failed')
        setMessage(response.data.message || 'Payment verification failed')
      }
    } catch (error: any) {
      console.error('Payment verification error:', error)
      setStatus('failed')
      setMessage(error.response?.data?.message || 'Failed to verify payment')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/10 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="flex justify-center mb-6">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="flex justify-center mb-6">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Return to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
