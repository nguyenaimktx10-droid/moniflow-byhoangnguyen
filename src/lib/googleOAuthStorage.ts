import { DEFAULT_APP_URL_CLOUD_RUN } from '../constants/googleOAuthDefaults';
import { apiUrl } from './apiUrl';

const STORAGE_KEY = 'moni-google-oauth-v2';

export type GoogleOAuthStored = {
  googleClientId: string;
  googleClientSecret: string;
  appUrl: string;
};

/** Mặc định từ VITE_* (.env.local, không commit) hoặc để trống — nhập trong popup. */
export function getDefaultOAuthPayload(): GoogleOAuthStored {
  const env = import.meta.env;
  return {
    googleClientId: String(env.VITE_GOOGLE_CLIENT_ID ?? '').trim(),
    googleClientSecret: String(env.VITE_GOOGLE_CLIENT_SECRET ?? '').trim(),
    appUrl: String(env.VITE_APP_URL ?? '').trim() || DEFAULT_APP_URL_CLOUD_RUN,
  };
}

export function loadGoogleOAuthFromStorage(): GoogleOAuthStored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const j = JSON.parse(raw) as Partial<GoogleOAuthStored>;
      const base = getDefaultOAuthPayload();
      return {
        googleClientId: (j.googleClientId ?? base.googleClientId).trim(),
        googleClientSecret: (j.googleClientSecret ?? base.googleClientSecret).trim(),
        appUrl: (j.appUrl ?? base.appUrl).trim(),
      };
    }
  } catch {
    /* ignore */
  }
  return getDefaultOAuthPayload();
}

export function saveGoogleOAuthToStorage(data: GoogleOAuthStored): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Ghi mặc định vào localStorage nếu chưa có (lần đầu mở app). */
export function ensureGoogleOAuthDefaultsInStorage(): GoogleOAuthStored {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    const d = getDefaultOAuthPayload();
    saveGoogleOAuthToStorage(d);
    return d;
  }
  return loadGoogleOAuthFromStorage();
}

export type PushOAuthResult =
  | { ok: true }
  | { ok: false; reason: 'http'; status: number; body: string }
  | { ok: false; reason: 'network'; message: string };

/** Trên Vercel: gọi cùng origin → vercel.json proxy sang Cloud Run (không CORS). */
function urlForOauthConfigPost(): string {
  try {
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
      return '/api/oauth/config';
    }
  } catch {
    /* ignore */
  }
  return apiUrl('/api/oauth/config');
}

/** Đẩy cấu hình lên server (bộ nhớ runtime). Không dùng credentials — tránh CORS chặn cross-origin (Vercel → Cloud Run). */
export async function pushOAuthConfigToServer(
  data: GoogleOAuthStored
): Promise<PushOAuthResult> {
  const url = urlForOauthConfigPost();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      mode: 'cors',
      body: JSON.stringify({
        googleClientId: data.googleClientId,
        googleClientSecret: data.googleClientSecret,
        appUrl: data.appUrl,
      }),
    });
    if (res.ok) return { ok: true };
    const body = await res.text().catch(() => '');
    return { ok: false, reason: 'http', status: res.status, body };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: 'network', message };
  }
}
