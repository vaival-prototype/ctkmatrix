import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as authService from "@/services/authService";
import { pickData, TOKEN_KEY, USER_KEY } from "@/services/api";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistSession(user, token) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage unavailable — session simply won't persist across reloads.
  }
}

function clearSession() {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

// The auth responses are undocumented in swagger, so read the bearer token
// tolerantly: check the common field names, then one level of nesting
// (e.g. `{ data: { token } }` or `{ session: { accessToken } }`).
const TOKEN_FIELDS = ["token", "accessToken", "access_token", "bearerToken", "jwt", "idToken"];

function pickToken(...objs) {
  for (const obj of objs) {
    if (!obj || typeof obj !== "object") continue;
    for (const field of TOKEN_FIELDS) {
      if (typeof obj[field] === "string" && obj[field]) return obj[field];
    }
    for (const nestedKey of ["data", "session", "auth", "result"]) {
      const nested = obj[nestedKey];
      if (nested && nested !== obj) {
        const token = pickToken(nested);
        if (token) return token;
      }
    }
  }
  return null;
}

// Derive the session user from an auth response, preferring the returned
// record and falling back to a minimal one.
function pickUser(data, fallback) {
  return (data && (data.user || (data.email ? data : null))) || fallback || null;
}

/**
 * Auth is a bearer-token session: a successful /auth/login or
 * /auth/accept-invitation returns a user and a bearer token. Both are stored in
 * localStorage — the token under TOKEN_KEY, which `api.js` reads and attaches as
 * `Authorization: Bearer <token>` on every subsequent request. Without this,
 * protected endpoints return 401.
 */
export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => readStoredUser());
  // Session is read synchronously from storage, so there's nothing to await.
  const [loading, setLoading] = useState(false);

  const setUser = useCallback((next) => {
    setUserState(next);
    persistSession(next, null);
  }, []);

  // Re-read the persisted session (used by AcceptInvitation after signup).
  const refresh = useCallback(() => {
    const stored = readStoredUser();
    setUserState(stored);
    return stored;
  }, []);

  useEffect(() => {
    // No remote session to hydrate today; ensure loading is settled.
    setLoading(false);
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authService.login(credentials);
    const data = pickData(res);
    const nextUser = pickUser(data, { email: credentials.email, name: credentials.email });
    const token = pickToken(data, res);
    persistSession(nextUser, token);
    setUserState(nextUser);
    return nextUser;
  }, []);

  // Accept an invitation = register + start a session. Mirrors login: the
  // response carries a bearer token that MUST be persisted, or every following
  // request 401s. `fallbackUser` (e.g. the previewed invite email) is used when
  // the response omits the user record.
  const acceptInvitation = useCallback(async (payload, fallbackUser = null) => {
    const res = await authService.acceptInvitation(payload);
    const data = pickData(res);
    const nextUser = pickUser(data, fallbackUser);
    const token = pickToken(data, res);
    persistSession(nextUser, token);
    setUserState(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network/endpoint errors — we always clear locally.
    } finally {
      clearSession();
      setUserState(null);
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    acceptInvitation,
    logout,
    refresh,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
