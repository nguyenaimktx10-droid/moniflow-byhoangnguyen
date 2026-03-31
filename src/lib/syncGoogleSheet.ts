import type { Transaction } from '../types';
import { apiUrl } from './apiUrl';

const DEBOUNCE_MS = 3500;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

/** Đẩy giao dịch lên Google Sheet (Service Account trên server) — gọi sau khi dữ liệu đổi, debounce. */
export function scheduleSyncToGoogleSheet(transactions: Transaction[]): void {
  if (timeoutId != null) clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    timeoutId = null;
    void fetch(apiUrl('/api/sync-sheets'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
    }).catch(() => {
      /* offline / chưa cấu hình SA */
    });
  }, DEBOUNCE_MS);
}
