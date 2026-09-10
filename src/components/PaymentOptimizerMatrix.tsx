import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  Sliders, 
  ShieldAlert, 
  Info,
  Calendar,
  Layers,
  Zap,
  TrendingDown,
  Check,
  Landmark
} from 'lucide-react';
import { BillAccount, PaymentScheduleItem, PaymentStrategyType } from '../types';
import { formatDate } from '../utils/paymentOptimizer';
import { CurrencyCode, formatCurrency, getCurrencyConfig } from '../utils/currency';

interface PaymentOptimizerMatrixProps {
  accounts: BillAccount[];
  schedule: PaymentScheduleItem[];
  strategy: PaymentStrategyType;
  onSelectStrategy?: (s: PaymentStrategyType) => void;
  onStrategyChange?: (s: PaymentStrategyType) => void;
  allocatedCash: number;
  onUpdateAllocatedCash?: (amount: number) => void;
  onAllocatedCashChange?: (amount: number) => void;
  totalStatementDue?: number;
  totalMinRequired?: number;
  onToggleStatus: (scheduleId: string) => void;
  paidScheduleIds: Set<string>;
  scheduledScheduleIds: Set<string>;
  onOpenAIAdvisor?: () => void;
  onAdviseSettlement?: (accountId: string) => void;
  currency?: CurrencyCode;
}

export const PaymentOptimizerMatrix: React.FC<PaymentOptimizerMatrixProps> = ({
  accounts,
  schedule,
  strategy,
  onSelectStrategy,
  onStrategyChange,
  allocatedCash,
  onUpdateAllocatedCash,
  onAllocatedCashChange,
  totalStatementDue,
  totalMinRequired,
  onToggleStatus,
  paidScheduleIds,
  scheduledScheduleIds,
  onOpenAIAdvisor,
  onAdviseSettlement,
  currency = 'MYR',
}) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const currencyConfig = getCurrencyConfig(currency);

  const handleStrategyChange = (s: PaymentStrategyType) => {
    if (onSelectStrategy) onSelectStrategy(s);
    if (onStrategyChange) onStrategyChange(s);
  };

  const handleCashChange = (amount: number) => {
    if (onUpdateAllocatedCash) onUpdateAllocatedCash(amount);
    if (onAllocatedCashChange) onAllocatedCashChange(amount);
  };

  const effectiveStatementDue =
    totalStatementDue ?? accounts.reduce((sum, a) => sum + a.statementBalance, 0);
  const effectiveMinRequired =
    totalMinRequired ?? accounts.reduce((sum, a) => sum + a.minPayment, 0);

  const strategies = [
    {
      id: 'grace_float' as PaymentStrategyType,
      name: 'Grace Float Maximizer',
      subtitle: 'Zero-Interest & Max Liquidity',
      icon: Zap,
      badge: 'Recommended',
      description:
        'Holds cash in your account until 2 days before grace period expires. Eliminates 100% of late fees and interest while maximizing cash liquidity.',
    },
    {
      id: 'avalanche' as PaymentStrategyType,
      name: 'Debt Avalanche',
      subtitle: 'Highest APR First',
      icon: TrendingDown,
      badge: 'Min Interest',
      description:
        'Pays minimums on all accounts, then aggressively channels remaining cash to accounts with the highest APR (e.g. 28.99% card) to eliminate finance charges.',
    },
    {
      id: 'snowball' as PaymentStrategyType,
      name: 'Debt Snowball',
      subtitle: 'Lowest Balance First',
      icon: Layers,
      badge: 'Fast Wins',
      description:
        'Eliminates smaller balances (like e-wallet pay later) first to reduce the sheer number of monthly bills and simplify mental load.',
    },
    {
      id: 'cashflow_buffer' as PaymentStrategyType,
      name: 'Cash Flow Buffer',
      subtitle: 'Paycheck Aligned',
      icon: Calendar,
      badge: 'Cash Shield',
      description:
        'Synchronizes payment timing immediately after your 1st & 15th paycheck arrivals so you never risk overdrawing your checking account.',
    },
  ];

  const totalAllocatedInSchedule = schedule.reduce((sum, s) => sum + s.amount, 0);
  const totalInterestSaved = schedule.reduce((sum, s) => sum + s.interestAvoided, 0);
  const totalLateFeesSaved = schedule.reduce((sum, s) => sum + s.lateFeeAvoided, 0);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Cost-Effective Payment Sequencing Engine
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Calculated sequence accounts for unique cycle closing days, grace periods, APR penalties, and paycheck timing.
          </p>
        </div>

        {/* Explain Method Button */}
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium self-start lg:self-auto cursor-pointer"
        >
          <Info className="w-4 h-4" />
          <span>{showExplanation ? 'Hide Algorithm Logic' : 'How the Sequence is Calculated'}</span>
        </button>
      </div>

      {/* Explainer Drawer (Collapsible) */}
      {showExplanation && (
        <div className="bg-indigo-950/40 rounded-xl p-4 border border-indigo-800/40 text-xs text-indigo-200 space-y-2">
          <div className="font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Mathematical Sequencing Rules:
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>
              <strong>Non-Negotiable Minimums First:</strong> All accounts with upcoming deadlines receive their minimum payment requirement ({formatCurrency(effectiveMinRequired, currency)} total) to prevent late fees and negative credit reporting.
            </li>
            <li>
              <strong>Grace Period Float Window:</strong> Credit cards provide 21–30 days of 0% interest float from statement close date. E-wallets (e.g. GrabPay Later) have tighter 7–15 day windows. The engine schedules payments 48 hours prior to the deadline for bank processing safety.
            </li>
            <li>
              <strong>Residual Cash Allocation:</strong> Extra funds beyond minimums are allocated in strict priority (earliest grace period expiration or highest APR) to prevent revolving interest compounding.
            </li>
          </ul>
        </div>
      )}

      {/* Strategy Selection Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {strategies.map((strat) => {
          const Icon = strat.icon;
          const isSelected = strategy === strat.id;
          return (
            <button
              key={strat.id}
              onClick={() => handleStrategyChange(strat.id)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {strat.badge}
                  </span>
                </div>
                <div className="font-semibold text-sm text-white">{strat.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{strat.subtitle}</div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                {strat.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Cash Allocation Simulator Slider */}
      <div className="bg-slate-800/60 rounded-xl p-4 sm:p-5 border border-slate-700/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label htmlFor="cash-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Simulate Available Cash for Bills This Month
            </label>
            <div className="text-xs text-slate-400 mt-0.5">
              Adjust funds to see how the algorithm balances non-negotiable minimums vs full statement payoffs.
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                {currencyConfig.symbol}
              </span>
              <input
                id="cash-input"
                type="number"
                min="0"
                step="50"
                value={allocatedCash ?? 0}
                onChange={(e) => handleCashChange(Math.max(0, Number(e.target.value)))}
                className="w-36 pl-9 pr-3 py-1.5 text-right font-bold text-white bg-slate-900 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <button
              onClick={() => handleCashChange(effectiveStatementDue)}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Set cash equal to 100% of all statement balances"
            >
              Full Payoff
            </button>
            <button
              onClick={() => handleCashChange(effectiveMinRequired)}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Set cash equal to required minimums only"
            >
              Min Due
            </button>
          </div>
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min="0"
          max={Math.max(effectiveStatementDue * 1.2, 5000)}
          step="50"
          value={allocatedCash ?? 0}
          onChange={(e) => handleCashChange(Number(e.target.value))}
          className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
        />

        {/* Coverage summary badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Total Statement Due:</span>
            <span className="font-bold text-white">{formatCurrency(effectiveStatementDue, currency)}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Total Min Required:</span>
            <span className="font-bold text-amber-400">{formatCurrency(effectiveMinRequired, currency)}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>{formatCurrency(totalLateFeesSaved, currency)} Late Fees Avoided</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-400 font-medium">
              <Zap className="w-4 h-4" />
              <span>~{formatCurrency(totalInterestSaved, currency)}/mo Interest Saved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sequence List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
          <span>Recommended Payment Sequence (Executed in Priority Order)</span>
          <span>{schedule.length} Bill Items</span>
        </div>

        <div className="space-y-3">
          {schedule.map((item, index) => {
            const isPaid = paidScheduleIds.has(item.id);
            const isScheduled = scheduledScheduleIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 transition-all ${
                  isPaid
                    ? 'bg-slate-900/60 border-emerald-900/40 opacity-75'
                    : item.urgency === 'critical'
                    ? 'bg-slate-900 border-rose-800/60 shadow-lg shadow-rose-950/20'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Sequence Rank & Account Specs */}
                  <div className="flex items-start gap-3.5">
                    {/* Priority Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow ${
                        isPaid
                          ? 'bg-emerald-600 text-white'
                          : index === 0
                          ? 'bg-rose-500 text-white animate-pulse'
                          : index === 1
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isPaid ? <Check className="w-4 h-4" /> : `#${index + 1}`}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base text-white">{item.accountName}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.accountType === 'credit_card'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          }`}
                        >
                          {item.accountType === 'credit_card' ? 'Credit Card' : 'E-Wallet Pay Later'}
                        </span>
                        {item.urgency === 'critical' && !isPaid && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Due in {item.daysRemaining}d
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>
                          Due Date: <strong className="text-slate-200">{formatDate(item.dueDate)}</strong>
                        </span>
                        <span>
                          APR:{' '}
                          <strong className={item.apr > 20 ? 'text-rose-400' : 'text-slate-200'}>
                            {item.apr}%
                          </strong>
                        </span>
                        <span>
                          Late Penalty: <strong className="text-slate-200">{formatCurrency(item.lateFee, currency)}</strong>
                        </span>
                        <span>
                          Float Gained:{' '}
                          <strong className="text-emerald-400">{item.floatDaysGained} days</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Payment Amount & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] text-slate-400 font-medium">
                        Recommended Pay: <strong className="text-indigo-300">{formatDate(item.recommendedPayDate)}</strong>
                      </div>
                      <div className="text-xl font-bold text-white tracking-tight">
                        {formatCurrency(item.amount, currency)}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400">
                        {item.paymentType === 'full_statement' ? (
                          <span className="text-emerald-400 font-semibold">Full Statement (0% Interest)</span>
                        ) : item.paymentType === 'minimum_due' ? (
                          <span className="text-amber-400">Minimum Required ({formatCurrency(0, currency)} Late Fee)</span>
                        ) : (
                          <span className="text-indigo-400">Optimized Partial ({formatCurrency(item.amount, currency)})</span>
                        )}
                        <span className="text-slate-500 ml-1">/ Total {formatCurrency(item.statementBalance, currency)}</span>
                      </div>
                    </div>

                    {/* Status Toggle Buttons & Bank Liquidity Advisor */}
                    <div className="flex items-center gap-2">
                      {onAdviseSettlement && (
                        <button
                          type="button"
                          onClick={() => onAdviseSettlement(item.accountId)}
                          className="px-2.5 py-2 text-xs font-semibold rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-all cursor-pointer"
                          title="Calculate bank balance required to settle this statement prior to due date"
                        >
                          <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="hidden sm:inline">Bank Advisor</span>
                        </button>
                      )}

                      <button
                        onClick={() => onToggleStatus(item.id)}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                          isPaid
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : isScheduled
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isPaid ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Paid</span>
                          </>
                        ) : isScheduled ? (
                          <>
                            <Clock className="w-4 h-4 text-white" />
                            <span>Scheduled</span>
                          </>
                        ) : (
                          <>
                            <span>Mark Scheduled</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Strategy Rationale Box */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                  <span className="text-indigo-400 shrink-0 mt-0.5">↳</span>
                  <p className="leading-relaxed">
                    <strong className="text-slate-300">Why this order:</strong> {item.rationale}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
