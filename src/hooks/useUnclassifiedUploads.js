import { useState, useEffect, useCallback } from "react";
import { getUnclassifiedUploads } from "@/services/documentService";
import { pickList } from "@/services/api";

export function useUnclassifiedUploads(matrixId, refreshKey = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    getUnclassifiedUploads(matrixId)
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
  }, [matrixId]);

  useEffect(() => load(), [load, refreshKey]);

  return { data, loading, error };
}
