/**
 * Mock layer for the dashboard greeting widget.
 *
 *   GET /me/greeting?lat=&lng=  → fetchGreeting()
 *
 * Real backend lives at planning-doc 2.18.1 / Stage 3. Function signature
 * stays stable so wiring up the real endpoint is a one-import change.
 *
 * Toggle the mock off later with NEXT_PUBLIC_USE_MOCKS=false.
 */

import {
  bucketForCurrentHour,
  type GreetingBucket,
} from "../time-of-day.util"

const USE_MOCKS =
  (process.env.NEXT_PUBLIC_USE_MOCKS ?? "true").toLowerCase() !== "false"

export type WeatherCondition =
  | "sunny"
  | "partly_cloudy"
  | "cloudy"
  | "rain"
  | "snow"
  | "storm"
  | "night_clear"
  | "night_cloudy"

export type Weather = {
  tempF: number
  tempC: number
  condition: WeatherCondition
  /** mirror of `condition` for the icon switch — the server may diverge */
  icon: WeatherCondition
  summary: string
}

export type Greeting = {
  greeting: GreetingBucket
  firstName: string
  locationLabel: string
  weather: Weather | null
  /** Server-authoritative local time as ISO. Used to keep the bucket fresh
   *  client-side without a refetch every minute. */
  localTimeIso: string
}

export type FetchGreetingArgs = {
  firstName: string
  /** Browser-supplied coords; the server falls back to IP-geo if omitted. */
  lat?: number
  lng?: number
  /** Dev overrides — see store `prefs.debug.greeting`. */
  debug?: {
    forceBucket?: GreetingBucket
    forceCondition?: WeatherCondition
    forceError?: boolean
  }
}

const SUMMARY_BY_CONDITION: Record<WeatherCondition, string> = {
  sunny: "Sunny",
  partly_cloudy: "Partly cloudy",
  cloudy: "Cloudy",
  rain: "Rain",
  snow: "Snow",
  storm: "Thunderstorms",
  night_clear: "Clear night",
  night_cloudy: "Cloudy night",
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export async function fetchGreeting(
  args: FetchGreetingArgs,
): Promise<Greeting> {
  if (!USE_MOCKS) {
    throw new Error("fetchGreeting: real backend not implemented yet.")
  }
  await wait(450)
  if (args.debug?.forceError) {
    throw new Error("FORCED_ERROR")
  }
  const condition: WeatherCondition =
    args.debug?.forceCondition ?? "partly_cloudy"
  const bucket: GreetingBucket =
    args.debug?.forceBucket ?? bucketForCurrentHour()
  return {
    greeting: bucket,
    firstName: args.firstName,
    locationLabel: "Brooklyn, NY",
    weather: {
      tempF: 64,
      tempC: 18,
      condition,
      icon: condition,
      summary: SUMMARY_BY_CONDITION[condition],
    },
    localTimeIso: new Date().toISOString(),
  }
}
