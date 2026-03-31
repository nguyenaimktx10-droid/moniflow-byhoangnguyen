import React, { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { CATEGORIES } from '../constants';
import { formatCurrency } from '../lib/utils';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  subMonths,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Bell, TrendingUp, TrendingDown, Sparkles, AlertTriangle, Info } from 'lucide-react';

const CHI_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
];
const THU_COLORS = ['#059669', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];

function categoryName(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

export default function Reports() {
  const transactions = useFinanceStore((s) => s.transactions);
  const spendingLimits = useFinanceStore((s) => s.spendingLimits);
  const getAIInsights = useFinanceStore((s) => s.getAIInsights);
  const ai = useMemo(
    () => getAIInsights(),
    [getAIInsights, transactions, spendingLimits]
  );

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  const monthTransactions = useMemo(
    () =>
      transactions.filter((t) =>
        isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
      ),
    [transactions, monthStart, monthEnd]
  );

  const prevMonthTransactions = useMemo(
    () =>
      transactions.filter((t) =>
        isWithinInterval(parseISO(t.date), { start: prevMonthStart, end: prevMonthEnd })
      ),
    [transactions, prevMonthStart, prevMonthEnd]
  );

  const totalThu = monthTransactions.filter((t) => t.type === 'thu').reduce((a, t) => a + t.amount, 0);
  const totalChi = monthTransactions
    .filter((t) => t.type === 'chi' || t.type === 'thanhtoan')
    .reduce((a, t) => a + t.amount, 0);
  const savings = totalThu - totalChi;

  const prevTotalChi = prevMonthTransactions
    .filter((t) => t.type === 'chi' || t.type === 'thanhtoan')
    .reduce((a, t) => a + t.amount, 0);
  const prevTotalThu = prevMonthTransactions.filter((t) => t.type === 'thu').reduce((a, t) => a + t.amount, 0);
  const chiDeltaPct =
    prevTotalChi > 0 ? ((totalChi - prevTotalChi) / prevTotalChi) * 100 : null;

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weeklyData = days.map((day) => ({
    name: format(day, 'EE', { locale: vi }),
    chi: transactions
      .filter(
        (t) =>
          (t.type === 'chi' || t.type === 'thanhtoan') && isSameDay(parseISO(t.date), day)
      )
      .reduce((a, t) => a + t.amount, 0),
    thu: transactions
      .filter((t) => t.type === 'thu' && isSameDay(parseISO(t.date), day))
      .reduce((a, t) => a + t.amount, 0),
  }));

  const chiByCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthTransactions
      .filter((t) => t.type === 'chi' || t.type === 'thanhtoan')
      .forEach((t) => {
        map.set(t.category, (map.get(t.category) || 0) + t.amount);
      });
    return [...map.entries()]
      .map(([id, value]) => ({
        id,
        name: categoryName(id),
        value,
        icon: CATEGORIES.find((c) => c.id === id)?.icon ?? '📌',
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  const thuByCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthTransactions
      .filter((t) => t.type === 'thu')
      .forEach((t) => {
        map.set(t.category, (map.get(t.category) || 0) + t.amount);
      });
    return [...map.entries()]
      .map(([id, value]) => ({
        id,
        name: categoryName(id),
        value,
        icon: CATEGORIES.find((c) => c.id === id)?.icon ?? '💰',
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  const pieChi = chiByCategory.map((d) => ({ name: d.name, value: d.value }));
  const pieThu = thuByCategory.map((d) => ({ name: d.name, value: d.value }));

  const reportExtras: Array<{ type: 'warning' | 'info' | 'success'; message: string; icon: string }> = [];
  if (totalChi > totalThu && totalThu > 0) {
    reportExtras.push({
      type: 'warning',
      message: `Tháng này tổng chi (${formatCurrency(totalChi)}) đang lớn hơn tổng thu (${formatCurrency(totalThu)}).`,
      icon: '⚖️',
    });
  }
  if (savings > 0 && totalThu > 0) {
    reportExtras.push({
      type: 'success',
      message: `Tỷ lệ “giữ lại” sau chi: ${((savings / totalThu) * 100).toFixed(1)}% trên tổng thu tháng.`,
      icon: '🎯',
    });
  } else if (savings <= 0 && totalThu > 0) {
    reportExtras.push({
      type: 'info',
      message: 'Dòng tiền tháng này không dư sau khi trừ chi — xem lại các khoản cố định và chi không cần thiết.',
      icon: '📋',
    });
  }
  if (chiDeltaPct !== null && Math.abs(chiDeltaPct) > 5) {
    reportExtras.push({
      type: chiDeltaPct > 0 ? 'warning' : 'success',
      message: `So với tháng trước, chi tiêu ${chiDeltaPct > 0 ? 'tăng' : 'giảm'} khoảng ${Math.abs(chiDeltaPct).toFixed(0)}%.`,
      icon: chiDeltaPct > 0 ? '📈' : '📉',
    });
  }

  const allInsights = [...reportExtras, ...ai.insights];

  const insightStyle = (type: string) => {
    if (type === 'warning')
      return 'border-amber-200 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/40';
    if (type === 'success')
      return 'border-emerald-200 bg-emerald-50/90 dark:border-emerald-900/40 dark:bg-emerald-950/30';
    return 'border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-900/40';
  };

  const tooltipStyle = {
    borderRadius: 16,
    border: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    fontSize: 12,
    fontWeight: 700,
  };

  return (
    <div className="space-y-8 pb-4">
      <div className="px-2">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Báo cáo</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Phân tích thu — chi tháng {format(now, 'MM/yyyy')} · biểu đồ · dự báo &amp; gợi ý
        </p>
      </div>

      <div className="mx-2 rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-card-dark">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
          Chỉ số nhanh
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-emerald-500/10 px-3 py-3 dark:bg-emerald-500/15">
            <p className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-300">An toàn / ngày</p>
            <p className="text-sm font-black text-emerald-800 dark:text-emerald-200">
              {formatCurrency(Math.round(ai.safeDailySpending))}
            </p>
            <p className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
              đến kỳ lương gần nhất
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100/80 px-3 py-3 dark:bg-slate-800/80">
            <p className="text-[9px] font-bold uppercase text-slate-500">Ngày đến lương</p>
            <p className="text-sm font-black text-slate-800 dark:text-white">
              {ai.daysUntilPayday != null ? `${ai.daysUntilPayday} ngày` : '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-rose-500/10 px-3 py-3 dark:bg-rose-500/15">
            <p className="text-[9px] font-bold uppercase text-rose-700 dark:text-rose-300">Chi tuần này</p>
            <p className="text-sm font-black text-rose-900 dark:text-rose-100">
              {formatCurrency(ai.currentWeekSpending)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100/80 px-3 py-3 dark:bg-slate-800/80">
            <p className="text-[9px] font-bold uppercase text-slate-500">TB chi / tuần (4 tuần)</p>
            <p className="text-sm font-black text-slate-800 dark:text-white">
              {formatCurrency(Math.round(ai.averageWeeklySpending))}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-emerald-500 dark:bg-emerald-600 p-8 rounded-[32px] shadow-xl shadow-emerald-100 dark:shadow-none text-white relative overflow-hidden mx-2">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <p className="text-emerald-100/80 text-[10px] font-black uppercase tracking-widest mb-4">
            Tổng quan tháng {format(now, 'MM/yyyy')}
          </p>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-emerald-100/60 text-[9px] font-bold uppercase mb-1">Tổng thu</p>
              <p className="text-xl font-black">{formatCurrency(totalThu)}</p>
            </div>
            <div>
              <p className="text-emerald-100/60 text-[9px] font-bold uppercase mb-1">Tổng chi</p>
              <p className="text-xl font-black">{formatCurrency(totalChi)}</p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-emerald-100/60 text-[9px] font-bold uppercase mb-1">Chênh lệch (thu − chi)</p>
            <p className={`text-3xl font-black ${savings >= 0 ? '' : 'text-amber-200'}`}>
              {formatCurrency(savings)}
            </p>
          </div>
        </div>
      </div>

      <section className="mx-2 bg-white dark:bg-card-dark p-6 rounded-[32px] shadow-sm border border-slate-50 dark:border-slate-800/50">
        <h2 className="text-sm font-black text-slate-800 dark:text-white mb-1">Tuần này theo ngày</h2>
        <p className="text-[10px] text-slate-400 mb-4">Cột xanh: thu · Cột tím: chi</p>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                contentStyle={{ ...tooltipStyle, background: 'var(--card, #fff)' }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'thu' ? 'Thu' : 'Chi',
                ]}
              />
              <Bar dataKey="thu" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} name="thu" />
              <Bar dataKey="chi" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={14} name="chi" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mx-2">
        <section className="bg-white dark:bg-card-dark p-6 rounded-[32px] shadow-sm border border-slate-50 dark:border-slate-800/50">
          <h2 className="text-sm font-black text-slate-800 dark:text-white mb-1 flex items-center gap-2">
            <TrendingDown size={18} className="text-violet-500" />
            Chi tiêu theo danh mục
          </h2>
          <p className="text-[10px] text-slate-400 mb-4">Gồm chi trực tiếp + thanh toán định kỳ trong tháng</p>
          {pieChi.length > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="h-52 w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChi}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChi.map((_, index) => (
                        <Cell
                          key={`c-${index}`}
                          fill={CHI_COLORS[index % CHI_COLORS.length]}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-2 max-h-52 overflow-y-auto pr-1">
                {chiByCategory.map((d, i) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: CHI_COLORS[i % CHI_COLORS.length] }}
                      />
                      <span className="truncate font-bold text-slate-700 dark:text-slate-200">
                        {d.icon} {d.name}
                      </span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-white shrink-0">
                      {formatCurrency(d.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-center text-slate-400 text-sm py-8">Chưa có chi trong tháng.</p>
          )}
        </section>

        <section className="bg-white dark:bg-card-dark p-6 rounded-[32px] shadow-sm border border-slate-50 dark:border-slate-800/50">
          <h2 className="text-sm font-black text-slate-800 dark:text-white mb-1 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" />
            Thu nhập theo danh mục
          </h2>
          <p className="text-[10px] text-slate-400 mb-4">Chỉ các khoản thu ghi nhận trong tháng</p>
          {pieThu.length > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="h-52 w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieThu}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieThu.map((_, index) => (
                        <Cell
                          key={`t-${index}`}
                          fill={THU_COLORS[index % THU_COLORS.length]}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-2 max-h-52 overflow-y-auto pr-1">
                {thuByCategory.map((d, i) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: THU_COLORS[i % THU_COLORS.length] }}
                      />
                      <span className="truncate font-bold text-slate-700 dark:text-slate-200">
                        {d.icon} {d.name}
                      </span>
                    </span>
                    <span className="font-black text-emerald-700 dark:text-emerald-300 shrink-0">
                      {formatCurrency(d.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-center text-slate-400 text-sm py-8">Chưa có thu trong tháng.</p>
          )}
        </section>
      </div>

      <section className="mx-2 rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-card-dark">
        <h2 className="text-sm font-black text-slate-800 dark:text-white mb-1 flex items-center gap-2">
          <Bell size={18} className="text-amber-500" />
          Cảnh báo · Dự báo · Lời khuyên
        </h2>
        <p className="text-[10px] text-slate-400 mb-4">
          Tổng hợp từ báo cáo tháng và từ dòng tiền / hạn mức của bạn
        </p>
        <ul className="space-y-3">
          {ai.isNegativeProjection && (
            <li
              className={`flex gap-3 rounded-2xl border p-4 ${insightStyle('warning')}`}
            >
              <AlertTriangle className="shrink-0 text-amber-600 mt-0.5" size={18} />
              <div>
                <p className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-200">
                  Dự báo số dư
                </p>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mt-1">
                  Dòng tiền có thể âm quanh ngày {ai.negativeDate}. Kiểm tra các khoản sắp đến hạn.
                </p>
              </div>
            </li>
          )}
          {allInsights.map((ins, idx) => (
            <li
              key={`${ins.message}-${idx}`}
              className={`flex gap-3 rounded-2xl border p-4 ${insightStyle(ins.type)}`}
            >
              <span className="text-lg shrink-0" aria-hidden>
                {ins.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  {ins.type === 'warning' && (
                    <AlertTriangle size={12} className="text-amber-600" />
                  )}
                  {ins.type === 'success' && <Sparkles size={12} className="text-emerald-600" />}
                  {ins.type === 'info' && <Info size={12} className="text-slate-500" />}
                  {ins.type === 'warning'
                    ? 'Cảnh báo'
                    : ins.type === 'success'
                      ? 'Tích cực'
                      : 'Gợi ý'}
                </p>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                  {ins.message}
                </p>
              </div>
            </li>
          ))}
          {allInsights.length === 0 && !ai.isNegativeProjection && (
            <li className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
              Chưa có gợi ý tự động — thêm giao dịch để nhận phân tích chi tiết hơn.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
