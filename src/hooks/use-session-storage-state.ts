"use client";

import { useEffect, useRef, useState } from "react";

// sessionStorage 同期フック。SSR 中はデフォルト値を返し、マウント後に保存値で再水和する。
export function useSessionStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as T;
        setValue(parsed);
      }
    } catch {
      // 破損データは無視して初期値で続行する。
    } finally {
      hydratedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydratedRef.current) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // クォータ超過は無視する。
    }
  }, [key, value]);

  function clear() {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  return { value, setValue, clear, isHydrated: hydratedRef.current } as const;
}
