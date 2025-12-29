import { useEffect, useState } from 'react'
// import { useNavigate } from 'react-router-dom' // Unused
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import MobileBottomNav from '@/components/ui/MobileBottomNav'

interface NotificationItem {
  id: string
  title: string
  body: string
  type: string
  created_at: string
  is_read?: boolean
}

export default function InboxPage() {
  // const navigate = useNavigate() // Unused
  const toast = useToast()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await apiClient.get('/api/notifications?limit=50')
        if (res.data.success) {
          setItems(res.data.data || [])
        }
      } catch {
        toast.error('Failed to load inbox')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  return (
    <div className="min-h-screen bg-[#F6F8F8] pb-24">
      <div className="bg-white px-6 pt-12 pb-4 sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <h1 className="text-xl font-bold text-[#1F2937]">Inbox</h1>
      </div>
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F5D5D]"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
               <span className="text-2xl">📭</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">No updates yet</h3>
            <p className="text-xs text-gray-500 max-w-[200px]">Once your requests are reviewed, you’ll find all updates right here</p>
          </div>
        ) : (
          items.map(n => (
            <div key={n.id} className={`rounded-2xl border ${n.is_read ? 'border-gray-100 bg-white' : 'border-[#d2f9e5] bg-[#d2f9e5]/10'} p-4 shadow-sm transition-all active:scale-[0.99]`}>
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-bold text-gray-900">{n.title}</p>
                <span className="text-[10px] text-gray-400 font-medium">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{n.body}</p>
            </div>
          ))
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  )
}

