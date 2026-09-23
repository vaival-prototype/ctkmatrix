import { apiGet, apiPost } from "./api";

// Reads
export function getClaimMatrixes() {
  return apiGet("/claims");
}

export function getClaimById(id) {
  return apiGet(`/claims/${id}`);
}

export function getClaimPackages() {
  return apiGet("/claim-packages");
}

// Live Claim Toolkit Auto claims (Claimtoolkit_Auto database) + Send to Matrix
export function getAutoClaims(page = 1, limit = 25) {
  return apiGet(`/auto-claims?page=${page}&limit=${limit}`);
}

export function sendAutoClaimToMatrix(payload) {
  return apiPost("/auto-claims/send", payload);
}

// Mutations
export function createClaimMatrix(payload) {
  return apiPost("/claims", payload);
}

export function submitClaimResponse(id, payload) {
  return apiPost(`/claims/${id}/responses`, payload);
}

export function submitSettlementAction(id, payload) {
  // payload: { action: "propose"|"counter"|"accept"|"reject", amount, split, status, terms, rationale }
  return apiPost(`/claims/${id}/settlement`, payload);
}

export function submitCompanyAssessment(id, payload) {
  // payload: { splits: [{ company, percent }, ...] } — percents should sum to 100
  return apiPost(`/claims/${id}/assessment`, payload);
}

export function submitDutyAgreement(id, payload) {
  // payload: { items: [{ category, status: "agreed"|"disputed", reason }, ...] }
  return apiPost(`/claims/${id}/duty-agreement`, payload);
}

export function closeClaimMatrix(id, payload) {
  return apiPost(`/claims/${id}/close`, payload);
}

export function submitClaimDecision(id, payload) {
  return apiPost(`/claims/${id}/decisions`, payload);
}
