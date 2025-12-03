import { authFetch } from './authInterceptor';
import { requestDeduplicator } from './requestDeduplication';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// All API calls now use httpOnly cookies - no manual token management needed!

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
      const response = await fetch(`${API_URL}/onboarding/company-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies automatically
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
      const response = await fetch(`${API_URL}/onboarding/owner-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
  address: string
  formattedAddress?: string
  streetNumber?: string
  streetName?: string
  city?: string
  stateProvince?: string
  country?: string
  postalCode?: string
  officeLatitude: number
  officeLongitude: number
  placeId?: string
  geocodingAccuracy?: string
}) => {
  return requestDeduplicator.deduplicate(
    `business-info-${data.companyId}`,
    async () => {
      const response = await authFetch(`${API_URL}/onboarding/business-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/onboarding/upload-logo`, {
    method: 'POST',
    credentials: 'include',
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
    },
    credentials: 'include',
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
      credentials: 'include',
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
    console.log('♻️ File already exists, reusing:', checkResult.data.file.id)
    fileId = checkResult.data.file.id
  }
  
  // Step 4: Attach file to company
  console.log('🔗 Attaching file to company:', fileId, documentType, 'companyId:', companyId)
  const attachResponse = await fetch(`${API_URL}/files/attach-to-company`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
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
  
  console.log('✅ File attached to company successfully')
  return attachResult
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
    credentials: 'include',
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
    credentials: 'include',
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to complete onboarding')
  }

  return result
}
