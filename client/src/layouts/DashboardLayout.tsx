import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/dashboard/Sidebar'
import DashboardHeader from '@/components/dashboard/DashboardHeader'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content - Properly balanced with sidebar */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Header */}
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page Content - Proper spacing and balance */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
