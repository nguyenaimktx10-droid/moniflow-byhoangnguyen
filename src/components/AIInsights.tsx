import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, ShieldCheck, Calendar } from 'lucide-react';

export default function AIInsights() {
  const { getAIInsights } = useFinanceStore();
  const insightsData = getAIInsights();
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  useEffect(() => {
    if (insightsData.insights.length > 1) {
      const interval = setInterval(() => {
        setCurrentInsightIndex((prev) => (prev + 1) % insightsData.insights.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [insightsData.insights.length]);

  if (insightsData.insights.length === 0 && insightsData.safeDailySpending === 0) return null;

  const currentInsight = insightsData.insights[currentInsightIndex];

  return (
    <div className="space-y-4">
      {/* Safe Spending & Payday Awareness */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-card-dark p-4 rounded-[28px] border border-slate-50 dark:border-slate-800/50 shadow-sm"
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Chi tiêu an toàn</span>
          </div>
          <p className="text-lg font-black text-slate-800 dark:text-white">
            {formatCurrency(insightsData.safeDailySpending)}
            <span className="text-[10px] text-slate-400 font-bold ml-1">/ ngày</span>
          </p>
          <p className="text-[9px] text-slate-400 font-medium mt-1">Cho đến ngày nhận lương</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-card-dark p-4 rounded-[28px] border border-slate-50 dark:border-slate-800/50 shadow-sm"
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ngày nhận lương</span>
          </div>
          <p className="text-lg font-black text-slate-800 dark:text-white">
            {insightsData.daysUntilPayday}
            <span className="text-[10px] text-slate-400 font-bold ml-1">ngày nữa</span>
          </p>
          <p className="text-[9px] text-slate-400 font-medium mt-1">Sắp tới ngày {insightsData.nextPayday ? insightsData.nextPayday.getDate() : '??'}</p>
        </motion.div>
      </div>

      {/* Rotating AI Insight Cards */}
      <div className="relative h-24">
        <AnimatePresence mode="wait">
          {currentInsight && (
            <motion.div
              key={currentInsightIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`absolute inset-0 p-5 rounded-[32px] flex items-center space-x-4 border ${
                currentInsight.type === 'warning' 
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' 
                  : currentInsight.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20'
                  : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20'
              }`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                currentInsight.type === 'warning' 
                  ? 'bg-red-100 dark:bg-red-900/30' 
                  : currentInsight.type === 'success'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                {currentInsight.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-1.5 mb-0.5">
                  <Sparkles size={10} className={
                    currentInsight.type === 'warning' ? 'text-red-500' : 
                    currentInsight.type === 'success' ? 'text-emerald-500' : 'text-blue-500'
                  } />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    currentInsight.type === 'warning' ? 'text-red-500' : 
                    currentInsight.type === 'success' ? 'text-emerald-500' : 'text-blue-500'
                  }`}>AI Gợi ý</span>
                </div>
                <p className={`text-xs font-bold leading-tight ${
                  currentInsight.type === 'warning' ? 'text-red-900 dark:text-red-200' : 
                  currentInsight.type === 'success' ? 'text-emerald-900 dark:text-emerald-200' : 'text-blue-900 dark:text-blue-200'
                }`}>
                  {currentInsight.message}
                </p>
              </div>
              <ArrowRight size={16} className="text-slate-300 shrink-0" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
