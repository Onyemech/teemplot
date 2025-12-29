import { useUser } from '@/contexts/UserContext';
import OwnerDashboard from './dashboard/OwnerDashboard';
import EmployeeDashboard from './dashboard/EmployeeDashboard';
import AdminDashboard from './dashboard/AdminDashboard';

export default function DashboardPage() {
  const { user } = useUser();
  const isOwner = user?.role === 'owner' || user?.role === 'admin';
  const isMidLevelAdmin = user?.role === 'department_head';

  if (isOwner) {
    return <OwnerDashboard />;
  }
  if (isMidLevelAdmin) {
    return <AdminDashboard />;
  }
  return <EmployeeDashboard />;
}
