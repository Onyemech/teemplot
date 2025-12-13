import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useSettingsSync } from '@/hooks/useSettingsSync'
import { apiClient } from '@/lib/api'
import AddressAutocomplete from '@/components/ui/AddressAutocomplete'




export default function CompanyLocationSetup() {
  const navigate = useNavigate()
  const toast = useToast()
  const { updateSettings, markSetupStepCompleted } = useSettingsSync()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [formData, setFormData] = useState({
    address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    radius: 100,
    locationTitle: ''
  })

  // Fetch existing company location data on component mount
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await apiClient.get('/api/company-settings')
        if (response.data.success) {
          const data = response.data.data
          // Parse settings JSON if it exists
          let settings: any = {}
          try {
            settings = typeof data.settings === 'string' ? JSON.parse(data.settings) : (data.settings || {})
          } catch (e) {
            console.warn('Failed to parse settings JSON:', e)
          }
          
          setFormData({
            address: data.office_address || '',
            latitude: data.office_latitude || null,
            longitude: data.office_longitude || null,
            radius: data.geofence_radius_meters || 100,
            locationTitle: settings.locationTitle || 'Head Office'
          })
        }
      } catch (error) {
        console.error('Failed to fetch company data:', error)
        // If no data exists yet, keep default values
      } finally {
        setLoadingData(false)
      }
    }

    fetchCompanyData()
  }, [])



  const handleAddressChange = (value: string, addressData?: any) => {
    if (addressData) {
      setFormData({
        ...formData,
        address: value,
        latitude: addressData.latitude,
        longitude: addressData.longitude
      })
    } else {
      setFormData({
        ...formData,
        address: value,
        latitude: null,
        longitude: null
      })
    }
  }

  const handleContinue = async () => {
    if (!formData.address || !formData.latitude || !formData.longitude) {
      toast.error('Please select a valid address from the dropdown')
      return
    }

    setLoading(true)
    try {
      // Update settings using the sync hook
      await updateSettings('location', {
        officeAddress: formData.address,
        officeLatitude: formData.latitude,
        officeLongitude: formData.longitude,
        geofenceRadiusMeters: formData.radius,
        locationTitle: formData.locationTitle || 'Head Office'
      })

      // Mark this step as completed
      await markSetupStepCompleted('company-location')
      
      toast.success('Location saved successfully!')
      
      // Move to next step
      navigate('/dashboard/attendance/setup/employee-hours')
    } catch (error: any) {
      console.error('Failed to save location:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Add location</h1>
        </div>

        {/* Form Content - Centered */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Company Address
                </label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={handleAddressChange}
                  placeholder="34 Oduduwa Way Ikeja, Nigeria"
                  required
                />
              </div>

              {formData.latitude && formData.longitude && (
                <div className="bg-gray-900 rounded-xl p-3 text-white shadow-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium">
                      Coordinate: {Number(formData.latitude).toFixed(6)}, {Number(formData.longitude).toFixed(6)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Clock-in Radius (meters)
                </label>
                <input
                  type="number"
                  value={formData.radius}
                  onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) || 100 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  placeholder="E.g. 100"
                  min="10"
                  max="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Location Title
                </label>
                <input
                  type="text"
                  value={formData.locationTitle}
                  onChange={(e) => setFormData({ ...formData, locationTitle: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  placeholder="E.g. Head Office"
                />
              </div>
            </div>

            {/* Continue Button */}
            <div className="mt-8">
              <button
                onClick={handleContinue}
                disabled={loading || !formData.latitude || !formData.address}
                className="w-full disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed bg-primary hover:bg-primary/90 text-white py-3 px-6 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Tracker - Right Sidebar */}
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="text-sm font-medium text-orange-700">Company location</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="text-sm font-medium text-gray-600">Employee hours</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="text-sm font-medium text-gray-600">Lateness policy</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="text-sm font-medium text-gray-600">Automate alerts</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="text-sm font-medium text-gray-600">Biometrics Clock-in option</span>
          </div>
        </div>
      </div>
    </div>
  )
}