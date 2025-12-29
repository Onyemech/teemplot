import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/dashboard/Sidebar'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import MobileBottomNav from '@/components/dashboard/MobileBottomNav'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Hidden on mobile by default, handled by bottom nav "More" if we wanted to reuse it, 
          but we built a custom drawer. So Sidebar is now Desktop only effectively, 
          unless we want to keep the old behavior as fallback? 
          The user said "remove that hamburger menu there". 
          So we probably don't need the mobile sidebar overlay anymore.
          However, Sidebar component handles 'isOpen' for mobile overlay. 
          Let's keep it but just not trigger it from header.
      */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header - Visible on all devices now */}
        <div>
          <DashboardHeader />
        </div>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  )
}
