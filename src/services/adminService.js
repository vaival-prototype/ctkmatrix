import { apiGet, apiPut } from "./api";

export function getRbacPolicy() {
  return apiGet("/admin/rbac");
}

export function updateRbacPolicy(payload) {
  return apiPut("/admin/rbac", payload);
}

export function getRoles() {
  return apiGet("/admin/roles");
}

export function getSystemBoundaries() {
  return apiGet("/admin/system-boundaries");
}

export function getIntegrationEvents() {
  return apiGet("/admin/integration-events");
}

export function getCollaborationModes() {
  return apiGet("/admin/collaboration-modes");
}
