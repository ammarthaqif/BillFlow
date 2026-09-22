import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Sparkles, 
  Calendar, 
  Clock, 
  CreditCard, 
  Wallet, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  ShieldCheck, 
  TrendingUp, 
  Coins, 
  Flame, 
  Droplets, 
  Wifi, 
  Smartphone, 
  Home, 
  Receipt, 
  Check,
  Percent,
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  BillAccount, 
  UtilityBillItem, 
  UserSettings, 
  ExpenseCategory, 
  ExpenseItem, 
  CurrencyCode 
} from '../types';
import { formatCurrency } from '../utils/currency';
import { analyzeAllUtilityBills } from '../utils/utilityAdvisor';
import { getTodayDateStr } from '../utils/timezone';

interface UtilityBillOptimizerProps {
  bills: UtilityBillItem[];
  accounts: BillAccount[];
  settings: UserSettings;
  activeCurrency: CurrencyCode | string;
  onAddBill: (bill: Omit<UtilityBillItem, 'id' | 'createdAt'>) => void;
  onUpdateBill: (bill: UtilityBillItem) => void;
  onDeleteBill: (id: string) => void;
  onExecuteBillPayment: (
    bill: UtilityBillItem,
    targetAccountId: string,
    targetAccountName: string,
    paidAmount: number
  ) => void;
  onAddExpense?: (expense: Omit<ExpenseItem, 'id'>) => void;
}

// Popular 1-Click Malaysian & Regional Utility Presets
const UTILITY_PRESETS: Array<{
  name: string;
  category: ExpenseCategory;
  defaultAmount: number;
  billerCode?: string;
  icon: any;
  notes: string;
}> = [
  {
    name: 'Tenaga Nasional Berhad (TNB)',
    category: 'Utilities (Electricity, Water, IWK)',
    defaultAmount: 180.0,
    billerCode: '5454',
    icon: Zap,
    notes: 'Monthly residential electricity bill.',
  },
  {
    name: 'Air Selangor Water Supply',
    category: 'Utilities (Electricity, Water, IWK)',
    defaultAmount: 35.0,
    billerCode: '4200',
    icon: Droplets,
    notes: 'Domestic clean water supply charges.',
  },
  {
    name: 'TM Unifi Home Fiber',
    category: 'Internet & Broadband',
    defaultAmount: 139.0,
    billerCode: '2222',
    icon: Wifi,
    notes: 'High speed fiber broadband.',
  },
  {
    name: 'Maxis Postpaid 5G',
    category: 'Phone & Mobile',
    defaultAmount: 128.0,
    billerCode: '1122',
    icon: Smartphone,
    notes: 'Mobile telephone & data line.',
  },
  {
    name: 'CelcomDigi Postpaid',
    category: 'Phone & Mobile',
    defaultAmount: 110.0,
    billerCode: '2828',
    icon: Smartphone,
    notes: 'Primary mobile postpaid subscription.',
  },
  {
    name: 'Indah Water Konsortium (IWK)',
    category: 'Utilities (Electricity, Water, IWK)',
    defaultAmount: 32.0,
    billerCode: '8888',
    icon: Home,
    notes: 'Bi-monthly sewerage sanitization service.',
  },
  {
    name: 'Gas Malaysia Energy',
    category: 'Home & Utilities',
    defaultAmount: 45.0,
    billerCode: '3321',
    icon: Flame,
    notes: 'Piped residential natural gas supply.',
  },
];

export function UtilityBillOptimizer({
  bills,
  accounts,
  settings,
  activeCurrency,
  onAddBill,
  onUpdateBill,
  onDeleteBill,
  onExecuteBillPayment,
}: UtilityBillOptimizerProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'paid' | 'urgent'>('pending');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<UtilityBillItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmPayBill, setConfirmPayBill] = useState<{
    bill: UtilityBillItem;
    accountId: string;
    accountName: string;
    amount: number;
    floatDays: number;
    benefitTitle: string;
  } | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Utilities (Electricity, Water, IWK)');
  const [formAmount, setFormAmount] = useState('150.00');
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [formAccountNo, setFormAccountNo] = useState('');
  const [formBillerCode, setFormBillerCode] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Analyze all bills with the intelligent advisor
  const analysis = useMemo(() => {
    return analyzeAllUtilityBills(bills, accounts, settings, settings.timezone);
  }, [bills, accounts, settings]);

  const { recommendations, summary } = analysis;

  // Filtered bills
  const filteredList = useMemo(() => {
    return recommendations.filter((rec, idx) => {
      const b = bills[idx];
      if (!b) return false;
      if (filterMode === 'all') return true;
      if (filterMode === 'paid') return b.status === 'paid';
      if (filterMode === 'pending') return b.status !== 'paid';
      if (filterMode === 'urgent') return b.status !== 'paid' && rec.daysRemaining <= 7;
      return true;
    });
  }, [recommendations, bills, filterMode]);

  const handleOpenAddModal = (preset?: typeof UTILITY_PRESETS[0]) => {
    if (preset) {
      setFormName(preset.name);
      setFormCategory(preset.category);
      setFormAmount(preset.defaultAmount.toString());
      setFormBillerCode(preset.billerCode || '');
      setFormNotes(preset.notes);
    } else {
      setFormName('');
      setFormCategory('Utilities (Electricity, Water, IWK)');
      setFormAmount('150.00');
      setFormBillerCode('');
      setFormNotes('');
    }
    setFormAccountNo('');
    const d = new Date();
    d.setDate(d.getDate() + 12);
    setFormDueDate(d.toISOString().split('T')[0]);
    setEditingBill(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (bill: UtilityBillItem) => {
    setEditingBill(bill);
    setFormName(bill.billerName);
    setFormCategory(bill.category);
    setFormAmount(bill.amount.toString());
    setFormDueDate(bill.dueDate);
    setFormAccountNo(bill.accountNumber || '');
    setFormBillerCode(bill.jompayBillerCode || '');
    setFormNotes(bill.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(formAmount);
    if (!formName.trim() || isNaN(amountVal) || amountVal <= 0 || !formDueDate) {
      return;
    }

    if (editingBill) {
      onUpdateBill({
        ...editingBill,
        billerName: formName.trim(),
        category: formCategory,
        amount: amountVal,
        dueDate: formDueDate,
        accountNumber: formAccountNo.trim() || undefined,
        jompayBillerCode: formBillerCode.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    } else {
      onAddBill({
        billerName: formName.trim(),
        category: formCategory,
        amount: amountVal,
        dueDate: formDueDate,
        accountNumber: formAccountNo.trim() || undefined,
        jompayBillerCode: formBillerCode.trim() || undefined,
        status: 'pending',
        notes: formNotes.trim() || undefined,
      });
    }

    setIsAddModalOpen(false);
  };

  const handleCopyDetails = (billerName: string, billerCode?: string, accNo?: string, id?: string) => {
    const text = `Biller: ${billerName}\nJomPAY Biller Code: ${billerCode || 'N/A'}\nRef-1: ${accNo || 'N/A'}`;
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleConfirmPay = () => {
    if (!confirmPayBill) return;
    onExecuteBillPayment(
      confirmPayBill.bill,
      confirmPayBill.accountId,
      confirmPayBill.accountName,
      confirmPayBill.amount
    );
    setConfirmPayBill(null);
  };

  const renderAccountIcon = (type: string, color: string) => {
    if (type === 'ewallet_pay_later') {
      return <Wallet className="w-4 h-4 text-orange-400" />;
    }
    if (type === 'bank_account') {
      return <Building2 className="w-4 h-4 text-emerald-400" />;
    }
    return <CreditCard className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Utility Bills & Float Strategizer
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Interest-Free Max
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Input your upcoming monthly utility bills. The system automatically routes each bill to the optimal credit card or SPayLater account, timing your payment to maximize reward points, cashback rebates, and up to <strong>55 days of free float</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Utility Bill</span>
            </button>
          </div>
        </div>

        {/* 1-Click Preset Quick-Add Pills */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Receipt className="w-3.5 h-3.5 text-indigo-400" />
            Quick Presets:
          </span>
          {UTILITY_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleOpenAddModal(preset)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <preset.icon className="w-3 h-3 text-indigo-400" />
              <span>{preset.name.split('(')[0].trim()}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatCurrency(preset.defaultAmount, activeCurrency)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Performance Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monthly Bills */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Upcoming Utility Bills</span>
            <Receipt className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-white font-mono">
            {formatCurrency(summary.pendingBillsAmount, activeCurrency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <span>{summary.pendingCount} bills pending</span>
            {summary.paidCount > 0 && (
              <span className="text-emerald-400 font-medium">({summary.paidCount} paid)</span>
            )}
          </div>
        </div>

        {/* Average Float Duration */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Average Free Float</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-cyan-400 font-mono">
            {summary.averageFloatDays} Days
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            vs 0 days on direct debit/cash
          </div>
        </div>

        {/* Projected Cashback & Rewards */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Rebates & Perks</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-400 font-mono">
            +{formatCurrency(summary.totalProjectedRewards, activeCurrency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Cashback, Coins & Reward multipliers
          </div>
        </div>

        {/* Total Financial Advantage */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-medium">
            <span>Total Value Gained</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-400 font-mono">
            +{formatCurrency(summary.totalFinancialAdvantage, activeCurrency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-300">
            Perks + High-yield bank float interest
          </div>
        </div>
      </div>

      {/* Filter Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterMode === 'pending'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending Optimization ({summary.pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('urgent')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterMode === 'urgent'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Due Soon (&lt; 7 Days)
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterMode === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Bills ({bills.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('paid')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterMode === 'paid'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Paid ({summary.paidCount})
          </button>
        </div>

        {/* Optimal Schedule Quick Summary */}
        {summary.optimalPaymentSchedule.length > 0 && (
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Next recommended payment:</span>
            <span className="font-semibold text-white">
              {summary.optimalPaymentSchedule[0].billName}
            </span>
            <span className="text-indigo-400 font-mono">
              ({summary.optimalPaymentSchedule[0].date})
            </span>
          </div>
        )}
      </div>

      {/* Bill List Cards */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-3">
          <Receipt className="w-12 h-12 mx-auto text-slate-600" />
          <div className="text-base font-semibold text-slate-300">
            {filterMode === 'paid' ? 'No paid utility bills yet' : 'No utility bills matching this filter'}
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click &ldquo;Add Utility Bill&rdquo; or pick one of the quick presets above to calculate optimal credit card and SPayLater routing.
          </p>
          <button
            type="button"
            onClick={() => handleOpenAddModal(UTILITY_PRESETS[0])}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add TNB Electricity Bill
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((rec) => {
            const bill = bills.find((b) => b.id === rec.billId);
            if (!bill) return null;
            const isPaid = bill.status === 'paid';

            return (
              <div
                key={bill.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isPaid
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-80'
                    : rec.daysRemaining < 0
                    ? 'bg-slate-900 border-rose-500/40 shadow-rose-950/20'
                    : rec.daysRemaining <= 3
                    ? 'bg-slate-900 border-amber-500/40'
                    : 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700/80 shadow-lg'
                }`}
              >
                {/* Header Row: Bill Info + Amount + Status */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-white">{bill.billerName}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {bill.category}
                      </span>
                      {isPaid ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Paid via {bill.paidAccountName || 'Card'}
                        </span>
                      ) : rec.daysRemaining < 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                          {Math.abs(rec.daysRemaining)}d Overdue
                        </span>
                      ) : rec.daysRemaining === 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                          Due Today
                        </span>
                      ) : rec.daysRemaining <= 3 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Due in {rec.daysRemaining}d
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          Due in {rec.daysRemaining}d
                        </span>
                      )}
                    </div>

                    {/* Reference Details */}
                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <span>
                        Bill Due: <strong className="text-slate-200">{bill.dueDate}</strong>
                      </span>
                      {bill.jompayBillerCode && (
                        <span>
                          JomPAY Code: <strong className="text-indigo-400 font-mono">{bill.jompayBillerCode}</strong>
                        </span>
                      )}
                      {bill.accountNumber && (
                        <span>
                          Ref / Acc No: <strong className="text-slate-300 font-mono">{bill.accountNumber}</strong>
                        </span>
                      )}
                      {bill.notes && (
                        <span className="text-slate-400 italic">
                          &ldquo;{bill.notes}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount and Top Actions */}
                  <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2">
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-white">
                        {formatCurrency(bill.amount, activeCurrency)}
                      </div>
                      <div className="text-[10px] text-slate-400">Monthly Statement</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyDetails(bill.billerName, bill.jompayBillerCode, bill.accountNumber, bill.id)}
                        title="Copy JomPAY Details"
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedId === bill.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(bill)}
                        title="Edit Bill"
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBill(bill.id)}
                        title="Delete Bill"
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ADVISOR RECOMMENDATION CARD */}
                {!isPaid && (
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-indigo-950/30 border border-indigo-500/30 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Recommended Account Badge */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0"
                          style={{ backgroundColor: rec.recommendedAccountColor || '#4f46e5' }}
                        >
                          {renderAccountIcon(rec.recommendedAccountType, rec.recommendedAccountColor)}
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            <span>Recommended Payment Method</span>
                          </div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{rec.recommendedAccountName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                              {rec.recommendedAccountType === 'ewallet_pay_later'
                                ? 'Pay Later E-Wallet'
                                : 'Credit Card'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pay & Settle Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmPayBill({
                            bill,
                            accountId: rec.recommendedAccountId,
                            accountName: rec.recommendedAccountName,
                            amount: bill.amount,
                            floatDays: rec.floatDaysGained,
                            benefitTitle: rec.projectedBenefit.unitDescription,
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <span>Pay via {rec.recommendedAccountName.split('(')[0].trim()}</span>
                      </button>
                    </div>

                    {/* 3 Value Pillars: Optimal Date, Free Float, Benefits */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
                      {/* Optimal Date */}
                      <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          <span>Optimal Payment Day</span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-white">
                          {rec.recommendedPayDayOfWeek}, {rec.recommendedPayDate}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Safely scheduled prior to bill due date
                        </div>
                      </div>

                      {/* Float Days */}
                      <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>Interest-Free Float</span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-cyan-400 font-mono">
                          {rec.floatDaysGained} Days Float
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Due on card bill: {rec.statementDueDate}
                        </div>
                      </div>

                      {/* Benefits & Cashback */}
                      <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-400" />
                          <span>Projected Benefit</span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-amber-400">
                          {rec.projectedBenefit.unitDescription}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          +{formatCurrency(rec.totalAdvantageValue, activeCurrency)} advantage value
                        </div>
                      </div>
                    </div>

                    {/* Explanatory Reasons */}
                    <div className="space-y-1 text-xs text-slate-300">
                      {rec.reasons.map((r, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>

                    {/* Runner-Up & Acceptance Tips */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{rec.acceptanceTips}</span>
                      </div>

                      {rec.runnerUp && (
                        <div className="text-[11px] text-slate-400 shrink-0">
                          <span className="text-slate-400">Fallback: </span>
                          <strong className="text-slate-200">{rec.runnerUp.accountName}</strong>{' '}
                          <span className="text-slate-400">({rec.runnerUp.reason})</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Bill Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingBill ? 'Edit Utility Bill' : 'Add Upcoming Utility Bill'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Input your bill details to evaluate the best payment card or SPayLater account.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Biller / Utility Provider Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Tenaga Nasional Berhad (TNB), Air Selangor, Unifi"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Bill Amount ({activeCurrency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="180.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Bill Due Date for Payment *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Utilities (Electricity, Water, IWK)">Utilities (Electricity, Water, IWK)</option>
                    <option value="Internet & Broadband">Internet & Broadband</option>
                    <option value="Phone & Mobile">Phone & Mobile</option>
                    <option value="Home & Utilities">Home & Utilities</option>
                    <option value="Entertainment & Streaming">Entertainment & Streaming</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    JomPAY Biller Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formBillerCode}
                    onChange={(e) => setFormBillerCode(e.target.value)}
                    placeholder="e.g. 5454 (TNB)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Account No / JomPAY Ref-1 (Optional)
                </label>
                <input
                  type="text"
                  value={formAccountNo}
                  onChange={(e) => setFormAccountNo(e.target.value)}
                  placeholder="e.g. 2201 9840 1192"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Monthly landed terrace home electricity"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  {editingBill ? 'Save Changes' : 'Add Bill & Optimize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlement Execution Confirmation Dialog */}
      {confirmPayBill && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Execute Bill Payment</h3>
                <p className="text-xs text-slate-400">
                  Confirm routing this bill payment through your optimal card.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Utility Bill:</span>
                <span className="font-bold text-white">{confirmPayBill.bill.billerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-mono font-bold text-white">
                  {formatCurrency(confirmPayBill.amount, activeCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Charging to:</span>
                <span className="font-bold text-indigo-400">{confirmPayBill.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Interest-Free Float:</span>
                <span className="font-bold text-cyan-400 font-mono">
                  {confirmPayBill.floatDays} Days Free
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reward Earned:</span>
                <span className="font-bold text-amber-400">
                  {confirmPayBill.benefitTitle}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              This action will record an expense charged to <strong>{confirmPayBill.accountName}</strong>, mark this utility bill as paid, and update your monthly reward progress.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmPayBill(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPay}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Mark as Paid</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
