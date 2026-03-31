import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, TimelineItem, TransactionType } from '../types';
import { useFinanceStore } from '../store/useFinanceStore';
import { CATEGORIES } from '../constants';
import { formatCurrency } from '../lib/utils';
import {
  format,
  parseISO,
  isAfter,
  startOfDay,
  isSameDay,
  addWeeks,
  addMonths,
  isBefore,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, LayoutGrid, List, AlertTriangle, ChevronDown, ChevronUp, PlusCircle, Edit2, Trash2, Search, X, ArrowDownWideNarrow } from 'lucide-react';
import BalanceGraph from './BalanceGraph';
import CalendarView from './CalendarView';
import AddTransaction from './AddTransaction';

type FilterType = 'week' | 'month' | 'nextMonth' | '3months' | 'all';
type ViewMode = 'timeline' | 'calendar';
type TypeFilter = 'all' | TransactionType;

function timelineItemMatches(t: TimelineItem, search: string, typeFilter: TypeFilter): boolean {
  if (typeFilter !== 'all' && t.type !== typeFilter) return false;
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const cat = CATEGORIES.find((c) => c.id === t.category);
  const amountVi = t.amount.toLocaleString('vi-VN');
  const blob = [
    t.note,
    t.category,
    cat?.name ?? '',
    String(t.amount),
    amountVi,
    formatCurrency(t.amount),
  ]
    .join(' ')
    .toLowerCase();
  return blob.includes(q);
}

const TYPE_FILTER_OPTIONS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'thu', label: 'Thu' },
  { id: 'chi', label: 'Chi' },
  { id: 'thanhtoan', label: 'Định kỳ' },
  { id: 'hoadon', label: 'Hóa đơn' },
  { id: 'no', label: 'Nợ' },
];

type TimelineSortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const SORT_OPTIONS: { id: TimelineSortOrder; label: string; short: string }[] = [
  { id: 'date-desc', label: 'Ngày: mới → cũ', short: 'Mới nhất' },
  { id: 'date-asc', label: 'Ngày: cũ → mới', short: 'Cũ nhất' },
  { id: 'amount-desc', label: 'Số tiền: lớn → nhỏ', short: 'Tiền ↓' },
  { id: 'amount-asc', label: 'Số tiền: nhỏ → lớn', short: 'Tiền ↑' },
];

const TIME_FILTER_OPTIONS: { id: FilterType; label: string }[] = [
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
  { id: 'nextMonth', label: 'Tháng sau' },
  { id: '3months', label: '3 tháng tới' },
  { id: 'all', label: 'Tất cả' },
];

type TimelineRowProps = {
  t: TimelineItem;
  isFuture: boolean;
  showTopBorder: boolean;
  expandedNoteId: string | null;
  setExpandedNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
};

function TimelineTransactionRow({
  t,
  isFuture,
  showTopBorder,
  expandedNoteId,
  setExpandedNoteId,
  setEditingTransaction,
  deleteTransaction,
}: TimelineRowProps) {
  const category = CATEGORIES.find((c) => c.id === t.category);
  const displayTitle = (t.note || category?.name || 'Giao dịch').trim();
  const noteExpanded = expandedNoteId === t.id;
  return (
    <div
      className={`${showTopBorder ? 'pt-4 border-t border-slate-50 dark:border-slate-800/50' : ''} group relative`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div
            className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-xl shadow-inner ${
              isFuture ? 'bg-slate-100/50 dark:bg-slate-900/50' : 'bg-slate-50 dark:bg-slate-900'
            }`}
          >
            {category?.icon || '💰'}
          </div>
          <div className="flex-1 min-w-0">
            <button
              type="button"
              title={noteExpanded ? 'Thu gọn' : 'Xem đầy đủ tên giao dịch'}
              onClick={() => setExpandedNoteId((prev) => (prev === t.id ? null : t.id))}
              className={`w-full text-left text-sm font-bold text-slate-800 dark:text-white rounded-xl -mx-1 px-1 py-0.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                noteExpanded ? 'whitespace-pre-wrap break-words' : 'line-clamp-1 overflow-hidden'
              }`}
            >
              {displayTitle}
            </button>
            <div className="flex items-center space-x-2 mt-0.5">
              <span
                className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                  t.type === 'thu'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : t.type === 'thanhtoan'
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                      : t.type === 'hoadon'
                        ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400'
                        : t.type === 'no'
                          ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {t.type === 'thu'
                  ? 'Thu nhập'
                  : t.type === 'thanhtoan'
                    ? 'Định kỳ'
                    : t.type === 'hoadon'
                      ? 'Hóa đơn'
                      : t.type === 'no'
                        ? 'Khoản nợ'
                        : 'Chi tiêu'}
              </span>
              {t.recurring !== 'none' && (
                <div className="flex items-center text-[8px] text-slate-400 font-bold uppercase">
                  <Clock size={8} className="mr-1" />
                  {t.recurring === 'weekly' ? 'Tuần' : 'Tháng'}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center space-x-3 text-right">
          <div>
            <p
              className={`text-sm font-black ${
                t.type === 'thu'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : t.type === 'thanhtoan'
                    ? 'text-amber-600 dark:text-amber-400'
                    : t.type === 'hoadon'
                      ? 'text-violet-600 dark:text-violet-400'
                      : t.type === 'no'
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.type === 'thu' ? '+' : '-'}
              {formatCurrency(t.amount)}
            </p>
            <div className="mt-0.5">
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                Số dư: {formatCurrency(t.runningBalance)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => setEditingTransaction(t)}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors"
            >
              <Edit2 size={12} />
            </button>
            <button
              type="button"
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
    </div>
  );
}

export default function Timeline() {
  const { getTimeline, deleteTransaction } = useFinanceStore();
  const timeline = getTimeline();
  const now = startOfDay(new Date());
  
  const [filter, setFilter] = useState<FilterType>('3months');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  /** Giao dịch đang mở rộng tên/ghi chú (mặc định 1 dòng) */
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<TimelineSortOrder>('date-desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortWrapRef = useRef<HTMLDivElement>(null);

  const dateFilteredTimeline = useMemo(() => {
    switch (filter) {
      case 'all':
        return timeline;
      case 'nextMonth': {
        const start = startOfMonth(addMonths(now, 1));
        const end = endOfMonth(addMonths(now, 1));
        return timeline.filter((t) =>
          isWithinInterval(parseISO(t.date), { start, end })
        );
      }
      default: {
        let end: Date;
        switch (filter) {
          case 'week':
            end = addWeeks(now, 1);
            break;
          case 'month':
            end = addMonths(now, 1);
            break;
          case '3months':
            end = addMonths(now, 3);
            break;
          default:
            return timeline;
        }
        return timeline.filter((t) => isBefore(parseISO(t.date), end));
      }
    }
  }, [timeline, filter, now]);

  const listTimeline = useMemo(
    () =>
      dateFilteredTimeline.filter((t) =>
        timelineItemMatches(t, searchQuery, typeFilter)
      ),
    [dateFilteredTimeline, searchQuery, typeFilter]
  );

  const sortedList = useMemo(() => {
    const arr = [...listTimeline];
    switch (sortOrder) {
      case 'date-desc':
        return arr.sort(
          (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()
        );
      case 'date-asc':
        return arr.sort(
          (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
        );
      case 'amount-desc':
        return arr.sort((a, b) => {
          const d = b.amount - a.amount;
          if (d !== 0) return d;
          return parseISO(a.date).getTime() - parseISO(b.date).getTime();
        });
      case 'amount-asc':
        return arr.sort((a, b) => {
          const d = a.amount - b.amount;
          if (d !== 0) return d;
          return parseISO(a.date).getTime() - parseISO(b.date).getTime();
        });
      default:
        return arr;
    }
  }, [listTimeline, sortOrder]);

  const isAmountSort =
    sortOrder === 'amount-desc' || sortOrder === 'amount-asc';

  const groupedTimeline = useMemo(() => {
    const groups: { [key: string]: TimelineItem[] } = {};
    sortedList.forEach((t) => {
      const dateKey = format(parseISO(t.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    const entries = Object.entries(groups);
    if (sortOrder === 'date-desc') {
      entries.sort((a, b) => b[0].localeCompare(a[0]));
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }
    return entries;
  }, [sortedList, sortOrder]);

  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = sortWrapRef.current;
      if (!el || !sortMenuOpen) return;
      if (e.target instanceof Node && !el.contains(e.target)) setSortMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [sortMenuOpen]);

  useEffect(() => {
    if (viewMode === 'calendar') setSortMenuOpen(false);
  }, [viewMode]);

  const toggleGroup = (dateKey: string) => {
    setExpandedGroups(prev => 
      prev.includes(dateKey) ? prev.filter(k => k !== dateKey) : [...prev, dateKey]
    );
  };

  const lowBalanceWarning = useMemo(() => {
    const firstLow = timeline.find(t => isAfter(parseISO(t.date), now) && t.runningBalance < 0);
    return firstLow ? format(parseISO(firstLow.date), 'dd/MM', { locale: vi }) : null;
  }, [timeline, now]);

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Filters */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Moni Flow</h1>
          <p className="text-xs text-slate-400 font-medium">Lịch sử và dự báo chi tiêu</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-1 bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <PlusCircle size={14} />
            <span>Thêm</span>
          </button>
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
            <button 
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'timeline' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-500' : 'text-slate-400'}`}
            >
              <List size={18} />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-500' : 'text-slate-400'}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Lọc thời gian + sắp xếp (timeline) */}
      <div className="flex items-center gap-2 px-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {TIME_FILTER_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f.id
                  ? 'bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {viewMode === 'timeline' && (
          <div ref={sortWrapRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSortMenuOpen((o) => !o)}
              className="flex h-9 max-w-[7.5rem] items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0 text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              aria-expanded={sortMenuOpen}
              aria-haspopup="listbox"
              aria-label="Sắp xếp"
            >
              <ArrowDownWideNarrow size={14} className="shrink-0 text-emerald-500" />
              <span className="truncate text-[9px] font-black uppercase tracking-tight">
                {SORT_OPTIONS.find((o) => o.id === sortOrder)?.short}
              </span>
              <ChevronDown
                size={14}
                className={`shrink-0 text-slate-400 transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {sortMenuOpen && (
              <ul
                role="listbox"
                className="absolute right-0 top-full z-[80] mt-1 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-600 dark:bg-slate-800"
              >
                {SORT_OPTIONS.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sortOrder === opt.id}
                      onClick={() => {
                        setSortOrder(opt.id);
                        setSortMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-xs font-bold text-slate-800 transition-colors dark:text-slate-100 ${
                        sortOrder === opt.id
                          ? 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700/80'
                      }`}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Tìm kiếm & lọc loại */}
      <div className="space-y-3 px-2">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={18}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo ghi chú, danh mục, số tiền…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm font-medium text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
            autoComplete="off"
          />
          {searchQuery.trim() !== '' && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label="Xóa từ khóa"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {TYPE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTypeFilter(opt.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                typeFilter === opt.id
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {(searchQuery.trim() !== '' || typeFilter !== 'all') && (
          <p className="text-[10px] font-medium text-slate-400">
            Hiển thị{' '}
            <span className="font-black text-slate-600 dark:text-slate-300">
              {listTimeline.length}
            </span>{' '}
            / {dateFilteredTimeline.length} giao dịch trong khoảng thời gian đã chọn
          </p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'timeline' ? (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Balance Curve Graph */}
            <BalanceGraph />

            {/* Low Balance Warning */}
            {lowBalanceWarning && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-[28px] flex items-center space-x-4 mx-2"
              >
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-2xl flex items-center justify-center">
                  <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
                </div>
                <div>
                  <p className="text-red-900 dark:text-red-200 text-xs font-black uppercase tracking-tight">Cảnh báo số dư</p>
                  <p className="text-red-700 dark:text-red-400/80 text-[10px] font-medium">Số dư dự kiến sẽ thấp vào ngày {lowBalanceWarning}</p>
                </div>
              </motion.div>
            )}

            {/* Vertical Timeline */}
            <div className="relative">
              {!isAmountSort && (
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800" />
              )}

              <div className={`relative ${isAmountSort ? 'space-y-3' : 'space-y-8'}`}>
                {isAmountSort &&
                  sortedList.map((t, idx) => {
                    const prev = sortedList[idx - 1];
                    const showDateLabel =
                      idx === 0 ||
                      format(parseISO(prev.date), 'yyyy-MM-dd') !==
                        format(parseISO(t.date), 'yyyy-MM-dd');
                    const date = parseISO(format(parseISO(t.date), 'yyyy-MM-dd'));
                    const isFuture = isAfter(date, now);
                    const isToday = isSameDay(date, now);
                    return (
                      <div key={t.id} className="mx-2">
                        {showDateLabel && (
                          <p className="mb-2 pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {isToday ? 'Hôm nay' : format(date, 'dd MMMM yyyy', { locale: vi })}
                          </p>
                        )}
                        <motion.div
                          layout
                          className={`p-5 rounded-[32px] shadow-sm border transition-all duration-300 ${
                            isFuture
                              ? 'bg-white/40 dark:bg-slate-800/40 border-dashed border-slate-200 dark:border-slate-700 backdrop-blur-sm'
                              : 'bg-white dark:bg-card-dark border-slate-50 dark:border-slate-800/50'
                          }`}
                        >
                          <TimelineTransactionRow
                            t={t}
                            isFuture={isFuture}
                            showTopBorder={false}
                            expandedNoteId={expandedNoteId}
                            setExpandedNoteId={setExpandedNoteId}
                            setEditingTransaction={setEditingTransaction}
                            deleteTransaction={deleteTransaction}
                          />
                        </motion.div>
                      </div>
                    );
                  })}

                {!isAmountSort &&
                  groupedTimeline.map(([dateKey, transactions]) => {
                  const date = parseISO(dateKey);
                  const isFuture = isAfter(date, now);
                  const isToday = isSameDay(date, now);
                  const isExpanded = expandedGroups.includes(dateKey) || transactions.length === 1;
                  const totalAmount = transactions.reduce((sum, t) => sum + (t.type === 'thu' ? t.amount : -t.amount), 0);
                  const lastBalance = transactions[transactions.length - 1].runningBalance;
                  const isLowBalance = lastBalance < 500000 && lastBalance >= 0;
                  const isNegativeBalance = lastBalance < 0;

                  return (
                    <div key={dateKey} className="relative pl-14">
                      {/* Date Header */}
                      <div className="absolute -left-2 -top-1 bg-bg-light dark:bg-bg-dark px-2 py-1 flex items-center space-x-1 z-10">
                        <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {isToday ? 'Hôm nay' : format(date, 'dd MMMM', { locale: vi })}
                        </span>
                        {(isLowBalance || isNegativeBalance) && isFuture && (
                          <div className={`flex items-center space-x-1 ml-2 px-1.5 py-0.5 rounded-md ${isNegativeBalance ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'}`}>
                            <AlertTriangle size={8} />
                            <span className="text-[7px] font-black uppercase tracking-tighter">{isNegativeBalance ? 'Hụt tiền' : 'Sắp hết'}</span>
                          </div>
                        )}
                      </div>

                      {/* Group Card */}
                      <motion.div 
                        layout
                        className={`p-5 rounded-[32px] shadow-sm border transition-all duration-300 ${
                          isFuture 
                            ? 'bg-white/40 dark:bg-slate-800/40 border-dashed border-slate-200 dark:border-slate-700 backdrop-blur-sm' 
                            : 'bg-white dark:bg-card-dark border-slate-50 dark:border-slate-800/50'
                        }`}
                      >
                        {/* Summary Header (if multiple transactions) */}
                        {transactions.length > 1 && !isExpanded && (
                          <button 
                            onClick={() => toggleGroup(dateKey)}
                            className="w-full flex justify-between items-center"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex -space-x-2">
                                {transactions.slice(0, 3).map((t, i) => (
                                  <div key={i} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs">
                                    {CATEGORIES.find(c => c.id === t.category)?.icon || '💰'}
                                  </div>
                                ))}
                              </div>
                              <span className="text-xs font-bold text-slate-500">{transactions.length} giao dịch</span>
                            </div>
                            <div className="text-right flex items-center space-x-3">
                              <div>
                                <p className={`text-xs font-black ${totalAmount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {totalAmount >= 0 ? '+' : ''}{formatCurrency(totalAmount)}
                                </p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Số dư: {formatCurrency(lastBalance)}</p>
                              </div>
                              <ChevronDown size={14} className="text-slate-300" />
                            </div>
                          </button>
                        )}

                        {/* Expanded Details */}
                        <div className={`space-y-4 ${transactions.length > 1 && !isExpanded ? 'hidden' : 'block'}`}>
                          {transactions.map((t, idx) => (
                            <React.Fragment key={t.id}>
                              <TimelineTransactionRow
                                t={t}
                                isFuture={isFuture}
                                showTopBorder={idx !== 0}
                                expandedNoteId={expandedNoteId}
                                setExpandedNoteId={setExpandedNoteId}
                                setEditingTransaction={setEditingTransaction}
                                deleteTransaction={deleteTransaction}
                              />
                            </React.Fragment>
                          ))}
                          
                          {transactions.length > 1 && (
                            <button 
                              onClick={() => toggleGroup(dateKey)}
                              className="w-full pt-2 flex items-center justify-center text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-400 transition-colors"
                            >
                              Thu gọn <ChevronUp size={12} className="ml-1" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}

                {dateFilteredTimeline.length === 0 && (
                  <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-slate-800 mx-2">
                    <p className="text-slate-400 italic text-sm">Không có giao dịch nào trong khoảng thời gian này.</p>
                  </div>
                )}
                {dateFilteredTimeline.length > 0 && listTimeline.length === 0 && (
                  <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-slate-800 mx-2">
                    <p className="text-slate-500 text-sm font-medium">
                      Không có giao dịch khớp từ khóa hoặc loại đã chọn.
                    </p>
                    <p className="text-slate-400 text-xs mt-2">Thử đổi từ khóa hoặc chọn &quot;Tất cả&quot; loại giao dịch.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <CalendarView onEdit={(t) => setEditingTransaction(t)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Transaction Modal */}
      <AnimatePresence>
        {(isAdding || editingTransaction) && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAdding(false);
                setEditingTransaction(null);
              }}
              className="fixed inset-0 bg-black/40 dark:bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] max-w-md mx-auto"
            >
              <AddTransaction 
                initialType="chi"
                editingTransaction={editingTransaction}
                onSave={() => {
                  setIsAdding(false);
                  setEditingTransaction(null);
                }} 
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
