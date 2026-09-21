import React, { useState, useMemo } from 'react';
import {
  Gift,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  Info,
  Sliders,
  DollarSign,
  Award,
  Zap,
  Tag,
  Plus,
  Edit2,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { BillAccount, ExpenseItem, CardRewardBenefit, BenefitType } from '../types';
import { CurrencyCode, formatCurrency } from '../utils/currency';
import {
  calculateCardRewardsProgress,
  recommendBestCardForPurchase,
  generateRewardsBalancingStrategy,
  convertRewardToMonetaryValue,
  isDateWeekend
} from '../utils/rewardsOptimizer';

interface RewardsCashbackBalancerProps {
  accounts: BillAccount[];
  expenses: ExpenseItem[];
  currency: CurrencyCode;
  onUpdateAccount?: (account: BillAccount) => void;
  onQuickLogExpense?: (prefill: { amount: number; accountId: string; category: string; description: string; date: string }) => void;
}

export const RewardsCashbackBalancer: React.FC<RewardsCashbackBalancerProps> = ({
  accounts,
  expenses,
  currency,
  onUpdateAccount,
  onQuickLogExpense,
}) => {
  // Simulator State
  const [simAmountInput, setSimAmountInput] = useState<string>('200');
  const simAmount = Math.max(0, parseFloat(simAmountInput) || 0);
  const [simDate, setSimDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [simCategory, setSimCategory] = useState<string>('dining');
  const [simDescription, setSimDescription] = useState<string>('Weekend Dinner');

  // Rule Editor State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [selectedAccountForRule, setSelectedAccountForRule] = useState<BillAccount | null>(null);
  const [editingRule, setEditingRule] = useState<CardRewardBenefit | null>(null);

  // Month selector (default current month)
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  // Calculate monthly rewards progress
  const progressList = useMemo(() => {
    return calculateCardRewardsProgress(accounts, expenses, selectedMonth);
  }, [accounts, expenses, selectedMonth]);

  // Generate strategic balancing insights
  const strategy = useMemo(() => {
    return generateRewardsBalancingStrategy(accounts, expenses);
  }, [accounts, expenses]);

  // Run simulation recommendations
  const simulationResults = useMemo(() => {
    return recommendBestCardForPurchase({
      amount: simAmount,
      date: simDate,
      category: simCategory,
      accounts,
      expenses,
    });
  }, [simAmount, simDate, simCategory, accounts, expenses]);

  const isSimDateWeekend = isDateWeekend(simDate);

  // Handle saving customized reward benefit
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForRule || !editingRule || !onUpdateAccount) return;

    const currentBenefits = selectedAccountForRule.rewardBenefits || [];
    const exists = currentBenefits.some((b) => b.id === editingRule.id);

    const nextBenefits = exists
      ? currentBenefits.map((b) => (b.id === editingRule.id ? editingRule : b))
      : [...currentBenefits, editingRule];

    const updatedAccount: BillAccount = {
      ...selectedAccountForRule,
      rewardBenefits: nextBenefits,
    };

    onUpdateAccount(updatedAccount);
    setIsRuleModalOpen(false);
    setEditingRule(null);
  };

  const handleDeleteRule = (acc: BillAccount, ruleId: string) => {
    if (!onUpdateAccount) return;
    const nextBenefits = (acc.rewardBenefits || []).filter((b) => b.id !== ruleId);
    onUpdateAccount({
      ...acc,
      rewardBenefits: nextBenefits,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Concept Introduction */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Gift className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Card Rewards, Cashback & Coins Balancer
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Optimization Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Do not let rewards expire or waste spend on cards whose monthly cashback caps are already reached.
              BillFlow dynamically balances your spending across <strong className="text-slate-200">AMEX Weekend Cashback</strong>, <strong className="text-slate-200">Shopee Coins</strong>, and reward points for maximum financial yield.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-200 border-none outline-none text-xs font-medium cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Executive Metrics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">Total Rewards Earned</span>
            <div className="text-lg font-bold text-emerald-400">
              ~{formatCurrency(strategy.totalMonetaryValue, currency)}
            </div>
            <span className="text-[10px] text-slate-500">Value generated this month</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">Cashback Harvested</span>
            <div className="text-lg font-bold text-amber-400">
              {formatCurrency(strategy.totalMonthlyCashback, currency)}
            </div>
            <span className="text-[10px] text-slate-500">Direct statement credits</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">Shopee Coins</span>
            <div className="text-lg font-bold text-orange-400">
              {strategy.totalMonthlyCoins.toLocaleString()} <span className="text-xs font-normal text-slate-400">coins</span>
            </div>
            <span className="text-[10px] text-slate-500">~{formatCurrency(convertRewardToMonetaryValue('coins', strategy.totalMonthlyCoins), currency)} discount value</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">Unclaimed Potential</span>
            <div className="text-lg font-bold text-indigo-400">
              ~{formatCurrency(strategy.unclaimedPotentialValue, currency)}
            </div>
            <span className="text-[10px] text-slate-500">Available in open caps</span>
          </div>
        </div>
      </div>

      {/* Strategic Balancing Recommendations */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200">Active Monthly Balancing Directives</h3>
          </div>
          <span className="text-xs text-slate-400">{strategy.actions.length} action items</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {strategy.actions.map((action, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all text-xs ${
                action.type === 'warning'
                  ? 'bg-red-950/20 border-red-500/30 text-red-200'
                  : action.type === 'priority'
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  : 'bg-indigo-950/20 border-indigo-500/30 text-indigo-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  {action.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                  {action.type === 'priority' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                  {action.type === 'tip' && <Zap className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                  <span>{action.title}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 font-mono text-slate-300">
                  {action.cardName}
                </span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">{action.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Card Quota Meters + Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (7 cols): Card Rewards & Cap Meters */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <span>Card Quota & Rewards Tracker</span>
              </h3>
              <p className="text-xs text-slate-400">
                Track qualifying spend vs. monthly caps for each active card benefit
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {progressList.map((progress) => (
              <div
                key={progress.accountId}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: progress.color }}
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-tight">{progress.accountName}</h4>
                      <span className="text-[11px] text-slate-400">
                        Total {selectedMonth} spend: {formatCurrency(progress.totalMonthlySpend, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Est. Rewards Value</span>
                    <span className="text-xs font-bold text-emerald-400">
                      +{formatCurrency(progress.estimatedTotalMonetaryValue, currency)}
                    </span>
                  </div>
                </div>

                {/* Benefits List for this Card */}
                <div className="space-y-3 pt-2 border-t border-slate-800/60">
                  {progress.benefitsProgress.map((bp) => {
                    const { benefit, earnedValue, remainingCap, percentToCap, isCapped, qualifyingSpend, remainingSpendToHitCap } = bp;
                    const isWeekendSpecial = benefit.dayCondition === 'weekends';

                    return (
                      <div
                        key={benefit.id}
                        className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{benefit.name}</span>
                            {isWeekendSpecial && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                Sat & Sun Only
                              </span>
                            )}
                            {benefit.type === 'coins' && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
                                Shopee Coins
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {isCapped ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full border border-red-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                100% Capped (Divert Spend)
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                {percentToCap}% Cap Hit
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>
                              Earned:{' '}
                              <strong className="text-white font-bold">
                                {benefit.type === 'cashback'
                                  ? formatCurrency(earnedValue, currency)
                                  : benefit.type === 'coins'
                                  ? `${earnedValue.toLocaleString()} coins`
                                  : `${earnedValue.toLocaleString()} pts`}
                              </strong>{' '}
                              / {benefit.monthlyCap} {benefit.type === 'coins' ? 'coins' : benefit.type === 'cashback' ? currency : 'pts'}
                            </span>
                            <span>
                              {isCapped
                                ? 'Cap reached'
                                : `Spend ~${formatCurrency(remainingSpendToHitCap, currency)} more to max cap`}
                            </span>
                          </div>

                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isCapped
                                  ? 'bg-gradient-to-r from-red-500 to-amber-500'
                                  : percentToCap > 70
                                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${percentToCap}%` }}
                            />
                          </div>
                        </div>

                        {/* Notes / Details */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Qualifying Spend: {formatCurrency(qualifyingSpend, currency)}</span>
                          <span className="italic">{benefit.notes || 'Monthly revolving quota'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col (5 cols): Interactive Transaction Optimizer / What-If Simulator */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-5 shadow-lg relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Sliders className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Purchase Rewards Simulator</h3>
                  <p className="text-[11px] text-slate-400">
                    Find the optimal card to maximize & balance rewards
                  </p>
                </div>
              </div>
            </div>

            {/* Form Controls */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Estimated Purchase Amount ({currency})</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={simAmountInput}
                    onChange={(e) => setSimAmountInput(e.target.value)}
                    onBlur={() => {
                      if (simAmountInput.trim() === '') setSimAmountInput('0');
                    }}
                    placeholder="0.00"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                  <div className="absolute right-2.5 top-2 flex gap-1">
                    {[100, 250, 500, 1000].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setSimAmountInput(String(quick))}
                        className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                          simAmount === quick
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {quick}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Planned Date {isSimDateWeekend && <span className="text-amber-400 font-bold">(Weekend!)</span>}
                  </label>
                  <input
                    type="date"
                    value={simDate}
                    onChange={(e) => setSimDate(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Spending Category</label>
                  <select
                    value={simCategory}
                    onChange={(e) => setSimCategory(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="dining">Dining & Food Delivery</option>
                    <option value="shopee">Shopee / Online E-commerce</option>
                    <option value="groceries">Supermarket Groceries</option>
                    <option value="utilities">Bills & Utilities</option>
                    <option value="petrol">Petrol / Fuel</option>
                    <option value="travel">Travel & Transport</option>
                    <option value="retail">General Retail & Shopping</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Store (Optional)</label>
                <input
                  type="text"
                  value={simDescription}
                  onChange={(e) => setSimDescription(e.target.value)}
                  placeholder="e.g. Weekend Family Dinner / Shopee 9.9"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Simulation Ranked Cards Output */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Ranked Card Recommendations
              </span>

              {simulationResults.slice(0, 3).map((rec, index) => {
                const isTop = index === 0;
                return (
                  <div
                    key={rec.accountId}
                    className={`p-3 rounded-xl border transition-all text-xs ${
                      isTop
                        ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                        : rec.isCappedWarning
                        ? 'bg-slate-900/40 border-slate-800 opacity-60'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isTop && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-[10px] font-bold text-slate-950">
                            #1 BEST PICK
                          </span>
                        )}
                        <h5 className="font-bold text-white text-xs">{rec.accountName}</h5>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-emerald-400 text-xs">
                          {rec.projectedEarnedDescription}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                      {rec.reason}
                    </p>

                    {rec.isCappedWarning && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-950/30 p-1.5 rounded-lg border border-amber-500/20 mb-2">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span>{rec.balancingAdvice}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800/40">
                      <span>Interest-Free Grace Period: <strong>{rec.gracePeriodDays} days</strong></span>
                      {onQuickLogExpense && isTop && (
                        <button
                          type="button"
                          onClick={() => {
                            onQuickLogExpense({
                              amount: simAmount,
                              accountId: rec.accountId,
                              category: simCategory,
                              description: simDescription || `${rec.accountName} Purchase`,
                              date: simDate,
                            });
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer transition-colors"
                        >
                          <span>Log with this Card</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
