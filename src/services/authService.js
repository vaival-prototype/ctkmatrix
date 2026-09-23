import { apiGet, apiPost } from "./api";

/** Email + password → `{ user, token, expiresAt }`; AuthContext persists the token. */
export function login(payload) {
  // payload: { email, password, remember }
  return apiPost("/auth/login", payload);
}

/** Revokes the session server-side; caller still clears the local token. */
export function logout() {
  return apiPost("/auth/logout");
}

/** Current session user; throws ApiError(401) when unauthenticated. */
export function getCurrentUser() {
  return apiGet("/auth/me");
}

export function requestPasswordReset(payload) {
  // payload: { email }
  return apiPost("/auth/password-reset", payload);
}

/**
 * Preview an invitation by its code. The accept-invite screen reads the code
 * from the invitation link's query string (/accept-invite?code=<code>) and calls
 * this on load to show the invited email/company/role.
 */
export function lookupInvitation(code) {
  return apiGet(`/invitations/lookup?code=${encodeURIComponent(code)}`);
}

/**
 * Accept an invitation: create the user + start a session.
 * `code` is the token from the /accept-invite?code= link. `fullName` is
 * required for a brand-new registrant; the backend ignores it when the
 * invited email already has an account.
 */
export function acceptInvitation(payload) {
  // payload: { code, password, fullName }
  return apiPost("/auth/accept-invitation", payload);
}
