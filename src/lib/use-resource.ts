"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "./api";

type State<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: string };

/** Loads data with explicit loading/success/error states and a reload action. */
export function useResource<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ status: "loading", data: null, error: null });

  const run = useCallback(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });
    load().then(
      (data) => !cancelled && setState({ status: "success", data, error: null }),
      (e) => !cancelled && setState({ status: "error", data: null, error: errorMessage(e) }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(run, [run]);

  const setData = useCallback((update: (prev: T) => T) => {
    setState((s) => (s.status === "success" ? { ...s, data: update(s.data) } : s));
  }, []);

  return { ...state, reload: run, setData };
}
