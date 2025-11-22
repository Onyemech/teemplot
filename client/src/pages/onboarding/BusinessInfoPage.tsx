import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'

import { Building2, Hash, Users, Globe, MapPin, AlertCircle, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import BackButton from '@/components/ui/BackButton'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import { submitBusinessInfo, getOnboardingAuth } from '@/utils/onboardingApi'
import { useToast } from '@/contexts/ToastContext'

export default function BusinessInfoPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [formData, setFormData] = useState({
    companyName: '',
    taxId: '',
    industry: '',
    employeeCount: '',
    website: '',
    address: '',
    city: '',
    stateProvince: '',
    country: 'Nigeria',
    postalCode: '',
  })
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationError, setLocationError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    // Prefetch next page for instant navigation
    // prefetch not needed in React Router: '/onboarding/documents')
    
    // Check if previous steps completed
    const companySetup = sessionStorage.getItem('onboarding_company_setup')
    if (!companySetup) {
      navigate('/onboarding/company-setup')
      return
    }

    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        () => {
          setLocationError('Unable to get location. Please enable location services.')
        }
      )
    } else {
      setLocationError('Geolocation is not supported by this browser.')
    }
  }, [navigate])

  const industries = [
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance' },
    { value: 'education', label: 'Education' },
    { value: 'retail', label: 'Retail' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'construction', label: 'Construction' },
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'other', label: 'Other' },
  ]

  const countries = [
    { value: 'Nigeria', label: 'Nigeria' },
    { value: 'Ghana', label: 'Ghana' },
    { value: 'Kenya', label: 'Kenya' },
    { value: 'South Africa', label: 'South Africa' },
    { value: 'United States', label: 'United States' },
    { value: 'United Kingdom', label: 'United Kingdom' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate required fields
    if (!formData.companyName || !formData.taxId || !formData.industry || 
        !formData.employeeCount || !formData.address || !formData.city || 
        !formData.stateProvince || !formData.postalCode) {
      setError('Please fill in all required fields')
      toast.error('Please fill in all required fields')
      return
    }

    // Validate employee count
    const employeeCount = parseInt(formData.employeeCount)
    if (isNaN(employeeCount) || employeeCount < 1) {
      setError('Employee count must be at least 1')
      toast.error('Employee count must be at least 1')
      return
    }

    if (!location) {
      setError('Location is required. Please enable location services and refresh the page.')
      toast.error('Location is required')
      return
    }

    setLoading(true)

    try {
      // Get auth data
      const authData = getOnboardingAuth()
      
      // Submit to backend
      await submitBusinessInfo({
        companyId: authData.companyId,
        companyName: formData.companyName,
        taxId: formData.taxId,
        industry: formData.industry,
        employeeCount: employeeCount,
        website: formData.website || undefined,
        address: formData.address,
        city: formData.city,
        stateProvince: formData.stateProvince,
        country: formData.country,
        postalCode: formData.postalCode,
        officeLatitude: location.latitude,
        officeLongitude: location.longitude,
      })
      
      // Store in session storage for reference
      sessionStorage.setItem('onboarding_business_info', JSON.stringify({
        ...formData,
        employeeCount: employeeCount,
        latitude: location.latitude,
        longitude: location.longitude,
      }))

      toast.success('Business information saved successfully!')
      setShowSuccess(true)

      setTimeout(() => {
        navigate('/onboarding/documents')
      }, 1500)

    } catch (err: any) {
      console.error('Failed to save business info:', err)
      const errorMsg = err.message || 'Failed to save business information'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    const companySetup = sessionStorage.getItem('onboarding_company_setup')
    if (companySetup) {
      const { isOwner } = JSON.parse(companySetup)
      if (isOwner) {
        navigate('/onboarding/company-setup')
      } else {
        navigate('/onboarding/owner-details')
      }
    } else {
      navigate('/onboarding/company-setup')
    }
  }

  // Success animation component
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-4 animate-scaleIn">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 animate-fadeIn">
            Business Info Saved!
          </h2>
          <p className="text-gray-600 animate-fadeIn">
            Proceeding to document upload...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Teemplot" className="h-16 w-auto" />
            <div className="text-sm text-gray-700 font-medium">
              Step 4 of 9
            </div>
          </div>
          <div className="text-sm font-medium text-primary-600">
            Business Information
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: '44%' }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-700 font-medium mt-2">
            <span>Registration</span>
            <span>Company Setup</span>
            <span className="font-medium text-primary-600">Business Info</span>
            <span>Documents</span>
            <span>Complete</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Business Information
              </h1>
              <p className="text-gray-600">
                Tell us about your company to complete your profile.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Details */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Company Details
                </h3>

                <Input
                  label="Company Name"
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  icon={<Building2 className="w-5 h-5" />}
                  placeholder="Enter your company name"
                  helperText="Legal business name as registered"
                  fullWidth
                />

                <Input
                  label="Tax ID / RC Number"
                  type="text"
                  required
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  icon={<Hash className="w-5 h-5" />}
                  placeholder="Enter tax identification number"
                  helperText="Company registration or tax ID number"
                  fullWidth
                />

                <Select
                  label="Industry"
                  required
                  value={formData.industry}
                  onChange={(value) => setFormData({ ...formData, industry: value })}
                  options={industries}
                  placeholder="Select your industry"
                />

                <Input
                  label="Number of Employees"
                  type="number"
                  required
                  value={formData.employeeCount}
                  onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                  icon={<Users className="w-5 h-5" />}
                  placeholder="Enter number of employees"
                  helperText="Include yourself in the count"
                  fullWidth
                  min="1"
                />

                <Input
                  label="Company Website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  icon={<Globe className="w-5 h-5" />}
                  placeholder="https://www.example.com"
                  helperText="Optional - Your company website"
                  fullWidth
                />
              </div>

              {/* Business Address */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Business Address
                </h3>

                <div>
                  <Input
                    label="Street Address"
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    icon={<MapPin className="w-5 h-5" />}
                    placeholder="Enter street address"
                    fullWidth
                  />
                  {location && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          // Use reverse geocoding to get address from coordinates
                          const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}`
                          )
                          const data = await response.json()
                          if (data.address) {
                            setFormData({
                              ...formData,
                              address: data.address.road || data.display_name,
                              city: data.address.city || data.address.town || data.address.village || '',
                              stateProvince: data.address.state || '',
                              postalCode: data.address.postcode || '',
                            })
                          }
                        } catch (err) {
                          console.error('Failed to fetch address:', err)
                        }
                      }}
                      className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      📍 Use my current location
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="City"
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city"
                    fullWidth
                  />

                  <Input
                    label="State/Province"
                    type="text"
                    required
                    value={formData.stateProvince}
                    onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value })}
                    placeholder="Enter state"
                    fullWidth
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Country"
                    required
                    value={formData.country}
                    onChange={(value) => setFormData({ ...formData, country: value })}
                    options={countries}
                  />

                  <Input
                    label="Postal Code"
                    type="text"
                    required
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="Enter postal code"
                    fullWidth
                  />
                </div>

                {/* Location Status */}
                <div className={`p-4 rounded-lg border ${
                  location 
                    ? 'bg-success/10 border-success/20' 
                    : 'bg-warning/10 border-warning/20'
                }`}>
                  <div className="flex items-center gap-2">
                    {location ? (
                      <>
                        <Check className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium text-success-dark">
                          Location captured successfully
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-warning" />
                        <span className="text-sm font-medium text-warning-dark">
                          {locationError || 'Capturing your location...'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-8 mt-8 border-t border-gray-200">
                <BackButton onClick={handleBack} />

                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="right"
                  disabled={!location}
                >
                  {loading ? 'Saving...' : 'Continue'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
