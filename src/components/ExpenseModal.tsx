import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  X, 
  Calendar, 
  DollarSign, 
  Building2, 
  Zap, 
  CheckCircle2, 
  Sparkles,
  Info,
  CreditCard,
  Wallet,
  Banknote,
  SplitSquareVertical,
  Layers,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Smartphone,
  Wifi,
  Droplets,
  Tv,
  Film,
  Radio,
  ShoppingBag,
  QrCode,
  Tag,
  Repeat,
  CalendarClock,
  Gift,
  AlertTriangle
} from 'lucide-react';
import { 
  ExpenseItem, 
  BillAccount, 
  ExpenseCategory, 
  SettlementMethod, 
  AccountType,
  PaymentMode,
  RepaymentStructure
} from '../types';
import { CurrencyCode, getCurrencyConfig, formatCurrency } from '../utils/currency';
import { getUpcomingRecurringDates } from '../utils/recurringExpenses';
import { recommendBestCardForPurchase, isDateWeekend } from '../utils/rewardsOptimizer';
import { 
  EXPENSE_CATEGORIES_LIST, 
  SETTLEMENT_METHODS_CONFIG, 
  POPULAR_BILL_PRESETS,
  DayToDayBillPreset,
  getAccountTypeLabel,
  renderAccountIcon,
  getExpenseCategoryIcon,
  calculateInterestSavedEstimate
} from '../utils/accountUtils';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (
    expenseData: Omit<ExpenseItem, 'id'>,
    immediateSettle?: { method: SettlementMethod; sourceAccountId?: string },
    installmentSplit?: { tenure: number; monthlyAmount: number; interestRate?: number }
  ) => void;
  editingExpense?: ExpenseItem | null;
  accounts: BillAccount[];
  expenses?: ExpenseItem[];
  currency?: CurrencyCode;
  initialAccountId?: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  editingExpense,
  accounts = [],
  expenses = [],
  currency = 'MYR',
  initialAccountId,
}) => {
  const currencyConfig = getCurrencyConfig(currency);

  // Form states
  const [title, setTitle] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>('Utilities (Electricity, Water, IWK)');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Monthly Recurring state
  const [isMonthlyRecurring, setIsMonthlyRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState<number>(() => {
    const d = new Date().getDate();
    return d >= 1 && d <= 31 ? d : 1;
  });

  // PROMPT 1: Payment Method State ('credit_card' | 'bnpl' | 'cash' | 'duitnow_qr')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('credit_card');
  const [accountId, setAccountId] = useState('');

  // PROMPT 2: Repayment Structure ('lump_sum' | 'split_months')
  const [repaymentStructure, setRepaymentStructure] = useState<RepaymentStructure>('lump_sum');
  const [splitMonths, setSplitMonths] = useState<number>(3);
  const [splitFeeRate, setSplitFeeRate] = useState<number>(0);

  // Immediate Settlement Toggle (for lump sum credit card / BNPL swipes)
  const [isImmediateSettle, setIsImmediateSettle] = useState(false);
  const [settlementMethod, setSettlementMethod] = useState<SettlementMethod>('instant_fpx');
  const [settledFromAccountId, setSettledFromAccountId] = useState('');

  // Separate accounts by mode
  const creditCardAccounts = (accounts || []).filter((a) => a.type === 'credit_card');
  const bnplAccounts = (accounts || []).filter((a) => a.type === 'ewallet_pay_later');
  const bankAccounts = (accounts || []).filter((a) => a.type === 'bank_account');
  const loanAccounts = (accounts || []).filter((a) => ['personal_loan', 'housing_loan', 'automotive_loan', 'other_loan'].includes(a.type));

  const handleToggleTag = (tag: string) => {
    setTags((prev) => 
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = tagInput.trim();
    if (!clean) return;
    const formatted = clean.startsWith('#') ? clean : `#${clean}`;
    if (!tags.includes(formatted)) {
      setTags((prev) => [...prev, formatted]);
    }
    setTagInput('');
  };

  // Initialize or prefill state
  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title || '');
      setMerchant(editingExpense.merchant || '');
      setAmount(editingExpense.amount ?? '');
      setDate(editingExpense.date || new Date().toISOString().split('T')[0]);
      setCategory(editingExpense.category || 'Other');
      setNotes(editingExpense.notes || '');
      setAccountId(editingExpense.accountId || '');
      setTags(editingExpense.tags || []);

      // Restore payment mode
      if (editingExpense.paymentMode) {
        setPaymentMode(editingExpense.paymentMode);
      } else if (editingExpense.category === 'QR Payment' || editingExpense.settlementMethod === 'duitnow_qr') {
        setPaymentMode('duitnow_qr');
      } else if (editingExpense.accountType === 'credit_card') {
        setPaymentMode('credit_card');
      } else if (editingExpense.accountType === 'ewallet_pay_later') {
        setPaymentMode('bnpl');
      } else {
        setPaymentMode('cash');
      }

      // Restore repayment structure
      if (editingExpense.repaymentStructure) {
        setRepaymentStructure(editingExpense.repaymentStructure);
        setSplitMonths(editingExpense.splitMonths || 3);
        setSplitFeeRate(editingExpense.splitFeeRate ?? 0);
      } else {
        setRepaymentStructure('lump_sum');
        setSplitMonths(3);
        setSplitFeeRate(0);
      }

      setIsImmediateSettle(editingExpense.status === 'settled');
      setSettlementMethod(editingExpense.settlementMethod || 'instant_fpx');
      setSettledFromAccountId(editingExpense.settledFromAccountId || '');

      // Restore recurring state
      setIsMonthlyRecurring(Boolean(editingExpense.isRecurring));
      const parsedDay = editingExpense.recurringDay || (editingExpense.date ? parseInt(editingExpense.date.split('-')[2], 10) : new Date().getDate());
      setRecurringDay(!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31 ? parsedDay : new Date().getDate());
    } else {
      // New expense initial setup
      setTitle('');
      setMerchant('');
      setAmount('');
      const todayStr = new Date().toISOString().split('T')[0];
      setDate(todayStr);
      setCategory('Utilities (Electricity, Water, IWK)');
      setNotes('');
      setTags([]);
      setPaymentMode('credit_card');
      setRepaymentStructure('lump_sum');
      setSplitMonths(3);
      setSplitFeeRate(0);
      setIsImmediateSettle(false);
      setSettlementMethod('instant_fpx');
      setIsMonthlyRecurring(false);
      setRecurringDay(new Date().getDate());

      // Default to initialAccountId if provided, or first credit card, or BNPL, or bank
      if (initialAccountId && accounts.some((a) => a.id === initialAccountId)) {
        setAccountId(initialAccountId);
        const target = accounts.find((a) => a.id === initialAccountId);
        if (target?.type === 'credit_card') {
          setPaymentMode('credit_card');
        } else if (target?.type === 'ewallet_pay_later') {
          setPaymentMode('bnpl');
        } else if (target?.type === 'bank_account') {
          setPaymentMode('cash');
          setIsImmediateSettle(true);
        }
      } else if (creditCardAccounts.length > 0) {
        setAccountId(creditCardAccounts[0].id);
      } else if (accounts.length > 0) {
        setAccountId(accounts[0].id);
      } else {
        setAccountId('');
      }

      const defaultBank = accounts.find((a) => a.type === 'bank_account');
      setSettledFromAccountId(defaultBank ? defaultBank.id : '');
    }
  }, [editingExpense, isOpen, accounts]);

  // When payment mode changes, automatically select the most appropriate account
  const handlePaymentModeSelect = (mode: PaymentMode) => {
    setPaymentMode(mode);

    if (mode === 'credit_card') {
      if (creditCardAccounts.length > 0) {
        setAccountId(creditCardAccounts[0].id);
      }
    } else if (mode === 'bnpl') {
      if (bnplAccounts.length > 0) {
        setAccountId(bnplAccounts[0].id);
      }
    } else if (mode === 'duitnow_qr') {
      setRepaymentStructure('lump_sum');
      setIsImmediateSettle(true);
      setSettlementMethod('duitnow_qr');
      setCategory('QR Payment');
      if (bankAccounts.length > 0) {
        setAccountId(bankAccounts[0].id);
        setSettledFromAccountId(bankAccounts[0].id);
      }
    } else if (mode === 'cash') {
      setRepaymentStructure('lump_sum');
      setIsImmediateSettle(true);
      setSettlementMethod('instant_fpx');
      if (bankAccounts.length > 0) {
        setAccountId(bankAccounts[0].id);
        setSettledFromAccountId(bankAccounts[0].id);
      }
    }
  };

  // Preset quick fill handler
  const handleApplyPreset = (preset: DayToDayBillPreset) => {
    setTitle(preset.defaultTitle);
    setMerchant(preset.defaultMerchant);
    setCategory(preset.category);
    setAmount(preset.typicalAmount);
    setPaymentMode(preset.preferredPaymentMode);
    setRepaymentStructure(preset.defaultRepayment);

    // Auto-detect recurring utility/subscription bills
    const isRecurringPreset = ['TNB Electricity', 'UNIFI Home Fibre', 'Air Selangor', 'Netflix Subscription', 'Indah Water', 'Spotify Family'].some(
      (b) => preset.defaultTitle.includes(b)
    );
    if (isRecurringPreset) {
      setIsMonthlyRecurring(true);
      if (!tags.includes('#recurring')) {
        setTags((prev) => [...prev, '#recurring']);
      }
    }

    // Pick appropriate account
    if (preset.preferredPaymentMode === 'duitnow_qr') {
      setIsImmediateSettle(true);
      setSettlementMethod('duitnow_qr');
      if (bankAccounts.length > 0) {
        setAccountId(bankAccounts[0].id);
        setSettledFromAccountId(bankAccounts[0].id);
      }
    } else if (preset.preferredPaymentMode === 'credit_card' && creditCardAccounts.length > 0) {
      setAccountId(creditCardAccounts[0].id);
    } else if (preset.preferredPaymentMode === 'bnpl' && bnplAccounts.length > 0) {
      const match = bnplAccounts.find((b) => b.name.toLowerCase().includes(preset.defaultMerchant.toLowerCase())) || bnplAccounts[0];
      setAccountId(match.id);
    } else if (preset.preferredPaymentMode === 'cash' && bankAccounts.length > 0) {
      setAccountId(bankAccounts[0].id);
      setIsImmediateSettle(true);
    }
  };

  if (!isOpen) return null;

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const numAmount = typeof amount === 'number' ? amount : 0;

  // Day of month derived from selected transaction date
  const parsedDateDay = parseInt(date.split('-')[2], 10);
  const dateDay = !isNaN(parsedDateDay) && parsedDateDay >= 1 && parsedDateDay <= 31 ? parsedDateDay : new Date().getDate();

  // Next projected recurring occurrences
  const upcomingRecurringDates = isMonthlyRecurring
    ? getUpcomingRecurringDates(recurringDay, 3, new Date(date))
    : [];

  // Monthly split calculation
  const calculatedMonthlySplit = numAmount > 0 && splitMonths > 0
    ? Math.round(((numAmount * (1 + (splitFeeRate / 100))) / splitMonths) * 100) / 100
    : 0;

  // Interest saved calculation for immediate settlement
  const apr = selectedAccount?.apr || 18.0;
  const estimatedSavings = (isImmediateSettle || paymentMode === 'cash' || paymentMode === 'duitnow_qr') && numAmount > 0 
    ? calculateInterestSavedEstimate(numAmount, apr, selectedAccount?.gracePeriodDays || 25)
    : 0;

  // Intelligent Rewards & Balancing Recommendation
  const isDateOnWeekend = isDateWeekend(date);
  const cardRecommendations = useMemo(() => {
    if (numAmount <= 0) return [];
    return recommendBestCardForPurchase({
      amount: numAmount,
      date,
      category,
      accounts,
      expenses,
    });
  }, [numAmount, date, category, accounts, expenses]);
  const topCardRecommendation = cardRecommendations.length > 0 ? cardRecommendations[0] : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0 || !selectedAccount) {
      return;
    }

    const isQRMode = paymentMode === 'duitnow_qr' || category === 'QR Payment';
    const isCashMode = paymentMode === 'cash';
    const isSplit = (paymentMode === 'credit_card' || paymentMode === 'bnpl') && repaymentStructure === 'split_months' && !isQRMode;
    const shouldSettleImmediately = isQRMode || isCashMode || (isImmediateSettle && repaymentStructure === 'lump_sum');
    const effectiveSettlementMethod: SettlementMethod = isQRMode ? 'duitnow_qr' : settlementMethod;
    const effectiveSourceBankId = isQRMode ? selectedAccount.id : (settledFromAccountId || selectedAccount.id);

    const payload: Omit<ExpenseItem, 'id'> = {
      title: title.trim(),
      merchant: merchant.trim() || undefined,
      amount: Number(amount),
      date,
      accountId: selectedAccount.id,
      accountName: selectedAccount.name,
      accountType: isQRMode ? 'bank_account' : selectedAccount.type,
      paymentMode: isQRMode ? 'duitnow_qr' : paymentMode,
      repaymentStructure: (isCashMode || isQRMode) ? 'lump_sum' : repaymentStructure,
      splitMonths: isSplit ? splitMonths : undefined,
      monthlySplitAmount: isSplit ? calculatedMonthlySplit : undefined,
      splitFeeRate: isSplit && splitFeeRate > 0 ? splitFeeRate : undefined,
      category,
      status: shouldSettleImmediately ? 'settled' : 'unsettled',
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      ownerName: selectedAccount.ownerName,
      ownerRole: selectedAccount.ownerRole,
      settledAt: shouldSettleImmediately ? (editingExpense?.settledAt || new Date().toISOString()) : undefined,
      settlementMethod: shouldSettleImmediately ? effectiveSettlementMethod : undefined,
      settlementReference: shouldSettleImmediately 
        ? (editingExpense?.settlementReference || (isQRMode ? `DNT-${Date.now().toString(36).toUpperCase()}` : `STL-${Date.now().toString(36).toUpperCase()}`))
        : undefined,
      settledFromAccountId: shouldSettleImmediately ? effectiveSourceBankId : undefined,
      interestAvoidedEstimate: shouldSettleImmediately ? estimatedSavings : undefined,
      // Monthly recurring properties
      isRecurring: isMonthlyRecurring,
      recurringFrequency: isMonthlyRecurring ? 'monthly' : undefined,
      recurringDay: isMonthlyRecurring ? recurringDay : undefined,
      recurringSeriesId: isMonthlyRecurring ? (editingExpense?.recurringSeriesId || `series-${Date.now()}`) : undefined,
    };

    const installmentSplit = isSplit 
      ? { tenure: splitMonths, monthlyAmount: calculatedMonthlySplit, interestRate: splitFeeRate }
      : undefined;

    onSaveExpense(
      payload,
      shouldSettleImmediately ? { method: effectiveSettlementMethod, sourceAccountId: effectiveSourceBankId } : undefined,
      installmentSplit
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl space-y-4 max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-emerald-500/20 text-indigo-400 border border-indigo-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{editingExpense ? 'Modify Expense / Bill' : 'Record Day-to-Day Bill & Expense'}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Smart Split & Flow
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Log utilities, UNIFI, phone, streaming & retail with automated split or cycle terms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-5 overflow-y-auto text-xs">
          {/* Quick Preset Chips Bar */}
          {!editingExpense && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick Presets (Tap to Pre-fill):</span>
                </span>
                <span className="text-slate-500 text-[10px]">TNB • UNIFI • Water • Netflix • Retail</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                {POPULAR_BILL_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 whitespace-nowrap text-[11px] font-medium transition-all cursor-pointer shrink-0"
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: preset.color }} />
                      <span>{preset.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Bill Details */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
              <Receipt className="w-3.5 h-3.5 text-indigo-400" />
              <span>Bill & Expense Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">
                  Title / Bill Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UNIFI Home Fibre, TNB Electricity, Netflix"
                  value={title ?? ''}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">
                  Biller / Merchant
                </label>
                <input
                  type="text"
                  placeholder="e.g. Telekom Malaysia, TNB, Astro, Shopee"
                  value={merchant ?? ''}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-slate-300 font-semibold block">
                  Amount ({currencyConfig.symbol}) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-medium">
                    {currencyConfig.symbol}
                  </span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount ?? ''}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-semibold text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 sm:col-span-1">
                <label className="text-slate-300 font-semibold block">
                  Transaction Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date ?? ''}
                  onChange={(e) => {
                    setDate(e.target.value);
                    const p = parseInt(e.target.value.split('-')[2], 10);
                    if (!isNaN(p) && p >= 1 && p <= 31) {
                      setRecurringDay(p);
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs font-medium"
                />
              </div>

              <div className="space-y-1 sm:col-span-1">
                <label className="text-slate-300 font-semibold block">
                  Category
                </label>
                <select
                  value={category ?? 'Other'}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs cursor-pointer"
                >
                  {EXPENSE_CATEGORIES_LIST.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION: Monthly Recurring Toggle & Auto-Generation */}
          <div
            id="expense-modal-monthly-recurring-card"
            className={`p-4 rounded-xl border transition-all ${
              isMonthlyRecurring
                ? 'bg-gradient-to-br from-slate-900 via-indigo-950/25 to-slate-900 border-indigo-500/50 shadow-md shadow-indigo-950/30'
                : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600/80'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border transition-all ${
                    isMonthlyRecurring
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700/80'
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-xs">Monthly Recurring</span>
                    {isMonthlyRecurring ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" />
                        <span>Day {recurringDay} of every month</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50">
                        One-time expense
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Automatically generate a new expense entry on the same day every month
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  id="toggle-monthly-recurring-switch"
                  type="checkbox"
                  checked={isMonthlyRecurring}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsMonthlyRecurring(checked);
                    if (checked) {
                      if (!tags.includes('#recurring')) {
                        setTags((prev) => [...prev, '#recurring']);
                      }
                    } else {
                      setTags((prev) => prev.filter((t) => t !== '#recurring'));
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
              </label>
            </div>

            {/* Recurring Configuration Details when active */}
            {isMonthlyRecurring && (
              <div className="pt-3.5 mt-3 border-t border-indigo-500/25 space-y-3 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <label className="text-slate-200 font-semibold text-xs block">
                      Recurrence Day of Month
                    </label>
                    <span className="text-[11px] text-slate-400">
                      BillFlow automatically generates this expense entry on this day each month
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-medium">Day:</span>
                    <select
                      id="select-recurring-day-of-month"
                      value={recurringDay}
                      onChange={(e) => setRecurringDay(parseInt(e.target.value, 10))}
                      className="bg-slate-800 border border-indigo-500/40 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          Day {d} of month
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="text-slate-400 font-medium">Quick presets:</span>
                  {[
                    { label: `Same as date (Day ${dateDay})`, day: dateDay },
                    { label: '1st of month', day: 1 },
                    { label: '15th (Mid-month)', day: 15 },
                    { label: '25th (Payday cycle)', day: 25 },
                    { label: '28th of month', day: 28 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setRecurringDay(preset.day)}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        recurringDay === preset.day
                          ? 'bg-indigo-600/40 border border-indigo-500 text-indigo-200 font-bold'
                          : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Upcoming Schedule Dates Preview */}
                <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/25 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Projected Next 3 Recurring Cycles:</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Auto-Debit / Auto-Log
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {upcomingRecurringDates.map((dStr, idx) => (
                      <span
                        key={dStr}
                        className="px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700 text-slate-200 font-semibold text-[11px] flex items-center gap-1.5"
                      >
                        <span className="text-indigo-400 font-mono text-[10px]">Cycle #{idx + 1}:</span>
                        <span>{dStr}</span>
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Every month on Day {recurringDay}, BillFlow will create a new entry for this bill, update your accounts, and reflect in your Monthly Spending Cap.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SMART REWARDS & CASHBACK BALANCING ADVISOR */}
          {numAmount > 0 && topCardRecommendation && (
            <div
              id="expense-modal-smart-rewards-banner"
              className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 shadow-sm animate-fadeIn"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Smart Card Recommendation
                      </span>
                      <span className="text-xs font-bold text-white">
                        {topCardRecommendation.accountName}
                      </span>
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-500/30">
                        {topCardRecommendation.projectedEarnedDescription}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">
                      {topCardRecommendation.reason}
                    </p>

                    {topCardRecommendation.isCappedWarning && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-950/40 p-1.5 rounded-lg border border-amber-500/30 mt-1.5">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span>{topCardRecommendation.balancingAdvice}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {accountId === topCardRecommendation.accountId ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Applied</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountId(topCardRecommendation.accountId);
                        if (topCardRecommendation.accountType === 'credit_card') {
                          setPaymentMode('credit_card');
                        } else if (topCardRecommendation.accountType === 'ewallet_pay_later') {
                          setPaymentMode('bnpl');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Use this Card</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PROMPT 1: Which Payment Method was made? */}
          <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950/30 border border-indigo-500/30 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white flex items-center gap-1.5 text-xs">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <span>Prompt 1: Which Payment Method was used?</span>
              </label>
              <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full font-medium">
                Mandatory Choice
              </span>
            </div>

            {/* 4 Payment Mode Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Option A: Credit Card */}
              <button
                type="button"
                onClick={() => handlePaymentModeSelect('credit_card')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMode === 'credit_card'
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                    : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`p-1.5 rounded-lg ${paymentMode === 'credit_card' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-700/50 text-slate-400'}`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  {paymentMode === 'credit_card' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Credit Card</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Grace period & statement
                  </div>
                </div>
              </button>

              {/* Option B: BNPL (Spaylater, ATOME, Grab Pay Later) */}
              <button
                type="button"
                onClick={() => handlePaymentModeSelect('bnpl')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMode === 'bnpl'
                    ? 'bg-orange-600/20 border-orange-500 shadow-sm ring-1 ring-orange-500'
                    : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`p-1.5 rounded-lg ${paymentMode === 'bnpl' ? 'bg-orange-500/30 text-orange-300' : 'bg-slate-700/50 text-slate-400'}`}>
                    <Wallet className="w-4 h-4" />
                  </div>
                  {paymentMode === 'bnpl' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-white text-xs">BNPL PayLater</div>
                  <div className="text-[10px] text-orange-300/90 mt-0.5">
                    SPayLater, Atome, Grab
                  </div>
                </div>
              </button>

              {/* Option C: DuitNow / QR Scan */}
              <button
                type="button"
                onClick={() => handlePaymentModeSelect('duitnow_qr')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMode === 'duitnow_qr'
                    ? 'bg-pink-600/20 border-pink-500 shadow-sm ring-1 ring-pink-500'
                    : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`p-1.5 rounded-lg ${paymentMode === 'duitnow_qr' ? 'bg-pink-500/30 text-pink-300' : 'bg-slate-700/50 text-slate-400'}`}>
                    <QrCode className="w-4 h-4" />
                  </div>
                  {paymentMode === 'duitnow_qr' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-white text-xs">DuitNow / QR</div>
                  <div className="text-[10px] text-pink-300/90 mt-0.5">
                    Scan & Pay linked to Bank
                  </div>
                </div>
              </button>

              {/* Option D: Cash / Bank Account */}
              <button
                type="button"
                onClick={() => handlePaymentModeSelect('cash')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMode === 'cash'
                    ? 'bg-emerald-600/20 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                    : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`p-1.5 rounded-lg ${paymentMode === 'cash' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-700/50 text-slate-400'}`}>
                    <Banknote className="w-4 h-4" />
                  </div>
                  {paymentMode === 'cash' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Cash / FPX</div>
                  <div className="text-[10px] text-emerald-300/90 mt-0.5">
                    Direct debit from balance
                  </div>
                </div>
              </button>
            </div>

            {/* Account Selector based on Chosen Payment Mode */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <label className="text-slate-300 font-semibold block text-[11px]">
                {paymentMode === 'credit_card' && 'Select Charged Credit Card:'}
                {paymentMode === 'bnpl' && 'Select BNPL Account (SPayLater, Atome, GrabPay):'}
                {paymentMode === 'duitnow_qr' && 'Select Source Bank Account for DuitNow QR Debit:'}
                {paymentMode === 'cash' && 'Select Bank Account / Cash Source:'}
              </label>

              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer text-xs font-medium"
              >
                {/* Mode filtered accounts first */}
                {paymentMode === 'credit_card' && creditCardAccounts.length > 0 && (
                  <optgroup label="Credit Cards">
                    {creditCardAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        💳 {acc.name} ({acc.institution}) • Statement Day {acc.cycleDay} • Due Day {acc.dueDate.split('-')[2]}
                      </option>
                    ))}
                  </optgroup>
                )}

                {paymentMode === 'bnpl' && bnplAccounts.length > 0 && (
                  <optgroup label="BNPL Services">
                    {bnplAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        🛍️ {acc.name} ({acc.institution}) • Cycle Day {acc.cycleDay}
                      </option>
                    ))}
                  </optgroup>
                )}

                {(paymentMode === 'cash' || paymentMode === 'duitnow_qr') && bankAccounts.length > 0 && (
                  <optgroup label={paymentMode === 'duitnow_qr' ? "Linked Bank Accounts (DuitNow QR)" : "Bank Accounts / Cash Buffer"}>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {paymentMode === 'duitnow_qr' ? '📲' : '💵'} {acc.name} ({acc.institution}) • Balance: {formatCurrency(acc.totalBalance, currency)}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* All remaining accounts fallback */}
                <optgroup label="All Accounts & Facilities">
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — {getAccountTypeLabel(acc.type)} ({acc.institution})
                    </option>
                  ))}
                </optgroup>
              </select>

              {/* Account details helper */}
              {selectedAccount && (
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                  <span>Facility: <strong className="text-slate-200">{selectedAccount.name}</strong></span>
                  <span>•</span>
                  <span>Statement Day: <strong className="text-indigo-300">Day {selectedAccount.cycleDay}</strong></span>
                  <span>•</span>
                  <span>Due Date: <strong className="text-amber-300">{selectedAccount.dueDate}</strong></span>
                  {selectedAccount.apr > 0 && (
                    <>
                      <span>•</span>
                      <span>APR: <strong className="text-rose-400">{selectedAccount.apr}% p.a.</strong></span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PROMPT 2: Payment Terms — Split into Multiple Months or Lump Sum into Following Cycle? */}
          {paymentMode !== 'cash' ? (
            <div className="space-y-3.5 p-4 rounded-xl bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950/20 border border-blue-500/30 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <SplitSquareVertical className="w-4 h-4 text-blue-400" />
                  <span>Prompt 2: Payment Terms & Cycle Structure</span>
                </label>
                <span className="text-[10px] text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                  Select Terms
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Term 1: Lump Sum into Following Cycle */}
                <button
                  type="button"
                  onClick={() => setRepaymentStructure('lump_sum')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    repaymentStructure === 'lump_sum'
                      ? 'bg-blue-600/20 border-blue-500 shadow-sm ring-1 ring-blue-500'
                      : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Lump Sum into Following Cycle</span>
                    </div>
                    {repaymentStructure === 'lump_sum' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Charges to next statement closing (Day {selectedAccount?.cycleDay || 15}). Full balance due on statement due date. 0% interest if paid in full before due date.
                  </p>
                </button>

                {/* Term 2: Split into Multiple Months */}
                <button
                  type="button"
                  onClick={() => setRepaymentStructure('split_months')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    repaymentStructure === 'split_months'
                      ? 'bg-purple-600/20 border-purple-500 shadow-sm ring-1 ring-purple-500'
                      : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>Split into Multiple Months</span>
                    </div>
                    {repaymentStructure === 'split_months' && (
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Convert payment into 2, 3, 6, 12+ monthly installments. Automatically incorporates into cash flow and payment optimizer.
                  </p>
                </button>
              </div>

              {/* Sub-section if Split Months is Selected */}
              {repaymentStructure === 'split_months' && (
                <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-200 text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>Configure Split Installment Tenure</span>
                    </span>
                    <span className="text-[11px] font-bold text-white bg-purple-500/30 px-2 py-0.5 rounded-md">
                      {splitMonths} Months
                    </span>
                  </div>

                  {/* Tenure Quick Select Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[2, 3, 4, 6, 12, 24].map((tenure) => (
                      <button
                        key={tenure}
                        type="button"
                        onClick={() => setSplitMonths(tenure)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          splitMonths === tenure
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                        }`}
                      >
                        {tenure} Mo
                      </button>
                    ))}
                  </div>

                  {/* Processing / Interest Fee Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-300 font-medium block">
                        Installment Fee / Interest Rate (%):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.1"
                        value={splitFeeRate ?? 0}
                        onChange={(e) => setSplitFeeRate(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-medium focus:outline-none focus:border-purple-500"
                        placeholder="0% (0% promo)"
                      />
                    </div>

                    {/* Live Calculation Preview Box */}
                    <div className="bg-slate-900/90 border border-purple-500/40 rounded-xl p-2.5 flex flex-col justify-center">
                      <span className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">
                        Monthly Commitment
                      </span>
                      <span className="text-base font-black text-white">
                        {formatCurrency(calculatedMonthlySplit, currency)} <span className="text-xs font-normal text-slate-400">/ mo</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Total {splitMonths} installments starting next cycle
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-section if Lump Sum is Selected: Immediate Settlement Option */}
              {repaymentStructure === 'lump_sum' && (
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-800/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                        <Zap className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <span className="font-bold text-white text-xs block">
                          Immediate Settlement (Zero-Debt Hygiene)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Settle immediately via FPX / buffer to prevent carrying revolving debt
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isImmediateSettle}
                        onChange={(e) => setIsImmediateSettle(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {isImmediateSettle && (
                    <div className="pt-2 border-t border-slate-800 space-y-2 animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] text-slate-300 font-medium block mb-1">
                            Settlement Gateway
                          </label>
                          <select
                            value={settlementMethod ?? 'instant_fpx'}
                            onChange={(e) => setSettlementMethod(e.target.value as SettlementMethod)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                          >
                            {SETTLEMENT_METHODS_CONFIG.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {bankAccounts.length > 0 && (
                          <div>
                            <label className="text-[11px] text-slate-300 font-medium block mb-1">
                              Offset From Bank Buffer
                            </label>
                            <select
                              value={settledFromAccountId ?? ''}
                              onChange={(e) => setSettledFromAccountId(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">External / Cash Payment</option>
                              {bankAccounts.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name} ({b.accountNumberMask})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {estimatedSavings > 0 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            Immediate settlement avoids an estimated <strong>{formatCurrency(estimatedSavings, currency)}</strong> in potential revolving interest!
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : paymentMode === 'duitnow_qr' ? (
            /* DuitNow QR Information banner */
            <div className="p-3.5 rounded-xl bg-pink-950/20 border border-pink-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">DuitNow / QR Scan & Pay</div>
                  <div className="text-[11px] text-pink-300/80">
                    Real-time national QR transaction. Direct debit from linked bank account.
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-pink-400 bg-pink-500/20 px-2 py-0.5 rounded-full">
                Instant Debit
              </span>
            </div>
          ) : (
            /* Cash mode information banner */
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Direct Cash / Bank Debit</div>
                  <div className="text-[11px] text-emerald-300/80">
                    Paid in full with zero debt incurred. Deducted from cash reserves immediately.
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                Settled
              </span>
            </div>
          )}

          {/* Tags & Labels Filter Section */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5 text-xs">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                <span>Custom Tags & Labels</span>
              </label>
              <span className="text-[10px] text-slate-500">Filter & group in Hub</span>
            </div>

            {/* Popular quick-select tags */}
            <div className="flex flex-wrap gap-1.5">
              {['#vacation', '#business', '#tax-deductible', '#personal', '#medical', '#family'].map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-medium'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Custom tag input form */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Add custom tag (e.g. #project, #trip)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-medium"
              />
              <button
                type="button"
                onClick={() => handleAddCustomTag()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Add
              </button>
            </div>

            {/* Active tags badges */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className="hover:text-white cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes & Account No */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block text-xs">
              Account No. / Reference / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. TNB Acc: 2200192841, UNIFI Login ID, Netflix sub-account"
              value={notes ?? ''}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-medium"
            />
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{editingExpense ? 'Save Changes' : 'Record Bill / Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
