import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/dashboard/Sidebar'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import MobileBottomNav from '@/components/dashboard/MobileBottomNav'

import { apiClient } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'
import BiometricSetupPrompt from '@/components/auth/BiometricSetupPrompt'
import SupportWidget from '@/components/dashboard/SupportWidget'
import { LoadingOverlayProvider } from '@/contexts/LoadingOverlayContext'
import LoadingOverlay from '@/components/ui/LoadingOverlay'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useUser()
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false)
  const [isMandatory, setIsMandatory] = useState(false)

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        // Biometric prompt should ONLY target regular employees
        // Owners, Admins, and Department Heads are excluded from the mandatory setup
        if (user?.role !== 'employee') return;

        // 1. Check company settings
        const settingsRes = await apiClient.get('/api/company-settings')
        if (!settingsRes.data.success) return

        const settings = settingsRes.data.data
        if (!settings.biometrics_required) return

        // 2. Check user credentials
        const credsRes = await apiClient.get('/api/webauthn/credentials')
        const creds = credsRes.data.data

        if (Array.isArray(creds) && creds.length === 0) {
          // Check if user has skipped this session
          const hasSkipped = sessionStorage.getItem('skip_biometric_setup')
          if (hasSkipped) return

          setIsMandatory(true)
          setShowBiometricPrompt(true)
        }
      } catch (error) {
        console.error('Failed to check biometrics:', error)
      }
    }

    // Only check if user is loaded
    if (user) {
      checkBiometrics()
    }
  }, [user])

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
        <LoadingOverlayProvider>
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <Outlet />
          </main>
          <LoadingOverlay />
        </LoadingOverlayProvider>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>

      <BiometricSetupPrompt
        isOpen={showBiometricPrompt}
        onClose={() => setShowBiometricPrompt(false)}
        onSuccess={() => setShowBiometricPrompt(false)}
        isMandatory={isMandatory}
      />

      <SupportWidget />
    </div>
  )
}
