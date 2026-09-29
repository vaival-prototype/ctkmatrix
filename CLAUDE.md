# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Serve the production build
npm run lint       # ESLint (flat config, eslint.config.js)
npm run format     # Prettier --write across the repo
```

There is no test runner configured — no `test` script, no test framework in `package.json`. Do not assume tests can be run.

Env vars: `VITE_USE_MOCK="true"` serves every request from the in-browser mock backend (this is what the GitHub Pages demo runs — see `.github/workflows/ci.yml`). Without it, requests go to `VITE_API_BASE_URL`, defaulting to `http://216.24.136.56:9050/api` (`src/services/api.js`). Local demo: `VITE_USE_MOCK=true npm run dev`.

## Stack

Vite 8 + React 19 + React Router 7, plain **JavaScript/JSX** (no TypeScript — `jsconfig.json` only sets the `@/*` → `src/*` path alias). Tailwind CSS 4 (via `@tailwindcss/vite`, theme in `src/styles.css` using oklch colors). UI primitives are shadcn/ui-style wrappers over Radix in `src/components/ui/`.

## Architecture

This is a **pure SPA frontend** for insurance claim-matrix collaboration. The backend contract it expects is fully specified in `APIrequire.md` — read that file before touching services or auth, as it is the source of truth for every endpoint, the response envelope, and the auth model.

Data flows through three layers, kept strictly separate:

1. **`src/services/*.js`** — the only place `fetch` happens. Every service calls the `apiGet/apiPost/apiPut/apiDelete/apiUpload` helpers in `src/services/api.js`. Services return the raw API envelope (`{ data, meta? }`); they do not manage React state. Add new backend calls here, one function per endpoint.
2. **`src/hooks/use*.js`** — one hook per data concern (`useClaims`, `useDashboard`, etc.). Hooks own `{ data, loading, error }` state, call a service in `useEffect`, and guard against unmounts with an `AbortController`. This is the standard pattern — follow it for new data hooks.
3. **`src/pages/*.jsx`** — one component per route. Pages consume hooks and never call services or `fetch` directly.

### API layer contract (`src/services/api.js`)
- Success responses are `{ data, meta? }`; `204` becomes `{ data: null }`.
- Non-2xx throws an **`ApiError`** carrying `status`, `code`, and `fields` (per-field validation messages for `422`). Catch `ApiError` when you need to branch on status or render inline field errors.
- All requests send `credentials: "include"`.

### Auth model
Bearer token: `/auth/login`, `/auth/sso`, `/auth/accept-invitation` and `/auth/set-password` return `{ user, token }`. `AuthContext` stores both in localStorage (`cm_auth_token`, `cm_auth_user`) and `api.js` attaches `Authorization: Bearer <token>`. Consume auth with `useAuth()`. `AuthLayout` redirects to `/signin` when signed out.

### Access model
Six account types, keyed by `user.tier`: `admin`, `approver`, `level3` (CTK Auto), `level2` (CTK Compliance), `level1` (not a CTK customer), `level4` (person in the claim). Capabilities per tier come from `GET /access-tiers` (`accessTiers` in `src/data/mock.js`) via `useAccessTier()`, which **fails closed** (no capabilities while loading or for an unknown tier). Pages are locked with `page(Component, capability)` in the router (`AccessGuard`); the mock backend enforces the same rules. Claim access is per person (`claim.members`); Admin and Approver see every claim, Approver read-only.

### Routing
All routes live in `src/routes/router.jsx` (`createBrowserRouter`, all pages lazy-loaded). Two layout branches: `PublicLayout` for unauthenticated pages (signin, accept-invite, password-reset, etc.) and `AuthLayout` (which wraps everything in `AppShell`) for authenticated pages. `main.jsx` mounts `AuthProvider` → `RouterProvider` → global `sonner` `Toaster`.

## Conventions

- **Import alias:** always use `@/...` for anything under `src/` (configured in both `vite.config.js` and `jsconfig.json`).
- **Prettier** enforces: double quotes, semicolons, 2-space indent, 100-col width, ES5 trailing commas.
- New UI should compose the existing `src/components/ui/` primitives and `src/utils/cn.js` (clsx + tailwind-merge) rather than hand-rolling styled elements.

## Mock backend
`src/services/mockResolver.js` is a small route table acting as the backend in mock mode; `src/services/mockDb.js` keeps its data (seeded from `src/data/mock.js`) in localStorage so the demo survives reloads and works across tabs. "Reset demo data" (sign-in page or account menu) restores the seed. The prototype never sends email: invites and set-password links land in the Demo inbox (`/demo-inbox`). L2/L3 users reach Matrix by simulated single sign-on from the fake Auto/Compliance app screens (`/product/auto`, `/product/compliance`). `README.md` and `APIrequire.md` predate this and are partly out of date.
