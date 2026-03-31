/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Home, BarChart3, Plus, History, Settings as SettingsIcon, TrendingUp, TrendingDown, Calendar, FileText, PieChart } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Timeline from './components/Timeline';
import Settings from './components/Settings';
import FinancialTools from './components/FinancialTools';
import BusinessContracts from './components/BusinessContracts';
import Reports from './components/Reports';
import AddTransaction from './components/AddTransaction';
import Onboarding from './components/Onboarding';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from './store/useFinanceStore';
import { TransactionType } from './types';

type View = 'home' | 'timeline' | 'contracts' | 'tools' | 'reports' | 'settings';

export default function App() {
  const [activeView, setActiveView] = useState<View>('home');
  const [isAdding, setIsAdding] = useState(false);
  const [addType, setAddType] = useState<TransactionType>('chi');
  const [showQuickOptions, setShowQuickOptions] = useState(false);
  const darkMode = useFinanceStore(state => state.darkMode);
  const hasCompletedOnboarding = useFinanceStore(state => state.hasCompletedOnboarding);
  const seedShopeeBills = useFinanceStore(state => state.seedShopeeBills);
  const seedMomoRealityMarch2026 = useFinanceStore(state => state.seedMomoRealityMarch2026);
  const seedFixedMonthlyIncome = useFinanceStore(state => state.seedFixedMonthlyIncome);
  const seedFacebookAdsSaoKeMar2026 = useFinanceStore(state => state.seedFacebookAdsSaoKeMar2026);
  const resetExceptPayLater = useFinanceStore(state => state.resetExceptPayLater);

  // One-time partial reset as requested by user
  useEffect(() => {
    const hasDonePartialReset = localStorage.getItem('hasDonePartialReset_v1');
    if (!hasDonePartialReset) {
      resetExceptPayLater();
      localStorage.setItem('hasDonePartialReset_v1', 'true');
      window.location.reload();
    }
  }, [resetExceptPayLater]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (hasCompletedOnboarding) {
      seedShopeeBills();
      seedMomoRealityMarch2026();
      seedFixedMonthlyIncome();
      seedFacebookAdsSaoKeMar2026();
    }
  }, [hasCompletedOnboarding, seedShopeeBills, seedMomoRealityMarch2026, seedFixedMonthlyIncome, seedFacebookAdsSaoKeMar2026]);

  const renderView = () => {
    switch (activeView) {
      case 'home': return <Dashboard />;
      case 'timeline': return <Timeline />;
      case 'contracts': return <BusinessContracts />;
      case 'tools': return <FinancialTools />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  const handleQuickAdd = (type: TransactionType) => {
    setAddType(type);
    setShowQuickOptions(false);
    setIsAdding(true);
  };

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <AnimatePresence>
        {!hasCompletedOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
          >
            <Onboarding />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row min-h-screen relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r border-slate-100 dark:border-slate-800 p-6 sticky top-0 h-screen">
          <div className="mb-10">
            <h1 className="text-xl font-black text-emerald-500">Moni Flow</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CEO Hoàng Nguyên</p>
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarButton 
              active={activeView === 'home'} 
              onClick={() => setActiveView('home')} 
              icon={<Home size={20} />} 
              label="Trang chủ" 
            />
            <SidebarButton 
              active={activeView === 'timeline'} 
              onClick={() => setActiveView('timeline')} 
              icon={<History size={20} />} 
              label="Dòng tiền" 
            />
            <SidebarButton 
              active={activeView === 'contracts'} 
              onClick={() => setActiveView('contracts')} 
              icon={<FileText size={20} />} 
              label="Hợp đồng" 
            />
            <SidebarButton 
              active={activeView === 'tools'} 
              onClick={() => setActiveView('tools')} 
              icon={<BarChart3 size={20} />} 
              label="Công cụ" 
            />
            <SidebarButton 
              active={activeView === 'reports'} 
              onClick={() => setActiveView('reports')} 
              icon={<PieChart size={20} />} 
              label="Báo cáo" 
            />
            <SidebarButton 
              active={activeView === 'settings'} 
              onClick={() => setActiveView('settings')} 
              icon={<SettingsIcon size={20} />} 
              label="Cài đặt" 
            />
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-black">HN</div>
              <div>
                <p className="text-xs font-black">Hoàng Nguyên</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">CEO</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto pb-24 md:pb-10 max-w-4xl mx-auto w-full">
          <div className="md:hidden flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-black text-emerald-500">Moni Flow</h1>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">CEO Hoàng Nguyên</p>
            </div>
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-black">HN</div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 px-1 py-2 grid grid-cols-6 gap-0.5 items-center fixed bottom-0 left-0 right-0 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
          <NavButton 
            active={activeView === 'home'} 
            onClick={() => setActiveView('home')} 
            icon={<Home size={18} />} 
            label="Trang chủ" 
          />
          <NavButton 
            active={activeView === 'timeline'} 
            onClick={() => setActiveView('timeline')} 
            icon={<History size={18} />} 
            label="Dòng tiền" 
          />
          <NavButton 
            active={activeView === 'contracts'} 
            onClick={() => setActiveView('contracts')} 
            icon={<FileText size={18} />} 
            label="Hợp đồng" 
          />
          <NavButton 
            active={activeView === 'tools'} 
            onClick={() => setActiveView('tools')} 
            icon={<BarChart3 size={18} />} 
            label="Công cụ" 
          />
          <NavButton 
            active={activeView === 'reports'} 
            onClick={() => setActiveView('reports')} 
            icon={<PieChart size={18} />} 
            label="Báo cáo" 
          />
          <NavButton 
            active={activeView === 'settings'} 
            onClick={() => setActiveView('settings')} 
            icon={<SettingsIcon size={18} />} 
            label="Cài đặt" 
          />
        </nav>

        {/* Floating Action Button */}
        <div className="fixed bottom-[5.25rem] right-4 z-50 md:bottom-6 md:right-10">
          <AnimatePresence>
            {showQuickOptions && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0 flex flex-col items-center md:items-end space-y-3 w-48"
              >
                <QuickOption 
                  onClick={() => handleQuickAdd('thu')} 
                  icon={<TrendingUp size={18} />} 
                  label="Thêm thu" 
                  color="bg-emerald-500" 
                />
                <QuickOption 
                  onClick={() => handleQuickAdd('chi')} 
                  icon={<TrendingDown size={18} />} 
                  label="Thêm chi" 
                  color="bg-red-500" 
                />
                <QuickOption 
                  onClick={() => handleQuickAdd('thanhtoan')} 
                  icon={<Calendar size={18} />} 
                  label="Định kỳ" 
                  color="bg-amber-500" 
                />
                <QuickOption 
                  onClick={() => handleQuickAdd('no')} 
                  icon={<Plus size={18} />} 
                  label="Thêm nợ" 
                  color="bg-red-500" 
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowQuickOptions(!showQuickOptions)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
              showQuickOptions ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rotate-45' : 'bg-emerald-500 text-white'
            }`}
          >
            <Plus size={32} />
          </motion.button>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAdding && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
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
                initialType={addType}
                onSave={() => setIsAdding(false)} 
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all duration-300 ${active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
    >
      {icon}
      <span className="text-sm font-bold">{label}</span>
    </button>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center space-y-1 transition-all duration-300 ${active ? 'text-emerald-600 dark:text-emerald-400 scale-110' : 'text-slate-400 dark:text-slate-500'}`}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function QuickOption({ onClick, icon, label, color }: { onClick: () => void, icon: React.ReactNode, label: string, color: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${color} text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 w-full`}
    >
      {icon}
      <span className="text-xs font-bold">{label}</span>
    </motion.button>
  );
}
