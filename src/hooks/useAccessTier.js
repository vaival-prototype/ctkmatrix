import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccessTiers } from "@/hooks/useAccessTiers";

const NO_CAPABILITIES = {};

const TIER_LABELS = {
  admin: "Admin",
  approver: "Approver",
  level1: "Level 1",
  level2: "Level 2",
  level3: "Level 3",
  level4: "Level 4",
};

/**
 * The signed-in user's account type and what it may do, from GET
 * /access-tiers. Fails closed: while the list is loading, or for a missing or
 * unknown tier, every capability is false — nothing is shown that the user
 * might not be allowed to use.
 */
export function useAccessTier() {
  const { user } = useAuth();
  const { data: tiers, loading } = useAccessTiers();

  const tierKey = user?.tier ?? null;

  const tierMeta = useMemo(() => {
    if (!tiers || !tierKey) return null;
    return tiers.find((t) => t.key === tierKey) ?? null;
  }, [tiers, tierKey]);

  const capabilities = tierMeta?.capabilities ?? NO_CAPABILITIES;

  return {
    tierKey,
    tierMeta,
    tierLabel: TIER_LABELS[tierKey] ?? "",
    capabilities,
    isAdmin: tierKey === "admin",
    isApprover: tierKey === "approver",
    loading,
  };
}
