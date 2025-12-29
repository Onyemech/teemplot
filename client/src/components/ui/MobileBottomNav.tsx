import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Mail, Settings } from 'lucide-react'

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 h-[88px] px-6 flex items-start pt-4 justify-between z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex flex-col items-center gap-1.5 w-16 group"
      >
        <div className={`p-1.5 rounded-xl transition-colors ${isActive('/dashboard') ? 'bg-[#ecf1ef]' : 'bg-transparent'}`}>
          <Home className={`w-6 h-6 ${isActive('/dashboard') ? 'text-[#0F5D5D] fill-[#0F5D5D]' : 'text-[#A0AEC0]'}`} />
        </div>
        <span className={`text-[11px] font-medium tracking-tight ${isActive('/dashboard') ? 'text-[#0F5D5D]' : 'text-[#A0AEC0]'}`}>Home</span>
      </button>
      <button
        onClick={() => navigate('/dashboard/inbox')}
        className="flex flex-col items-center gap-1.5 w-16 group"
      >
        <div className={`p-1.5 rounded-xl transition-colors ${isActive('/dashboard/inbox') ? 'bg-[#ecf1ef]' : 'bg-transparent'}`}>
          <Mail className={`w-6 h-6 ${isActive('/dashboard/inbox') ? 'text-[#0F5D5D] fill-[#0F5D5D]' : 'text-[#A0AEC0]'}`} />
        </div>
        <span className={`text-[11px] font-medium tracking-tight ${isActive('/dashboard/inbox') ? 'text-[#0F5D5D]' : 'text-[#A0AEC0]'}`}>Inbox</span>
      </button>
      <button
        onClick={() => navigate('/dashboard/settings')}
        className="flex flex-col items-center gap-1.5 w-16 group"
      >
        <div className={`p-1.5 rounded-xl transition-colors ${isActive('/dashboard/settings') ? 'bg-[#ecf1ef]' : 'bg-transparent'}`}>
          <Settings className={`w-6 h-6 ${isActive('/dashboard/settings') ? 'text-[#0F5D5D] fill-[#0F5D5D]' : 'text-[#A0AEC0]'}`} />
        </div>
        <span className={`text-[11px] font-medium tracking-tight ${isActive('/dashboard/settings') ? 'text-[#0F5D5D]' : 'text-[#A0AEC0]'}`}>Settings</span>
      </button>
    </div>
  )
}

export default MobileBottomNav
