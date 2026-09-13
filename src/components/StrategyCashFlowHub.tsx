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
  Zap
} from 'lucide-react';
import { 
  BillAccount, 
  PaymentScheduleItem, 
  PaymentStrategyType, 
  InstallmentPlan, 
  MonthlyCashFlowProjection,
  UserSettings 
} from '../types';
import { CurrencyCode, formatCurrency } from '../utils/currency';
import { PaymentOptimizerMatrix } from './PaymentOptimizerMatrix';
import { CycleGraceVisualizer } from './CycleGraceVisualizer';
import { InstallmentsCashFlowTracker } from './InstallmentsCashFlowTracker';

interface StrategyCashFlowHubProps {
  accounts: BillAccount[];
  schedule: PaymentScheduleItem[];
  strategy: PaymentStrategyType;
  onStrategyChange: (strat: PaymentStrategyType) => void;
  allocatedCash: number;
  onAllocatedCashChange: (val: number) => void;
  paidScheduleIds: string[];
  scheduledScheduleIds: string[];
  onToggleStatus: (id: string) => void;
  onOpenAIAdvisor: () => void;
  onAdviseSettlement: (accountId?: string) => void;
  installments: InstallmentPlan[];
  projections: MonthlyCashFlowProjection[];
  onAddInstallment: (plan: Omit<InstallmentPlan, 'id'>) => void;
  onDeleteInstallment: (planId: string) => void;
  currency: CurrencyCode;
}

export const StrategyCashFlowHub: React.FC<StrategyCashFlowHubProps> = ({
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
}) => {
  const [subView, setSubView] = useState<'sequencing' | 'cycle_matrix' | 'installments'>('sequencing');

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
            <span>Payment Sequencing Engine</span>
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
            <span>Grace Float & Cycle Calendar</span>
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
            <span>0% Installments & Projections ({installments.length})</span>
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
