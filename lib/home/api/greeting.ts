import * as mock from "../mocks/greeting.mock"
import * as real from "./greeting.real"
import { useMocks } from "@/lib/dev/use-mocks-flag"

export const fetchGreeting = useMocks
  ? mock.fetchGreeting
  : real.fetchGreeting

export type {
  Greeting,
  Weather,
  WeatherCondition,
  FetchGreetingArgs,
} from "../mocks/greeting.mock"
