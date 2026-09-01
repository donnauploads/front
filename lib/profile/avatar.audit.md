# Avatar handling — audit (FE-4)

_Snapshot taken before any FE-4 changes were applied._

## Where the avatar is rendered today

| Surface | File | What it shows |
|---|---|---|
| Dashboard top bar | [components/shell/TopBar.tsx](../../components/shell/TopBar.tsx) | Gradient circle with `user.initials` (fallback `"N"`). The whole circle is a `<Link href="/profile">`. |
| Profile tab header | [app/(app)/profile/page.tsx](../../app/(app)/profile/page.tsx) | Larger gradient circle with `user.initials` (fallback `"AR"`). |
| Personal-info page | [app/(app)/profile/personal-info/page.tsx](../../app/(app)/profile/personal-info/page.tsx) | **No avatar UI.** Page only edits name / handle / email / phone / address text fields. |

No other consumer reads `user.avatar*`.

## Persistence

- `User` type in [lib/store.ts](../store.ts) is `{ name, novaTag, memberSince, initials }`. **There is no `avatarUrl` field.** Persistence already exists via zustand `persist` middleware (`nova:store` localStorage key, version 2).
- `setUser()` is the only mutator — `/profile/personal-info` updates derive `initials` from the legal name on save.

## Upload UX today

- None. The avatar is read-only initials.
- Hydration: `StoreHydrator` seeds the `User` fixture from `lib/fixtures/accounts.ts → demoUser` (`{name: "Alex Rivera", initials: "AR"}`).

## Dependency check

- `package.json` has no `react-easy-crop`, no `react-image-crop`, no `browser-image-compression`.
- We will **not install a new dep** for FE-4 — we'll ship a minimal in-house circular preview with drag + zoom built on plain React + a hidden `<canvas>` for the final crop.

## Gaps to close in FE-4

1. Add `avatarUrl: string | null` to the `User` type (and seed `null` in the demo user).
2. Add `AvatarEditor` component (sheet on mobile, modal on desktop) — file picker, image-type + size guards, circular crop preview with drag + zoom, Save / Cancel / Remove actions.
3. Mock layer at `lib/profile/mocks/avatar.mock.ts` exposing `uploadAvatar(file)` + `removeAvatar()`.
4. `/profile/personal-info` first row becomes an Avatar card with the new editor wired in.
5. `TopBar` and `/profile` page render the uploaded image when `user.avatarUrl` is present; otherwise the existing initials circle.
6. Persist `avatarUrl` via the existing zustand `persist` — no migration bump required (additive optional field).

## Acceptance to verify

- Upload a ≤ 5 MB PNG → success, shell avatar updates within 200ms.
- Upload an 8 MB PNG → friendly size error in the editor.
- Upload a `.gif` → friendly type error.
- Remove avatar → falls back to initials in all three surfaces.
- Refresh → uploaded avatar persists from `localStorage`.
