import { useState, useEffect } from "react";
import { lookupInvitation } from "@/services/authService";
import { pickData } from "@/services/api";

/** Preview of an invitation from its emailed code (null code = nothing to look up). */
export function useInvitationLookup(code) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!code);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    lookupInvitation(code)
      .then((res) => {
        if (!controller.signal.aborted) setData(pickData(res));
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [code]);

  return { data, loading, error };
}
