import { useState, useEffect } from "react";
import { getAccessTiers } from "@/services/accessService";
import { pickList } from "@/services/api";

export function useAccessTiers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getAccessTiers()
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

  return { data, loading, error };
}
