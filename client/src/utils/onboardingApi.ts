import { requestDeduplicator } from './requestDeduplication';
import { apiClient } from '../lib/api';

// Helper to extract filename from various formats
export const getFileDisplayName = (file: any): string => {
  if (!file) return ''
  // File object
  if (file instanceof File) return file.name
  // Object with filename property
  if (typeof file === 'object' && file.filename) return file.filename
  if (typeof file === 'object' && file.name) return file.name
  // String (URL) - extract filename
  if (typeof file === 'string') {
    try {
      const url = new URL(file)
      const pathname = url.pathname
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1)
      return decodeURIComponent(filename) || 'Uploaded file'
    } catch {
      return file.includes('/') ? file.split('/').pop() || 'Uploaded file' : file
    }
  }
  return 'Uploaded file'
}

// All API calls now use apiClient which handles token refresh automatically!

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
      const response = await apiClient.post('/api/onboarding/company-setup', data);
      const result = response.data;

      if (!result.success) {
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
      const response = await apiClient.post('/api/onboarding/owner-details', data);
      const result = response.data;

      if (!result.success) {
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
      const response = await apiClient.post('/api/onboarding/business-info', data);
      const result = response.data;

      if (!result.success) {
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

  const response = await apiClient.post('/api/onboarding/upload-logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const result = response.data;

  if (!result.success) {
    throw new Error(result.message || 'Failed to upload logo')
  }

  return result
}

// Upload Document API with hash-based deduplication and parallel processing
export const uploadDocument = async (
  companyId: string,
  documentType: 'cac' | 'proof_of_address' | 'company_policy',
  file: File
) => {
  try {
    // Step 1: Compute file hash (optimized with parallel processing)
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Step 2: Check if file already exists
    const checkResponse = await apiClient.post('/api/files/check', {
      hash,
      filename: file.name,
      size: file.size,
      mimeType: file.type
    });
    
    const checkResult = checkResponse.data;
    
    if (!checkResult.success) {
      throw new Error(checkResult.message || 'Failed to check file existence')
    }
    
    let fileId: string
    let fileUrl: string
    
    // Step 3: Upload file if it doesn't exist
    if (!checkResult.data.exists) {
      console.log('📤 Uploading new file:', file.name, 'hash:', hash.substring(0, 8))
      const formData = new FormData()
      formData.append('document', file)
      formData.append('hash', hash)
      
      const uploadResponse = await apiClient.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const uploadResult = uploadResponse.data;
      
      if (!uploadResult.success) {
        console.error('❌ Upload failed:', uploadResult)
        throw new Error(uploadResult.message || 'Failed to upload file')
      }
      
      console.log('✅ File uploaded:', uploadResult.data.file.id)
      fileId = uploadResult.data.file.id
      fileUrl = uploadResult.data.file.secure_url || uploadResult.data.file.url
    } else {
      console.log('♻️ File already exists, reusing:', checkResult.data.file.id)
      fileId = checkResult.data.file.id
      fileUrl = checkResult.data.file.secure_url || checkResult.data.file.url
    }
    
    // Step 4: Attach file to company
    console.log('🔗 Attaching file to company:', fileId, documentType, 'companyId:', companyId)
    const attachResponse = await apiClient.post('/api/files/attach-to-company', {
      fileId,
      companyId,
      documentType,
      purpose: `Company ${documentType} document`,
      metadata: {
        originalFilename: file.name,
        uploadedAt: new Date().toISOString()
      }
    });
    
    const attachResult = attachResponse.data;
    
    if (!attachResult.success) {
      console.error('❌ Attach failed:', attachResult)
      throw new Error(attachResult.message || 'Failed to attach document to company')
    }
    
    console.log('✅ File attached to company successfully')
    
    // Return file details including the secure URL and filename
    return {
      success: true,
      data: {
        file: {
          id: fileId,
          secure_url: fileUrl,
          url: fileUrl,
          filename: file.name,
          size: file.size
        }
      }
    }
  } catch (error: any) {
    console.error('Upload document error:', error);
    const message = error.response?.data?.message || error.message || 'Failed to upload document';
    throw new Error(message);
  }
}

// Batch upload documents in parallel for faster processing
export const uploadDocumentsBatch = async (
  companyId: string,
  documents: Array<{
    type: 'cac' | 'proof_of_address' | 'company_policy'
    file: File
  }>
) => {
  console.log('📦 Starting batch upload of', documents.length, 'documents')
  
  // Upload all documents in parallel
  const uploadPromises = documents.map(({ type, file }) => 
    uploadDocument(companyId, type, file)
      .then(result => ({ type, result, success: true as const, error: null }))
      .catch(error => ({ type, result: null, success: false as const, error }))
  )
  
  const results = await Promise.all(uploadPromises)
  
  // Check for failures
  const failures = results.filter(r => !r.success)
  if (failures.length > 0) {
    const errorMsg = failures.map(f => `${f.type}: ${f.error?.message || 'Unknown error'}`).join(', ')
    throw new Error(`Failed to upload some documents: ${errorMsg}`)
  }
  
  console.log('✅ All documents uploaded successfully')
  
  // Type guard to ensure we only map successful results
  return results
    .filter((r): r is typeof results[number] & { success: true } => r.success)
    .map(r => ({
      type: r.type,
      file: r.result!.data.file
    }))
}

// Select Plan API
export const submitPlanSelection = async (data: {
  companyId: string
  plan: 'silver_monthly' | 'silver_yearly' | 'gold_monthly' | 'gold_yearly' | 'free'
  companySize: number
}) => {
  const response = await apiClient.post('/api/onboarding/select-plan', data);
  const result = response.data;

  if (!result.success) {
    throw new Error(result.message || 'Failed to select plan')
  }

  return result
}

// Complete Onboarding API
export const completeOnboarding = async (data: {
  companyId: string
  userId: string
}) => {
  const response = await apiClient.post('/api/onboarding/complete', data);
  const result = response.data;

  if (!result.success) {
    throw new Error(result.message || 'Failed to complete onboarding')
  }

  return result
}
