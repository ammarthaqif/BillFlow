import React, { useState, useMemo } from 'react';
import {
  X,
  Landmark,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  DollarSign,
  Info,
  Layers,
  Wallet,
  Building2,
  Check,
  Trash2,
  PlayCircle
} from 'lucide-react';
import { 
  BillAccount, 
  UserSettings, 
  StandingInstruction, 
  BankScheduledTransaction,
  BankSettlementAdvice
} from '../types';
import { formatCurrency, CurrencyCode } from '../utils/currency';
import { 
  calculateBankSettlementAdvice, 
  getRecommendedSettlementDate, 
  getDaysBetween,
  getAllCardsReadinessSummary 
} from '../utils/bankAdvisor';
import { getTodayDateStr } from '../utils/timezone';

interface BankSettlementAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BillAccount[];
  settings: UserSettings;
  standingInstructions: StandingInstruction[];
  scheduledTransactions: BankScheduledTransaction[];
  initialSelectedAccountId?: string;
  onScheduleTransaction: (tx: Omit<BankScheduledTransaction, 'id' | 'createdAt'>) => void;
  onExecuteTransaction: (txId: string) => void;
  onCancelTransaction: (txId: string) => void;
  onOpenIncomeSettings: () => void;
  onImmediateSettleAccount?: (accountId: string, amount: number, sourceBankId: string) => void;
}

export const BankSettlementAdvisorModal: React.FC<BankSettlementAdvisorModalProps> = ({
  isOpen,
  onClose,
  accounts = [],
  settings,
  standingInstructions = [],
  scheduledTransactions = [],
  initialSelectedAccountId,
  onScheduleTransaction,
  onExecuteTransaction,
  onCancelTransaction,
  onOpenIncomeSettings,
  onImmediateSettleAccount,
}) => {
  const currency: CurrencyCode = settings?.currency || 'MYR';

  // Bank accounts
  const bankAccounts = useMemo(() => 
    (accounts || []).filter((a) => a.type === 'bank_account'),
    [accounts]
  );

  // Cards and BNPL accounts
  const payableAccounts = useMemo(() => 
    (accounts || []).filter((a) => a.type === 'credit_card' || a.type === 'ewallet_pay_later'),
    [accounts]
  );

  // Primary active tab: 'advisor' | 'scheduled_queue' | 'all_cards_matrix'
  const [activeTab, setActiveTab] = useState<'advisor' | 'scheduled_queue' | 'all_cards_matrix'>('advisor');

  // Selected target card/BNPL
  const [selectedTargetAccountId, setSelectedTargetAccountId] = useState<string>(() => {
    if (initialSelectedAccountId && payableAccounts.some(a => a.id === initialSelectedAccountId)) {
      return initialSelectedAccountId;
    }
    return payableAccounts[0]?.id || '';
  });

  // Selected funding bank account
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(() => {
    if (settings.primaryBankAccountId && bankAccounts.some(b => b.id === settings.primaryBankAccountId)) {
      return settings.primaryBankAccountId;
    }
    return bankAccounts[0]?.id || '';
  });

  // Settlement type: full_statement, minimum_due, custom
  const [settlementType, setSettlementType] = useState<'full_statement' | 'minimum_due' | 'custom'>('full_statement');
  const [customAmountInput, setCustomAmountInput] = useState<string>('');

  // Target settlement date (default to 2 days prior to due date)
  const selectedTargetAccount = useMemo(() => 
    payableAccounts.find((a) => a.id === selectedTargetAccountId) || payableAccounts[0],
    [payableAccounts, selectedTargetAccountId]
  );

  const selectedBankAccount = useMemo(() => 
    bankAccounts.find((b) => b.id === selectedBankAccountId) || bankAccounts[0],
    [bankAccounts, selectedBankAccountId]
  );

  const defaultRecommendedDate = useMemo(() => {
    if (selectedTargetAccount) {
      return getRecommendedSettlementDate(selectedTargetAccount.dueDate, 2);
    }
    return getTodayDateStr(settings?.timezone);
  }, [selectedTargetAccount, settings?.timezone]);

  const [settlementDate, setSettlementDate] = useState<string>(defaultRecommendedDate);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // When selectedTargetAccount changes, sync default recommended settlement date
  React.useEffect(() => {
    if (selectedTargetAccount) {
      setSettlementDate(getRecommendedSettlementDate(selectedTargetAccount.dueDate, 2));
      if (settlementType === 'custom') {
        setCustomAmountInput(selectedTargetAccount.statementBalance.toString());
      }
    }
  }, [selectedTargetAccount?.id]);

  // Sync initial account if prop changes
  React.useEffect(() => {
    if (initialSelectedAccountId && payableAccounts.some(a => a.id === initialSelectedAccountId)) {
      setSelectedTargetAccountId(initialSelectedAccountId);
    }
  }, [initialSelectedAccountId, payableAccounts]);

  // Compute Advice
  const advice: BankSettlementAdvice | null = useMemo(() => {
    if (!selectedTargetAccount || !selectedBankAccount) return null;

    const customAmount = settlementType === 'custom' ? parseFloat(customAmountInput) || 0 : undefined;

    return calculateBankSettlementAdvice(
      selectedTargetAccount,
      selectedBankAccount,
      settings,
      standingInstructions,
      scheduledTransactions,
      settlementDate,
      settlementType,
      customAmount,
      getTodayDateStr(settings?.timezone)
    );
  }, [
    selectedTargetAccount,
    selectedBankAccount,
    settings,
    standingInstructions,
    scheduledTransactions,
    settlementDate,
    settlementType,
    customAmountInput,
  ]);

  // Summary of all cards readiness
  const cardsSummary = useMemo(() => {
    if (!selectedBankAccount) return [];
    return getAllCardsReadinessSummary(
      accounts,
      selectedBankAccount,
      settings,
      standingInstructions,
      scheduledTransactions
    );
  }, [accounts, selectedBankAccount, settings, standingInstructions, scheduledTransactions]);

  if (!isOpen) return null;

  const handleScheduleConfirm = () => {
    if (!advice || !selectedTargetAccount || !selectedBankAccount) return;

    onScheduleTransaction({
      sourceBankAccountId: selectedBankAccount.id,
      sourceBankAccountName: selectedBankAccount.name,
      targetAccountId: selectedTargetAccount.id,
      targetAccountName: selectedTargetAccount.name,
      type: selectedTargetAccount.type === 'ewallet_pay_later' ? 'settlement_bnpl' : 'settlement_credit_card',
      title: `Statement Settlement: ${selectedTargetAccount.name}`,
      amount: advice.selectedAmountToSettle,
      scheduledDate: settlementDate,
      status: 'pending',
      notes: `Pre-due settlement scheduled ${advice.daysPriorToDueDate} days before due date (${selectedTargetAccount.dueDate}) to lock in 0% interest with zero fees.`,
      referenceNumber: `SCH-${Date.now().toString(36).toUpperCase()}`,
      ownerName: selectedTargetAccount.ownerName || 'Ammar (Husband)',
      ownerRole: selectedTargetAccount.ownerRole || 'husband',
    });

    setSuccessMessage(`Successfully scheduled bank transaction for ${formatCurrency(advice.selectedAmountToSettle, currency)} on ${settlementDate}!`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleImmediateSettle = () => {
    if (!advice || !selectedTargetAccount || !selectedBankAccount) return;
    if (onImmediateSettleAccount) {
      onImmediateSettleAccount(selectedTargetAccount.id, advice.selectedAmountToSettle, selectedBankAccount.id);
      setSuccessMessage(`Discharged statement of ${formatCurrency(advice.selectedAmountToSettle, currency)} from ${selectedBankAccount.name}!`);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Bank Settlement Advisor & Transaction Scheduler
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Pre-Due Optimization
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Calculates required bank liquidity and schedules pre-due payments to eliminate finance charges and late fees.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="bg-emerald-950/60 border-b border-emerald-500/30 p-3 px-5 flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('advisor')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
                activeTab === 'advisor'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Statement Advisor & Planner
            </button>
            <button
              onClick={() => setActiveTab('all_cards_matrix')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all_cards_matrix'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>All Statements Readiness</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {payableAccounts.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('scheduled_queue')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'scheduled_queue'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Scheduled with Bank</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {(scheduledTransactions || []).filter(t => t.status === 'pending').length}
              </span>
            </button>
          </div>

          {/* Quick Income Edit Button */}
          <button
            onClick={onOpenIncomeSettings}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/30 transition-all cursor-pointer mb-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Monthly Income: {formatCurrency(settings.monthlyIncome, currency)}</span>
            <ChevronRight className="w-3 h-3 opacity-60" />
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {activeTab === 'advisor' && selectedTargetAccount && selectedBankAccount && advice && (
            <div className="space-y-6">
              {/* Account Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Statement To Settle */}
                <div className="p-4 bg-slate-850/80 rounded-xl border border-slate-700/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-400" />
                      <span>Select Card or BNPL Statement</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20">
                      {selectedTargetAccount.type === 'ewallet_pay_later' ? 'BNPL Account' : 'Credit Card'}
                    </span>
                  </div>

                  <select
                    value={selectedTargetAccountId}
                    onChange={(e) => setSelectedTargetAccountId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
                  >
                    {payableAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} — Statement: {formatCurrency(acc.statementBalance, currency)} (Due {acc.dueDate})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Statement Balance</div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {formatCurrency(selectedTargetAccount.statementBalance, currency)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Due Date</div>
                      <div className="text-xs font-bold text-amber-400 mt-0.5">
                        {selectedTargetAccount.dueDate}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Min Payment</div>
                      <div className="text-xs font-bold text-slate-300 mt-0.5">
                        {formatCurrency(selectedTargetAccount.minPayment, currency)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Funding Bank Account */}
                <div className="p-4 bg-slate-850/80 rounded-xl border border-slate-700/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-emerald-400" />
                      <span>Funding Bank Account</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                      {selectedBankAccount.institution}
                    </span>
                  </div>

                  <select
                    value={selectedBankAccountId}
                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — Verified Balance: {formatCurrency(b.totalBalance, currency)}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Current Liquid</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5">
                        {formatCurrency(selectedBankAccount.totalBalance, currency)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Safety Buffer</div>
                      <div className="text-xs font-bold text-slate-300 mt-0.5">
                        {formatCurrency(settings.safetyBufferAmount ?? 300, currency)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Salary Deposit</div>
                      <div className="text-xs font-bold text-indigo-400 mt-0.5">
                        Day {settings.paycheckDates?.join('&') ?? '1&15'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settlement Configuration: Amount & Date */}
              <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Settlement Amount Choice */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                      <span>Amount to Settle</span>
                      <span className="text-xs font-bold text-emerald-400">
                        {formatCurrency(advice.selectedAmountToSettle, currency)}
                      </span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSettlementType('full_statement')}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                          settlementType === 'full_statement'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                        }`}
                      >
                        <div>Full Statement</div>
                        <div className="text-[10px] opacity-80 mt-0.5 font-normal">
                          {formatCurrency(selectedTargetAccount.statementBalance, currency, { decimals: 0 })}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettlementType('minimum_due')}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                          settlementType === 'minimum_due'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                        }`}
                      >
                        <div>Minimum Due</div>
                        <div className="text-[10px] opacity-80 mt-0.5 font-normal">
                          {formatCurrency(selectedTargetAccount.minPayment, currency, { decimals: 0 })}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSettlementType('custom');
                          if (!customAmountInput) {
                            setCustomAmountInput(selectedTargetAccount.statementBalance.toString());
                          }
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                          settlementType === 'custom'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                        }`}
                      >
                        <div>Custom</div>
                        <div className="text-[10px] opacity-80 mt-0.5 font-normal">Manual Input</div>
                      </button>
                    </div>

                    {settlementType === 'custom' && (
                      <div className="pt-2">
                        <input
                          type="number"
                          step="10"
                          min="1"
                          placeholder="Enter settlement amount"
                          value={customAmountInput ?? ''}
                          onChange={(e) => setCustomAmountInput(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Settlement Date Picker */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>Execution Date (Prior to Due Date)</span>
                      </label>
                      <span className="text-[11px] text-indigo-400 font-semibold">
                        {advice.daysPriorToDueDate} days before due ({selectedTargetAccount.dueDate})
                      </span>
                    </div>

                    <input
                      type="date"
                      value={settlementDate ?? ''}
                      onChange={(e) => setSettlementDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                    />

                    {/* Pre-due quick buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                      <span className="text-slate-400 text-[10px]">Optimal Timing:</span>
                      <button
                        type="button"
                        onClick={() => setSettlementDate(getRecommendedSettlementDate(selectedTargetAccount.dueDate, 3))}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        3 Days Prior (Buffer Max)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettlementDate(getRecommendedSettlementDate(selectedTargetAccount.dueDate, 2))}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        2 Days Prior (Recommended)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettlementDate(getRecommendedSettlementDate(selectedTargetAccount.dueDate, 1))}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        1 Day Prior (Grace Float)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* CORE ADVISOR OUTPUT CARD: Required Bank Balance */}
              <div className={`p-5 rounded-2xl border transition-all ${
                advice.status === 'sufficient'
                  ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                  : advice.status === 'tight_buffer'
                  ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40 shadow-lg shadow-amber-950/20'
                  : 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/40 shadow-lg shadow-rose-950/20'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Advisor Liquidity Verdict
                      </span>
                      {advice.status === 'sufficient' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <Check className="w-3 h-3" /> Fully Funded & Sufficient
                        </span>
                      )}
                      {advice.status === 'tight_buffer' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3" /> Tight Reserve Buffer
                        </span>
                      )}
                      {advice.status === 'shortfall' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" /> Liquidity Shortfall Warning
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      Target Settlement: <strong className="text-white">{formatCurrency(advice.selectedAmountToSettle, currency)}</strong> on <strong className="text-white">{advice.targetSettlementDate}</strong>
                    </div>
                  </div>

                  {/* Primary Required Bank Balance Metric */}
                  <div className="text-left sm:text-right">
                    <div className="text-[11px] font-semibold text-slate-400">
                      Required Bank Balance Today
                    </div>
                    <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
                      advice.status === 'shortfall' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {formatCurrency(advice.requiredBankBalanceToday, currency)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      (With {formatCurrency(advice.safetyBufferAmount, currency)} buffer: {formatCurrency(advice.requiredSafeBalanceWithBuffer, currency)})
                    </div>
                  </div>
                </div>

                {/* 4 Key Liquidity Columns */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Current in Bank</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {formatCurrency(advice.currentBankBalance, currency)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {selectedBankAccount.name}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Incoming Salary Paychecks</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      +{formatCurrency(advice.incomingPaychecksAmount, currency)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {advice.incomingPaychecksCount} drop(s) before due
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Other Committed Debits</div>
                    <div className="text-sm font-bold text-rose-400 mt-0.5">
                      -{formatCurrency(advice.committedOutflowsAmount, currency)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {advice.committedOutflowsCount} scheduled/SI before due
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Net Balance Surplus / Deficit</div>
                    <div className={`text-sm font-bold mt-0.5 ${
                      advice.netPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {advice.netPosition >= 0 ? '+' : ''}{formatCurrency(advice.netPosition, currency)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {advice.netPosition >= 0 ? 'Safety Surplus' : 'Top-up Needed'}
                    </div>
                  </div>
                </div>

                {/* Recommendations List */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Intelligent Liquidity Advice & Strategic Recommendations</span>
                  </div>
                  <div className="space-y-1.5">
                    {advice.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                          rec.type === 'positive'
                            ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-500/20'
                            : rec.type === 'warning'
                            ? 'bg-amber-950/40 text-amber-200 border border-amber-500/20'
                            : rec.type === 'action'
                            ? 'bg-indigo-950/40 text-indigo-200 border border-indigo-500/20'
                            : 'bg-slate-800/80 text-slate-300 border border-slate-700/50'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {rec.type === 'positive' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          {rec.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                          {rec.type === 'action' && <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />}
                          {rec.type === 'tip' && <Info className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <div className="text-[11px] leading-relaxed">{rec.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step-by-Step Chronological Cash Flow Timeline */}
              <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Chronological Bank Balance Projection (Through Settlement)</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Accounts for paycheck drops & committed auto-debits
                  </span>
                </div>

                <div className="space-y-2">
                  {advice.timeline.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        step.type === 'target_settlement'
                          ? 'bg-indigo-950/40 border-indigo-500/40 shadow-sm'
                          : step.type === 'paycheck_inflow'
                          ? 'bg-emerald-950/20 border-emerald-500/20'
                          : step.type === 'committed_outflow'
                          ? 'bg-rose-950/20 border-rose-500/20'
                          : 'bg-slate-800/60 border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                          {step.date}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <span>{step.title}</span>
                            {step.type === 'target_settlement' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500 text-white font-bold">
                                Target Action
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{step.description}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`font-bold ${
                          step.type === 'current_balance'
                            ? 'text-slate-300'
                            : step.amount > 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}>
                          {step.type !== 'current_balance' && (step.amount > 0 ? '+' : '')}
                          {formatCurrency(step.amount, currency)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Balance: <span className="font-bold text-slate-200">{formatCurrency(step.runningBalance, currency)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Schedule Transaction & Immediate Execute */}
              <div className="p-4 bg-slate-850 rounded-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  <div className="font-semibold text-white">Ready to secure this settlement?</div>
                  <div className="text-slate-400 text-[11px]">
                    Schedule auto-execution with your bank on {advice.targetSettlementDate} to preserve cash float.
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  {onImmediateSettleAccount && (
                    <button
                      type="button"
                      onClick={handleImmediateSettle}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                    >
                      Settle Today Now
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleScheduleConfirm}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Schedule with Bank ({advice.targetSettlementDate})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: All Cards Readiness Matrix */}
          {activeTab === 'all_cards_matrix' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-700 flex items-center justify-between text-xs">
                <div className="text-slate-300">
                  Evaluated using <strong className="text-white">{selectedBankAccount?.name}</strong> (Balance: {formatCurrency(selectedBankAccount?.totalBalance ?? 0, currency)}) and monthly income of <strong className="text-white">{formatCurrency(settings.monthlyIncome, currency)}</strong>.
                </div>
                <button
                  onClick={onOpenIncomeSettings}
                  className="text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  Adjust Income
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-850 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Card / BNPL Account</th>
                      <th className="p-3">Statement Balance</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Recommended Pay Date</th>
                      <th className="p-3">Required Bank Balance</th>
                      <th className="p-3">Liquidity Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {cardsSummary.map((item) => (
                      <tr key={item.account.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {item.account.type === 'credit_card' ? (
                              <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                            ) : (
                              <Wallet className="w-3.5 h-3.5 text-pink-400" />
                            )}
                            <span>{item.account.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{item.account.institution}</div>
                        </td>
                        <td className="p-3 font-semibold text-white">
                          {formatCurrency(item.statementBalance, currency)}
                        </td>
                        <td className="p-3 text-amber-400 font-medium">
                          {item.dueDate}
                          <div className="text-[10px] text-slate-400">{item.daysRemaining} days left</div>
                        </td>
                        <td className="p-3 text-indigo-300 font-medium">
                          {item.recommendedPayDate}
                          <div className="text-[10px] text-slate-400">2 days prior</div>
                        </td>
                        <td className="p-3 font-bold text-slate-200">
                          {formatCurrency(item.requiredBankBalance, currency)}
                        </td>
                        <td className="p-3">
                          {item.status === 'sufficient' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Sufficient
                            </span>
                          ) : item.status === 'tight_buffer' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Tight Buffer
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Shortfall {formatCurrency(item.shortfall, currency)}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTargetAccountId(item.account.id);
                              setActiveTab('advisor');
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                          >
                            Plan & Schedule
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Scheduled Bank Transactions Queue */}
          {activeTab === 'scheduled_queue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div className="text-slate-300">
                  Transactions scheduled with your bank for auto-execution prior to statement due dates.
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('advisor')}
                  className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  + Schedule New Settlement
                </button>
              </div>

              {scheduledTransactions.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-xs font-semibold text-slate-300">No Scheduled Transactions Yet</div>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Use the Statement Advisor tab to schedule payments 2-3 days before statement due dates.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {scheduledTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 bg-slate-850 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{tx.title}</span>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-semibold border ${
                              tx.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : tx.status === 'executed'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-700/40 text-slate-400 border-slate-600'
                            }`}>
                              {tx.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Funding Bank: <span className="text-slate-300">{tx.sourceBankAccountName}</span> • Scheduled Date: <strong className="text-indigo-400">{tx.scheduledDate}</strong>
                          </div>
                          {tx.notes && (
                            <div className="text-[10px] text-slate-400 mt-1 italic">
                              "{tx.notes}"
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700">
                        <div className="text-right">
                          <div className="font-bold text-white text-sm">
                            {formatCurrency(tx.amount, currency)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Ref: {tx.referenceNumber || tx.id}
                          </div>
                        </div>

                        {tx.status === 'pending' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onExecuteTransaction(tx.id)}
                              title="Execute transaction immediately"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>Execute Now</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onCancelTransaction(tx.id)}
                              title="Cancel scheduled transaction"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Bank-grade calculation ensures 0% interest and positive liquidity reserves.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
