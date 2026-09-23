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

Requires a `.env` with `VITE_API_BASE_URL` (see `.env.example`, e.g. `http://localhost:3001/api`). If unset, the API base defaults to `/api`.

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
Session is a **httpOnly cookie** set by the backend on `/auth/login` and `/auth/accept-invitation` — there is **no token in JS** to read or attach. `AuthContext` (`src/context/AuthContext.jsx`) hydrates the session on load via `authService.getCurrentUser()`; a `401` there simply means "logged out" and is swallowed intentionally. Consume auth with the `useAuth()` hook. `AuthLayout` (`src/layouts/AuthLayout.jsx`) is the route guard: it shows a spinner while `loading`, then redirects to `/signin` if unauthenticated.

### Routing
All routes live in `src/routes/router.jsx` (`createBrowserRouter`, all pages lazy-loaded). Two layout branches: `PublicLayout` for unauthenticated pages (signin, accept-invite, password-reset, etc.) and `AuthLayout` (which wraps everything in `AppShell`) for authenticated pages. `main.jsx` mounts `AuthProvider` → `RouterProvider` → global `sonner` `Toaster`.

## Conventions

- **Import alias:** always use `@/...` for anything under `src/` (configured in both `vite.config.js` and `jsconfig.json`).
- **Prettier** enforces: double quotes, semicolons, 2-space indent, 100-col width, ES5 trailing commas.
- New UI should compose the existing `src/components/ui/` primitives and `src/utils/cn.js` (clsx + tailwind-merge) rather than hand-rolling styled elements.

## Mock data caveat

`src/data/mock.js` is legacy — services **no longer import it** (they all hit the real API). It is still consumed by a few demo/prototype surfaces only: `Header.jsx`, `pages/Demo.jsx`, `pages/PrototypeStates.jsx`, `pages/ExternalDashboard.jsx`. It also documents the entity shapes that `APIrequire.md` is derived from. Note: the `README.md` still describes the old "services return mock data" flow — that is outdated; treat `APIrequire.md` and the actual service files as authoritative.
