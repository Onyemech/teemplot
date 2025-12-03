import { authFetch } from './authInterceptor';
import { requestDeduplicator } from './requestDeduplication';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Get auth data from sessionStorage or localStorage
export const getOnboardingAuth = () => {
  console.log('🔍 Getting onboarding auth...')
  
  // Try sessionStorage first (during onboarding)
  let authData = sessionStorage.getItem('onboarding_auth')
  if (authData) {
    const parsed = JSON.parse(authData)
    console.log('✅ Found auth in sessionStorage:', { userId: parsed.userId, companyId: parsed.companyId })
    return parsed
  }
  
  console.log('⚠️ No auth in sessionStorage, checking localStorage...')
  
  // Fallback to localStorage user data
  const userStr = localStorage.getItem('user')
  if (userStr) {
    const user = JSON.parse(userStr)
    const authData = {
      userId: user.id,
      companyId: user.companyId || user.company_id,
      email: user.email
    }
    console.log('✅ Found user in localStorage:', { userId: authData.userId, companyId: authData.companyId })
    
    if (!authData.companyId) {
      console.error('❌ User found but no companyId:', user)
      throw new Error('Company information not found. Please complete company setup first.')
    }
    
    return authData
  }
  
  console.error('❌ No auth data found anywhere')
  throw new Error('No authentication data found. Please register first.')
}

// Get auth token
const getAuthToken = () => {
  const authData = sessionStorage.getItem('onboarding_auth')
  if (authData) {
    const parsed = JSON.parse(authData)
    if (parsed.token) return parsed.token
  }
  // Use centralized auth utility - check localStorage directly to avoid circular import
  return localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('accessToken')
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
  return requestDeduplicator.deduplicate(
    `company-setup-${data.companyId}`,
    async () => {
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/onboarding/company-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save company setup')
      }

      return result
    }
  )
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
  return requestDeduplicator.deduplicate(
    `owner-details-${data.companyId}`,
    async () => {
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/onboarding/owner-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save owner details')
      }

      return result
    }
  )
}

// Business Info API with Geocoding
export const submitBusinessInfo = async (data: {
  companyId: string
  companyName: string
  taxId: string
  industry?: string
  employeeCount: number
  website?: string
  // Legacy address field
  address: string
  // Detailed geocoding data from Google Places
  formattedAddress?: string
  streetNumber?: string
  streetName?: string
  city?: string
  stateProvince?: string
  country?: string
  postalCode?: string
  // Required coordinates for geofencing
  officeLatitude: number
  officeLongitude: number
  // Google Places metadata
  placeId?: string
  geocodingAccuracy?: string
}) => {
  return requestDeduplicator.deduplicate(
    `business-info-${data.companyId}`,
    async () => {
      const token = getAuthToken()
      const response = await authFetch(`${API_URL}/onboarding/business-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save business information')
      }

      return result
    }
  )
}

// Upload Logo API
export const uploadLogo = async (_companyId: string, file: File) => {
  const token = getAuthToken()
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/onboarding/upload-logo`, {
    method: 'POST',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: formData,
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to upload logo')
  }

  return result
}

// Upload Document API with hash-based deduplication
export const uploadDocument = async (
  companyId: string,
  documentType: 'cac' | 'proof_of_address' | 'company_policy',
  file: File
) => {
  const token = getAuthToken()
  
  // Step 1: Compute file hash
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Step 2: Check if file already exists
  const checkResponse = await fetch(`${API_URL}/files/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: JSON.stringify({
      hash,
      filename: file.name,
      size: file.size,
      mimeType: file.type
    })
  })
  
  const checkResult = await checkResponse.json()
  
  if (!checkResponse.ok) {
    throw new Error(checkResult.message || 'Failed to check file existence')
  }
  
  let fileId: string
  
  // Step 3: Upload file if it doesn't exist
  if (!checkResult.data.exists) {
    console.log('📤 Uploading new file:', file.name, 'hash:', hash.substring(0, 8))
    const formData = new FormData()
    formData.append('document', file)
    formData.append('hash', hash)
    
    const uploadResponse = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData
    })
    
    const uploadResult = await uploadResponse.json()
    
    if (!uploadResponse.ok) {
      console.error('❌ Upload failed:', uploadResponse.status, uploadResult)
      throw new Error(uploadResult.message || `Failed to upload file (${uploadResponse.status})`)
    }
    
    console.log('✅ File uploaded:', uploadResult.data.file.id)
    fileId = uploadResult.data.file.id
  } else {
    // File already exists, use existing file ID
    console.log('♻️ File already exists, reusing:', checkResult.data.file.id)
    fileId = checkResult.data.file.id
  }
  
  // Step 4: Attach file to company
  console.log('🔗 Attaching file to company:', fileId, documentType, 'companyId:', companyId)
  const attachResponse = await fetch(`${API_URL}/files/attach-to-company`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: JSON.stringify({
      fileId,
      companyId,
      documentType,
      purpose: `Company ${documentType} document`,
      metadata: {
        originalFilename: file.name,
        uploadedAt: new Date().toISOString()
      }
    })
  })
  
  const attachResult = await attachResponse.json()
  
  if (!attachResponse.ok) {
    console.error('❌ Attach failed:', attachResponse.status, attachResult)
    throw new Error(attachResult.message || 'Failed to attach document to company')
  }
  
  // If server returned a corrected companyId, update our session
  if (attachResult.data?.companyId && attachResult.data.companyId !== companyId) {
    console.log('🔄 Server corrected companyId:', companyId, '→', attachResult.data.companyId)
    
    // Update sessionStorage
    const sessionAuth = sessionStorage.getItem('onboarding_auth')
    if (sessionAuth) {
      const auth = JSON.parse(sessionAuth)
      auth.companyId = attachResult.data.companyId
      sessionStorage.setItem('onboarding_auth', JSON.stringify(auth))
    }
    
    // Update localStorage
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      user.companyId = attachResult.data.companyId
      user.company_id = attachResult.data.companyId
      localStorage.setItem('user', JSON.stringify(user))
    }
  }
  
  console.log('✅ File attached to company successfully')
  return attachResult
}

// Select Plan API
export const submitPlanSelection = async (data: {
  companyId: string
  plan: 'silver_monthly' | 'silver_yearly' | 'gold_monthly' | 'gold_yearly' | 'free'
  companySize: number
}) => {
  const token = getAuthToken()
  const response = await fetch(`${API_URL}/onboarding/select-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
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
  const token = getAuthToken()
  const response = await fetch(`${API_URL}/onboarding/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to complete onboarding')
  }

  return result
}
