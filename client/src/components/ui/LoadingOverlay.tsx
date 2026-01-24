import { useMemo } from 'react'
import { useUser } from '@/contexts/UserContext'
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext'

export default function LoadingOverlay() {
  const { user } = useUser()
  const { visible } = useLoadingOverlay()
  const logoSrc = useMemo(() => user?.companyLogo || '/logo.png', [user])
  const show = visible && (user?.role === 'employee')
  const handleError = (e: any) => {
    if (e?.target?.src !== '/logo.png') {
      e.target.src = '/logo.png'
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] transition-opacity duration-250 ${show ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/90 border border-gray-200 shadow-soft flex items-center justify-center overflow-hidden">
          <img src={logoSrc} alt="Teemplot" onError={handleError} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
          <div className="scan-line absolute left-0 right-0 h-full"></div>
        </div>
      </div>
    </div>
  )
}
