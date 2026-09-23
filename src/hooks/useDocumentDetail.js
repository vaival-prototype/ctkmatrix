import { useState, useEffect } from "react";
import { getDocumentById } from "@/services/documentService";
import { pickData } from "@/services/api";

export function useDocumentDetail(documentId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!documentId) return;
    const controller = new AbortController();
    setLoading(true);
    getDocumentById(documentId)
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
  }, [documentId]);

  return { data, loading, error };
}
