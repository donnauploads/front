import * as mock from "../mocks/users.mock"
import * as real from "./users.real"
import { useMocks } from "@/lib/dev/use-mocks-flag"

export const listUsers = useMocks
  ? async (q?: string) => {
      const needle = q?.trim().toLowerCase() ?? ""
      if (!needle) return mock.demoAdminUsers
      return mock.demoAdminUsers.filter((u) =>
        [u.name, u.email, u.novaTag, u.phoneE164]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    }
  : real.listUsers

export const getUser = useMocks
  ? async (id: string) => {
      const found = mock.demoAdminUsers.find((u) => u.id === id)
      if (!found) throw new Error("User not found")
      return found
    }
  : real.getUser

export const setUserRole = useMocks
  ? async () => {
      throw new Error(
        "admin/users: setUserRole is handled via store.setUserRole in mocks mode.",
      )
    }
  : real.setUserRole

export const demoAdminUsers = mock.demoAdminUsers
