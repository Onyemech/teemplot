import { useUser } from '@/contexts/UserContext';
import EmployeeDashboard from './dashboard/EmployeeDashboard';
import AdminDashboard from './dashboard/AdminDashboard';

export default function DashboardPage() {
  const { user } = useUser()
  
  // Show different dashboard based on user role
  const isAdmin = user?.role === 'admin' || user?.role === 'owner'
  
  if (isAdmin) {
    return <AdminDashboard />
  } else {
    return <EmployeeDashboard />
  }
}