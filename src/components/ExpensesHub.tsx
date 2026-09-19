import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Edit3, 
  Trash2, 
  Sparkles,
  TrendingDown,
  Layers,
  ChevronRight,
  SplitSquareVertical,
  CreditCard,
  Wallet,
  Banknote,
  Smartphone,
  Wifi,
  Droplets,
  Tv,
  Film,
  Radio,
  ShoppingBag,
  Camera,
  Tag,
  QrCode,
  X,
  Repeat,
  CalendarClock
} from 'lucide-react';
import { 
  ExpenseItem, 
  BillAccount, 
  ExpenseCategory, 
  SettlementStatus, 
  AccountType,
  SettlementMethod,
  PaymentMode,
  RepaymentStructure
} from '../types';
import { CurrencyCode, formatCurrency, getCurrencyConfig } from '../utils/currency';
import { 
  getAccountTypeLabel, 
  renderAccountIcon, 
  renderSettlementMethodBadge, 
  EXPENSE_CATEGORIES_LIST,
  POPULAR_BILL_PRESETS,
  DayToDayBillPreset,
  getExpenseCategoryIcon,
  calculateInterestSavedEstimate 
} from '../utils/accountUtils';
import { ExpenseModal } from './ExpenseModal';
import { ImmediateSettlementModal } from './ImmediateSettlementModal';

interface ExpensesHubProps {
  expenses: ExpenseItem[];
  accounts: BillAccount[];
  currency: CurrencyCode;
  onAddExpense: (
    expenseData: Omit<ExpenseItem, 'id'>, 
    immediateSettle?: { method: SettlementMethod; sourceAccountId?: string },
    installmentSplit?: { tenure: number; monthlyAmount: number; interestRate?: number }
  ) => void;
  onUpdateExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (expenseId: string) => void;
  onImmediateSettleExpense: (
    expenseId: string, 
    settlementDetails: {
      method: SettlementMethod;
      amountSettled: number;
      sourceAccountId?: string;
      referenceCode: string;
      notes?: string;
    }
  ) => void;
  onConvertToInstallment?: (expense: ExpenseItem) => void;
  onBatchSettleUnsettled?: (expenseIds: string[]) => void;
  onOpenPresetModal?: (preset: DayToDayBillPreset) => void;
  onOpenReceiptCapture?: () => void;
  onOpenAccountTransactions?: (account: BillAccount) => void;
  onOpenUpdateBankBalance?: (accountId: string) => void;
  onEditAccount?: (account: BillAccount) => void;
  onForceGenerateRecurringCycle?: (expense: ExpenseItem) => void;
}

export const ExpensesHub: React.FC<ExpensesHubProps> = ({
  expenses = [],
  accounts = [],
  currency,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onImmediateSettleExpense,
  onConvertToInstallment,
  onBatchSettleUnsettled,
  onOpenReceiptCapture,
  onOpenAccountTransactions,
  onOpenUpdateBankBalance,
  onEditAccount,
  onForceGenerateRecurringCycle,
}) => {
  const currencyConfig = getCurrencyConfig(currency);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [selectedPaymentModeFilter, setSelectedPaymentModeFilter] = useState<string>('all');
  const [selectedRepaymentFilter, setSelectedRepaymentFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [selectedRecurringFilter, setSelectedRecurringFilter] = useState<string>('all');

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [targetAccountIdForNew, setTargetAccountIdForNew] = useState<string | undefined>(undefined);

  const [settlingExpense, setSettlingExpense] = useState<ExpenseItem | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  // Collect all unique tags across expenses
  const allAvailableTags = useMemo(() => {
    const set = new Set<string>();
    // Pre-populate standard common tags so users can easily filter
    ['#vacation', '#business', '#tax-deductible', '#personal', '#medical', '#family'].forEach(t => set.add(t));
    (expenses || []).forEach(e => {
      (e.tags || []).forEach(t => set.add(t));
    });
    return Array.from(set);
  }, [expenses]);

  // Derived Metrics
  const metrics = useMemo(() => {
    let totalPurchases = 0;
    let settledAmount = 0;
    let unsettledAmount = 0;
    let totalInterestSaved = 0;
    let unsettledCount = 0;
    let splitPlansCount = 0;
    let totalMonthlySplitCommitment = 0;

    (expenses || []).forEach((e) => {
      totalPurchases += e.amount;
      if (e.status === 'settled') {
        settledAmount += e.amount;
        totalInterestSaved += e.interestAvoidedEstimate || 0;
      } else {
        unsettledAmount += e.amount;
        unsettledCount += 1;
      }

      if (e.repaymentStructure === 'split_months' || (e.splitMonths && e.splitMonths > 1)) {
        splitPlansCount += 1;
        totalMonthlySplitCommitment += e.monthlySplitAmount || (e.amount / (e.splitMonths || 3));
      }
    });

    return {
      totalPurchases,
      settledAmount,
      unsettledAmount,
      totalInterestSaved,
      unsettledCount,
      splitPlansCount,
      totalMonthlySplitCommitment,
    };
  }, [expenses]);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter((e) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(term);
        const matchesMerchant = (e.merchant || '').toLowerCase().includes(term);
        const matchesAccount = e.accountName.toLowerCase().includes(term);
        const matchesCategory = e.category.toLowerCase().includes(term);
        const matchesTags = (e.tags || []).some(t => t.toLowerCase().includes(term));
        if (!matchesTitle && !matchesMerchant && !matchesAccount && !matchesCategory && !matchesTags) return false;
      }

      // Tag Filter
      if (selectedTagFilter !== 'all') {
        if (!e.tags || !e.tags.includes(selectedTagFilter)) return false;
      }

      // Type Filter
      if (selectedTypeFilter !== 'all' && e.accountType !== selectedTypeFilter) {
        return false;
      }

      // Payment Mode Filter (credit_card, bnpl, duitnow_qr, cash)
      if (selectedPaymentModeFilter !== 'all') {
        if (selectedPaymentModeFilter === 'credit_card' && e.accountType !== 'credit_card' && e.paymentMode !== 'credit_card') return false;
        if (selectedPaymentModeFilter === 'bnpl' && e.accountType !== 'ewallet_pay_later' && e.paymentMode !== 'bnpl') return false;
        if (selectedPaymentModeFilter === 'duitnow_qr' && e.paymentMode !== 'duitnow_qr' && e.settlementMethod !== 'duitnow_qr' && e.category !== 'QR Payment') return false;
        if (selectedPaymentModeFilter === 'cash' && e.paymentMode !== 'cash' && e.accountType !== 'bank_account') return false;
      }

      // Repayment Structure Filter (lump_sum vs split_months)
      if (selectedRepaymentFilter !== 'all') {
        if (selectedRepaymentFilter === 'split_months' && e.repaymentStructure !== 'split_months' && !e.splitMonths) return false;
        if (selectedRepaymentFilter === 'lump_sum' && (e.repaymentStructure === 'split_months' || (e.splitMonths && e.splitMonths > 1))) return false;
      }

      // Status Filter
      if (selectedStatusFilter !== 'all' && e.status !== selectedStatusFilter) {
        return false;
      }

      // Category Filter
      if (selectedCategoryFilter !== 'all' && e.category !== selectedCategoryFilter) {
        return false;
      }

      // Specific Account Filter
      if (selectedAccountFilter !== 'all' && e.accountId !== selectedAccountFilter) {
        return false;
      }

      // Cadence / Recurring Filter
      if (selectedRecurringFilter === 'recurring' && !e.isRecurring) {
        return false;
      }
      if (selectedRecurringFilter === 'one_time' && (e.isRecurring || e.autoGenerated)) {
        return false;
      }
      if (selectedRecurringFilter === 'auto_generated' && !e.autoGenerated) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm, selectedAccountFilter, selectedTypeFilter, selectedPaymentModeFilter, selectedRepaymentFilter, selectedStatusFilter, selectedCategoryFilter, selectedTagFilter, selectedRecurringFilter]);

  // Handle open add modal
  const handleOpenAddModal = (accId?: string) => {
    setTargetAccountIdForNew(accId || (selectedAccountFilter !== 'all' ? selectedAccountFilter : undefined));
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  // Handle open immediate settle modal
  const handleOpenSettleModal = (expense: ExpenseItem) => {
    setSettlingExpense(expense);
    setIsSettlementModalOpen(true);
  };

  // Batch settle all currently filtered unsettled expenses
  const handleBatchSettle = () => {
    const unsettledIds = filteredExpenses
      .filter((e) => e.status === 'unsettled')
      .map((e) => e.id);
    if (unsettledIds.length > 0 && onBatchSettleUnsettled) {
      onBatchSettleUnsettled(unsettledIds);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Recorded Expenses */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Total Day-to-Day Bills & Expenses</span>
            <Receipt className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {formatCurrency(metrics.totalPurchases, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="font-semibold text-slate-300">{expenses.length} total bills</span>
            <span>•</span>
            <span className="text-purple-300">{metrics.splitPlansCount} split plans</span>
          </div>
        </div>

        {/* Metric 2: Settled Immediately (Zero-Debt Cleared) */}
        <div className="bg-slate-900/90 border border-emerald-500/20 rounded-2xl p-4 shadow-sm relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Settled Immediately (Zero-Debt)</span>
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {formatCurrency(metrics.settledAmount, currency)}
          </div>
          <div className="text-[11px] text-emerald-400/90 mt-1 font-medium">
            Avoided revolving debt • Cash rewards secured
          </div>
        </div>

        {/* Metric 3: Pending / Unsettled Swipes */}
        <div className="bg-slate-900/90 border border-amber-500/20 rounded-2xl p-4 shadow-sm relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20">
          <div className="flex items-center justify-between text-xs text-amber-400 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Active Cycle Balance</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
              {metrics.unsettledCount} pending
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {formatCurrency(metrics.unsettledAmount, currency)}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1 font-medium">
            Due in upcoming statement cycles
          </div>
        </div>

        {/* Metric 4: Interest Saved via Timely Settlement */}
        <div className="bg-slate-900/90 border border-indigo-500/20 rounded-2xl p-4 shadow-sm relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20">
          <div className="flex items-center justify-between text-xs text-indigo-400 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Est. Interest Saved</span>
            </span>
            <TrendingDown className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {formatCurrency(metrics.totalInterestSaved, currency)}
          </div>
          <div className="text-[11px] text-indigo-400/80 mt-1 font-medium">
            Saved via prompt payoff before finance charges
          </div>
        </div>
      </div>

      {/* Quick Presets Bar: Rapid capture of UNIFI, TNB, Water, IWK, CelcomDigi, Netflix, Disney, ASTRO */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-md space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Frequent Day-to-Day Bills & Subscriptions</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Click any button to auto-fill payment rail & prompt for multi-month split or lump sum:
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 pt-1">
          {POPULAR_BILL_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setEditingExpense({
                    id: '',
                    accountId: '',
                    accountName: '',
                    accountType: preset.preferredPaymentMode === 'bnpl' ? 'ewallet_pay_later' : preset.preferredPaymentMode === 'cash' ? 'bank_account' : 'credit_card',
                    paymentMode: preset.preferredPaymentMode,
                    repaymentStructure: preset.defaultRepayment,
                    splitMonths: preset.defaultRepayment === 'split_months' ? 3 : undefined,
                    title: preset.defaultTitle,
                    merchant: preset.defaultMerchant,
                    amount: preset.typicalAmount,
                    date: new Date().toISOString().split('T')[0],
                    category: preset.category,
                    status: preset.preferredPaymentMode === 'cash' ? 'settled' : 'unsettled',
                  });
                  setIsExpenseModalOpen(true);
                }}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 hover:border-indigo-500/50 border border-slate-700/80 text-left transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1 rounded-lg bg-slate-900/80">
                    <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" style={{ color: preset.color }} />
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-400">
                    {preset.preferredPaymentMode === 'bnpl' ? 'BNPL' : preset.preferredPaymentMode === 'cash' ? 'Cash' : 'Card'}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-slate-200 text-[11px] group-hover:text-white truncate">
                    {preset.shortLabel}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    ~{formatCurrency(preset.typicalAmount, currency)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Bar: Search, Filters & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses by bill name, UNIFI, TNB, Netflix, merchant..."
              value={searchTerm ?? ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {metrics.unsettledCount > 0 && onBatchSettleUnsettled && (
              <button
                onClick={handleBatchSettle}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Immediately settle all pending swipes via FPX to clear balances"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                <span>Settle Pending ({metrics.unsettledCount})</span>
              </button>
            )}

            {onOpenReceiptCapture && (
              <button
                onClick={onOpenReceiptCapture}
                className="px-3.5 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 hover:text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Capture receipt snapshot with camera or upload image"
              >
                <Camera className="w-4 h-4 text-indigo-400" />
                <span>Scan Receipt</span>
              </button>
            )}

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Record Bill / Expense</span>
            </button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium mr-1">
            <Filter className="w-3 h-3" />
            <span>Filter:</span>
          </div>

          {/* Account Filter */}
          <select
            value={selectedAccountFilter ?? 'all'}
            onChange={(e) => setSelectedAccountFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
          >
            <option value="all">All Linked Accounts ({accounts.length})</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.type === 'credit_card' ? 'Card' : acc.type === 'ewallet_pay_later' ? 'BNPL' : 'Bank'})
              </option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            value={selectedPaymentModeFilter ?? 'all'}
            onChange={(e) => setSelectedPaymentModeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
          >
            <option value="all">All Payment Methods</option>
            <option value="credit_card">💳 Credit Card</option>
            <option value="bnpl">🛍️ BNPL (SPayLater / Atome / Grab)</option>
            <option value="duitnow_qr">📲 DuitNow / QR Scan & Pay</option>
            <option value="cash">💵 Cash / Direct Bank FPX</option>
          </select>

          {/* Repayment Structure Filter */}
          <select
            value={selectedRepaymentFilter ?? 'all'}
            onChange={(e) => setSelectedRepaymentFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
          >
            <option value="all">All Repayment Terms</option>
            <option value="lump_sum">🗓️ Lump Sum Next Cycle</option>
            <option value="split_months">➗ Split into Multi-Month Installments</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter ?? 'all'}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="unsettled">Pending / Active Cycle</option>
            <option value="settled">Settled (Zero-Debt)</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategoryFilter ?? 'all'}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES_LIST.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Cadence / Recurring Filter */}
          <div className="flex items-center gap-1.5">
            <Repeat className="w-3 h-3 text-cyan-400" />
            <select
              value={selectedRecurringFilter ?? 'all'}
              onChange={(e) => setSelectedRecurringFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
            >
              <option value="all">All Cadences</option>
              <option value="recurring">🔄 Monthly Recurring Only</option>
              <option value="one_time">⚡ One-Time Purchases</option>
              <option value="auto_generated">🤖 Auto-Generated Cycles</option>
            </select>
          </div>

          {/* Tag / Label Filter */}
          <div className="flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-indigo-400" />
            <select
              value={selectedTagFilter ?? 'all'}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
            >
              <option value="all">All Tags / Labels</option>
              {allAvailableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {(selectedAccountFilter !== 'all' || selectedTypeFilter !== 'all' || selectedPaymentModeFilter !== 'all' || selectedRepaymentFilter !== 'all' || selectedStatusFilter !== 'all' || selectedCategoryFilter !== 'all' || selectedTagFilter !== 'all' || selectedRecurringFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedAccountFilter('all');
                setSelectedTypeFilter('all');
                setSelectedPaymentModeFilter('all');
                setSelectedRepaymentFilter('all');
                setSelectedStatusFilter('all');
                setSelectedCategoryFilter('all');
                setSelectedTagFilter('all');
                setSelectedRecurringFilter('all');
                setSearchTerm('');
              }}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Quick Tags Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-slate-500 text-[10px] flex items-center gap-1 mr-1">
            <Tag className="w-2.5 h-2.5 text-slate-500" />
            Filter by tag:
          </span>
          {allAvailableTags.slice(0, 8).map((tag) => {
            const isActive = selectedTagFilter === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTagFilter(isActive ? 'all' : tag)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                <span>{tag}</span>
                {isActive && <X className="w-2.5 h-2.5 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Account Context Banner when filtering by specific account */}
      {selectedAccountFilter !== 'all' && (() => {
        const activeAcc = accounts.find((a) => a.id === selectedAccountFilter);
        if (!activeAcc) return null;
        const isBank = activeAcc.type === 'bank_account';
        const isCard = activeAcc.type === 'credit_card';
        const isBnpl = activeAcc.type === 'ewallet_pay_later';
        const accExpenses = expenses.filter((e) => e.accountId === activeAcc.id);
        const unsettledSum = accExpenses.filter((e) => e.status !== 'settled').reduce((sum, e) => sum + e.amount, 0);

        return (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow"
                style={{ backgroundColor: activeAcc.color || '#4f46e5' }}
              >
                {renderAccountIcon(activeAcc.type, 'w-5 h-5 text-white')}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm">{activeAcc.name}</span>
                  <span 
                    className="text-[10px] px-2 py-0.5 rounded font-semibold"
                    style={{ backgroundColor: `${activeAcc.color}25`, color: activeAcc.color }}
                  >
                    {getAccountTypeLabel(activeAcc.type)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {activeAcc.institution} • {activeAcc.accountNumberMask}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs mt-1">
                  {isBank ? (
                    <div>
                      <span className="text-slate-400">Liquid Balance: </span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {formatCurrency(activeAcc.totalBalance, currency)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-400">Statement Due: </span>
                        <span className="font-bold text-amber-400 font-mono">
                          {formatCurrency(activeAcc.statementBalance, currency)}
                        </span>
                      </div>
                      <span className="text-slate-600">•</span>
                      <div>
                        <span className="text-slate-400">Active Unsettled: </span>
                        <span className="font-bold text-white font-mono">
                          {formatCurrency(unsettledSum, currency)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {isBank && onOpenUpdateBankBalance && (
                <button
                  type="button"
                  onClick={() => onOpenUpdateBankBalance(activeAcc.id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Update Bank Balance</span>
                </button>
              )}

              {(isCard || isBnpl) && onOpenAccountTransactions && (
                <button
                  type="button"
                  onClick={() => onOpenAccountTransactions(activeAcc)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Manage Card Transactions</span>
                </button>
              )}

              {onEditAccount && (
                <button
                  type="button"
                  onClick={() => onEditAccount(activeAcc)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Edit Details
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenAddModal(activeAcc.id)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Transaction</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Expenses Table & Card List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">
              Day-to-Day Bills & Expense Schedule
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
              {filteredExpenses.length} of {expenses.length}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            Supports Credit Cards, BNPL (SPayLater, Atome, GrabPay Later), and Cash
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">No bills or expenses found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm || selectedStatusFilter !== 'all' || selectedCategoryFilter !== 'all'
                  ? 'Try clearing active search terms or filters to view all records.'
                  : 'Capture phone bills, UNIFI, utilities, entertainment, or retail purchases.'}
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Record First Bill / Expense</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredExpenses.map((expense) => {
              const chargedAccount = accounts.find((a) => a.id === expense.accountId);
              const isSettled = expense.status === 'settled';
              const isSplit = expense.repaymentStructure === 'split_months' || (expense.splitMonths && expense.splitMonths > 1);

              return (
                <div
                  key={expense.id}
                  className="p-4 sm:px-5 hover:bg-slate-850/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      isSettled 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : isSplit
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {getExpenseCategoryIcon(expense.category, 'w-5 h-5')}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">
                          {expense.title}
                        </span>
                        {expense.merchant && (
                          <span className="text-slate-400 text-xs">
                            @ {expense.merchant}
                          </span>
                        )}

                        {/* Category Badge */}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                          {expense.category}
                        </span>

                        {/* Payment Method Badge */}
                        {expense.paymentMode === 'duitnow_qr' || expense.settlementMethod === 'duitnow_qr' || expense.category === 'QR Payment' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/30 flex items-center gap-1">
                            <QrCode className="w-3 h-3" />
                            <span>DuitNow / QR</span>
                          </span>
                        ) : expense.paymentMode === 'bnpl' || expense.accountType === 'ewallet_pay_later' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            <span>BNPL PayLater</span>
                          </span>
                        ) : expense.paymentMode === 'cash' || expense.accountType === 'bank_account' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Banknote className="w-3 h-3" />
                            <span>Cash / FPX</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            <span>Credit Card</span>
                          </span>
                        )}

                        {/* Repayment Structure Badge */}
                        {isSplit ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            <span>
                              Split {expense.splitMonths || 3} Mo • {formatCurrency(expense.monthlySplitAmount || (expense.amount / (expense.splitMonths || 3)), currency)}/mo
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Lump Sum Next Cycle</span>
                          </span>
                        )}

                        {/* Monthly Recurring Badge */}
                        {expense.isRecurring && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                            <Repeat className="w-3 h-3 text-cyan-400" />
                            <span>Monthly (Day {expense.recurringDay || (expense.date ? parseInt(expense.date.split('-')[2], 10) : 1)})</span>
                          </span>
                        )}

                        {/* Auto-Generated Cycle Badge */}
                        {expense.autoGenerated && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                            <CalendarClock className="w-3 h-3 text-indigo-400" />
                            <span>Auto-Cycle</span>
                          </span>
                        )}

                        {/* Status Badge */}
                        {isSettled ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Settled</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Active Cycle</span>
                          </span>
                        )}
                      </div>

                      {/* Account & Details Subtext */}
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-slate-300 font-medium">
                          {expense.accountName} ({getAccountTypeLabel(expense.accountType)})
                        </span>
                        <span>•</span>
                        <span>Date: {expense.date}</span>
                        {chargedAccount && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300">
                              Statement Day {chargedAccount.cycleDay} • Due {chargedAccount.dueDate}
                            </span>
                          </>
                        )}
                        {expense.ownerName && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-300 font-medium">{expense.ownerName}</span>
                          </>
                        )}
                        {isSettled && expense.settlementMethod && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-medium">
                              via {renderSettlementMethodBadge(expense.settlementMethod)}
                            </span>
                          </>
                        )}
                        {isSettled && expense.interestAvoidedEstimate && expense.interestAvoidedEstimate > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-300 font-semibold">
                              Saved ~{formatCurrency(expense.interestAvoidedEstimate, currency)} interest
                            </span>
                          </>
                        )}
                      </div>

                      {/* Expense Custom Tags / Labels */}
                      {expense.tags && expense.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          {expense.tags.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setSelectedTagFilter(t)}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-medium"
                              title={`Filter by tag: ${t}`}
                            >
                              <Tag className="w-2.5 h-2.5 text-indigo-400" />
                              <span>{t}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Optional Notes */}
                      {expense.notes && (
                        <p className="text-[11px] text-slate-400/90 italic pt-0.5">
                          "{expense.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="text-base sm:text-lg font-black text-white">
                        {formatCurrency(expense.amount, currency)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isSettled 
                          ? 'Balance settled' 
                          : isSplit
                            ? `Split across ${expense.splitMonths || 3} payments`
                            : 'Following statement cycle'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Immediate Settle Button if unsettled */}
                      {!isSettled && (
                        <button
                          onClick={() => handleOpenSettleModal(expense)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          title="Settle purchase immediately to avoid finance charges"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Settle Now</span>
                        </button>
                      )}

                      {/* Convert to Installment Plan if eligible (> RM150 and not already split) */}
                      {!isSettled && !isSplit && expense.amount >= 150 && onConvertToInstallment && (
                        <button
                          onClick={() => onConvertToInstallment(expense)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-purple-600/30 hover:border-purple-500/50 border border-slate-700 text-slate-300 hover:text-purple-300 transition-colors cursor-pointer"
                          title="Split this bill into multi-month installment plan"
                        >
                          <SplitSquareVertical className="w-4 h-4" />
                        </button>
                      )}

                      {/* Advance Recurring Cycle Button */}
                      {expense.isRecurring && onForceGenerateRecurringCycle && (
                        <button
                          onClick={() => onForceGenerateRecurringCycle(expense)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-cyan-600/25 hover:border-cyan-500/50 border border-slate-700/80 text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
                          title="Generate / simulate next month's recurring entry"
                        >
                          <Repeat className="w-4 h-4" />
                        </button>
                      )}

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEditModal(expense)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Edit bill / expense"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${expense.title}"?`)) {
                            onDeleteExpense(expense.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:border-rose-500/40 border border-slate-700/80 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        editingExpense={editingExpense}
        accounts={accounts}
        expenses={expenses}
        currency={currency}
        initialAccountId={targetAccountIdForNew}
        onSaveExpense={(data, immediateSettle, installmentSplit) => {
          if (editingExpense && editingExpense.id) {
            onUpdateExpense({
              ...editingExpense,
              ...data,
            });
          } else {
            onAddExpense(data, immediateSettle, installmentSplit);
          }
          setIsExpenseModalOpen(false);
        }}
      />

      {/* Immediate Settlement Modal */}
      <ImmediateSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        expense={settlingExpense}
        accounts={accounts}
        currency={currency}
        onConfirmSettlement={(expId, details) => {
          onImmediateSettleExpense(expId, details);
          setIsSettlementModalOpen(false);
        }}
      />
    </div>
  );
};
