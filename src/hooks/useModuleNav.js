import { moduleNav } from "@/constants/navigation";
import { useAccessTier } from "@/hooks/useAccessTier";

/** The module tiles the signed-in account may see (shared by the sidebar and the mobile menu). */
export function useModuleNav() {
  const { tierKey, capabilities, isAdmin } = useAccessTier();

  return moduleNav.filter((item) => {
    switch (item.show) {
      case "everyone":
        return true;
      case "auto":
        return isAdmin || tierKey === "level3";
      case "compliance":
        return isAdmin || tierKey === "level2";
      case "admin":
        return isAdmin;
      default:
        return !!capabilities[item.show];
    }
  });
}
