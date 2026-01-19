import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import ServiceWorkerErrorHandler from './components/pwa/ServiceWorkerErrorHandler'
import ReloadPrompt from './components/pwa/ReloadPrompt'
import OnboardingGuard from './components/OnboardingGuard'
import DashboardGuard from './components/DashboardGuard'
import LandingGuard from './components/LandingGuard'
import { UserProvider } from './contexts/UserContext'
import { ToastProvider } from './contexts/ToastContext'
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
import RemoteClockinPage from './pages/dashboard/RemoteClockinPage'
import InboxPage from './pages/mobile/InboxPage'
import SettingsPage from './pages/dashboard/SettingsPage'
import LeaveDashboardPage from './pages/leave/LeaveDashboardPage'
import LeaveRequestsPage from './pages/leave/LeaveRequestsPage'
import LeaveRequestDetailPage from './pages/leave/LeaveRequestDetailPage'
import LeaveCalendarPage from './pages/leave/LeaveCalendarPage'
import TaskAssignPage from './pages/tasks/TaskAssignPage'
import TaskCompletePage from './pages/tasks/TaskCompletePage'
import TaskVerifyPage from './pages/tasks/TaskVerifyPage'
import TaskStatusPage from './pages/tasks/TaskStatusPage'
import TaskAssignmentDashboardPage from './pages/tasks/TaskAssignmentDashboardPage'
import TaskAssignmentDetailPage from './pages/tasks/TaskAssignmentDetailPage'

import './utils/debugAuth'

import GoogleCallbackPage from './pages/auth/GoogleCallbackPage'

import PaymentCallbackPage from './pages/PaymentCallbackPage'

import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import TooManyRequestsPage from './pages/error/TooManyRequestsPage'

import OnboardingRegisterPage from './pages/onboarding/RegisterPage'
import OnboardingVerifyPage from './pages/onboarding/VerifyPage'
import OnboardingCompanySetupPage from './pages/onboarding/CompanySetupPage'
import OnboardingCompletePage from './pages/onboarding/CompletePage'

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider position="top-right">
        <UserProvider>
          <NotificationProvider>
            <ServiceWorkerErrorHandler />
            <ReloadPrompt />
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
                <Route path="attendance" element={<AttendanceOverviewPage />} />
                <Route path="attendance/invites" element={<EmployeesPage initialTab="invitations" />} />
                <Route path="attendance/setup" element={<AttendanceSettingsPage />} />
                <Route path="attendance/multiple-clockin" element={<MultipleClockInPage />} />
                <Route path="attendance/remote-clockin" element={<RemoteClockinPage />} />
                <Route path="leave" element={<LeaveDashboardPage />} />
                <Route path="leave/requests" element={<LeaveRequestsPage />} />
                <Route path="leave/requests/:id" element={<LeaveRequestDetailPage />} />
                <Route path="leave/calendar" element={<LeaveCalendarPage />} />
                <Route path="tasks" element={<Navigate to="/dashboard/tasks/status" replace />} />
                <Route path="tasks/assign" element={<TaskAssignPage />} />
                <Route path="tasks/complete" element={<TaskCompletePage />} />
                <Route path="tasks/verify" element={<TaskVerifyPage />} />
                <Route path="tasks/status" element={<TaskStatusPage />} />
                <Route path="tasks/assignments" element={<TaskAssignmentDashboardPage />} />
                <Route path="tasks/assignments/:id" element={<TaskAssignmentDetailPage />} />
                <Route path="inbox" element={<InboxPage />} />
                <Route path="settings" element={<SettingsPage />} />
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
