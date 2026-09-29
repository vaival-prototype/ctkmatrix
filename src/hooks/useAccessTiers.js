import { useState, useEffect } from "react";
import { getAccessTiers } from "@/services/accessService";
import { pickList } from "@/services/api";

// The access-level list is static for a session, and many components read it
// at once (shell, nav, every gated page). Share one request and cache the
// result so capability checks don't start "empty" on every mount.
let cachedTiers = null;
let inflight = null;

function fetchTiers() {
  if (!inflight) {
    inflight = getAccessTiers()
      .then((res) => {
        cachedTiers = pickList(res).items;
        return cachedTiers;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

export function useAccessTiers() {
  const [data, setData] = useState(cachedTiers);
  const [loading, setLoading] = useState(!cachedTiers);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cachedTiers) return undefined;
    let active = true;
    fetchTiers()
      .then((tiers) => {
        if (active) setData(tiers);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}
