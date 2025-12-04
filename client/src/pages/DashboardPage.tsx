import { useEffect, useState } from 'react'
import OwnerDashboard from './dashboard/OwnerDashboard'
import EmployeeDashboard from './dashboard/EmployeeDashboard'

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get user role from localStorage
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserRole(user.role)
      } catch (error) {
        console.error('Failed to parse user data:', error)
      }
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Route to appropriate dashboard based on role
  if (userRole === 'admin' || userRole === 'owner') {
    return <OwnerDashboard />
  }

  // Default to employee dashboard
  return <EmployeeDashboard />
}
