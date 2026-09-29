import { apiGet, apiPost } from "./api";

// Prototype-only helpers: the simulated email inbox and resetting demo data.

export function getDemoEmails() {
  return apiGet("/demo/emails");
}

export function resetDemoData() {
  return apiPost("/demo/reset");
}
