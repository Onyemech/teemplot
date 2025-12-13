import { useState, useEffect } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import { apiClient } from '@/lib/api'
import GoogleMapLocation from '@/components/maps/GoogleMapLocation'

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
        <div className="h-64 relative overflow-hidden">
          {loading ? (
            <div className="bg-gray-100 h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Getting your location...</p>
              </div>
            </div>
          ) : location ? (
            <GoogleMapLocation
              locations={[
                {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  address: location.address || 'Your Location',
                  timestamp: new Date().toISOString()
                }
              ]}
              centerLocation={{
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.officeName || 'Office Location'
              }}
              height="256px"
              showControls={false}
            />
          ) : error ? (
            <div className="bg-gray-100 h-full flex items-center justify-center p-4">
              <div className="text-center">
                <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{error}</p>
                <button
                  onClick={getCurrentLocation}
                  className="mt-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 h-full flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Tap to get location</p>
              </div>
            </div>
          )}
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
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white py-3 rounded-xl font-medium text-lg shadow-md hover:shadow-lg transition-all duration-200"
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