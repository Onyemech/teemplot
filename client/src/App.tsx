import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import SuperAdminPage from './pages/SuperAdminPage'

// Onboarding Pages
import OnboardingRegisterPage from './pages/onboarding/RegisterPage'
import OnboardingVerifyPage from './pages/onboarding/VerifyPage'
import OnboardingCompanySetupPage from './pages/onboarding/CompanySetupPage'
import OnboardingOwnerDetailsPage from './pages/onboarding/OwnerDetailsPage'
import OnboardingBusinessInfoPage from './pages/onboarding/BusinessInfoPage'
import OnboardingDocumentsPage from './pages/onboarding/DocumentsPage'
import OnboardingSubscriptionPage from './pages/onboarding/SubscriptionPage'
import OnboardingCompletePage from './pages/onboarding/CompletePage'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Onboarding Routes */}
      <Route path="/onboarding">
        <Route index element={<Navigate to="/onboarding/register" replace />} />
        <Route path="register" element={<OnboardingRegisterPage />} />
        <Route path="verify" element={<OnboardingVerifyPage />} />
        <Route path="company-setup" element={<OnboardingCompanySetupPage />} />
        <Route path="owner-details" element={<OnboardingOwnerDetailsPage />} />
        <Route path="business-info" element={<OnboardingBusinessInfoPage />} />
        <Route path="documents" element={<OnboardingDocumentsPage />} />
        <Route path="subscription" element={<OnboardingSubscriptionPage />} />
        <Route path="complete" element={<OnboardingCompletePage />} />
      </Route>

      {/* Protected Routes */}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/superadmin" element={<SuperAdminPage />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
