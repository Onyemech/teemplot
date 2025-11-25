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
  placeholder = 'Start typing your street address...',
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
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)

  // Initialize Google Places API
  useEffect(() => {
    const initializeGooglePlaces = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        
        if (!apiKey) {
          setApiError('Google Maps API key not configured')
          return
        }

        // Load Google Maps script if not already loaded
        if (!window.google || !window.google.maps) {
          const script = document.createElement('script')
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
          script.async = true
          script.defer = true
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load Google Maps'))
            document.head.appendChild(script)
          })
        }

        // Initialize services
        if (window.google && window.google.maps && window.google.maps.places) {
          autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
          
          // Create a dummy div for PlacesService (required by Google API)
          const dummyDiv = document.createElement('div')
          placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
        }
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
        ? `${inputValue}, ${internalCity}` 
        : inputValue

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: searchQuery,
          types: ['address'],
          // No country restriction - allow global search
        },
        (results, status) => {
          setIsLoading(false)
          
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results as PlacePrediction[])
            setIsOpen(true)
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

    placesServiceRef.current.getDetails(
      {
        placeId,
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
        setIsLoading(false)

        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const addressData = extractAddressComponents(place)
          onChange(place.formatted_address || description, addressData)
        } else {
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

  if (apiError) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        {/* City Input */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            City/Area
          </label>
          <input
            type="text"
            value={internalCity}
            onChange={handleCityChange}
            placeholder="e.g., Lekki"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
          />
        </div>

        {/* Address Input */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Street Address
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
          />
        </div>
        
        <p className="mt-2 text-xs text-amber-600">
          ⚠️ Address search unavailable. Please enter address manually.
        </p>
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
          City/Area
        </label>
        <input
          type="text"
          value={internalCity}
          onChange={handleCityChange}
          placeholder="e.g., Lekki"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
        />
        <p className="mt-1 text-xs text-gray-500">
          Enter your city to get more accurate address suggestions
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
              placeholder={placeholder}
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
              ? `Showing addresses in ${internalCity}` 
              : 'Start typing to see address suggestions'}
          </p>
        )}
      </div>
    </div>
  )
}
