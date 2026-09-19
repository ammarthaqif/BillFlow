import React, { useState } from 'react';
import { 
  TrendingDown, 
  AlertCircle, 
  CalendarClock, 
  ShieldCheck, 
  Zap, 
  CreditCard, 
  Wallet,
  Clock,
  Landmark,
  ChevronRight,
  ArrowUpRight,
  Target,
  Edit2,
  Check,
  X,
  Gauge
} from 'lucide-react';
import { BillAccount, InstallmentPlan, UserSettings, ExpenseItem } from '../types';
import { formatCurrency } from '../utils/currency';

interface ExecutiveOverviewProps {
  accounts: BillAccount[];
  installments: InstallmentPlan[];
  settings: UserSettings;
  expenses?: ExpenseItem[];
  onOpenIncomeSettings?: () => void;
  onOpenBankAdvisor?: (accountId?: string) => void;
  onUpdateSpendingCap?: (newCap: number) => void;
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  accounts = [],
  installments = [],
  settings,
  expenses = [],
  onOpenIncomeSettings,
  onOpenBankAdvisor,
  onUpdateSpendingCap,
}) => {
  const currency = settings.currency || 'MYR';
  const totalBalance = (accounts || []).reduce((sum, a) => sum + a.totalBalance, 0);
  const totalStatementDue = (accounts || []).reduce((sum, a) => sum + a.statementBalance, 0);
  const totalCreditLimit = (accounts || []).reduce((sum, a) => sum + a.creditLimit, 0);
  const totalMonthlyInstallments = (installments || []).reduce((sum, i) => sum + i.monthlyAmount, 0);
  
  // Calculate average utilization
  const utilizationRatio = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;
  
  // Total penalties avoided by proactive sequencing
  const totalLateFeesGuarded = accounts.reduce((sum, a) => sum + a.lateFee, 0);
  // Average float days
  const avgFloatDays = Math.round(
    accounts.reduce((sum, a) => sum + a.gracePeriodDays, 0) / (accounts.length || 1)
  );

  const installmentBurdenPercent = Math.round((totalMonthlyInstallments / settings.monthlyIncome) * 100);

  // Monthly Spending Cap & Progress calculations
  const spendingCap = settings.monthlySpendingCap ?? 5000;
  const totalExpenses = (expenses || []).reduce((sum, e) => sum + e.amount, 0);
  const spendingProgressPercent = spendingCap > 0 ? Math.round((totalExpenses / spendingCap) * 100) : 0;
  const remainingBudget = spendingCap - totalExpenses;
  const isOverBudget = remainingBudget < 0;

  // Inline spending cap editor state
  const [isEditingCap, setIsEditingCap] = useState(false);
  const [capInput, setCapInput] = useState<string>(spendingCap.toString());

  const handleSaveCap = () => {
    const val = parseFloat(capInput);
    if (!isNaN(val) && val > 0 && onUpdateSpendingCap) {
      onUpdateSpendingCap(val);
    }
    setIsEditingCap(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Strategy Mission */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 border border-indigo-800/40 text-white shadow-xl shadow-indigo-950/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h1 className="font-bold text-lg sm:text-xl tracking-tight text-white">
                Cash Flow Float & Bill Payment Optimization Engine
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Synchronizing cycle closing dates, grace period countdowns, and multi-month installments to preserve cash in your account until the optimal payment day.
            </p>
          </div>

          {/* Quick Paycheck Status & Bank Settlement Advisor CTA */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenIncomeSettings}
              className="flex items-center gap-3 bg-slate-800/90 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-indigo-500/30 hover:border-indigo-500/50 text-xs transition-all cursor-pointer text-left group"
              title="Click to adjust monthly income and paycheck schedule"
            >
              <CalendarClock className="w-4 h-4 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                  <span>Income & Paychecks</span>
                  <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div className="font-semibold text-slate-200 text-xs">
                  {formatCurrency(settings.monthlyIncome, currency)}/mo • Day {settings.paycheckDates.join(' & ')}
                </div>
              </div>
            </button>

            {onOpenBankAdvisor && (
              <button
                type="button"
                onClick={() => onOpenBankAdvisor()}
                className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer group"
                title="Calculate bank balance required to settle statements prior to due date"
              >
                <Landmark className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
                <span>Bank Settlement Advisor</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-200 opacity-80" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Core Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Outstanding */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Total Outstanding Balance</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(totalBalance, currency)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{accounts.length} linked accounts</span>
            <span className="text-indigo-400 font-medium">
              {accounts.filter(a => a.type === 'credit_card').length} Cards • {accounts.filter(a => a.type === 'ewallet_pay_later').length} BNPL
            </span>
          </div>
        </div>

        {/* Metric 2: Due This Cycle */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Immediate Statement Due</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            {formatCurrency(totalStatementDue, currency)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Due next 30 days</span>
            {onOpenBankAdvisor ? (
              <button
                type="button"
                onClick={() => onOpenBankAdvisor()}
                className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5 cursor-pointer hover:underline"
              >
                <span>Advise Bank Liquidity</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-emerald-400 font-medium">0% interest if cleared</span>
            )}
          </div>
        </div>

        {/* Metric 3: Installments Commitment */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Monthly Installment Plans</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-400 tracking-tight">
            {formatCurrency(totalMonthlyInstallments, currency)}
            <span className="text-xs font-normal text-slate-400 ml-1">/mo</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{installments.length} active plans</span>
            <span className="text-purple-300 font-medium">{installmentBurdenPercent}% of income</span>
          </div>
        </div>

        {/* Metric 4: Grace Float & Late Fee Shield */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Late Fee Shield & Float</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {formatCurrency(totalLateFeesGuarded, currency)} Saved
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Avg {avgFloatDays} days free float</span>
            <span className="text-emerald-400 font-medium">0 Late Fees</span>
          </div>
        </div>
      </div>

      {/* Dual Financial Health Bars: Monthly Spending Cap Tracker & Revolving Credit Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Monthly Spending Cap Tracker */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 shadow-sm flex flex-col justify-between gap-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${
                isOverBudget
                  ? 'bg-rose-500/15 text-rose-400'
                  : spendingProgressPercent > 80
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-indigo-500/15 text-indigo-400'
              }`}>
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white text-sm">Monthly Spending Cap</span>
                <span className="text-[11px] text-slate-400 block">
                  Target spending limit for all day-to-day purchases
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                isOverBudget
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : spendingProgressPercent > 80
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {isOverBudget ? (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>Over Limit</span>
                  </>
                ) : spendingProgressPercent > 80 ? (
                  <>
                    <Clock className="w-3 h-3" />
                    <span>Near Cap</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3" />
                    <span>On Track</span>
                  </>
                )}
              </span>

              {onUpdateSpendingCap && !isEditingCap && (
                <button
                  type="button"
                  onClick={() => {
                    setCapInput(spendingCap.toString());
                    setIsEditingCap(true);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Adjust monthly spending limit"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Quick inline editor if open */}
          {isEditingCap ? (
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-300 font-semibold">Set Monthly Cap ({currency}):</span>
              <input
                type="number"
                min="100"
                step="500"
                value={capInput}
                onChange={(e) => setCapInput(e.target.value)}
                className="w-28 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveCap}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingCap(false)}
                className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="w-full flex items-center gap-1.5 pt-1 text-[10px] text-slate-400">
                <span>Presets:</span>
                {[3000, 5000, 7500, 10000].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCapInput(p.toString())}
                    className="px-1.5 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  >
                    {formatCurrency(p, currency)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-baseline justify-between text-xs pt-1">
              <div>
                <span className="text-slate-400 text-[11px]">Total Expenses: </span>
                <span className="font-bold text-white text-sm">
                  {formatCurrency(totalExpenses, currency)}
                </span>
                <span className="text-slate-500 text-[11px] ml-1">
                  of {formatCurrency(spendingCap, currency)} limit
                </span>
              </div>
              <div className="text-right">
                <span className={`font-bold text-xs ${isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isOverBudget 
                    ? `+${formatCurrency(Math.abs(remainingBudget), currency)} over cap`
                    : `${formatCurrency(remainingBudget, currency)} remaining`}
                </span>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverBudget
                    ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-sm shadow-rose-500/50'
                    : spendingProgressPercent > 80
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}
                style={{ width: `${Math.min(100, spendingProgressPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>0%</span>
              <span className={`font-semibold ${isOverBudget ? 'text-rose-400' : 'text-slate-300'}`}>
                {spendingProgressPercent}% utilized
              </span>
              <span>100% ({formatCurrency(spendingCap, currency)})</span>
            </div>
          </div>
        </div>

        {/* Card 2: Revolving Credit Utilization Bar */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 shadow-sm flex flex-col justify-between gap-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white text-sm">Revolving Credit Utilization</span>
                <span className="text-[11px] text-slate-400 block">
                  Credit cards & BNPL balance vs total credit line
                </span>
              </div>
            </div>

            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              utilizationRatio > 50
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : utilizationRatio > 30
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              {utilizationRatio <= 30 ? 'Healthy <30%' : utilizationRatio <= 50 ? 'Moderate' : 'High Usage'}
            </span>
          </div>

          <div className="flex items-baseline justify-between text-xs pt-1">
            <div>
              <span className="text-slate-400 text-[11px]">Active Balance: </span>
              <span className="font-bold text-white text-sm">
                {formatCurrency(totalBalance, currency)}
              </span>
              <span className="text-slate-500 text-[11px] ml-1">
                of {formatCurrency(totalCreditLimit, currency)} total limit
              </span>
            </div>
            <div className="text-right">
              <span className={`font-bold text-xs ${
                utilizationRatio > 50 ? 'text-rose-400' : utilizationRatio > 30 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {utilizationRatio.toFixed(1)}% Line Used
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  utilizationRatio > 50
                    ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-sm shadow-rose-500/50'
                    : utilizationRatio > 30
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}
                style={{ width: `${Math.min(100, utilizationRatio)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>0%</span>
              <span className="text-slate-400">
                Recommended threshold: 30% ({formatCurrency(totalCreditLimit * 0.3, currency)})
              </span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

