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
  DollarSign,
  Layers,
  Clock,
  Info,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { BillAccount, AccountType } from '../types';
import { formatCurrency, CurrencyCode, getCurrencyConfig } from '../utils/currency';
import { getAccountTypeLabel, renderAccountIcon } from '../utils/accountUtils';

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: BillAccount | null;
  allAccounts?: BillAccount[];
  onUpdateAccount?: (updatedAccount: BillAccount) => void;
  onSave?: (updatedAccount: BillAccount) => void;
  onDelete?: (accountId: string) => void;
  currency?: CurrencyCode | string;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  onClose,
  account,
  allAccounts = [],
  onUpdateAccount,
  onSave,
  onDelete,
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
  const [cycleDayInput, setCycleDayInput] = useState<string>('18');
  const [dueDayInput, setDueDayInput] = useState<string>('8');
  const [gracePeriodDaysInput, setGracePeriodDaysInput] = useState<string>('20');
  const [dueDate, setDueDate] = useState('');
  const [minPayment, setMinPayment] = useState<number>(0);
  const [color, setColor] = useState('#4f46e5');
  const [error, setError] = useState<string | null>(null);

  // Shared credit limit states (e.g. Maybank 2 Cards Amex & Visa)
  const [isSharedLimit, setIsSharedLimit] = useState<boolean>(false);
  const [sharedLimitGroupId, setSharedLimitGroupId] = useState<string>('');
  const [sharedLimitGroupName, setSharedLimitGroupName] = useState<string>('');
  const [sharedCreditLimit, setSharedCreditLimit] = useState<number>(0);
  const [selectedPairedCardId, setSelectedPairedCardId] = useState<string>('');

  // Helper to calculate next upcoming due date from a day-of-month (1-31)
  const calculateNextDueDate = (targetDay: number) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();

    let targetMonth = currentMonth;
    let targetYear = currentYear;
    if (currentDate > targetDay) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }
    const safeDay = Math.min(targetDay, 28); // safe day representation
    const d = new Date(targetYear, targetMonth, safeDay);
    return d.toISOString().split('T')[0];
  };

  // Helper to compute float days between cycle issue day and due day
  const computeGraceFloat = (cycle: number, due: number) => {
    if (due > cycle) {
      return due - cycle;
    } else {
      return (30 - cycle) + due;
    }
  };

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
      
      const cDay = account.cycleDay || 18;
      setCycleDayInput(String(cDay));

      // Determine due day
      let initialDueDay = account.dueDay;
      if (!initialDueDay && account.dueDate) {
        const parts = account.dueDate.split('-');
        if (parts.length === 3) {
          initialDueDay = parseInt(parts[2], 10);
        }
      }
      if (!initialDueDay) {
        initialDueDay = Math.min(31, ((cDay + (account.gracePeriodDays || 20) - 1) % 30) + 1);
      }
      setDueDayInput(String(initialDueDay));
      const initialGrace = account.gracePeriodDays || computeGraceFloat(cDay, initialDueDay);
      setGracePeriodDaysInput(String(initialGrace));
      setDueDate(account.dueDate || calculateNextDueDate(initialDueDay));

      setMinPayment(account.minPayment || 0);
      setColor(account.color || '#4f46e5');

      // Shared limit setup
      const hasShared = !!account.isSharedLimit;
      setIsSharedLimit(hasShared);
      setSharedLimitGroupId(account.sharedLimitGroupId || (hasShared ? `group-${account.id}` : ''));
      setSharedLimitGroupName(account.sharedLimitGroupName || (hasShared ? `${account.institution || 'Bank'} Combined Limit` : ''));
      setSharedCreditLimit(account.sharedCreditLimit || account.creditLimit || 0);

      // Look for paired card in the same shared limit group
      if (hasShared && account.sharedLimitGroupId && allAccounts.length > 0) {
        const paired = allAccounts.find(
          (a) => a.id !== account.id && a.isSharedLimit && a.sharedLimitGroupId === account.sharedLimitGroupId
        );
        if (paired) {
          setSelectedPairedCardId(paired.id);
        }
      }

      setError(null);
    }
  }, [account, allAccounts]);

  if (!isOpen || !account) return null;

  const isBank = account.type === 'bank_account';
  const isCard = account.type === 'credit_card';
  const isBnpl = account.type === 'ewallet_pay_later';

  // Sibling cards available to link for shared credit limits
  const otherCreditCards = allAccounts.filter(
    (a) => a.id !== account.id && (a.type === 'credit_card' || a.type === 'ewallet_pay_later')
  );

  // When user updates cycleDay (statement issue day)
  const handleCycleDayChange = (raw: string) => {
    setCycleDayInput(raw);
    if (raw.trim() === '') return;
    const c = parseInt(raw, 10);
    if (!isNaN(c) && c >= 1 && c <= 31) {
      const d = parseInt(dueDayInput, 10);
      if (!isNaN(d) && d >= 1 && d <= 31) {
        const float = computeGraceFloat(c, d);
        setGracePeriodDaysInput(String(float));
      }
    }
  };

  const handleCycleDayBlur = () => {
    let c = parseInt(cycleDayInput, 10);
    if (isNaN(c) || c < 1) c = 1;
    if (c > 31) c = 31;
    setCycleDayInput(String(c));
    const d = parseInt(dueDayInput, 10) || 8;
    const float = computeGraceFloat(c, d);
    setGracePeriodDaysInput(String(float));
  };

  // When user updates dueDay (settlement due day)
  const handleDueDayChange = (raw: string) => {
    setDueDayInput(raw);
    if (raw.trim() === '') return;
    const d = parseInt(raw, 10);
    if (!isNaN(d) && d >= 1 && d <= 31) {
      const c = parseInt(cycleDayInput, 10);
      if (!isNaN(c) && c >= 1 && c <= 31) {
        const float = computeGraceFloat(c, d);
        setGracePeriodDaysInput(String(float));
      }
      setDueDate(calculateNextDueDate(d));
    }
  };

  const handleDueDayBlur = () => {
    let d = parseInt(dueDayInput, 10);
    if (isNaN(d) || d < 1) d = 1;
    if (d > 31) d = 31;
    setDueDayInput(String(d));
    const c = parseInt(cycleDayInput, 10) || 18;
    const float = computeGraceFloat(c, d);
    setGracePeriodDaysInput(String(float));
    setDueDate(calculateNextDueDate(d));
  };

  // When user updates dueDate directly
  const handleDueDateChange = (newDateStr: string) => {
    setDueDate(newDateStr);
    const parts = newDateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        setDueDayInput(String(day));
        const c = parseInt(cycleDayInput, 10) || 18;
        setGracePeriodDaysInput(String(computeGraceFloat(c, day)));
      }
    }
  };

  // When user updates gracePeriodDays directly
  const handleGraceDaysChange = (raw: string) => {
    setGracePeriodDaysInput(raw);
    if (raw.trim() === '') return;
    const g = parseInt(raw, 10);
    if (!isNaN(g) && g >= 1 && g <= 60) {
      const c = parseInt(cycleDayInput, 10) || 18;
      const calculatedDue = ((c + g - 1) % 30) + 1;
      setDueDayInput(String(calculatedDue));
      setDueDate(calculateNextDueDate(calculatedDue));
    }
  };

  const handleGraceDaysBlur = () => {
    let g = parseInt(gracePeriodDaysInput, 10);
    if (isNaN(g) || g < 1) g = 20;
    if (g > 60) g = 60;
    setGracePeriodDaysInput(String(g));
    const c = parseInt(cycleDayInput, 10) || 18;
    const calculatedDue = ((c + g - 1) % 30) + 1;
    setDueDayInput(String(calculatedDue));
    setDueDate(calculateNextDueDate(calculatedDue));
  };

  // Handle paired card selection for shared credit limits
  const handleSelectPairedCard = (pairedId: string) => {
    setSelectedPairedCardId(pairedId);
    if (!pairedId) return;

    const paired = allAccounts.find((a) => a.id === pairedId);
    if (paired) {
      const gId = paired.sharedLimitGroupId || `shared-${paired.id.slice(0, 8)}`;
      setSharedLimitGroupId(gId);
      const gName = paired.sharedLimitGroupName || `${account.institution || paired.institution} 2 Cards Combined Limit`;
      setSharedLimitGroupName(gName);
      const limit = paired.sharedCreditLimit || paired.creditLimit || creditLimit;
      setSharedCreditLimit(limit);
      setCreditLimit(limit);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an account name.');
      return;
    }

    const effectiveLimit = isSharedLimit ? (sharedCreditLimit || creditLimit) : creditLimit;

    const updated: BillAccount = {
      ...account,
      name: name.trim(),
      institution: institution.trim() || account.institution,
      accountNumberMask: accountNumberMask.trim() || account.accountNumberMask,
      statementBalance: Math.max(0, Number(statementBalance) || 0),
      totalBalance: Math.max(0, Number(totalBalance) || 0),
      currentBalance: isBank ? Math.max(0, Number(totalBalance) || 0) : undefined,
      creditLimit: Math.max(0, Number(effectiveLimit) || 0),
      apr: Math.max(0, Number(apr) || 0),
      lateFee: Math.max(0, Number(lateFee) || 0),
      cycleDay: Math.min(31, Math.max(1, parseInt(cycleDayInput, 10) || 1)),
      dueDay: Math.min(31, Math.max(1, parseInt(dueDayInput, 10) || 1)),
      gracePeriodDays: Math.max(0, parseInt(gracePeriodDaysInput, 10) || 0),
      dueDate: dueDate || account.dueDate,
      minPayment: Math.max(0, Number(minPayment) || 0),
      color: color || account.color,
      lastSyncedAt: new Date().toISOString(),

      // Shared Credit Limit fields
      isSharedLimit: !!isSharedLimit,
      sharedLimitGroupId: isSharedLimit 
        ? (sharedLimitGroupId || `shared-${account.id}`) 
        : undefined,
      sharedLimitGroupName: isSharedLimit 
        ? (sharedLimitGroupName.trim() || `${account.name} Combined Limit`) 
        : undefined,
      sharedCreditLimit: isSharedLimit 
        ? Math.max(0, Number(sharedCreditLimit) || Number(creditLimit) || 0) 
        : undefined,
    };

    if (onUpdateAccount) {
      onUpdateAccount(updated);
    } else if (onSave) {
      onSave(updated);
    }
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
                Configure balances, shared credit limits, statement issue day, and settlement due dates.
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
                <label className="block text-slate-300 font-medium mb-1">Account Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maybank 2 Cards (American Express)"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Financial Institution</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Maybank / Public Bank"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Card / Account Mask (Last 4 Digits)</label>
                <input
                  type="text"
                  value={accountNumberMask}
                  onChange={(e) => setAccountNumberMask(e.target.value)}
                  placeholder="•••• 1094"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Theme Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                  />
                  <span className="text-slate-400 font-mono">{color}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Balances & Credit Limits */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>{isBank ? 'Account Balances & Funds' : 'Current Outstanding Balances'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {isBank ? 'Current Liquid Balance' : 'Total Current Balance (Unsettled)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencyConfig.symbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalBalance}
                    onChange={(e) => setTotalBalance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {!isBank && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Billed Statement Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencyConfig.symbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={statementBalance}
                      onChange={(e) => setStatementBalance(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {!isBank && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {isSharedLimit ? 'Card Credit Limit' : 'Approved Credit Limit'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencyConfig.symbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={creditLimit}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCreditLimit(val);
                        if (isSharedLimit && !sharedCreditLimit) {
                          setSharedCreditLimit(val);
                        }
                      }}
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

          {/* SHARED CREDIT LIMIT SECTION (e.g. Maybank 2 Cards: Amex & Visa sharing one limit) */}
          {(isCard || isBnpl) && (
            <div className="space-y-3 bg-slate-950/60 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                    <Layers className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      Shared Credit Limit (e.g. Maybank 2 Cards)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Does this card share a combined credit limit with another card?
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSharedLimit}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsSharedLimit(checked);
                      if (checked) {
                        if (!sharedLimitGroupId) {
                          setSharedLimitGroupId(`shared-${account.institution?.toLowerCase() || 'bank'}-pair`);
                        }
                        if (!sharedLimitGroupName) {
                          setSharedLimitGroupName(`${account.institution || 'Maybank'} 2 Cards Combined Limit`);
                        }
                        if (!sharedCreditLimit) {
                          setSharedCreditLimit(creditLimit || 12000);
                        }
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {isSharedLimit && (
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Combined / Pooled Credit Limit
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-amber-400 font-bold">{currencyConfig.symbol}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={sharedCreditLimit}
                          onChange={(e) => setSharedCreditLimit(parseFloat(e.target.value) || 0)}
                          placeholder="e.g. 15000"
                          className="w-full bg-slate-900 border border-amber-500/50 rounded-xl pl-10 pr-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Total pooled limit across paired cards.
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Shared Limit Group Name
                      </label>
                      <input
                        type="text"
                        value={sharedLimitGroupName}
                        onChange={(e) => setSharedLimitGroupName(e.target.value)}
                        placeholder="e.g. Maybank 2 Cards (Amex + Visa)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {otherCreditCards.length > 0 && (
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Pair with Existing Card (Optional Quick Link)
                      </label>
                      <select
                        value={selectedPairedCardId}
                        onChange={(e) => handleSelectPairedCard(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Select sibling card to share limit with --</option>
                        {otherCreditCards.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.institution}) • Current Limit: {formatCurrency(c.creditLimit, currency)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Visual explanatory note */}
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/20 text-amber-200/90 text-[11px] flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p>
                      In cards like the <strong>Maybank 2 Card (Amex & Visa)</strong>, the bank assigns one combined credit limit. Spending on either card reduces the remaining available limit for both cards. Saving this updates the pooled limit group.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATEMENT ISSUANCE DAY & SETTLEMENT DUE DATE (Cards & BNPL) */}
          {!isBank && (
            <div className="space-y-3 bg-slate-950/60 border border-indigo-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">
                    Statement Issue Day & Settlement Due Date
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Specify recurring monthly statement dates and settlement payment cutoff.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Statement Issue Day */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Day Statement is Issued
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={cycleDayInput}
                      onChange={(e) => handleCycleDayChange(e.target.value)}
                      onBlur={handleCycleDayBlur}
                      placeholder="18"
                      className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-3 py-2 text-indigo-300 font-mono font-bold focus:outline-none focus:border-indigo-400"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-[11px]">th of month</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Cycle closing / cutoff date
                  </span>
                </div>

                {/* Settlement Due Day */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Settlement Due Day
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dueDayInput}
                      onChange={(e) => handleDueDayChange(e.target.value)}
                      onBlur={handleDueDayBlur}
                      placeholder="8"
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-[11px]">th of month</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Payment deadline each month
                  </span>
                </div>

                {/* Grace Period Float Days */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Grace Float (Days)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={gracePeriodDaysInput}
                      onChange={(e) => handleGraceDaysChange(e.target.value)}
                      onBlur={handleGraceDaysBlur}
                      placeholder="20"
                      className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-3 py-2 text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-400"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-[11px]">days</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    0% interest-free window
                  </span>
                </div>
              </div>

              {/* Exact Upcoming Payment Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Next Settlement Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Calendar date when next settlement payment must be made
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                    <label className="block text-slate-300 font-medium mb-1">Late Penalty</label>
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
              </div>

              {/* Interactive Schedule Visual Summary Card */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Clock className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Billing Cycle Flow</span>
                    <span className="font-semibold text-white">
                      Statement Issued: <strong>Day {cycleDayInput || '—'}</strong>
                    </span>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-500" />

                <div className="text-right">
                  <span className="text-slate-400 text-[11px] block">Settlement Deadline</span>
                  <span className="font-semibold text-amber-400">
                    Day {dueDayInput || '—'} • Next {dueDate}
                  </span>
                </div>
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
