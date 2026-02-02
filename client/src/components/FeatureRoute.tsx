import { ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { useToast } from '@/contexts/ToastContext'
import { useUser } from '@/contexts/UserContext'
import { type Feature } from '@/utils/planFeatures'
import { Card } from '@/components/ui/Card'

export default function FeatureRoute({ feature, children }: { feature: Feature; children: ReactNode }) {
  const { hasAccess, loading, plan } = useFeatureAccess()
  const { user } = useUser()
  const toast = useToast()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'owner' || user?.role === 'admin'
  const allowed = hasAccess(feature)

  useEffect(() => {
    if (loading) return
    if (allowed) return
    toast.warning('This feature is unavailable on your current plan.')
    if (isAdmin) {
      navigate('/dashboard/settings/billing', { replace: true })
      return
    }
    navigate('/dashboard', { replace: true })
  }, [allowed, loading, toast, navigate, isAdmin, plan])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F5D5D]" />
      </div>
    )
  }

  if (allowed) return <>{children}</>

  return (
    <div className="min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-teal-50 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-xl">
        <Card className="p-6">
          <div className="text-sm font-semibold text-gray-900">Feature unavailable</div>
          <div className="mt-1 text-sm text-gray-600">
            This feature isn’t available on your current plan.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => navigate(isAdmin ? '/dashboard/settings/billing' : '/dashboard', { replace: true })}
              className="rounded-lg bg-[#0F5D5D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B4A4A] transition-colors"
            >
              {isAdmin ? 'View Plans' : 'Back to Dashboard'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
