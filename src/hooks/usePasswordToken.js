import { useState, useEffect } from "react";
import { getPasswordToken } from "@/services/authService";
import { pickData } from "@/services/api";

export function usePasswordToken(token) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getPasswordToken(token)
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
  }, [token]);

  return { data, loading, error };
}
