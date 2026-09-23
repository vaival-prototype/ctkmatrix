const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
export const API_BASE_URL = BASE_URL;

/** localStorage keys for the client-side session. */
export const TOKEN_KEY = "cm_auth_token";
export const USER_KEY = "cm_auth_user";

// Offline mock mode: when explicitly enabled, every request is served from
// src/services/mockResolver.js instead of the network. Defaults OFF so the app
// hits the real API (and shows "Data not found" when data is absent); set
// VITE_USE_MOCK="true" in .env to use the bundled mock instead.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

/**
 * Configured fetch wrapper for the REST API.
 * All service files use these helpers instead of raw fetch.
 *
 * Auth: `POST /auth/login` returns `{ data: { user, token, expiresAt } }`.
 * `AuthContext` persists `token` under TOKEN_KEY, and every request here
 * attaches it as `Authorization: Bearer <token>` automatically. `credentials:
 * "include"` is also kept so the backend's httpOnly cookie fallback works too
 * (same-origin/Swagger) — the two transports are independent, either is enough.
 *
 * Responses are undocumented in swagger.yaml (bare 200s), so callers must not
 * assume an envelope — use `pickData` / `pickList` to read the body tolerantly.
 */

/** Error thrown for any non-2xx response, carrying the parsed error envelope. */
export class ApiError extends Error {
  constructor(message, { status, code, fields } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields || null;
  }
}

function authToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function parseError(res, method, path) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON error body
  }
  const err = body && body.error ? body.error : {};
  return new ApiError(err.message || `${method} ${path} failed: ${res.status}`, {
    status: res.status,
    code: err.code,
    fields: err.fields || body?.errors || null,
  });
}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  if (USE_MOCK) {
    // Lazy import avoids any load-order coupling with the resolver.
    const { resolveMock } = await import("./mockResolver");
    return resolveMock(path, method, body);
  }

  const init = {
    method,
    credentials: "include",
    headers: {},
  };

  const token = authToken();
  if (token) init.headers["Authorization"] = `Bearer ${token}`;

  if (body !== undefined) {
    if (isForm) {
      // FormData: let the browser set Content-Type (with multipart boundary).
      init.body = body;
    } else {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
  } else if (method !== "GET" && method !== "DELETE") {
    init.headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) throw await parseError(res, method, path);
  if (res.status === 204) return { data: null };

  // Tolerate empty/non-JSON success bodies without throwing.
  const text = await res.text();
  if (!text) return { data: null };
  try {
    return JSON.parse(text);
  } catch {
    return { data: text };
  }
}

export function apiGet(path) {
  return request(path, { method: "GET" });
}

export function apiPost(path, body) {
  return request(path, { method: "POST", body });
}

export function apiPut(path, body) {
  return request(path, { method: "PUT", body });
}

export function apiDelete(path) {
  return request(path, { method: "DELETE" });
}

/** Multipart upload (file + fields). Pass a FormData instance. */
export function apiUpload(path, formData) {
  return request(path, { method: "POST", body: formData, isForm: true });
}

/**
 * Unwrap a single-object response tolerantly. Accepts `{ data: {...} }`,
 * `{ result: {...} }`, or a raw object. Returns null when there's nothing.
 */
export function pickData(res) {
  if (res == null) return null;
  if (typeof res === "object" && !Array.isArray(res)) {
    if ("data" in res) return res.data ?? null;
    if ("result" in res) return res.result ?? null;
  }
  return res;
}

/**
 * Unwrap a list response tolerantly into { items, meta }. Accepts
 * `{ data: [...], meta }`, `{ items: [...] }`, `{ results: [...] }`, a raw
 * array, or a paged `{ data: { items: [...], total } }`. Never throws; always
 * returns an array for `items`.
 */
export function pickList(res) {
  const meta = (res && typeof res === "object" && res.meta) || null;
  const inner = pickData(res);
  let items = [];
  if (Array.isArray(inner)) {
    items = inner;
  } else if (inner && typeof inner === "object") {
    items = inner.items || inner.results || inner.data || [];
    if (!Array.isArray(items)) items = [];
  }
  return { items, meta: meta || inner?.meta || null };
}
