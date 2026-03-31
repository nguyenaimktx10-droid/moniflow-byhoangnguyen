import React, { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../lib/utils';
import { motion } from 'motion/react';
import { PiggyBank, CreditCard, ArrowRight, Check, Info, Wallet } from 'lucide-react';
import { addMonths, format, parseISO, startOfDay, isAfter } from 'date-fns';

function splitEqualInstallments(total: number, n: number): number[] {
  if (n < 1 || total < 0) return [];
  const base = Math.floor(total / n);
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < n - 1; i++) {
    out.push(base);
    sum += base;
  }
  out.push(total - sum);
  return out;
}

/** Số kỳ trả từ ngày đầu đến hết ngày kết thúc (mỗi kỳ cách 1 hoặc 2 tháng), kỳ đầu đúng ngày bắt đầu. */
function countRepaymentPeriods(
  startDateStr: string,
  endDateStr: string,
  intervalMonths: 1 | 2
): number {
  const end = startOfDay(parseISO(endDateStr));
  let cur = startOfDay(parseISO(startDateStr));
  if (isAfter(cur, end)) return 0;
  let n = 0;
  while (!isAfter(cur, end)) {
    n++;
    cur = addMonths(cur, intervalMonths);
  }
  return n;
}

export default function FinancialTools() {
  const addTransaction = useFinanceStore(state => state.addTransaction);
  const [activeTool, setActiveTool] = useState<'repayment' | 'savings' | 'momo' | null>(null);

  // Repayment Plan State
  const [repayment, setRepayment] = useState({
    name: '',
    totalAmount: '',
    periodAmount: '',
    interval: '1',
    startDate: new Date().toISOString().split('T')[0],
    /** Số kỳ (tháng hoặc cách 2 tháng tuỳ chu kỳ) — khi planMode === 'months' */
    planMonths: '12',
    /** Ngày trả nợ cuối cùng — khi planMode === 'endDate' */
    endDate: '',
    planMode: 'months' as 'months' | 'endDate',
  });

  // Savings State
  const [savings, setSavings] = useState({
    monthly: '',
    interest: '4.5',
    months: '12'
  });

  /** MoMo: mỗi kỳ = (gốc ÷ n) + round(3% × gốc) — không chia đều tổng phí */
  const [momo, setMomo] = useState({
    principal: '',
    months: '6',
    /** Gộp vào kỳ 1 (vd: hóa đơn ví trả góp cùng tháng) */
    mergeKy1Vitragop: '',
  });

  const repaymentPeriodCount = useMemo(() => {
    const step = repayment.interval === '2' ? 2 : 1;
    if (repayment.planMode === 'months') {
      const n = Math.floor(Number(repayment.planMonths) || 0);
      return n > 0 ? n : 0;
    }
    if (!repayment.endDate) return 0;
    return countRepaymentPeriods(
      repayment.startDate,
      repayment.endDate,
      step as 1 | 2
    );
  }, [
    repayment.planMode,
    repayment.planMonths,
    repayment.startDate,
    repayment.endDate,
    repayment.interval,
  ]);

  const handleCreateRepaymentPlan = () => {
    if (!repayment.name || !repayment.totalAmount || !repayment.periodAmount) return;
    const periodAmt = Number(repayment.periodAmount);
    if (!periodAmt || periodAmt <= 0) return;

    const step = repayment.interval === '2' ? 2 : 1;
    let n: number;
    if (repayment.planMode === 'months') {
      const raw = Math.floor(Number(repayment.planMonths) || 0);
      if (raw < 1) {
        alert('Nhập số kỳ trả từ 1 trở lên.');
        return;
      }
      n = raw;
    } else {
      if (!repayment.endDate) {
        alert('Chọn ngày kết thúc kế hoạch trả nợ.');
        return;
      }
      n = countRepaymentPeriods(
        repayment.startDate,
        repayment.endDate,
        step as 1 | 2
      );
      if (n < 1) {
        alert('Ngày kết thúc phải sau hoặc trùng ngày bắt đầu (còn ít nhất một kỳ trả).');
        return;
      }
    }

    const start = startOfDay(parseISO(repayment.startDate));
    const planLabel =
      repayment.planMode === 'endDate' && repayment.endDate
        ? ` · kế hoạch đến ${format(parseISO(repayment.endDate), 'dd/MM/yyyy')}`
        : ` · ${n} kỳ`;

    // 1. Add the initial borrowing (Income)
    addTransaction({
      type: 'thu',
      amount: Number(repayment.totalAmount),
      category: 'thu-khac',
      date: start.toISOString(),
      note: `Vay từ ${repayment.name}${planLabel}`,
      recurring: 'none',
    });

    // 2. Add each repayment as a dated obligation (no infinite recurring)
    for (let i = 0; i < n; i++) {
      const d = addMonths(start, i * step);
      addTransaction({
        type: 'no',
        amount: periodAmt,
        category: 'khoan-vay',
        date: d.toISOString(),
        note: `Trả nợ ${repayment.name} (kỳ ${i + 1}/${n}${repayment.interval === '2' ? ' · 2 tháng/kỳ' : ''})`,
        recurring: 'none',
      });
    }

    setActiveTool(null);
    alert('Đã thiết lập kế hoạch trả nợ thành công!');
  };

  const calculateSavings = () => {
    const p = Number(savings.monthly);
    const r = Number(savings.interest) / 100 / 12;
    const n = Number(savings.months);

    if (!p || isNaN(r) || !n) return 0;

    // Future Value of an Ordinary Annuity: FV = P * [((1 + r)^n - 1) / r]
    // If interest is paid at the end of each month
    const fv = p * (Math.pow(1 + r, n) - 1) / r;
    return fv * (1 + r); // Assuming contribution at start of month
  };

  const momoCalc = () => {
    const P = Math.max(0, Math.floor(Number(momo.principal) || 0));
    const n = Math.max(1, Math.min(60, Math.floor(Number(momo.months) || 0)));
    if (!P) return null;
    const phiMoiKy = Math.round((P * 3) / 100);
    const tongPhiUoc = phiMoiKy * n;
    const totalGocVaPhi = P + tongPhiUoc;
    const merge = Math.max(0, Math.floor(Number(momo.mergeKy1Vitragop) || 0));
    const gocParts = splitEqualInstallments(P, n);
    const schedule = gocParts.map((g, i) => g + phiMoiKy + (i === 0 ? merge : 0));
    const phiParts = Array.from({ length: n }, () => phiMoiKy);
    const gocKy1 = gocParts[0] ?? 0;
    const thucTeKy1 = schedule[0] ?? 0;
    const chenhKy1 = thucTeKy1 - gocKy1 - (merge > 0 ? merge : 0);
    return {
      principal: P,
      months: n,
      totalGocVaPhi,
      tongPhiUoc,
      phiMoiKy,
      merge,
      schedule,
      gocParts,
      phiParts,
      gocKy1,
      thucTeKy1,
      chenhKy1,
    };
  };

  return (
    <div className="space-y-6">
      <div className="px-2">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Công cụ tài chính</h1>
        <p className="text-xs text-slate-400 font-medium">Lập kế hoạch và dự báo tương lai</p>
      </div>

      {!activeTool ? (
        <div className="grid grid-cols-1 gap-4 px-2">
          <ToolCard 
            onClick={() => setActiveTool('repayment')}
            icon={<CreditCard className="text-red-500" />}
            title="Kế hoạch trả nợ"
            description="Tính toán năng lực trả góp và dự báo biến động số dư."
          />
          <ToolCard 
            onClick={() => setActiveTool('savings')}
            icon={<PiggyBank className="text-emerald-500" />}
            title="Dự báo tiết kiệm"
            description="Tính toán số tiền nhận được sau một khoảng thời gian gửi tiết kiệm."
          />
          <ToolCard 
            onClick={() => setActiveTool('momo')}
            icon={<Wallet className="text-pink-500" />}
            title="Tính phí trả góp Momo"
            description="3% × gốc cộng vào mỗi kỳ (gốc ÷ n + phí cố định mỗi tháng)."
          />
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-card-dark p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm mx-2"
        >
          <button 
            onClick={() => setActiveTool(null)}
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"
          >
            <ArrowRight className="rotate-180 mr-1" size={12} /> Quay lại
          </button>

          {activeTool === 'repayment' ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                  <CreditCard className="text-red-500" size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">Kế hoạch trả nợ</h2>
              </div>

              <div className="space-y-4">
                <InputGroup 
                  label="Tên khoản vay / Người cho vay"
                  value={repayment.name}
                  onChange={v => setRepayment({...repayment, name: v})}
                  placeholder="VD: Anh A"
                />
                <InputGroup 
                  label="Tổng số tiền vay (VNĐ)"
                  value={repayment.totalAmount}
                  onChange={v => setRepayment({...repayment, totalAmount: v})}
                  type="number"
                />
                <InputGroup 
                  label="Số tiền trả mỗi kỳ (VNĐ)"
                  value={repayment.periodAmount}
                  onChange={v => setRepayment({...repayment, periodAmount: v})}
                  type="number"
                />
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Chu kỳ trả</label>
                  <select 
                    value={repayment.interval}
                    onChange={e => setRepayment({...repayment, interval: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-[20px] py-4 px-6 text-sm font-bold text-slate-800 dark:text-white"
                  >
                    <option value="1">Mỗi tháng</option>
                    <option value="2">Mỗi 2 tháng</option>
                  </select>
                </div>
                <InputGroup 
                  label="Ngày bắt đầu (kỳ 1)"
                  value={repayment.startDate}
                  onChange={v => setRepayment({...repayment, startDate: v})}
                  type="date"
                />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Phạm vi kế hoạch trả
                  </label>
                  <div className="flex rounded-[20px] bg-slate-50 dark:bg-slate-900 p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setRepayment({ ...repayment, planMode: 'months' })}
                      className={`flex-1 py-3 rounded-[16px] text-xs font-black transition-colors ${
                        repayment.planMode === 'months'
                          ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      Số kỳ
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepayment({ ...repayment, planMode: 'endDate' })}
                      className={`flex-1 py-3 rounded-[16px] text-xs font-black transition-colors ${
                        repayment.planMode === 'endDate'
                          ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      Ngày kết thúc
                    </button>
                  </div>
                </div>
                {repayment.planMode === 'months' ? (
                  <InputGroup
                    label="Số kỳ trả (số lần thanh toán)"
                    value={repayment.planMonths}
                    onChange={(v) => setRepayment({ ...repayment, planMonths: v })}
                    type="number"
                  />
                ) : (
                  <InputGroup
                    label="Ngày kỳ trả cuối cùng"
                    value={repayment.endDate}
                    onChange={(v) => setRepayment({ ...repayment, endDate: v })}
                    type="date"
                  />
                )}
                {repaymentPeriodCount > 0 && (
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2">
                    → Tạo <strong className="text-slate-700 dark:text-slate-200">{repaymentPeriodCount}</strong> kỳ trả
                    nợ (mỗi kỳ {formatCurrency(Number(repayment.periodAmount) || 0)}).
                  </p>
                )}
              </div>

              <button 
                onClick={handleCreateRepaymentPlan}
                className="w-full bg-red-500 text-white py-4 rounded-[24px] font-black flex items-center justify-center space-x-2 shadow-lg shadow-red-100 dark:shadow-none"
              >
                <Check size={20} />
                <span>Thiết lập kế hoạch</span>
              </button>
            </div>
          ) : activeTool === 'momo' ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center">
                  <Wallet className="text-pink-500" size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">Tính trả góp Momo</h2>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Momo chỉ có một quy tắc phí chuyển đổi: <strong className="text-slate-700 dark:text-slate-200">3% × tổng gốc</strong>{' '}
                cần quy đổi, làm tròn — số đó được <strong className="text-slate-700 dark:text-slate-200">cộng vào mỗi kỳ</strong> trả góp (
                <strong className="text-slate-700 dark:text-slate-200">không</strong> phải lấy 3% tổng rồi chia đều cho n tháng). Mỗi kỳ ≈{' '}
                <strong className="text-slate-700 dark:text-slate-200">(gốc ÷ n)</strong> + <strong className="text-slate-700 dark:text-slate-200">phí mỗi kỳ</strong>.
                Nhập <strong className="text-slate-700 dark:text-slate-200">gốc</strong> (số tiền quy đổi trước phí). Gộp ví trả góp kỳ 1: ô dưới.
              </p>

              <div className="space-y-4">
                <InputGroup
                  label="Số tiền chuyển trả góp (gốc, VNĐ)"
                  value={momo.principal}
                  onChange={(v) => setMomo({ ...momo, principal: v })}
                  type="number"
                />
                <InputGroup
                  label="Số tháng"
                  value={momo.months}
                  onChange={(v) => setMomo({ ...momo, months: v })}
                  type="number"
                />
                <InputGroup
                  label="Gộp kỳ 1 — ví trả góp cùng tháng (VNĐ, tuỳ chọn)"
                  value={momo.mergeKy1Vitragop}
                  onChange={(v) => setMomo({ ...momo, mergeKy1Vitragop: v })}
                  type="number"
                />
              </div>

              {(() => {
                const r = momoCalc();
                if (!r) {
                  return (
                    <p className="text-center text-sm text-slate-400 py-4">
                      Nhập số tiền gốc để xem lịch các kỳ.
                    </p>
                  );
                }
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4">
                        <p className="text-[9px] font-black uppercase text-slate-400">Tổng trả (gốc + n × phí kỳ)</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white mt-1">
                          {formatCurrency(r.totalGocVaPhi)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4">
                        <p className="text-[9px] font-black uppercase text-slate-400">Tổng phí (n × 3%×gốc)</p>
                        <p className="text-lg font-black text-pink-600 dark:text-pink-400 mt-1">
                          {formatCurrency(r.tongPhiUoc)}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-pink-100 dark:border-pink-900/40 bg-pink-50/50 dark:bg-pink-950/20 p-4 space-y-2">
                      <p className="text-[9px] font-black uppercase text-pink-700 dark:text-pink-300 tracking-widest">
                        Phí mỗi kỳ = 3% × gốc (làm tròn)
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                        <span className="text-slate-500 dark:text-slate-400">Phí cố định mỗi tháng</span>
                        <span className="text-right text-pink-600 dark:text-pink-400">
                          {formatCurrency(r.phiMoiKy)}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">Gốc kỳ 1 (chia đều gốc)</span>
                        <span className="text-right">{formatCurrency(r.gocKy1)}</span>
                        <span className="text-slate-500 dark:text-slate-400">Tổng kỳ 1 (gốc + phí{r.merge > 0 ? ' + ví' : ''})</span>
                        <span className="text-right">{formatCurrency(r.thucTeKy1)}</span>
                        <span className="text-slate-500 dark:text-slate-400">Chênh kỳ 1 vs chỉ gốc</span>
                        <span className="text-right text-pink-600 dark:text-pink-400">
                          {formatCurrency(r.chenhKy1)}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-slate-100 dark:border-slate-800 overflow-hidden">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3 bg-slate-50/80 dark:bg-slate-900/40">
                        Từng kỳ: gốc (chia đều) + phí 3%×gốc mỗi kỳ
                      </p>
                      <ul className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {r.schedule.map((amt, i) => (
                          <li
                            key={i}
                            className="flex flex-col gap-0.5 px-4 py-3 text-sm"
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="font-bold text-slate-600 dark:text-slate-300">
                                Kỳ {i + 1}/{r.months}
                                {i === 0 && r.merge > 0 && (
                                  <span className="ml-1 text-[10px] font-medium text-pink-600 dark:text-pink-400">
                                    (gồm ví trả góp)
                                  </span>
                                )}
                              </span>
                              <span className="font-black text-slate-900 dark:text-white">
                                {formatCurrency(amt)}
                              </span>
                            </div>
                            <p className="text-[10px] font-medium text-slate-400 pl-0">
                              gốc {formatCurrency(r.gocParts[i] ?? 0)} · + phí {formatCurrency(r.phiParts[i] ?? 0)}
                              {i === 0 && r.merge > 0 && (
                                <> · ví +{formatCurrency(r.merge)}</>
                              )}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Ví dụ gói T2/2026</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Gốc <strong className="text-slate-800 dark:text-slate-200">2.046.847đ</strong> · 9 tháng → gốc kỳ ~{' '}
                        <strong className="text-slate-800 dark:text-slate-200">227.427đ</strong>, phí mỗi kỳ = round(3% × gốc) ≈{' '}
                        <strong className="text-slate-800 dark:text-slate-200">61.405đ</strong> → mỗi kỳ ≈{' '}
                        <strong className="text-slate-800 dark:text-slate-200">288.832đ</strong> (khớp ~288.834đ trên app). Tổng trả ≈{' '}
                        <strong className="text-slate-800 dark:text-slate-200">2.599.496đ</strong> (gốc + 9 × phí kỳ).
                      </p>
                    </div>
                    <div className="flex items-start space-x-2 text-left rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 p-4 border border-amber-100 dark:border-amber-900/40">
                      <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-900/80 dark:text-amber-200/90 font-medium leading-relaxed">
                        Làm tròn từng kỳ trên app có thể lệch vài đồng. Đối chiếu bằng màn hình &quot;tổng tiền chuyển đổi&quot; / sao kê Momo.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
                  <PiggyBank className="text-emerald-500" size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">Dự báo tiết kiệm</h2>
              </div>

              <div className="space-y-4">
                <InputGroup 
                  label="Tiết kiệm mỗi tháng (VNĐ)"
                  value={savings.monthly}
                  onChange={v => setSavings({...savings, monthly: v})}
                  type="number"
                />
                <InputGroup 
                  label="Lãi suất năm (%)"
                  value={savings.interest}
                  onChange={v => setSavings({...savings, interest: v})}
                  type="number"
                />
                <InputGroup 
                  label="Thời gian gửi (tháng)"
                  value={savings.months}
                  onChange={v => setSavings({...savings, months: v})}
                  type="number"
                />
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 text-center">
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Tổng tiền sau {savings.months} tháng</p>
                <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(calculateSavings())}
                </p>
                <div className="mt-4 flex items-start space-x-2 text-left">
                  <Info size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">
                    Tính toán dựa trên lãi suất kép, đóng tiền vào đầu mỗi tháng. Kết quả chỉ mang tính chất tham khảo.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function ToolCard({ onClick, icon, title, description }: { onClick: () => void, icon: React.ReactNode, title: string, description: string }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white dark:bg-card-dark p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center space-x-4 text-left hover:border-emerald-500 transition-all group"
    >
      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-black text-slate-800 dark:text-white">{title}</h3>
        <p className="text-xs text-slate-400 font-medium leading-relaxed">{description}</p>
      </div>
      <ArrowRight size={18} className="text-slate-200 group-hover:text-emerald-500 transition-colors" />
    </button>
  );
}

function InputGroup({ label, value, onChange, type = 'text', placeholder }: { label: string, value: string, onChange: (v: string) => void, type?: string, placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-[20px] py-4 px-6 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
      />
    </div>
  );
}
