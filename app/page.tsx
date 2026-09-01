// The marketing landing page was removed — the sign-in page is now the
// homepage. `/` renders the exact same login experience as `/login` (the
// login component owns its own styles + flow, including the `/login/mfa`
// step), so there's no duplicated logic and every "back to home" link
// naturally lands on sign-in.
export { default } from "./login/page"
