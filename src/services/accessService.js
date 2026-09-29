import { apiGet, apiPost } from "./api";

// Access levels (Level 1-4, per Mark's requirements spec) and the self-serve
// "request access" queue for someone who was never invited.

export function getAccessTiers() {
  return apiGet("/access-tiers");
}

// Self-serve access requests (no invitation on file)
export function getAccessRequests() {
  return apiGet("/access-requests");
}

export function createAccessRequest(payload) {
  // payload: { name, email, company, reason }
  return apiPost("/access-requests", payload);
}

export function decideAccessRequest(id, payload) {
  // payload: { decision: "approve" | "reject", companyMode?: "new" | "existing", companyId?, note? }
  return apiPost(`/access-requests/${id}/decision`, payload);
}

// Level 1 → Level 2/3 upgrade requests. Level 1 users see only their own;
// Admin and Approvers see the full queue.
export function getUpgradeRequests() {
  return apiGet("/upgrade-requests");
}

export function createUpgradeRequest(payload) {
  // payload: { note }
  return apiPost("/upgrade-requests", payload);
}

export function decideUpgradeRequest(id, payload) {
  // payload: { decision: "approve" | "reject", level?: "level2" | "level3", note? }
  return apiPost(`/upgrade-requests/${id}/decision`, payload);
}
