import { apiGet } from "./api";

/**
 * Audit events are generated from other domain actions. The API returns
 * paginated results — pass page/limit and read meta for totals. Pass matrixCode
 * to scope the feed to a single ClaimMatrix's own history instead of the global feed.
 */
export function getAuditEvents({ page = 1, limit = 25, matrixCode } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (matrixCode) params.set("matrixCode", matrixCode);
  return apiGet(`/audit-events?${params.toString()}`);
}
