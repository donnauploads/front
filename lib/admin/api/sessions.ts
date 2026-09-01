import * as mock from "../mocks/sessions.mock"
import * as real from "./sessions.real"
import { useMocks } from "@/lib/dev/use-mocks-flag"

export const listSessions = useMocks
  ? async (userId?: string) =>
      userId
        ? mock.demoAdminSessions.filter((s) => s.userId === userId)
        : mock.demoAdminSessions
  : real.listSessions

export const revokeSession = useMocks
  ? async () => {
      throw new Error(
        "admin/sessions: revokeSession is handled via store.revokeAdminSession in mocks mode.",
      )
    }
  : real.revokeSession

export const revokeAllForUser = useMocks
  ? async () => {
      throw new Error(
        "admin/sessions: revokeAllForUser is handled via store.revokeAllSessionsForUser in mocks mode.",
      )
    }
  : real.revokeAllForUser

export const demoAdminSessions = mock.demoAdminSessions
