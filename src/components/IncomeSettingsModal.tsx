import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  DollarSign, 
  Calendar, 
  Landmark, 
  ShieldCheck, 
  Sparkles, 
  HelpCircle,
  Check,
  Target
} from 'lucide-react';
import { UserSettings, BillAccount } from '../types';
import { formatCurrency, CurrencyCode } from '../utils/currency';

interface IncomeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  accounts?: BillAccount[];
  bankAccounts?: BillAccount[];
  onSaveSettings: (updated: UserSettings) => void;
}

export const IncomeSettingsModal: React.FC<IncomeSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  accounts = [],
  bankAccounts: passedBankAccounts,
  onSaveSettings,
}) => {
  const currency: CurrencyCode = settings.currency || 'MYR';
  const bankAccounts = useMemo(() => {
    if (passedBankAccounts && passedBankAccounts.length > 0) return passedBankAccounts;
    return (accounts || []).filter((a) => a.type === 'bank_account');
  }, [accounts, passedBankAccounts]);

  const [incomeInput, setIncomeInput] = useState<string>(settings.monthlyIncome?.toString() ?? '6500');
  const [schedule, setSchedule] = useState<'monthly' | 'bi_monthly' | 'weekly'>(settings.paycheckSchedule ?? 'bi_monthly');
  const [paycheckDates, setPaycheckDates] = useState<number[]>(settings.paycheckDates ?? [1, 15]);
  const [primaryBankId, setPrimaryBankId] = useState<string>(settings.primaryBankAccountId ?? (bankAccounts[0]?.id ?? ''));
  const [safetyBufferInput, setSafetyBufferInput] = useState<string>(settings.safetyBufferAmount?.toString() ?? '300');
  const [spendingCapInput, setSpendingCapInput] = useState<string>(settings.monthlySpendingCap?.toString() ?? '5000');

  useEffect(() => {
    if (isOpen) {
      setIncomeInput(settings.monthlyIncome?.toString() ?? '6500');
      setSchedule(settings.paycheckSchedule ?? 'bi_monthly');
      setPaycheckDates(settings.paycheckDates ?? [1, 15]);
      setPrimaryBankId(settings.primaryBankAccountId ?? (bankAccounts[0]?.id ?? ''));
      setSafetyBufferInput(settings.safetyBufferAmount?.toString() ?? '300');
      setSpendingCapInput(settings.monthlySpendingCap?.toString() ?? '5000');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const numericIncome = Math.max(0, parseFloat(incomeInput) || 0);
  const numericBuffer = Math.max(0, parseFloat(safetyBufferInput) || 0);
  const numericSpendingCap = Math.max(0, parseFloat(spendingCapInput) || 0);

  // Quick preset incomes
  const incomePresets = [3500, 5000, 6500, 8500, 12000, 15000];

  // Calculate paycheck drops
  let amountPerDrop = numericIncome;
  if (schedule === 'bi_monthly') {
    amountPerDrop = Math.round((numericIncome / Math.max(1, paycheckDates.length)) * 100) / 100;
  } else if (schedule === 'weekly') {
    amountPerDrop = Math.round((numericIncome / 4) * 100) / 100;
  }

  const handleToggleDay = (day: number) => {
    if (schedule === 'monthly') {
      setPaycheckDates([day]);
    } else if (schedule === 'bi_monthly') {
      if (paycheckDates.includes(day)) {
        if (paycheckDates.length > 1) {
          setPaycheckDates(paycheckDates.filter((d) => d !== day));
        }
      } else {
        if (paycheckDates.length < 2) {
          setPaycheckDates([...paycheckDates, day].sort((a, b) => a - b));
        } else {
          // Replace second date
          setPaycheckDates([paycheckDates[0], day].sort((a, b) => a - b));
        }
      }
    }
  };

  const handleScheduleChange = (newSched: 'monthly' | 'bi_monthly' | 'weekly') => {
    setSchedule(newSched);
    if (newSched === 'monthly') {
      setPaycheckDates([25]);
    } else if (newSched === 'bi_monthly') {
      setPaycheckDates([1, 15]);
    } else {
      setPaycheckDates([5, 12, 19, 26]);
    }
  };

  const handleSave = () => {
    const updated: UserSettings = {
      ...settings,
      monthlyIncome: numericIncome,
      paycheckSchedule: schedule,
      paycheckDates: paycheckDates.length > 0 ? paycheckDates : [1, 15],
      primaryBankAccountId: primaryBankId || undefined,
      safetyBufferAmount: numericBuffer,
      monthlySpendingCap: numericSpendingCap > 0 ? numericSpendingCap : 5000,
    };
    onSaveSettings(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Monthly Income & Paycheck Settings</h2>
              <p className="text-xs text-slate-400">
                Configure your take-home pay and salary deposit timeline to power intelligent bank balance advising.
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

        {/* Content */}
        <div className="p-5 space-y-5 text-xs text-slate-300 max-h-[75vh] overflow-y-auto">
          {/* Monthly Income Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <span>Monthly Net Take-Home Income</span>
                <span className="text-[10px] text-slate-400 font-normal">(after EPF/SOCSO/Tax)</span>
              </label>
              <span className="text-xs font-bold text-indigo-400">
                {formatCurrency(numericIncome, currency)}/month
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                {formatCurrency(0, currency).split(' ')[0]}
              </span>
              <input
                type="number"
                min="0"
                step="100"
                value={incomeInput ?? ''}
                onChange={(e) => setIncomeInput(e.target.value)}
                placeholder="e.g. 6500"
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400 mr-1">Quick Select:</span>
              {incomePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setIncomeInput(preset.toString())}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    numericIncome === preset
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
                  }`}
                >
                  {formatCurrency(preset, currency, { decimals: 0 })}
                </button>
              ))}
            </div>
          </div>

          {/* Paycheck Frequency */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <label className="font-semibold text-slate-200 text-xs">
              Paycheck Disbursement Schedule
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleScheduleChange('monthly')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  schedule === 'monthly'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : 'border-slate-800 bg-slate-850 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Monthly</span>
                  {schedule === 'monthly' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Once a month</div>
                <div className="text-[11px] font-semibold text-indigo-300 mt-2">
                  1x {formatCurrency(numericIncome, currency)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleScheduleChange('bi_monthly')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  schedule === 'bi_monthly'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : 'border-slate-800 bg-slate-850 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Semi-Monthly</span>
                  {schedule === 'bi_monthly' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Twice a month</div>
                <div className="text-[11px] font-semibold text-indigo-300 mt-2">
                  2x {formatCurrency(amountPerDrop, currency)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleScheduleChange('weekly')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  schedule === 'weekly'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : 'border-slate-800 bg-slate-850 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Weekly</span>
                  {schedule === 'weekly' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Every 7 days</div>
                <div className="text-[11px] font-semibold text-indigo-300 mt-2">
                  4x {formatCurrency(amountPerDrop, currency)}
                </div>
              </button>
            </div>
          </div>

          {/* Paycheck Drop Days Picker */}
          {schedule !== 'weekly' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-200 text-xs">
                  Select Paycheck Calendar Day{schedule === 'bi_monthly' ? 's (Pick 2)' : ' (Pick 1)'}
                </label>
                <span className="text-[11px] text-indigo-400 font-medium">
                  Selected: Day {paycheckDates.join(' & ')}
                </span>
              </div>

              {/* Grid of days 1 to 31 */}
              <div className="grid grid-cols-7 sm:grid-cols-11 gap-1 p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const isSelected = paycheckDates.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleDay(day)}
                      className={`h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Popular Malaysian Paycheck Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                <span className="text-slate-400">Standard cycles:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSchedule('monthly');
                    setPaycheckDates([25]);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Gov / MNC (25th)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSchedule('monthly');
                    setPaycheckDates([28]);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  End of Month (28th)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSchedule('bi_monthly');
                    setPaycheckDates([1, 15]);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  1st & 15th
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSchedule('bi_monthly');
                    setPaycheckDates([15, 30]);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  15th & 30th
                </button>
              </div>
            </div>
          )}

          {/* Primary Receiving Bank Account */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <label className="font-semibold text-slate-200 text-xs flex items-center justify-between">
              <span>Salary Deposit Bank Account</span>
              <span className="text-[10px] text-slate-400 font-normal">Where income lands first</span>
            </label>
            {bankAccounts.length > 0 ? (
              <select
                value={primaryBankId ?? ''}
                onChange={(e) => setPrimaryBankId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.institution}) — Balance: {formatCurrency(b.totalBalance, currency)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
                No bank accounts linked yet. Add a bank account in Linked Accounts to track real-time liquidity.
              </div>
            )}
          </div>

          {/* Minimum Safety Buffer Reserve */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <span>Minimum Bank Safety Reserve Buffer</span>
                <span className="text-[10px] text-slate-400 font-normal">(Never drop below this)</span>
              </label>
              <span className="text-xs font-semibold text-emerald-400">
                {formatCurrency(numericBuffer, currency)}
              </span>
            </div>
            <input
              type="number"
              min="0"
              step="50"
              value={safetyBufferInput ?? ''}
              onChange={(e) => setSafetyBufferInput(e.target.value)}
              placeholder="e.g. 300"
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400">
              The Advisor will ensure you keep this minimum liquid buffer in your bank after settling any credit card statement or BNPL bill.
            </p>
          </div>

          {/* Monthly Spending Cap & Limit */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>Monthly Spending Cap</span>
                <span className="text-[10px] text-slate-400 font-normal">(Expenses target limit)</span>
              </label>
              <span className="text-xs font-semibold text-indigo-400">
                {formatCurrency(numericSpendingCap, currency)}
              </span>
            </div>
            <input
              type="number"
              min="100"
              step="500"
              value={spendingCapInput ?? ''}
              onChange={(e) => setSpendingCapInput(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
              <span className="text-slate-400">Presets:</span>
              {[3000, 4500, 6000, 8000, 10000].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSpendingCapInput(p.toString())}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  {formatCurrency(p, currency)}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Visualized in Executive Overview and Daily Command Hub as a progress bar tracking total monthly expenses against this cap.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            Auto-calculates required bank balance across all statements.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              Save Income Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
