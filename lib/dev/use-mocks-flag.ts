/**
 * Single source of truth for the mock/real switch.
 *
 * Resolution order:
 *   1. `localStorage.getItem("nova:use-mocks")` — dev override, set via the
 *      DevToolbar. Survives reloads but never ships.
 *   2. `process.env.NEXT_PUBLIC_USE_MOCKS` — baked at build time.
 *   3. Default `true` (mocks active) so a fresh CI run can't accidentally
 *      hit a real backend.
 *
 * Evaluated once per module import. Because switch files take a stable
 * reference to `useMocks` at load time, toggling the localStorage flag
 * requires a page reload — the DevToolbar handles that.
 *
 * Note: the resolved value differs between SSR (no localStorage → env
 * default) and the client (localStorage may carry an override). Any
 * component that branches its rendered DOM on `useMocks` must therefore
 * gate that branch on a post-mount flag, or it will produce a hydration
 * mismatch when the override disagrees with the env default.
 */

const LS_KEY = "nova:use-mocks"

function readEnv(): "true" | "false" | undefined {
  const v = (process.env.NEXT_PUBLIC_USE_MOCKS ?? "").toLowerCase()
  if (v === "true") return "true"
  if (v === "false") return "false"
  return undefined
}

function readOverride(): "true" | "false" | null {
  if (typeof window === "undefined") return null
  try {
    const v = window.localStorage.getItem(LS_KEY)
    if (v === "true" || v === "false") return v
    return null
  } catch {
    return null
  }
}

/**
 * Resolved flag — evaluated at module load. Stable for the lifetime of
 * the browser tab.
 */
export const useMocks: boolean = (() => {
  const override = readOverride()
  if (override !== null) return override === "true"
  const env = readEnv()
  if (env !== undefined) return env === "true"
  return true
})()

/**
 * SSR-safe resolved flag for render-time branches. Returns the env default
 * during SSR and the first client render; returns the override-applied
 * value on every render after mount. Use this in any component whose
 * rendered DOM depends on the mocks switch, instead of `useMocks` directly.
 */
export function useResolvedMocks(): boolean {
  // Lazy-import React so this module stays importable from non-React code
  // (switch files, scripts). The require call is resolved at runtime and
  // tree-shaken away when only the constants are imported.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useEffect, useState } = require("react") as typeof import("react")
  const ssrSafe = (() => {
    const env = readEnv()
    if (env !== undefined) return env === "true"
    return true
  })()
  const [value, setValue] = useState<boolean>(ssrSafe)
  useEffect(() => {
    const override = readOverride()
    if (override !== null) setValue(override === "true")
    else setValue(ssrSafe)
  }, [ssrSafe])
  return value
}

/**
 * Live read — bypasses the module-level constant. Useful for the
 * DevToolbar so it can display the *current* localStorage value.
 */
export function readUseMocksLive(): boolean {
  const override = readOverride()
  if (override !== null) return override === "true"
  const env = readEnv()
  if (env !== undefined) return env === "true"
  return true
}

export function setUseMocksOverride(value: boolean | null): void {
  if (typeof window === "undefined") return
  try {
    if (value === null) {
      window.localStorage.removeItem(LS_KEY)
    } else {
      window.localStorage.setItem(LS_KEY, value ? "true" : "false")
    }
  } catch {
    // Ignored — quota / privacy mode. The DevToolbar will show stale state.
  }
}

export function readUseMocksOverrideRaw(): "true" | "false" | null {
  return readOverride()
}
