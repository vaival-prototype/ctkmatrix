import Spinner from "@/components/shared/Spinner";
import NoAccess from "@/components/shared/NoAccess";
import { useAccessTier } from "@/hooks/useAccessTier";

/** Renders the page only if the signed-in account has `capability`. */
export default function AccessGuard({ capability, children }) {
  const { capabilities, loading } = useAccessTier();
  if (loading) return <Spinner />;
  if (!capabilities[capability]) return <NoAccess />;
  return children;
}
