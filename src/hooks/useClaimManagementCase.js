import { useState, useEffect, useCallback } from "react";
import { getClaimManagementCase } from "@/services/claimManagementService";
import { pickData } from "@/services/api";

export function useClaimManagementCase(id, refreshKey = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (!id) return () => {};
    const controller = new AbortController();
    setLoading(true);
    getClaimManagementCase(id)
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
  }, [id]);

  useEffect(() => load(), [load, refreshKey]);

  return { data, loading, error };
}
