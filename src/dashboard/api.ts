import { useCallback, useEffect, useState } from 'react';

export class ApiError extends Error {
  constructor(message: string, public status: number, public reason?: string) {
    super(message);
  }
}

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init?.headers : { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error || body.detail || `Request failed (${res.status})`, res.status, body.reason);
  return body as T;
}

/** Fetches an AI-generated resource. `refresh()` asks the backend to regenerate via the AI engine. */
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (regenerate = false) => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const sep = path.includes('?') ? '&' : '?';
      setData(await api<T>(regenerate ? `${path}${sep}refresh=1` : path));
    } catch (e: any) {
      setError(e instanceof ApiError ? e : new ApiError(e.message, 0));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { setData(null); load(); }, [load]);
  return { data, error, loading, refresh: () => load(true), reload: () => load(false) };
}

export const money = (n?: number) =>
  n == null ? '—' : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n).toLocaleString()}`;
export const fullMoney = (n?: number) => (n == null ? '—' : `$${Math.round(n).toLocaleString()}`);
