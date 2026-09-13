import React, { useState } from 'react';
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
  Receipt
} from 'lucide-react';
import { 
  BillAccount, 
  AccountType, 
  ExpenseCategory, 
  SettlementMethod, 
  PaymentMode,
  StandingInstruction,
  InstallmentPlan,
  UserProfile
} from '../types';
import { CurrencyCode, formatCurrency, getCurrencyConfig } from '../utils/currency';
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
  currency: CurrencyCode;
  currentUser: UserProfile | null;
  initialTab?: 'expense' | 'bank_balance' | 'account' | 'recurring';
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
  currency,
  currentUser,
  initialTab = 'expense',
  onAddExpense,
  onUpdateBankBalance,
  onAddAccount,
  onAddStandingInstruction,
  onAddInstallment,
  onOpenReceiptCapture,
}) => {
  if (!isOpen) return null;

  const currencyConfig = getCurrencyConfig(currency);
  const [activeTab, setActiveTab] = useState<'expense' | 'bank_balance' | 'account' | 'recurring'>(initialTab);

  // TAB 1: EXPENSE STATE
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Dining & Groceries');
  const [expAccountId, setExpAccountId] = useState(accounts[0]?.id || '');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expImmediateSettle, setExpImmediateSettle] = useState(false);
  const [expSplitMonths, setExpSplitMonths] = useState<number>(1);

  // TAB 2: BANK BALANCE STATE
  const bankAccounts = accounts.filter((a) => a.type === 'bank_account');
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
  const [accCycleDay, setAccCycleDay] = useState('15');
  const [accGraceDays, setAccGraceDays] = useState('20');
  const [accColor, setAccColor] = useState('#4f46e5');

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

  // SUBMIT HANDLERS
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expAmount);
    if (isNaN(amount) || amount <= 0) return;

    const acc = accounts.find((a) => a.id === expAccountId);
    const immediate = expImmediateSettle ? {
      method: 'instant_fpx' as SettlementMethod,
      sourceAccountId: bankAccounts[0]?.id,
    } : undefined;

    const installmentSplit = expSplitMonths > 1 ? {
      tenure: expSplitMonths,
      monthlyAmount: Math.round((amount / expSplitMonths) * 100) / 100,
      interestRate: 0,
    } : undefined;

    onAddExpense(
      {
        accountId: expAccountId,
        accountName: acc?.name || 'Account',
        accountType: acc?.type || 'credit_card',
        title: expTitle.trim() || `${expCategory} Purchase`,
        category: expCategory,
        amount,
        date: expDate,
        status: expImmediateSettle ? 'settled' : 'unsettled',
        paymentMode: acc?.type === 'ewallet_pay_later' ? 'bnpl' : acc?.type === 'bank_account' ? 'cash' : 'credit_card',
        settlementMethod: expImmediateSettle ? 'instant_fpx' : undefined,
        ownerName: currentUser?.name,
        ownerRole: currentUser?.familyRole,
      },
      immediate,
      installmentSplit
    );
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
    const cycle = parseInt(accCycleDay, 10) || 15;
    const grace = parseInt(accGraceDays, 10) || 20;

    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 25);

    onAddAccount({
      name: accName.trim() || `${accInstitution} ${getAccountTypeLabel(accType)}`,
      institution: accInstitution,
      type: accType,
      color: accColor,
      totalBalance: totBal,
      statementBalance: stmtBal,
      creditLimit: limit,
      apr,
      lateFee: accType === 'credit_card' ? 10 : 0,
      cycleDay: cycle,
      gracePeriodDays: grace,
      dueDate: nextDue.toISOString().split('T')[0],
      minPayment: Math.max(50, Math.round(stmtBal * 0.05)),
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
                    Charged Account / Card *
                  </label>
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
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Merchant *
                </label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Weekly Groceries, Fuel, Starbucks"
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
                    onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
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

              {/* Settlement Options */}
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
                    <label className="block font-semibold text-slate-300 mb-1">Cycle Cutoff Day</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={accCycleDay}
                      onChange={(e) => setAccCycleDay(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Grace Float (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={accGraceDays}
                      onChange={(e) => setAccGraceDays(e.target.value)}
                      placeholder="e.g. 20"
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
