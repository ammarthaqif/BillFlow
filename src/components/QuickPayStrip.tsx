import React from 'react';
import { 
  Zap, 
  Plus, 
  Settings2, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { QuickPayTemplate, BillAccount } from '../types';
import { CurrencyCode, formatCurrency } from '../utils/currency';
import { getExpenseCategoryIcon } from '../utils/accountUtils';

interface QuickPayStripProps {
  templates: QuickPayTemplate[];
  accounts: BillAccount[];
  currency: CurrencyCode;
  onSelectForPay: (template: QuickPayTemplate) => void;
  onOpenManage: () => void;
  onOpenCreate: () => void;
}

export const QuickPayStrip: React.FC<QuickPayStripProps> = ({
  templates = [],
  accounts = [],
  currency,
  onSelectForPay,
  onOpenManage,
  onOpenCreate,
}) => {
  // Sort templates: prioritize recently used or most used
  const displayTemplates = [...templates].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 6);

  return (
    <div 
      id="quick-pay-templates-strip"
      className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Zap className="w-4 h-4 fill-amber-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-100">Quick Pay Templates</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                1-Click Settle
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Instant settlement of recurring utility bills, school fees & living dues
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="manage-quick-pay-templates-btn"
            onClick={onOpenManage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Manage ({templates.length})</span>
          </button>
          <button
            type="button"
            id="strip-add-quick-pay-template-btn"
            onClick={onOpenCreate}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-2">
          <Zap className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-300 font-medium">No Quick Pay Templates Saved</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Save common bills like TNB electricity, Unifi WiFi, or parents' allowance to pay in seconds.
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Template</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayTemplates.map((tpl) => {
            const daysAgo = tpl.lastUsedAt
              ? Math.floor((Date.now() - new Date(tpl.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div
                key={tpl.id}
                id={`quick-pay-card-${tpl.id}`}
                className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/70 hover:border-amber-500/40 transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => onSelectForPay(tpl)}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                        {getExpenseCategoryIcon(tpl.category, 'w-3.5 h-3.5')}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs text-slate-100 truncate group-hover:text-amber-300 transition-colors">
                          {tpl.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {tpl.beneficiary}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Default</span>
                      <span className="text-sm font-bold text-slate-100 font-mono">
                        {formatCurrency(tpl.defaultAmount, currency)}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-slate-900/80 text-slate-300 border border-slate-700/70 uppercase">
                      {tpl.settlementMethod.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 font-mono mt-2 truncate bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-800/80">
                    {tpl.beneficiaryAccountOrRef}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    {daysAgo !== null ? (
                      <span>Paid {daysAgo === 0 ? 'today' : `${daysAgo}d ago`}</span>
                    ) : (
                      <span>Used {tpl.usageCount || 0}x</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectForPay(tpl);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 group-hover:bg-amber-400 transition-colors shadow-sm active:scale-95"
                  >
                    <Zap className="w-3 h-3 fill-slate-950" />
                    <span>Pay ⚡</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
