import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  DollarSign, 
  Zap,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { AIAdvisorResponse, BillAccount, PaymentStrategyType, UserProfile } from '../types';
import { CurrencyCode, formatCurrency } from '../utils/currency';

interface AIAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BillAccount[];
  strategy: PaymentStrategyType;
  liquidCash: number;
  currency?: CurrencyCode;
  currentUser?: UserProfile | null;
  onIncrementUsage?: () => void;
  onUpgradeToPro?: () => void;
}

export const AIAdvisorModal: React.FC<AIAdvisorModalProps> = ({
  isOpen,
  onClose,
  accounts,
  strategy,
  liquidCash,
  currency = 'MYR',
  currentUser,
  onIncrementUsage,
  onUpgradeToPro,
}) => {
  const [loading, setLoading] = useState(false);
  const [advisorData, setAdvisorData] = useState<AIAdvisorResponse | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');

  if (!isOpen) return null;

  const isFreeTier = currentUser?.tier === 'free';
  const aiUsed = currentUser?.tierLimits?.aiConsultationsUsed || 0;
  const aiLimit = currentUser?.tierLimits?.monthlyAiConsultations || 3;
  const isLimitReached = isFreeTier && aiUsed >= aiLimit;

  const quickPrompts = [
    'How do I maximize cash float until my 15th paycheck?',
    'Should I prioritize SPayLater or Amex Gold first?',
    'What is the minimum cash required to guarantee 0 in late fees?',
    'Analyze my multi-month installment burden and suggest fixes',
  ];

  const fetchAdvice = async (question?: string) => {
    if (isLimitReached) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/gemini/advise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
          liquidCash,
          currency,
          userQuestion: question || customQuestion,
        }),
      });
      const data = await res.json();
      setAdvisorData(data);
      onIncrementUsage?.();
    } catch (err) {
      console.error('Failed to get advice:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">AI Cash Flow & Payment Strategist</h3>
                {isFreeTier ? (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Free Quota: {aiUsed}/{aiLimit}
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Gemini 3.8 Flash • Pro
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Personalized algorithmic analysis across cycle dates, float windows, & installments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Limit Warning Banner */}
        {isLimitReached && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Free Plan Limit: You have reached {aiLimit} AI consultations this month.</span>
            </div>
            {onUpgradeToPro && (
              <button
                onClick={onUpgradeToPro}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="space-y-4 overflow-y-auto pr-1 grow">
          {/* Action Trigger Banner */}
          {!advisorData && !loading && (
            <div className="text-center py-6 space-y-3 bg-slate-800/40 rounded-xl border border-slate-700/60 p-5">
              <Bot className="w-10 h-10 text-indigo-400 mx-auto" />
              <h4 className="font-bold text-sm text-white">Synthesize Live Financial Optimization</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Gemini analyzes your {accounts.length} linked accounts ({formatCurrency(liquidCash, currency)} liquid cash) to formulate an airtight, zero-late-fee payment game plan.
              </p>
              <button
                id="btn-run-ai-analysis"
                onClick={() => fetchAdvice()}
                disabled={isLimitReached}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                Run AI Strategy Synthesis
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="text-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <div className="text-sm font-semibold text-white">Synthesizing Cost-Effective Sequence...</div>
              <p className="text-xs text-slate-400">
                Evaluating cycle cutoff dates, grace periods, APR penalties, and multi-month installment tenure.
              </p>
            </div>
          )}

          {/* AI Advisor Results View */}
          {advisorData && !loading && (
            <div className="space-y-4 text-xs">
              {/* Executive Summary Card */}
              <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 p-4 rounded-xl border border-indigo-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    AI Strategic Executive Summary
                  </span>
                  <span className="text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {advisorData.savingsEstimated || 'Saved in Penalties'}
                  </span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed">{advisorData.executiveSummary}</p>
              </div>

              {/* Recommended Sequence */}
              {advisorData.recommendedSequence && advisorData.recommendedSequence.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                    Recommended Payment Schedule
                  </div>
                  <div className="space-y-2">
                    {advisorData.recommendedSequence.map((step, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-white text-xs">{step.accountName}</span>
                            <span className="text-indigo-300 text-[11px]">Pay on {step.recommendedPayDate}</span>
                          </div>
                          <p className="text-slate-400 text-[11px] pl-7">{step.rationale}</p>
                        </div>

                        <div className="text-right pl-7 sm:pl-0">
                          <div className="text-sm font-bold text-white">{formatCurrency(step.amount, currency)}</div>
                          <span className="text-[10px] text-emerald-400 font-medium capitalize">
                            {step.paymentType.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cash Flow & Installments Insight */}
              {advisorData.cashFlowInsight && (
                <div className="bg-purple-950/30 p-3.5 rounded-xl border border-purple-800/30 space-y-1">
                  <div className="font-semibold text-purple-300 text-xs">
                    Multi-Month Installment Cash Flow Impact
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{advisorData.cashFlowInsight}</p>
                </div>
              )}

              {/* Risk Pitfalls */}
              {advisorData.riskAlerts && advisorData.riskAlerts.length > 0 && (
                <div className="bg-rose-950/30 p-3.5 rounded-xl border border-rose-800/30 space-y-1.5">
                  <div className="font-semibold text-rose-300 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Key Cash Flow Pitfalls to Guard Against
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-slate-300 text-[11px]">
                    {advisorData.riskAlerts.map((risk, i) => (
                      <li key={i}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Re-run button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => fetchAdvice()}
                  disabled={isLimitReached}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh AI Analysis</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Question Chips & Prompt Bar */}
        <div className="border-t border-slate-800 pt-3 space-y-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCustomQuestion(q);
                  fetchAdvice(q);
                }}
                disabled={isLimitReached}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask custom question about your bills, paychecks, or grace float..."
              value={customQuestion ?? ''}
              onChange={(e) => setCustomQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchAdvice();
              }}
              disabled={isLimitReached}
              className="grow bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs disabled:opacity-50"
            />
            <button
              onClick={() => fetchAdvice()}
              disabled={loading || isLimitReached}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
