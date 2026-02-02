import { ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { useToast } from '@/contexts/ToastContext'
import { useUser } from '@/contexts/UserContext'
import { type Feature } from '@/utils/planFeatures'

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

  return null
}
