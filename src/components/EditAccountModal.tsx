import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CreditCard, 
  Wallet, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Percent,
  Calendar,
  DollarSign
} from 'lucide-react';
import { BillAccount, AccountType } from '../types';
import { formatCurrency, CurrencyCode, getCurrencyConfig } from '../utils/currency';
import { getAccountTypeLabel, renderAccountIcon } from '../utils/accountUtils';

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: BillAccount | null;
  onUpdateAccount: (updatedAccount: BillAccount) => void;
  currency?: CurrencyCode | string;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  onClose,
  account,
  onUpdateAccount,
  currency = 'MYR',
}) => {
  const currencyConfig = getCurrencyConfig(currency);

  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [accountNumberMask, setAccountNumberMask] = useState('');
  const [statementBalance, setStatementBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [apr, setApr] = useState<number>(0);
  const [lateFee, setLateFee] = useState<number>(0);
  const [cycleDay, setCycleDay] = useState<number>(1);
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(25);
  const [dueDate, setDueDate] = useState('');
  const [minPayment, setMinPayment] = useState<number>(0);
  const [color, setColor] = useState('#4f46e5');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setName(account.name || '');
      setInstitution(account.institution || '');
      setAccountNumberMask(account.accountNumberMask || '');
      setStatementBalance(account.statementBalance || 0);
      setTotalBalance(account.totalBalance || 0);
      setCreditLimit(account.creditLimit || 0);
      setApr(account.apr || 0);
      setLateFee(account.lateFee || 0);
      setCycleDay(account.cycleDay || 1);
      setGracePeriodDays(account.gracePeriodDays || 25);
      setDueDate(account.dueDate || '');
      setMinPayment(account.minPayment || 0);
      setColor(account.color || '#4f46e5');
      setError(null);
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const isBank = account.type === 'bank_account';
  const isCard = account.type === 'credit_card';
  const isBnpl = account.type === 'ewallet_pay_later';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an account name.');
      return;
    }

    const updated: BillAccount = {
      ...account,
      name: name.trim(),
      institution: institution.trim() || account.institution,
      accountNumberMask: accountNumberMask.trim() || account.accountNumberMask,
      statementBalance: Math.max(0, Number(statementBalance) || 0),
      totalBalance: Math.max(0, Number(totalBalance) || 0),
      creditLimit: Math.max(0, Number(creditLimit) || 0),
      apr: Math.max(0, Number(apr) || 0),
      lateFee: Math.max(0, Number(lateFee) || 0),
      cycleDay: Math.min(31, Math.max(1, Number(cycleDay) || 1)),
      gracePeriodDays: Math.max(0, Number(gracePeriodDays) || 0),
      dueDate: dueDate || account.dueDate,
      minPayment: Math.max(0, Number(minPayment) || 0),
      color: color || account.color,
      lastSyncedAt: new Date().toISOString(),
    };

    onUpdateAccount(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 relative overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow"
              style={{ backgroundColor: color }}
            >
              {renderAccountIcon(account.type, 'w-5 h-5 text-white')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Update Account Details</h3>
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: `${color}25`, color }}
                >
                  {getAccountTypeLabel(account.type)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Modify balances, credit limits, cycle cutoffs, and penalty parameters.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Identity Fields */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maybank 2 Platinum"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Financial Institution</label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Maybank, CIMB, Grab"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mask / Account Number</label>
                <input
                  type="text"
                  value={accountNumberMask}
                  onChange={(e) => setAccountNumberMask(e.target.value)}
                  placeholder="•••• 1234"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Accent Theme Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-9 h-9 rounded-xl bg-transparent cursor-pointer border border-slate-700"
                  />
                  <span className="font-mono text-slate-400 uppercase">{color}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Balances & Limits */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Balances & Limits ({currencyConfig.code})</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {isBank ? 'Available Liquid Balance' : 'Total Outstanding Balance'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencyConfig.symbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={totalBalance}
                    onChange={(e) => setTotalBalance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {!isBank && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Current Statement Balance Due
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencyConfig.symbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={statementBalance}
                      onChange={(e) => setStatementBalance(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-amber-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {!isBank && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Approved Credit Limit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencyConfig.symbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Minimum Payment Required</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencyConfig.symbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={minPayment}
                      onChange={(e) => setMinPayment(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cycle & Penalties (For cards / BNPL) */}
          {!isBank && (
            <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Billing Cycle & Terms</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Cycle Cutoff Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={cycleDay}
                    onChange={(e) => setCycleDay(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Grace Period (Days)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">APR Interest (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={apr}
                    onChange={(e) => setApr(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Late Fee Penalty</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={lateFee}
                    onChange={(e) => setLateFee(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-rose-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Next Payment Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
