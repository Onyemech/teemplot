import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation } from 'lucide-react'

interface LocationData {
  latitude: number
  longitude: number
  address?: string
  timestamp?: string
  accuracy?: number
}

interface GoogleMapLocationProps {
  locations: LocationData[]
  centerLocation?: LocationData
  height?: string
  showControls?: boolean
  onLocationSelect?: (location: LocationData) => void
}

export default function GoogleMapLocation({
  locations,
  centerLocation,
  height = '400px',
  showControls = true,
  onLocationSelect
}: GoogleMapLocationProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)

  // Initialize Google Maps
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current) return

      const center = centerLocation || locations[0] || { latitude: 6.5244, longitude: 3.3792 } // Lagos, Nigeria default

      const mapInstance = new google.maps.Map(mapRef.current, {
        zoom: 15,
        center: { lat: center.latitude, lng: center.longitude },
        mapTypeControl: showControls,
        streetViewControl: showControls,
        fullscreenControl: showControls,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      })

      setMap(mapInstance)
      setIsLoaded(true)
    }

    // Load Google Maps script if not already loaded
    if (!window.google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = initMap
      document.head.appendChild(script)
    } else {
      initMap()
    }
  }, [centerLocation, showControls])

  // Add markers for locations
  useEffect(() => {
    if (!map || !isLoaded) return

    // Clear existing markers
    // Note: In a real implementation, you'd want to track markers to clear them

    locations.forEach((location, index) => {
      const marker = new google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: map,
        title: location.address || `Location ${index + 1}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#0F5D5D"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <circle cx="16" cy="16" r="4" fill="#0F5D5D"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      })

      // Add click listener
      marker.addListener('click', () => {
        if (onLocationSelect) {
          onLocationSelect(location)
        }
        
        // Show info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <div class="font-semibold text-gray-900">${location.address || 'Clock-in Location'}</div>
              <div class="text-sm text-gray-600">
                ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
              </div>
              ${location.timestamp ? `
                <div class="text-xs text-gray-500 mt-1">
                  ${new Date(location.timestamp).toLocaleString()}
                </div>
              ` : ''}
            </div>
          `
        })
        
        infoWindow.open(map, marker)
      })
    })

    // Add office location marker if provided
    if (centerLocation) {
      new google.maps.Marker({
        position: { lat: centerLocation.latitude, lng: centerLocation.longitude },
        map: map,
        title: 'Office Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2L35 12V35H5V12L20 2Z" fill="#0F5D5D"/>
              <rect x="12" y="18" width="4" height="4" fill="white"/>
              <rect x="24" y="18" width="4" height="4" fill="white"/>
              <rect x="18" y="25" width="4" height="10" fill="white"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 35)
        }
      })

      // Add geofence circle
      new google.maps.Circle({
        strokeColor: '#0F5D5D',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#0F5D5D',
        fillOpacity: 0.1,
        map: map,
        center: { lat: centerLocation.latitude, lng: centerLocation.longitude },
        radius: 100 // 100 meters radius
      })
    }
  }, [map, isLoaded, locations, centerLocation, onLocationSelect])

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          }
          setCurrentLocation(location)
          
          if (map) {
            map.setCenter({ lat: location.latitude, lng: location.longitude })
            
            // Add current location marker
            new google.maps.Marker({
              position: { lat: location.latitude, lng: location.longitude },
              map: map,
              title: 'Your Current Location',
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#3B82F6"/>
                    <circle cx="12" cy="12" r="4" fill="white"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 12)
              }
            })
          }
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }

  if (!isLoaded) {
    return (
      <div 
        className="bg-gray-100 rounded-xl flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div 
        ref={mapRef}
        className="w-full rounded-xl overflow-hidden shadow-lg"
        style={{ height }}
      />
      
      {showControls && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            onClick={getCurrentLocation}
            className="bg-white hover:bg-gray-50 p-2 rounded-lg shadow-md border border-gray-200 transition-colors"
            title="Get current location"
          >
            <Navigation className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* Location Info Panel */}
      {currentLocation && (
        <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg border border-gray-100 p-4 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-medium text-gray-900">Current Location</span>
          </div>
          <div className="text-sm text-gray-600">
            {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </div>
          {currentLocation.accuracy && (
            <div className="text-xs text-gray-500 mt-1">
              Accuracy: ±{Math.round(currentLocation.accuracy)}m
            </div>
          )}
        </div>
      )}
    </div>
  )
}