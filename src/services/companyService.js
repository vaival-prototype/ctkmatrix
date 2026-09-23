import { apiGet, apiPost, pickList } from "./api";

export function getCompanies() {
  return apiGet("/companies");
}

/** No GET /companies/:id on the backend — resolve from the list instead. */
export async function getCompanyById(id) {
  const res = await apiGet("/companies");
  const { items } = pickList(res);
  const company = items.find((c) => String(c.id) === String(id)) ?? null;
  return { data: company };
}

/** Full onboarding-form shape for a company (lifecycle/trust/billing/contacts/product statuses). */
export function getCompanyDetail(code) {
  return apiGet(`/companies/${code}`);
}

export function submitCompanyOnboarding(payload) {
  return apiPost("/companies/onboarding", payload);
}
