// Maximum distance (in meters) a user can be from a facility to check in
export const MAX_CHECKIN_DISTANCE_METERS = 500;

/**
 * Calculate the distance between two GPS coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if the given coordinates are within the allowed check-in radius of a facility.
 * Returns { allowed: true } if within range, or { allowed: false, distance } if too far.
 * If the facility has no GPS coordinates set, verification is skipped (allowed).
 */
export function verifyCheckInProximity(
  userLat: number,
  userLon: number,
  facilityLat: number | null | undefined,
  facilityLon: number | null | undefined
): { allowed: true } | { allowed: false; distance: number } {
  // If facility doesn't have coordinates, skip verification
  if (facilityLat == null || facilityLon == null) {
    return { allowed: true };
  }

  const distance = haversineDistance(userLat, userLon, facilityLat, facilityLon);

  if (distance <= MAX_CHECKIN_DISTANCE_METERS) {
    return { allowed: true };
  }

  return { allowed: false, distance: Math.round(distance) };
}
