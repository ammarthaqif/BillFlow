import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  CheckCircle2, 
  Copy, 
  Check, 
  Building2, 
  CreditCard, 
  Wallet, 
  Calendar, 
  Receipt, 
  ArrowRight,
  Sparkles,
  Info,
  DollarSign
} from 'lucide-react';
import { QuickPayTemplate, BillAccount, SettlementMethod } from '../types';
import { CurrencyCode, formatCurrency, getCurrencyConfig } from '../utils/currency';
import { SETTLEMENT_METHODS_CONFIG, getExpenseCategoryIcon } from '../utils/accountUtils';

interface QuickPayExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: QuickPayTemplate | null;
  accounts: BillAccount[];
  currency: CurrencyCode | string;
  onExecute?: (
    template: QuickPayTemplate,
    executionDetails: {
      amount: number;
      sourceAccountId?: string;
      settlementMethod: SettlementMethod;
      referenceNumber: string;
      date: string;
      notes?: string;
    }
  ) => void;
  onExecuteSettlement?: (
    template: QuickPayTemplate,
    executionDetails: {
      amount: number;
      sourceAccountId?: string;
      settlementMethod: SettlementMethod;
      referenceNumber: string;
      date: string;
      notes?: string;
    }
  ) => void;
}

export const QuickPayExecuteModal: React.FC<QuickPayExecuteModalProps> = ({
  isOpen,
  onClose,
  template,
  accounts,
  currency,
  onExecute,
  onExecuteSettlement,
}) => {
  const currencyConfig = getCurrencyConfig(currency);
  const bankAccounts = accounts.filter((a) => a.type === 'bank_account');
  const allFundingAccounts = accounts.filter(
    (a) => a.type === 'bank_account' || a.type === 'credit_card' || a.type === 'ewallet_pay_later'
  );

  // Initial source account determination
  const defaultSourceAccount = 
    accounts.find((a) => a.id === template?.sourceAccountId) ||
    bankAccounts[0] ||
    accounts[0];

  const [amount, setAmount] = useState<number>(template?.defaultAmount ?? 0);
  const [amountInput, setAmountInput] = useState<string>((template?.defaultAmount ?? 0).toString());
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState<string>(defaultSourceAccount?.id || '');
  const [settlementMethod, setSettlementMethod] = useState<SettlementMethod>(template?.settlementMethod || 'jompay');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState<string>(
    () => `QP-${((template?.title || 'BILL')).replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'QP'}-${Date.now().toString(36).toUpperCase()}`
  );
  const [notes, setNotes] = useState<string>(template?.notes || (template ? `Settled via Quick Pay: ${template.title || 'Bill'}` : ''));
  const [copiedRef, setCopiedRef] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!template) return;
    const srcAcc = accounts.find((a) => a.id === template.sourceAccountId) || bankAccounts[0] || accounts[0];
    const defAmt = template.defaultAmount ?? 0;
    setAmount(defAmt);
    setAmountInput(defAmt.toString());
    setSelectedSourceAccountId(srcAcc?.id || '');
    setSettlementMethod(template.settlementMethod || 'jompay');
    setDate(new Date().toISOString().split('T')[0]);
    const safeTitle = (template.title || 'BILL').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'QP';
    setReferenceNumber(`QP-${safeTitle}-${Date.now().toString(36).toUpperCase()}`);
    setNotes(template.notes || `Settled via Quick Pay: ${template.title || 'Bill'}`);
    setCopiedRef(false);
  }, [template?.id]);

  if (!isOpen || !template) return null;

  const selectedSourceAccount = accounts.find((a) => a.id === selectedSourceAccountId);

  const handleAmountInputChange = (val: string) => {
    setAmountInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      setAmount(parsed);
    }
  };

  const adjustAmount = (delta: number) => {
    const newAmount = Math.max(0, Math.round((amount + delta) * 100) / 100);
    setAmount(newAmount);
    setAmountInput(newAmount.toString());
  };

  const resetAmount = () => {
    if (!template) return;
    const def = template.defaultAmount ?? 0;
    setAmount(def);
    setAmountInput(def.toString());
  };

  const handleCopyRef = () => {
    if (template?.beneficiaryAccountOrRef) {
      navigator.clipboard?.writeText(template.beneficiaryAccountOrRef);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !template) return;

    setIsSubmitting(true);
    try {
      const executeFn = onExecuteSettlement || onExecute;
      if (executeFn) {
        executeFn(template, {
          amount,
          sourceAccountId: selectedSourceAccountId || undefined,
          settlementMethod,
          referenceNumber: referenceNumber.trim() || `QP-${Date.now().toString(36).toUpperCase()}`,
          date,
          notes: notes.trim(),
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remaining balance calculation if paying from bank
  const isBankSource = selectedSourceAccount?.type === 'bank_account';
  const currentBankBalance = selectedSourceAccount?.totalBalance ?? 0;
  const postPaymentBankBalance = isBankSource ? Math.max(0, currentBankBalance - amount) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div 
        id="quick-pay-execute-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-6 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-slate-100">Quick Pay Settlement</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Fast Pay ⚡
                </span>
              </div>
              <p className="text-xs text-slate-400">
                1-Click recurring bill settlement with automatic ledger deduction
              </p>
            </div>
          </div>
          <button 
            id="close-quick-pay-execute-modal-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Beneficiary Card with Copy Action */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">
                  {getExpenseCategoryIcon(template.category, 'w-4 h-4')}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {template.title}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Used {template.usageCount || 0} times
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-base font-semibold text-slate-100">{template.beneficiary}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{template.beneficiaryAccountOrRef}</p>
              </div>
              <button
                type="button"
                id="copy-beneficiary-ref-btn"
                onClick={handleCopyRef}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-600/60"
                title="Copy Biller Code / Account Number"
              >
                {copiedRef ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Ref</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Amount Adjuster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Payment Amount ({currencyConfig.symbol})
              </label>
              <button
                type="button"
                id="reset-amount-to-default-btn"
                onClick={resetAmount}
                className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2"
              >
                Reset to default ({formatCurrency(template.defaultAmount, currency)})
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-semibold">
                {currencyConfig.symbol}
              </div>
              <input
                type="number"
                id="quick-pay-amount-input"
                step="0.01"
                min="0.01"
                value={amountInput}
                onChange={(e) => handleAmountInputChange(e.target.value)}
                onBlur={() => {
                  if (amountInput.trim() === '') {
                    const def = template?.defaultAmount ?? 0;
                    setAmountInput(def.toString());
                    setAmount(def);
                  }
                }}
                placeholder="0.00"
                required
                className="w-full pl-12 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-lg font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-mono"
              />
            </div>

            {/* Quick Adjustment Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 mr-1">Quick adjust:</span>
              {[-50, -10, +10, +50].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => adjustAmount(delta)}
                  className="px-2 py-0.5 rounded-md text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>

          {/* Source Funding Account */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Source Funding Account</span>
              {isBankSource && (
                <span className="text-[11px] text-emerald-400 font-normal flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Direct bank balance deduction
                </span>
              )}
            </label>
            <select
              id="quick-pay-source-account-select"
              value={selectedSourceAccountId}
              onChange={(e) => setSelectedSourceAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              {allFundingAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.institution}) — {acc.type === 'bank_account' ? `Balance: ${formatCurrency(acc.totalBalance, currency)}` : `Debt: ${formatCurrency(acc.statementBalance, currency)}`}
                </option>
              ))}
            </select>

            {/* Dynamic Bank Deduction Live Impact */}
            {isBankSource && selectedSourceAccount && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  Current: <strong className="text-slate-100">{formatCurrency(currentBankBalance, currency)}</strong>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">
                  After Pay: {formatCurrency(postPaymentBankBalance ?? 0, currency)}
                </span>
              </div>
            )}
          </div>

          {/* Settlement Method & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Settlement Method</label>
              <select
                id="quick-pay-method-select"
                value={settlementMethod}
                onChange={(e) => setSettlementMethod(e.target.value as SettlementMethod)}
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {SETTLEMENT_METHODS_CONFIG.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Settlement Date</label>
              <input
                type="date"
                id="quick-pay-date-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* Reference Number & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Receipt / Ref Code</label>
              <input
                type="text"
                id="quick-pay-ref-input"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. FPX-10291923"
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Notes (Optional)</label>
              <input
                type="text"
                id="quick-pay-notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid on time before cut-off"
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* Execution Banner */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Clicking <strong>Confirm & Settle</strong> instantly marks this bill as settled in your ledger, updates your bank balance, and logs payment history.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              id="cancel-quick-pay-execute-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-quick-pay-settle-btn"
              disabled={amount <= 0 || isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Confirm & Settle Now ({formatCurrency(amount, currency)})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
