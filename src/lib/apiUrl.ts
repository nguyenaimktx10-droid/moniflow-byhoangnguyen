import { DEFAULT_APP_URL_CLOUD_RUN } from '../constants/googleOAuthDefaults';

function defaultAppHostname(): string {
  try {
    return new URL(DEFAULT_APP_URL_CLOUD_RUN).hostname;
  } catch {
    return '';
  }
}

/**
 * Base URL API khi frontend và backend khác origin.
 * 1) VITE_API_BASE_URL (Vercel / tách FE-BE)
 * 2) Trình duyệt không phải host backend (vd. *.vercel.app) → gọi Cloud Run trong constants
 * 3) Cùng host với backend hoặc localhost → rỗng (cùng origin hoặc proxy dev)
 */
export function getApiBaseUrl(): string {
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envBase != null && String(envBase).trim() !== '') {
    return String(envBase).replace(/\/$/, '');
  }
  if (typeof window === 'undefined') return '';

  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') {
    return '';
  }

  const backendHost = defaultAppHostname();
  if (backendHost && h !== backendHost) {
    return DEFAULT_APP_URL_CLOUD_RUN.replace(/\/$/, '');
  }
  return '';
}

/** Đường dẫn đầy đủ gọi API (vd: /api/auth/url hoặc https://api.../api/auth/url). */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${p}` : p;
}
