import { logger } from '../utils/logger';

export interface AddressValidationRequest {
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  placeId: string;
  formattedAddress: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  issues: string[];
  warnings: string[];
  normalizedAddress: {
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    formattedAddress: string;
  };
  metadata: {
    hasStreetNumber: boolean;
    hasStreetName: boolean;
    hasCity: boolean;
    hasState: boolean;
    hasCountry: boolean;
    hasCoordinates: boolean;
    hasPlaceId: boolean;
    coordinateAccuracy: 'precise' | 'approximate' | 'unknown';
  };
}

class AddressValidationService {
  /**
   * Validate address completeness and quality
   */
  async validateAddress(request: AddressValidationRequest): Promise<AddressValidationResult> {
    const issues: string[] = [];
    const warnings: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'high';

    // Check mandatory fields
    const hasStreetAddress = this.validateStreetAddress(request.streetAddress);
    const hasCity = this.validateCity(request.city);
    const hasState = this.validateState(request.state);
    const hasCountry = this.validateCountry(request.country);
    const hasCoordinates = this.validateCoordinates(request.latitude, request.longitude);
    const hasPlaceId = this.validatePlaceId(request.placeId);

    // Street address validation
    if (!hasStreetAddress.isValid) {
      issues.push(hasStreetAddress.message);
      confidence = 'low';
    } else if (hasStreetAddress.warning) {
      warnings.push(hasStreetAddress.warning);
      if (confidence === 'high') confidence = 'medium';
    }

    // City validation
    if (!hasCity.isValid) {
      issues.push(hasCity.message);
      confidence = 'low';
    }

    // State validation
    if (!hasState.isValid) {
      issues.push(hasState.message);
      if (confidence === 'high') confidence = 'medium';
    }

    // Country validation
    if (!hasCountry.isValid) {
      issues.push(hasCountry.message);
      confidence = 'low';
    }

    if (!hasCoordinates.isValid) {
      issues.push(hasCoordinates.message);
      confidence = 'low';
    }

    if (!hasPlaceId.isValid) {
      warnings.push(hasPlaceId.message);
      if (confidence === 'high') confidence = 'medium';
    }

    // Postal code (optional but recommended)
    if (!request.postalCode || request.postalCode.trim().length === 0) {
      warnings.push('Postal code is missing (optional but recommended for precise location)');
    }

    const normalizedAddress = this.normalizeAddress(request);

    const coordinateAccuracy = this.determineCoordinateAccuracy(
      hasStreetAddress.hasNumber,
      hasPlaceId.isValid,
      request.postalCode
    );

    const result: AddressValidationResult = {
      isValid: issues.length === 0,
      confidence,
      issues,
      warnings,
      normalizedAddress,
      metadata: {
        hasStreetNumber: hasStreetAddress.hasNumber,
        hasStreetName: hasStreetAddress.hasName,
        hasCity: hasCity.isValid,
        hasState: hasState.isValid,
        hasCountry: hasCountry.isValid,
        hasCoordinates: hasCoordinates.isValid,
        hasPlaceId: hasPlaceId.isValid,
        coordinateAccuracy
      }
    };

    logger.info({
      isValid: result.isValid,
      confidence: result.confidence,
      issueCount: issues.length,
      warningCount: warnings.length,
      city: request.city,
      country: request.country
    }, 'Address validation completed');

    return result;
  }

 
  private validateStreetAddress(streetAddress: string): {
    isValid: boolean;
    hasNumber: boolean;
    hasName: boolean;
    message: string;
    warning?: string;
  } {
    if (!streetAddress || streetAddress.trim().length === 0) {
      return {
        isValid: false,
        hasNumber: false,
        hasName: false,
        message: 'Street address is required'
      };
    }

    const trimmed = streetAddress.trim();

    const hasNumber = /\d+/.test(trimmed);
    
    const hasName = trimmed.replace(/\d+/g, '').trim().length > 2;

    if (!hasNumber) {
      return {
        isValid: true,
        hasNumber: false,
        hasName,
        message: '',
        warning: 'Street address does not contain a number (e.g., "No 18"). This may reduce location accuracy.'
      };
    }

    if (!hasName) {
      return {
        isValid: false,
        hasNumber,
        hasName: false,
        message: 'Street address must include a street name, not just a number'
      };
    }

    return {
      isValid: true,
      hasNumber: true,
      hasName: true,
      message: ''
    };
  }

  
  private validateCity(city: string): { isValid: boolean; message: string } {
    if (!city || city.trim().length === 0) {
      return {
        isValid: false,
        message: 'City is required'
      };
    }

    if (city.trim().length < 2) {
      return {
        isValid: false,
        message: 'City name is too short'
      };
    }

    return { isValid: true, message: '' };
  }

  private validateState(state: string): { isValid: boolean; message: string } {
    if (!state || state.trim().length === 0) {
      return {
        isValid: false,
        message: 'State/Province is required'
      };
    }

    return { isValid: true, message: '' };
  }

  /**
   * Validate country
   */
  private validateCountry(country: string): { isValid: boolean; message: string } {
    if (!country || country.trim().length === 0) {
      return {
        isValid: false,
        message: 'Country is required'
      };
    }

    return { isValid: true, message: '' };
  }

  /**
   * Validate coordinates
   */
  private validateCoordinates(latitude: number, longitude: number): {
    isValid: boolean;
    message: string;
  } {
    if (!latitude || !longitude) {
      return {
        isValid: false,
        message: 'Latitude and longitude are required'
      };
    }

    // Check if coordinates are valid ranges
    if (latitude < -90 || latitude > 90) {
      return {
        isValid: false,
        message: 'Invalid latitude (must be between -90 and 90)'
      };
    }

    if (longitude < -180 || longitude > 180) {
      return {
        isValid: false,
        message: 'Invalid longitude (must be between -180 and 180)'
      };
    }

    // Check if coordinates are not just zeros (common error)
    if (latitude === 0 && longitude === 0) {
      return {
        isValid: false,
        message: 'Invalid coordinates (0, 0) - location not properly geocoded'
      };
    }

    return { isValid: true, message: '' };
  }

  /**
   * Validate place ID
   */
  private validatePlaceId(placeId: string): { isValid: boolean; message: string } {
    if (!placeId || placeId.trim().length === 0) {
      return {
        isValid: false,
        message: 'Place ID is missing - address may not be from Google Places'
      };
    }

    return { isValid: true, message: '' };
  }

  /**
   * Normalize address format
   */
  private normalizeAddress(request: AddressValidationRequest) {
    return {
      streetAddress: this.normalizeText(request.streetAddress),
      city: this.normalizeText(request.city),
      state: this.normalizeText(request.state),
      country: this.normalizeText(request.country),
      postalCode: request.postalCode?.trim() || '',
      formattedAddress: request.formattedAddress.trim()
    };
  }

  /**
   * Normalize text (trim, proper case)
   */
  private normalizeText(text: string): string {
    if (!text) return '';
    
    return text
      .trim()
      .split(' ')
      .map(word => {
        // Keep acronyms uppercase (e.g., "VI" for Victoria Island)
        if (word.length <= 3 && word === word.toUpperCase()) {
          return word;
        }
        // Proper case for other words
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Determine coordinate accuracy level
   */
  private determineCoordinateAccuracy(
    hasStreetNumber: boolean,
    hasPlaceId: boolean,
    postalCode?: string
  ): 'precise' | 'approximate' | 'unknown' {
    // Precise: has street number + place ID + postal code
    if (hasStreetNumber && hasPlaceId && postalCode) {
      return 'precise';
    }

    // Approximate: has place ID but missing some details
    if (hasPlaceId) {
      return 'approximate';
    }

    // Unknown: missing critical data
    return 'unknown';
  }

  /**
   * Batch validate multiple addresses
   */
  async validateAddressBatch(
    addresses: AddressValidationRequest[]
  ): Promise<AddressValidationResult[]> {
    const results: AddressValidationResult[] = [];

    for (const address of addresses) {
      try {
        const result = await this.validateAddress(address);
        results.push(result);
      } catch (error: any) {
        logger.error({ error, address }, 'Failed to validate address in batch');
        // Return invalid result for failed validation
        results.push({
          isValid: false,
          confidence: 'low',
          issues: ['Validation failed: ' + error.message],
          warnings: [],
          normalizedAddress: {
            streetAddress: address.streetAddress,
            city: address.city,
            state: address.state,
            country: address.country,
            postalCode: address.postalCode || '',
            formattedAddress: address.formattedAddress
          },
          metadata: {
            hasStreetNumber: false,
            hasStreetName: false,
            hasCity: false,
            hasState: false,
            hasCountry: false,
            hasCoordinates: false,
            hasPlaceId: false,
            coordinateAccuracy: 'unknown'
          }
        });
      }
    }

    return results;
  }
}

export const addressValidationService = new AddressValidationService();
