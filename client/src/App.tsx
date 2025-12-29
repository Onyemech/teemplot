import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import PWAUpdateNotification from './components/PWAUpdateNotification'
import OnboardingGuard from './components/OnboardingGuard'
import DashboardGuard from './components/DashboardGuard'
import LandingGuard from './components/LandingGuard'
import { UserProvider } from './contexts/UserContext'
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
import InboxPage from './pages/mobile/InboxPage'
import SettingsPage from './pages/dashboard/SettingsPage'

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

function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <PWAUpdateNotification />
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
        <Route path="owner-details" element={
          <OnboardingGuard>
            <OnboardingOwnerDetailsPage />
          </OnboardingGuard>
        } />
        <Route path="business-info" element={
          <OnboardingGuard>
            <OnboardingBusinessInfoPage />
          </OnboardingGuard>
        } />
        <Route path="logo-upload" element={
          <OnboardingGuard>
            <OnboardingLogoUploadPage />
          </OnboardingGuard>
        } />
        <Route path="documents" element={
          <OnboardingGuard>
            <OnboardingDocumentsPage />
          </OnboardingGuard>
        } />
        <Route path="subscription" element={
          <OnboardingGuard>
            <OnboardingSubscriptionPage />
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
        <Route path="inbox" element={<InboxPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      
      <Route path="/superadmin" element={<SuperAdminPage />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
      </UserProvider>
    </ErrorBoundary>
  )
}

export default App
