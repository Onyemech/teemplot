const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Get auth data from sessionStorage
export const getOnboardingAuth = () => {
  const authData = sessionStorage.getItem('onboarding_auth')
  if (!authData) {
    throw new Error('No authentication data found. Please register first.')
  }
  return JSON.parse(authData)
}

// Company Setup API
export const submitCompanySetup = async (data: {
  userId: string
  companyId: string
  firstName: string
  lastName: string
  phoneNumber: string
  dateOfBirth: string
  isOwner: boolean
}) => {
  const response = await fetch(`${API_URL}/onboarding/company-setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to save company setup')
  }

  return result
}

// Owner Details API
export const submitOwnerDetails = async (data: {
  companyId: string
  registrantUserId: string
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
  ownerPhone: string
  ownerDateOfBirth: string
}) => {
  const response = await fetch(`${API_URL}/onboarding/owner-details`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to save owner details')
  }

  return result
}

// Business Info API
export const submitBusinessInfo = async (data: {
  companyId: string
  companyName: string
  taxId: string
  industry?: string
  employeeCount: number
  website?: string
  address: string
  city: string
  stateProvince: string
  country: string
  postalCode: string
  officeLatitude?: number
  officeLongitude?: number
}) => {
  const response = await fetch(`${API_URL}/onboarding/business-info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to save business information')
  }

  return result
}

// Upload Logo API
export const uploadLogo = async (companyId: string, file: File) => {
  const formData = new FormData()
  formData.append('companyId', companyId)
  formData.append('logo', file)

  const response = await fetch(`${API_URL}/onboarding/upload-logo`, {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to upload logo')
  }

  return result
}

// Upload Document API
export const uploadDocument = async (
  companyId: string,
  documentType: 'cac' | 'proof_of_address' | 'company_policy',
  file: File
) => {
  const formData = new FormData()
  formData.append('companyId', companyId)
  formData.append('documentType', documentType)
  formData.append('document', file)

  const response = await fetch(`${API_URL}/onboarding/upload-document`, {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to upload document')
  }

  return result
}

// Select Plan API
export const submitPlanSelection = async (data: {
  companyId: string
  plan: 'silver_monthly' | 'silver_yearly' | 'gold_monthly' | 'gold_yearly' | 'free'
  companySize: number
}) => {
  const response = await fetch(`${API_URL}/onboarding/select-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to select plan')
  }

  return result
}

// Complete Onboarding API
export const completeOnboarding = async (data: {
  companyId: string
  userId: string
}) => {
  const response = await fetch(`${API_URL}/onboarding/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to complete onboarding')
  }

  return result
}
