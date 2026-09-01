# State Bank — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind + zustand. The customer
app is a Chime-style five-tab dashboard (`(app)/home|move|pay|deals|profile`);
the admin app lives under `(admin)/admin/*` and is gated by role.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

The app boots in **mocks mode** by default — every screen renders against
local fixtures with no backend running.

## Run against the real backend

1. Start the backend from `backend/` (default port `3001`, prefix `/api/v1`).
   See `backend/README.md`.
2. In `frontend/.env.local`, set:

   ```bash
   NEXT_PUBLIC_API_BASE=http://localhost:3001/api/v1
   NEXT_PUBLIC_WS_BASE=http://localhost:3001
   NEXT_PUBLIC_USE_MOCKS=false
   ```

3. `npm run dev`. The DevToolbar in the bottom-right shows the current
   mode and lets you flip back to mocks without editing env vars
   (`localStorage` override + reload).

### What changes between mocks and real

| Surface | Mocks mode | Real mode |
|---|---|---|
| Auth | Login button routes to `/home` directly | `POST /auth/login` → MFA challenge if new device → session |
| Session recovery | n/a — `dev.fakeRole` drives admin gating | `SessionBootstrap` replays `/auth/refresh` cookie + `/me` |
| Accounts + transactions | Fixture seed via `StoreHydrator` | `DataBootstrap` calls `/accounts` + `/transactions` after auth |
| Transfer settlement | `setTimeout` flips pending → posted | `transaction.settled` WebSocket event |
| Force logout | n/a | `session.revoked` WS pushes redirect to `/login` |
| Admin override push | n/a | `transaction.updated` WS event mutates the customer feed live |

## Architecture cheatsheet

- **Mock/real switch**: every domain has three files:
  `lib/<domain>/mocks/<feature>.mock.ts` (fixtures + fake impls),
  `lib/<domain>/api/<feature>.real.ts` (real `apiFetch` calls), and
  `lib/<domain>/api/<feature>.ts` (the switch that picks via
  `lib/dev/use-mocks-flag.ts`). Components import only from the `api/`
  side — never directly from `mocks/`.
- **HTTP client**: `lib/api/client.ts` — fetch wrapper with single-flight
  refresh, 15s timeout, typed `ApiError`/`UnauthorizedError`/`NetworkError`.
- **Token storage**: access token lives in module memory only
  (`lib/api/token-store.ts`). Refresh cookie is httpOnly, set by the
  backend.
- **WebSocket**: `lib/realtime/socket.ts` (singleton Socket.io client) +
  `components/providers/RealtimeProvider.tsx` (dispatch).

## Dev affordances

- **Dev toolbar** (bottom-right, dev only): toggle mocks, force token
  refresh, drop the access token, disconnect/reconnect the WebSocket,
  see session status + role + API base.
- **Alt + Shift + R** (mocks mode only): toggle `dev.fakeRole` between
  `admin` and `superadmin` inside the admin app.

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npx tsc --noEmit # typecheck
```
