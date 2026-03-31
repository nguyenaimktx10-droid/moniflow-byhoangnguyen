import React, { useState, useEffect, useRef } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../lib/utils';
import { Trash2, Download, Info, Moon, Sun, ChevronRight, Shield, Bell, FileSpreadsheet, LogOut, RefreshCw, ExternalLink, Copy, Link2 } from 'lucide-react';
import { DEFAULT_APP_URL_CLOUD_RUN } from '../constants/googleOAuthDefaults';
import { apiUrl } from '../lib/apiUrl';
import { motion, AnimatePresence } from 'motion/react';
import SpendingReminders from './SpendingReminders';

export default function Settings() {
  const { initialBalance, setInitialBalance, transactions, darkMode, toggleDarkMode, spreadsheetId, setSpreadsheetId, resetAllData, resetExceptPayLater } = useFinanceStore();
  const [showReminders, setShowReminders] = useState(false);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  /** Form hỗ trợ CEO dán credential — Client Secret không lưu localStorage */
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [appUrl, setAppUrl] = useState(DEFAULT_APP_URL_CLOUD_RUN);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('moni-google-oauth-form');
      if (raw) {
        const j = JSON.parse(raw) as { googleClientId?: string; appUrl?: string };
        if (typeof j.googleClientId === 'string') setGoogleClientId(j.googleClientId);
        if (typeof j.appUrl === 'string' && j.appUrl.trim()) setAppUrl(j.appUrl.trim());
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'moni-google-oauth-form',
        JSON.stringify({ googleClientId, appUrl })
      );
    } catch {
      /* ignore */
    }
  }, [googleClientId, appUrl]);

  useEffect(() => {
    checkAuthStatus();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsGoogleAuthenticated(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const apiFetch = (pathname: string, init?: RequestInit) =>
    fetch(apiUrl(pathname), { ...init, credentials: 'include' });

  const checkAuthStatus = async () => {
    try {
      const res = await apiFetch('/api/auth/status');
      const data = await res.json();
      setIsGoogleAuthenticated(data.isAuthenticated);
    } catch (error) {
      console.error("Failed to check auth status:", error);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await apiFetch('/api/auth/url');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) {
          alert(
            'API trả 404 — backend Node chưa chạy hoặc sai URL. Trên máy: dùng "npm run dev" hoặc sau build: "npm start" / "npm run preview". Không dùng lệnh "vite preview" một mình (không có /api). Trên Cloud Run: CMD phải là npm start (tsx server.ts).'
          );
          return;
        }
        alert(
          data.error ||
            `Không lấy được link Google (${res.status}). Kiểm tra biến môi trường trên server.`
        );
        return;
      }
      if (!data.url || typeof data.url !== 'string') {
        alert('Phản hồi server không hợp lệ (thiếu URL OAuth).');
        return;
      }
      const popup = window.open(data.url, 'google_oauth', 'width=600,height=700');
      if (!popup) {
        alert('Trình duyệt đã chặn cửa sổ popup. Hãy cho phép popup cho trang này và thử lại.');
      }
    } catch (error) {
      console.error("Failed to get auth URL:", error);
      alert(
        'Lỗi mạng hoặc không kết nối được API. Chạy: npm run dev (một server). Sau build: npm start hoặc npm run preview — không chỉ "vite preview".'
      );
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      setIsGoogleAuthenticated(false);
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await apiFetch('/api/sync-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, spreadsheetId })
      });
      const data = await res.json();
      if (data.success) {
        setSpreadsheetId(data.spreadsheetId);
        alert(`Đã đồng bộ thành công lên Google Sheets! ID: ${data.spreadsheetId}`);
      } else {
        alert(`Lỗi đồng bộ: ${data.error}`);
      }
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Đồng bộ thất bại. Vui lòng thử lại.");
    } finally {
      setIsSyncing(false);
    }
  };

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`Đã sao chép ${label}`);
    } catch {
      alert('Không sao chép được. Hãy chọn và copy thủ công.');
    }
  };

  const copyEnvBlock = () => {
    const block = [
      `GOOGLE_CLIENT_ID=${googleClientId.trim() || '(dán Client ID)'}`,
      `GOOGLE_CLIENT_SECRET=${googleClientSecret.trim() || '(dán Client Secret)'}`,
      `APP_URL=${appUrl.trim() || DEFAULT_APP_URL_CLOUD_RUN}`,
    ].join('\n');
    void copyText('khối biến môi trường', block);
  };

  const handleExport = () => {
    const data = JSON.stringify(transactions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dong-tien-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClearData = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu và khởi động lại ứng dụng? Hành động này không thể hoàn tác.')) {
      resetAllData();
      // Optionally clear cookies too if needed
      handleGoogleLogout();
      window.location.reload();
    }
  };

  const handlePartialReset = () => {
    if (window.confirm('Xóa hết dữ liệu cũ, chỉ giữ lại các khoản MoMo Trả Sau và Shopee PayLater?')) {
      resetExceptPayLater();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {showReminders && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] overflow-y-auto"
          >
            <SpendingReminders onClose={() => setShowReminders(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-2">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Cài đặt</h1>
        <p className="text-xs text-slate-400 font-medium">Tùy chỉnh ứng dụng của bạn</p>
      </div>

      {/* Initial Balance Section */}
      <section className="bg-white dark:bg-card-dark p-8 rounded-[32px] shadow-sm border border-slate-50 dark:border-slate-800/50">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
            <Shield className="text-emerald-500" size={20} />
          </div>
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Số dư ban đầu</h2>
        </div>
        <div className="relative">
          <input
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(Number(e.target.value))}
            className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-[24px] py-5 px-8 text-2xl font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">VNĐ</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-4 italic leading-relaxed">
          * Đây là số tiền bạn đang có sẵn trước khi bắt đầu ghi chép các giao dịch mới.
        </p>
      </section>

      {/* Cấu hình OAuth — Cloud Run / .env */}
      <section id="google-oauth-config" className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-center md:text-left">
          Kết nối Google Cloud
        </h2>
        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-card-dark space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Link2 size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                OAuth &amp; biến môi trường
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Dán <strong className="text-slate-700 dark:text-slate-200">Client ID</strong> và{' '}
                <strong className="text-slate-700 dark:text-slate-200">Client Secret</strong> từ Google Cloud
                Console (APIs và Services → Credentials). Trên Cloud Run, thêm cùng tên biến;{' '}
                <strong className="text-slate-700 dark:text-slate-200">APP_URL</strong> phải trùng URL
                dịch vụ (redirect: <code className="text-[10px]">/auth/callback</code>).
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-tighter text-slate-400">
                GOOGLE_CLIENT_ID
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="Dán mã Client ID bạn vừa copy"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => copyText('GOOGLE_CLIENT_ID', googleClientId)}
                  className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-emerald-400"
                  title="Sao chép"
                >
                  <Copy size={18} />
                </button>
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-tighter text-slate-400">
                GOOGLE_CLIENT_SECRET
              </span>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  placeholder="Dán mã Client Secret bạn vừa copy"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => copyText('GOOGLE_CLIENT_SECRET', googleClientSecret)}
                  className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-emerald-400"
                  title="Sao chép"
                >
                  <Copy size={18} />
                </button>
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-tighter text-slate-400">
                APP_URL
              </span>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  placeholder={DEFAULT_APP_URL_CLOUD_RUN}
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-mono font-medium text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => copyText('APP_URL', appUrl.trim() || DEFAULT_APP_URL_CLOUD_RUN)}
                  className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-emerald-400"
                  title="Sao chép"
                >
                  <Copy size={18} />
                </button>
              </div>
            </label>
          </div>

          <p className="rounded-2xl bg-amber-50/90 p-3 text-[10px] font-medium leading-relaxed text-amber-950/90 dark:bg-amber-950/30 dark:text-amber-100/90">
            Client Secret chỉ nhập trên máy an toàn; không gửi lên server qua form này — dùng để sao chép
            vào Secret Manager hoặc biến môi trường Cloud Run.
          </p>

          <button
            type="button"
            onClick={copyEnvBlock}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-3.5 text-[10px] font-black uppercase tracking-widest text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
          >
            <Copy size={16} />
            Sao chép khối .env (3 dòng)
          </button>

          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Redirect URI đăng ký trên Google:{' '}
            <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">
              {(appUrl.trim() || DEFAULT_APP_URL_CLOUD_RUN).replace(/\/$/, '')}/auth/callback
            </code>
          </p>
        </div>
      </section>

      {/* Google Sheets Sync */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-center md:text-left">Google Sheets Sync</h2>
        
        <div className="bg-white dark:bg-card-dark p-6 rounded-[32px] shadow-sm border border-slate-50 dark:border-slate-800/50 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-500">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">Google Sheets</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {isGoogleAuthenticated ? 'Đã kết nối' : 'Chưa kết nối'}
                </p>
              </div>
            </div>
            
            {!isGoogleAuthenticated ? (
              <button 
                onClick={handleGoogleConnect}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
              >
                Kết nối
              </button>
            ) : (
              <button 
                onClick={handleGoogleLogout}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Nút này gọi API <code className="text-[9px]">/api/auth/url</code> — cần chạy{' '}
            <strong className="text-slate-600 dark:text-slate-300">npm run dev</strong> hoặc sau build{' '}
            <strong className="text-slate-600 dark:text-slate-300">npm start</strong> (không chỉ &quot;vite
            preview&quot;). Cloud Run: lệnh khởi động phải là <code className="text-[9px]">npm start</code>.
          </p>

          {isGoogleAuthenticated && (
            <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Spreadsheet ID</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                      {spreadsheetId || 'Chưa có (Sẽ tạo mới khi sync)'}
                    </p>
                    {spreadsheetId && (
                      <a 
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-500 hover:text-emerald-600 transition-colors"
                        title="Mở bảng tính"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`flex items-center space-x-2 px-6 py-3 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Đang sync...' : 'Đồng bộ ngay'}</span>
                </button>
              </div>
              
              <p className="text-[10px] text-slate-400 italic leading-relaxed">
                * Toàn bộ dữ liệu chi/thu sẽ được lưu trữ trên Google Sheet để CEO Hoàng Nguyên có thể xem báo cáo Excel bất cứ lúc nào.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* App Settings */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Ứng dụng</h2>
        
        <div className="space-y-3">
          <SettingItem 
            icon={darkMode ? <Sun size={20} /> : <Moon size={20} />}
            label="Chế độ tối"
            onClick={toggleDarkMode}
            rightContent={
              <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${darkMode ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            }
          />
          <SettingItem 
            icon={<Bell size={20} />}
            label="Nhắc nhở chi tiêu"
            onClick={() => setShowReminders(true)}
            rightContent={<ChevronRight size={18} className="text-slate-300" />}
          />
        </div>
      </section>

      {/* Data Management */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Dữ liệu & Bảo mật</h2>
        
        <div className="space-y-3">
          <SettingItem 
            icon={<Download size={20} className="text-blue-500" />}
            label="Xuất dữ liệu (JSON)"
            onClick={handleExport}
            rightContent={<ChevronRight size={18} className="text-slate-300" />}
          />
          <SettingItem 
            icon={<Trash2 size={20} className="text-red-500" />}
            label="Xóa toàn bộ dữ liệu"
            onClick={handleClearData}
            rightContent={<ChevronRight size={18} className="text-slate-300" />}
          />
          <SettingItem 
            icon={<RefreshCw size={20} className="text-amber-500" />}
            label="Khởi động lại (Giữ PayLater)"
            onClick={handlePartialReset}
            rightContent={<ChevronRight size={18} className="text-slate-300" />}
          />
        </div>
      </section>

      {/* About */}
      <section className="bg-slate-100 dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3 text-slate-800 dark:text-white mb-4">
          <Info size={20} />
          <h2 className="text-sm font-black uppercase tracking-wider">Về Dòng Tiền</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Dòng Tiền là người bạn đồng hành tài chính thầm lặng, giúp bạn luôn làm chủ túi tiền của mình và không bao giờ bị bất ngờ bởi các khoản chi phí sắp tới.
        </p>
        <div className="mt-8 flex justify-between items-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Phiên bản 1.0.0</p>
          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-tighter">Made with ❤️</p>
        </div>
      </section>
    </div>
  );
}

function SettingItem({ icon, label, onClick, rightContent }: { icon: React.ReactNode, label: string, onClick?: () => void, rightContent?: React.ReactNode }) {
  return (
    <motion.button 
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className="w-full bg-white dark:bg-card-dark p-5 rounded-[28px] flex items-center justify-between shadow-sm border border-slate-50 dark:border-slate-800/50"
    >
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-inner">
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-800 dark:text-white">{label}</span>
      </div>
      {rightContent}
    </motion.button>
  );
}
