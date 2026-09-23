import { useState, useEffect, useCallback } from "react";
import { getInvoices } from "@/services/accessService";
import { pickList } from "@/services/api";

/** All invoices, or those for one upgrade request when upgradeRequestId is passed. */
export function useInvoices(upgradeRequestId, refreshKey = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    getInvoices(upgradeRequestId)
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
  }, [upgradeRequestId]);

  useEffect(() => load(), [load, refreshKey]);

  return { data, loading, error };
}
