// Great-circle math for realistic flight position interpolation.
// All angles internally in radians, exposed in degrees.

const R_EARTH_KM = 6371.0088;

export function toRad(d: number) {
  return (d * Math.PI) / 180;
}
export function toDeg(r: number) {
  return (r * 180) / Math.PI;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Distance between two coordinates in kilometers (Haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const dφ = toRad(b.lat - a.lat);
  const dλ = toRad(b.lng - a.lng);
  const s =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R_EARTH_KM * c;
}

/** Initial bearing (forward azimuth) from a to b, in degrees [0..360). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

/**
 * Intermediate point along the great-circle path from a to b at fraction f (0..1).
 * Uses spherical linear interpolation.
 */
export function interpolateGreatCircle(
  a: LatLng,
  b: LatLng,
  f: number,
): LatLng {
  const d = distanceKm(a, b) / R_EARTH_KM; // angular distance, radians
  if (d === 0) return { lat: a.lat, lng: a.lng };
  const sinD = Math.sin(d);
  const A = Math.sin((1 - f) * d) / sinD;
  const B = Math.sin(f * d) / sinD;

  const φ1 = toRad(a.lat);
  const λ1 = toRad(a.lng);
  const φ2 = toRad(b.lat);
  const λ2 = toRad(b.lng);

  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);

  const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λi = Math.atan2(y, x);
  return { lat: toDeg(φi), lng: toDeg(λi) };
}

/** Sample N+1 points along the great-circle arc, inclusive of endpoints. */
export function sampleGreatCircle(a: LatLng, b: LatLng, n = 64): LatLng[] {
  const out: LatLng[] = [];
  for (let i = 0; i <= n; i++) out.push(interpolateGreatCircle(a, b, i / n));
  return out;
}

/**
 * Realistic flight time in minutes for a leg, given great-circle distance.
 * Accounts for fixed overhead (taxi, climb, descent, hold) and cruise speed.
 */
export function legDurationMin(
  distanceKm: number,
  cruiseKmh = 880,
  overheadMin = 35,
): number {
  const cruiseMin = (distanceKm / cruiseKmh) * 60;
  return Math.max(15, Math.round(cruiseMin + overheadMin));
}

/**
 * Realistic altitude profile (meters) for a given fraction of the flight.
 * Climbs in first 12%, cruises mid, descends in last 18%.
 */
export function altitudeAt(
  f: number,
  cruiseAltM = 11_280, // ~37,000 ft
): number {
  if (f <= 0 || f >= 1) return 0;
  const climbEnd = 0.12;
  const descentStart = 0.82;
  if (f < climbEnd) return Math.round((f / climbEnd) * cruiseAltM);
  if (f > descentStart)
    return Math.round(((1 - f) / (1 - descentStart)) * cruiseAltM);
  return cruiseAltM;
}

/** Realistic ground speed (km/h) variation along the flight. */
export function groundSpeedAt(f: number, cruiseKmh = 880): number {
  if (f <= 0 || f >= 1) return 0;
  if (f < 0.05) return Math.round((f / 0.05) * cruiseKmh * 0.6 + 250);
  if (f < 0.12) return Math.round(cruiseKmh * 0.85);
  if (f > 0.95) return Math.round(((1 - f) / 0.05) * cruiseKmh * 0.6 + 250);
  if (f > 0.82) return Math.round(cruiseKmh * 0.78);
  // small natural variation in cruise
  return Math.round(cruiseKmh + Math.sin(f * Math.PI * 6) * 18);
}

/** Classify a phase given fraction-of-leg progress. */
export function phaseAt(
  f: number,
):
  | "taxi_out"
  | "climb"
  | "cruise"
  | "descent"
  | "taxi_in" {
  if (f <= 0.02) return "taxi_out";
  if (f < 0.12) return "climb";
  if (f > 0.98) return "taxi_in";
  if (f > 0.82) return "descent";
  return "cruise";
}
