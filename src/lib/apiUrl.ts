/**
 * Base URL API khi frontend và backend khác origin (build với VITE_API_BASE_URL).
 * Mặc định rỗng → dùng cùng origin (một Cloud Run / một server).
 */
export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (base != null && String(base).trim() !== '') {
    return String(base).replace(/\/$/, '');
  }
  return '';
}

/** Đường dẫn đầy đủ gọi API (vd: /api/auth/url hoặc https://api.../api/auth/url). */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${p}` : p;
}
