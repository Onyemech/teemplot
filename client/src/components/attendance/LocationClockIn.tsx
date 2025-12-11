import { useState, useEffect } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface LocationClockInProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (data: any) => void
}

interface LocationData {
  latitude: number
  longitude: number
  address?: string
  isWithinGeofence: boolean
  distanceFromOffice: number
  officeName?: string
  officeAddress?: string
}

export default function LocationClockIn({ isOpen, onClose, onSuccess }: LocationClockInProps) {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clockingIn, setClockingIn] = useState(false)

  useEffect(() => {
    if (isOpen) {
      getCurrentLocation()
    }
  }, [isOpen])

  const getCurrentLocation = () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          
          // Get location details and check geofence
          const response = await apiClient.post('/api/attendance/check-location', {
            latitude,
            longitude
          })

          if (response.data.success) {
            setLocation({
              latitude,
              longitude,
              ...response.data.data
            })
          }
        } catch (error: any) {
          setError('Failed to verify location')
          console.error('Location verification failed:', error)
        } finally {
          setLoading(false)
        }
      },
      (error) => {
        setError('Unable to get your location. Please enable location services.')
        setLoading(false)
        console.error('Geolocation error:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  const handleClockIn = async () => {
    if (!location) return

    setClockingIn(true)
    try {
      const response = await apiClient.post('/api/attendance/check-in', {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address
        }
      })

      if (response.data.success) {
        onSuccess(response.data.data)
        onClose()
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to clock in')
    } finally {
      setClockingIn(false)
    }
  }

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const isLate = () => {
    const now = new Date()
    const workStartTime = new Date()
    workStartTime.setHours(8, 0, 0, 0) // Assuming 8:00 AM start time
    return now > workStartTime
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <h2 className="font-semibold text-gray-900">Clock In</h2>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Map Area */}
        <div className="h-64 bg-gray-100 relative overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : location ? (
            <>
              {/* Simulated Map Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100">
                <div className="absolute inset-0 opacity-20">
                  <svg className="w-full h-full" viewBox="0 0 400 300">
                    <path d="M50 150 Q 200 50 350 150 T 350 250" stroke="#3B82F6" strokeWidth="2" fill="none" opacity="0.5" />
                    <path d="M0 200 Q 100 100 200 200 T 400 200" stroke="#10B981" strokeWidth="2" fill="none" opacity="0.5" />
                  </svg>
                </div>
              </div>
              
              {/* Location Markers */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  {/* Office Location */}
                  <div className="absolute -top-8 -left-4 bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium">
                    {location.distanceFromOffice}m
                  </div>
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Current Location */}
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2">
                <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
              </div>

              {/* Location Accuracy Circle */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-green-500 border-opacity-30 rounded-full"></div>
            </>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center">
                <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{error}</p>
                <button
                  onClick={getCurrentLocation}
                  className="mt-2 text-green-600 text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Time and Status */}
        <div className="p-4 text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {getCurrentTime()}
          </div>
          {isLate() && (
            <div className="text-sm text-red-500 mb-2">
              You are late. This is past the resumption grace period
            </div>
          )}
          
          {location && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
              <MapPin className="w-4 h-4" />
              <span>{location.officeName || 'Office Location'}</span>
            </div>
          )}
          
          {location?.officeAddress && (
            <div className="text-xs text-gray-500 mb-4">
              {location.officeAddress}
            </div>
          )}
        </div>

        {/* Clock In Button */}
        <div className="p-4">
          <button
            onClick={handleClockIn}
            disabled={!location || clockingIn}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-4 rounded-xl font-semibold text-lg transition-colors"
          >
            {clockingIn ? 'Clocking In...' : 'Clock In'}
          </button>
        </div>

        {error && (
          <div className="px-4 pb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}