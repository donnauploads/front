/**
 * Real adapter for the dashboard greeting widget.
 *
 *   GET /me/greeting?lat&lng → GreetingResponse
 *
 * Backend: backend/apps/api/src/modules/greeting/greeting.controller.ts.
 * The server returns full labels ("Good morning") and provider-specific
 * weather icon keys; this adapter normalizes both to the frontend's
 * GreetingBucket / WeatherCondition unions.
 */

import { apiFetch } from "@/lib/api/client"
import type {
  FetchGreetingArgs,
  Greeting,
  Weather,
  WeatherCondition,
} from "../mocks/greeting.mock"
import { bucketForDate, type GreetingBucket } from "../time-of-day.util"

type BackendWeather = {
  tempC: number
  tempF: number
  condition: string
  icon: string
  summary: string
}

type BackendGreeting = {
  greeting: string
  firstName: string | null
  locationLabel: string | null
  weather: BackendWeather | null
  localTimeIso: string
}

const LABEL_TO_BUCKET: Record<string, GreetingBucket> = {
  "Good morning": "morning",
  "Good afternoon": "afternoon",
  "Good evening": "evening",
  "Good night": "night",
}

function toBucket(label: string, iso: string): GreetingBucket {
  if (label in LABEL_TO_BUCKET) return LABEL_TO_BUCKET[label]
  const d = new Date(iso)
  if (!Number.isNaN(d.getTime())) return bucketForDate(d)
  return "morning"
}

const VALID_ICONS = new Set<WeatherCondition>([
  "sunny",
  "partly_cloudy",
  "cloudy",
  "rain",
  "snow",
  "storm",
  "night_clear",
  "night_cloudy",
])

// Map the backend / provider's icon vocabulary (open-meteo WMO buckets) onto
// the frontend's smaller WeatherCondition union. Unknown values fall through
// to "cloudy" since the icon component has its own Cloud fallback.
const ICON_REMAP: Record<string, WeatherCondition> = {
  clear: "sunny",
  mostly_clear: "sunny",
  partly_cloudy: "partly_cloudy",
  cloudy: "cloudy",
  overcast: "cloudy",
  fog: "cloudy",
  drizzle: "rain",
  rain: "rain",
  showers: "rain",
  snow: "snow",
  thunderstorm: "storm",
}

function normalizeIcon(icon: string): WeatherCondition {
  if (VALID_ICONS.has(icon as WeatherCondition)) return icon as WeatherCondition
  return ICON_REMAP[icon] ?? "cloudy"
}

export async function fetchGreeting(args: FetchGreetingArgs): Promise<Greeting> {
  const params = new URLSearchParams()
  if (args.lat != null) params.set("lat", String(args.lat))
  if (args.lng != null) params.set("lng", String(args.lng))
  const qs = params.toString()
  // The server falls back to a configured default tz when it can't derive
  // one from IP/device. Pass the browser's tz so the bucket / localTimeIso
  // reflect *this* device's wall clock, not the server's fallback.
  const browserTz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : ""
  const dto = await apiFetch<BackendGreeting>(
    `/me/greeting${qs ? `?${qs}` : ""}`,
    browserTz ? { headers: { "x-timezone": browserTz } } : {},
  )

  const weather: Weather | null = dto.weather
    ? {
        tempC: dto.weather.tempC,
        tempF: dto.weather.tempF,
        condition: normalizeIcon(dto.weather.icon),
        icon: normalizeIcon(dto.weather.icon),
        summary: dto.weather.summary,
      }
    : null

  return {
    greeting: toBucket(dto.greeting, dto.localTimeIso),
    firstName: dto.firstName ?? args.firstName,
    locationLabel: dto.locationLabel ?? "",
    weather,
    localTimeIso: dto.localTimeIso,
  }
}
