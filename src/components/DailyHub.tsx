import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Sparkles, 
  CreditCard, 
  Wallet, 
  Building2, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Plus, 
  CheckCircle2, 
  ShieldCheck, 
  Flame, 
  Camera, 
  TrendingUp, 
  AlertCircle,
  ChevronRight,
  Coffee,
  Utensils,
  Fuel,
  ShoppingBag,
  Lightbulb,
  Check,
  ArrowUpRight,
  Receipt,
  Layers,
  Banknote,
  Trash2
} from 'lucide-react';
import { 
  BillAccount, 
  InstallmentPlan, 
  ExpenseItem, 
  StandingInstruction, 
  PaymentScheduleItem, 
  UserSettings, 
  ExpenseCategory,
  SettlementMethod,
  QuickPayTemplate,
  UtilityBillItem
} from '../types';
import { CurrencyCode, formatCurrency, getCurrencyConfig } from '../utils/currency';
import { renderAccountIcon, getAccountTypeLabel, getExpenseCategoryIcon } from '../utils/accountUtils';
import { QuickPayStrip } from './QuickPayStrip';
import { 
  getTodayDateStr, 
  getTodayDayOfMonth, 
  getTimezoneDisplayInfo,
  parseDateOnly 
} from '../utils/timezone';

interface DailyHubProps {
  accounts: BillAccount[];
  installments?: InstallmentPlan[];
  expenses?: ExpenseItem[];
  standingInstructions?: StandingInstruction[];
  schedule?: PaymentScheduleItem[];
  settings?: UserSettings;
  currency: CurrencyCode;
  quickPayTemplates?: QuickPayTemplate[];
  utilityBills?: UtilityBillItem[];
  onSelectQuickPayForPay?: (template: QuickPayTemplate) => void;
  onOpenManageQuickPay?: () => void;
  onOpenCreateQuickPay?: () => void;
  onQuickLogExpense: (data: {
    amount: number;
    title: string;
    category: ExpenseCategory;
    accountId: string;
    immediateSettle?: boolean;
  }) => void;
  onOpenReceiptCapture?: () => void;
  onOpenAIAdvisor?: () => void;
  onOpenBankAdvisor?: (accountId?: string) => void;
  onOpenUniversalQuickAdd?: (tab?: 'expense' | 'bank_balance' | 'account' | 'recurring') => void;
  onToggleScheduleStatus?: (scheduleId: string) => void;
  onImmediateSettleExpense?: (
    expenseId: string, 
    details: {
      method: SettlementMethod;
      amountSettled: number;
      sourceAccountId?: string;
      referenceCode: string;
    }
  ) => void;
  onBatchSettleUnsettled?: (expenseIds: string[]) => void;
  onClearUnsettledSwipes?: () => void;
  onSwitchTab?: (tab: 'today' | 'overview' | 'strategy' | 'expenses' | 'accounts' | 'utilities') => void;
  onDeleteExpense?: (expenseId: string) => void;
}

export const DailyHub: React.FC<DailyHubProps> = ({
  accounts = [],
  installments = [],
  expenses = [],
  standingInstructions = [],
  schedule = [],
  settings,
  currency,
  quickPayTemplates = [],
  utilityBills = [],
  onSelectQuickPayForPay,
  onOpenManageQuickPay,
  onOpenCreateQuickPay,
  onQuickLogExpense,
  onOpenReceiptCapture,
  onOpenAIAdvisor,
  onOpenBankAdvisor,
  onOpenUniversalQuickAdd,
  onToggleScheduleStatus,
  onImmediateSettleExpense,
  onBatchSettleUnsettled,
  onClearUnsettledSwipes,
  onSwitchTab,
  onDeleteExpense,
}) => {
  const currencyConfig = getCurrencyConfig(currency);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Auto-reset confirmDeleteId after 4s
  useEffect(() => {
    if (confirmDeleteId) {
      const timer = setTimeout(() => setConfirmDeleteId(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmDeleteId]);
  const tz = settings?.timezone;
  const todayDateStr = useMemo(() => getTodayDateStr(tz), [tz]);
  const currentDay = useMemo(() => getTodayDayOfMonth(tz), [tz]);
  const tzInfo = useMemo(() => getTimezoneDisplayInfo(tz), [tz]);

  // Inline Quick Log Form State
  const [quickAmount, setQuickAmount] = useState<string>('');
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickCategory, setQuickCategory] = useState<ExpenseCategory>('Dining & Groceries');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    // Default to the first credit card or bank account
    const firstCard = accounts.find((a) => a.type === 'credit_card' || a.type === 'ewallet_pay_later');
    return firstCard ? firstCard.id : accounts[0]?.id || '';
  });
  const [instantSettle, setInstantSettle] = useState(false);
  const [quickLogSuccess, setQuickLogSuccess] = useState<string | null>(null);
  const [swipesView, setSwipesView] = useState<'pending' | 'today'>('pending');

  // Daily Streak Counter (Calculated & Persisted)
  const streakDays = useMemo(() => {
    try {
      const stored = localStorage.getItem('billflow_daily_streak');
      const lastVisit = localStorage.getItem('billflow_last_visit_date');

      if (!stored || !lastVisit) {
        localStorage.setItem('billflow_daily_streak', '3');
        localStorage.setItem('billflow_last_visit_date', todayDateStr);
        return 3;
      }

      if (lastVisit === todayDateStr) {
        return parseInt(stored, 10) || 3;
      }

      const diffMs = parseDateOnly(todayDateStr) - parseDateOnly(lastVisit);
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        const next = (parseInt(stored, 10) || 1) + 1;
        localStorage.setItem('billflow_daily_streak', next.toString());
        localStorage.setItem('billflow_last_visit_date', todayDateStr);
        return next;
      } else {
        localStorage.setItem('billflow_daily_streak', '1');
        localStorage.setItem('billflow_last_visit_date', todayDateStr);
        return 1;
      }
    } catch {
      return 3;
    }
  }, [todayDateStr]);

  // Compute "Best Card to Swipe Today" based on cycle cutoffs & grace days
  const cardRecommendations = useMemo(() => {
    const cards = accounts.filter((a) => a.type === 'credit_card' || a.type === 'ewallet_pay_later');
    if (cards.length === 0) return null;

    const scored = cards.map((card) => {
      // Days until next statement cut
      let daysUntilCutoff = card.cycleDay - currentDay;
      if (daysUntilCutoff <= 0) {
        // Cutoff already passed this month; next cutoff is next month
        daysUntilCutoff += 30;
      }

      // Total interest-free float if swiped today:
      // = days until statement is generated + grace period days after statement
      const totalFloatDays = daysUntilCutoff + card.gracePeriodDays;

      return {
        card,
        daysUntilCutoff,
        totalFloatDays,
      };
    });

    // Sort by highest float days
    scored.sort((a, b) => b.totalFloatDays - a.totalFloatDays);

    return {
      best: scored[0],
      runnerUp: scored[1],
      all: scored,
    };
  }, [accounts, currentDay]);

  // Today's & Upcoming Actions (Bills due in 7 days or overdue)
  const urgentBills = useMemo(() => {
    return schedule.filter((item) => {
      return item.daysRemaining <= 7 && item.status !== 'paid';
    });
  }, [schedule]);

  // Today's logged expenses (filtered by user's timezone date)
  const todayExpenses = useMemo(() => {
    return expenses.filter((e) => e.date === todayDateStr);
  }, [expenses, todayDateStr]);

  const todaySpendTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Unsettled recent swipes (top 5)
  const pendingSwipes = useMemo(() => {
    return expenses.filter((e) => e.status === 'unsettled').slice(0, 5);
  }, [expenses]);

  // Handle Quick Submit
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(quickAmount);
    if (isNaN(num) || num <= 0) return;

    const chosenAccount = accounts.find((a) => a.id === selectedAccountId);
    const title = quickTitle.trim() || `${quickCategory} purchase`;

    onQuickLogExpense({
      amount: num,
      title,
      category: quickCategory,
      accountId: selectedAccountId,
      immediateSettle: instantSettle,
    });

    setQuickLogSuccess(`Logged ${formatCurrency(num, currency)} for "${title}" on ${chosenAccount?.name || 'card'}!`);
    setQuickAmount('');
    setQuickTitle('');
    setTimeout(() => setQuickLogSuccess(null), 4000);
  };

  // Quick Preset Click
  const handlePresetClick = (presetTitle: string, presetCategory: ExpenseCategory, presetAmount: number) => {
    setQuickTitle(presetTitle);
    setQuickCategory(presetCategory);
    setQuickAmount(presetAmount.toString());
  };

  const primaryBank = (settings?.primaryBankAccountId ? accounts.find((a) => a.id === settings.primaryBankAccountId) : null) || accounts.find((a) => a.type === 'bank_account');

  // Pending Utility Bills for Payment Advisor
  const pendingUtilityBills = useMemo(() => {
    return utilityBills.filter((b) => b.status !== 'paid');
  }, [utilityBills]);

  const totalPendingUtilityAmount = useMemo(() => {
    return pendingUtilityBills.reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [pendingUtilityBills]);

  return (
    <div className="space-y-6">
      {/* 1. DAILY BRIEFING & STREAK BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Recommendation Card: Best Card to Swipe Today */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                </span>
                <span className="text-xs uppercase tracking-wider font-bold text-indigo-300">
                  Daily Float Intelligence
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-xs text-slate-300 font-medium">
                  {tzInfo.currentDate}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-mono">
                  {tzInfo.offset}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Optimal Card to Swipe Today
              </h2>
            </div>

            {/* Streak Counter Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>{streakDays}-Day Streak</span>
            </div>
          </div>

          {cardRecommendations?.best ? (
            <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shrink-0"
                  style={{ backgroundColor: cardRecommendations.best.card.color }}
                >
                  {renderAccountIcon(cardRecommendations.best.card.type, 'w-6 h-6 text-white')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">
                      {cardRecommendations.best.card.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Best Option
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cycle closes in {cardRecommendations.best.daysUntilCutoff} days (Day {cardRecommendations.best.card.cycleDay}). Zero interest until next due date!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:border-l sm:border-slate-800 sm:pl-4">
                <div>
                  <div className="text-[11px] text-slate-400">Cash Float Window</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                    {cardRecommendations.best.totalFloatDays} Days
                  </div>
                  <div className="text-[10px] text-slate-400">Interest-Free</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAccountId(cardRecommendations.best.card.id);
                    // scroll to quick log
                    const el = document.getElementById('daily-quick-logger');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/25 cursor-pointer whitespace-nowrap"
                >
                  <span>Select & Swipe</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
              No active cards linked yet. Link a card to activate daily float maximization!
            </div>
          )}

          {cardRecommendations?.runnerUp && (
            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Alternative: <strong className="text-slate-200">{cardRecommendations.runnerUp.card.name}</strong> offers {cardRecommendations.runnerUp.totalFloatDays} days float.
              </span>
              <button
                type="button"
                onClick={() => onSwitchTab?.('strategy')}
                className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer text-[11px]"
              >
                <span>View Full Cycle Calendar</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Liquid Cash & Daily Position Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Liquid Cash Position
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {formatCurrency(primaryBank ? primaryBank.totalBalance : (settings?.allocatedCashForBills ?? 3500), currency)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {primaryBank ? `${primaryBank.name} liquid funds ready for settlement` : 'Designated monthly bill payment reserve'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Today's Logged Spend:</span>
              <span className="font-bold text-white font-mono">
                {formatCurrency(todaySpendTotal, currency)} ({todayExpenses.length} items)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Bills Due This Week:</span>
              <span className={`font-bold ${urgentBills.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {urgentBills.length} payment{urgentBills.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenBankAdvisor?.()}
                className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Bank Advisor</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenUniversalQuickAdd?.('bank_balance')}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                title="Update current bank balance"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE 1-ROW INLINE QUICK EXPENSE LOGGER (ELIMINATES FORM CLUTTER!) */}
      <div 
        id="daily-quick-logger"
        className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <span>Instant Daily Expense Logger</span>
              <span className="text-[10px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                Zero Modals • 1-Click
              </span>
            </h3>
          </div>

          {/* Quick Presets Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs scrollbar-none">
            <span className="text-[11px] text-slate-400 hidden sm:inline mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => handlePresetClick('Coffee / Breakfast', 'Dining & Groceries', 12)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
            >
              <Coffee className="w-3 h-3 text-amber-400" />
              <span>Coffee ({currencyConfig.symbol}12)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePresetClick('Lunch / Dinner', 'Dining & Groceries', 25)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
            >
              <Utensils className="w-3 h-3 text-emerald-400" />
              <span>Dining ({currencyConfig.symbol}25)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePresetClick('Petrol / Fuel', 'Vehicle & Fuel', 50)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
            >
              <Fuel className="w-3 h-3 text-blue-400" />
              <span>Fuel ({currencyConfig.symbol}50)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePresetClick('Groceries', 'Dining & Groceries', 100)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
            >
              <ShoppingBag className="w-3 h-3 text-purple-400" />
              <span>Groceries ({currencyConfig.symbol}100)</span>
            </button>
          </div>
        </div>

        {/* The 1-Row Form */}
        <form onSubmit={handleQuickSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Amount */}
            <div className="sm:col-span-3 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                {currencyConfig.symbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-4">
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="What was this expense for? (e.g. Starbucks, Petronas)"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Account Selector */}
            <div className="sm:col-span-3">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({getAccountTypeLabel(acc.type)})
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full h-full min-h-[42px] rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Log Swipe</span>
              </button>
            </div>
          </div>

          {/* Micro Options Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 text-slate-400">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={instantSettle}
                  onChange={(e) => setInstantSettle(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                />
                <span className="text-slate-300 text-[11px]">
                  Settle immediately from Bank Account (Zero Statement Balance)
                </span>
              </label>

              {/* Category selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Category:</span>
                <select
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value as ExpenseCategory)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Dining & Groceries">Dining & Groceries</option>
                  <option value="Vehicle & Fuel">Vehicle & Fuel</option>
                  <option value="Utilities (Electricity, Water, IWK)">Utilities</option>
                  <option value="Phone & Mobile">Phone & Mobile</option>
                  <option value="Shopping & Retail">Retail & Shopping</option>
                  <option value="Entertainment & Streaming">Entertainment</option>
                  <option value="Healthcare & Medical">Healthcare</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* OCR Receipt CTA shortcut */}
            <button
              type="button"
              onClick={onOpenReceiptCapture}
              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 cursor-pointer text-[11px] hover:underline"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              <span>Or Scan Receipt via AI OCR →</span>
            </button>
          </div>
        </form>

        {/* Feedback Message */}
        {quickLogSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-medium animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{quickLogSuccess}</span>
          </div>
        )}
      </div>

      {/* QUICK PAY TEMPLATES STRIP (Instant Recurring Bill Settlement) */}
      <QuickPayStrip
        templates={quickPayTemplates}
        accounts={accounts}
        currency={currency}
        onSelectForPay={(tpl) => onSelectQuickPayForPay?.(tpl)}
        onOpenManage={() => onOpenManageQuickPay?.()}
        onOpenCreate={() => onOpenCreateQuickPay?.()}
      />

      {/* UTILITY BILLS & SPAYLATER ROUTING STRIP */}
      {utilityBills.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/40 via-indigo-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-amber-500/25">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Monthly Utility Bills & Payment Advisor</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingUtilityBills.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Maximize interest-free periods (up to 55 days float) and cashback on TNB, Water, Telco & Internet bills using cards or SPayLater.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            {pendingUtilityBills.length > 0 && (
              <div className="text-right hidden md:block">
                <span className="text-[10px] text-slate-400 block">Pending Total</span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {formatCurrency(totalPendingUtilityAmount, currency)}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => onSwitchTab?.('utilities')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer whitespace-nowrap"
            >
              <span>Advise & Route Bills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. TODAY'S ACTION CHECKLIST & RECENT SWIPES (2-COLUMN GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Action Checklist - Due Soon or Need Attention */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">
                Payment Checklist (Due in 7 Days)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {urgentBills.length} Pending
            </span>
          </div>

          {urgentBills.length > 0 ? (
            <div className="space-y-2.5">
              {urgentBills.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/30 flex items-center justify-between gap-3 text-xs hover:border-amber-500/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      {renderAccountIcon(item.accountType, 'w-4 h-4 text-white')}
                    </div>
                    <div>
                      <div className="font-bold text-white">{item.accountName}</div>
                      <div className={`text-[11px] font-medium ${item.daysRemaining < 0 ? 'text-rose-400 font-bold' : item.daysRemaining <= 2 ? 'text-rose-300' : 'text-amber-400'}`}>
                        {item.daysRemaining < 0
                          ? `${Math.abs(item.daysRemaining)} day${Math.abs(item.daysRemaining) === 1 ? '' : 's'} overdue (${item.dueDate})`
                          : item.daysRemaining === 0
                          ? `Due Today (${item.dueDate})`
                          : item.daysRemaining === 1
                          ? `Due Tomorrow (${item.dueDate})`
                          : `Due in ${item.daysRemaining} days (${item.dueDate})`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono font-bold text-white">
                        {formatCurrency(item.amount, currency)}
                      </div>
                      <div className="text-[10px] text-slate-400">Statement Due</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleScheduleStatus?.(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Paid</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="font-bold text-slate-200 text-sm">All Clear for the Next 7 Days!</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No immediate credit card or BNPL statements due this week. Your cash remains in high-yield buffers earning interest.
              </p>
            </div>
          )}

          <div className="pt-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Upcoming Standing Instructions:</span>
            <span className="font-semibold text-slate-300">
              {standingInstructions.length} scheduled
            </span>
          </div>
        </div>

        {/* Column 2: Recent Swipes & Instant Settlement */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-400" />
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSwipesView('pending')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    swipesView === 'pending'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pending Swipes ({pendingSwipes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSwipesView('today')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    swipesView === 'today'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Today's Purchases ({todayExpenses.length})
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {swipesView === 'pending' && pendingSwipes.length > 0 && onBatchSettleUnsettled && (
                <button
                  type="button"
                  onClick={() => onBatchSettleUnsettled(pendingSwipes.map((p) => p.id))}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Settle all pending swipes via FPX"
                >
                  <Zap className="w-3 h-3 text-emerald-400 fill-current" />
                  <span>Settle All ({pendingSwipes.length})</span>
                </button>
              )}

              {swipesView === 'pending' && pendingSwipes.length > 0 && onClearUnsettledSwipes && (
                <button
                  type="button"
                  onClick={onClearUnsettledSwipes}
                  className="px-2 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Dismiss and purge all unsettled swipes"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span className="hidden sm:inline">Clear Swipes</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onSwitchTab?.('expenses')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer pl-1"
              >
                <span>All ({expenses.length})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {(() => {
            const activeDisplayList = swipesView === 'pending' ? pendingSwipes : todayExpenses;

            if (activeDisplayList.length === 0) {
              return (
                <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div className="font-bold text-slate-200 text-sm">
                    {swipesView === 'pending' ? 'All Swipes Settled!' : 'No Expenses Logged Today'}
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {swipesView === 'pending'
                      ? 'No pending unsettled card charges found. Your account is fully reconciled.'
                      : 'Use the quick form on the left to record daily coffee, dining, or fuel expenses.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-2.5">
                {activeDisplayList.map((expense) => {
                  const isSettled = expense.status === 'settled';
                  return (
                    <div
                      key={expense.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                          {getExpenseCategoryIcon(expense.category, 'w-4 h-4')}
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-white truncate">{expense.title}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span>{expense.accountName}</span>
                            <span>•</span>
                            <span>{expense.date}</span>
                            {expense.merchant && (
                              <>
                                <span>•</span>
                                <span className="text-slate-300">{expense.merchant}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="font-mono font-bold text-white">
                            {formatCurrency(expense.amount, currency)}
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                              isSettled
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isSettled ? 'Settled' : 'Unsettled'}
                          </span>
                        </div>

                        {!isSettled && (
                          <button
                            type="button"
                            onClick={() => {
                              onImmediateSettleExpense?.(expense.id, {
                                method: 'instant_fpx',
                                amountSettled: expense.amount,
                                sourceAccountId: primaryBank?.id,
                                referenceCode: `FPX-${Date.now().toString(36).toUpperCase()}`,
                              });
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Settle instantly from primary bank account"
                          >
                            <Zap className="w-3 h-3 text-emerald-400" />
                            <span className="hidden sm:inline">Settle</span>
                          </button>
                        )}

                        {onDeleteExpense && (
                          confirmDeleteId === expense.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteExpense(expense.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] animate-pulse transition-colors cursor-pointer shadow-md shadow-rose-900/50"
                              title="Confirm delete expense"
                            >
                              Delete?
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(expense.id)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 hover:border-rose-500/40 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete this daily expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
