import { apiGet, apiPost, apiPut } from "./api";

export function getNotifications() {
  return apiGet("/notifications");
}

export function markAllNotificationsRead() {
  return apiPost("/notifications/mark-all-read");
}

export function getNotificationPreferences() {
  return apiGet("/notification-preferences");
}

export function updateNotificationPreferences(payload) {
  // payload: { preferences: [{ event, email, inApp, claimToolkit }] }
  return apiPut("/notification-preferences", payload);
}
