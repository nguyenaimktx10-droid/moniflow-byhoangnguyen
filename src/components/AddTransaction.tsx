import React, { useState, useEffect, useRef } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { CATEGORIES } from '../constants';
import { Transaction, TransactionType, RecurringType } from '../types';
import { X, Check, Calendar, MessageSquare, Repeat, Trash2, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

const RECURRING_OPTIONS: { value: RecurringType; label: string }[] = [
  { value: 'none', label: 'Không lặp' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'monthly', label: 'Hàng tháng' },
  { value: 'every2months', label: 'Mỗi 2 tháng' },
];

interface AddTransactionProps {
  onSave: () => void;
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
}

export default function AddTransaction({ onSave, initialType = 'chi', editingTransaction }: AddTransactionProps) {
  const addTransaction = useFinanceStore(state => state.addTransaction);
  const updateTransaction = useFinanceStore(state => state.updateTransaction);
  const deleteTransaction = useFinanceStore(state => state.deleteTransaction);
  
  const [type, setType] = useState<TransactionType>(editingTransaction?.type || initialType);
  const [amount, setAmount] = useState(editingTransaction?.amount.toString() || '');
  const [category, setCategory] = useState(editingTransaction?.category || '');
  const [date, setDate] = useState(editingTransaction ? editingTransaction.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(editingTransaction?.note || '');
  const [recurring, setRecurring] = useState<RecurringType>(editingTransaction?.recurring || 'none');
  const [recurringOpen, setRecurringOpen] = useState(false);
  const recurringWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editingTransaction) {
      setType(initialType);
    }
  }, [initialType, editingTransaction]);

  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = recurringWrapRef.current;
      if (!el || !recurringOpen) return;
      if (e.target instanceof Node && !el.contains(e.target)) setRecurringOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [recurringOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, {
        type,
        amount: Number(amount),
        category,
        date: new Date(date).toISOString(),
        note,
        recurring
      });
    } else {
      addTransaction({
        type,
        amount: Number(amount),
        category,
        date: new Date(date).toISOString(),
        note,
        recurring
      });
    }
    onSave();
  };

  const handleDelete = () => {
    if (editingTransaction && window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
      deleteTransaction(editingTransaction.id);
      onSave();
    }
  };

  const filteredCategories = CATEGORIES.filter(c => c.type === type || (type === 'thanhtoan' && c.type === 'thanhtoan'));

  return (
    <div className="bg-white dark:bg-card-dark rounded-t-[40px] p-8 h-[90vh] overflow-y-auto shadow-2xl transition-colors duration-300">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">
          {editingTransaction ? 'Chỉnh sửa' : 'Thêm giao dịch'}
        </h2>
        <div className="flex items-center space-x-2">
          {editingTransaction && (
            <button 
              type="button"
              onClick={handleDelete}
              className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full text-red-500"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button onClick={onSave} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500">
            <X size={24} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Type Selector */}
        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900 rounded-[24px] overflow-x-auto no-scrollbar">
          {(['thu', 'chi', 'hoadon', 'thanhtoan', 'no'] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategory('');
                if (t === 'hoadon') setRecurring('monthly');
              }}
              className={`flex-1 min-w-[70px] py-3 text-[10px] font-black rounded-[18px] transition-all duration-300 ${
                type === t 
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              {t === 'thu' ? 'Thu' : t === 'chi' ? 'Chi' : t === 'hoadon' ? 'Hóa đơn' : t === 'thanhtoan' ? 'Định kỳ' : 'Nợ'}
            </button>
          ))}
        </div>

        {/* Amount Input */}
        <div className="text-center">
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2">Số tiền</label>
          <div className="relative inline-block">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full text-5xl font-black text-slate-800 dark:text-white border-none focus:ring-0 p-0 placeholder:text-slate-100 dark:placeholder:text-slate-800 bg-transparent text-center"
              autoFocus
            />
            <span className="block text-xs font-black text-slate-400 dark:text-slate-600 mt-2">VNĐ</span>
          </div>
        </div>

        {/* Category Grid */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-4">Danh mục</label>
          <div className="grid grid-cols-4 gap-4">
            {filteredCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`flex flex-col items-center p-3 rounded-[24px] transition-all duration-300 ${
                  category === c.id 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 dark:shadow-none' 
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="text-2xl mb-1.5">{c.icon}</span>
                <span className={`text-[10px] font-bold text-center line-clamp-1 ${category === c.id ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Controls */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-[24px]">
            <Calendar size={20} className="text-slate-400 shrink-0" />
            <div className="flex-1">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">Ngày thực hiện</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 dark:text-white focus:ring-0"
              />
            </div>
          </div>

          <div
            ref={recurringWrapRef}
            className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-[24px]"
          >
            <div className="flex items-start space-x-4">
              <Repeat size={20} className="mt-5 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                  Lặp lại
                </label>
                <button
                  type="button"
                  onClick={() => setRecurringOpen((o) => !o)}
                  className="mt-1 flex w-full items-center justify-between gap-2 rounded-[16px] bg-white px-3 py-2.5 text-left text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
                  aria-expanded={recurringOpen}
                  aria-haspopup="listbox"
                >
                  <span className="truncate">
                    {RECURRING_OPTIONS.find((o) => o.value === recurring)?.label ?? 'Không lặp'}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-400 transition-transform ${recurringOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>
            {recurringOpen && (
              <ul
                role="listbox"
                className="ml-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white py-1 shadow-inner dark:border-slate-600 dark:bg-slate-950/80 sm:ml-11"
              >
                {RECURRING_OPTIONS.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={recurring === opt.value}
                      onClick={() => {
                        setRecurring(opt.value);
                        setRecurringOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm font-bold transition-colors ${
                        recurring === opt.value
                          ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700/80'
                      }`}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-[24px]">
            <MessageSquare size={20} className="text-slate-400 shrink-0" />
            <div className="flex-1">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">Ghi chú</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú..."
                className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 dark:text-white focus:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-700"
              />
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!amount || !category}
          className="w-full bg-emerald-500 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-emerald-100 dark:shadow-none disabled:opacity-50 disabled:shadow-none flex items-center justify-center space-x-3"
        >
          <Check size={24} />
          <span>Lưu giao dịch</span>
        </motion.button>
      </form>
    </div>
  );
}
