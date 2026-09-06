import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle, 
  TrendingUp, 
  DollarSign, 
  Sparkles,
  PieChart,
  ArrowUpRight
} from 'lucide-react';
import { BillAccount, InstallmentPlan, MonthlyCashFlowProjection } from '../types';

interface InstallmentsCashFlowTrackerProps {
  accounts: BillAccount[];
  installments: InstallmentPlan[];
  projections: MonthlyCashFlowProjection[];
  onAddInstallment: (plan: Omit<InstallmentPlan, 'id'>) => void;
  onDeleteInstallment: (id: string) => void;
}

export const InstallmentsCashFlowTracker: React.FC<InstallmentsCashFlowTrackerProps> = ({
  accounts,
  installments,
  projections,
  onAddInstallment,
  onDeleteInstallment,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [category, setCategory] = useState<InstallmentPlan['category']>('Electronics');
  const [totalAmount, setTotalAmount] = useState<number>(600);
  const [totalTenure, setTotalTenure] = useState<number>(6);
  const [remainingTenure, setRemainingTenure] = useState<number>(6);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const monthlyAmount = totalTenure > 0 ? Math.round((totalAmount / totalTenure) * 100) / 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !accountId) return;

    const targetAccount = accounts.find((a) => a.id === accountId);

    onAddInstallment({
      accountId,
      accountName: targetAccount ? targetAccount.name : 'Unknown Card',
      title,
      category,
      totalAmount,
      monthlyAmount,
      totalTenure,
      remainingTenure,
      interestRate,
      startDate: new Date().toISOString().split('T')[0],
      nextBillingDate: targetAccount ? targetAccount.dueDate : '2026-10-15',
      notes,
    });

    // Reset & close
    setTitle('');
    setShowAddModal(false);
  };

  const categories: InstallmentPlan['category'][] = [
    'Electronics',
    'Home & Office',
    'Travel',
    'Fashion',
    'Medical',
    'Groceries',
    'Other',
  ];

  const filteredInstallments =
    selectedCategory === 'all'
      ? installments
      : installments.filter((i) => i.category === selectedCategory);

  const totalMonthlyCommitment = installments.reduce((sum, i) => sum + i.monthlyAmount, 0);
  const totalInstallmentDebt = installments.reduce((sum, i) => sum + i.monthlyAmount * i.remainingTenure, 0);

  // Highest installment commitment month
  const maxCommitment = Math.max(...projections.map((p) => p.installmentCommitment + p.revolvingBillsDue), 1);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Multi-Month Installments & Cash Flow Impact
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Capture 0% BNPL and credit card installment plans to visualize their multi-month drain on monthly disposable income.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            id="btn-add-installment"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Installment Plan</span>
          </button>
        </div>
      </div>

      {/* 2-Column: Left (Visual Chart of Monthly Cash Flow Impact) | Right (Installments List) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Projection Chart for 6 Months (7 cols) */}
        <div className="lg:col-span-7 bg-slate-800/40 rounded-xl border border-slate-700/60 p-4 sm:p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Monthly Cash Flow Trajectory (Next 6 Months)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Watch installment commitments decline as plans mature, freeing up cash flow.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span className="text-slate-300 text-[11px]">Installments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-indigo-500/60" />
                <span className="text-slate-300 text-[11px]">Revolving Bills</span>
              </div>
            </div>
          </div>

          {/* Interactive Visual Bar Chart */}
          <div className="space-y-3 pt-2">
            {projections.map((proj, idx) => {
              const installmentWidth = (proj.installmentCommitment / maxCommitment) * 100;
              const revolvingWidth = (proj.revolvingBillsDue / maxCommitment) * 100;
              const totalCommitted = proj.installmentCommitment + proj.revolvingBillsDue;

              return (
                <div key={proj.monthKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{proj.monthLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-300 font-medium">
                        ${proj.installmentCommitment.toFixed(0)} BNPL
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">Total Due: ${totalCommitted.toFixed(0)}</span>
                      <span className="text-emerald-400 font-medium text-[11px] hidden sm:inline">
                        (Remaining: ${proj.discretionaryRemaining.toFixed(0)})
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Stacked Bar */}
                  <div className="h-4 bg-slate-900 rounded-lg overflow-hidden flex p-0.5 border border-slate-700/50">
                    {/* Installments Segment */}
                    <div
                      className="bg-purple-500 rounded-l-md h-full transition-all duration-500 relative group"
                      style={{ width: `${installmentWidth}%` }}
                      title={`Installments: $${proj.installmentCommitment.toFixed(2)}`}
                    />
                    {/* Revolving Bills Segment */}
                    <div
                      className="bg-indigo-500/70 h-full transition-all duration-500"
                      style={{ width: `${revolvingWidth}%` }}
                      title={`Revolving Bills: $${proj.revolvingBillsDue.toFixed(2)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Key Takeaway Banner */}
          <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Cash Flow Unlock Milestone:</span> In <strong>1 month</strong>, your SPayLater plan concludes, instantly releasing <strong>$150.00/mo</strong> back into your free disposable cash flow!
            </div>
          </div>
        </div>

        {/* Right Column: Captured Installment Plans List & Filter (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Plans ({filteredInstallments.length})
            </div>
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-slate-800 text-slate-300 rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Cards List */}
          <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
            {filteredInstallments.map((inst) => {
              const tenurePercent = Math.round(
                ((inst.totalTenure - inst.remainingTenure) / inst.totalTenure) * 100
              );

              return (
                <div
                  key={inst.id}
                  className="bg-slate-800/50 rounded-xl border border-slate-700/60 p-3.5 space-y-2.5 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-white">{inst.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="text-indigo-300">{inst.accountName}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-medium border border-purple-500/30">
                          {inst.category}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-purple-400">
                        ${inst.monthlyAmount.toFixed(2)}
                        <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                      </div>
                      <div className="text-[10px] text-emerald-400 font-medium">
                        {inst.interestRate === 0 ? '0% APR Promo' : `${inst.interestRate}% fee`}
                      </div>
                    </div>
                  </div>

                  {/* Tenure Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        Paid: <strong>{inst.totalTenure - inst.remainingTenure}</strong> of {inst.totalTenure} mos
                      </span>
                      <span className="font-semibold text-slate-300">{inst.remainingTenure} months left</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${tenurePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer & Delete */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/50">
                    <span>Next Due: {inst.nextBillingDate}</span>
                    <button
                      onClick={() => onDeleteInstallment(inst.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                      title="Remove Installment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredInstallments.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                No installment plans found in this category.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add New Installment */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
                Capture Multi-Month Installment
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Item / Transaction Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sony WH-1000XM5 Headphones"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Card or E-Wallet</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-purple-500 text-xs"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-purple-500 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Total Cost ($)</label>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tenure (Mos)</label>
                  <input
                    type="number"
                    min="2"
                    max="60"
                    required
                    value={totalTenure}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTotalTenure(val);
                      if (remainingTenure > val) setRemainingTenure(val);
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Remaining (Mos)</label>
                  <input
                    type="number"
                    min="1"
                    max={totalTenure}
                    required
                    value={remainingTenure}
                    onChange={(e) => setRemainingTenure(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>
              </div>

              {/* Calculated Monthly */}
              <div className="bg-purple-950/30 p-3 rounded-lg border border-purple-800/30 flex items-center justify-between text-xs">
                <span className="text-purple-300 font-medium">Calculated Monthly Impact:</span>
                <span className="text-sm font-bold text-white">${monthlyAmount.toFixed(2)}/mo</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                >
                  Save Installment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
