import { useState, useEffect } from "react";
import { getClaimById } from "@/services/claimService";
import { pickData } from "@/services/api";

export function useClaimDetail(claimId, refreshKey = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!claimId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    getClaimById(claimId)
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
  }, [claimId, refreshKey]);

  return { data, loading, error };
}
