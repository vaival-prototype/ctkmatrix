# Claim Matrix — React SPA

A single-page React application for insurance claim matrix collaboration. Built with Vite, React Router, and Tailwind CSS.

## Quick Start

```bash
npm install
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run format     # Run Prettier
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | REST API base URL | `/api` |

## Folder Structure

```
src/
├── main.jsx                    # App entry point (RouterProvider)
├── styles.css                  # Tailwind v4 theme (oklch colors)
├── routes/router.jsx           # React Router config (all routes)
├── layouts/
│   ├── AuthLayout.jsx          # Persistent shell (header/sidebar/footer)
│   └── PublicLayout.jsx        # Minimal wrapper for auth pages
├── components/
│   ├── app-shell/              # Layout shell components
│   │   ├── AppShell.jsx        # Main container
│   │   ├── Header.jsx          # Top navigation bar
│   │   ├── Sidebar.jsx         # Module navigation sidebar
│   │   ├── Footer.jsx          # Copyright bar
│   │   └── ...                 # CompanySelector, TopNav, etc.
│   ├── shared/                 # Reusable presentational components
│   │   ├── PageHeader.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── Stepper.jsx
│   │   └── ...
│   ├── chat/                   # Chat/assistant floating panels
│   ├── counterparty/           # Counterparty messaging
│   └── ui/                     # shadcn/ui primitives (47 components)
├── pages/                      # Route entry points (one per route)
├── services/                   # API layer (mock → real swap point)
├── hooks/                      # Custom data hooks
├── data/mock.js                # Mock data (shaped like API responses)
├── constants/                  # Static navigation/chat data
└── utils/cn.js                 # clsx + tailwind-merge
```

## Route Map

| Path | Page | Auth |
|---|---|---|
| `/signin` | Sign In | No |
| `/register` | Register | No |
| `/password-reset` | Password Reset | No |
| `/dashboard` | Dashboard | Yes |
| `/claims` | Claim Matrix List | Yes |
| `/claims/:claimId` | Claim Detail | Yes |
| `/claims/:claimId/respond` | Submit Response | Yes |
| `/claims/:claimId/settlement` | Settlement | Yes |
| `/claims/:claimId/close` | Close Matrix | Yes |
| `/new-shared-claim` | Initiate Matrix | Yes |
| `/documents` | Document List | Yes |
| `/documents/:documentId` | Document Detail | Yes |
| `/documents/upload` | Upload Document | Yes |
| `/approvals` | Approval Queue | Yes |
| `/audit` | Audit Log | Yes |
| `/notifications` | Notifications | Yes |
| `/settings` | Settings | Yes |
| `/settings/notifications` | Notification Prefs | Yes |
| `/admin/company-enablement` | Company Management | Yes |
| `/admin/users` | User Management | Yes |
| `/admin/users/new` | Add User | Yes |
| `/admin/users/sync` | Sync Users | Yes |
| `/organizations` | Organizations | Yes |
| `/organizations/onboarding` | Onboard Company | Yes |
| `/invitations` | Invitations | Yes |

## Backend Integration

All data flows through service files in `src/services/`. Each service currently returns mock data from `src/data/mock.js`. To connect to a real API:

1. Set `VITE_API_BASE_URL` in `.env`
2. Update each service file to use `apiGet`/`apiPost` from `src/services/api.js` instead of returning mock data
3. Components consume data via hooks in `src/hooks/` — no changes needed in page code

Example — switching `claimService.js` to real API:

```js
// Before (mock):
import { sharedClaimMatrixs } from "@/data/mock";
export async function getClaimMatrixes() {
  return { data: [...sharedClaimMatrixs] };
}

// After (real):
import { apiGet } from "./api";
export async function getClaimMatrixes() {
  return apiGet("/claims");
}
```

## Tech Stack

- **Vite 8** — build tooling
- **React 19** — UI framework
- **React Router 7** — client-side routing (SPA, no full reloads)
- **Tailwind CSS 4** — utility-first styling with oklch color system
- **Radix UI** — accessible component primitives
- **Lucide React** — icon library
