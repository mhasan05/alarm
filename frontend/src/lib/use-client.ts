"use client";

import { useCallback, useSyncExternalStore } from "react";

// Browser-only values that must render the same on the server and on the first client pass.
// Reading them through useSyncExternalStore avoids hydration mismatches without an effect.

const never = () => () => {};

/** False on the server and during hydration, true afterwards. */
export function useMounted() {
  return useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
}

/** `https://bdalarm.org` in the browser, "" on the server. */
export function useOrigin() {
  return useSyncExternalStore(
    never,
    () => window.location.origin,
    () => "",
  );
}

/** The current time, refreshed every `stepMs` (0 on the server and before hydration). */
export function useNow(stepMs = 1000) {
  const subscribe = useCallback(
    (tick: () => void) => {
      const t = setInterval(tick, stepMs);
      return () => clearInterval(t);
    },
    [stepMs],
  );
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / stepMs) * stepMs,
    () => 0,
  );
}
