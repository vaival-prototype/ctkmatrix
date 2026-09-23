import { useState, useEffect, useCallback } from "react";
import { getClaimManagementCases } from "@/services/claimManagementService";
import { pickList } from "@/services/api";

export function useClaimManagementCases(refreshKey = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    getClaimManagementCases()
      .then((res) => {
        if (!controller.signal.aborted) setData(pickList(res).items);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => load(), [load, refreshKey]);

  return { data, loading, error };
}
