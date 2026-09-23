import { apiGet, apiPost } from "./api";

export function getApprovalQueue() {
  return apiGet("/approvals");
}

export function submitApprovalDecision(id, payload) {
  // payload: { decision: "approve"|"reject", note }
  return apiPost(`/approvals/${id}/decision`, payload);
}
