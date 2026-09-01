/**
 * Single source of truth for the app / bank name on the FRONTEND.
 *
 * Change it here (or set NEXT_PUBLIC_APP_NAME) and every component, page
 * title, toast, and email that imports these updates automatically.
 *
 * NEXT_PUBLIC_ is required so the value is inlined into the client bundle at
 * build time; without a value set it falls back to the default below.
 */
export const BRAND_NAME = process.env.NEXT_PUBLIC_APP_NAME || "State Bank"

/** Short form for tight spots (nav, logo lockup). Defaults to BRAND_NAME. */
export const BRAND_SHORT = process.env.NEXT_PUBLIC_APP_SHORT || BRAND_NAME
