import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  X, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { BillAccount } from '../types';
import { formatCurrency, CurrencyCode, getCurrencyConfig } from '../utils/currency';

interface UpdateBankBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BillAccount[];
  selectedAccountId?: string;
  onUpdateBalance: (accountId: string, newBalance: number, details?: Partial<BillAccount>) => void;
  currency?: CurrencyCode | string;
}

export const UpdateBankBalanceModal: React.FC<UpdateBankBalanceModalProps> = ({
  isOpen,
  onClose,
  bankAccounts = [],
  selectedAccountId,
  onUpdateBalance,
  currency = 'MYR',
}) => {
  const currencyConfig = getCurrencyConfig(currency);

  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    if (selectedAccountId && bankAccounts.some((b) => b.id === selectedAccountId)) {
      return selectedAccountId;
    }
    return bankAccounts[0]?.id || '';
  });

  const currentAccount = bankAccounts.find((b) => b.id === activeAccountId) || bankAccounts[0];

  // Mode: 'set' (direct balance input), 'deposit' (add funds), 'withdraw' (deduct funds)
  const [mode, setMode] = useState<'set' | 'deposit' | 'withdraw'>('set');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [institution, setInstitution] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [accountMask, setAccountMask] = useState<string>('');
  const [showDetailsEdit, setShowDetailsEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when active account changes
  useEffect(() => {
    if (currentAccount) {
      setInputAmount(currentAccount.totalBalance.toString());
      setInstitution(currentAccount.institution || '');
      setAccountName(currentAccount.name || '');
      setAccountMask(currentAccount.accountNumberMask || '');
      setError(null);
    }
  }, [activeAccountId, currentAccount]);

  useEffect(() => {
    if (selectedAccountId && bankAccounts.some((b) => b.id === selectedAccountId)) {
      setActiveAccountId(selectedAccountId);
    }
  }, [selectedAccountId, bankAccounts]);

  if (!isOpen) return null;

  if (bankAccounts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No Bank Accounts Found</h3>
          <p className="text-xs text-slate-400">
            Please link a bank account (e.g. Maybank Savings, CIMB Current) first to update its available liquid balance.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentBal = currentAccount ? currentAccount.totalBalance : 0;
  const parsedAmount = parseFloat(inputAmount) || 0;

  // Calculate resulting balance based on selected mode
  let resultingBalance = currentBal;
  if (mode === 'set') {
    resultingBalance = parsedAmount;
  } else if (mode === 'deposit') {
    resultingBalance = currentBal + parsedAmount;
  } else if (mode === 'withdraw') {
    resultingBalance = Math.max(0, currentBal - parsedAmount);
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Please enter a valid non-negative amount.');
      return;
    }

    if (resultingBalance < 0) {
      setError('Resulting balance cannot be negative.');
      return;
    }

    if (!currentAccount) return;

    const detailsToUpdate: Partial<BillAccount> = {};
    if (showDetailsEdit) {
      if (accountName.trim()) detailsToUpdate.name = accountName.trim();
      if (institution.trim()) detailsToUpdate.institution = institution.trim();
      if (accountMask.trim()) detailsToUpdate.accountNumberMask = accountMask.trim();
    }

    onUpdateBalance(currentAccount.id, Math.round(resultingBalance * 100) / 100, detailsToUpdate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Update Bank Account Balance</h3>
              <p className="text-xs text-slate-400">
                Adjust liquid cash reserves to calibrate settlement readiness and safety buffers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Account Selector if multiple */}
          {bankAccounts.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Bank Account
              </label>
              <div className="grid grid-cols-2 gap-2">
                {bankAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setActiveAccountId(acc.id);
                      setMode('set');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      acc.id === activeAccountId
                        ? 'border-emerald-500 bg-emerald-950/40 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs truncate text-white">{acc.name}</span>
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                      {formatCurrency(acc.totalBalance, currency)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current Balance Summary Box */}
          {currentAccount && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Currently Verified Balance</span>
                <div className="text-lg font-black text-white">
                  {formatCurrency(currentAccount.totalBalance, currency)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {currentAccount.institution} • {currentAccount.accountNumberMask}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-medium">Last Verified</span>
                <div className="text-xs text-slate-300 flex items-center gap-1 justify-end mt-0.5">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>
                    {currentAccount.lastSyncedAt
                      ? new Date(currentAccount.lastSyncedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Recently'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Update Mode Tabs */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Adjustment Mode
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('set');
                  if (currentAccount) setInputAmount(currentAccount.totalBalance.toString());
                }}
                className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'set'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Exact Balance</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('deposit');
                  setInputAmount('');
                }}
                className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'deposit'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Deposit (+)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('withdraw');
                  setInputAmount('');
                }}
                className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'withdraw'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Withdraw (-)</span>
              </button>
            </div>
          </div>

          {/* Input Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                {mode === 'set'
                  ? 'New Exact Account Balance'
                  : mode === 'deposit'
                  ? 'Deposit / Credit Amount'
                  : 'Withdrawal / Debit Amount'}
              </label>
              <span className="text-[10px] text-slate-400">
                {currencyConfig.code} ({currencyConfig.symbol})
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">
                {currencyConfig.symbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={inputAmount}
                onChange={(e) => {
                  setInputAmount(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-700/90 rounded-xl pl-12 pr-4 py-2.5 text-white font-mono text-base font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Quick Increment Pill Chips (for deposit or withdraw) */}
          {(mode === 'deposit' || mode === 'withdraw') && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {[100, 500, 1000, 2500, 5000].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setInputAmount(inc.toString())}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  +{currencyConfig.symbol} {inc}
                </button>
              ))}
            </div>
          )}

          {/* Calculation Preview Result Box */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 text-[11px]">Updated Balance Preview</span>
              <div className="font-bold text-slate-300 text-xs">
                {mode === 'set'
                  ? 'Manual balance adjustment'
                  : mode === 'deposit'
                  ? `+${formatCurrency(parsedAmount, currency)} added to funds`
                  : `-${formatCurrency(parsedAmount, currency)} deducted from funds`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-black text-emerald-400 font-mono">
                {formatCurrency(resultingBalance, currency)}
              </div>
              <div className="text-[10px] text-slate-500">Available Liquid Cash</div>
            </div>
          </div>

          {/* Optional Details Editor Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDetailsEdit(!showDetailsEdit)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer transition-colors"
            >
              {showDetailsEdit ? 'Hide Bank Details' : 'Edit Account Name or Institution'}
            </button>

            {showDetailsEdit && (
              <div className="mt-2.5 p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Account Display Name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Maybank Premier Savings"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Institution</label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g. Maybank"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Mask / Account Last 4</label>
                    <input
                      type="text"
                      value={accountMask}
                      onChange={(e) => setAccountMask(e.target.value)}
                      placeholder="•••• 4892"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Updated Balance</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
