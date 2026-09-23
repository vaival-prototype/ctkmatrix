import { useState, useEffect } from "react";
import { getAuditEvents } from "@/services/auditService";
import { pickList } from "@/services/api";

export function useAuditEvents(matrixCode) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getAuditEvents({ limit: 50, matrixCode })
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
  }, [matrixCode]);

  return { data, loading, error };
}
