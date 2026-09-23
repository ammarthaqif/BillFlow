import React, { useState } from 'react';
import { 
  Sliders, 
  Calendar, 
  ShoppingBag, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck,
  ChevronRight,
  Layers,
  Zap,
  Gift
} from 'lucide-react';
import { 
  BillAccount, 
  PaymentScheduleItem, 
  PaymentStrategyType, 
  InstallmentPlan, 
  MonthlyCashFlowProjection,
  UserSettings,
  ExpenseItem,
  UtilityBillItem
} from '../types';
import { CurrencyCode, formatCurrency } from '../utils/currency';
import { PaymentOptimizerMatrix } from './PaymentOptimizerMatrix';
import { CycleGraceVisualizer } from './CycleGraceVisualizer';
import { InstallmentsCashFlowTracker } from './InstallmentsCashFlowTracker';
import { RewardsCashbackBalancer } from './RewardsCashbackBalancer';
import { UtilityBillOptimizer } from './UtilityBillOptimizer';

interface StrategyCashFlowHubProps {
  initialView?: 'sequencer' | 'cycle_matrix' | 'installments' | 'rewards_balancer' | 'utilities';
  accounts: BillAccount[];
  schedule: PaymentScheduleItem[];
  strategy: PaymentStrategyType;
  onStrategyChange: (strat: PaymentStrategyType) => void;
  allocatedCash: number;
  onAllocatedCashChange: (val: number) => void;
  paidScheduleIds: Set<string> | string[];
  scheduledScheduleIds: Set<string> | string[];
  onToggleStatus: (id: string) => void;
  onOpenAIAdvisor: () => void;
  onAdviseSettlement: (accountId?: string) => void;
  installments: InstallmentPlan[];
  projections: MonthlyCashFlowProjection[];
  onAddInstallment: (plan: Omit<InstallmentPlan, 'id'>) => void;
  onDeleteInstallment: (planId: string) => void;
  currency: CurrencyCode;
  expenses?: ExpenseItem[];
  onUpdateAccount?: (account: BillAccount) => void;
  onQuickLogExpense?: (prefill: { amount: number; accountId: string; category: string; description: string; date: string }) => void;
  utilityBills?: UtilityBillItem[];
  settings?: UserSettings;
  onAddBill?: (bill: Omit<UtilityBillItem, 'id' | 'createdAt'>) => void;
  onUpdateBill?: (bill: UtilityBillItem) => void;
  onDeleteBill?: (id: string) => void;
  onExecuteBillPayment?: (
    bill: UtilityBillItem,
    targetAccountId: string,
    targetAccountName: string,
    paidAmount: number
  ) => void;
  onAddExpense?: (expense: Omit<ExpenseItem, 'id'>) => void;
}

export const StrategyCashFlowHub: React.FC<StrategyCashFlowHubProps> = ({
  initialView = 'sequencer',
  accounts = [],
  schedule = [],
  strategy,
  onStrategyChange,
  allocatedCash,
  onAllocatedCashChange,
  paidScheduleIds,
  scheduledScheduleIds,
  onToggleStatus,
  onOpenAIAdvisor,
  onAdviseSettlement,
  installments = [],
  projections = [],
  onAddInstallment,
  onDeleteInstallment,
  currency,
  expenses = [],
  onUpdateAccount,
  onQuickLogExpense,
  utilityBills = [],
  settings,
  onAddBill,
  onUpdateBill,
  onDeleteBill,
  onExecuteBillPayment,
  onAddExpense,
}) => {
  const [subView, setSubView] = useState<'sequencing' | 'cycle_matrix' | 'installments' | 'rewards_balancer' | 'utilities'>(
    initialView === 'cycle_matrix'
      ? 'cycle_matrix'
      : initialView === 'installments'
      ? 'installments'
      : initialView === 'rewards_balancer'
      ? 'rewards_balancer'
      : initialView === 'utilities'
      ? 'utilities'
      : 'sequencing'
  );

  const pendingUtilityCount = utilityBills.filter((b) => b.status !== 'paid').length;

  return (
    <div className="space-y-5">
      {/* Strategy Cockpit Sub-Navigation */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSubView('sequencing')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subView === 'sequencing'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Payment Sequencing</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('cycle_matrix')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subView === 'cycle_matrix'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Grace Float Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('rewards_balancer')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subView === 'rewards_balancer'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            <span>Cashback & Rewards Balancer</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('utilities')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subView === 'utilities'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Utility & SPayLater Advisor</span>
            {pendingUtilityCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                subView === 'utilities' ? 'bg-black/30 text-white' : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
              }`}>
                {pendingUtilityCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubView('installments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subView === 'installments'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>0% Installments ({installments.length})</span>
          </button>
        </div>

        {/* Quick Advisor CTA */}
        <button
          type="button"
          onClick={onOpenAIAdvisor}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-950 to-purple-950 hover:from-indigo-900 hover:to-purple-900 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Consult AI Strategist</span>
        </button>
      </div>

      {/* Sub-view Render */}
      {subView === 'sequencing' && (
        <PaymentOptimizerMatrix
          accounts={accounts}
          schedule={schedule}
          strategy={strategy}
          onStrategyChange={onStrategyChange}
          allocatedCash={allocatedCash}
          onAllocatedCashChange={onAllocatedCashChange}
          paidScheduleIds={paidScheduleIds}
          scheduledScheduleIds={scheduledScheduleIds}
          onToggleStatus={onToggleStatus}
          onOpenAIAdvisor={onOpenAIAdvisor}
          onAdviseSettlement={onAdviseSettlement}
        />
      )}

      {subView === 'cycle_matrix' && (
        <CycleGraceVisualizer
          accounts={accounts}
          currency={currency}
        />
      )}

      {subView === 'rewards_balancer' && (
        <RewardsCashbackBalancer
          accounts={accounts}
          expenses={expenses}
          currency={currency}
          onUpdateAccount={onUpdateAccount}
          onQuickLogExpense={onQuickLogExpense}
        />
      )}

      {subView === 'utilities' && (
        <UtilityBillOptimizer
          bills={utilityBills}
          accounts={accounts}
          settings={settings || {
            monthlyIncome: 7000,
            salaryPayday: 25,
            allocatedCashForBills: 3500,
            emergencyBufferGoal: 5000,
            currentEmergencyFund: 3000,
            notificationPreferences: {
              emailAlerts: true,
              pushNotifications: true,
              daysBeforeDueAlert: 3,
              highUtilizationWarning: true,
              utilizationThresholdPercent: 70
            },
            currency: currency
          }}
          activeCurrency={currency}
          onAddBill={onAddBill || (() => {})}
          onUpdateBill={onUpdateBill || (() => {})}
          onDeleteBill={onDeleteBill || (() => {})}
          onExecuteBillPayment={onExecuteBillPayment || (() => {})}
          onAddExpense={onAddExpense}
        />
      )}

      {subView === 'installments' && (
        <InstallmentsCashFlowTracker
          installments={installments}
          accounts={accounts}
          projections={projections}
          onAddInstallment={onAddInstallment}
          onDeleteInstallment={onDeleteInstallment}
          currency={currency}
        />
      )}
    </div>
  );
};
