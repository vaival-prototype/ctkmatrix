import { apiGet, apiPost, apiPut } from "./api";

// Use Case 5 — Claim Management ("Contribution"). Coordinates negligent free
// third-party injury claims settled via a Joint Defense Agreement (JDA) or
// Shared Interest Agreement (SIA). Sits outside the Level 1-4 access ladder.

export function getClaimManagementCases() {
  return apiGet("/claim-management");
}

export function getClaimManagementCase(id) {
  return apiGet(`/claim-management/${id}`);
}

export function createClaimManagementCase(payload) {
  // payload: { title, relatedMatrixId?, leadCompany, agreementType }
  return apiPost("/claim-management", payload);
}

export function updateClaimManagementStatus(id, status) {
  return apiPut(`/claim-management/${id}`, { status });
}

export function updateAgreement(id, agreement) {
  // agreement: subset of { status, docusignEnvelopeId, documentName, executedAt }
  return apiPut(`/claim-management/${id}`, { agreement });
}

export function addParty(id, party) {
  // party: { name, company, contactEmail, role, injuryDescription, contributionAmount? }
  return apiPut(`/claim-management/${id}`, { appendParty: party });
}

export function updateParty(id, partyId, fields) {
  return apiPut(`/claim-management/${id}`, { updateParty: { id: partyId, ...fields } });
}

export function addActivityNote(id, note) {
  return apiPut(`/claim-management/${id}`, { appendNote: note });
}

export function addDocument(id, document) {
  // document: { name, category }
  return apiPut(`/claim-management/${id}`, { appendDocument: document });
}

export function addRelease(id, release) {
  // release: { party, status, executedDate? }
  return apiPut(`/claim-management/${id}`, { appendRelease: release });
}
