import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Check, 
  Receipt, 
  Building2, 
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { QuickPayTemplate, BillAccount, ExpenseCategory, SettlementMethod, PaymentMode } from '../types';
import { CurrencyCode, formatCurrency, getCurrencyConfig } from '../utils/currency';
import { EXPENSE_CATEGORIES_LIST, SETTLEMENT_METHODS_CONFIG, getExpenseCategoryIcon } from '../utils/accountUtils';

interface QuickPayManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: QuickPayTemplate[];
  accounts: BillAccount[];
  currency: CurrencyCode;
  onSaveTemplate: (template: QuickPayTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onSelectForPay: (template: QuickPayTemplate) => void;
}

export const QuickPayManageModal: React.FC<QuickPayManageModalProps> = ({
  isOpen,
  onClose,
  templates = [],
  accounts = [],
  currency,
  onSaveTemplate,
  onDeleteTemplate,
  onSelectForPay,
}) => {
  if (!isOpen) return null;

  const currencyConfig = getCurrencyConfig(currency);
  const bankAccounts = accounts.filter((a) => a.type === 'bank_account');
  const allFundingAccounts = accounts.filter(
    (a) => a.type === 'bank_account' || a.type === 'credit_card' || a.type === 'ewallet_pay_later'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [beneficiaryAccountOrRef, setBeneficiaryAccountOrRef] = useState('');
  const [defaultAmount, setDefaultAmount] = useState<string>('100.00');
  const [category, setCategory] = useState<ExpenseCategory>('Utilities (Electricity, Water, IWK)');
  const [settlementMethod, setSettlementMethod] = useState<SettlementMethod>('jompay');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [sourceAccountId, setSourceAccountId] = useState<string>(bankAccounts[0]?.id || accounts[0]?.id || '');
  const [frequencyHint, setFrequencyHint] = useState<'monthly' | 'bi_weekly' | 'weekly' | 'ad_hoc'>('monthly');
  const [notes, setNotes] = useState('');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setBeneficiary('');
    setBeneficiaryAccountOrRef('');
    setDefaultAmount('100.00');
    setCategory('Utilities (Electricity, Water, IWK)');
    setSettlementMethod('jompay');
    setPaymentMode('cash');
    setSourceAccountId(bankAccounts[0]?.id || accounts[0]?.id || '');
    setFrequencyHint('monthly');
    setNotes('');
    setEditingTemplateId(null);
    setIsEditing(false);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleStartEdit = (t: QuickPayTemplate) => {
    setEditingTemplateId(t.id);
    setTitle(t.title);
    setBeneficiary(t.beneficiary);
    setBeneficiaryAccountOrRef(t.beneficiaryAccountOrRef);
    setDefaultAmount(t.defaultAmount.toString());
    setCategory(t.category);
    setSettlementMethod(t.settlementMethod || 'jompay');
    setPaymentMode(t.paymentMode || 'cash');
    setSourceAccountId(t.sourceAccountId || bankAccounts[0]?.id || accounts[0]?.id || '');
    setFrequencyHint(t.frequencyHint || 'monthly');
    setNotes(t.notes || '');
    setIsEditing(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !beneficiary.trim()) return;

    const selectedAcc = accounts.find((a) => a.id === sourceAccountId);
    const existing = editingTemplateId ? templates.find((t) => t.id === editingTemplateId) : null;

    const templateToSave: QuickPayTemplate = {
      id: editingTemplateId || `qpt-${Date.now().toString(36)}`,
      title: title.trim(),
      beneficiary: beneficiary.trim(),
      beneficiaryAccountOrRef: beneficiaryAccountOrRef.trim() || 'Direct Online Settlement',
      defaultAmount: parseFloat(defaultAmount) || 0,
      category,
      settlementMethod,
      paymentMode,
      sourceAccountId: sourceAccountId || undefined,
      sourceAccountName: selectedAcc ? selectedAcc.name : undefined,
      frequencyHint,
      notes: notes.trim() || undefined,
      usageCount: existing ? existing.usageCount : 0,
      lastUsedAt: existing?.lastUsedAt,
      createdAt: existing?.createdAt || new Date().toISOString(),
      ownerName: existing?.ownerName || 'Active User',
      ownerRole: existing?.ownerRole || 'self',
    };

    onSaveTemplate(templateToSave);
    resetForm();
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.beneficiary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.beneficiaryAccountOrRef.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'all' || t.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div 
        id="quick-pay-manage-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-100">Manage Quick Pay Templates</h3>
              <p className="text-xs text-slate-400">
                Configure common recurring billers, default amounts & beneficiaries for instant settlements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                id="create-new-quick-pay-template-btn"
                onClick={handleStartCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Template</span>
              </button>
            )}
            <button 
              id="close-quick-pay-manage-modal-btn"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isEditing ? (
            /* CREATE / EDIT FORM */
            <form onSubmit={handleSaveSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="font-semibold text-sm text-amber-400 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  {editingTemplateId ? 'Edit Quick Pay Template' : 'Create New Quick Pay Template'}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Template Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. TNB Electricity (Home)"
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Beneficiary / Biller Name *</label>
                  <input
                    type="text"
                    required
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    placeholder="e.g. Tenaga Nasional Berhad"
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-300">
                    Biller Code / Account / Ref Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={beneficiaryAccountOrRef}
                    onChange={(e) => setBeneficiaryAccountOrRef(e.target.value)}
                    placeholder="e.g. JomPAY Biller Code: 5454 / Ref: 220048190291"
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Default Amount ({currencyConfig.symbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={defaultAmount}
                    onChange={(e) => setDefaultAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Expense Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    {EXPENSE_CATEGORIES_LIST.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Settlement Method</label>
                  <select
                    value={settlementMethod}
                    onChange={(e) => setSettlementMethod(e.target.value as SettlementMethod)}
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    {SETTLEMENT_METHODS_CONFIG.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Billing Frequency</label>
                  <select
                    value={frequencyHint}
                    onChange={(e) => setFrequencyHint(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="bi_weekly">Bi-Weekly</option>
                    <option value="weekly">Weekly</option>
                    <option value="ad_hoc">Ad-Hoc / As Needed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Preferred Source Funding Account</label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    {allFundingAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.institution}) — {acc.type === 'bank_account' ? `Balance: ${formatCurrency(acc.totalBalance, currency)}` : `Statement: ${formatCurrency(acc.statementBalance, currency)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Notes & Reminder Instructions</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Settle before 15th to prevent penalty"
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-quick-pay-template-btn"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-md shadow-amber-500/15"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTemplateId ? 'Save Changes' : 'Create Template'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* TEMPLATE LIST VIEW */
            <>
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search templates, billers, or account ref..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="all">All Categories ({templates.length})</option>
                  {EXPENSE_CATEGORIES_LIST.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Templates Grid */}
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/40">
                  <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-300">No Quick Pay Templates Found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Save recurring utility bills, allowances, or school fees to settle them in 1-click every month.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Template</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredTemplates.map((template) => {
                    const isDeleting = deleteConfirmId === template.id;

                    return (
                      <div
                        key={template.id}
                        className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 transition-all flex flex-col justify-between space-y-3 group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {getExpenseCategoryIcon(template.category, 'w-4 h-4')}
                              </span>
                              <div>
                                <h4 className="font-semibold text-sm text-slate-100 leading-tight">
                                  {template.title}
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5">{template.beneficiary}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-amber-400 font-mono">
                              {formatCurrency(template.defaultAmount, currency)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 font-mono mt-2 line-clamp-1 bg-slate-900/60 px-2 py-1 rounded-md border border-slate-800">
                            {template.beneficiaryAccountOrRef}
                          </p>

                          {template.notes && (
                            <p className="text-[11px] text-slate-400 mt-2 italic line-clamp-1">
                              "{template.notes}"
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400">
                            Used {template.usageCount || 0}x
                            {template.lastUsedAt && (
                              <span className="ml-1.5 text-slate-400">
                                • Last paid {new Date(template.lastUsedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </span>

                          <div className="flex items-center gap-1">
                            {isDeleting ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onDeleteTemplate(template.id)}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-[10px] font-bold text-white transition-colors"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-0.5 rounded bg-slate-700 text-[10px] text-slate-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(template)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
                                  title="Edit Template"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(template.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-colors"
                                  title="Delete Template"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onSelectForPay(template);
                                  }}
                                  className="flex items-center gap-1 ml-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 transition-all"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>Pay ⚡</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
