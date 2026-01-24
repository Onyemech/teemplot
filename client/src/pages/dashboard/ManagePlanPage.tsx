import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { requestDeduplicator } from '@/utils/requestDeduplication'
import { useToast } from '@/contexts/ToastContext'
import Button from '@/components/ui/Button'
import { CreditCard, CalendarDays, Users, RefreshCw } from 'lucide-react'

interface SubscriptionStatus {
  plan: string
  status: string
  trialDaysLeft: number | null
  subscriptionPlan: string
  currentPeriodEnd?: string
}

export default function ManagePlanPage() {
  const toast = useToast()
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [payments, setPayments] = useState<any[]>([])
  const [additionalEmployees, setAdditionalEmployees] = useState<number>(1)
  const [selectedPlan, setSelectedPlan] = useState<string>('silver_monthly')
  const [seatCount, setSeatCount] = useState<number>(0)
  const [planPrices, setPlanPrices] = useState<Record<string, number> | null>(null)
  const [employeeLimit, setEmployeeLimit] = useState<number>(0)
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null)
  const [initiating, setInitiating] = useState<boolean>(false)
  const [companySeats, setCompanySeats] = useState<number>(0)

  useEffect(() => {
    fetchStatus()
    fetchPayments()
    fetchSeatCount()
    fetchPlanPrices()
    fetchCompanyInfo()
  }, [])

  const fetchPlanPrices = async () => {
    try {
      const res = await apiClient.get('/api/subscription/prices')
      if (res.data.success) {
        setPlanPrices(res.data.data)
      }
    } catch (e) {
      // ignore
    }
  }

  const fetchCompanyInfo = async () => {
    try {
      const res = await apiClient.get('/api/company/info')
      if (res.data.success) {
        const info = res.data.data
        setEmployeeLimit(Number(info.employee_limit || 0))
        setCurrentPeriodEnd(info.current_period_end || info.subscription_end_date || null)
        const seats = Number(info.current_employee_count || 0) + Number(info.pending_invitations_count || 0)
        setCompanySeats(seats)
      }
    } catch (e) {
      // ignore
    }
  }

  const fetchStatus = async () => {
    try {
      setIsLoading(true)
      const res = await apiClient.get('/api/company/subscription-status')
      if (res.data.success) {
        const d = res.data.data
        setStatus({
          plan: d.subscriptionPlan,
          status: d.subscriptionStatus,
          trialDaysLeft: null,
          subscriptionPlan: d.subscriptionPlan,
          currentPeriodEnd: d.currentPeriodEnd
        })
      }
    } catch (e) {
      toast.error('Failed to load subscription status')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPayments = async () => {
    try {
      const res = await apiClient.get('/api/subscription/payments')
      if (res.data.success) {
        setPayments(res.data.data || [])
      }
    } catch (e) {
      // ignore
    }
  }

  const fetchSeatCount = async () => {
    try {
      const res = await apiClient.get('/api/employees')
      if (res.data.success) {
        setSeatCount((res.data.data as any[]).length || 0)
      }
    } catch {
      setSeatCount(0)
    }
  }

  const initiatePlanPurchase = async () => {
    try {
      if (initiating) return
      setInitiating(true)
      const res = await requestDeduplicator.deduplicate(
        `initiate-subscription-${selectedPlan}`,
        () => apiClient.post('/api/subscription/initiate-subscription', {
          plan: selectedPlan
        })
      )
      if (res.data.success) {
        const url = res.data.data.authorizationUrl
        toast.success('Redirecting to payment...')
        window.location.href = url
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to initiate plan payment')
    } finally {
      setInitiating(false)
    }
  }

  const initiateEmployeeUpgrade = async () => {
    try {
      if (initiating) return
      setInitiating(true)
      const res = await requestDeduplicator.deduplicate(
        `upgrade-employee-limit-${additionalEmployees}`,
        () => apiClient.post('/api/subscription/upgrade-employee-limit', {
          additionalEmployees
        })
      )
      if (res.data.success) {
        const url = res.data.data.authorizationUrl
        toast.success('Redirecting to payment...')
        window.location.href = url
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to initiate limit upgrade')
    } finally {
      setInitiating(false)
    }
  }

  const expired = status?.status === 'expired'
  const trialExpired = status?.plan === 'trial' && (status?.trialDaysLeft !== null && status?.trialDaysLeft <= 0)
  const seats = companySeats > 0 ? companySeats : (seatCount > 0 ? seatCount : employeeLimit)
  const perSeat = planPrices ? planPrices[selectedPlan] || 0 : 0
  const totalNGN = perSeat * seats

  return (
    <div className="h-full bg-gray-50 p-3 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Plan</h1>
          <p className="text-sm text-gray-500">Upgrade or extend your plan and adjust employee limits</p>
        </div>
        <Button variant="outline" onClick={fetchStatus} icon={<RefreshCw className="w-4 h-4" />} disabled={isLoading}>Refresh</Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-gray-700">Current Plan</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{status?.subscriptionPlan || 'silver_monthly'}</p>
          <p className={`text-xs mt-1 ${expired || trialExpired ? 'text-red-600' : 'text-green-600'}`}>
            {expired ? 'Expired' : trialExpired ? 'Trial expired' : 'Active'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-gray-700">Current Period End</span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString() : '—'}
          </p>
          {status && status.trialDaysLeft !== null && (
            <p className="text-xs text-gray-500 mt-1">Trial days left: {status.trialDaysLeft}</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-gray-700">Employee Limit</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{employeeLimit}</p>
          <p className="text-xs text-gray-500 mt-1">Declared limit for your plan</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-gray-700">Billable Seats</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{seatCount}</p>
          <p className="text-xs text-gray-500 mt-1">Includes owner/admins and all employees</p>
        </div>
      </div>

      {/* Simple Plan Extension */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Extend/Upgrade Plan</h2>
        <p className="text-sm text-gray-600 mb-4">
          Choose a billing plan. After payment, your subscription period will be extended automatically.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['silver_monthly','silver_yearly','gold_monthly','gold_yearly'].map(p => (
            <button
              key={p}
              onClick={() => setSelectedPlan(p)}
              className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                selectedPlan === p ? 'border-primary bg-teal-50 text-primary' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {p.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
        <div className="mt-4 bg-gray-50 rounded-lg border border-gray-200 p-3">
          <p className="text-sm text-gray-700">
            {planPrices ? `Price per seat: ₦${perSeat.toLocaleString()} · Seats: ${seats} · Total: ₦${totalNGN.toLocaleString()}` : 'Loading prices…'}
          </p>
        </div>
        <div className="mt-4">
          <Button onClick={initiatePlanPurchase}>Continue to Payment</Button>
        </div>
      </div>

      {/* Employee Limit Upgrade */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Increase Employee Limit</h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={additionalEmployees}
            onChange={(e) => setAdditionalEmployees(Math.max(1, parseInt(e.target.value || '1')))}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <Button onClick={initiateEmployeeUpgrade}>Continue to Payment</Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Your plan’s per-employee rate will be applied. After payment, your limit is updated immediately.
        </p>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Payment History</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2">Reference</th>
                  <th className="py-2">Purpose</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.reference} className="border-b">
                    <td className="py-2">{p.reference}</td>
                    <td className="py-2">{p.purpose}</td>
                    <td className="py-2">{(p.amount/100).toLocaleString(undefined, { style: 'currency', currency: p.currency || 'NGN' })}</td>
                    <td className="py-2">{p.status}</td>
                    <td className="py-2">{new Date(p.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
