import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import ServiceWorkerErrorHandler from './components/pwa/ServiceWorkerErrorHandler'
import ReloadPrompt from './components/pwa/ReloadPrompt'
import IOSInstallPrompt from './components/pwa/IOSInstallPrompt'
import OnboardingGuard from './components/OnboardingGuard'
import DashboardGuard from './components/DashboardGuard'
import LandingGuard from './components/LandingGuard'
import ProtectedRoute from './components/ProtectedRoute'
import FeatureRoute from './components/FeatureRoute'
import { UserProvider } from './contexts/UserContext'
import { ToastProvider } from './contexts/ToastContext'
import PwaUpdate from './components/PwaUpdate'
import { NotificationProvider } from './contexts/NotificationContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import SuperAdminPage from './pages/SuperAdminPage'
import AcceptInvitationPage from './pages/AcceptInvitationPage'

import DashboardLayout from './layouts/DashboardLayout'

import EmployeesPage from './pages/dashboard/EmployeesPage'
import AttendanceOverviewPage from './pages/dashboard/AttendanceOverviewPage'
import AttendanceSettingsPage from './pages/dashboard/AttendanceSettingsPage'
import MultipleClockInPage from './pages/dashboard/MultipleClockInPage'
import { lazy, Suspense } from 'react'
const RemoteClockinPage = lazy(() => import('./pages/dashboard/RemoteClockinPage'))
import InboxPage from './pages/dashboard/InboxPage'
import SettingsPage from './pages/dashboard/SettingsPage'
const LeaveDashboardPage = lazy(() => import('./pages/leave/LeaveDashboardPage'))
const LeaveRequestsPage = lazy(() => import('./pages/leave/LeaveRequestsPage'))
const LeaveRequestDetailPage = lazy(() => import('./pages/leave/LeaveRequestDetailPage'))
const LeaveCalendarPage = lazy(() => import('./pages/leave/LeaveCalendarPage'))
const LeaveSettingsPage = lazy(() => import('./pages/leave/LeaveSettingsPage'))
const TaskAssignPage = lazy(() => import('./pages/tasks/TaskAssignPage'))
const TaskCompletePage = lazy(() => import('./pages/tasks/TaskCompletePage'))
const TaskVerifyPage = lazy(() => import('./pages/tasks/TaskVerifyPage'))
const TaskStatusPage = lazy(() => import('./pages/tasks/TaskStatusPage'))
const TaskAssignmentDashboardPage = lazy(() => import('./pages/tasks/TaskAssignmentDashboardPage'))
const TaskAssignmentDetailPage = lazy(() => import('./pages/tasks/TaskAssignmentDetailPage'))
const TaskWorkspacePage = lazy(() => import('./pages/tasks/TaskWorkspacePage'))
const TaskPolicySettingsPage = lazy(() => import('./pages/tasks/TaskPolicySettingsPage'))
import ProfilePage from './pages/dashboard/ProfilePage'
const AnalyticsDashboardPage = lazy(() => import('./pages/dashboard/AnalyticsDashboardPage'))
const EmployeePerformancePage = lazy(() => import('./pages/dashboard/EmployeePerformancePage'))
const AdminPerformancePage = lazy(() => import('./pages/dashboard/AdminPerformancePage'))
import DepartmentsPage from './pages/dashboard/DepartmentsPage'
import AuditLogsPage from './pages/dashboard/AuditLogsPage'
import WalletTransactionsPage from './pages/wallet/WalletTransactionsPage'
import PayrollPage from './pages/dashboard/PayrollPage'

import './utils/debugAuth'

import GoogleCallbackPage from './pages/auth/GoogleCallbackPage'

import PaymentCallbackPage from './pages/PaymentCallbackPage'
import ManagePlanPage from './pages/dashboard/ManagePlanPage'

import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import TooManyRequestsPage from './pages/error/TooManyRequestsPage'

import OnboardingRegisterPage from './pages/onboarding/RegisterPage'
import OnboardingVerifyPage from './pages/onboarding/VerifyPage'
import OnboardingCompanySetupPage from './pages/onboarding/CompanySetupPage'
import OnboardingCompletePage from './pages/onboarding/CompletePage'

import { useUser } from './contexts/UserContext'

function RoleBasedRedirect() {
  const { user } = useUser()
  
  if (user?.role === 'owner' || user?.role === 'admin') {
    return <AdminPerformancePage />
  }
  
  return <EmployeePerformancePage />
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider position="top-right">
        <UserProvider>
          <NotificationProvider>
            <PwaUpdate />
            <ServiceWorkerErrorHandler />
            <ReloadPrompt />
            <IOSInstallPrompt />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={
                <LandingGuard>
                  <LandingPage />
                </LandingGuard>
              } />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/too-many-requests" element={<TooManyRequestsPage />} />

              {/* Auth Callback Routes */}
              <Route path="/auth/callback" element={<GoogleCallbackPage />} />

              {/* Payment Callback Route */}
              <Route path="/payment/callback" element={<PaymentCallbackPage />} />

              {/* Onboarding Routes */}
              <Route path="/onboarding">
                <Route index element={<Navigate to="/onboarding/register" replace />} />
                <Route path="register" element={
                  <OnboardingGuard>
                    <OnboardingRegisterPage />
                  </OnboardingGuard>
                } />
                <Route path="verify" element={
                  <OnboardingGuard>
                    <OnboardingVerifyPage />
                  </OnboardingGuard>
                } />
                <Route path="company-setup" element={
                  <OnboardingGuard>
                    <OnboardingCompanySetupPage />
                  </OnboardingGuard>
                } />
                <Route path="complete" element={
                  <OnboardingGuard>
                    <OnboardingCompletePage />
                  </OnboardingGuard>
                } />
              </Route>

              {/* Protected Routes with Dashboard Layout */}
              <Route path="/dashboard" element={
                <DashboardGuard>
                  <DashboardLayout />
                </DashboardGuard>
              }>
                <Route index element={<DashboardPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="departments" element={<FeatureRoute feature="departments"><DepartmentsPage /></FeatureRoute>} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="attendance" element={<AttendanceOverviewPage />} />
                <Route path="attendance/invites" element={<EmployeesPage initialTab="invitations" />} />
                <Route path="attendance/setup" element={<AttendanceSettingsPage />} />
                <Route path="attendance/multiple-clockin" element={<MultipleClockInPage />} />
                <Route path="attendance/remote-clockin" element={<Suspense fallback={<div className='p-6'>Loading…</div>}><RemoteClockinPage /></Suspense>} />
                <Route path="attendance/payroll" element={<PayrollPage />} />
                <Route path="leave" element={<Suspense fallback={<div className='p-6'>Loading…</div>}><LeaveDashboardPage /></Suspense>} />
                <Route path="leave/requests" element={<Suspense fallback={<div className='p-6'>Loading…</div>}><LeaveRequestsPage /></Suspense>} />
                <Route path="leave/requests/:id" element={<Suspense fallback={<div className='p-6'>Loading…</div>}><LeaveRequestDetailPage /></Suspense>} />
                <Route path="leave/calendar" element={<Suspense fallback={<div className='p-6'>Loading…</div>}><LeaveCalendarPage /></Suspense>} />
                <Route path="leave/settings" element={<Suspense fallback={<div className='p-6'>Loading…</div>}><LeaveSettingsPage /></Suspense>} />
                <Route path="tasks/assign" element={<FeatureRoute feature="tasks"><Suspense fallback={<div className='p-6'>Loading…</div>}><TaskAssignPage /></Suspense></FeatureRoute>} />
                <Route path="tasks/complete" element={<FeatureRoute feature="tasks"><Suspense fallback={<div className='p-6'>Loading…</div>}><TaskCompletePage /></Suspense></FeatureRoute>} />
                <Route path="tasks/verify" element={<FeatureRoute feature="tasks"><Suspense fallback={<div className='p-6'>Loading…</div>}><TaskVerifyPage /></Suspense></FeatureRoute>} />
                <Route path="tasks/status" element={<FeatureRoute feature="tasks"><Suspense fallback={<div className='p-6'>Loading…</div>}><TaskStatusPage /></Suspense></FeatureRoute>} />
                <Route path="tasks/assignments" element={<FeatureRoute feature="tasks"><Suspense fallback={<div className='p-6'>Loading…</div>}><TaskAssignmentDashboardPage /></Suspense></FeatureRoute>} />
                <Route path="tasks/assignments/:id" element={<FeatureRoute feature="tasks"><Suspense fallback={<div className='p-6'>Loading…</div>}><TaskAssignmentDetailPage /></Suspense></FeatureRoute>} />
                <Route path="tasks/settings" element={<FeatureRoute feature="tasks"><Suspense fallback={<div className='p-6'>Loading…</div>}><TaskPolicySettingsPage /></Suspense></FeatureRoute>} />
                <Route path="tasks" element={<FeatureRoute feature="tasks"><Suspense fallback={<div className='p-6'>Loading…</div>}><TaskWorkspacePage /></Suspense></FeatureRoute>} />
                <Route path="analytics" element={<FeatureRoute feature="analytics"><Suspense fallback={<div className='p-6'>Loading…</div>}><AnalyticsDashboardPage /></Suspense></FeatureRoute>} />
                <Route path="performance" element={
                  <FeatureRoute feature="performance">
                    <ProtectedRoute>
                      <Suspense fallback={<div className='p-6'>Loading…</div>}><RoleBasedRedirect /></Suspense>
                    </ProtectedRoute>
                  </FeatureRoute>
                } />
                <Route path="inbox" element={<InboxPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="settings/billing" element={<ManagePlanPage />} />
                <Route path="wallet" element={<FeatureRoute feature="wallet"><WalletTransactionsPage /></FeatureRoute>} />
                <Route path="wallet/transactions" element={<FeatureRoute feature="wallet"><WalletTransactionsPage /></FeatureRoute>} />
                <Route path="audit-logs" element={<FeatureRoute feature="audit_logs"><AuditLogsPage /></FeatureRoute>} />
              </Route>

              <Route path="/superadmin" element={<SuperAdminPage />} />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </UserProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
export default App
