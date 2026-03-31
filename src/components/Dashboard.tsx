import React from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { CATEGORIES } from '../constants';
import { formatCurrency } from '../lib/utils';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { TrendingUp, Calendar, AlertTriangle, ChevronRight, ArrowUpRight, ArrowDownRight, FileSpreadsheet } from 'lucide-react';
import { motion } from 'motion/react';

import AIInsights from './AIInsights';

type DashboardProps = {
  /** Mở popup kết nối Google (trang chủ) */
  onOpenGoogleSheetsModal?: () => void;
};

export default function Dashboard({ onOpenGoogleSheetsModal }: DashboardProps) {
  const { getTimeline, getAIInsights } = useFinanceStore();
  const timeline = getTimeline();
  const insightsData = getAIInsights();
  const now = startOfDay(new Date());
  
  const currentBalance = timeline.filter(t => !isAfter(parseISO(t.date), now)).pop()?.runningBalance || 0;
  
  const upcomingPayments = timeline.filter(t => 
    isAfter(parseISO(t.date), now) && (t.type === 'chi' || t.type === 'thanhtoan' || t.type === 'no')
  ).slice(0, 3);
  
  const nextIncome = timeline.find(t => 
    isAfter(parseISO(t.date), now) && t.type === 'thu'
  );

  const monthlyIncome = timeline
    .filter(t => t.type === 'thu' && format(parseISO(t.date), 'MM') === format(now, 'MM'))
    .reduce((sum, t) => sum + t.amount, 0);

  const getHealthStatus = () => {
    if (insightsData.isNegativeProjection) return { label: 'Nguy cơ thiếu tiền', color: 'text-red-400', icon: '🔴' };
    const minBalance = Math.min(...timeline.filter(t => isAfter(parseISO(t.date), now)).map(t => t.runningBalance), currentBalance);
    if (minBalance < monthlyIncome * 0.2) return { label: 'Cần chú ý', color: 'text-amber-400', icon: '🟡' };
    return { label: 'Ổn định', color: 'text-emerald-100', icon: '🟢' };
  };

  const health = getHealthStatus();

  return (
    <div className="space-y-8">
      {onOpenGoogleSheetsModal && (
        <div className="flex justify-end px-2">
          <button
            type="button"
            onClick={onOpenGoogleSheetsModal}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
          >
            <FileSpreadsheet size={16} className="text-emerald-500" />
            Kết nối Google Sheets
          </button>
        </div>
      )}

      {/* Header / Balance Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden bg-emerald-500 dark:bg-emerald-600 p-8 rounded-[32px] shadow-2xl shadow-emerald-200 dark:shadow-none"
      >
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl" />

        <div className="relative z-10">
          <p className="text-emerald-100/80 text-xs font-bold uppercase tracking-widest mb-1">Số dư hiện tại</p>
          <h1 className="text-4xl font-black text-white tracking-tight">
            {formatCurrency(currentBalance)}
          </h1>
          
          <div className="mt-8 flex items-center justify-between">
            {nextIncome ? (
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center space-x-3 border border-white/10">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                  <TrendingUp size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-emerald-100/70 font-black uppercase tracking-tighter">Lương tiếp theo</p>
                  <p className="text-sm font-black text-white">
                    {format(parseISO(nextIncome.date), 'dd/MM', { locale: vi })}
                  </p>
                </div>
              </div>
            ) : (
              <div />
            )}
            
            <div className="text-right">
              <p className="text-[10px] text-emerald-100/70 font-bold uppercase">Trạng thái</p>
              <p className={`text-xs font-bold ${health.color} flex items-center justify-end`}>
                <span className="mr-1">{health.icon}</span> {health.label}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* AI Insights & Predictions */}
      <AIInsights />

      {/* Upcoming Payments */}
      <section>
        <div className="flex justify-between items-end mb-4 px-2">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Sắp tới</h2>
            <p className="text-xs text-slate-400 font-medium">Các khoản chi dự kiến</p>
          </div>
          <button className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
            Tất cả <ChevronRight size={14} className="ml-1" />
          </button>
        </div>
        
        <div className="space-y-4">
          {upcomingPayments.length > 0 ? upcomingPayments.map((t, idx) => {
            const category = CATEGORIES.find(c => c.id === t.category);
            return (
              <motion.div 
                key={t.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white dark:bg-card-dark p-4 rounded-3xl flex items-center justify-between shadow-sm border border-slate-50 dark:border-slate-800/50"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                    {category?.icon || '💸'}
                  </div>
                  <div>
                    <p className="text-slate-800 dark:text-white text-sm font-bold">{t.note || category?.name}</p>
                    <div className="flex items-center text-[10px] text-slate-400 mt-0.5 font-medium">
                      <Calendar size={10} className="mr-1" />
                      {format(parseISO(t.date), 'dd MMMM, yyyy', { locale: vi })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-sm ${
                    t.type === 'thanhtoan' ? 'text-amber-500' : 
                    t.type === 'no' ? 'text-red-500' : 
                    'text-slate-500'
                  }`}>
                    -{formatCurrency(t.amount)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                    Dự kiến
                  </p>
                </div>
              </motion.div>
            );
          }) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl py-10 text-center">
              <p className="text-slate-400 text-sm italic">Không có khoản chi nào sắp tới.</p>
            </div>
          )}
        </div>
      </section>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          icon={<ArrowUpRight size={18} className="text-emerald-500" />}
          label="Dự kiến cuối tháng"
          value={formatCurrency(timeline.filter(t => format(parseISO(t.date), 'MM') === format(now, 'MM')).pop()?.runningBalance || 0)}
          trend="+12%"
        />
        <StatCard 
          icon={<ArrowDownRight size={18} className="text-blue-500" />}
          label="Số giao dịch"
          value={timeline.filter(t => format(parseISO(t.date), 'MM') === format(now, 'MM')).length.toString()}
          trend="Tháng này"
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend: string }) {
  return (
    <div className="bg-white dark:bg-card-dark p-5 rounded-[32px] shadow-sm border border-slate-50 dark:border-slate-800/50">
      <div className="flex justify-between items-start mb-3">
        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-inner">
          {icon}
        </div>
        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
          {trend}
        </span>
      </div>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-slate-800 dark:text-white font-black text-lg truncate">{value}</p>
    </div>
  );
}
