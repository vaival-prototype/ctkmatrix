import { useState, useEffect, useCallback } from "react";
import { getUpgradeRequests } from "@/services/accessService";
import { pickList } from "@/services/api";

export function useUpgradeRequests(refreshKey = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    getUpgradeRequests()
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
