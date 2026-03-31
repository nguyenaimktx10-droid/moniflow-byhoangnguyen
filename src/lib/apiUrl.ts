/**
 * Base URL API khi frontend và backend khác origin (VITE_API_BASE_URL).
 */
export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (base != null && String(base).trim() !== '') {
    return String(base).replace(/\/$/, '');
  }
  return '';
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${p}` : p;
}
