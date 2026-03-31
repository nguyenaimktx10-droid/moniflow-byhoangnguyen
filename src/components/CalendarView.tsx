import React, { useState } from 'react';
import { Transaction } from '../types';
import { useFinanceStore } from '../store/useFinanceStore';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  parseISO 
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { CATEGORIES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarViewProps {
  onEdit: (t: Transaction) => void;
}

export default function CalendarView({ onEdit }: CalendarViewProps) {
  const { getTimeline, deleteTransaction } = useFinanceStore();
  const timeline = getTimeline();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const getTransactionsForDay = (day: Date) => {
    return timeline.filter(t => isSameDay(parseISO(t.date), day));
  };

  const selectedDayTransactions = selectedDate ? getTransactionsForDay(selectedDate) : [];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-white dark:bg-card-dark p-6 rounded-[32px] shadow-sm border border-slate-50 dark:border-slate-800/50">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-black text-slate-800 dark:text-white capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: vi })}
          </h2>
          <div className="flex space-x-2">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-colors">
              <ChevronLeft size={20} className="text-slate-400" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-colors">
              <ChevronRight size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 mb-4">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
            <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const dayTransactions = getTransactionsForDay(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`relative h-12 flex flex-col items-center justify-center rounded-2xl transition-all ${
                  isSelected 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg scale-105 z-10' 
                    : isToday
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                    : isCurrentMonth
                    ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
                    : 'text-slate-300 dark:text-slate-700'
                }`}
              >
                <span className="text-xs font-black">{format(day, 'd')}</span>
                {dayTransactions.length > 0 && !isSelected && (
                  <div className="absolute bottom-2 flex space-x-0.5">
                    {dayTransactions.slice(0, 3).map((t, i) => (
                      <div 
                        key={i} 
                        className={`w-1 h-1 rounded-full ${
                          t.type === 'thu' ? 'bg-emerald-500' : t.type === 'thanhtoan' ? 'bg-amber-500' : t.type === 'hoadon' ? 'bg-violet-500' : 'bg-slate-400'
                        }`} 
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Transactions */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate.toISOString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2 px-4">
              <CalendarIcon size={14} className="text-slate-400" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {format(selectedDate, 'eeee, dd MMMM', { locale: vi })}
              </h3>
            </div>

            {selectedDayTransactions.length > 0 ? (
              <div className="space-y-3">
                {selectedDayTransactions.map(t => {
                  const category = CATEGORIES.find((c) => c.id === t.category);
                  const displayTitle = (t.note || category?.name || t.category || 'Giao dịch').trim();
                  const noteExpanded = expandedNoteId === t.id;
                  return (
                  <div key={t.id} className="bg-white dark:bg-slate-900 p-4 rounded-[28px] shadow-sm border border-slate-50 dark:border-slate-800/50 flex items-center justify-between gap-2 group">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-xl shadow-inner ${
                        t.type === 'thu' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 
                        t.type === 'thanhtoan' ? 'bg-amber-50 dark:bg-amber-900/20' : 
                        t.type === 'hoadon' ? 'bg-violet-50 dark:bg-violet-900/20' :
                        'bg-slate-50 dark:bg-slate-800'
                      }`}>
                        {category?.icon ?? (t.type === 'thu' ? '💰' : t.type === 'thanhtoan' ? '📅' : t.type === 'hoadon' ? '🧾' : '💸')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          title={noteExpanded ? 'Thu gọn' : 'Xem đầy đủ tên giao dịch'}
                          onClick={() =>
                            setExpandedNoteId((prev) => (prev === t.id ? null : t.id))
                          }
                          className={`w-full text-left text-sm font-bold text-slate-800 dark:text-white rounded-xl -mx-1 px-1 py-0.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                            noteExpanded
                              ? 'whitespace-pre-wrap break-words'
                              : 'line-clamp-1 overflow-hidden'
                          }`}
                        >
                          {displayTitle}
                        </button>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{t.category}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center space-x-3 text-right">
                      <div>
                        <p className={`text-sm font-black ${
                          t.type === 'thu' ? 'text-emerald-500' : 
                          t.type === 'thanhtoan' ? 'text-amber-500' : 
                          t.type === 'hoadon' ? 'text-violet-500' :
                          'text-slate-500'
                        }`}>
                          {t.type === 'thu' ? '+' : '-'}{formatCurrency(t.amount)}
                        </p>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEdit(t)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
                              deleteTransaction(t.id.split('-')[0]);
                            }
                          }}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center">
                <p className="text-slate-400 italic text-sm">Không có giao dịch nào trong ngày này.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
