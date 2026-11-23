"use client";

import { useCallback, useEffect, useState } from "react";

interface State<T> {
  data: T | undefined;
  error: unknown;
  /** Request generation that produced `data`/`error`. */
  settled: number;
}

/**
 * Small data hook: runs `fetcher` on mount and whenever `key` changes,
 * keeps the last good data while reloading, and exposes `reload()`.
 */
export function useApi<T>(fetcher: () => Promise<T>, key: string = "") {
  const [gen, setGen] = useState(1);
  const [state, setState] = useState<State<T>>({ data: undefined, error: null, settled: 0 });
  const [lastKey, setLastKey] = useState(key);

  // Key change: bump the generation during render instead of in an effect.
  if (lastKey !== key) {
    setLastKey(key);
    setGen((g) => g + 1);
  }

  useEffect(() => {
    let cancelled = false;
    const myGen = gen;
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, settled: myGen });
      })
      .catch((error) => {
        if (!cancelled) setState((s) => ({ data: s.data, error, settled: myGen }));
      });
    return () => {
      cancelled = true;
    };
    // fetcher identity is intentionally ignored; `key` and `gen` drive reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen]);

  const reload = useCallback(() => setGen((g) => g + 1), []);
  const mutate = useCallback((fn: (prev: T | undefined) => T | undefined) => {
    setState((s) => ({ ...s, data: fn(s.data) }));
  }, []);

  const loading = state.settled !== gen;
  return {
    data: state.data,
    error: loading ? null : state.error,
    loading,
    /** First load with nothing to show yet. */
    initialLoading: loading && state.data === undefined,
    reload,
    mutate,
  };
}
