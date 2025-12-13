import { Routes, Route, Navigate } from 'react-router-dom'
import CompanyLocationSetup from './CompanyLocationSetup'
import EmployeeHoursSetup from './EmployeeHoursSetup'
import LatenessPolicySetup from './LatenessPolicySetup'
import AutomateAlertsSetup from './AutomateAlertsSetup'
import BiometricSetup from './BiometricSetup'

export default function SetupRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard/attendance/setup/company-location" replace />} />
      <Route path="/company-location" element={<CompanyLocationSetup />} />
      <Route path="/employee-hours" element={<EmployeeHoursSetup />} />
      <Route path="/lateness-policy" element={<LatenessPolicySetup />} />
      <Route path="/automate-alerts" element={<AutomateAlertsSetup />} />
      <Route path="/biometric" element={<BiometricSetup />} />
    </Routes>
  )
}