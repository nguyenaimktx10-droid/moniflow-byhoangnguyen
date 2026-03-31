import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addMonths, addWeeks, isAfter, parseISO, startOfDay, format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { Transaction, TimelineItem, SpendingLimit, BusinessContract } from '../types';
import fbSaoKeMar2026 from '../data/facebookAdsSaoKeMar2026.json';

/** Dữ liệu cũ (vanHanhMonthly…) → model thu khách + định mức chi */
function migrateBusinessContract(raw: Record<string, unknown>): BusinessContract {
  if (typeof raw.vanHanhBudgetMonthly === 'number') {
    return raw as unknown as BusinessContract;
  }
  return {
    id: String(raw.id ?? ''),
    projectName: String(raw.projectName ?? ''),
    signedAt: String(raw.signedAt ?? ''),
    nghiemThuAt: (raw.nghiemThuAt as string | null | undefined) ?? null,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    vanHanhBudgetMonthly: Number(raw.vanHanhMonthly) || 0,
    vanHanhReceivedFromClient: 0,
    supplierBudget: Number(raw.supplierTotal) || 0,
    supplierReceivedFromClient: 0,
    tronGoiBudgetTotal: Number(raw.tronGoiTotal) || 0,
    tronGoiReceived50Sign: 0,
    tronGoiReceived50Accept: 0,
  };
}

interface FinanceState {
  transactions: Transaction[];
  initialBalance: number;
  darkMode: boolean;
  hasCompletedOnboarding: boolean;
  spendingLimits: SpendingLimit[];
  businessContracts: BusinessContract[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  setInitialBalance: (amount: number) => void;
  toggleDarkMode: () => void;
  completeOnboarding: () => void;
  addSpendingLimit: (limit: Omit<SpendingLimit, 'id'>) => void;
  updateSpendingLimit: (id: string, limit: Partial<SpendingLimit>) => void;
  deleteSpendingLimit: (id: string) => void;
  addBusinessContract: (c: Omit<BusinessContract, 'id'>) => void;
  updateBusinessContract: (id: string, c: Partial<BusinessContract>) => void;
  deleteBusinessContract: (id: string) => void;
  resetAllData: () => void;
  resetExceptPayLater: () => void;
  /** Khôi phục từ file JSON (backup đầy đủ hoặc mảng giao dịch cũ). */
  restoreFromBackup: (payload: unknown) => void;
  seedShopeeBills: () => void;
  /** Đồng bộ MoMo: từng gói chuyển đổi hoá đơn (theo ảnh app) — mỗi gói tách kỳ; tổng dư = 9.829.952đ; bổ sung gói T5–T7 vào mảng nếu có */
  seedMomoRealityMarch2026: () => void;
  seedFixedMonthlyIncome: () => void;
  seedFacebookAdsSaoKeMar2026: () => void;
  getTimeline: () => TimelineItem[];
  getAIInsights: () => {
    nextPayday: Date | null;
    daysUntilPayday: number;
    safeDailySpending: number;
    isNegativeProjection: boolean;
    negativeDate: string | null;
    averageWeeklySpending: number;
    currentWeekSpending: number;
    topCategory: string | null;
    insights: Array<{
      type: 'warning' | 'info' | 'success';
      message: string;
      icon: string;
    }>;
  };
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      initialBalance: 0,
      darkMode: false,
      hasCompletedOnboarding: false,
      spendingLimits: [],
      businessContracts: [],

      addBusinessContract: (c) => set((state) => ({
        businessContracts: [
          ...state.businessContracts,
          { ...c, id: Math.random().toString(36).substring(7) },
        ],
      })),

      updateBusinessContract: (id, updated) => set((state) => ({
        businessContracts: state.businessContracts.map((x) =>
          x.id === id ? { ...x, ...updated } : x
        ),
      })),

      deleteBusinessContract: (id) => set((state) => ({
        businessContracts: state.businessContracts.filter((x) => x.id !== id),
      })),

      addTransaction: (t) => set((state) => ({
        transactions: [...state.transactions, { ...t, id: Math.random().toString(36).substring(7) }]
      })),
      
      updateTransaction: (id, updated) => set((state) => ({
        transactions: state.transactions.map(t => t.id === id ? { ...t, ...updated } : t)
      })),
      
      deleteTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter(t => t.id !== id)
      })),
      
      setInitialBalance: (amount) => set({ initialBalance: amount }),
      
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      addSpendingLimit: (limit) => set((state) => ({
        spendingLimits: [...state.spendingLimits, { ...limit, id: Math.random().toString(36).substring(7) }]
      })),

      updateSpendingLimit: (id, limit) => set((state) => ({
        spendingLimits: state.spendingLimits.map(l => l.id === id ? { ...l, ...limit } : l)
      })),

      deleteSpendingLimit: (id) => set((state) => ({
        spendingLimits: state.spendingLimits.filter(l => l.id !== id)
      })),

      resetAllData: () => set({
        transactions: [],
        initialBalance: 0,
        spendingLimits: [],
        businessContracts: [],
        hasCompletedOnboarding: false
      }),

      resetExceptPayLater: () => set((state) => ({
        transactions: state.transactions.filter(t => 
          t.category === 'shopee-paylater' || t.category === 'momo-paylater'
        ),
        initialBalance: 0,
        spendingLimits: [],
        businessContracts: [],
        hasCompletedOnboarding: false
      })),

      restoreFromBackup: (payload: unknown) => {
        const isTx = (x: unknown): x is Transaction => {
          if (!x || typeof x !== 'object') return false;
          const o = x as Record<string, unknown>;
          return (
            typeof o.id === 'string' &&
            typeof o.amount === 'number' &&
            typeof o.date === 'string' &&
            typeof o.type === 'string' &&
            typeof o.category === 'string'
          );
        };

        if (Array.isArray(payload)) {
          const txs = payload.filter(isTx);
          set({ transactions: txs });
          return;
        }

        if (!payload || typeof payload !== 'object') return;
        const o = payload as Record<string, unknown>;

        const txsRaw = o.transactions;
        const transactions = Array.isArray(txsRaw)
          ? txsRaw.filter(isTx)
          : [];

        const limitsRaw = o.spendingLimits;
        const spendingLimits = Array.isArray(limitsRaw)
          ? (limitsRaw as SpendingLimit[]).filter(
              (l) =>
                l &&
                typeof l.id === 'string' &&
                typeof l.amount === 'number' &&
                typeof l.type === 'string' &&
                typeof l.enabled === 'boolean'
            )
          : [];

        const contractsRaw = o.businessContracts;
        const businessContracts = Array.isArray(contractsRaw)
          ? contractsRaw.map((c) =>
              migrateBusinessContract(c as Record<string, unknown>)
            )
          : [];

        set({
          transactions,
          initialBalance:
            typeof o.initialBalance === 'number' && !Number.isNaN(o.initialBalance)
              ? o.initialBalance
              : 0,
          spendingLimits,
          businessContracts,
          darkMode:
            typeof o.darkMode === 'boolean' ? o.darkMode : get().darkMode,
          hasCompletedOnboarding:
            typeof o.hasCompletedOnboarding === 'boolean'
              ? o.hasCompletedOnboarding
              : true,
        });
      },

      seedShopeeBills: () => set((state) => {
        const shopeeBills = [
          {
            id: 'shopee-mar-2026',
            type: 'hoadon' as const,
            amount: 698609,
            category: 'shopee-paylater',
            date: '2026-04-10T00:00:00.000Z',
            note: 'Hóa đơn Shopee Tháng 03 (Hạn 10/04)',
            recurring: 'none' as const
          },
          {
            id: 'shopee-apr-2026',
            type: 'hoadon' as const,
            amount: 620898,
            category: 'shopee-paylater',
            date: '2026-05-10T00:00:00.000Z',
            note: 'Hóa đơn Shopee Tháng 04 (Hạn 10/05)',
            recurring: 'none' as const
          },
          {
            id: 'shopee-may-2026',
            type: 'hoadon' as const,
            amount: 380867,
            category: 'shopee-paylater',
            date: '2026-06-10T00:00:00.000Z',
            note: 'Hóa đơn Shopee Tháng 05 (Hạn 10/06)',
            recurring: 'none' as const
          },
          {
            id: 'shopee-jun-2026',
            type: 'hoadon' as const,
            amount: 53321,
            category: 'shopee-paylater',
            date: '2026-07-10T00:00:00.000Z',
            note: 'Hóa đơn Shopee Tháng 06 (Hạn 10/07)',
            recurring: 'none' as const
          }
        ];

        // Only add if not already present
        const existingIds = new Set(state.transactions.map(t => t.id));
        const newBills = shopeeBills.filter(b => !existingIds.has(b.id));
        
        if (newBills.length === 0) return state;

        return {
          transactions: [...state.transactions, ...newBills]
        };
      }),

      /**
       * MoMo — đồng bộ từ app (cập nhật 03/2026):
       * Nguyên tắc: mỗi gói "chuyển đổi hoá đơn" (theo tháng hoá đơn gốc) có một kỳ hạn riêng; mỗi tháng ví trả góp cộng **tổng** các kỳ đến hạn của tất cả gói đang chạy.
       * Dữ liệu từ màn Hóa đơn trả góp: tổng dư nợ còn lại = 9.829.952đ = tổng 6 gói (T8–T10–T11–T12/2025 + T1–T2/2026). Tháng 05–07/2025 không còn trong danh sách dư nợ (đã trả hết hoặc không chuyển đổi) — nếu sau này có thêm gói, bổ sung vào `momoChuyenDoiPlans`.
       * Số kỳ còn lại (ước tính): ceil((dư / tổng chuyển đổi) × KY_MOMO), KY_MOMO = 6 (đổi theo số kỳ đăng ký thực tế từng gói nếu cần).
       */
      seedMomoRealityMarch2026: () =>
        set((state) => {
          const KY_MOMO = 6;
          const momoChuyenDoiPlans: Array<{
            id: string;
            label: string;
            totalConverted: number;
            remaining: number;
          }> = [
            {
              id: '2025-08',
              label: 'Chuyển đổi hoá đơn tháng 08/2025',
              totalConverted: 4_667_195,
              remaining: 1_037_149,
            },
            {
              id: '2025-10',
              label: 'Chuyển đổi hoá đơn tháng 10/2025',
              totalConverted: 2_810_569,
              remaining: 468_424,
            },
            {
              id: '2025-11',
              label: 'Chuyển đổi hoá đơn tháng 11/2025',
              totalConverted: 3_577_933,
              remaining: 1_192_641,
            },
            {
              id: '2025-12',
              label: 'Chuyển đổi hoá đơn tháng 12/2025',
              totalConverted: 3_432_872,
              remaining: 1_716_434,
            },
            {
              id: '2026-01',
              label: 'Chuyển đổi hoá đơn tháng 01/2026',
              totalConverted: 4_656_966,
              remaining: 3_104_642,
            },
            {
              id: '2026-02',
              label: 'Chuyển đổi hoá đơn tháng 02/2026',
              totalConverted: 2_599_496,
              remaining: 2_310_662,
            },
          ];

          const firstDue = new Date('2026-04-10T00:00:00.000Z');
          const momoCanonical: Transaction[] = [];

          for (const p of momoChuyenDoiPlans) {
            if (p.remaining <= 0) continue;
            const fracRem = p.remaining / p.totalConverted;
            const remKy = Math.max(
              1,
              Math.min(KY_MOMO, Math.ceil(fracRem * KY_MOMO))
            );
            const base = Math.floor(p.remaining / remKy);
            for (let k = 0; k < remKy; k++) {
              const d = new Date(firstDue);
              d.setUTCMonth(d.getUTCMonth() + k);
              const amount =
                k === remKy - 1
                  ? p.remaining - base * (remKy - 1)
                  : base;
              momoCanonical.push({
                id: `momo-chuyen-${p.id}-ky${k + 1}`,
                type: 'hoadon',
                amount,
                category: 'momo-paylater',
                date: d.toISOString(),
                note: `MoMo — ${p.label} · kỳ ${k + 1}/${remKy} (ước ${remKy} kỳ còn lại / ${KY_MOMO} kỳ gói) · hạn ${format(d, 'dd/MM/yyyy')}`,
                recurring: 'none',
              });
            }
          }

          const withoutMomo = state.transactions.filter((t) => t.category !== 'momo-paylater');
          const merged = [...withoutMomo];
          const byId = new Map(merged.map((t) => [t.id, t]));
          for (const m of momoCanonical) {
            byId.set(m.id, m);
          }
          return { transactions: Array.from(byId.values()) };
        }),

      /** Thu lương cố định hàng tháng (thêm nếu chưa có id; cập nhật mốc EvanCoaching nếu đã có bản cũ) */
      seedFixedMonthlyIncome: () =>
        set((state) => {
          const evanNote =
            'EvanCoaching — cuối tháng (bắt đầu 31/03/2026; tháng 2: ngày cuối tháng)';
          const evanDate = '2026-03-31T00:00:00.000Z';
          const marineNote =
            'Lương Marine — ngày 6 hàng tháng (bắt đầu 06/04/2026)';
          const marineDate = '2026-04-06T00:00:00.000Z';

          const fixed: Transaction[] = [
            {
              id: 'fixed-income-marine',
              type: 'thu',
              amount: 6_000_000,
              category: 'luong',
              date: marineDate,
              note: marineNote,
              recurring: 'monthly',
            },
            {
              id: 'fixed-income-evancoaching',
              type: 'thu',
              amount: 17_000_000,
              category: 'luong',
              date: evanDate,
              note: evanNote,
              recurring: 'monthly',
            },
            {
              id: 'fixed-income-azpod',
              type: 'thu',
              amount: 10_000_000,
              category: 'luong',
              date: '2026-04-30T00:00:00.000Z',
              note: 'AZPOD — ngày cuối tháng (bắt đầu từ cuối tháng 4)',
              recurring: 'monthly',
            },
          ];

          let evanUpdated = false;
          let marineUpdated = false;
          const txs = state.transactions.map((t) => {
            if (t.id === 'fixed-income-evancoaching') {
              if (t.date === evanDate && t.note === evanNote) return t;
              evanUpdated = true;
              return {
                ...t,
                date: evanDate,
                note: evanNote,
                amount: 17_000_000,
                category: 'luong',
                recurring: 'monthly',
              };
            }
            if (t.id === 'fixed-income-marine') {
              if (t.date === marineDate && t.note === marineNote) return t;
              marineUpdated = true;
              return {
                ...t,
                date: marineDate,
                note: marineNote,
                amount: 6_000_000,
                category: 'luong',
                recurring: 'monthly',
              };
            }
            return t;
          });

          const existingIds = new Set(txs.map((t) => t.id));
          const newItems = fixed.filter((t) => !existingIds.has(t.id));
          if (newItems.length === 0 && !evanUpdated && !marineUpdated) return state;
          const next = (
            newItems.length > 0 ? [...txs, ...newItems] : txs
          ) as Transaction[];
          return { transactions: next };
        }),

      /** Sao kê TK/thẻ: Facebook Ads (FACEBK / fb.me/ads) 01–30/03/2026 — id saoke-fb-{FT...} */
      seedFacebookAdsSaoKeMar2026: () =>
        set((state) => {
          const rows = fbSaoKeMar2026.transactions as Array<{
            date: string;
            amount: number;
            note: string;
            ref: string;
          }>;
          const existing = new Set(state.transactions.map((t) => t.id));
          const newTx: Transaction[] = rows
            .filter((r) => r.ref && !existing.has(`saoke-fb-${r.ref}`))
            .map((r) => ({
              id: `saoke-fb-${r.ref}`,
              type: 'chi' as const,
              amount: r.amount,
              category: 'business',
              date: `${r.date}T12:00:00.000Z`,
              note: r.note,
              recurring: 'none' as const,
            }));
          if (newTx.length === 0) return state;
          return { transactions: [...state.transactions, ...newTx] };
        }),

      getTimeline: () => {
        const { transactions, initialBalance } = get();
        const now = startOfDay(new Date());
        const endOfProjection = addMonths(now, 3); // Project 3 months ahead
        
        const allEvents: Transaction[] = [];
        
        // Helper to generate recurring events
        const generateEvents = (t: Transaction) => {
          if (t.recurring === 'none') return [t];
          
          const events: Transaction[] = [];
          let current = parseISO(t.date);
          
          // Project up to 3 months ahead
          while (!isAfter(current, endOfProjection)) {
            events.push({
              ...t,
              id: `${t.id}-${current.getTime()}`,
              date: current.toISOString()
            });
            
            if (t.recurring === 'weekly') current = addWeeks(current, 1);
            else if (t.recurring === 'monthly') current = addMonths(current, 1);
            else if (t.recurring === 'every2months') current = addMonths(current, 2);
            else break;
          }
          return events;
        };

        transactions.forEach(t => {
          allEvents.push(...generateEvents(t));
        });
        
        // Sort by date
        const sorted = allEvents.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
        
        // Calculate running balance
        let balance = initialBalance;
        return sorted.map(t => {
          if (t.type === 'thu') balance += t.amount;
          else balance -= t.amount;
          
          return { ...t, runningBalance: balance };
        });
      },

      getAIInsights: () => {
        const { transactions, initialBalance } = get();
        const timeline = get().getTimeline();
        const now = startOfDay(new Date());
        
        // 1. Find Next Payday
        const nextPaydayEvent = timeline.find(t => 
          isAfter(parseISO(t.date), now) && 
          t.type === 'thu' && 
          (t.category === 'luong' || t.category === 'Lương')
        );
        const nextPayday = nextPaydayEvent ? parseISO(nextPaydayEvent.date) : null;
        
        // 2. Days until payday
        const daysUntilPayday = nextPayday 
          ? Math.ceil((nextPayday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 30; // Default to 30 if no payday found

        // 3. Current Balance
        const currentBalance = timeline.filter(t => !isAfter(parseISO(t.date), now)).pop()?.runningBalance ?? initialBalance;

        // 4. Future Obligations before payday
        const futureObligations = timeline
          .filter(t => 
            isAfter(parseISO(t.date), now) && 
            (nextPayday ? !isAfter(parseISO(t.date), nextPayday) : true) &&
            (t.type === 'chi' || t.type === 'thanhtoan' || t.type === 'no')
          )
          .reduce((sum, t) => sum + t.amount, 0);

        // 5. Safe Daily Spending
        const safeDailySpending = Math.max(0, (currentBalance - futureObligations) / (daysUntilPayday || 1));

        // 6. Negative Balance Detection
        const negativeEvent = timeline.find(t => 
          isAfter(parseISO(t.date), now) && 
          (nextPayday ? !isAfter(parseISO(t.date), nextPayday) : true) &&
          t.runningBalance < 0
        );
        const isNegativeProjection = !!negativeEvent;
        const negativeDate = negativeEvent ? format(parseISO(negativeEvent.date), 'dd/MM') : null;

        // 7. Weekly Spending Behavior
        const last4Weeks = transactions.filter(t => 
          t.type === 'chi' && 
          isAfter(parseISO(t.date), addWeeks(now, -4)) &&
          !isAfter(parseISO(t.date), now)
        );
        const averageWeeklySpending = last4Weeks.reduce((sum, t) => sum + t.amount, 0) / 4;
        
        const currentWeekSpending = transactions
          .filter(t => 
            t.type === 'chi' && 
            isAfter(parseISO(t.date), addWeeks(now, -1)) &&
            !isAfter(parseISO(t.date), now)
          )
          .reduce((sum, t) => sum + t.amount, 0);

        // 8. Top Category
        const categoryTotals: { [key: string]: number } = {};
        transactions.filter(t => t.type === 'chi').forEach(t => {
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });
        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        // 9. Insights Generation
        const insights: Array<{ type: 'warning' | 'info' | 'success', message: string, icon: string }> = [];

        if (isNegativeProjection) {
          insights.push({
            type: 'warning',
            message: `Bạn có thể thiếu tiền vào ngày ${negativeDate}.`,
            icon: '⚠️'
          });
        }

        if (currentWeekSpending > averageWeeklySpending * 1.3 && averageWeeklySpending > 0) {
          insights.push({
            type: 'warning',
            message: `Chi tiêu tuần này đang vượt ${( ((currentWeekSpending/averageWeeklySpending) - 1) * 100 ).toFixed(0)}% so với trung bình.`,
            icon: '📉'
          });
        } else if (currentWeekSpending < averageWeeklySpending * 0.7 && averageWeeklySpending > 0) {
          insights.push({
            type: 'success',
            message: 'Bạn đang tiết kiệm tốt trong tuần này!',
            icon: '✨'
          });
        }

        if (topCategory) {
          insights.push({
            type: 'info',
            message: `Bạn chi nhiều nhất vào danh mục ${topCategory}.`,
            icon: '💡'
          });
        }

        // Shopee PayLater check
        const upcomingShopee = timeline.find(t => 
          isAfter(parseISO(t.date), now) && 
          t.category === 'shopee-paylater' &&
          isWithinInterval(parseISO(t.date), { start: now, end: addWeeks(now, 2) })
        );
        if (upcomingShopee) {
          insights.push({
            type: 'warning',
            message: `Hóa đơn Shopee PayLater sắp đến hạn: ${upcomingShopee.amount.toLocaleString()}đ vào ngày ${format(parseISO(upcomingShopee.date), 'dd/MM')}.`,
            icon: '🛍️'
          });
        }

        // MoMo Installments check
        const upcomingMomo = timeline.filter(t => 
          isAfter(parseISO(t.date), now) && 
          t.category === 'momo-paylater' &&
          isWithinInterval(parseISO(t.date), { start: now, end: addWeeks(now, 2) })
        );
        if (upcomingMomo.length > 0) {
          const totalMomo = upcomingMomo.reduce((sum, t) => sum + t.amount, 0);
          insights.push({
            type: 'warning',
            message: `Bạn có ${upcomingMomo.length} khoản trả góp MoMo sắp đến hạn. Tổng cộng: ${totalMomo.toLocaleString()}đ.`,
            icon: '💳'
          });
        }

        // Total Debt Insight
        const totalMomoDebt = transactions
          .filter(t => t.category === 'momo-paylater')
          .reduce((sum, t) => sum + t.amount, 0);
        if (totalMomoDebt > 5000000) {
          insights.push({
            type: 'info',
            message: `Tổng nợ trả góp MoMo còn lại: ${totalMomoDebt.toLocaleString()}đ.`,
            icon: '📊'
          });
        }

        // Weekend spending logic (simplified: check if Sat/Sun spending is higher)
        const weekendSpending = transactions.filter(t => {
          const d = parseISO(t.date).getDay();
          return (d === 0 || d === 6) && t.type === 'chi';
        }).reduce((sum, t) => sum + t.amount, 0);
        
        const weekdaySpending = transactions.filter(t => {
          const d = parseISO(t.date).getDay();
          return (d !== 0 && d !== 6) && t.type === 'chi';
        }).reduce((sum, t) => sum + t.amount, 0);

        if (weekendSpending > weekdaySpending * 0.4 && weekdaySpending > 0) {
          insights.push({
            type: 'info',
            message: 'Chi tiêu cuối tuần của bạn thường cao hơn ngày thường.',
            icon: '🍺'
          });
        }

        // 10. Spending Limit Warnings
        const { spendingLimits } = get();
        spendingLimits.filter(l => l.enabled).forEach(limit => {
          let currentSpending = 0;
          let label = '';

          if (limit.type === 'daily') {
            currentSpending = transactions
              .filter(t => t.type === 'chi' && format(parseISO(t.date), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd'))
              .reduce((sum, t) => sum + t.amount, 0);
            label = 'hàng ngày';
          } else if (limit.type === 'weekly') {
            const start = startOfWeek(now);
            const end = endOfWeek(now);
            currentSpending = transactions
              .filter(t => t.type === 'chi' && isWithinInterval(parseISO(t.date), { start, end }))
              .reduce((sum, t) => sum + t.amount, 0);
            label = 'hàng tuần';
          } else if (limit.type === 'category' && limit.category) {
            // Category spending for the current month
            const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
            const end = endOfWeek(addMonths(start, 1)); // Just use current month
            currentSpending = transactions
              .filter(t => t.type === 'chi' && t.category === limit.category && isWithinInterval(parseISO(t.date), { start, end: now }))
              .reduce((sum, t) => sum + t.amount, 0);
            label = `danh mục ${limit.category}`;
          }

          if (currentSpending >= limit.amount) {
            insights.push({
              type: 'warning',
              message: `Bạn đã vượt giới hạn chi tiêu ${label}! (${(currentSpending).toLocaleString()} / ${(limit.amount).toLocaleString()})`,
              icon: '🚨'
            });
          } else if (currentSpending >= limit.amount * 0.8) {
            insights.push({
              type: 'warning',
              message: `Bạn sắp chạm giới hạn chi tiêu ${label}.`,
              icon: '⚠️'
            });
          }
        });

        return {
          nextPayday,
          daysUntilPayday,
          safeDailySpending,
          isNegativeProjection,
          negativeDate,
          averageWeeklySpending,
          currentWeekSpending,
          topCategory,
          insights
        };
      }
    }),
    {
      name: 'dong-tien-storage',
      merge: (persisted, current) => {
        const p = persisted as Partial<FinanceState> & Record<string, unknown>;
        const rawList = p.businessContracts ?? current.businessContracts;
        const migrated = (rawList ?? []).map((x) =>
          migrateBusinessContract(x as unknown as Record<string, unknown>)
        );
        return {
          ...current,
          ...p,
          businessContracts: migrated,
        };
      },
    }
  )
);
