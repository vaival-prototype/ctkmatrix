import { apiGet, apiPost, pickList } from "./api";

export function getInvitations() {
  return apiGet("/invitations");
}

/** No GET /invitations/:id on the backend — resolve from the list instead. */
export async function getInvitationById(id) {
  const res = await apiGet("/invitations");
  const { items } = pickList(res);
  const invite = items.find((i) => String(i.id) === String(id)) ?? null;
  return { data: invite };
}

export function createInvitation(payload) {
  return apiPost("/invitations", payload);
}
