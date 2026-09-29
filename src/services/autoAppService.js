import { apiGet, apiPost } from "./api";

// The prototype's stand-in for the Claim Toolkit Auto app, which lives
// outside Matrix. Completing an Assessment there triggers the background job
// that copies the claim into Claim Matrix.

export function getAutoAppClaims() {
  return apiGet("/auto-app/claims");
}

export function completeAutoAssessment(autoClaimId) {
  return apiPost(`/auto-app/claims/${autoClaimId}/complete-assessment`);
}
