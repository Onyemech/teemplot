import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

/**
 * Address data structure with geocoding information
 */
export interface AddressData {
  fullAddress: string
  formattedAddress: string
  streetNumber: string
  streetName: string
  city: string
  state: string
  country: string
  postalCode: string
  latitude: number
  longitude: number
  placeId: string
  accuracy?: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string, addressData?: AddressData) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  className?: string
  cityValue?: string
  onCityChange?: (city: string) => void
}

interface PlacePrediction {
  description: string
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

/**
 * Simple Address Autocomplete with City Input
 * User types city name → Shows address suggestions → Select → Capture coordinates
 */
export default function AddressAutocomplete({
  value,
  onChange,
  label,
  placeholder = 'e.g., No 18 Admiralty Way',
  required = false,
  error,
  className = '',
  cityValue = '',
  onCityChange,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [internalCity, setInternalCity] = useState(cityValue)
  const [useFallbackMode, setUseFallbackMode] = useState(false)
  const [quotaExceeded, setQuotaExceeded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

  // Initialize Google Places API
  useEffect(() => {
    const initializeGooglePlaces = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        
        if (!apiKey) {
          setApiError('Google Maps API key not configured')
          return
        }

        // Check if Google Maps is already loaded
        if (window.google?.maps?.places) {
          // Already loaded, initialize immediately
          autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
          const dummyDiv = document.createElement('div')
          placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
          return
        }

        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
        if (existingScript) {
          // Wait for existing script to load
          const waitForGoogle = setInterval(() => {
            if (window.google?.maps?.places) {
              clearInterval(waitForGoogle)
              autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
              const dummyDiv = document.createElement('div')
              placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
              sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
            }
          }, 100)
          
          // Timeout after 10 seconds
          setTimeout(() => clearInterval(waitForGoogle), 10000)
          return
        }

        // Load Google Maps script
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=Function.prototype`
        script.async = true
        script.defer = true
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => {
            // Wait for Google Maps to fully initialize
            const checkGoogle = setInterval(() => {
              if (window.google?.maps?.places) {
                clearInterval(checkGoogle)
                autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
                const dummyDiv = document.createElement('div')
                placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
                sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
                resolve()
              }
            }, 50)
            
            // Timeout after 5 seconds
            setTimeout(() => {
              clearInterval(checkGoogle)
              if (!window.google?.maps?.places) {
                reject(new Error('Google Maps loaded but places not available'))
              }
            }, 5000)
          }
          script.onerror = () => reject(new Error('Failed to load Google Maps'))
          document.head.appendChild(script)
        })
      } catch (error) {
        console.error('Failed to initialize Google Places:', error)
        setApiError('Failed to load address search')
      }
    }

    initializeGooglePlaces()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle city input change
  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const city = e.target.value
    setInternalCity(city)
    if (onCityChange) {
      onCityChange(city)
    }
  }

  // Handle use current location
  const handleUseCurrentLocation = () => {
    // Check if geolocation is supported
    if (!('geolocation' in navigator)) {
      alert('❌ Location services not supported\n\nYour browser doesn\'t support location services. Please:\n1. Use a modern browser (Chrome, Firefox, Safari)\n2. Or enter your address manually above')
      return
    }

    setIsLoading(true)

    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        const { latitude, longitude, accuracy } = position.coords

        // Check if we have Google Geocoder available
        if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
          setIsLoading(false)
          alert('❌ Geocoding service unavailable\n\nCannot convert your location to an address. Please enter your address manually.')
          return
        }

        // Reverse geocode to get readable address
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            setIsLoading(false)

            if (status === 'OK' && results && results[0]) {
              const place = results[0]
              const addressData = extractAddressComponents(place)
              
              // Update city field if available
              if (addressData.city && onCityChange) {
                setInternalCity(addressData.city)
                onCityChange(addressData.city)
              }
              
              // Update with current location
              onChange(place.formatted_address, {
                ...addressData,
                latitude,
                longitude,
                accuracy: accuracy < 100 ? 'ROOFTOP' : 'APPROXIMATE'
              })

              // Show success message
              alert(`✅ Location captured successfully!\n\nAddress: ${place.formatted_address}\nCity: ${addressData.city || 'N/A'}\nAccuracy: ${Math.round(accuracy)}m\n\nYour office location has been set for attendance tracking.`)
            } else {
              alert('❌ Could not determine address\n\nWe got your coordinates but couldn\'t convert them to an address. Please:\n1. Try again\n2. Or enter your address manually')
            }
          }
        )
      },
      // Error callback
      (error) => {
        setIsLoading(false)

        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('❌ Location access denied\n\nTo use your current location:\n\n1. Click the location icon in your browser\'s address bar\n2. Select "Allow" for location access\n3. Refresh the page and try again\n\nOr enter your address manually above.')
            break
          
          case error.POSITION_UNAVAILABLE:
            alert('❌ Location unavailable\n\nYour device couldn\'t determine your location. Please:\n\n1. Check if location services are enabled on your device\n2. Make sure you have GPS/Wi-Fi enabled\n3. Try again or enter your address manually')
            break
          
          case error.TIMEOUT:
            alert('❌ Location request timed out\n\nTaking too long to get your location. Please:\n\n1. Check your internet connection\n2. Make sure location services are enabled\n3. Try again or enter your address manually')
            break
          
          default:
            alert('❌ Location error\n\nSomething went wrong getting your location. Please:\n\n1. Check your browser settings\n2. Make sure location is enabled\n3. Try again or enter your address manually')
        }
      },
      // Options
      {
        enableHighAccuracy: true, // Use GPS for better accuracy
        timeout: 15000, // 15 seconds timeout
        maximumAge: 0 // Don't use cached position
      }
    )
  }

  // Fetch predictions as user types - biased by city
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    onChange(inputValue)

    if (!inputValue.trim() || inputValue.length < 2) {
      setPredictions([])
      setIsOpen(false)
      return
    }

    if (!autocompleteServiceRef.current) {
      return
    }

    setIsLoading(true)

    try {
      // Build search query - combine city with address input for better results
      const searchQuery = internalCity 
        ? `${inputValue}, ${internalCity}, Nigeria` 
        : `${inputValue}, Nigeria`

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: searchQuery,
          componentRestrictions: { country: 'ng' },
          // Use locationBias for softer preference (not hard restriction)
          locationBias: new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(6.2, 2.7),  // Southwest Nigeria (wider area)
            new window.google.maps.LatLng(7.0, 4.0)   // Northeast (covers more of Lagos/Ogun)
          ),
          sessionToken: sessionTokenRef.current || undefined,
        },
        (results, status) => {
          setIsLoading(false)
          
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results as PlacePrediction[])
            setIsOpen(true)
            setQuotaExceeded(false) // Reset quota flag on success
          } else if (
            status === window.google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT ||
            status === window.google.maps.places.PlacesServiceStatus.REQUEST_DENIED
          ) {
            // Google API quota exceeded or denied - switch to fallback mode
            console.warn('Google Places API limit reached, switching to manual input mode')
            setUseFallbackMode(true)
            setQuotaExceeded(true)
            setPredictions([])
            setIsOpen(false)
          } else {
            setPredictions([])
            setIsOpen(false)
          }
        }
      )
    } catch (error) {
      console.error('Error fetching predictions:', error)
      setIsLoading(false)
      setPredictions([])
    }
  }

  // Handle place selection
  const handleSelectPlace = (placeId: string, description: string) => {
    if (!placesServiceRef.current) return

    setIsLoading(true)
    setIsOpen(false)
    setPredictions([]) // Clear predictions immediately

    placesServiceRef.current.getDetails(
      {
        placeId,
        // Use the same session token for getDetails to complete the session
        sessionToken: sessionTokenRef.current || undefined,
        fields: [
          'address_components',
          'formatted_address',
          'geometry.location',
          'geometry.location_type',
          'place_id',
          'name'
        ]
      },
      (place, status) => {
        setIsLoading(false) // Stop loading

        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const addressData = extractAddressComponents(place)
          onChange(place.formatted_address || description, addressData)
          
          // Regenerate session token after completing a session
          if (window.google && window.google.maps && window.google.maps.places) {
            sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
          }
        } else {
          setIsLoading(false) // Ensure loading stops on error too
          onChange(description)
        }
      }
    )
  }

  const extractAddressComponents = (place: google.maps.places.PlaceResult): AddressData => {
    const components = place.address_components || []
    
    let streetNumber = ''
    let streetName = ''
    let city = ''
    let state = ''
    let country = ''
    let postalCode = ''

    components.forEach((component: google.maps.GeocoderAddressComponent) => {
      const types = component.types
      
      if (types.includes('street_number')) {
        streetNumber = component.long_name
      }
      if (types.includes('route')) {
        streetName = component.long_name
      }
      if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        city = component.long_name
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.long_name
      }
      if (types.includes('country')) {
        country = component.long_name
      }
      if (types.includes('postal_code')) {
        postalCode = component.long_name
      }
    })

    // IMPROVED: Extract street number from formatted address if not found in components
    // This is common in Nigeria where Google doesn't always separate street numbers
    if (!streetNumber && place.formatted_address) {
      const addressParts = place.formatted_address.split(',')[0].trim()
      // Try to extract number from beginning of address (e.g., "18 Admiralty Way" -> "18")
      const numberMatch = addressParts.match(/^(\d+[A-Za-z]?)\s/)
      if (numberMatch) {
        streetNumber = numberMatch[1]
        // Remove the number from street name if it was included
        if (streetName && streetName.startsWith(streetNumber)) {
          streetName = streetName.substring(streetNumber.length).trim()
        }
      }
      
      // If street name is empty but we have the first part of address, use it
      if (!streetName && addressParts) {
        // Remove the street number we just extracted
        streetName = addressParts.replace(/^\d+[A-Za-z]?\s/, '').trim()
      }
    }

    // Log for debugging (remove in production)
    console.log('📍 Address Components:', {
      streetNumber,
      streetName,
      city,
      state,
      country,
      formattedAddress: place.formatted_address
    })

    return {
      fullAddress: place.formatted_address || '',
      formattedAddress: place.formatted_address || '',
      streetNumber,
      streetName,
      city,
      state,
      country,
      postalCode,
      latitude: place.geometry?.location?.lat() || 0,
      longitude: place.geometry?.location?.lng() || 0,
      placeId: place.place_id || '',
      accuracy: (place.geometry as any)?.location_type || 'APPROXIMATE'
    }
  }

  // Fallback mode - Manual input when API fails or quota exceeded
  if (apiError || useFallbackMode) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        {/* Fallback Mode Warning */}
        {quotaExceeded && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start justify-between">
              <p className="text-xs text-amber-800 flex-1">
                ⚠️ <strong>Address autocomplete temporarily unavailable</strong> (API limit reached). 
                Please enter your address manually below.
              </p>
              <button
                type="button"
                onClick={() => {
                  setUseFallbackMode(false)
                  setQuotaExceeded(false)
                }}
                className="ml-2 text-xs text-amber-700 hover:text-amber-900 underline whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* City Input */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            City/Area <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={internalCity}
            onChange={handleCityChange}
            placeholder="e.g., Lekki, Victoria Island, Ikeja"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            required
          />
        </div>

        {/* Address Input */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            required
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Enter your complete street address (e.g., No 18 Admiralty Way)
          </p>
        </div>
        
        {!quotaExceeded && (
          <p className="mt-2 text-xs text-amber-600">
            ⚠️ Address search unavailable. Please enter address manually.
          </p>
        )}
        
        {/* Manual Geocoding Note */}
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            💡 <strong>Note:</strong> You'll need to provide GPS coordinates manually or we'll use the city center as approximate location.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* City Input Field */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          City/Area <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={internalCity}
          onChange={handleCityChange}
          placeholder="e.g., Lekki, Victoria Island, Ikeja, Ikoyi, Surulere"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          💡 <strong>Enter your city/area first</strong> (e.g., "Lekki" or "Victoria Island") for accurate Nigerian address suggestions
        </p>
      </div>

      {/* Address Input Field with Autocomplete */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Street Address
        </label>
        <div className="relative">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleInputChange}
              onFocus={() => {
                if (predictions.length > 0) {
                  setIsOpen(true)
                }
              }}
              placeholder="e.g., 18 Admiralty Way, 23 Adeola Odeku Street, Plot 1234 Adetokunbo Ademola"
              className={`
                w-full pl-10 pr-10 py-2.5 border rounded-lg
                transition-all duration-200
                ${error
                  ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                }
                focus:outline-none
                placeholder-gray-400
              `}
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary-500 animate-spin" />
            )}
          </div>

          {/* Custom Dropdown - Same style as industry dropdown */}
          {isOpen && predictions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              {predictions.map((prediction) => (
                <button
                  key={prediction.place_id}
                  type="button"
                  onClick={() => handleSelectPlace(prediction.place_id, prediction.description)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {prediction.structured_formatting.main_text}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {prediction.structured_formatting.secondary_text}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-sm text-red-600">
            {error}
          </p>
        )}
        
        {!error && !apiError && (
          <p className="mt-1.5 text-xs text-gray-500">
            {internalCity 
              ? `✅ Showing addresses in ${internalCity}, Nigeria. Type your street number and name.` 
              : '⚠️ Please enter city/area above first, then type your street address here'}
          </p>
        )}

        {/* Use Current Location Button - Shows when no predictions and user has typed enough */}
        {!isLoading && predictions.length === 0 && value.length > 5 && !useFallbackMode && (
          <div className="mt-3 space-y-2">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                💡 <strong>At the office?</strong> Click below to use your current GPS location for accurate attendance tracking.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-primary-600 bg-white hover:bg-primary-50 border border-primary-300 rounded-lg transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" />
              Use my current location
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
