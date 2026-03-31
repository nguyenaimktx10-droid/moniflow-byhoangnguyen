export type TransactionType = 'thu' | 'chi' | 'thanhtoan' | 'no' | 'hoadon';
export type RecurringType = 'none' | 'weekly' | 'monthly' | 'every2months';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // ISO string
  note: string;
  recurring: RecurringType;
}

export interface TimelineItem extends Transaction {
  runningBalance: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
}

export type SpendingLimitType = 'daily' | 'weekly' | 'category';

export interface SpendingLimit {
  id: string;
  type: SpendingLimitType;
  amount: number;
  category?: string; // Only for 'category' type
  enabled: boolean;
}

/**
 * Hợp đồng dự án — theo dõi song song:
 * - Tiền **khách đã chuyển** (thu / cọc theo từng phần)
 * - **Định mức chi phải chi** theo HĐ (để đối chiếu dòng tiền)
 */
export interface BusinessContract {
  id: string;
  projectName: string;
  signedAt: string;
  nghiemThuAt?: string | null;
  notes?: string;

  /** Định mức chi nhân sự vận hành — mỗi tháng (kỳ ngày 30) */
  vanHanhBudgetMonthly: number;
  /** Tiền khách đã chuyển cho phần vận hành (cọc / tổng đã nhận cho khoản này) */
  vanHanhReceivedFromClient: number;

  /** Định mức chi supplier một lần (Meta/Google Ads, domain, hosting…) */
  supplierBudget: number;
  /** Tiền khách đã chuyển cho phần supplier */
  supplierReceivedFromClient: number;

  /** Định mức tổng gói trọn gói — chia 50% sau ký / 50% sau NT */
  tronGoiBudgetTotal: number;
  /** Tiền khách đã chuyển — đợt sau ký (50% đầu) */
  tronGoiReceived50Sign: number;
  /** Tiền khách đã chuyển — đợt sau nghiệm thu (50% còn lại) */
  tronGoiReceived50Accept: number;
}
