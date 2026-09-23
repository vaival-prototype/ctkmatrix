import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRbacPolicy } from "@/hooks/useRbacPolicy";

/**
 * Mirrors the backend's RequireRbacFunctionAttribute: a function is blocked for the
 * signed-in user's role only when the real RBAC matrix (GET /admin/rbac) has an
 * explicit "no" for that (functionKey, role) pair. A missing row, "yes", or "maybe"
 * all allow — same fail-open rule as the server, so the UI never hides something the
 * API would actually let through (or vice versa).
 */
export function usePermissions() {
  const { user } = useAuth();
  const { data: policy, loading } = useRbacPolicy();

  const roleKey = useMemo(() => {
    if (!policy || !user?.role) return null;
    return policy.roles.find((r) => r.name === user.role)?.key ?? null;
  }, [policy, user]);

  const can = useMemo(() => {
    return (functionKey) => {
      if (!policy || !roleKey) return true;
      const row = policy.matrix.find((f) => f.functionKey === functionKey);
      return row?.roles?.[roleKey] !== "no";
    };
  }, [policy, roleKey]);

  return { can, loading };
}
