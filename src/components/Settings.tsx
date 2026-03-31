import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Trash2, Download, Info, Moon, Sun, ChevronRight, Shield, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SpendingReminders from './SpendingReminders';

export default function Settings() {
  const { initialBalance, setInitialBalance, transactions, darkMode, toggleDarkMode, resetAllData, resetExceptPayLater } = useFinanceStore();
  const [showReminders, setShowReminders] = useState(false);

  const handleExport = () => {
    const data = JSON.stringify(transactions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dong-tien-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClearData = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu và khởi động lại ứng dụng? Hành động này không thể hoàn tác.')) {
      resetAllData();
      window.location.reload();
    }
  };

  const handlePartialReset = () => {
    if (window.confirm('Xóa hết dữ liệu cũ, chỉ giữ lại các khoản MoMo Trả Sau và Shopee PayLater?')) {
      resetExceptPayLater();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {showReminders && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] overflow-y-auto"
          >
            <SpendingReminders onClose={() => setShowReminders(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-2">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Cài đặt</h1>
        <p className="text-xs text-slate-400 font-medium">Tùy chỉnh ứng dụng của bạn</p>
      </div>

      {/* Initial Balance Section */}
      <section className="bg-white dark:bg-card-dark p-8 rounded-[32px] shadow-sm border border-slate-50 dark:border-slate-800/50">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
            <Shield className="text-emerald-500" size={20} />
          </div>
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Số dư ban đầu</h2>
        </div>
        <div className="relative">
          <input
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(Number(e.target.value))}
            className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-[24px] py-5 px-8 text-2xl font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">VNĐ</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-4 italic leading-relaxed">
          * Đây là số tiền bạn đang có sẵn trước khi bắt đầu ghi chép các giao dịch mới.
        </p>
      </section>

      {/* App Settings */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Ứng dụng</h2>
        
        <div className="space-y-3">
          <SettingItem 
            icon={darkMode ? <Sun size={20} /> : <Moon size={20} />}
            label="Chế độ tối"
            onClick={toggleDarkMode}
            rightContent={
              <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${darkMode ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            }
          />
          <SettingItem 
            icon={<Bell size={20} />}
            label="Nhắc nhở chi tiêu"
            onClick={() => setShowReminders(true)}
            rightContent={<ChevronRight size={18} className="text-slate-300" />}
          />
        </div>
      </section>

      {/* Data Management */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Dữ liệu & Bảo mật</h2>
        
        <div className="space-y-3">
          <SettingItem 
            icon={<Download size={20} className="text-blue-500" />}
            label="Xuất dữ liệu (JSON)"
            onClick={handleExport}
            rightContent={<ChevronRight size={18} className="text-slate-300" />}
          />
          <SettingItem 
            icon={<Trash2 size={20} className="text-red-500" />}
            label="Xóa toàn bộ dữ liệu"
            onClick={handleClearData}
            rightContent={<ChevronRight size={18} className="text-slate-300" />}
          />
          <SettingItem 
            icon={<RefreshCwIcon />}
            label="Khởi động lại (Giữ PayLater)"
            onClick={handlePartialReset}
            rightContent={<ChevronRight size={18} className="text-slate-300" />}
          />
        </div>
      </section>

      {/* About */}
      <section className="bg-slate-100 dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3 text-slate-800 dark:text-white mb-4">
          <Info size={20} />
          <h2 className="text-sm font-black uppercase tracking-wider">Về Dòng Tiền</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Dòng Tiền là người bạn đồng hành tài chính thầm lặng, giúp bạn luôn làm chủ túi tiền của mình và không bao giờ bị bất ngờ bởi các khoản chi phí sắp tới.
        </p>
        <div className="mt-8 flex justify-between items-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Phiên bản 1.0.0</p>
          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-tighter">Made with ❤️</p>
        </div>
      </section>
    </div>
  );
}

function SettingItem({ icon, label, onClick, rightContent }: { icon: React.ReactNode, label: string, onClick?: () => void, rightContent?: React.ReactNode }) {
  return (
    <motion.button 
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className="w-full bg-white dark:bg-card-dark p-5 rounded-[28px] flex items-center justify-between shadow-sm border border-slate-50 dark:border-slate-800/50"
    >
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-inner">
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-800 dark:text-white">{label}</span>
      </div>
      {rightContent}
    </motion.button>
  );
}
