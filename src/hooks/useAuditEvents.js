import { useState, useEffect } from "react";
import { getAuditEvents } from "@/services/auditService";
import { pickList } from "@/services/api";

/**
 * Audit events, newest first. Pass a matrix code to scope to one claim.
 * `enabled: false` skips the request entirely (for users who can't see the
 * Audit Trail). Page/limit are primitives so the effect doesn't re-run on
 * every render.
 */
export function useAuditEvents(matrixCode, { page = 1, limit = 50, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getAuditEvents({ page, limit, matrixCode })
      .then((res) => {
        if (controller.signal.aborted) return;
        const { items, meta: listMeta } = pickList(res);
        setData(items);
        setMeta(listMeta);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [matrixCode, page, limit, enabled]);

  return { data, meta, loading, error };
}
