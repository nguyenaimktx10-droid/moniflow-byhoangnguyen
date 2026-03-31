import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiUrl } from '../lib/apiUrl';
import {
  loadGoogleOAuthFromStorage,
  saveGoogleOAuthToStorage,
  pushOAuthConfigToServer,
  type GoogleOAuthStored,
} from '../lib/googleOAuthStorage';
import { DEFAULT_APP_URL_CLOUD_RUN } from '../constants/googleOAuthDefaults';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Gọi khi đăng nhập Google thành công (popup). */
  onConnected?: () => void;
};

export default function GoogleSheetsConnectModal({
  open,
  onClose,
  onConnected,
}: Props) {
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [appUrl, setAppUrl] = useState(DEFAULT_APP_URL_CLOUD_RUN);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const s = loadGoogleOAuthFromStorage();
    setGoogleClientId(s.googleClientId);
    setGoogleClientSecret(s.googleClientSecret);
    setAppUrl(s.appUrl);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        onConnected?.();
        onClose();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [open, onClose, onConnected]);

  const apiFetch = (pathname: string, init?: RequestInit) =>
    fetch(apiUrl(pathname), { ...init, credentials: 'include' });

  const handleConnect = async () => {
    const payload: GoogleOAuthStored = {
      googleClientId: googleClientId.trim(),
      googleClientSecret: googleClientSecret.trim(),
      appUrl: appUrl.trim() || DEFAULT_APP_URL_CLOUD_RUN,
    };
    if (!payload.googleClientId || !payload.googleClientSecret) {
      alert('Vui lòng nhập đủ Client ID và Client Secret.');
      return;
    }
    saveGoogleOAuthToStorage(payload);
    setConnecting(true);
    try {
      const pushed = await pushOAuthConfigToServer(payload);
      if (!pushed) {
        alert(
          'Không gửi được cấu hình lên backend Cloud Run. Kiểm tra backend đang chạy và CORS; có thể đặt biến VITE_API_BASE_URL trên Vercel.'
        );
        return;
      }
      const res = await apiFetch('/api/auth/url');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) {
          alert(
            'API trả 404 — chạy một server có Express (npm run dev hoặc npm start), không chỉ vite preview.'
          );
          return;
        }
        alert(
          data.error ||
            `Không lấy được link Google (${res.status}). Kiểm tra Client ID/Secret và APP_URL.`
        );
        return;
      }
      if (!data.url || typeof data.url !== 'string') {
        alert('Phản hồi server không hợp lệ (thiếu URL OAuth).');
        return;
      }
      const popup = window.open(data.url, 'google_oauth', 'width=600,height=700');
      if (!popup) {
        alert('Trình duyệt đã chặn popup. Cho phép popup và thử lại.');
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi mạng hoặc không kết nối được API.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('moni-google-oauth-modal-dismissed', '1');
    } catch {
      /* ignore */
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-sheets-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleDismiss}
            aria-label="Đóng"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-card-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h2
                    id="google-sheets-modal-title"
                    className="text-base font-black text-slate-800 dark:text-white"
                  >
                    Kết nối Google
                  </h2>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    OAuth &amp; Sheets — lưu vào hệ thống khi bấm Kết nối
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[9px] font-black uppercase tracking-tighter text-slate-400">
                  GOOGLE_CLIENT_ID
                </span>
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[9px] font-black uppercase tracking-tighter text-slate-400">
                  GOOGLE_CLIENT_SECRET
                </span>
                <input
                  type="password"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[9px] font-black uppercase tracking-tighter text-slate-400">
                  APP_URL
                </span>
                <input
                  type="url"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
            </div>

            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
              <Link2 size={14} className="mt-0.5 shrink-0 text-slate-400" />
              Redirect URI trên Google Cloud:{' '}
              <code className="break-all text-[10px] text-slate-700 dark:text-slate-300">
                {(appUrl.trim() || DEFAULT_APP_URL_CLOUD_RUN).replace(/\/$/, '')}/auth/callback
              </code>
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={connecting}
                onClick={() => void handleConnect()}
                className="flex-1 rounded-2xl bg-emerald-500 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-600 disabled:opacity-60"
              >
                {connecting ? 'Đang xử lý…' : 'Kết nối'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
