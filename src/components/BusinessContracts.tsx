import React, { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../lib/utils';
import type { BusinessContract } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase,
  Plus,
  Trash2,
  ChevronDown,
  Calendar,
  Users,
  Truck,
  Package,
  Pencil,
  X,
  Info,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { addMonths, format, getDaysInMonth, isBefore, parseISO, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';

function day30OfMonth(year: number, monthIndex: number): Date {
  const dim = getDaysInMonth(new Date(year, monthIndex));
  const day = Math.min(30, dim);
  return new Date(year, monthIndex, day);
}

function firstVanHanhPayment(signedAt: Date): Date {
  const start = startOfDay(signedAt);
  let y = signedAt.getFullYear();
  let m = signedAt.getMonth();
  for (let step = 0; step < 48; step++) {
    const d = day30OfMonth(y, m);
    if (!isBefore(d, start)) return d;
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return day30OfMonth(signedAt.getFullYear(), signedAt.getMonth());
}

function upcomingVanHanhDates(signedAt: Date, count: number): Date[] {
  const first = firstVanHanhPayment(signedAt);
  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    const t = addMonths(first, i);
    out.push(day30OfMonth(t.getFullYear(), t.getMonth()));
  }
  return out;
}

const emptyForm: Omit<BusinessContract, 'id'> = {
  projectName: '',
  signedAt: new Date().toISOString().split('T')[0],
  vanHanhBudgetMonthly: 0,
  vanHanhReceivedFromClient: 0,
  supplierBudget: 0,
  supplierReceivedFromClient: 0,
  tronGoiBudgetTotal: 0,
  tronGoiReceived50Sign: 0,
  tronGoiReceived50Accept: 0,
  nghiemThuAt: null,
  notes: '',
};

function num(n: number | string | undefined): number {
  return Math.max(0, Number(n) || 0);
}

export default function BusinessContracts() {
  const businessContracts = useFinanceStore((s) => s.businessContracts);
  const addBusinessContract = useFinanceStore((s) => s.addBusinessContract);
  const updateBusinessContract = useFinanceStore((s) => s.updateBusinessContract);
  const deleteBusinessContract = useFinanceStore((s) => s.deleteBusinessContract);

  const [showGuide, setShowGuide] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<BusinessContract, 'id'>>(emptyForm);

  const sorted = useMemo(
    () =>
      [...businessContracts].sort(
        (a, b) => parseISO(b.signedAt).getTime() - parseISO(a.signedAt).getTime()
      ),
    [businessContracts]
  );

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (c: BusinessContract) => {
    setEditingId(c.id);
    setForm({
      projectName: c.projectName,
      signedAt: c.signedAt.split('T')[0],
      vanHanhBudgetMonthly: c.vanHanhBudgetMonthly,
      vanHanhReceivedFromClient: c.vanHanhReceivedFromClient,
      supplierBudget: c.supplierBudget,
      supplierReceivedFromClient: c.supplierReceivedFromClient,
      tronGoiBudgetTotal: c.tronGoiBudgetTotal,
      tronGoiReceived50Sign: c.tronGoiReceived50Sign,
      tronGoiReceived50Accept: c.tronGoiReceived50Accept,
      nghiemThuAt: c.nghiemThuAt?.split('T')[0] ?? null,
      notes: c.notes ?? '',
    });
  };

  const save = () => {
    const name = form.projectName.trim();
    if (!name) return;
    const payload: Omit<BusinessContract, 'id'> = {
      ...form,
      projectName: name,
      vanHanhBudgetMonthly: num(form.vanHanhBudgetMonthly),
      vanHanhReceivedFromClient: num(form.vanHanhReceivedFromClient),
      supplierBudget: num(form.supplierBudget),
      supplierReceivedFromClient: num(form.supplierReceivedFromClient),
      tronGoiBudgetTotal: num(form.tronGoiBudgetTotal),
      tronGoiReceived50Sign: num(form.tronGoiReceived50Sign),
      tronGoiReceived50Accept: num(form.tronGoiReceived50Accept),
      nghiemThuAt: form.nghiemThuAt || null,
      notes: form.notes?.trim() || undefined,
    };
    if (editingId) updateBusinessContract(editingId, payload);
    else addBusinessContract(payload);
    setEditingId(null);
    setForm(emptyForm);
  };

  const cancelForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-6">
      <div className="px-2">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Briefcase className="text-emerald-500" size={28} />
          Hợp đồng (business)
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Mỗi dự án: <strong className="text-slate-500 dark:text-slate-300">tiền khách đã chuyển</strong> và{' '}
          <strong className="text-slate-500 dark:text-slate-300">định mức chi</strong> theo HĐ — đối chiếu dòng
          tiền
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowGuide(!showGuide)}
        className="mx-2 flex w-[calc(100%-1rem)] items-center justify-between rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-left dark:border-amber-900/50 dark:bg-amber-950/40"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
          <Info size={16} />
          Cách nhập: thu khách vs định mức chi
        </span>
        <ChevronDown
          size={18}
          className={`text-amber-700 transition-transform dark:text-amber-300 ${showGuide ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-2"
          >
            <div className="space-y-3 rounded-[28px] border border-slate-100 bg-white p-5 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-card-dark dark:text-slate-300">
              <p className="font-black text-slate-800 dark:text-slate-100">
                Hợp đồng ghi hai lớp số liệu — cùng một dự án nhưng vai trò khác nhau:
              </p>
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <ArrowDownLeft className="mt-0.5 shrink-0 text-emerald-500" size={16} />
                  <span>
                    <strong>Tiền khách đã chuyển</strong> — thực tế thu / cọc từ khách theo từng phần (dòng tiền
                    vào).
                  </span>
                </li>
                <li className="flex gap-2">
                  <ArrowUpRight className="mt-0.5 shrink-0 text-rose-500" size={16} />
                  <span>
                    <strong>Định mức chi phải chi</strong> — cam kết trong HĐ cho nhân sự, supplier, trọn gói (kế
                    hoạch chi / phải trả).
                  </span>
                </li>
              </ul>
              <p className="border-t border-slate-100 pt-3 dark:border-slate-700">
                So sánh hai cột giúp thấy <strong>dư / thiếu quỹ</strong> theo từng khoản (ví dụ đã nhận đủ cọc
                supplier chưa, gói trọn gói đã thu đủ hai đợt chưa…).
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-2 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-card-dark">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-800 dark:text-white">
            {editingId ? 'Sửa hợp đồng' : 'Thêm hợp đồng'}
          </h2>
          <div className="flex items-center gap-3">
            {editingId && (
              <button
                type="button"
                onClick={openNew}
                className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
              >
                + Thêm mới
              </button>
            )}
            {(editingId || form.projectName) && (
              <button
                type="button"
                onClick={cancelForm}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >
                <X size={14} /> Hủy
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tên dự án</span>
            <input
              value={form.projectName}
              onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
              placeholder="VD: Landing + Ads — Công ty ABC"
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-900/50"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Ngày ký hợp đồng
            </span>
            <input
              type="date"
              value={form.signedAt}
              onChange={(e) => setForm((f) => ({ ...f, signedAt: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-900/50"
            />
          </label>

          <fieldset className="rounded-[24px] border border-violet-200/80 bg-violet-50/40 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
            <legend className="px-1 text-[11px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
              <Users size={12} className="inline mr-1" />
              Vận hành (nhân sự)
            </legend>
            <p className="mb-3 text-[10px] text-violet-800/80 dark:text-violet-200/80">
              Định mức: chi mỗi tháng (kỳ ngày 30). Thu khách: tổng đã nhận cho khoản vận hành.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Định mức chi / tháng</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.vanHanhBudgetMonthly || ''}
                  onChange={(e) => setForm((f) => ({ ...f, vanHanhBudgetMonthly: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold dark:border-violet-800 dark:bg-slate-900/60"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Khách đã chuyển (VH)
                </span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.vanHanhReceivedFromClient || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vanHanhReceivedFromClient: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold dark:border-violet-800 dark:bg-slate-900/60"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-[24px] border border-sky-200/80 bg-sky-50/40 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
            <legend className="px-1 text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
              <Truck size={12} className="inline mr-1" />
              Supplier (một lần)
            </legend>
            <p className="mb-3 text-[10px] text-sky-800/80 dark:text-sky-200/80">
              Định mức: tổng chi Meta/Google Ads, domain, hosting… Thu khách: đã nhận cho phần này (thường 100% sau
              ký).
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Định mức chi (một lần)</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.supplierBudget || ''}
                  onChange={(e) => setForm((f) => ({ ...f, supplierBudget: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-bold dark:border-sky-800 dark:bg-slate-900/60"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Khách đã chuyển
                </span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.supplierReceivedFromClient || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supplierReceivedFromClient: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-bold dark:border-sky-800 dark:bg-slate-900/60"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-[24px] border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <legend className="px-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <Package size={12} className="inline mr-1" />
              Trọn gói
            </legend>
            <p className="mb-3 text-[10px] text-emerald-800/80 dark:text-emerald-200/80">
              Định mức: tổng gói (50% sau ký + 50% sau NT). Thu khách: nhập riêng từng đợt đã về.
            </p>
            <label className="mb-3 block">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Định mức tổng gói</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={form.tronGoiBudgetTotal || ''}
                onChange={(e) => setForm((f) => ({ ...f, tronGoiBudgetTotal: Number(e.target.value) }))}
                className="mt-1 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold dark:border-emerald-800 dark:bg-slate-900/60"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Khách đã chuyển — sau ký (~50%)
                </span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.tronGoiReceived50Sign || ''}
                  onChange={(e) => setForm((f) => ({ ...f, tronGoiReceived50Sign: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold dark:border-emerald-800 dark:bg-slate-900/60"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Khách đã chuyển — sau nghiệm thu (~50%)
                </span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.tronGoiReceived50Accept || ''}
                  onChange={(e) => setForm((f) => ({ ...f, tronGoiReceived50Accept: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold dark:border-emerald-800 dark:bg-slate-900/60"
                />
              </label>
            </div>
          </fieldset>

          <label className="block">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <Calendar size={12} /> Ngày nghiệm thu (căn đợt 50% còn lại)
            </span>
            <input
              type="date"
              value={form.nghiemThuAt ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, nghiemThuAt: e.target.value || null }))
              }
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-900/50"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ghi chú</span>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Tên khách, điều khoản đặc biệt…"
              className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/50"
            />
          </label>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={save}
            disabled={!form.projectName.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/25 disabled:opacity-40"
          >
            {editingId ? <Pencil size={18} /> : <Plus size={18} />}
            {editingId ? 'Cập nhật' : 'Lưu hợp đồng'}
          </motion.button>
        </div>
      </div>

      <div className="px-2">
        <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">
          Đã chốt ({sorted.length})
        </h2>
        {sorted.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-slate-700">
            Chưa có hợp đồng — thêm dự án đầu tiên phía trên.
          </p>
        ) : (
          <div className="space-y-4">
            {sorted.map((c) => (
              <React.Fragment key={c.id}>
                <ContractCard
                  contract={c}
                  onEdit={() => openEdit(c)}
                  onDelete={() => {
                    if (confirm(`Xóa hợp đồng "${c.projectName}"?`)) deleteBusinessContract(c.id);
                  }}
                />
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DiffHint({ received, budget }: { received: number; budget: number }) {
  if (budget <= 0 && received <= 0) return null;
  const d = received - budget;
  if (Math.abs(d) < 1) {
    return <span className="text-[10px] font-medium text-slate-500">Khớp định mức</span>;
  }
  if (d > 0) {
    return (
      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
        Dư {formatCurrency(d)} so với định mức
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
      Thiếu {formatCurrency(-d)} so với định mức
    </span>
  );
}

function ContractCard({
  contract: c,
  onEdit,
  onDelete,
}: {
  contract: BusinessContract;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const signed = parseISO(c.signedAt);
  const vanHanhPreview = upcomingVanHanhDates(signed, 3);
  const halfBudget = c.tronGoiBudgetTotal / 2;
  const tronGoiReceivedSum = c.tronGoiReceived50Sign + c.tronGoiReceived50Accept;
  const monthsCovered =
    c.vanHanhBudgetMonthly > 0
      ? Math.floor(c.vanHanhReceivedFromClient / c.vanHanhBudgetMonthly)
      : null;

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-card-dark"
    >
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white">{c.projectName}</h3>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              Ký: {format(signed, 'dd/MM/yyyy', { locale: vi })}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Sửa"
            >
              <Pencil size={18} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              aria-label="Xóa"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4 text-xs">
        <div className="rounded-2xl bg-violet-50/80 p-3 dark:bg-violet-950/30">
          <p className="mb-2 flex items-center gap-1 font-bold text-violet-800 dark:text-violet-200">
            <Users size={14} /> Vận hành
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="text-violet-600/90 dark:text-violet-300/90">Định mức chi / tháng</p>
              <p className="font-black text-violet-950 dark:text-violet-50">
                {formatCurrency(c.vanHanhBudgetMonthly)}
              </p>
            </div>
            <div>
              <p className="text-violet-600/90 dark:text-violet-300/90">Khách đã chuyển (VH)</p>
              <p className="font-black text-emerald-700 dark:text-emerald-300">
                {formatCurrency(c.vanHanhReceivedFromClient)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-violet-700/90 dark:text-violet-300/90">
            Kỳ chi gợi ý (ngày 30):{' '}
            {vanHanhPreview.map((d) => format(d, 'dd/MM/yyyy', { locale: vi })).join(' · ')}
          </p>
          {monthsCovered !== null && c.vanHanhBudgetMonthly > 0 && (
            <p className="mt-1 text-[10px] text-slate-500">
              Gợi ý: quỹ VH đủ ~{monthsCovered} tháng theo định mức (ước lượng từ thu ÷ định mức tháng).
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-sky-50/80 p-3 dark:bg-sky-950/30">
          <p className="mb-2 flex items-center gap-1 font-bold text-sky-800 dark:text-sky-200">
            <Truck size={14} /> Supplier
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="text-sky-600/90 dark:text-sky-300/90">Định mức chi</p>
              <p className="font-black text-sky-950 dark:text-sky-50">{formatCurrency(c.supplierBudget)}</p>
            </div>
            <div>
              <p className="text-sky-600/90 dark:text-sky-300/90">Khách đã chuyển</p>
              <p className="font-black text-emerald-700 dark:text-emerald-300">
                {formatCurrency(c.supplierReceivedFromClient)}
              </p>
            </div>
          </div>
          <p className="mt-2">
            <DiffHint received={c.supplierReceivedFromClient} budget={c.supplierBudget} />
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50/80 p-3 dark:bg-emerald-950/30">
          <p className="mb-2 flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-200">
            <Package size={14} /> Trọn gói
          </p>
          <div className="mb-2 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="text-emerald-600/90 dark:text-emerald-300/90">Định mức tổng</p>
              <p className="font-black text-emerald-950 dark:text-emerald-50">
                {formatCurrency(c.tronGoiBudgetTotal)}
              </p>
            </div>
            <div>
              <p className="text-emerald-600/90 dark:text-emerald-300/90">Tổng khách đã chuyển</p>
              <p className="font-black text-emerald-700 dark:text-emerald-300">
                {formatCurrency(tronGoiReceivedSum)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-emerald-200/60 pt-2 text-[11px] dark:border-emerald-800/40">
            <div>
              <p className="text-emerald-600/80">Đ.mức ~50% sau ký</p>
              <p className="font-bold">{formatCurrency(halfBudget)}</p>
              <p className="mt-0.5 text-emerald-700 dark:text-emerald-300">
                Thu: {formatCurrency(c.tronGoiReceived50Sign)}
              </p>
            </div>
            <div>
              <p className="text-emerald-600/80">Đ.mức ~50% sau NT</p>
              <p className="font-bold">{formatCurrency(halfBudget)}</p>
              <p className="mt-0.5 text-emerald-700 dark:text-emerald-300">
                Thu: {formatCurrency(c.tronGoiReceived50Accept)}
              </p>
              {c.nghiemThuAt ? (
                <p className="mt-0.5 text-[10px] text-slate-500">
                  NT: {format(parseISO(c.nghiemThuAt), 'dd/MM/yyyy', { locale: vi })}
                </p>
              ) : (
                <p className="mt-0.5 text-[10px] text-amber-600">Chưa có ngày NT</p>
              )}
            </div>
          </div>
          <p className="mt-2">
            <DiffHint received={tronGoiReceivedSum} budget={c.tronGoiBudgetTotal} />
          </p>
        </div>

        {c.notes && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
            {c.notes}
          </p>
        )}
      </div>
    </motion.div>
  );
}
