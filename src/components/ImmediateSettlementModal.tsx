import React, { useState } from 'react';
import { 
  Zap, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  CreditCard, 
  Building2, 
  QrCode, 
  Banknote,
  Clock,
  Sparkles
} from 'lucide-react';
import { ExpenseItem, BillAccount, SettlementMethod } from '../types';
import { CurrencyCode, formatCurrency, getCurrencyConfig } from '../utils/currency';
import { 
  SETTLEMENT_METHODS_CONFIG, 
  getAccountTypeLabel, 
  calculateInterestSavedEstimate,
  renderAccountIcon 
} from '../utils/accountUtils';

interface ImmediateSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseItem | null;
  accounts: BillAccount[];
  onConfirmSettlement: (
    expenseId: string,
    settlementDetails: {
      method: SettlementMethod;
      amountSettled: number;
      sourceAccountId?: string;
      referenceCode: string;
      notes?: string;
    }
  ) => void;
  currency?: CurrencyCode;
}

export const ImmediateSettlementModal: React.FC<ImmediateSettlementModalProps> = ({
  isOpen,
  onClose,
  expense,
  accounts,
  onConfirmSettlement,
  currency = 'MYR',
}) => {
  const [method, setMethod] = useState<SettlementMethod>('instant_fpx');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [settlementAmount, setSettlementAmount] = useState<number>(expense ? expense.amount : 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customNotes, setCustomNotes] = useState('');

  // Update amount when expense changes
  React.useEffect(() => {
    if (expense) {
      setSettlementAmount(expense.amount);
      const bank = accounts.find((a) => a.type === 'bank_account');
      if (bank) {
        setSourceAccountId(bank.id);
      }
    }
  }, [expense, accounts]);

  if (!isOpen || !expense) return null;

  const currencyConfig = getCurrencyConfig(currency);
  const chargedAccount = accounts.find((a) => a.id === expense.accountId);
  const bankAccounts = accounts.filter((a) => a.type === 'bank_account');
  const apr = chargedAccount?.apr || 18.0;
  const interestSaved = calculateInterestSavedEstimate(
    settlementAmount,
    apr,
    chargedAccount?.gracePeriodDays || 25
  );

  const referenceCode = `STL-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const handleSettle = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onConfirmSettlement(expense.id, {
        method,
        amountSettled: settlementAmount,
        sourceAccountId: sourceAccountId || undefined,
        referenceCode,
        notes: customNotes || undefined,
      });
      setIsProcessing(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Immediate Purchase Settlement</h3>
              <p className="text-xs text-slate-400">Zero-debt payoff to clear balance before statement cut</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Expense Card */}
        <div className="p-3.5 rounded-xl border border-slate-700 bg-slate-800/60 space-y-2 text-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-bold text-white text-sm block">{expense.title}</span>
              <span className="text-[11px] text-slate-400">
                {expense.merchant || 'Direct Swipe'} • {expense.date}
              </span>
            </div>
            <div className="text-right">
              <span className="font-extrabold text-white text-base block">
                {formatCurrency(expense.amount, currency)}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                {expense.category}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              {renderAccountIcon(expense.accountType, 'w-3.5 h-3.5 text-indigo-400')}
              <span>{expense.accountName} ({getAccountTypeLabel(expense.accountType)})</span>
            </div>
            {chargedAccount && (
              <span className="text-amber-400 font-medium">
                {chargedAccount.apr}% APR
              </span>
            )}
          </div>
        </div>

        {/* Interest Savings Incentive Banner */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="leading-snug">
            <span className="font-bold text-white block">Immediate Settlement Benefit</span>
            <span>
              By clearing this swipe immediately, you avoid ~
              <strong className="text-emerald-300">{currencyConfig.symbol} {interestSaved.toFixed(2)}</strong> in potential interest charges while preserving 100% of card points!
            </span>
          </div>
        </div>

        {/* Settlement Form */}
        <div className="space-y-3.5 text-xs">
          {/* Method Selection */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">
              Settlement Payment Gateway
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {SETTLEMENT_METHODS_CONFIG.map((m) => {
                const isSelected = method === m.id;
                const IconComponent = m.icon;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/30 text-white'
                        : 'border-slate-800 bg-slate-850 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">{m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.description}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                      {m.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deduct from Bank Account Buffer (Optional) */}
          {bankAccounts.length > 0 && (
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">
                Fund from Linked Bank Account Buffer
              </label>
              <select
                value={sourceAccountId ?? ''}
                onChange={(e) => setSourceAccountId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">External FPX / Debit Card Clearing</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — Balance: {formatCurrency(b.totalBalance, currency)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reference Receipt Preview */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Settlement Voucher Ref:</span>
            <code className="font-mono text-indigo-300 font-bold">{referenceCode}</code>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-semibold cursor-pointer text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSettle}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-600/25 cursor-pointer flex items-center gap-2 text-xs"
          >
            {isProcessing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Clearing Transaction...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>Confirm Immediate Settlement ({formatCurrency(settlementAmount, currency)})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
