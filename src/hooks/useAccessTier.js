import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccessTiers } from "@/hooks/useAccessTiers";

const FALLBACK_CAPS = {
  initiate: true,
  assessment: true,
  chat: true,
  askCtkStateSummary: true,
  askCtkCaseSummary: true,
  askCtkStatementSummaries: true,
  askCtkHistories: true,
  rebuttalSceneDiagram: true,
  statutes: true,
  investigation: true,
  caseManagement: true,
  inviteExternal: true,
};

/**
 * Resolves the signed-in user's access level (Level 1-4, per Mark's
 * requirements spec) and its capability flags from GET /access-tiers.
 * Fails open (full access) while the tier list is loading or unavailable, the
 * same fail-open convention usePermissions uses for RBAC — the UI never hides
 * something the API would actually allow.
 */
export function useAccessTier() {
  const { user } = useAuth();
  const { data: tiers, loading } = useAccessTiers();

  const tierKey = user?.tier ?? "level3";

  const tierMeta = useMemo(() => {
    if (!tiers) return null;
    return tiers.find((t) => t.key === tierKey) ?? null;
  }, [tiers, tierKey]);

  const capabilities = tierMeta?.capabilities ?? FALLBACK_CAPS;

  return { tierKey, tierMeta, capabilities, loading };
}
