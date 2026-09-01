import * as mock from "../mocks/password-reset.mock"
import * as real from "./password-reset.real"
import { useMocks } from "@/lib/dev/use-mocks-flag"

export const validateToken = useMocks
  ? mock.validateToken
  : real.validateToken
export const resetPassword = useMocks
  ? mock.resetPassword
  : real.resetPassword

export type {
  ValidateTokenResult,
  ResetPasswordResult,
} from "../mocks/password-reset.mock"
