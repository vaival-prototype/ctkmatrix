import { apiGet, apiPost, apiPut, pickList } from "./api";

// Reads
export function getUsers() {
  return apiGet("/users");
}

/** No GET /users/:id on the backend — resolve from the list instead. */
export async function getUserById(id) {
  const res = await apiGet("/users");
  const { items } = pickList(res);
  const user = items.find((u) => String(u.id) === String(id)) ?? null;
  return { data: user };
}

export function getSyncSettings() {
  return apiGet("/users/sync-settings");
}

export function getUserMemberships(code) {
  return apiGet(`/users/${code}/memberships`);
}

export function getSyncRuns() {
  return apiGet("/users/sync-runs");
}

export function getSyncSettingHistory() {
  return apiGet("/users/sync-settings-history");
}

export function getMembershipHistory() {
  return apiGet("/users/membership-history");
}

// Mutations
export function createUser(payload) {
  return apiPost("/users", payload);
}

/** "Save as draft" — same shape as createUser, stored only in the DB (never sends an invite). */
export function saveDraftUser(payload) {
  return apiPost("/users", { ...payload, draft: true, sendInvite: false });
}

export function updateUser(id, payload) {
  return apiPut(`/users/${id}`, payload);
}

export function runUserSync(payload) {
  return apiPost("/users/sync", payload);
}

export function updateSyncSettings(payload) {
  return apiPut("/users/sync-settings", payload);
}

export function updateRbacPolicy(payload) {
  return apiPut("/admin/rbac", payload);
}
