import { Client } from '@googlemaps/google-maps-services-js';
import { GeocodingResult, GooglePlacesResult } from '../types/geocoding.types';

export class GeocodingService {
  private client: Client;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️  GOOGLE_MAPS_API_KEY not set. Geocoding will fail.');
    }
    
    this.client = new Client({});
  }

  /**
   * Geocode an address using Google Places API
   * This should ONLY be called during company onboarding
   * 
   * @param address - Full address string (e.g., "123 Victoria Island Road, Lagos, Nigeria")
   * @returns Detailed geocoding result with coordinates
   */
  async geocodeAddress(address: string): Promise<GeocodingResult> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await this.client.geocode({
        params: {
          address,
          key: this.apiKey,
          region: 'ng', 
        },
      });

      if (response.data.status !== 'OK' || response.data.results.length === 0) {
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }

      const result = response.data.results[0];
      
      return this.parseGeocodingResult(result);
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error('Failed to geocode address. Please verify the address is correct.');
    }
  }

  /**
   * Verify a Place ID and get detailed information
   * Useful when user selects from autocomplete
   * 
   * @param placeId - Google Places ID
   * @returns Detailed geocoding result
   */
  async getPlaceDetails(placeId: string): Promise<GeocodingResult> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await this.client.placeDetails({
        params: {
          place_id: placeId,
          key: this.apiKey,
          fields: [
            'formatted_address',
            'address_components',
            'geometry',
            'place_id',
          ],
        },
      });

      if (response.data.status !== 'OK' || !response.data.result) {
        throw new Error(`Place details failed: ${response.data.status}`);
      }

      return this.parseGeocodingResult(response.data.result as any);
    } catch (error) {
      console.error('Place details error:', error);
      throw new Error('Failed to get place details.');
    }
  }


  private parseGeocodingResult(result: any): GeocodingResult {
    const components = result.address_components || [];
    
    const streetNumber = this.getAddressComponent(components, 'street_number');
    const route = this.getAddressComponent(components, 'route');
    const locality = this.getAddressComponent(components, 'locality');
    const adminLevel2 = this.getAddressComponent(components, 'administrative_area_level_2');
    const adminLevel1 = this.getAddressComponent(components, 'administrative_area_level_1');
    const country = this.getAddressComponent(components, 'country');
    const postalCode = this.getAddressComponent(components, 'postal_code');

    return {
      formattedAddress: result.formatted_address || '',
      streetNumber: streetNumber || '',
      streetName: route || '',
      city: locality || adminLevel2 || '',
      state: adminLevel1 || '',
      country: country || '',
      postalCode: postalCode || '',
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      placeId: result.place_id || '',
      accuracy: result.geometry.location_type || 'APPROXIMATE',
      source: 'google_places',
    };
  }


  private getAddressComponent(components: any[], type: string): string {
    const component = components.find((c) => c.types.includes(type));
    return component?.long_name || '';
  }

  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const EarthRadius = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EarthRadius * c; 
  
  }


  static checkGeofence(
    employeeLat: number,
    employeeLon: number,
    officeLat: number,
    officeLon: number,
    radiusMeters: number = 100
  ): { isWithin: boolean; distance: number } {
    const distance = this.calculateDistance(
      officeLat,
      officeLon,
      employeeLat,
      employeeLon
    );

    return {
      isWithin: distance <= radiusMeters,
      distance: Math.round(distance),
    };
  }

  /**
   * Validate coordinates are within reasonable bounds
   */
  static validateCoordinates(lat: number, lon: number): boolean {
    return (
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180 &&
      !isNaN(lat) &&
      !isNaN(lon)
    );
  }
}
