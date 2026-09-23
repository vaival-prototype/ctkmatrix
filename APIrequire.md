# APIrequire.md — Claim Matrix REST API contract

This document is the contract the backend must implement so the Claim Matrix SPA
works end-to-end. It is derived from the app's features, views, form inputs, and
the entity shapes in `src/data/mock.js`. The frontend already calls every
endpoint below through `src/services/*.js` (which use the `apiGet/apiPost/apiPut/
apiDelete/apiUpload` helpers in `src/services/api.js`).

> The frontend does **not** hardcode a base URL. Set `VITE_API_BASE_URL` in `.env`
> (see `.env.example`, e.g. `http://localhost:3001/api`). Every path below is
> relative to that base.

> **Dev mock mode:** while the backend is unavailable, the frontend serves every
> request from `src/services/mockResolver.js` instead of the network (toggle with
> `VITE_USE_MOCK`; set it to `"false"` to hit the real API). This does not change
> the contract below — the mock returns the same envelopes the backend must.

---

## 1. Conventions

### Transport & auth
- **Auth is a bearer token, returned in the login body.** `POST /auth/login` and
  `POST /auth/accept-invitation` return `{ "data": { "user": <User>, "token": "string",
  "expiresAt": "ISO-8601" } }`. The client persists `token` (`AuthContext` →
  `localStorage`) and sends it back as `Authorization: Bearer <token>` on every
  other request (`src/services/api.js`) — this is what `[Authorize]` on the
  backend actually validates.
- The API also sets an httpOnly `cm_session` cookie on the same responses as a
  same-origin fallback (Swagger, direct browser calls) — the SPA does not rely on
  it and cannot read it (httpOnly), but it isn't harmful for the SPA to also send
  `credentials: "include"`, which it does.
- CORS must return the SPA's specific origin (not `*`) with
  `Access-Control-Allow-Credentials: true`, since the request carries both the
  `Authorization` header and (harmlessly) cookies.

### Success envelope
- **List:** `{ "data": [ ... ], "meta": { "total": <int>, "page": <int>, "limit": <int> } }`
- **Single / mutation:** `{ "data": { ... } }`
- `204 No Content` is allowed for mutations with nothing to return; the client
  treats it as `{ data: null }`.

### Error envelope (every non-2xx response)
```json
{ "error": { "code": "string_code", "message": "Human readable message",
             "fields": { "email": "Enter a valid email address" } } }
```
- `fields` is optional and only present for validation errors (`422`); it maps a
  form field name to a message. The client renders these inline on the matching
  input.
- Status codes: `400` malformed, `401` no/expired session, `403` forbidden,
  `404` not found, `409` conflict (e.g. invitation already used/expired),
  `422` validation, `5xx` server error.
- On any `401`, the client clears the session and redirects to `/signin`.

### Data typing notes (align backend to these)
- Prefer ISO-8601 for dates/times (`opened`, `expires`, `uploadedAt`,
  `timestamp`). The current UI also tolerates the display strings shown in the
  examples; returning ISO is preferred and the UI can format.
- Money/splits: the mock uses display strings (`"$24,500"`, `"60 / 40"`).
  Returning raw numbers (`24500`) + a split object is preferred; if you return
  strings, the UI shows them verbatim.
- **Known quirks to preserve for compatibility:** the company field
  `matrixs` (misspelled) is a count; claim `status` values are kebab-case
  (`settlement-proposed`, `under-review`, `response-submitted`) while
  `matrixStatusJourney` labels are display-cased — the API should return the
  kebab-case `status` and, if needed, a separate display label.

### Pagination
- List endpoints accept `?page=<int>&limit=<int>` (defaults `page=1`,
  `limit=25`) and must populate `meta.total`. `GET /audit-events` is paginated
  in the UI (Prev/Next); other lists may return the full set but must still
  include `meta.total`.

---

## 2. Entity shapes

These are the canonical response objects (field names the UI reads). IDs are
strings.

**User**
```json
{ "id": "cmu-001", "name": "John Smith", "email": "john.smith@northbridge.com",
  "source": "Claim Toolkit", "company": "Northbridge Insurance",
  "role": "Adjuster", "status": "Active", "lastSeen": "Now" }
```

**Company**
```json
{ "id": "ctk-co-1001", "name": "Northbridge Insurance", "status": "Enabled",
  "trust": "Approved", "subscription": "Enterprise", "contacts": 42,
  "matrixs": 47, "notifications": "Email + in-app" }
```

**ClaimMatrix**
```json
{ "id": "CM-2406-0148", "autoClaimId": "AUTO-908842",
  "title": "Multi-vehicle collision - I-90 Westbound", "status": "settlement-proposed",
  "initiator": "Northbridge Insurance", "recipient": "Atlas Mutual",
  "liability": "60 / 40", "exposure": "$24,500", "opened": "May 2, 2026",
  "updated": "12 min ago", "documents": 6, "comments": 14,
  "participants": ["Northbridge Insurance", "Atlas Mutual", "Pioneer Casualty"],
  "sceneImageUrl": "https://s3.amazonaws.com/.../scene-12345.png",
  "parties": [
    { "name": "Maria Alvarez", "role": "Driver", "partyType": "Insured", "suggestedNegligencePercent": 73,
      "email": "maria.alvarez@example.com", "phone": "555-0101", "lastActivity": "2026-08-14T10:02:00Z" },
    { "name": "J. Reyes", "role": "Passenger", "partyType": "Insured", "suggestedNegligencePercent": 73,
      "email": null, "phone": null, "lastActivity": null },
    { "name": "Tom Whitfield", "role": "Witness", "partyType": "Claimant", "suggestedNegligencePercent": 27,
      "email": null, "phone": "555-0199", "lastActivity": "2026-07-30T16:40:00Z" }
  ],
  "participantDetails": [
    { "company": "Northbridge Insurance", "role": "Initiator", "joined": "2026-05-02T00:00:00Z",
      "contactEmail": "j.smith@northbridge.example", "contactRole": "external-adjuster",
      "invitationStatus": "Accepted", "lastActivity": "2026-08-18T09:15:00Z" },
    { "company": "Atlas Mutual", "role": "Recipient", "joined": "2026-05-03T00:00:00Z",
      "contactEmail": null, "contactRole": null, "invitationStatus": null, "lastActivity": null }
  ] }
```
> `sceneImageUrl` and `parties` are enrichment sourced from Claimtoolkit_Auto, present only
> when the matrix was created from an Auto claim (`autoClaimId` parses to a
> CompanyId/ToolkitId pair) **and** the source claim has that data — both are `null`/empty
> otherwise. `parties` is per-**person** (name + role: Driver/Passenger/Witness/Pedestrian);
> it is distinct from `participants`, which is per-**company** and unrelated. `partyType`
> ("Insured"/"Claimant") comes from `AutoParty.Insured`; `suggestedNegligencePercent` is the
> claim-level Insured-vs-Claimant split from `AssessCalc` (the same numbers Auto Liability's
> own Assessment tab shows), attributed per person by which side of that split they're on —
> there is still no true per-person negligence % anywhere in Claimtoolkit_Auto, and no
> coverage/insurer field at the individual level either. `parties[].lastActivity` is
> `AutoParty.ActivityDate` — Auto Liability's own last-edited timestamp for that person's
> record, not a Matrix interaction (individual parties are not Matrix users, so there is no
> real "invited"/"connected"/"status" concept for them — deliberately not modeled).
>
> `participantDetails[].lastActivity` is the latest `AuditEvent.OccurredAt` for that company
> on this matrix (real, derived from the audit trail) — `null` when the company has no
> recorded activity yet. `contactRole` is the role named on that company's invitation (e.g.
> "external-adjuster"), shown as "Receiver type" in the UI — distinct from the participant
> `role` ("Initiator"/"Recipient"/etc.).

**ClaimPackage** (source Auto package)
```json
{ "id": "AUTO-908842", "title": "...", "lossDate": "April 28, 2026",
  "assessment": "Liability assessment v3", "suggestedLiability": "60 / 40",
  "documents": ["police-report-final.pdf", "estimate-bodyshop-v3.pdf"] }
```

**Invitation**
```json
{ "id": "inv-0148-harbor", "code": "INV-7F3K9Q",
  "email": "lena.ortiz@harborlaw.com", "company": "Harbor Legal",
  "role": "External Adjuster", "matrixId": "CM-2406-0148",
  "matrixTitle": "Multi-vehicle collision - I-90 Westbound", "status": "Sent",
  "expires": "May 21, 2026",
  "permissions": ["View claim metadata", "Comment and respond", "Upload supporting documents"] }
```
> `code` is **new** — the opaque token used by the onboarding flow. It must be
> unique, unguessable, and single-use.

**Document**
```json
{ "id": "doc-police-report", "name": "police-report-final.pdf",
  "matrixId": "CM-2406-0148", "type": "Police report", "version": "v3",
  "status": "Pending review", "owner": "Northbridge Insurance",
  "uploadedBy": "John Smith", "uploadedAt": "May 7, 2026 09:46 UTC",
  "access": ["Northbridge Insurance", "Atlas Mutual", "Pioneer Casualty"],
  "metadata": [["Liability suggested", "60 / 40"], ["Statutory reference", "RCW 46.61.145"]] }
```

**AuditEvent**
```json
{ "id": "evt-001", "timestamp": "May 7, 2026 14:22:08 UTC", "actor": "John Smith",
  "actorCompany": "Northbridge Insurance", "action": "Settlement proposed",
  "target": "CM-2406-0148", "oldValue": null, "newValue": "$24,500" }
```

**Approval**
```json
{ "id": "approval-001", "requester": "John Smith", "company": "Northbridge Insurance",
  "recipient": "Harbor Legal", "matrixId": "CM-2406-0148", "reason": "...",
  "risk": "Medium", "status": "Pending supervisor approval" }
```

**NotificationPreference**
```json
{ "event": "New shared claim", "email": true, "inApp": true, "claimToolkit": true }
```

**Notification** (feed item)
```json
{ "id": "ntf-001", "category": "Settlements", "title": "Settlement proposed on CM-2406-0148",
  "body": "...", "time": "12 min ago", "read": false, "link": "/claims/CM-2406-0148" }
```

---

## 3. Endpoint reference

### 3.1 Authentication & onboarding

#### `POST /auth/login`
- **Body:** `{ "email": "string", "password": "string", "remember": true }`
- **Success `200`:** `{ "data": { "user": <User>, "token": "string", "expiresAt": "ISO-8601" } }`
  (also sets the `cm_session` httpOnly cookie — see Transport & auth above).
- **Errors:** `401` bad credentials (`{ error: { code: "unauthorized", message } }`);
  `422` field validation → `fields.email` / `fields.password`.
- **Validation:** email format; password non-empty (min 8 enforced by client).

#### `POST /auth/logout`
- **Body:** none. Send the bearer token so the server can revoke that specific
  session. Clears the session cookie too. **Success:** `204` or `{ "data": {} }`.

#### `GET /auth/me`
- Requires `Authorization: Bearer <token>`. Returns the current session user.
  **Success `200`:** `{ "data": <User> }`.
- **`401`** when the token is missing/expired/revoked (expected on first load /
  after logout — the client treats it as "logged out", not an error toast).

#### `POST /auth/password-reset`
- **Body:** `{ "email": "string" }`
- **Success `200`:** `{ "data": { "message": "If the account exists, a reset link was sent." } }`
  (return success even if the email is unknown, to avoid account enumeration).
- **Validation:** `422` → `fields.email` on malformed email.

#### `GET /invitations/lookup?code=<code>`
- Preview an invitation by its code. The accept-invite screen takes the `code`
  from the invitation-link query string (`/accept-invite?code=<code>`) — the user
  never types it — and calls this on page load to show the invited
  email/company/role before they set a password.
- **Success `200`:** `{ "data": { "email", "company", "role", "matrixTitle", "matrixId", "expires" } }`
- **Errors:** `404` unknown code; `409` expired/already-used. The screen treats a
  failed lookup as best-effort (it just hides the preview); the code is
  authoritatively validated by `POST /auth/accept-invitation`.

#### `POST /auth/accept-invitation`
- The **new-user onboarding** endpoint. Validates the code, creates the user,
  sets their password, and **starts a session** (sets the cookie).
- **Body:** `{ "code": "string", "password": "string" }` — `code` is the token
  from the `/accept-invite?code=` link, passed through unchanged; the user only
  supplies a password.
- **Success `201`:** `{ "data": { "user": <User>, "token": "string", "expiresAt": "ISO-8601" } }`
  (also sets the `cm_session` httpOnly cookie).
- **Errors:**
  - `404` `code` not found / `409` code expired or already accepted → surfaced as
    a **form-level** error (the screen has no code input to attach it to; a
    `fields.code` message, if returned, is used as that form-level message).
  - `422` weak password → `fields.password` (min 8).
- **Notes:** the email/company/role are taken from the invitation, not the
  request. After success the invitation `status` becomes `Accepted`.

### 3.2 Claims

| Method + URI | Body | Success |
|---|---|---|
| `GET /claims` | — | `{ data: ClaimMatrix[], meta }` |
| `GET /claims/:id` | — | `{ data: ClaimMatrix }` (`404` if missing) |
| `GET /claim-packages` | — | `{ data: ClaimPackage[] }` |

#### `POST /claims` — create a shared matrix from an Auto package (NewSharedClaim)
- **Body:** `{ "autoClaimId", "recipientCompany", "recipientAdjuster",
  "invitedEmail"?, "permissionScope", "message"?, "includedDocuments": string[] }`
- **Success `201`:** `{ data: ClaimMatrix }`
- **Validation:** `autoClaimId`, `recipientCompany`, `permissionScope` required.

#### `POST /claims/:id/responses` — structured response (ClaimRespond)
- **Body:** `{ "responseType", "liabilityPosition", "disputedItem",
  "reasonCategory", "finalResolution", "currentPosition", "requestedChange",
  "statutoryReference", "settlementOffer", "counterOffer", "explanation" }`
- **Success `201`:** `{ data: { id, matrixId, submittedAt } }`

#### `POST /claims/:id/settlement` — settlement actions (ClaimSettlement + ClaimDetail dialogs)
- **Body:** `{ "action": "propose" | "counter" | "accept" | "reject",
  "amount"?, "split"?, "splits"?, "status"?, "terms"?, "rationale"?,
  "evidenceReference"?, "acceptanceNote"? }`
- **Success `200`:** `{ data: ClaimMatrix }` (updated status/liability/exposure).

#### `POST /claims/:id/close` — close matrix (ClaimClose)
- **Body:** `{ "checklist": { "<item>": true }, "notes": "string" }`
- **Success `200`:** `{ data: ClaimMatrix }` (status → closed).

#### `POST /claims/:id/decisions` — claim representative decision (ClaimDetail)
- **Body:** `{ "decision": "agree" | "disagree", "notes": "string" }`
- **Success `201`:** `{ data: { id, matrixId, createdAt } }`

### 3.3 Documents

| Method + URI | Body | Success |
|---|---|---|
| `GET /documents` | — | `{ data: Document[], meta }` |
| `GET /documents/:id` | — | `{ data: Document }` (`404` if missing) |

#### `POST /documents` — upload (multipart/form-data) (DocumentUpload)
- **Content-Type:** `multipart/form-data` (client sets the boundary; no JSON).
- **Fields:** `file` (binary, **required**), plus text fields `uploadPath`,
  `matrixId`, `type`, `displayName`, `accessLevel`, `notes`.
- **Success `201`:** `{ data: Document }`.
- **Validation:** `422` `fields.file` when missing; enforce max size / mime allowlist.

### 3.4 Invitations

| Method + URI | Body | Success |
|---|---|---|
| `GET /invitations` | — | `{ data: Invitation[], meta }` |
| `GET /invitations/:id` | — | `{ data: Invitation }` |

#### `POST /invitations` — create an invitation (Invitations page)
- **Body:** `{ "email", "company", "role", "permissionScope", "matrixId",
  "expiration", "message"? }`
- **Behaviour:** if the email matches an existing user → grant access + notify;
  otherwise create a pending invitation with a fresh single-use `code` and email
  the recipient a link to `/accept-invite?code=<code>` (the code travels in the
  query string; the onboarding screen reads it from there).
- **Success `201`:** `{ data: Invitation }` (includes `code` when it's a new-user invite).
- **Validation:** `422` → `fields.email` (format), `fields.role`, `fields.matrixId`.

### 3.5 Approvals

| Method + URI | Body | Success |
|---|---|---|
| `GET /approvals` | — | `{ data: Approval[], meta }` |
| `POST /approvals/:id/decision` | `{ "decision": "approve" \| "reject", "note"? }` | `{ data: Approval }` |

### 3.6 Companies & organizations

| Method + URI | Body | Success |
|---|---|---|
| `GET /companies` | — | `{ data: Company[], meta }` |
| `GET /companies/:id` | — | `{ data: Company }` |
| `POST /companies/:id/enable` | `{ "createMode": "activated-only" \| "all" }` | `{ data: Company }` |

#### `POST /organizations/onboarding` — org enablement (OrganizationOnboarding)
- **Body (all optional except where noted):** `{ "companyId" (required),
  "companyName" (required), "activationMode", "lifecycleStatus",
  "collaborationAccess", "billingPlan", "agreementStatus", "eligibilityCheck",
  "trustApproval", "externalInvitePolicy", "auditVisibility", "matrixRetention",
  "trustScore", "companyAdmin", "adminEmail" (required, email),
  "notificationEmail" (email), "allowedDomain", "subscriptionOwner",
  "contacts": [{ "name", "email", "role" }], "productStatuses": { "<product>": "active" },
  "checks": [{ "label", "done": true }], "notes" }`
- **Success `200/201`:** `{ data: { id, companyId, status } }`
- **Validation:** `422` → `fields.companyId`, `fields.companyName`, `fields.adminEmail`,
  and `fields["contacts.<i>.email"]` for bad contact emails.

### 3.7 Users & admin

| Method + URI | Body | Success |
|---|---|---|
| `GET /users` | — | `{ data: User[], meta }` |
| `GET /users/:id` | — | `{ data: User }` |
| `POST /users` | see below | `{ data: User }` (`201`) |
| `PUT /users/:id` | edited user + `memberships[]` | `{ data: User }` |
| `POST /users/sync` | `{ mode, interval, deactivateRemoved, updateRoleCompany, notifyAdmins }` | `{ data: { started: true, summary } }` |
| `PUT /users/sync-settings` | `{ mode, interval, ... }` | `{ data: { saved: true } }` |
| `PUT /admin/rbac` | `{ "matrix": { "<function>": { "<role>": "yes"\|"no"\|"maybe" } } }` | `{ data: { saved: true } }` |
| `GET /admin/system-boundaries` | — | `{ data: [{ object, owner, note }] }` |
| `GET /admin/integration-events` | — | `{ data: [{ name, time, source, target, status }] }` |
| `GET /admin/collaboration-modes` | — | `{ data: [{ mode, example }] }` |

#### `POST /users` — create local user (AdminUserNew)
- **Body:** `{ "fullName" (required), "email" (required, email), "jobTitle"?,
  "phone"?, "company", "role", "accessScope": "matrix"|"company"|"admin",
  "sendInvite": bool, "requireMfa": bool, "autoExpire": bool }`
- **Validation:** `422` → `fields.fullName`, `fields.email`.

### 3.8 Notifications

| Method + URI | Body | Success |
|---|---|---|
| `GET /notifications` | — | `{ data: Notification[], meta }` |
| `PUT /notifications/read-all` | — | `{ data: { updated: <int> } }` |
| `GET /notification-preferences` | — | `{ data: NotificationPreference[] }` |
| `PUT /notification-preferences` | `{ "preferences": NotificationPreference[] }` | `{ data: NotificationPreference[] }` |

### 3.9 Audit

#### `GET /audit-events?page=&limit=`
- Paginated. **Success `200`:** `{ data: AuditEvent[], meta: { total, page, limit } }`.

### 3.10 Dashboard

#### `GET /dashboard`
- Aggregated home payload. **Success `200`:**
```json
{ "data": {
  "metrics": [{ "label": "Open matrixs", "value": "12", "delta": "+2" }],
  "claims":  [ <ClaimMatrix subset for the open-claims list> ],
  "activity":[{ "id", "actor", "action", "target", "time" }],
  "notifications": [ <Notification> ]
} }
```
- The UI renders these arrays defensively (optional chaining + fallbacks), so
  extra/missing nested fields will not crash the page.

---

## 4. Auth & session lifecycle (summary)

1. App loads → client reads the persisted user/token from `localStorage`
   (`AuthContext`). A stale/revoked token is only discovered when the first
   subsequent request 401s (there is no `GET /auth/me` hydration call on load
   today — calling it would be a reasonable follow-up so a revoked/expired
   session is caught immediately instead of on the next API call).
2. `POST /auth/login` (or `POST /auth/accept-invitation`, whose `code` comes from
   the `/accept-invite?code=` invitation link) returns `{ user, token, expiresAt }`;
   the client persists both and enters the app shell.
3. Every subsequent request carries `Authorization: Bearer <token>`
   (`src/services/api.js`); `credentials: "include"` is also sent for the cookie
   fallback, though the SPA doesn't depend on it.
4. Any endpoint returning `401` should trigger a client-side redirect to
   `/signin` — today this is handled per-page via `ApiError`, not by a single
   global interceptor.
5. `POST /auth/logout` sends the bearer token so the server revokes that
   session, then clears local storage; client returns to `/signin`.

---

## 5. Frontend wiring map (where each endpoint is called)

| Service file | Endpoint(s) |
|---|---|
| `services/authService.js` | `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/password-reset`, `/invitations/lookup`, `/auth/accept-invitation` |
| `services/claimService.js` | `/claims*`, `/claim-packages` |
| `services/documentService.js` | `/documents*` |
| `services/invitationService.js` | `/invitations*` |
| `services/approvalService.js` | `/approvals*` |
| `services/companyService.js` | `/companies*`, `/organizations/onboarding` |
| `services/userService.js` | `/users*`, `/admin/rbac` |
| `services/notificationService.js` | `/notifications*`, `/notification-preferences` |
| `services/auditService.js` | `/audit-events` |
| `services/adminService.js` | `/admin/system-boundaries`, `/admin/integration-events`, `/admin/collaboration-modes` |
| `services/dashboardService.js` | `/dashboard` |

---

## 6. Multi-app origination + tiered access (added September 2026)

Claim Matrix no longer assumes every matrix originates from an Auto claim.
Auto, Compliance, and Audit users can all initiate a matrix from their own
app, and non-Claim-Toolkit users can be onboarded directly into Matrix at two
tiers. This section documents the additions; everything in sections 1-5 above
still applies unchanged.

### 6.1 Access tiers

Five tiers, in `User.tier` and `GET /access-tiers`: `auto` (full suite,
including the Auto assessment workspace), `compliance` and `audit` (same
access as `auto` except no assessment workspace — matrices they initiate
start at the negotiation stage, with documents uploaded directly instead of
pulled from an Auto package), `matrix-paid` (a non-CTK user onboarded
directly into Matrix, same capabilities as `compliance` once upgraded), and
`matrix-free` (an invited receiver — view/comment/respond/upload only, no
initiation).

**AccessTier**
```json
{ "key": "compliance", "label": "Compliance", "sourceApp": "AI for Compliance",
  "description": "...", "capabilities": { "initiate": true, "assessment": false,
  "statutes": true, "aiTools": true, "investigation": false, "caseManagement": true,
  "inviteExternal": true } }
```

`User` gains two fields: `tier` (one of the five keys above) and `sourceApp`
(`"Auto"` \| `"Compliance"` \| `"Audit"` \| `null` for non-CTK Matrix users).

`ClaimMatrix` gains `originApp` (`"auto"` \| `"compliance"` \| `"audit"` \|
`"matrix-paid"`). When not `"auto"`, the matrix has no `sceneImageUrl` or
`parties` (no Auto claim behind it) and opens directly at the negotiation
stage — there is no assessment step for these origins.

#### `GET /access-tiers`
- **Success `200`:** `{ data: AccessTier[] }`.

### 6.2 Upgrade requests (free receiver -> paid initiator)

A `matrix-free` user requests initiator access; an admin invoices them, then
activates the upgrade (their `tier` becomes `matrix-paid`). This reuses the
same invoice-then-activate lifecycle as company billing rather than a
separate payment flow — no card/payment-gateway integration.

**UpgradeRequest**
```json
{ "id": "upg-001", "requesterName": "Selena Ruiz", "requesterEmail": "selena.ruiz@meridianclaims.com",
  "company": "Meridian Claims Group", "currentTier": "matrix-free", "requestedTier": "matrix-paid",
  "billingPreference": "per-claim" | "company-license", "note": "string",
  "status": "Pending review" | "Invoice sent" | "Activated" | "Declined",
  "requestedAt": "ISO-8601" }
```

| Method + URI | Body | Success |
|---|---|---|
| `GET /upgrade-requests` | — | `{ data: UpgradeRequest[], meta }` |
| `POST /upgrade-requests` | `{ "requestedTier", "billingPreference", "note"? }` | `{ data: UpgradeRequest }` (`201`) |
| `POST /upgrade-requests/:id/decision` | `{ "decision": "invoice" \| "activate" \| "decline", "note"? }` | `{ data: UpgradeRequest }` |

### 6.3 Access requests (self-serve signup, no invitation)

Open registration is intentionally not exposed — someone without an
invitation submits a request that lands in an admin review queue instead of
creating an account immediately. On approval a user is created at the
`matrix-free` tier (a receiver); they can then submit an upgrade request per
6.2 above.

**AccessRequest**
```json
{ "id": "req-001", "name": "Dana Whitfield", "email": "dana.whitfield@coastalfreight.com",
  "company": "Coastal Freight Partners", "domain": "coastalfreight.com", "reason": "string",
  "status": "Pending review" | "Approved" | "Rejected", "requestedAt": "ISO-8601" }
```

| Method + URI | Body | Success |
|---|---|---|
| `GET /access-requests` | — | `{ data: AccessRequest[], meta }` |
| `POST /access-requests` | `{ "name", "email", "company", "reason"? }` | `{ data: AccessRequest }` (`201`) |
| `POST /access-requests/:id/decision` | `{ "decision": "approve" \| "reject", "note"? }` | `{ data: AccessRequest }` |

### 6.4 RBAC policy read

`GET /admin/rbac` was referenced by the frontend (`adminService.getRbacPolicy`)
but not documented in section 3.7 — documenting it here for completeness.
- **Success `200`:** `{ data: { roles: [{ key, name }], matrix: [{ functionKey, function, roles: { "<roleKey>": "yes"|"no"|"maybe" } }] } }`

### 6.5 Claim creation with a non-Auto origin

`POST /claims` (section 3.2) additionally accepts `originApp` and, when it is
not `"auto"`, a manually-entered matter in place of an Auto package:
```
{ "title", "originApp": "compliance" | "audit" | "matrix-paid",
  "claimReference"?, "claimType"?, "description"?,
  "recipientCompany", "invitedEmail"?, "permissionScope", "message"?,
  "includedDocuments": string[] }
```
`autoClaimId` is omitted for these origins. The created `ClaimMatrix.status`
starts at a negotiation-stage value rather than the Auto flow's default.

### 6.6 Frontend wiring map additions

| Service file | Endpoint(s) |
|---|---|
| `services/accessService.js` | `/access-tiers`, `/upgrade-requests*`, `/access-requests*` |
