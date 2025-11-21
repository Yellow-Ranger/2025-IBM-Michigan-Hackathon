/**
 * Calculate which segment (0-23) a heading belongs to
 */
export function headingToSegment(
  heading: number,
  totalSegments: number = 24
): number {
  const segmentSize = 360 / totalSegments;
  return Math.floor(heading / segmentSize) % totalSegments;
}

/**
 * Normalize heading to 0-360 range
 */
export function normalizeHeading(heading: number | null): number | null {
  if (heading === null || Number.isNaN(heading)) return null;
  let normalized = heading % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

/**
 * Check if pitch is in target range for ceiling capture
 */
export function isInCeilingRange(pitch: number | null): boolean {
  if (pitch === null) return false;
  return pitch >= 45 && pitch <= 60;
}

/**
 * Check if pitch is in target range for floor capture
 */
export function isInFloorRange(pitch: number | null): boolean {
  if (pitch === null) return false;
  return pitch >= -60 && pitch <= -45;
}

/**
 * Calculate rotation speed (degrees per second)
 */
export function calculateRotationSpeed(
  previousHeading: number,
  currentHeading: number,
  deltaTime: number
): number {
  const diff = Math.abs(currentHeading - previousHeading);
  // Handle wrap-around (e.g., 359 -> 1)
  const actualDiff = diff > 180 ? 360 - diff : diff;
  return (actualDiff / deltaTime) * 1000; // Convert to degrees per second
}

/**
 * Check if rotation speed is acceptable (not too fast)
 */
export function isSpeedAcceptable(degreesPerSecond: number): boolean {
  const MAX_SPEED = 120; // degrees per second (increased for easier capture)
  return degreesPerSecond <= MAX_SPEED;
}
