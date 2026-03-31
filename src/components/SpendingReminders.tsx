import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { SpendingLimit, SpendingLimitType } from '../types';
import { CATEGORIES } from '../constants';
import { Plus, Trash2, X, Bell, Calendar, Tag, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SpendingRemindersProps {
  onClose: () => void;
}

export default function SpendingReminders({ onClose }: SpendingRemindersProps) {
  const { spendingLimits, addSpendingLimit, updateSpendingLimit, deleteSpendingLimit } = useFinanceStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newLimit, setNewLimit] = useState<Omit<SpendingLimit, 'id'>>({
    type: 'daily',
    amount: 0,
    enabled: true,
  });

  const handleAdd = () => {
    if (newLimit.amount <= 0) return;
    addSpendingLimit(newLimit);
    setIsAdding(false);
    setNewLimit({ type: 'daily', amount: 0, enabled: true });
  };

  const chiCategories = CATEGORIES.filter(c => c.type === 'chi');

  return (
    <div className="bg-bg-light dark:bg-bg-dark min-h-screen p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Nhắc nhở chi tiêu</h1>
          <p className="text-xs text-slate-400 font-medium">Quản lý giới hạn chi tiêu của bạn</p>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 bg-white dark:bg-card-dark rounded-full flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {spendingLimits.length === 0 && !isAdding && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
              <Bell className="text-slate-300" size={32} />
            </div>
            <p className="text-sm text-slate-400 font-medium">Chưa có giới hạn chi tiêu nào được thiết lập.</p>
          </div>
        )}

        <div className="space-y-3">
          {spendingLimits.map((limit) => (
            <div 
              key={limit.id}
              className="bg-white dark:bg-card-dark p-5 rounded-[28px] shadow-sm border border-slate-50 dark:border-slate-800/50 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  limit.type === 'daily' ? 'bg-blue-50 text-blue-500' : 
                  limit.type === 'weekly' ? 'bg-purple-50 text-purple-500' : 
                  'bg-amber-50 text-amber-500'
                } dark:bg-slate-900`}>
                  {limit.type === 'daily' ? <Calendar size={20} /> : 
                   limit.type === 'weekly' ? <Calendar size={20} /> : 
                   <Tag size={20} />}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-white">
                    {limit.type === 'daily' ? 'Hàng ngày' : 
                     limit.type === 'weekly' ? 'Hàng tuần' : 
                     `Danh mục: ${limit.category}`}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Giới hạn: {limit.amount.toLocaleString()} VNĐ
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => updateSpendingLimit(limit.id, { enabled: !limit.enabled })}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${limit.enabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${limit.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <button 
                  onClick={() => deleteSpendingLimit(limit.id)}
                  className="w-8 h-8 text-red-500 flex items-center justify-center"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white dark:bg-card-dark p-6 rounded-[32px] shadow-lg border border-emerald-100 dark:border-emerald-900/30 space-y-6"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'category'] as SpendingLimitType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewLimit({ ...newLimit, type, category: type === 'category' ? chiCategories[0].name : undefined })}
                      className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        newLimit.type === type 
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {type === 'daily' ? 'Ngày' : type === 'weekly' ? 'Tuần' : 'D.Mục'}
                    </button>
                  ))}
                </div>

                {newLimit.type === 'category' && (
                  <select 
                    value={newLimit.category}
                    onChange={(e) => setNewLimit({ ...newLimit, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {chiCategories.map(c => (
                      <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                )}

                <div className="relative">
                  <input
                    type="number"
                    placeholder="Số tiền giới hạn"
                    value={newLimit.amount || ''}
                    onChange={(e) => setNewLimit({ ...newLimit, amount: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 px-6 text-xl font-black focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">VNĐ</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleAdd}
                  className="flex-2 py-4 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                >
                  Thêm giới hạn
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full py-5 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[28px] flex items-center justify-center space-x-2 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-all group"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Thêm giới hạn mới</span>
          </button>
        )}
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-[32px] border border-amber-100 dark:border-amber-900/20 flex items-start space-x-4">
        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center shrink-0">
          <AlertCircle className="text-amber-600 dark:text-amber-400" size={20} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider">Lưu ý</p>
          <p className="text-[10px] text-amber-700/70 dark:text-amber-400/60 leading-relaxed font-medium">
            Hệ thống sẽ tự động gửi thông báo trong phần "AI Insights" khi bạn chi tiêu chạm mức 80% hoặc vượt quá giới hạn đã thiết lập.
          </p>
        </div>
      </div>
    </div>
  );
}
