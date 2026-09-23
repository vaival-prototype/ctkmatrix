import { useState, useEffect, useCallback } from "react";
import { getRbacPolicy } from "@/services/adminService";
import { pickData } from "@/services/api";

export function useRbacPolicy() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getRbacPolicy()
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
  }, [refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { data, loading, error, refresh };
}
