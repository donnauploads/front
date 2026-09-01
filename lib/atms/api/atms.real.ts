/**
 * GET /atms/nearby?lat=&lon=&limit= → NearbyAtm[]
 *
 * Cash-deposit-accepting retailers near the caller, sorted by distance.
 * Fee amounts are per-chain estimates (Green Dot / ReadyLink schedule) —
 * actual fees may vary at point of sale.
 */

import { apiFetch } from "@/lib/api/client"

export type NearbyAtm = {
  id: string
  name: string
  kind: "bank" | "atm" | "retail"
  address: string
  distanceMeters: number
  lat: number
  lon: number
  /** null when fee depends on the customer's home bank / unknown. */
  feeCentsEstimate: number | null
}

export function nearbyAtms(
  lat: number,
  lon: number,
  limit = 10,
): Promise<NearbyAtm[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    limit: String(limit),
  })
  // Overpass / Foursquare round-trips (with retries on rural misses) can
  // take 5–25s — generous timeout here.
  return apiFetch<NearbyAtm[]>(`/atms/nearby?${params.toString()}`, {
    timeout: 45_000,
  })
}

export type GeocodeHit = {
  lat: number
  lon: number
  displayName: string
  city: string | null
  country: string | null
  countryCode: string | null
}

/** Server-side geocoder. Avoids ad-blockers / CORS-blocked direct
 *  Nominatim hits, and the backend retries with a relaxed query when the
 *  first attempt comes back empty. Always resolves with an array — empty
 *  when no place matched. */
export function geocodePlace(
  q: string,
  limit = 5,
): Promise<GeocodeHit[]> {
  const params = new URLSearchParams({ q, limit: String(limit) })
  return apiFetch<GeocodeHit[]>(`/atms/geocode?${params.toString()}`, {
    timeout: 12_000,
  })
}
