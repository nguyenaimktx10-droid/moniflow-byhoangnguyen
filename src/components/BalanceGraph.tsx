import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useFinanceStore } from '../store/useFinanceStore';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatCurrency } from '../lib/utils';

export default function BalanceGraph() {
  const { getTimeline } = useFinanceStore();
  const timeline = getTimeline();
  const now = startOfDay(new Date());

  const data = timeline.map(t => ({
    date: format(parseISO(t.date), 'dd/MM'),
    balance: t.runningBalance,
    isFuture: isAfter(parseISO(t.date), now)
  }));

  const minBalance = Math.min(...data.map(d => d.balance), 0);
  const isNegative = data.some(d => d.balance < 0);
  const isLow = data.some(d => d.balance < 500000 && d.balance >= 0);
  
  const graphColor = isNegative ? "#ef4444" : isLow ? "#f59e0b" : "#10b981";

  return (
    <div className="h-48 w-full bg-white dark:bg-slate-900 p-4 rounded-[32px] shadow-sm border border-slate-50 dark:border-slate-800/50 mb-6">
      <div className="flex justify-between items-center mb-2 px-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dự báo số dư</p>
        {isNegative ? (
          <span className="text-[9px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md uppercase">
            ⚠️ Cảnh báo hụt tiền
          </span>
        ) : isLow ? (
          <span className="text-[9px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md uppercase">
            ⚠️ Sắp hết tiền
          </span>
        ) : null}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={graphColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={graphColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
            minTickGap={30}
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const val = payload[0].value as number;
                return (
                  <div className="bg-slate-900 dark:bg-slate-800 text-white p-2 rounded-xl text-[10px] font-bold shadow-xl border border-slate-700">
                    <p className="text-slate-400 mb-1">{payload[0].payload.date}</p>
                    <p className={val < 0 ? 'text-red-400' : val < 500000 ? 'text-amber-400' : 'text-emerald-400'}>
                      {formatCurrency(val)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke={graphColor} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorBalance)" 
            animationDuration={1500}
          />
          <ReferenceLine x={format(now, 'dd/MM')} stroke="#64748b" strokeDasharray="3 3" label={{ position: 'top', value: 'Hôm nay', fill: '#64748b', fontSize: 8, fontWeight: 900 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
