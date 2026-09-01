import * as mock from "../mocks/kyc.mock"
import * as real from "./kyc.real"
import { useMocks } from "@/lib/dev/use-mocks-flag"

// Endpoints — swap when WIRE-4 fills in the real side.
export const listKyc = useMocks
  ? async () => mock.demoKycSubmissions
  : real.listKyc
export const getKyc = useMocks
  ? async (id: string) => {
      const found = mock.demoKycSubmissions.find((k) => k.id === id)
      if (!found) throw new Error("KYC submission not found")
      return found
    }
  : real.getKyc
export const updateKycDecision = useMocks
  ? async () => {
      throw new Error(
        "admin/kyc: updateKycDecision is currently handled via store.updateKycStatus in mocks mode.",
      )
    }
  : real.updateKycDecision

// Seed data — canonical source of truth for first-mount hydration.
export const demoKycSubmissions = mock.demoKycSubmissions
