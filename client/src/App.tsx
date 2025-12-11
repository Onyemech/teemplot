import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import PWAUpdateNotification from './components/PWAUpdateNotification'
import { UserProvider } from './contexts/UserContext'
import { NotificationProvider } from './contexts/NotificationContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import SuperAdminPage from './pages/SuperAdminPage'
import AcceptInvitationPage from './pages/AcceptInvitationPage'

// Dashboard Layout
import DashboardLayout from './layouts/DashboardLayout'

// Dashboard Sub-pages
import EmployeesPage from './pages/dashboard/EmployeesPage'
import AttendanceOverviewPage from './pages/dashboard/AttendanceOverviewPage'
import AttendancePage from './pages/dashboard/AttendancePage'
import EmployeeDashboard from './pages/dashboard/EmployeeDashboard'
import SettingsPage from './pages/dashboard/SettingsPage'
import EmployeeHoursSetup from './pages/dashboard/attendance/EmployeeHoursSetup'
import AutomateAlertsSetup from './pages/dashboard/attendance/AutomateAlertsSetup'
import BiometricSetup from './pages/dashboard/attendance/BiometricSetup'
import MultipleClockInSetup from './pages/dashboard/attendance/MultipleClockInSetup'
import NotificationsPage from './pages/dashboard/NotificationsPage'

// Debug utilities (available in console as window.debugAuth())
import './utils/debugAuth'

// Auth Pages
import GoogleCallbackPage from './pages/auth/GoogleCallbackPage'

// Payment Pages
import PaymentCallbackPage from './pages/PaymentCallbackPage'

// Legal Pages
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'

// Onboarding Pages
import OnboardingRegisterPage from './pages/onboarding/RegisterPage'
import OnboardingVerifyPage from './pages/onboarding/VerifyPage'
import OnboardingCompanySetupPage from './pages/onboarding/CompanySetupPage'
import OnboardingOwnerDetailsPage from './pages/onboarding/OwnerDetailsPage'
import OnboardingBusinessInfoPage from './pages/onboarding/BusinessInfoPage'
import OnboardingLogoUploadPage from './pages/onboarding/LogoUploadPage'
import OnboardingDocumentsPage from './pages/onboarding/DocumentsPage'
import OnboardingSubscriptionPage from './pages/onboarding/SubscriptionPage'
import OnboardingCompletePage from './pages/onboarding/CompletionPage'

// Network Status Indicator
import NetworkStatusIndicator from './components/ui/NetworkStatusIndicator'

function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <NotificationProvider>
        <PWAUpdateNotification />
        <NetworkStatusIndicator />
        <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      
      {/* Auth Callback Routes */}
      <Route path="/auth/callback" element={<GoogleCallbackPage />} />
      
      {/* Payment Callback Route */}
      <Route path="/payment/callback" element={<PaymentCallbackPage />} />

      {/* Onboarding Routes */}
      <Route path="/onboarding">
        <Route index element={<Navigate to="/onboarding/register" replace />} />
        <Route path="register" element={<OnboardingRegisterPage />} />
        <Route path="verify" element={<OnboardingVerifyPage />} />
        <Route path="company-setup" element={<OnboardingCompanySetupPage />} />
        <Route path="owner-details" element={<OnboardingOwnerDetailsPage />} />
        <Route path="business-info" element={<OnboardingBusinessInfoPage />} />
        <Route path="logo-upload" element={<OnboardingLogoUploadPage />} />
        <Route path="documents" element={<OnboardingDocumentsPage />} />
        <Route path="subscription" element={<OnboardingSubscriptionPage />} />
        <Route path="complete" element={<OnboardingCompletePage />} />
      </Route>

      {/* Protected Routes with Dashboard Layout */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="attendance-overview" element={<AttendanceOverviewPage />} />
        <Route path="attendance/setup/employee-hours" element={<EmployeeHoursSetup />} />
        <Route path="attendance/setup/automate-alerts" element={<AutomateAlertsSetup />} />
        <Route path="attendance/setup/biometric" element={<BiometricSetup />} />
        <Route path="attendance/setup/multiple-clockin" element={<MultipleClockInSetup />} />
        <Route path="employee-dashboard" element={<EmployeeDashboard />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      
      <Route path="/superadmin" element={<SuperAdminPage />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
        </NotificationProvider>
      </UserProvider>
    </ErrorBoundary>
  )
}

export default App
