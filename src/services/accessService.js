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

export function decideAccessRequest(id, decision, note) {
  // decision: "approve" | "reject"
  return apiPost(`/access-requests/${id}/decision`, { decision, note });
}
