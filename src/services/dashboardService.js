import { apiGet } from "./api";

/**
 * Home dashboard payload: headline metrics, open claim matrixs, recent
 * activity, and unread notifications. See APIrequire.md → GET /dashboard.
 */
export function getDashboard() {
  return apiGet("/dashboard");
}
