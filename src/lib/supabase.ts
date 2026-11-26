import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AppConfigStatus } from '../types';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedAnonKey = '';

export function getSupabaseClient(url: string, anonKey: string): SupabaseClient {
  if (cachedClient && cachedUrl === url && cachedAnonKey === anonKey) {
    return cachedClient;
  }
  cachedUrl = url;
  cachedAnonKey = anonKey;
  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cachedClient;
}

export async function fetchConfigStatus(): Promise<AppConfigStatus> {
  const res = await fetch('/api/config/status');
  if (!res.ok) {
    throw new Error('Gagal memeriksa status konfigurasi server.');
  }
  return res.json();
}

export async function apiFetch<T>(
  path: string,
  accessToken: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Permintaan gagal (${res.status}).`);
  }
  return data as T;
}
