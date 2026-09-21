import React, { useState, useMemo } from 'react';
import { 
  X, 
  CreditCard, 
  Wallet, 
  Building2, 
  CalendarClock, 
  Zap, 
  Plus, 
  Check, 
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Receipt,
  QrCode,
  Tag,
  CheckCircle2,
  Banknote,
  Gift,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { 
  BillAccount, 
  AccountType, 
  ExpenseCategory, 
  SettlementMethod, 
  PaymentMode,
  StandingInstruction,
  InstallmentPlan,
  UserProfile,
  ExpenseItem,
  QuickPayTemplate
} from '../types';
import { CurrencyCode, formatCurrency, getCurrencyConfig } from '../utils/currency';
import { recommendBestCardForPurchase } from '../utils/rewardsOptimizer';
import { 
  EXPENSE_CATEGORIES_LIST, 
  getExpenseCategoryIcon, 
  getAccountTypeLabel, 
  renderAccountIcon 
} from '../utils/accountUtils';

interface UniversalQuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BillAccount[];
  expenses?: ExpenseItem[];
  currency: CurrencyCode;
  currentUser: UserProfile | null;
  initialTab?: 'expense' | 'bank_balance' | 'account' | 'recurring';
  quickPayTemplates?: QuickPayTemplate[];
  onSaveQuickPayTemplate?: (template: QuickPayTemplate) => void;
  onSelectQuickPayForPay?: (template: QuickPayTemplate) => void;
  onAddExpense: (
    data: any, 
    immediateSettle?: { method: SettlementMethod; sourceAccountId?: string },
    installmentSplit?: { tenure: number; monthlyAmount: number; interestRate?: number }
  ) => void;
  onUpdateBankBalance: (accountId: string, newBalance: number) => void;
  onAddAccount: (acc: Omit<BillAccount, 'id' | 'apiSynced' | 'lastSyncedAt' | 'status' | 'accountNumberMask'>) => void;
  onAddStandingInstruction: (si: Omit<StandingInstruction, 'id' | 'createdAt'>) => void;
  onAddInstallment: (plan: Omit<InstallmentPlan, 'id'>) => void;
  onOpenReceiptCapture?: () => void;
}

export const UniversalQuickAddModal: React.FC<UniversalQuickAddModalProps> = ({
  isOpen,
  onClose,
  accounts = [],
  expenses = [],
  currency,
  currentUser,
  initialTab = 'expense',
  quickPayTemplates = [],
  onSaveQuickPayTemplate,
  onSelectQuickPayForPay,
  onAddExpense,
  onUpdateBankBalance,
  onAddAccount,
  onAddStandingInstruction,
  onAddInstallment,
  onOpenReceiptCapture,
}) => {
  const currencyConfig = getCurrencyConfig(currency);
  const [activeTab, setActiveTab] = useState<'expense' | 'bank_balance' | 'account' | 'recurring'>(initialTab);

  // TAB 1: EXPENSE STATE
  const bankAccounts = accounts.filter((a) => a.type === 'bank_account');
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Dining & Groceries');
  const [expPaymentMode, setExpPaymentMode] = useState<'credit_card' | 'bnpl' | 'duitnow_qr' | 'cash'>('credit_card');
  const [expAccountId, setExpAccountId] = useState(accounts[0]?.id || '');
  const [expLinkedBankId, setExpLinkedBankId] = useState(bankAccounts[0]?.id || '');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expImmediateSettle, setExpImmediateSettle] = useState(false);
  const [expSplitMonths, setExpSplitMonths] = useState<number>(1);
  const [expTags, setExpTags] = useState<string[]>([]);
  const [expCustomTagInput, setExpCustomTagInput] = useState('');
  const [saveAsQuickPay, setSaveAsQuickPay] = useState(false);
  const [quickPayBillerRef, setQuickPayBillerRef] = useState('');

  // Intelligent Rewards & Balancing Recommendation
  const numExpAmount = parseFloat(expAmount) || 0;
  const quickAddRecommendations = useMemo(() => {
    if (numExpAmount <= 0) return [];
    return recommendBestCardForPurchase({
      amount: numExpAmount,
      date: expDate,
      category: expCategory,
      accounts,
      expenses,
    });
  }, [numExpAmount, expDate, expCategory, accounts, expenses]);
  const topQuickRecommendation = quickAddRecommendations.length > 0 ? quickAddRecommendations[0] : null;

  // TAB 2: BANK BALANCE STATE
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || accounts[0]?.id || '');
  const currentSelectedBank = accounts.find((a) => a.id === selectedBankId);
  const [newBalanceInput, setNewBalanceInput] = useState(currentSelectedBank ? currentSelectedBank.totalBalance.toString() : '');

  // TAB 3: NEW ACCOUNT STATE
  const [accName, setAccName] = useState('');
  const [accInstitution, setAccInstitution] = useState('Maybank');
  const [accType, setAccType] = useState<AccountType>('credit_card');
  const [accTotalBalance, setAccTotalBalance] = useState('');
  const [accStatementBalance, setAccStatementBalance] = useState('');
  const [accCreditLimit, setAccCreditLimit] = useState('10000');
  const [accApr, setAccApr] = useState('15');
  const [accCycleDay, setAccCycleDay] = useState('18');
  const [accDueDay, setAccDueDay] = useState('8');
  const [accGraceDays, setAccGraceDays] = useState('20');
  const [accDueDate, setAccDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 20);
    return d.toISOString().split('T')[0];
  });
  const [accColor, setAccColor] = useState('#4f46e5');

  // Shared Credit Limit state (e.g. Maybank 2 Cards Amex + Visa)
  const [accIsSharedLimit, setAccIsSharedLimit] = useState(false);
  const [accSharedLimitGroupId, setAccSharedLimitGroupId] = useState('');
  const [accSharedLimitGroupName, setAccSharedLimitGroupName] = useState('');
  const [accSharedCreditLimit, setAccSharedCreditLimit] = useState('');
  const [accSelectedPairedCardId, setAccSelectedPairedCardId] = useState('');

  // TAB 4: RECURRING / INSTALLMENT STATE
  const [recurringType, setRecurringType] = useState<'standing_instruction' | 'installment'>('standing_instruction');
  const [recTitle, setRecTitle] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recTotalAmount, setRecTotalAmount] = useState('');
  const [recTenure, setRecTenure] = useState('6');
  const [recAccountId, setRecAccountId] = useState(accounts[0]?.id || '');
  const [recFrequency, setRecFrequency] = useState<'monthly' | 'weekly' | 'quarterly'>('monthly');
  const [recDueDate, setRecDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });

  const handleToggleTag = (tag: string) => {
    setExpTags((prev) => 
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = expCustomTagInput.trim();
    if (!clean) return;
    const formatted = clean.startsWith('#') ? clean : `#${clean}`;
    if (!expTags.includes(formatted)) {
      setExpTags((prev) => [...prev, formatted]);
    }
    setExpCustomTagInput('');
  };

  // SUBMIT HANDLERS
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expAmount);
    if (isNaN(amount) || amount <= 0) return;

    const isQRMode = expPaymentMode === 'duitnow_qr' || expCategory === 'QR Payment';
    const targetBank = accounts.find((a) => a.id === expLinkedBankId) || bankAccounts[0];
    const acc = isQRMode ? targetBank : accounts.find((a) => a.id === expAccountId);

    const isSettled = isQRMode || expImmediateSettle || expPaymentMode === 'cash';
    const settlementMethod: SettlementMethod = isQRMode ? 'duitnow_qr' : expPaymentMode === 'cash' ? 'instant_fpx' : 'instant_fpx';

    const immediate = isSettled ? {
      method: settlementMethod,
      sourceAccountId: isQRMode ? (targetBank?.id || expLinkedBankId) : bankAccounts[0]?.id,
    } : undefined;

    const installmentSplit = (!isSettled && expSplitMonths > 1) ? {
      tenure: expSplitMonths,
      monthlyAmount: Math.round((amount / expSplitMonths) * 100) / 100,
      interestRate: 0,
    } : undefined;

    onAddExpense(
      {
        accountId: isQRMode && targetBank ? targetBank.id : expAccountId,
        accountName: isQRMode && targetBank ? targetBank.name : (acc?.name || 'Account'),
        accountType: isQRMode ? 'bank_account' : (acc?.type || 'credit_card'),
        title: expTitle.trim() || `${expCategory} Purchase`,
        category: expCategory,
        amount,
        date: expDate,
        status: isSettled ? 'settled' : 'unsettled',
        paymentMode: isQRMode ? 'duitnow_qr' : expPaymentMode === 'bnpl' ? 'bnpl' : expPaymentMode === 'cash' ? 'cash' : 'credit_card',
        settlementMethod: isSettled ? settlementMethod : undefined,
        settledFromAccountId: isSettled ? (isQRMode ? targetBank?.id : bankAccounts[0]?.id) : undefined,
        tags: expTags.length > 0 ? expTags : undefined,
        ownerName: currentUser?.name,
        ownerRole: currentUser?.familyRole,
      },
      immediate,
      installmentSplit
    );

    // Save as Quick Pay Template if requested
    if (saveAsQuickPay && onSaveQuickPayTemplate) {
      const sourceAcc = isQRMode ? targetBank : accounts.find((a) => a.id === expAccountId);
      onSaveQuickPayTemplate({
        id: `qpt-${Date.now().toString(36)}`,
        title: expTitle.trim() || `${expCategory} Bill`,
        beneficiary: expTitle.trim() || `${expCategory} Biller`,
        beneficiaryAccountOrRef: quickPayBillerRef.trim() || 'Direct Account Transfer',
        defaultAmount: amount,
        category: expCategory,
        settlementMethod: isQRMode ? 'duitnow_qr' : 'instant_fpx',
        paymentMode: isQRMode ? 'duitnow_qr' : expPaymentMode === 'bnpl' ? 'bnpl' : expPaymentMode === 'cash' ? 'cash' : 'credit_card',
        sourceAccountId: isQRMode && targetBank ? targetBank.id : expAccountId,
        sourceAccountName: sourceAcc?.name,
        frequencyHint: 'monthly',
        usageCount: 1,
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ownerName: currentUser?.name,
        ownerRole: currentUser?.familyRole,
      });
    }

    onClose();
  };

  const handleBankBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newBalanceInput);
    if (isNaN(val) || val < 0) return;
    onUpdateBankBalance(selectedBankId, val);
    onClose();
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totBal = parseFloat(accTotalBalance) || 0;
    const stmtBal = parseFloat(accStatementBalance) || 0;
    const limit = parseFloat(accCreditLimit) || (accType === 'bank_account' ? 0 : 5000);
    const apr = parseFloat(accApr) || 0;
    const cycle = Math.min(31, Math.max(1, parseInt(accCycleDay, 10) || 18));
    const dueDayVal = Math.min(31, Math.max(1, parseInt(accDueDay, 10) || 8));
    const computedGrace = dueDayVal > cycle ? dueDayVal - cycle : (30 - cycle) + dueDayVal;
    const grace = parseInt(accGraceDays, 10) || computedGrace;

    const effectiveSharedLimit = parseFloat(accSharedCreditLimit) || limit;

    onAddAccount({
      name: accName.trim() || `${accInstitution} ${getAccountTypeLabel(accType)}`,
      institution: accInstitution,
      type: accType,
      color: accColor,
      totalBalance: totBal,
      currentBalance: accType === 'bank_account' ? totBal : undefined,
      statementBalance: stmtBal,
      creditLimit: accIsSharedLimit ? effectiveSharedLimit : limit,
      apr,
      lateFee: accType === 'credit_card' ? 10 : 0,
      cycleDay: cycle,
      dueDay: dueDayVal,
      gracePeriodDays: grace,
      dueDate: accDueDate || new Date(Date.now() + grace * 86400000).toISOString().split('T')[0],
      minPayment: Math.max(50, Math.round(stmtBal * 0.05)),
      isSharedLimit: accIsSharedLimit,
      sharedLimitGroupId: accIsSharedLimit 
        ? (accSharedLimitGroupId || `shared-${Date.now().toString(36)}`)
        : undefined,
      sharedLimitGroupName: accIsSharedLimit
        ? (accSharedLimitGroupName || `${accInstitution || 'Bank'} Combined Limit`)
        : undefined,
      sharedCreditLimit: accIsSharedLimit ? effectiveSharedLimit : undefined,
    });
    onClose();
  };

  const handleRecurringSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const acc = accounts.find((a) => a.id === recAccountId);

    if (recurringType === 'standing_instruction') {
      const amt = parseFloat(recAmount);
      if (isNaN(amt) || amt <= 0) return;

      onAddStandingInstruction({
        title: recTitle.trim() || 'Recurring Bill',
        billerOrRecipient: recTitle.trim() || 'Service Provider',
        category: 'Utilities (Electricity, Water, IWK)',
        amount: amt,
        frequency: recFrequency,
        nextExecutionDate: recDueDate,
        sourceAccountId: recAccountId,
        sourceAccountName: acc?.name || 'Account',
        method: acc?.type === 'credit_card' ? 'auto_card_charge' : 'auto_debit_bank',
        status: 'active',
        priority: 'medium',
        isCritical: false,
      });
    } else {
      const tot = parseFloat(recTotalAmount);
      const tenure = parseInt(recTenure, 10) || 6;
      if (isNaN(tot) || tot <= 0) return;

      const monthly = Math.round((tot / tenure) * 100) / 100;

      onAddInstallment({
        accountId: recAccountId,
        accountName: acc?.name || 'Account',
        title: recTitle.trim() || '0% Installment Plan',
        category: 'Electronics',
        totalAmount: tot,
        monthlyAmount: monthly,
        totalTenure: tenure,
        remainingTenure: tenure,
        interestRate: 0,
        startDate: new Date().toISOString().split('T')[0],
        nextBillingDate: recDueDate,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 p-0.5 flex items-center justify-center shadow-md">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Plus className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">Universal Quick Add</h2>
              <p className="text-xs text-slate-400">
                Log a daily swipe, update your bank balance, or add an account from one place.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="px-4 sm:px-5 pt-3 border-b border-slate-800 bg-slate-950/40 flex gap-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('expense')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'expense'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Log Expense / Swipe</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('bank_balance');
              if (currentSelectedBank) {
                setNewBalanceInput(currentSelectedBank.totalBalance.toString());
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bank_balance'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Update Bank Balance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'account'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Link Card / Account</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recurring')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'recurring'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Recurring & Installments</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB 1: LOG EXPENSE / SWIPE */}
          {activeTab === 'expense' && (
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              {/* QUICK PAY TEMPLATES: 1-Click Fast Fill for recurring bills */}
              {Array.isArray(quickPayTemplates) && quickPayTemplates.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 fill-amber-400" />
                      <span>Quick Pay Common Bill Templates:</span>
                    </span>
                    <span className="text-[10px] text-slate-400">1-click autofill</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {quickPayTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setExpTitle(tpl.title);
                          setExpAmount(tpl.defaultAmount.toString());
                          setExpCategory(tpl.category);
                          if (tpl.sourceAccountId) {
                            setExpAccountId(tpl.sourceAccountId);
                            setExpLinkedBankId(tpl.sourceAccountId);
                          }
                          if (tpl.paymentMode) {
                            setExpPaymentMode(tpl.paymentMode);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-slate-700/80 hover:border-amber-500/50 flex items-center gap-1.5 text-xs whitespace-nowrap transition-all cursor-pointer group"
                        title={`Fill ${tpl.title} (${tpl.beneficiary})`}
                      >
                        <span className="text-amber-400 group-hover:scale-110 transition-transform">⚡</span>
                        <span className="font-semibold text-slate-200 group-hover:text-amber-200">{tpl.title}</span>
                        <span className="font-mono text-slate-400 text-[11px]">
                          ({formatCurrency(tpl.defaultAmount, currency)})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SMART REWARDS & BALANCING CHIP */}
              {numExpAmount > 0 && topQuickRecommendation && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/40 shadow-sm flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          Recommended: {topQuickRecommendation.accountName}
                        </span>
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30">
                          {topQuickRecommendation.projectedEarnedDescription}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                        {topQuickRecommendation.reason}
                      </p>
                    </div>
                  </div>

                  {expAccountId === topQuickRecommendation.accountId ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setExpAccountId(topQuickRecommendation.accountId);
                        if (topQuickRecommendation.accountType === 'credit_card') {
                          setExpPaymentMode('credit_card');
                        } else if (topQuickRecommendation.accountType === 'ewallet_pay_later') {
                          setExpPaymentMode('bnpl');
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shrink-0 cursor-pointer transition-colors shadow-sm"
                    >
                      Use Card
                    </button>
                  )}
                </div>
              )}

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExpPaymentMode('credit_card');
                      setExpImmediateSettle(false);
                    }}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                      expPaymentMode === 'credit_card' && expCategory !== 'QR Payment'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-bold text-[11px] leading-tight">Credit Card</div>
                      <div className="text-[9px] text-slate-400">Statement float</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExpPaymentMode('duitnow_qr');
                      setExpImmediateSettle(true);
                      setExpCategory('QR Payment');
                    }}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                      expPaymentMode === 'duitnow_qr' || expCategory === 'QR Payment'
                        ? 'bg-pink-600/20 border-pink-500 text-white shadow-sm ring-1 ring-pink-500'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-pink-400 shrink-0" />
                    <div>
                      <div className="font-bold text-[11px] leading-tight">DuitNow / QR</div>
                      <div className="text-[9px] text-pink-300">Bank debit</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExpPaymentMode('bnpl');
                      setExpImmediateSettle(false);
                    }}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                      expPaymentMode === 'bnpl' && expCategory !== 'QR Payment'
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm ring-1 ring-purple-500'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold text-[11px] leading-tight">PayLater</div>
                      <div className="text-[9px] text-slate-400">SPay / Atome</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExpPaymentMode('cash');
                      setExpImmediateSettle(true);
                    }}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                      expPaymentMode === 'cash' && expCategory !== 'QR Payment'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-[11px] leading-tight">Direct Cash</div>
                      <div className="text-[9px] text-slate-400">Zero debt</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Amount ({currencyConfig.symbol}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      {currencyConfig.symbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold text-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {expPaymentMode === 'duitnow_qr' || expCategory === 'QR Payment'
                      ? 'Linked Bank Account (DuitNow Source) *'
                      : 'Charged Account / Card *'}
                  </label>
                  {expPaymentMode === 'duitnow_qr' || expCategory === 'QR Payment' ? (
                    <select
                      value={expLinkedBankId}
                      onChange={(e) => setExpLinkedBankId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-pink-500/50 text-white text-xs font-medium focus:border-pink-500 focus:outline-none ring-1 ring-pink-500/20"
                    >
                      {bankAccounts.length > 0 ? (
                        bankAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            🏦 {acc.name} ({acc.institution}) • {formatCurrency(acc.totalBalance, currency)}
                          </option>
                        ))
                      ) : (
                        accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({getAccountTypeLabel(acc.type)})
                          </option>
                        ))
                      )}
                    </select>
                  ) : (
                    <select
                      value={expAccountId}
                      onChange={(e) => setExpAccountId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:border-indigo-500 focus:outline-none"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({getAccountTypeLabel(acc.type)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* DuitNow QR Info Callout */}
              {(expPaymentMode === 'duitnow_qr' || expCategory === 'QR Payment') && (
                <div className="p-3 rounded-xl bg-pink-950/30 border border-pink-500/30 text-xs flex items-center justify-between text-pink-200">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>DuitNow QR Scan & Pay • Debits directly from your chosen bank balance. Zero credit card debt.</span>
                  </div>
                  <span className="text-[10px] font-bold bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                    Instant Debit
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Merchant *
                </label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder={expPaymentMode === 'duitnow_qr' ? 'e.g. Hawker Stall, Mamak, Family Mart QR' : 'e.g. Weekly Groceries, Fuel, Starbucks'}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => {
                      const val = e.target.value as ExpenseCategory;
                      setExpCategory(val);
                      if (val === 'QR Payment') {
                        setExpPaymentMode('duitnow_qr');
                        setExpImmediateSettle(true);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    {EXPENSE_CATEGORIES_LIST.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tags & Custom Labels */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Tags & Labels (Filter & Group)</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Optional</span>
                </div>

                {/* Suggested Quick Tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {['#business', '#vacation', '#tax-deductible', '#personal', '#family'].map((tag) => {
                    const active = expTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-bold'
                            : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        {tag} {active && '✓'}
                      </button>
                    );
                  })}
                </div>

                {/* Custom tag input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={expCustomTagInput}
                    onChange={(e) => setExpCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    placeholder="Type custom tag (e.g. #renovation) & press Enter"
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomTag()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {/* Active tags display if any custom */}
                {expTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {expTags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-[10px] font-semibold"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => handleToggleTag(t)}
                          className="hover:text-rose-400 cursor-pointer ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Settlement Options (for non-QR and non-cash) */}
              {expPaymentMode !== 'duitnow_qr' && expCategory !== 'QR Payment' && expPaymentMode !== 'cash' && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={expImmediateSettle}
                      onChange={(e) => {
                        setExpImmediateSettle(e.target.checked);
                        if (e.target.checked) setExpSplitMonths(1);
                      }}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-white">Settle immediately from Bank Account</span>
                      <span className="text-slate-400 block text-[11px]">
                        Deducts directly from liquid bank balance; zero statement debt created.
                      </span>
                    </div>
                  </label>

                  {!expImmediateSettle && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-300">Convert to 0% Installment Plan:</span>
                      <select
                        value={expSplitMonths}
                        onChange={(e) => setExpSplitMonths(parseInt(e.target.value, 10))}
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
                      >
                        <option value={1}>1 Month (Standard Statement)</option>
                        <option value={3}>3-Month Split (0%)</option>
                        <option value={6}>6-Month Split (0%)</option>
                        <option value={12}>12-Month Split (0%)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Pay Template Save Option */}
              {onSaveQuickPayTemplate && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-amber-500/20 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveAsQuickPay}
                      onChange={(e) => setSaveAsQuickPay(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>Save as Quick Pay Template</span>
                      </span>
                      <span className="text-slate-400 block text-[11px]">
                        Save this bill amount and beneficiary for 1-click settlement in future months.
                      </span>
                    </div>
                  </label>

                  {saveAsQuickPay && (
                    <div className="pt-2 border-t border-slate-800/80 animate-fadeIn">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Biller Account No. / JomPAY Biller Code / Reference
                      </label>
                      <input
                        type="text"
                        value={quickPayBillerRef}
                        onChange={(e) => setQuickPayBillerRef(e.target.value)}
                        placeholder="e.g. TNB Account 220019283921 or JomPAY Code 5454"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-3">
                {onOpenReceiptCapture && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenReceiptCapture();
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Upload Receipt via AI OCR instead</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="ml-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  Save & Log Expense
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: UPDATE BANK BALANCE */}
          {activeTab === 'bank_balance' && (
            <form onSubmit={handleBankBalanceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Bank Account *
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => {
                    setSelectedBankId(e.target.value);
                    const target = accounts.find((a) => a.id === e.target.value);
                    if (target) setNewBalanceInput(target.totalBalance.toString());
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:border-indigo-500 focus:outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({getAccountTypeLabel(acc.type)}) - Current: {formatCurrency(acc.totalBalance, currency)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Updated Liquid Balance ({currencyConfig.symbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    {currencyConfig.symbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newBalanceInput}
                    onChange={(e) => setNewBalanceInput(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-black text-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Amount Adjustment Buttons */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400">Quick Add:</span>
                {[+500, +1000, +2500, +5000].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(newBalanceInput) || 0;
                      setNewBalanceInput((cur + delta).toFixed(2));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold cursor-pointer border border-slate-700"
                  >
                    +{currencyConfig.symbol}{delta}
                  </button>
                ))}
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Liquid Balance</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LINK CARD / ACCOUNT */}
          {activeTab === 'account' && (
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    placeholder="e.g. Maybank 2 Gold Cards"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bank / Institution *
                  </label>
                  <input
                    type="text"
                    value={accInstitution}
                    onChange={(e) => setAccInstitution(e.target.value)}
                    placeholder="e.g. Maybank, CIMB, Public Bank, Grab"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Account Type *
                  </label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as AccountType)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="credit_card">Credit Card (Revolving Float)</option>
                    <option value="ewallet_pay_later">E-Wallet / BNPL (PayLater)</option>
                    <option value="bank_account">Savings / Current Account (Buffer)</option>
                    <option value="personal_loan">Personal Financing / Loan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {accType === 'bank_account' ? 'Available Balance' : 'Current Statement Balance'} ({currencyConfig.symbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accStatementBalance}
                    onChange={(e) => {
                      setAccStatementBalance(e.target.value);
                      if (accType === 'bank_account') setAccTotalBalance(e.target.value);
                    }}
                    placeholder="0.00"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono font-bold focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {accType !== 'bank_account' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Credit Limit</label>
                      <input
                        type="number"
                        value={accCreditLimit}
                        onChange={(e) => setAccCreditLimit(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Statement Day</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={accCycleDay}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAccCycleDay(val);
                          if (val.trim() === '') return;
                          const c = parseInt(val, 10);
                          if (!isNaN(c) && c >= 1 && c <= 31) {
                            const d = parseInt(accDueDay, 10) || 8;
                            const grace = d > c ? d - c : (30 - c) + d;
                            setAccGraceDays(String(grace));
                          }
                        }}
                        onBlur={() => {
                          let c = parseInt(accCycleDay, 10);
                          if (isNaN(c) || c < 1) c = 18;
                          if (c > 31) c = 31;
                          setAccCycleDay(String(c));
                          const d = parseInt(accDueDay, 10) || 8;
                          const grace = d > c ? d - c : (30 - c) + d;
                          setAccGraceDays(String(grace));
                        }}
                        placeholder="18"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/60 text-indigo-300 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Settlement Due Day</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={accDueDay}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAccDueDay(val);
                          if (val.trim() === '') return;
                          const d = parseInt(val, 10);
                          if (!isNaN(d) && d >= 1 && d <= 31) {
                            const c = parseInt(accCycleDay, 10) || 18;
                            const grace = d > c ? d - c : (30 - c) + d;
                            setAccGraceDays(String(grace));
                          }
                        }}
                        onBlur={() => {
                          let d = parseInt(accDueDay, 10);
                          if (isNaN(d) || d < 1) d = 8;
                          if (d > 31) d = 31;
                          setAccDueDay(String(d));
                          const c = parseInt(accCycleDay, 10) || 18;
                          const grace = d > c ? d - c : (30 - c) + d;
                          setAccGraceDays(String(grace));
                        }}
                        placeholder="8"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/60 text-amber-300 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Grace Float (Days)</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={accGraceDays}
                        onChange={(e) => setAccGraceDays(e.target.value)}
                        onBlur={() => {
                          let g = parseInt(accGraceDays, 10);
                          if (isNaN(g) || g < 1) g = 20;
                          if (g > 60) g = 60;
                          setAccGraceDays(String(g));
                        }}
                        placeholder="20"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/60 text-emerald-300 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Next Settlement Due Date</label>
                      <input
                        type="date"
                        value={accDueDate}
                        onChange={(e) => setAccDueDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">APR Rate (%)</label>
                      <input
                        type="number"
                        value={accApr}
                        onChange={(e) => setAccApr(e.target.value)}
                        placeholder="15"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>

                  {/* Shared Credit Limit Toggle (e.g. Maybank 2 Cards) */}
                  <div className="p-3 bg-slate-950/80 border border-amber-500/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          <span>Shares Credit Limit (e.g. Maybank 2 Cards Amex + Visa)</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Pool this card's limit with another card under one combined facility.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={accIsSharedLimit}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setAccIsSharedLimit(checked);
                            if (checked) {
                              if (!accSharedLimitGroupName) {
                                setAccSharedLimitGroupName(`${accInstitution || 'Maybank'} Combined Limit`);
                              }
                              if (!accSharedCreditLimit) {
                                setAccSharedCreditLimit(accCreditLimit || '12000');
                              }
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    {accIsSharedLimit && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-0.5">Pooled Credit Limit</label>
                          <input
                            type="number"
                            value={accSharedCreditLimit}
                            onChange={(e) => setAccSharedCreditLimit(e.target.value)}
                            placeholder="e.g. 12000"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-0.5">Shared Group Name</label>
                          <input
                            type="text"
                            value={accSharedLimitGroupName}
                            onChange={(e) => setAccSharedLimitGroupName(e.target.value)}
                            placeholder="e.g. Maybank 2 Cards"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  Link & Save Account
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: RECURRING & INSTALLMENTS */}
          {activeTab === 'recurring' && (
            <form onSubmit={handleRecurringSubmit} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setRecurringType('standing_instruction')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    recurringType === 'standing_instruction'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Recurring Standing Instruction
                </button>
                <button
                  type="button"
                  onClick={() => setRecurringType('installment')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    recurringType === 'installment'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  0% Multi-Month Installment
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Title / Plan Name *
                </label>
                <input
                  type="text"
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  placeholder={recurringType === 'standing_instruction' ? 'e.g. Unifi Broadband, TNB Electricity' : 'e.g. iPhone 16 Pro 0% Plan'}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {recurringType === 'standing_instruction' ? 'Recurring Amount' : 'Total Amount'} ({currencyConfig.symbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={recurringType === 'standing_instruction' ? recAmount : recTotalAmount}
                    onChange={(e) => {
                      if (recurringType === 'standing_instruction') setRecAmount(e.target.value);
                      else setRecTotalAmount(e.target.value);
                    }}
                    placeholder="0.00"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono font-bold focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Source Account / Card *
                  </label>
                  <select
                    value={recAccountId}
                    onChange={(e) => setRecAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({getAccountTypeLabel(acc.type)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {recurringType === 'installment' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tenure (Months)
                  </label>
                  <select
                    value={recTenure}
                    onChange={(e) => setRecTenure(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="3">3 Months (0% Interest)</option>
                    <option value="6">6 Months (0% Interest)</option>
                    <option value="12">12 Months (0% Interest)</option>
                    <option value="24">24 Months (0% Interest)</option>
                  </select>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  Create Plan
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
