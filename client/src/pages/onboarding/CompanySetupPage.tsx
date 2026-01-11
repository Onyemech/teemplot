import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Check, FileText, Image as ImageIcon, Trash2, Edit2 } from 'lucide-react'
import OnboardingNavbar from '@/components/onboarding/OnboardingNavbar'
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress'
import { useUser } from '@/contexts/UserContext'
import Dropdown from '@/components/ui/Dropdown'
import AddressAutocomplete from '@/components/ui/AddressAutocomplete'
import PaymentStep from '@/components/onboarding/PaymentStep'
import { useToast } from '@/contexts/ToastContext'
import {
  submitBusinessInfo,
  submitOwnerDetails,
  uploadLogo,
} from '@/utils/onboardingApi'

type Step = 'details' | 'owner' | 'documents' | 'review' | 'payment'

export default function CompanySetupPage() {
  const navigate = useNavigate()
  const { saveProgress, getProgress } = useOnboardingProgress()
  const { user: currentUser, loading: userLoading } = useUser()
  const toast = useToast()
  const [currentStep, setCurrentStep] = useState<Step>('details')
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const [error, setError] = useState('')
  
  // Helper to check if value is a File object
  const isFile = (value: any): value is File => {
    return value instanceof File
  }
  
  // Simplified helper to get filename from various formats
  const getFileName = (doc: any): string => {
    if (!doc) return ''
    if (isFile(doc)) return doc.name
    if (typeof doc === 'object' && (doc.filename || doc.name)) {
      return doc.filename || doc.name
    }
    if (typeof doc === 'string') {
      // Extract filename from URL
      const parts = doc.split('/')
      const filename = parts[parts.length - 1]
      return decodeURIComponent(filename) || 'Uploaded document'
    }
    return 'Uploaded document'
  }
  
  // Helper to get file URL
  const getFileUrl = (doc: any): string | null => {
    if (!doc) return null
    if (typeof doc === 'string') return doc
    if (typeof doc === 'object' && doc.url) return doc.url
    return null
  }
  
  // Helper to get file size
  const getFileSize = (doc: any): number => {
    if (!doc) return 0
    if (isFile(doc)) return doc.size
    if (typeof doc === 'object' && doc.size) return doc.size
    return 0
  }
  
  const [formData, setFormData] = useState({
    // Company details
    companyLogo: null as File | { name: string; size: number; uploaded: boolean; url?: string } | string | null,
    companyName: '',
    tin: '',
    industry: '',
    customIndustry: '',
    companySize: '',
    website: '',
    headOffice: '',
    address: '',
    
    // Geocoding data from Google Places (captured ONCE during onboarding)
    formattedAddress: '',
    streetNumber: '',
    streetName: '',
    city: '',
    stateProvince: '',
    country: 'Nigeria',
    postalCode: '',
    latitude: null as number | null,
    longitude: null as number | null,
    placeId: '',
    geocodingAccuracy: '',

    // Owner details
    isOwner: true,
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerDOB: '',

    // Documents (can be File object, metadata object from saved progress, or null)
    cacDocument: null as File | { name: string; size: number; uploaded: boolean } | string | null,
    proofOfAddress: null as File | { name: string; size: number; uploaded: boolean } | string | null,
    companyPolicies: null as File | { name: string; size: number; uploaded: boolean } | string | null,
  })

  const steps = [
    { id: 'details', label: 'Company details', completed: false },
    { id: 'owner', label: 'Company owner details', completed: false },
    { id: 'documents', label: 'Company documents', completed: false },
    { id: 'review', label: 'Review', completed: false },
    { id: 'payment', label: 'Payments', completed: false },
  ]

  // Load saved progress and handle URL token
  useEffect(() => {
    const loadProgress = async () => {
      // Wait for user to be loaded
      if (userLoading) {
        console.log('⏳ Waiting for user to load...')
        return
      }
      
      // FIRST: Check if token is in URL and save it (fallback for cross-domain cookie issues)
      const urlParams = new URLSearchParams(window.location.search)
      const urlToken = urlParams.get('token')
      if (urlToken) {
        // Save token to localStorage as fallback
        localStorage.setItem('auth_token', urlToken)
        // Also decode and save user data
        try {
          const payload = JSON.parse(atob(urlToken.split('.')[1]))
          const userData = {
            id: payload.userId,
            companyId: payload.companyId,
            email: payload.email,
            role: payload.role
          }
          localStorage.setItem('user', JSON.stringify(userData))
          sessionStorage.setItem('onboarding_auth', JSON.stringify(userData))
        } catch (e) {
          console.error('Failed to decode token:', e)
        }
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname)
      }
      
      // Get user ID from secure context
      let userId = currentUser?.id
      
      // Fallback: try to get from localStorage if UserContext is not ready yet
      if (!userId) {
        const fallbackUser = localStorage.getItem('user')
        if (fallbackUser) {
          try {
            const parsedUser = JSON.parse(fallbackUser)
            // CHECK: Validate if this user is actually the one currently authenticated
            // If the token is invalid/expired, using this ID might cause 404s
            userId = parsedUser.id
            console.log('📥 Using fallback user data from localStorage for progress fetch:', { userId })
          } catch (e) {
            console.error('Failed to parse fallback user data:', e)
          }
        }
      }
      
      console.log('👤 Current user from context:', currentUser)
      console.log('🆔 User ID for progress fetch:', userId)

      // Skip fetching if onboarding is already completed
      if (currentUser?.onboardingCompleted) {
        console.log('✅ User already completed onboarding, skipping progress fetch');
        setLoadingProgress(false);
        return;
      }

      if (userId) {
        // Show loading state
        setLoadingProgress(true)
        setProgressMessage('Fetching your saved progress...')
        
        // Wait a moment for authentication cookie to be available
        await new Promise(resolve => setTimeout(resolve, 200))
        
        const progress = await getProgress(userId)
        console.log('📊 Progress fetched:', progress)
        if (progress && progress.formData) {
          console.log('📥 Loading saved progress:', progress)
          
          // Process document fields - preserve object structure with filename and URL
          const processDoc = (doc: any) => {
            if (!doc) return null
            // If it's already a File object, keep it
            if (doc instanceof File) return doc
            // If it's an object with metadata (from backend), keep the whole object
            if (typeof doc === 'object' && (doc.filename || doc.name || doc.url)) {
              return doc
            }
            // If it's a string (URL), keep it as fallback
            if (typeof doc === 'string') return doc
            return null
          }
          
          const cleanedFormData = {
            ...progress.formData,
            // Process document fields - URLs will be displayed, Files will be uploaded
            cacDocument: processDoc(progress.formData.cacDocument),
            proofOfAddress: processDoc(progress.formData.proofOfAddress),
            companyPolicies: processDoc(progress.formData.companyPolicies),
            companyLogo: processDoc(progress.formData.companyLogo),
          }
          
          setFormData(prev => ({
            ...prev,
            ...cleanedFormData,
          }))

          // Determine starting step based on completed steps
          const completedSteps = progress.completedSteps || []
          
          // Logic to resume at the correct step (First incomplete step)
          if (completedSteps.includes(4)) {
             setCurrentStep('payment')
          } else if (completedSteps.includes(3)) {
             // Robust check: Ensure all documents are actually present before allowing review
             // This prevents users from skipping to review if they saved with partial uploads
             // Use type guards or simple truthy check for the objects/strings
             const hasCac = !!cleanedFormData.cacDocument;
             const hasAddress = !!cleanedFormData.proofOfAddress;
             const hasPolicies = !!cleanedFormData.companyPolicies;
             
             const hasAllDocs = hasCac && hasAddress && hasPolicies;
             
             if (hasAllDocs) {
                setCurrentStep('review')
             } else {
                console.log('⚠️ Documents step marked complete but docs missing. Resuming at Documents.')
                setCurrentStep('documents')
             }
          } else if (completedSteps.includes(2)) {
             setCurrentStep('documents')
          } else if (completedSteps.includes(1)) {
             setCurrentStep('owner')
          } else {
             setCurrentStep('details')
          }
          
          console.log('✅ Progress loaded and form populated. Resuming at:', currentStep)
          setProgressMessage('Data loaded successfully!')
          setTimeout(() => {
            setLoadingProgress(false)
            setProgressMessage('')
          }, 1500)
        } else {
          console.log('ℹ️ No saved progress found')
          setLoadingProgress(false)
          setProgressMessage('')
        }
      } else {
        setLoadingProgress(false)
      }
    }
    loadProgress()
  }, [currentUser, getProgress, userLoading])

  // Validation helper for each step
  const isStepValid = (step: Step): boolean => {
    switch (step) {
      case 'details':
        return !!(
          formData.companyName &&
          formData.tin &&
          formData.industry &&
          (formData.industry !== 'other' || formData.customIndustry) &&
          formData.companySize &&
          formData.address &&
          formData.latitude &&
          formData.longitude
        )
      case 'owner':
        return !!(
          formData.ownerFirstName &&
          formData.ownerLastName &&
          formData.ownerPhone &&
          formData.ownerDOB &&
          (formData.isOwner || formData.ownerEmail)
        )
      case 'documents':
        return !!(
          formData.cacDocument &&
          formData.proofOfAddress &&
          formData.companyPolicies
        )
      case 'review':
        return true // Review step is always valid if reached
      case 'payment':
        return true // Payment step handled separately
      default:
        return false
    }
  }

  const handleNext = async () => {
    console.log('🟢 handleNext called')
    setLoading(true)
    setError('')

    try {
      // Validate current step before proceeding
      if (!isStepValid(currentStep)) {
        const errorMessages: Record<Step, string> = {
          details: 'Please fill in all required company details',
          owner: 'Please fill in all required owner details',
          documents: 'Please upload all required documents',
          review: '',
          payment: ''
        }
        throw new Error(errorMessages[currentStep])
      }

      // Get user data from secure context (httpOnly cookies)
      let userId = currentUser?.id
      let companyId = currentUser?.companyId
      
      // Fallback: try to get from localStorage if UserContext is not ready yet
      if (!userId) {
        const fallbackUser = localStorage.getItem('user')
        if (fallbackUser) {
          try {
            const parsedUser = JSON.parse(fallbackUser)
            userId = parsedUser.id
            companyId = parsedUser.companyId
            console.log('📥 Using fallback user data from localStorage for next step:', { userId, companyId })
          } catch (e) {
            console.error('Failed to parse fallback user data:', e)
          }
        }
      }
      
      if (!userId) {
        console.error('Not authenticated during onboarding submission')
        toast.error('Please complete email verification before continuing')
        return
      }

      if (!companyId) {
        console.error('Company ID not found during onboarding submission')
        toast.error('Please complete company setup before continuing')
        return
      }

      // Submit data to backend based on current step
      if (currentStep === 'details') {
        
        // Submit business information with complete geocoding data
        await submitBusinessInfo({
          userId,
          companyId,
          companyName: formData.companyName,
          taxId: formData.tin,
          industry: formData.industry === 'other' ? formData.customIndustry : formData.industry,
          employeeCount: parseInt(formData.companySize) || 1,
          // Only send website if user actually entered something
          ...(formData.website && formData.website.trim() && formData.website.includes('.') 
            ? { website: `https://${formData.website.replace(/^https?:\/\//, '')}` } 
            : {}),
          // Legacy address field
          address: formData.formattedAddress || formData.address || 'Nigeria',
          // Detailed geocoding data from Google Places (with defaults)
          formattedAddress: formData.formattedAddress || undefined,
          streetNumber: formData.streetNumber || undefined,
          streetName: formData.streetName || undefined,
          city: formData.city || undefined,
          // Ensure minimum length requirements
          stateProvince: formData.stateProvince && formData.stateProvince.length >= 2 ? formData.stateProvince : undefined,
          country: formData.country || 'Nigeria',
          postalCode: formData.postalCode && formData.postalCode.length >= 3 ? formData.postalCode : undefined,
          // Coordinates for geofencing (optional)
          officeLatitude: formData.latitude || 0,
          officeLongitude: formData.longitude || 0,
          // Google Places metadata
          placeId: formData.placeId || undefined,
          geocodingAccuracy: formData.geocodingAccuracy || undefined,
        })
        
        // Upload logo if provided (only if it's a new File, not a URL string)
        if (formData.companyLogo && isFile(formData.companyLogo)) {
          console.log('📤 Uploading company logo...')
          const logoResult = await uploadLogo(companyId, userId, formData.companyLogo)
          // Update formData with the uploaded URL so it can be saved to progress
          setFormData(prev => ({ ...prev, companyLogo: logoResult.data.logoUrl }))
          console.log('✅ Logo uploaded:', logoResult.data.logoUrl)
          
          // CRITICAL FIX: Save progress immediately with the NEW logo URL and correct companyId
          // This ensures if the user leaves/refreshes, the logo is persisted
          await saveProgress({
            userId,
            companyId: companyId, 
            currentStep: 2, // Completed step 1 (details)
            completedSteps: [1],
            formData: {
              ...formData,
              companyLogo: logoResult.data.logoUrl // Ensure we save the string URL, not the File object
            }
          })
        }
      } else if (currentStep === 'owner') {
        // Submit owner details if not the owner
        if (!formData.isOwner) {
          await submitOwnerDetails({
            companyId,
            registrantUserId: userId,
            ownerFirstName: formData.ownerFirstName,
            ownerLastName: formData.ownerLastName,
            ownerEmail: formData.ownerEmail,
            ownerPhone: formData.ownerPhone,
            ownerDateOfBirth: formData.ownerDOB,
          })
        }
      } else if (currentStep === 'documents') {
        console.log('📄 Uploading documents for company:', companyId)
        
        // Collect documents that need uploading (only new Files, not URL strings)
        const documentsToUpload: Array<{
          type: 'cac' | 'proof_of_address' | 'company_policy'
          file: File
        }> = []
        
        if (formData.cacDocument && isFile(formData.cacDocument)) {
          documentsToUpload.push({ type: 'cac', file: formData.cacDocument })
        }
        if (formData.proofOfAddress && isFile(formData.proofOfAddress)) {
          documentsToUpload.push({ type: 'proof_of_address', file: formData.proofOfAddress })
        }
        if (formData.companyPolicies && isFile(formData.companyPolicies)) {
          documentsToUpload.push({ type: 'company_policy', file: formData.companyPolicies })
        }
        
        // Upload all documents in parallel for faster processing
        if (documentsToUpload.length > 0) {
          const { uploadDocumentsBatch } = await import('@/utils/onboardingApi')
          const results = await uploadDocumentsBatch(companyId, documentsToUpload)
          
          // Update formData with uploaded file metadata
          const updates: any = {}
          results.forEach(({ type, file }) => {
            if (type === 'cac') {
              updates.cacDocument = {
                filename: file.filename,
                size: file.size,
                url: file.secure_url,
                uploaded: true
              }
            } else if (type === 'proof_of_address') {
              updates.proofOfAddress = {
                filename: file.filename,
                size: file.size,
                url: file.secure_url,
                uploaded: true
              }
            } else if (type === 'company_policy') {
              updates.companyPolicies = {
                filename: file.filename,
                size: file.size,
                url: file.secure_url,
                uploaded: true
              }
            }
          })
          setFormData(prev => ({ ...prev, ...updates }))
          toast.success(`${results.length} document(s) uploaded successfully!`)
          console.log('✅ All documents uploaded in parallel:', results)
        } else {
          toast.success('Documents already uploaded!')
        }
      }

      // Move to next step
      const stepOrder: Step[] = ['details', 'owner', 'documents', 'review', 'payment']
      const currentIndex = stepOrder.indexOf(currentStep)
      if (currentIndex < stepOrder.length - 1) {
        setCurrentStep(stepOrder[currentIndex + 1])
      }
    } catch (error: any) {
      console.error('Failed to proceed:', error)
      const errorMsg = error.message || 'Failed to save. Please try again.'
      setError(errorMsg)
      
      // Map error types to actionable messages
      if (errorMsg.includes('validation') || errorMsg.includes('required')) {
        toast.error('Please check all required fields and try again.')
      } else if (errorMsg.includes('duplicate') || errorMsg.includes('already registered')) {
        toast.warning('This information is already in use. Please verify your details.')
      } else if (errorMsg.includes('network') || errorMsg.includes('connect')) {
        toast.error('Connection error. Please check your internet connection.')
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'details':
        return (
          <div className="space-y-4 md:space-y-6">
            {error && (
              <div className="p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs md:text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center p-2 border border-border">
                 {formData.companyLogo ? (
                    isFile(formData.companyLogo) ? (
                      <img 
                        src={URL.createObjectURL(formData.companyLogo)} 
                        alt="Logo" 
                        className="w-full h-full object-contain rounded-lg" 
                      />
                    ) : typeof formData.companyLogo === 'string' ? (
                      <img 
                        src={formData.companyLogo} 
                        alt="Logo" 
                        className="w-full h-full object-contain rounded-lg" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <ImageIcon className="w-6 h-6 text-green-600 mb-1" />
                        <span className="text-xs text-gray-600">
                          {(formData.companyLogo as any)?.name || 'Uploaded'}
                        </span>
                      </div>
                    )
                  ) : (
                    <img src="/logo.png" alt="Default Logo" className="w-full h-full object-contain opacity-50" />
                  )}
                </div>
                <div className="flex gap-2">
                  <label className="px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors bg-white">
                    <span className="text-sm font-medium">Change logo</span>
                    <input type="file" className="hidden" accept="image/png,image/jpeg,image/jpg" onChange={(e) => setFormData({ ...formData, companyLogo: e.target.files?.[0] || null })} />
                  </label>
                  {formData.companyLogo && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, companyLogo: null })}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">PNG, JPG files up to 2MB. Recommended size of 256 x 256px</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Company name</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Teemplot"
              />
              <p className="text-xs text-muted-foreground mt-1">This is your company legal business name. Your company name will be used when generating payslips</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tax identification number (TIN)</label>
              <input
                type="text"
                required
                value={formData.tin}
                onChange={(e) => {
                  const value = e.target.value
                  // Allow empty string (for backspace/delete)
                  if (value === '') {
                    setFormData({ ...formData, tin: '' })
                    return
                  }
                  // Only allow numbers and hyphens (for formatting like 123-456-789)
                  if (/^[0-9-]+$/.test(value)) {
                    setFormData({ ...formData, tin: value })
                  } else {
                    toast.error('Tax ID can only contain numbers and hyphens')
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent letters and special characters except hyphen
                  if (!/[0-9-]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault()
                  }
                }}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                placeholder="123-456-789-000"
              />
              <p className="text-xs text-muted-foreground mt-1">This is required for tax monitoring purposes. Numbers only.</p>
            </div>

            <Dropdown
              label="Industry"
              required
              value={formData.industry}
              onChange={(value) => {
                setFormData({ ...formData, industry: value, customIndustry: value === 'other' ? formData.customIndustry : '' })
              }}
              placeholder="Select industry"
              options={[
                { value: 'software', label: 'Software' },
                { value: 'technology', label: 'Technology' },
                { value: 'finance', label: 'Finance' },
                { value: 'healthcare', label: 'Healthcare' },
                { value: 'education', label: 'Education' },
                { value: 'retail', label: 'Retail' },
                { value: 'manufacturing', label: 'Manufacturing' },
                { value: 'other', label: 'Other' },
              ]}
              fullWidth
            />

            {formData.industry === 'other' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Please specify your industry</label>
                <input
                  type="text"
                  required
                  value={formData.customIndustry}
                  onChange={(e) => setFormData({ ...formData, customIndustry: e.target.value })}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Logistics, Consulting, etc."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Company size (Number of employees)</label>
              <input
                type="text"
                required
                value={formData.companySize}
                onChange={(e) => {
                  const value = e.target.value
                  // Allow empty string (for backspace/delete)
                  if (value === '') {
                    setFormData({ ...formData, companySize: '' })
                    return
                  }
                  // Only allow positive numbers (no letters, no negative, no decimals)
                  if (/^\d+$/.test(value) && parseInt(value) > 0) {
                    setFormData({ ...formData, companySize: value })
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent minus, plus, decimal point, and 'e'
                  if (['-', '+', '.', 'e', 'E'].includes(e.key)) {
                    e.preventDefault()
                  }
                }}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                placeholder="e.g., 25"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter the total number of employees at your company. This helps us determine the best subscription plan for you.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Company website (optional)</label>
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <span className="px-3 text-muted-foreground text-sm">http://</span>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="flex-1 px-4 py-3 focus:outline-none"
                  placeholder="www.teemplot.com"
                />
                {formData.website && <Check className="w-5 h-5 text-green-600 mr-3" />}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Business Address</label>
              <p className="text-xs text-muted-foreground mb-2">
                📍 Enter your company's head office address. We'll capture the exact coordinates for accurate attendance tracking.
              </p>
              
              <AddressAutocomplete
                value={formData.address}
                cityValue={formData.city}
                onCityChange={(city) => {
                  setFormData({ ...formData, city })
                }}
                onChange={(value, addressData) => {
                  if (addressData) {
                    // Store ALL geocoding data from Google Places
                    setFormData({
                      ...formData,
                      address: value,
                      formattedAddress: addressData.formattedAddress,
                      streetNumber: addressData.streetNumber,
                      streetName: addressData.streetName,
                      city: addressData.city,
                      stateProvince: addressData.state,
                      country: addressData.country,
                      postalCode: addressData.postalCode,
                      latitude: addressData.latitude,
                      longitude: addressData.longitude,
                      placeId: addressData.placeId,
                      geocodingAccuracy: addressData.accuracy || '',
                    })
                  } else {
                    // Clear coordinates if user types manually (not from dropdown)
                    setFormData({ 
                      ...formData, 
                      address: value,
                      latitude: null,
                      longitude: null,
                      placeId: '',
                      formattedAddress: '',
                    })
                  }
                }}
                placeholder="Start typing your business address..."
                required
              />
              
              {formData.latitude && formData.longitude && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-700 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Location captured: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button" onClick={handleNext}
              disabled={loading || loadingProgress || !isStepValid('details')}
              className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : loadingProgress ? 'Loading...' : 'Continue'}
            </button>
          </div>
        )

      case 'owner':
        return (
          <div className="space-y-4 md:space-y-6">
            <div className="p-3 md:p-4 bg-secondary/50 rounded-lg border border-border">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.isOwner}
                  onChange={(e) => setFormData({ ...formData, isOwner: e.target.checked })}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-foreground">I am the company owner</p>
                  <p className="text-sm text-muted-foreground">Only select this, if you would like to use your information as the company owner information</p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Legal first name</label>
                <input
                  type="text"
                  required
                  value={formData.ownerFirstName}
                  onChange={(e) => setFormData({ ...formData, ownerFirstName: e.target.value })}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Legal last name</label>
                <input
                  type="text"
                  required
                  value={formData.ownerLastName}
                  onChange={(e) => setFormData({ ...formData, ownerLastName: e.target.value })}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  placeholder="Doe"
                />
              </div>
            </div>

            {!formData.isOwner && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email address</label>
                <input
                  type="email"
                  required
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="johndoe@teemplot.com"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select className="w-32 px-3 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 appearance-none cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                >
                  <option>+234</option>
                </select>
                <input
                  type="tel"
                  required
                  value={formData.ownerPhone}
                  onChange={(e) => {
                    // Only allow numbers and basic formatting characters
                    const value = e.target.value.replace(/[^0-9\s-]/g, '');
                    setFormData({ ...formData, ownerPhone: value });
                  }}
                  onKeyPress={(e) => {
                    // Prevent non-numeric characters except space and dash
                    if (!/[0-9\s-]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  placeholder="901 234 5678"
                  minLength={10}
                  maxLength={15}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Enter 10-11 digits</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date of birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.ownerDOB}
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value);
                  const today = new Date();
                  const age = today.getFullYear() - selectedDate.getFullYear();
                  const monthDiff = today.getMonth() - selectedDate.getMonth();
                  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate()) ? age - 1 : age;
                  
                  if (actualAge < 18) {
                    toast.error('You must be at least 18 years old');
                    return;
                  }
                  setFormData({ ...formData, ownerDOB: e.target.value });
                }}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-foreground [color-scheme:light]"
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                placeholder="YYYY-MM-DD"
              />
              <p className="text-xs text-muted-foreground mt-1">You must be at least 18 years old</p>
            </div>

            <button
              type="button" onClick={handleNext}
              disabled={loading || loadingProgress || !isStepValid('owner')}
              className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : loadingProgress ? 'Loading...' : 'Continue'}
            </button>
          </div>
        )

      case 'documents':
        return (
          <div className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">C.A.C document</label>
              <p className="text-xs text-muted-foreground mb-3">This is used to verify the business detail you provided</p>

              {formData.cacDocument ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getFileName(formData.cacDocument)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getFileSize(formData.cacDocument) > 0 
                          ? (getFileSize(formData.cacDocument) / 1024).toFixed(0) + ' KB' 
                          : 'Uploaded'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, cacDocument: null })}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        alert('File size must be less than 2MB')
                        return
                      }
                      if (file.type !== 'application/pdf') {
                        alert('Only PDF files are allowed')
                        return
                      }
                      setFormData({ ...formData, cacDocument: file })
                    }
                  }}
                >
                  <label className="cursor-pointer block">
                    <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert('File size must be less than 2MB')
                          return
                        }
                        setFormData({ ...formData, cacDocument: file })
                      }
                    }} />
                    <div className="flex justify-center mb-2">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Click or drag to upload cac_document.pdf</p>
                    <p className="text-xs text-muted-foreground">PDF up to 2MB</p>
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Proof of address</label>
              <p className="text-xs text-muted-foreground mb-3">This is used to verify the business address</p>

              {formData.proofOfAddress ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getFileName(formData.proofOfAddress)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getFileSize(formData.proofOfAddress) > 0 
                          ? (getFileSize(formData.proofOfAddress) / 1024).toFixed(0) + ' KB' 
                          : 'Uploaded'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, proofOfAddress: null })}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        alert('File size must be less than 2MB')
                        return
                      }
                      if (!file.type.startsWith('image/')) {
                        alert('Only image files are allowed')
                        return
                      }
                      setFormData({ ...formData, proofOfAddress: file })
                    }
                  }}
                >
                  <label className="cursor-pointer block">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert('File size must be less than 2MB')
                          return
                        }
                        setFormData({ ...formData, proofOfAddress: file })
                      }
                    }} />
                    <div className="flex justify-center mb-2">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Click or drag to upload proof_of_address.png</p>
                    <p className="text-xs text-muted-foreground">Image up to 2MB</p>
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Company policies document</label>
              <p className="text-xs text-muted-foreground mb-3">This is to ensure that your company adhere to standard company practices</p>

              {formData.companyPolicies ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getFileName(formData.companyPolicies)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getFileSize(formData.companyPolicies) 
                          ? (getFileSize(formData.companyPolicies) / 1024).toFixed(0) + 'KB' 
                          : 'File uploaded'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, companyPolicies: null })}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        alert('File size must be less than 2MB')
                        return
                      }
                      if (file.type !== 'application/pdf') {
                        alert('Only PDF files are allowed')
                        return
                      }
                      setFormData({ ...formData, companyPolicies: file })
                    }
                  }}
                >
                  <label className="cursor-pointer block">
                    <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert('File size must be less than 2MB')
                          return
                        }
                        setFormData({ ...formData, companyPolicies: file })
                      }
                    }} />
                    <div className="flex justify-center mb-2">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Click or drag to upload company_policies.pdf</p>
                    <p className="text-xs text-muted-foreground">PDF up to 2MB</p>
                  </label>
                </div>
              )}
            </div>

            <button
              type="button" onClick={handleNext}
              disabled={loading || loadingProgress || !isStepValid('documents')}
              className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Uploading...' : 'Continue'}
            </button>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-4 md:space-y-6">
            <p className="text-sm text-muted-foreground font-semibold mb-6">Please take a moment to review your information.</p>

            {/* Company Details */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Company details</h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep('details')}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </div>

              {/* Company Logo */}
              {formData.companyLogo && (
                <div className="mb-4 pb-4 border-b border-border">
                  <p className="text-xs text-muted-foreground mb-2">Company logo</p>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center p-2 border border-border overflow-hidden">
                      {(() => {
                        // Handle File object
                        if (isFile(formData.companyLogo)) {
                          return (
                            <img 
                              src={URL.createObjectURL(formData.companyLogo)} 
                              alt="Company Logo" 
                              className="w-full h-full object-contain rounded-lg" 
                            />
                          )
                        }
                        // Handle string URL
                        if (typeof formData.companyLogo === 'string') {
                          return (
                            <img 
                              src={formData.companyLogo} 
                              alt="Company Logo" 
                              className="w-full h-full object-contain rounded-lg" 
                            />
                          )
                        }
                        // Handle object with url property
                        if (typeof formData.companyLogo === 'object' && formData.companyLogo.url) {
                          return (
                            <img 
                              src={formData.companyLogo.url} 
                              alt="Company Logo" 
                              className="w-full h-full object-contain rounded-lg" 
                            />
                          )
                        }
                        // Fallback icon
                        return <ImageIcon className="w-6 h-6 text-gray-400" />
                      })()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {getFileName(formData.companyLogo)}
                      </p>
                      {getFileUrl(formData.companyLogo) && (
                        <a
                          href={getFileUrl(formData.companyLogo)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View full size
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Company name</p>
                  <p className="text-sm font-medium text-foreground">{formData.companyName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tax identification number</p>
                  <p className="text-sm font-medium text-foreground">{formData.tin || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Industry</p>
                  <p className="text-sm font-medium text-foreground capitalize">{formData.industry || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Company size</p>
                  <p className="text-sm font-medium text-foreground">{formData.companySize || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Website</p>
                  <p className="text-sm font-medium text-foreground">{formData.website ? `http://${formData.website}` : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Head office city</p>
                  <p className="text-sm font-medium text-foreground">{formData.city || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Full address</p>
                  <p className="text-sm font-medium text-foreground">{formData.address || '-'}</p>
                </div>
              </div>
            </div>

            {/* Company Owner Details */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Company owner details</h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep('owner')}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">First name</p>
                  <p className="text-sm font-medium text-foreground">{formData.ownerFirstName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last name</p>
                  <p className="text-sm font-medium text-foreground">{formData.ownerLastName || '-'}</p>
                </div>
                {!formData.isOwner && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Email address</p>
                    <p className="text-sm font-medium text-foreground">{formData.ownerEmail || '-'}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Phone number</p>
                  <p className="text-sm font-medium text-foreground">{formData.ownerPhone ? `+234 ${formData.ownerPhone}` : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date of birth</p>
                  <p className="text-sm font-medium text-foreground">{formData.ownerDOB || '-'}</p>
                </div>
              </div>
            </div>

            {/* Company Documents */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Company documents</h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep('documents')}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </div>

              <div className="space-y-4">
                {/* CAC Document */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">C.A.C document</p>
                      {formData.cacDocument ? (
                        <p className="text-sm font-medium text-foreground truncate">
                          {getFileName(formData.cacDocument)}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not uploaded</p>
                      )}
                    </div>
                  </div>
                  {formData.cacDocument && getFileUrl(formData.cacDocument) && (
                    <a
                      href={getFileUrl(formData.cacDocument)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors flex-shrink-0"
                    >
                      View
                    </a>
                  )}
                </div>

                {/* Proof of Address */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <ImageIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Proof of address</p>
                      {formData.proofOfAddress ? (
                        <p className="text-sm font-medium text-foreground truncate">
                          {getFileName(formData.proofOfAddress)}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not uploaded</p>
                      )}
                    </div>
                  </div>
                  {formData.proofOfAddress && getFileUrl(formData.proofOfAddress) && (
                    <a
                      href={getFileUrl(formData.proofOfAddress)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors flex-shrink-0"
                    >
                      View
                    </a>
                  )}
                </div>

                {/* Company Policies */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Company policies</p>
                      {formData.companyPolicies ? (
                        <p className="text-sm font-medium text-foreground truncate">
                          {getFileName(formData.companyPolicies)}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not uploaded</p>
                      )}
                    </div>
                  </div>
                  {formData.companyPolicies && getFileUrl(formData.companyPolicies) && (
                    <a
                      href={getFileUrl(formData.companyPolicies)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors flex-shrink-0"
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Agree & continue'}
            </button>
          </div>
        )

      case 'payment':
        return <PaymentStep companySize={formData.companySize} onComplete={() => navigate('/dashboard')} />

      default:
        return null
    }
  }

  const handleBack = () => {
    const stepOrder: Step[] = ['details', 'owner', 'documents', 'review', 'payment']
    const currentIndex = stepOrder.indexOf(currentStep)
    
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
      // Scroll to top for better UX
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSaveProgress = async () => {
    try {
      // Get user data from secure context (httpOnly cookies)
      let userId = currentUser?.id
      let companyId = currentUser?.companyId
      
      // Fallback: try to get from localStorage if UserContext is not ready yet
      if (!userId) {
        const fallbackUser = localStorage.getItem('user')
        if (fallbackUser) {
          try {
            const parsedUser = JSON.parse(fallbackUser)
            userId = parsedUser.id
            companyId = parsedUser.companyId
            console.log('📥 Using fallback user data from localStorage:', { userId, companyId })
          } catch (e) {
            console.error('Failed to parse fallback user data:', e)
          }
        }
      }
      
      if (!userId) {
        console.warn('No user data available to save progress - user might not be authenticated yet')
        // Don't show error toast during onboarding - this is expected for initial steps
        return
      }
      
      console.log('💾 Saving progress with userId:', userId, 'companyId:', companyId)
      
      // Only userId is required - companyId is optional during initial onboarding
      if (userId) {
        // Check if there's any meaningful data to save
        const hasData = formData.companyName || 
                       formData.tin || 
                       formData.industry || 
                       formData.companySize ||
                       formData.address ||
                       formData.ownerFirstName ||
                       formData.ownerLastName

        if (hasData) {
          // Determine current step based on what data exists
          let currentStepNum = 1 // Registration (implicit)
          
          // Determine completed steps based on current UI step being saved
          // If we are saving 'details', then step 1 (Reg) is done. 
          // If we are saving 'owner', then step 2 (Details) is done.
          // Note: The backend expects the step number that was JUST COMPLETED.
          
          if (currentStep === 'details') currentStepNum = 2 // Completed Details
          if (currentStep === 'owner') currentStepNum = 3   // Completed Owner
          if (currentStep === 'documents') {
             // Only mark as complete if all docs are uploaded
             const hasCac = !!formData.cacDocument;
             const hasAddress = !!formData.proofOfAddress;
             const hasPolicies = !!formData.companyPolicies;
             
             const hasAllDocs = hasCac && hasAddress && hasPolicies;

             if (hasAllDocs) {
                currentStepNum = 4 // Completed Documents
             } else {
                currentStepNum = 3 // Still on Documents (or completed previous step 2)
             }
          }
          if (currentStep === 'review') currentStepNum = 5    // Completed Review
          
          // Prepare formData for saving
          // Save uploaded file metadata (objects with url/filename) or URL strings
          // Don't save File objects (they need to be uploaded first)
          const processDocForSave = (doc: any) => {
            if (!doc) return null
            // Don't save File objects - they need to be uploaded first
            if (isFile(doc)) return null
            // Save objects with metadata (uploaded files)
            if (typeof doc === 'object' && (doc.url || doc.filename)) return doc
            // Save URL strings
            if (typeof doc === 'string') return doc
            return null
          }
          
          const formDataToSave = {
            ...formData,
            cacDocument: processDocForSave(formData.cacDocument),
            proofOfAddress: processDocForSave(formData.proofOfAddress),
            companyPolicies: processDocForSave(formData.companyPolicies),
            companyLogo: processDocForSave(formData.companyLogo),
          }

          await saveProgress({
            userId,
            companyId: companyId || 'pending', // Use 'pending' if no companyId yet
            currentStep: currentStepNum,
            completedSteps: Array.from({ length: currentStepNum - 1 }, (_, i) => i + 1),
            formData: formDataToSave,
          })
          
          toast.success('Progress saved successfully!')
        } else {
          toast.info('Please fill in at least one field before saving')
        }
      } else {
        toast.error('Unable to save progress. Please log in again.')
      }
    } catch (error: any) {
      console.error('Failed to save progress:', error)
      toast.error(error.message || 'Failed to save progress')
    }
  }

  // Handle Google auth onboarding completion
  // const completeGoogleOnboarding = async () => {
  //   // Google auth users are handled via httpOnly cookies
  //   // No special handling needed
  //   return

  //   try {
  //     const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  //     const response = await fetch(`${API_URL}/auth/google/complete-onboarding`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       credentials: 'include', // Use httpOnly cookies
  //       body: JSON.stringify({
  //         companyName: formData.companyName,
  //         industry: formData.industry,
  //         companySize: formData.companySize,
  //         phoneNumber: formData.ownerPhone,
  //         address: formData.headOffice,
  //         timezone: 'UTC',
  //       }),
  //     })

  //     const data = await response.json()

  //     if (!response.ok) {
  //       throw new Error(data.message || 'Failed to complete onboarding')
  //     }

  //     // Backend sets httpOnly cookies automatically - no client-side storage needed
  //     // Clear any old onboarding data
  //     sessionStorage.clear()
  //     localStorage.clear()
  //   } catch (error) {
  //     console.error('Failed to complete Google onboarding:', error)
  //     throw error
  //   }
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <OnboardingNavbar
        currentStep={steps.findIndex(s => s.id === currentStep) + 1}
        totalSteps={steps.length}
        onSave={handleSaveProgress}
        onBack={handleBack}
        disabled={!currentUser || userLoading}
      />

      {/* Loading Progress Banner */}
      {loadingProgress && progressMessage && (
        <div className="bg-gray-100 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
              <span>{progressMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Loading Banner */}
      {userLoading && !currentUser && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-2">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
              <span>Loading authentication...</span>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-8">
          {/* Sidebar - Steps (Hidden on mobile) */}
          <div className="hidden md:block md:col-span-3">
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isActive = step.id === currentStep
                const isCompleted = step.completed
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-accent/10 text-accent' : 'text-muted-foreground'
                      }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-green-600 text-white' :
                      isActive ? 'bg-accent text-white' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'text-accent' : ''}`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Main Content (Full width on mobile) */}
          <div className="w-full md:col-span-9">
            <div className="bg-white rounded-lg md:rounded-xl border border-border p-4 md:p-8">
              <div className="mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                  {currentStep === 'details' && 'Tell us about your company'}
                  {currentStep === 'owner' && 'Tell us about your company owner'}
                  {currentStep === 'documents' && 'Legal company documents'}
                  {currentStep === 'payment' && 'Choose your plan'}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  {currentStep === 'details' && 'This information is collected to better understand and serve your company'}
                  {currentStep === 'owner' && 'This is the ultimate beneficial owner of the company. This information should be provided by someone authorized to do so.'}
                  {currentStep === 'documents' && 'These are required documents we need in order to verify that the business information you provided are correct'}
                  {currentStep === 'payment' && 'Select a plan that works for your company size'}
                </p>
              </div>

              {renderStepContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

