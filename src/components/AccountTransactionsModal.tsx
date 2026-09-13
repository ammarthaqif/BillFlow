import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Wallet, 
  X, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Edit3, 
  Trash2, 
  Sparkles,
  ArrowRight,
  RotateCcw,
  Calendar,
  Layers,
  SplitSquareVertical,
  Check,
  AlertCircle
} from 'lucide-react';
import { BillAccount, ExpenseItem, SettlementMethod } from '../types';
import { formatCurrency, CurrencyCode, getCurrencyConfig } from '../utils/currency';
import { getAccountTypeLabel, renderAccountIcon, getExpenseCategoryIcon } from '../utils/accountUtils';

interface AccountTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: BillAccount | null;
  expenses: ExpenseItem[];
  currency?: CurrencyCode | string;
  onAddTransactionForAccount: (account: BillAccount) => void;
  onEditTransaction: (expense: ExpenseItem) => void;
  onDeleteTransaction: (expenseId: string) => void;
  onSettleTransaction: (expense: ExpenseItem) => void;
  onSyncStatementBalanceFromTransactions?: (accountId: string) => void;
  onEditAccountDetails?: (account: BillAccount) => void;
}

export const AccountTransactionsModal: React.FC<AccountTransactionsModalProps> = ({
  isOpen,
  onClose,
  account,
  expenses = [],
  currency = 'MYR',
  onAddTransactionForAccount,
  onEditTransaction,
  onDeleteTransaction,
  onSettleTransaction,
  onSyncStatementBalanceFromTransactions,
  onEditAccountDetails,
}) => {
  const currencyConfig = getCurrencyConfig(currency);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unsettled' | 'settled'>('all');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Filter expenses strictly belonging to this account
  const accountExpenses = useMemo(() => {
    if (!account) return [];
    return (expenses || []).filter((e) => e.accountId === account.id);
  }, [account, expenses]);

  // Derived metrics for this card/BNPL
  const metrics = useMemo(() => {
    let totalPurchases = 0;
    let unsettledAmount = 0;
    let settledAmount = 0;
    let splitCount = 0;

    accountExpenses.forEach((e) => {
      totalPurchases += e.amount;
      if (e.status === 'settled') {
        settledAmount += e.amount;
      } else {
        unsettledAmount += e.amount;
      }
      if (e.repaymentStructure === 'split_months' || (e.splitMonths && e.splitMonths > 1)) {
        splitCount += 1;
      }
    });

    return {
      totalPurchases,
      unsettledAmount,
      settledAmount,
      unsettledCount: accountExpenses.filter((e) => e.status !== 'settled').length,
      settledCount: accountExpenses.filter((e) => e.status === 'settled').length,
      splitCount,
    };
  }, [accountExpenses]);

  // Filtered expenses list
  const filteredList = useMemo(() => {
    return accountExpenses
      .filter((e) => {
        if (searchTerm.trim()) {
          const t = searchTerm.toLowerCase();
          const matchTitle = e.title.toLowerCase().includes(t);
          const matchMerchant = (e.merchant || '').toLowerCase().includes(t);
          const matchCategory = e.category.toLowerCase().includes(t);
          if (!matchTitle && !matchMerchant && !matchCategory) return false;
        }

        if (statusFilter !== 'all' && e.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [accountExpenses, searchTerm, statusFilter]);

  if (!isOpen || !account) return null;

  const utilRatio = Math.round((account.statementBalance / (account.creditLimit || 1)) * 100);

  const handleSyncBalance = () => {
    if (onSyncStatementBalanceFromTransactions) {
      onSyncStatementBalanceFromTransactions(account.id);
      setSyncNotice(`Reconciled statement balance to ${formatCurrency(metrics.unsettledAmount, currency)} based on active pending swipes.`);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-3xl w-full shadow-2xl space-y-5 relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Decorative backdrop glow */}
        <div 
          className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: account.color || '#6366f1' }}
        />

        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0"
              style={{ backgroundColor: account.color || '#4f46e5' }}
            >
              {renderAccountIcon(account.type, 'w-6 h-6 text-white')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">{account.name}</h2>
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${account.color}25`, color: account.color }}
                >
                  {getAccountTypeLabel(account.type)}
                </span>
                {account.ownerName && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                    {account.ownerName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {account.institution} • {account.accountNumberMask} • Due Day {account.cycleDay} of month
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditAccountDetails && (
              <button
                onClick={() => {
                  onEditAccountDetails(account);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Edit Account Details
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Balances & Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] text-slate-400 font-medium">Statement Balance</span>
            <div className="text-base font-black text-amber-400 mt-0.5 font-mono">
              {formatCurrency(account.statementBalance, currency)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Limit: {formatCurrency(account.creditLimit, currency)}
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] text-slate-400 font-medium">Unsettled Charges</span>
            <div className="text-base font-black text-white mt-0.5 font-mono">
              {formatCurrency(metrics.unsettledAmount, currency)}
            </div>
            <div className="text-[10px] text-amber-400/90 mt-0.5">
              {metrics.unsettledCount} pending swipes
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] text-slate-400 font-medium">Settled / Cleared</span>
            <div className="text-base font-black text-emerald-400 mt-0.5 font-mono">
              {formatCurrency(metrics.settledAmount, currency)}
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">
              {metrics.settledCount} cleared bills
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] text-slate-400 font-medium">Split Commitments</span>
            <div className="text-base font-black text-purple-400 mt-0.5">
              {metrics.splitCount} Plans
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Multi-month installments
            </div>
          </div>
        </div>

        {/* Sync / Reconciliation Banner */}
        {syncNotice && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Action Controls & Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 pt-1">
          <div className="flex items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search transactions on ${account.name}...`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({accountExpenses.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unsettled')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === 'unsettled' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pending ({metrics.unsettledCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('settled')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === 'settled' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Settled ({metrics.settledCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSyncStatementBalanceFromTransactions && (
              <button
                type="button"
                onClick={handleSyncBalance}
                className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Calculate statement balance from all unsettled pending transactions"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sync Balance</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onAddTransactionForAccount(account)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Transaction</span>
            </button>
          </div>
        </div>

        {/* Transactions List (Scrollable) */}
        <div className="overflow-y-auto space-y-2 flex-1 pr-1 border-t border-slate-800/80 pt-3">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800/60">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">No Transactions Recorded</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchTerm
                    ? 'No transactions matched your search query.'
                    : `No transactions found on ${account.name}. Click "Record Transaction" to log purchases, installments, or bills.`}
                </p>
              </div>
              <button
                onClick={() => onAddTransactionForAccount(account)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Transaction</span>
              </button>
            </div>
          ) : (
            filteredList.map((expense) => {
              const CategoryIcon = getExpenseCategoryIcon(expense.category);
              const isSplit = expense.repaymentStructure === 'split_months' || (expense.splitMonths && expense.splitMonths > 1);

              return (
                <div
                  key={expense.id}
                  className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/70 hover:border-slate-700/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                      <CategoryIcon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs">{expense.title}</span>
                        {expense.merchant && (
                          <span className="text-[11px] text-slate-400">
                            • {expense.merchant}
                          </span>
                        )}
                        {expense.status === 'settled' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Settled</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Pending Statement</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{expense.date}</span>
                        <span>•</span>
                        <span>{expense.category}</span>
                        {isSplit && (
                          <>
                            <span>•</span>
                            <span className="text-purple-300 font-medium">
                              Split: {expense.splitMonths || 3} Months
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-black text-white font-mono">
                        {formatCurrency(expense.amount, currency)}
                      </div>
                      {isSplit && (
                        <div className="text-[10px] text-purple-300">
                          {formatCurrency(expense.monthlySplitAmount || (expense.amount / (expense.splitMonths || 3)), currency)} / mo
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {expense.status !== 'settled' && (
                        <button
                          onClick={() => onSettleTransaction(expense)}
                          className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 hover:text-white border border-emerald-500/30 transition-colors cursor-pointer"
                          title="Settle immediately via FPX"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onEditTransaction(expense)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                        title="Edit transaction details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteTransaction(expense.id)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Dedicated User DB • Auto-reconciled with Optimizer & Cash Flow Projections</span>
          </div>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
