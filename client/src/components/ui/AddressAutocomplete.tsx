import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

/**
 * Address data structure with geocoding information
 * This is captured ONCE during onboarding and stored permanently
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
}

/**
 * Google Places Autocomplete Component
 * 
 * Strategy:
 * - Uses Google Places API for accurate address capture
 * - ONE API call per company during onboarding
 * - Captures precise coordinates for geofencing
 * - Stores all data permanently - NO MORE API CALLS NEEDED
 */
export default function AddressAutocomplete({
  value,
  onChange,
  label,
  placeholder = 'Start typing your business address...',
  required = false,
  error,
  className = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    const initializeAutocomplete = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        
        if (!apiKey) {
          setApiError('Google Maps API key not configured')
          setIsLoading(false)
          return
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places']
        })

        await loader.load()
        setIsLoading(false)

        if (inputRef.current) {
          // Initialize autocomplete with business-focused options
          autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
            types: ['establishment', 'geocode'],
            componentRestrictions: { country: 'ng' }, // Restrict to Nigeria
            fields: [
              'address_components',
              'formatted_address',
              'geometry.location',
              'geometry.location_type',
              'place_id',
              'name'
            ]
          })

          // Listen for place selection
          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace()
            
            if (place && place.geometry && place.geometry.location) {
              const addressData = extractAddressComponents(place)
              onChange(place.formatted_address || '', addressData)
            }
          })
        }
      } catch (error) {
        console.error('Failed to load Google Maps:', error)
        setApiError('Failed to load address autocomplete')
        setIsLoading(false)
      }
    }

    initializeAutocomplete()

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [])

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  if (isLoading) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
          <span className="text-gray-500 text-sm">Loading address search...</span>
        </div>
      </div>
    )
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
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
        />
        <p className="mt-1 text-xs text-amber-600">
          ⚠️ Address autocomplete unavailable. Please enter address manually.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 border rounded-lg
            transition-all duration-200
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
            }
            focus:outline-none
            placeholder-gray-400
          `}
        />
        
        {/* Google Places Attribution */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <img 
            src="https://developers.google.com/maps/documentation/places/web-service/images/powered_by_google_on_white.png" 
            alt="Powered by Google"
            className="h-4 opacity-70"
          />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      
      {!error && (
        <p className="mt-1 text-xs text-gray-500">
          Start typing your business address for suggestions
        </p>
      )}
    </div>
  )
}
