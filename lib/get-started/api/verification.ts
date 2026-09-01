/**
 * Mock/real switch for signup verification. Component code imports from
 * `@/lib/get-started/api/verification` — this file decides which
 * implementation runs based on NEXT_PUBLIC_USE_MOCKS.
 */
import * as mock from "../mocks/verification.mock"
import * as real from "./verification.real"
import { useMocks } from "@/lib/dev/use-mocks-flag"

// Endpoints — swap.
export const beginSignup = useMocks ? mock.beginSignup : real.beginSignup
export const sendVerification = useMocks
  ? mock.sendVerification
  : real.sendVerification
export const verifyCode = useMocks ? mock.verifyCode : real.verifyCode
export const resendVerification = useMocks
  ? mock.resendVerification
  : real.resendVerification

// Signup-step endpoints (planning doc 2.1.10–2.1.19).
export const submitDob = useMocks ? mock.submitDob : real.submitDob
export const submitCard = useMocks ? mock.submitCard : real.submitCard
export const submitAddress = useMocks
  ? mock.submitAddress
  : real.submitAddress
export const submitPassword = useMocks
  ? mock.submitPassword
  : real.submitPassword
export const submitDetails = useMocks
  ? mock.submitDetails
  : real.submitDetails
export const submitSsn = useMocks ? mock.submitSsn : real.submitSsn
export const uploadSignupDocument = useMocks
  ? mock.uploadSignupDocument
  : real.uploadSignupDocument
export const markDocumentsDone = useMocks
  ? mock.markDocumentsDone
  : real.markDocumentsDone
export const completeSignup = useMocks
  ? mock.completeSignup
  : real.completeSignup

// Pure helpers + types — always from mock (no real-side equivalent).
export { maskEmail, maskPhone, formatUsPhone, toE164US } from "../mocks/verification.mock"
export type {
  BeginSignupArgs,
  BeginSignupResult,
  SendVerificationArgs,
  SendVerificationResult,
  VerifyCodeArgs,
  VerifyCodeResult,
  ResendVerificationArgs,
  ResendVerificationResult,
  SignupStepOk,
  SubmitDobArgs,
  CardChoice,
  SubmitCardArgs,
  SubmitAddressArgs,
  SubmitPasswordArgs,
  SubmitDetailsArgs,
  SubmitSsnArgs,
  DocumentType,
  DocumentSubtype,
  UploadSignupDocumentArgs,
  UploadSignupDocumentResult,
  MarkDocsDoneArgs,
  CompleteSignupArgs,
  CompleteSignupResult,
} from "../mocks/verification.mock"
