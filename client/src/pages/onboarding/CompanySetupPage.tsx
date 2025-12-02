import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Check, FileText, Image as ImageIcon, Trash2, Edit2 } from 'lucide-react'
import OnboardingNavbar from '@/components/onboarding/OnboardingNavbar'
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress'
import Dropdown from '@/components/ui/Dropdown'
import AddressAutocomplete from '@/components/ui/AddressAutocomplete'
import PaymentStep from '@/components/onboarding/PaymentStep'
import { useToast } from '@/contexts/ToastContext'
import {
  submitBusinessInfo,
  submitOwnerDetails,
  uploadLogo,
  uploadDocument
} from '@/utils/onboardingApi'

type Step = 'details' | 'owner' | 'documents' | 'review' | 'payment'

export default function CompanySetupPage() {
  const navigate = useNavigate()
  const { saveProgress, getProgress, getAuthData } = useOnboardingProgress()
  const toast = useToast()
  const [currentStep, setCurrentStep] = useState<Step>('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    // Company details
    companyLogo: null as File | null,
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

    // Documents
    cacDocument: null as File | null,
    proofOfAddress: null as File | null,
    companyPolicies: null as File | null,
  })

  const steps = [
    { id: 'details', label: 'Company details', completed: false },
    { id: 'owner', label: 'Company owner details', completed: false },
    { id: 'documents', label: 'Company documents', completed: false },
    { id: 'review', label: 'Review', completed: false },
    { id: 'payment', label: 'Payments', completed: false },
  ]

  // Load saved progress
  useEffect(() => {
    const loadProgress = async () => {
      const authData = getAuthData()
      // Fallback to localStorage user if not in onboarding flow (e.g. resumed session)
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const userId = authData?.userId || user?.id

      if (userId) {
        const progress = await getProgress(userId)
        if (progress && progress.formData) {
          setFormData(prev => ({
            ...prev,
            ...progress.formData,
            // Restore file objects is tricky, usually we just show them as uploaded
            // For now we'll keep them null as they need re-upload or different handling
          }))

          // Restore step if needed, but usually we start at 'details' or let the parent router handle it
          // However, if we want to be specific:
          // if (progress.currentStep === 2) setCurrentStep('details')
          // etc.
        }
      }
    }
    loadProgress()
  }, [getAuthData, getProgress])

  const handleNext = async () => {
    setLoading(true)
    setError('')

    try {
      let authData = getAuthData()
      
      // Debug: Log what we have
      console.log('🔍 Initial authData:', authData)
      console.log('🔍 localStorage.user:', localStorage.getItem('user'))
      console.log('🔍 sessionStorage.onboarding_auth:', sessionStorage.getItem('onboarding_auth'))
      
      // If no auth data found, try to get from localStorage user
      if (!authData?.userId || !authData?.companyId) {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          console.log('🔍 Parsed user object:', user)
          authData = {
            userId: user.id,
            companyId: user.company_id || user.companyId, // Try both formats
            email: user.email,
          }
        }
      }
      
      // If still no companyId, try to get from token
      if (authData?.userId && !authData?.companyId) {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            console.log('🔍 Token payload:', payload)
            if (payload.companyId) {
              authData.companyId = payload.companyId
            }
          } catch (e) {
            console.error('Failed to decode token:', e)
          }
        }
      }
      
      console.log('🔍 Final authData:', authData)
      
      // Final check - only userId is required, companyId might not exist yet during onboarding
      if (!authData?.userId) {
        throw new Error('Please log in again to continue onboarding. Your session may have expired.')
      }
      
      // If no companyId, we need to create one or get it from the backend
      if (!authData?.companyId) {
        console.warn('⚠️ No companyId found, will be created by backend')
      }

      // Submit data to backend based on current step
      if (currentStep === 'details') {
        // CRITICAL: Validate that we have coordinates from Google Places
        // This prevents broken geofencing if user types address manually
        if (!formData.latitude || !formData.longitude) {
          throw new Error('⚠️ Please select your address from the dropdown suggestions. This ensures accurate location tracking for attendance.')
        }

        if (!formData.placeId) {
          throw new Error('⚠️ Please select an address from Google suggestions (not manual entry). This is required for geofencing.')
        }

        // Validate coordinates are reasonable (not 0,0 or invalid)
        if (Math.abs(formData.latitude) < 0.001 && Math.abs(formData.longitude) < 0.001) {
          throw new Error('Invalid coordinates detected. Please select your address from the dropdown again.')
        }

        // Submit business information with complete geocoding data
        const businessInfoResponse = await submitBusinessInfo({
          companyId: authData.companyId || 'temp', // Backend will create if needed
          companyName: formData.companyName,
          taxId: formData.tin,
          industry: formData.industry === 'other' ? formData.customIndustry : formData.industry,
          employeeCount: parseInt(formData.companySize) || 1,
          website: formData.website ? `http://${formData.website}` : undefined,
          // Legacy address field
          address: formData.formattedAddress || formData.address,
          // Detailed geocoding data from Google Places
          formattedAddress: formData.formattedAddress,
          streetNumber: formData.streetNumber,
          streetName: formData.streetName,
          city: formData.city,
          stateProvince: formData.stateProvince,
          country: formData.country,
          postalCode: formData.postalCode,
          // Required coordinates for geofencing
          officeLatitude: formData.latitude,
          officeLongitude: formData.longitude,
          // Google Places metadata
          placeId: formData.placeId,
          geocodingAccuracy: formData.geocodingAccuracy,
        })
        
        // If companyId was created by backend, update our authData
        if (businessInfoResponse?.data?.companyId && !authData.companyId) {
          authData.companyId = businessInfoResponse.data.companyId
          // Update localStorage
          const userStr = localStorage.getItem('user')
          if (userStr) {
            const user = JSON.parse(userStr)
            user.companyId = businessInfoResponse.data.companyId
            user.company_id = businessInfoResponse.data.companyId
            localStorage.setItem('user', JSON.stringify(user))
          }
        }

        // Upload logo if provided
        if (formData.companyLogo) {
          await uploadLogo(authData.companyId, formData.companyLogo)
        }

        toast.success('Company details saved successfully!')

        // If Google auth user, complete onboarding
        if (authData?.isGoogleAuth) {
          await completeGoogleOnboarding()
        }
      } else if (currentStep === 'owner') {
        // Submit owner details if not the owner
        if (!formData.isOwner) {
          await submitOwnerDetails({
            companyId: authData.companyId,
            registrantUserId: authData.userId,
            ownerFirstName: formData.ownerFirstName,
            ownerLastName: formData.ownerLastName,
            ownerEmail: formData.ownerEmail,
            ownerPhone: formData.ownerPhone,
            ownerDateOfBirth: formData.ownerDOB,
          })
        }
        toast.success('Owner details saved successfully!')
      } else if (currentStep === 'documents') {
        // Upload all documents using hash-based deduplication
        const uploadPromises = [];
        
        if (formData.cacDocument) {
          uploadPromises.push(uploadDocument(authData.companyId, 'cac', formData.cacDocument));
        }
        if (formData.proofOfAddress) {
          uploadPromises.push(uploadDocument(authData.companyId, 'proof_of_address', formData.proofOfAddress));
        }
        if (formData.companyPolicies) {
          uploadPromises.push(uploadDocument(authData.companyId, 'company_policy', formData.companyPolicies));
        }
        
        // Upload all documents in parallel
        await Promise.all(uploadPromises);
        toast.success('Documents uploaded successfully!');
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
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleNext()
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'details':
        return (
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
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
                    <img 
                      src={URL.createObjectURL(formData.companyLogo)} 
                      alt="Logo" 
                      className="w-full h-full object-contain rounded-lg" 
                    />
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
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        )

      case 'owner':
        return (
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Legal first name</label>
                <input
                  type="text"
                  required
                  value={formData.ownerFirstName}
                  onChange={(e) => setFormData({ ...formData, ownerFirstName: e.target.value })}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
              <label className="block text-sm font-medium text-foreground mb-2">Phone number</label>
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
                  onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  placeholder="901 234 5678"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Date of birth</label>
              <input
                type="date"
                required
                value={formData.ownerDOB}
                onChange={(e) => setFormData({ ...formData, ownerDOB: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        )

      case 'documents':
        return (
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
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
                      <p className="text-sm font-medium text-gray-900">{formData.cacDocument.name}</p>
                      <p className="text-xs text-gray-500">{formData.cacDocument.size ? (formData.cacDocument.size / 1024).toFixed(0) + 'KB' : 'Unknown size'}</p>
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
                      <p className="text-sm font-medium text-gray-900">{formData.proofOfAddress.name}</p>
                      <p className="text-xs text-gray-500">{formData.proofOfAddress.size ? (formData.proofOfAddress.size / 1024).toFixed(0) + 'KB' : 'Unknown size'}</p>
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
                      <p className="text-sm font-medium text-gray-900">{formData.companyPolicies.name}</p>
                      <p className="text-xs text-gray-500">{formData.companyPolicies.size ? (formData.companyPolicies.size / 1024).toFixed(0) + 'KB' : 'Unknown size'}</p>
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
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
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
                  <p className="text-xs text-muted-foreground mb-1">Head office</p>
                  <p className="text-sm font-medium text-foreground">{formData.headOffice || '-'}</p>
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

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">C.A.C document</p>
                  {formData.cacDocument ? (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-red-600" />
                      <span className="font-medium">{formData.cacDocument.name}</span>
                      {formData.cacDocument.size && <span className="text-muted-foreground">({(formData.cacDocument.size / 1024).toFixed(0)}KB)</span>}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not uploaded</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Proof of address</p>
                  {formData.proofOfAddress ? (
                    <div className="flex items-center gap-2 text-sm">
                      <ImageIcon className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{formData.proofOfAddress.name}</span>
                      {formData.proofOfAddress.size && <span className="text-muted-foreground">({(formData.proofOfAddress.size / 1024).toFixed(0)}KB)</span>}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not uploaded</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Company policies</p>
                  {formData.companyPolicies ? (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-red-600" />
                      <span className="font-medium">{formData.companyPolicies.name}</span>
                      {formData.companyPolicies.size && <span className="text-muted-foreground">({(formData.companyPolicies.size / 1024).toFixed(0)}KB)</span>}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not uploaded</p>
                  )}
                </div>
              </div>
            </div>

            <button
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

  const handleSaveProgress = async () => {
    try {
      let authData = getAuthData()
      
      // If no auth data found, try to get from localStorage user
      if (!authData?.userId || !authData?.companyId) {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          authData = {
            userId: user.id,
            companyId: user.company_id || user.companyId, // Try both formats
            email: user.email,
          }
        }
      }
      
      // If still no companyId, try token
      if (authData?.userId && !authData?.companyId) {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            if (payload.companyId) {
              authData.companyId = payload.companyId
            }
          } catch (e) {
            console.error('Failed to decode token:', e)
          }
        }
      }
      
      // Only save if we have valid auth data AND some form data
      if (authData?.userId && authData?.companyId) {
        // Check if there's any meaningful data to save
        const hasData = formData.companyName || 
                       formData.tin || 
                       formData.industry || 
                       formData.companySize ||
                       formData.address

        if (hasData) {
          await saveProgress({
            userId: authData.userId,
            companyId: authData.companyId,
            currentStep: 2,
            completedSteps: [1], // Registration completed
            formData: formData,
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
  const completeGoogleOnboarding = async () => {
    const authData = getAuthData()
    if (!authData?.isGoogleAuth) {
      return // Not a Google auth user
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const token = localStorage.getItem('auth_token')

      const response = await fetch(`${API_URL}/auth/google/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          industry: formData.industry,
          companySize: formData.companySize,
          phoneNumber: formData.ownerPhone,
          address: formData.headOffice,
          timezone: 'UTC',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete onboarding')
      }

      // Update token and user data
      localStorage.setItem('auth_token', data.data.token)

      const user = JSON.parse(localStorage.getItem('user') || '{}')
      user.companyId = data.data.companyId
      localStorage.setItem('user', JSON.stringify(user))

      // Clear onboarding auth data
      sessionStorage.removeItem('onboarding_auth')
    } catch (error) {
      console.error('Failed to complete Google onboarding:', error)
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <OnboardingNavbar
        currentStep={steps.findIndex(s => s.id === currentStep) + 1}
        totalSteps={steps.length}
        onSave={handleSaveProgress}
      />

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

