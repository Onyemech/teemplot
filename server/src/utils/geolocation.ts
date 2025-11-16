/**
 * Geolocation utilities for attendance tracking
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = toRadians(point1.latitude);
  const φ2 = toRadians(point2.latitude);
  const Δφ = toRadians(point2.latitude - point1.latitude);
  const Δλ = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a point is within a circular geofence
 */
export function isWithinGeofence(
  userLocation: Coordinates,
  officeLocation: Coordinates,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(userLocation, officeLocation);
  return distance <= radiusMeters;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  return (
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

/**
 * Get location accuracy level
 */
export function getLocationAccuracy(accuracyMeters: number): 'high' | 'medium' | 'low' {
  if (accuracyMeters <= 10) return 'high';
  if (accuracyMeters <= 50) return 'medium';
  return 'low';
}

/**
 * Calculate bearing between two points (direction in degrees)
 */
export function calculateBearing(
  point1: Coordinates,
  point2: Coordinates
): number {
  const φ1 = toRadians(point1.latitude);
  const φ2 = toRadians(point2.latitude);
  const Δλ = toRadians(point2.longitude - point1.longitude);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;

  return bearing;
}

/**
 * Get cardinal direction from bearing
 */
export function getCardinalDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}
