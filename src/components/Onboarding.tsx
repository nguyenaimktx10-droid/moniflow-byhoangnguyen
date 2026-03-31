import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  Target,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';

type OnboardingData = {
  salary: {
    type: 'fixed' | 'multiple' | 'variable';
    amount: number;
    day: number;
  };
  otherIncome: Array<{ name: string; amount: number; day?: number }>;
  expenses: Array<{ name: string; amount: number; day: number }>;
  loans: Array<{ name: string; amount: number; day: number; monthsLeft: number }>;
  savingsGoal: {
    type: '10%' | '20%' | 'custom';
    amount: number;
  };
};

export default function Onboarding() {
  const { completeOnboarding, addTransaction, setInitialBalance } = useFinanceStore();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    salary: { type: 'fixed', amount: 0, day: 30 },
    otherIncome: [],
    expenses: [],
    loans: [],
    savingsGoal: { type: '10%', amount: 0 }
  });

  const nextStep = () => setStep(s => Math.min(s + 1, 5));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleComplete = () => {
    // 1. Set initial balance (default to 0 or could ask in a step, but let's stick to prompt)
    setInitialBalance(0);

    // 2. Add Salary
    if (data.salary.type === 'fixed' && data.salary.amount > 0) {
      addTransaction({
        note: 'Lương hàng tháng',
        amount: data.salary.amount,
        type: 'thu',
        category: 'luong',
        date: new Date(new Date().getFullYear(), new Date().getMonth(), data.salary.day).toISOString(),
        recurring: 'monthly'
      });
    }

    // 3. Add Other Income
    data.otherIncome.forEach(inc => {
      addTransaction({
        note: inc.name,
        amount: inc.amount,
        type: 'thu',
        category: 'thu-khac',
        date: inc.day ? new Date(new Date().getFullYear(), new Date().getMonth(), inc.day).toISOString() : new Date().toISOString(),
        recurring: inc.day ? 'monthly' : 'none'
      });
    });

    // 4. Add Fixed Expenses
    data.expenses.forEach(exp => {
      addTransaction({
        note: exp.name,
        amount: exp.amount,
        type: 'chi',
        category: 'sinh-hoat',
        date: new Date(new Date().getFullYear(), new Date().getMonth(), exp.day).toISOString(),
        recurring: 'monthly'
      });
    });

    // 5. Add Loans
    data.loans.forEach(loan => {
      addTransaction({
        note: loan.name,
        amount: loan.amount,
        type: 'no',
        category: 'khoan-vay',
        date: new Date(new Date().getFullYear(), new Date().getMonth(), loan.day).toISOString(),
        recurring: 'monthly'
      });
    });

    completeOnboarding();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Wallet className="text-emerald-500" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Bạn thường nhận lương vào ngày nào?</h2>
              <p className="text-slate-400 text-sm">Chỉ mất khoảng 1 phút để thiết lập dòng tiền của bạn.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'fixed', label: 'Ngày cố định hàng tháng', icon: '📅' },
                { id: 'multiple', label: 'Nhiều nguồn thu', icon: '💰' },
                { id: 'variable', label: 'Thu nhập không cố định', icon: '📈' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setData({ ...data, salary: { ...data.salary, type: opt.id as any } })}
                  className={`p-5 rounded-[24px] border-2 text-left flex items-center space-x-4 transition-all ${
                    data.salary.type === opt.id 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{opt.label}</span>
                </button>
              ))}
            </div>

            {data.salary.type === 'fixed' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Số dư hiện tại</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Bạn đang có bao nhiêu tiền?"
                      onChange={e => setInitialBalance(parseInt(e.target.value) || 0)}
                      className="w-full bg-white dark:bg-slate-900 border-none rounded-[20px] py-4 px-6 text-lg font-bold text-slate-800 dark:text-white shadow-sm"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">VNĐ</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ngày nhận lương</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={data.salary.day}
                    onChange={e => setData({ ...data, salary: { ...data.salary, day: parseInt(e.target.value) } })}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-[20px] py-4 px-6 text-lg font-bold text-slate-800 dark:text-white shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Số tiền lương</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={data.salary.amount}
                      onChange={e => setData({ ...data, salary: { ...data.salary, amount: parseInt(e.target.value) } })}
                      className="w-full bg-white dark:bg-slate-900 border-none rounded-[20px] py-4 px-6 text-lg font-bold text-slate-800 dark:text-white shadow-sm"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">VNĐ</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="text-blue-500" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Bạn có nguồn thu nào khác không?</h2>
              <p className="text-slate-400 text-sm">Freelance, đầu tư, kinh doanh nhỏ...</p>
            </div>

            <div className="space-y-3">
              {data.otherIncome.map((inc, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-[24px] border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{inc.name}</p>
                    <p className="text-xs text-emerald-500 font-bold">+{formatCurrency(inc.amount)}</p>
                  </div>
                  <button 
                    onClick={() => setData({ ...data, otherIncome: data.otherIncome.filter((_, i) => i !== idx) })}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              <button 
                onClick={() => {
                  const name = prompt('Tên nguồn thu?');
                  const amount = prompt('Số tiền?');
                  if (name && amount) {
                    setData({ ...data, otherIncome: [...data.otherIncome, { name, amount: parseInt(amount) }] });
                  }
                }}
                className="w-full p-4 rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold flex items-center justify-center space-x-2 hover:border-blue-500 hover:text-blue-500 transition-all"
              >
                <Plus size={18} />
                <span>Thêm nguồn thu</span>
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-orange-500" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Chi phí cố định hàng tháng?</h2>
              <p className="text-slate-400 text-sm">Tiền nhà, điện nước, internet, Netflix...</p>
            </div>

            <div className="space-y-3">
              {data.expenses.map((exp, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-[24px] border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{exp.name}</p>
                    <p className="text-xs text-red-500 font-bold">-{formatCurrency(exp.amount)} • Ngày {exp.day}</p>
                  </div>
                  <button 
                    onClick={() => setData({ ...data, expenses: data.expenses.filter((_, i) => i !== idx) })}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              <button 
                onClick={() => {
                  const name = prompt('Tên khoản chi? (VD: Tiền nhà)');
                  const amount = prompt('Số tiền?');
                  const day = prompt('Ngày thanh toán? (1-31)');
                  if (name && amount && day) {
                    setData({ ...data, expenses: [...data.expenses, { name, amount: parseInt(amount), day: parseInt(day) }] });
                  }
                }}
                className="w-full p-4 rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold flex items-center justify-center space-x-2 hover:border-orange-500 hover:text-orange-500 transition-all"
              >
                <Plus size={18} />
                <span>Thêm khoản chi</span>
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="text-red-500" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Khoản vay hoặc trả góp?</h2>
              <p className="text-slate-400 text-sm">Trả góp điện thoại, vay ngân hàng, nợ thẻ...</p>
            </div>

            <div className="space-y-3">
              {data.loans.map((loan, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-[24px] border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{loan.name}</p>
                    <p className="text-xs text-red-500 font-bold">-{formatCurrency(loan.amount)} • Còn {loan.monthsLeft} tháng</p>
                  </div>
                  <button 
                    onClick={() => setData({ ...data, loans: data.loans.filter((_, i) => i !== idx) })}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              <button 
                onClick={() => {
                  const name = prompt('Tên khoản vay?');
                  const amount = prompt('Số tiền mỗi kỳ?');
                  const day = prompt('Ngày thanh toán?');
                  const months = prompt('Số tháng còn lại?');
                  if (name && amount && day && months) {
                    setData({ ...data, loans: [...data.loans, { name, amount: parseInt(amount), day: parseInt(day), monthsLeft: parseInt(months) }] });
                  }
                }}
                className="w-full p-4 rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold flex items-center justify-center space-x-2 hover:border-red-500 hover:text-red-500 transition-all"
              >
                <Plus size={18} />
                <span>Thêm khoản vay</span>
              </button>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Target className="text-purple-500" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Mục tiêu tiết kiệm mỗi tháng?</h2>
              <p className="text-slate-400 text-sm">Chúng tôi sẽ giúp bạn theo dõi mục tiêu này.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { id: '10%', label: '10% thu nhập', desc: 'An toàn & bền vững' },
                { id: '20%', label: '20% thu nhập', desc: 'Kỷ luật & nhanh chóng' },
                { id: 'custom', label: 'Tự nhập số tiền', desc: 'Theo ý muốn của bạn' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setData({ ...data, savingsGoal: { ...data.savingsGoal, type: opt.id as any } })}
                  className={`p-5 rounded-[24px] border-2 text-left transition-all ${
                    data.savingsGoal.type === opt.id 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <p className="font-bold text-slate-800 dark:text-white">{opt.label}</p>
                  <p className="text-xs text-slate-400 font-medium">{opt.desc}</p>
                </button>
              ))}
            </div>

            {data.savingsGoal.type === 'custom' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                <input
                  type="number"
                  placeholder="Nhập số tiền..."
                  value={data.savingsGoal.amount || ''}
                  onChange={e => setData({ ...data, savingsGoal: { ...data.savingsGoal, amount: parseInt(e.target.value) } })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-[20px] py-4 px-6 text-lg font-bold text-slate-800 dark:text-white shadow-inner"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">VNĐ</span>
              </motion.div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 overflow-y-auto">
      <div className="max-w-md mx-auto min-h-screen flex flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
            <span className="font-black text-slate-800 dark:text-white tracking-tighter">MONI FLOW</span>
          </div>
          <div className="bg-slate-100 dark:bg-slate-900 px-4 py-1.5 rounded-full">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Bước {step} / 5</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full mb-12 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(step / 5) * 100}%` }}
            className="h-full bg-emerald-500"
          />
        </div>

        {/* Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-12 space-y-3">
          <div className="flex space-x-3">
            {step > 1 && (
              <button 
                onClick={prevStep}
                className="p-5 rounded-[24px] bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <button 
              onClick={step === 5 ? handleComplete : nextStep}
              className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-5 rounded-[24px] font-black flex items-center justify-center space-x-2 shadow-xl shadow-slate-200 dark:shadow-none"
            >
              <span>{step === 5 ? 'Bắt đầu ngay' : 'Tiếp tục'}</span>
              {step === 5 ? <Check size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
          
          <button 
            onClick={completeOnboarding}
            className="w-full py-3 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
          >
            Bỏ qua bước này
          </button>
        </div>
      </div>
    </div>
  );
}
