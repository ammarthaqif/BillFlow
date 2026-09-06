import React from 'react';
import { 
  TrendingDown, 
  AlertCircle, 
  CalendarClock, 
  ShieldCheck, 
  Zap, 
  CreditCard, 
  Wallet,
  Clock
} from 'lucide-react';
import { BillAccount, InstallmentPlan, UserSettings } from '../types';
import { formatCurrency } from '../utils/currency';

interface ExecutiveOverviewProps {
  accounts: BillAccount[];
  installments: InstallmentPlan[];
  settings: UserSettings;
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  accounts,
  installments,
  settings,
}) => {
  const currency = settings.currency || 'MYR';
  const totalBalance = accounts.reduce((sum, a) => sum + a.totalBalance, 0);
  const totalStatementDue = accounts.reduce((sum, a) => sum + a.statementBalance, 0);
  const totalCreditLimit = accounts.reduce((sum, a) => sum + a.creditLimit, 0);
  const totalMonthlyInstallments = installments.reduce((sum, i) => sum + i.monthlyAmount, 0);
  
  // Calculate average utilization
  const utilizationRatio = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;
  
  // Total penalties avoided by proactive sequencing
  const totalLateFeesGuarded = accounts.reduce((sum, a) => sum + a.lateFee, 0);
  // Average float days
  const avgFloatDays = Math.round(
    accounts.reduce((sum, a) => sum + a.gracePeriodDays, 0) / (accounts.length || 1)
  );

  const installmentBurdenPercent = Math.round((totalMonthlyInstallments / settings.monthlyIncome) * 100);

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

          {/* Quick Paycheck Status */}
          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-indigo-500/20 text-xs">
            <CalendarClock className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <div className="text-slate-400 font-medium">Income Paycheck Schedule</div>
              <div className="font-semibold text-slate-200">
                Days {settings.paycheckDates.join(' & ')} of Month ({formatCurrency(settings.monthlyIncome, currency)}/mo)
              </div>
            </div>
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
            <span>Due across next 30 days</span>
            <span className="text-emerald-400 font-medium">0% interest if cleared</span>
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

      {/* Credit Utilization Bar */}
      <div className="bg-slate-900/70 rounded-xl p-3.5 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Revolving Credit Utilization:</span>
          <span className={`font-bold ${utilizationRatio > 50 ? 'text-rose-400' : utilizationRatio > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {utilizationRatio.toFixed(1)}%
          </span>
          <span className="text-slate-500">
            ({formatCurrency(totalBalance, currency)} of {formatCurrency(totalCreditLimit, currency)} limit)
          </span>
        </div>

        {/* Bar */}
        <div className="w-full sm:w-64 h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              utilizationRatio > 50
                ? 'bg-rose-500'
                : utilizationRatio > 30
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, utilizationRatio)}%` }}
          />
        </div>

        <span className="text-[11px] text-slate-400 hidden lg:inline">
          {utilizationRatio <= 30 ? 'Healthy (under recommended 30% threshold)' : 'Elevated: Prioritize payoff to improve credit rating'}
        </span>
      </div>
    </div>
  );
};
