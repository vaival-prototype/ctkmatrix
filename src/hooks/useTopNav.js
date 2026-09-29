import { topNav } from "@/constants/navigation";
import { useAccessTier } from "@/hooks/useAccessTier";

/**
 * Top navigation items for the signed-in account. "Initiate Matrix" shows to
 * anyone who can start one, and to Level 1 users (it's where they request an
 * upgrade). Level 4 (a person in the claim) gets no top nav at all.
 */
export function useTopNav() {
  const { tierKey, capabilities } = useAccessTier();
  if (tierKey === "level4") return [];
  return topNav.filter(
    (item) => item.to !== "/new-shared-claim" || capabilities.initiate || capabilities.requestUpgrade
  );
}
