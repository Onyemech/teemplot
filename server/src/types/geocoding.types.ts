/**
 * Geocoding types for accurate location capture
 * Used during company onboarding to store precise coordinates
 * Enables geofencing for attendance without additional API calls
 */

export interface GeocodingResult {
  // Full formatted address from Google Places
  formattedAddress: string;
  
  // Address components
  streetNumber: string;
  streetName: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  
  // Precise coordinates for geofencing
  latitude: number;
  longitude: number;
  
  // Google Places unique identifier
  placeId: string;
  
  // Accuracy metadata
  accuracy?: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';
  source?: 'google_places' | 'google_geocoding' | 'manual';
}

export interface CompanyLocationData {
  // Legacy field (kept for backward compatibility)
  address?: string;
  
  // Detailed address components
  formattedAddress: string;
  streetNumber?: string;
  streetName?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  
  // Geofencing coordinates
  officeLatitude: number;
  officeLongitude: number;
  geofenceRadiusMeters?: number;
  
  // Google Places reference
  placeId: string;
  
  // Metadata
  geocodingAccuracy?: string;
  geocodingSource?: string;
  geocodedAt?: Date;
}

export interface GeofenceCheckResult {
  isWithinGeofence: boolean;
  distanceMeters: number;
  allowedRadiusMeters: number;
  employeeLocation: {
    latitude: number;
    longitude: number;
  };
  officeLocation: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Google Places Autocomplete response structure
 */
export interface GooglePlacesResult {
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    location_type: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';
  };
  place_id: string;
  types: string[];
}
