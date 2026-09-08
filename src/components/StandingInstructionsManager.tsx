import React, { useState } from 'react';
import { 
  CalendarClock, 
  Plus, 
  CheckCircle2, 
  PauseCircle, 
  PlayCircle, 
  Trash2, 
  Building2, 
  CreditCard, 
  ArrowRight, 
  Info,
  Calendar,
  AlertTriangle,
  Zap,
  Repeat,
  DollarSign,
  Tag
} from 'lucide-react';
import { 
  StandingInstruction, 
  BillAccount, 
  UserProfile, 
  StandingInstructionFrequency, 
  StandingInstructionMethod 
} from '../types';
import { formatCurrency, CurrencyCode } from '../utils/currency';

interface StandingInstructionsManagerProps {
  standingInstructions: StandingInstruction[];
  accounts: BillAccount[];
  currentUser: UserProfile;
  activeCurrency?: CurrencyCode | string;
  currency?: CurrencyCode | string;
  onAddInstruction?: (instruction: StandingInstruction) => void;
  onAdd?: (instruction: any) => void;
  onUpdateInstruction?: (instruction: StandingInstruction) => void;
  onUpdate?: (instruction: StandingInstruction) => void;
  onDeleteInstruction?: (instructionId: string) => void;
  onDelete?: (instructionId: string) => void;
  onExecuteNow: (instruction: StandingInstruction) => void;
  onUpgradeToPro?: () => void;
}

export function StandingInstructionsManager({
  standingInstructions,
  accounts,
  currentUser,
  activeCurrency,
  currency,
  onAddInstruction,
  onAdd,
  onUpdateInstruction,
  onUpdate,
  onDeleteInstruction,
  onDelete,
  onExecuteNow,
  onUpgradeToPro,
}: StandingInstructionsManagerProps) {
  const currentCurrency = activeCurrency || currency || 'MYR';
  const handleAdd = onAddInstruction || onAdd;
  const handleUpdate = onUpdateInstruction || onUpdate;
  const handleDelete = onDeleteInstruction || onDelete;

  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [billerOrRecipient, setBillerOrRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<StandingInstructionFrequency>('monthly');
  const [executionDay, setExecutionDay] = useState(1);
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || '');
  const [method, setMethod] = useState<StandingInstructionMethod>('bank_standing_instruction');
  const [category, setCategory] = useState('Loan Repayment');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [autoExecuted, setAutoExecuted] = useState(true);
  const [ownerRole, setOwnerRole] = useState<'husband' | 'wife' | 'joint'>(
    currentUser.familyRole === 'wife' ? 'wife' : 'husband'
  );

  const isFreeTier = currentUser.tier === 'free';
  const maxLimit = currentUser.tierLimits?.maxStandingInstructions || 3;
  const isLimitReached = isFreeTier && standingInstructions.length >= maxLimit;

  // Calculations
  const activeInstructions = standingInstructions.filter((i) => i.isActive);
  const monthlyTotal = activeInstructions.reduce((sum, item) => {
    let monthlyEquiv = item.amount;
    if (item.frequency === 'weekly') monthlyEquiv = item.amount * 4.33;
    if (item.frequency === 'bi_weekly') monthlyEquiv = item.amount * 2.16;
    if (item.frequency === 'quarterly') monthlyEquiv = item.amount / 3;
    if (item.frequency === 'yearly') monthlyEquiv = item.amount / 12;
    return sum + monthlyEquiv;
  }, 0);

  const filteredItems = standingInstructions.filter((item) => {
    if (filter === 'active' && !item.isActive) return false;
    if (filter === 'paused' && item.isActive) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.billerOrRecipient.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle Create
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || parseFloat(amount) <= 0) return;

    if (isLimitReached) {
      return;
    }

    const selectedAcc = accounts.find((a) => a.id === sourceAccountId);
    const newInstruction: StandingInstruction = {
      id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      billerOrRecipient: billerOrRecipient.trim() || title.trim(),
      amount: parseFloat(amount),
      frequency,
      executionDay: Number(executionDay),
      sourceAccountId,
      sourceAccountName: selectedAcc ? selectedAcc.name : 'Primary Account',
      method,
      category,
      isActive: true,
      autoExecuted,
      startDate: new Date().toISOString().split('T')[0],
      nextExecutionDate: calculateNextDate(Number(executionDay)),
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      ownerName: ownerRole === 'joint' ? 'Ammar & Sarah (Joint)' : `${currentUser.name} (${ownerRole})`,
      ownerRole,
    };

    if (handleAdd) {
      handleAdd(newInstruction);
    }
    setShowAddModal(false);
    resetForm();
  };

  const calculateNextDate = (day: number) => {
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth(), day);
    if (target < today) {
      target.setMonth(target.getMonth() + 1);
    }
    return target.toISOString().split('T')[0];
  };

  const resetForm = () => {
    setTitle('');
    setBillerOrRecipient('');
    setAmount('');
    setExecutionDay(1);
    setReferenceNumber('');
    setNotes('');
  };

  const applyPreset = (presetType: 'mortgage' | 'unifi' | 'car' | 'insurance') => {
    if (presetType === 'mortgage') {
      setTitle('MaxiHome Mortgage Auto-Debit');
      setBillerOrRecipient('Maybank Islamic Home Financing');
      setAmount('1980');
      setExecutionDay(1);
      setCategory('Loan Repayment');
      setMethod('bank_standing_instruction');
      setReferenceNumber('MYB-LN-89210');
    } else if (presetType === 'unifi') {
      setTitle('UNIFI 300Mbps Fibre Auto-Charge');
      setBillerOrRecipient('Telekom Malaysia (TM)');
      setAmount('159');
      setExecutionDay(15);
      setCategory('Internet & Broadband');
      setMethod('auto_card_charge');
      setReferenceNumber('TM-ACC-982103');
    } else if (presetType === 'car') {
      setTitle('Car Hire Purchase Monthly Transfer');
      setBillerOrRecipient('Public Bank Auto Financing');
      setAmount('740');
      setExecutionDay(5);
      setCategory('Vehicle & Fuel');
      setMethod('bank_standing_instruction');
      setReferenceNumber('HP-PB-449102');
    } else if (presetType === 'insurance') {
      setTitle('Prudential Family Medical Card');
      setBillerOrRecipient('Prudential Assurance Malaysia');
      setAmount('320');
      setExecutionDay(28);
      setCategory('Insurance');
      setMethod('auto_card_charge');
      setReferenceNumber('PRU-POL-77192');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-indigo-400" />
              Standing Instructions & Scheduled Payments
            </h2>
            {isFreeTier && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Free Quota: {standingInstructions.length}/{maxLimit}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automate and track monthly bank standing instructions, recurring card billings, and direct debit transfers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isLimitReached ? (
            <button
              onClick={() => onUpgradeToPro && onUpgradeToPro()}
              className="px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Limit Reached (Upgrade to Pro)</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Standing Instruction</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Monthly Auto Commitment</div>
            <div className="text-2xl font-bold text-white mt-1">
              {formatCurrency(monthlyTotal, currentCurrency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across {activeInstructions.length} active instructions</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Repeat className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Next Scheduled Execution</div>
            <div className="text-base font-bold text-emerald-400 mt-1">
              {activeInstructions.length > 0 ? (
                activeInstructions.sort((a, b) => (a.executionDay || 0) - (b.executionDay || 0))[0]?.title
              ) : (
                'None scheduled'
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {activeInstructions.length > 0 ? `Day ${activeInstructions[0].executionDay} of month` : 'All instructions paused'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Account Plan Quota</div>
            <div className="text-lg font-bold text-white mt-1">
              {isFreeTier ? `${standingInstructions.length} of ${maxLimit} Used` : 'Unlimited (Pro Plan)'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {isFreeTier ? 'Up to 3 free standing instructions' : 'Full automation unlocked'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({standingInstructions.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active ({activeInstructions.length})
          </button>
          <button
            onClick={() => setFilter('paused')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'paused' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Paused ({standingInstructions.length - activeInstructions.length})
          </button>
        </div>

        <input
          type="text"
          value={searchTerm ?? ''}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by title, biller, or category..."
          className="w-full sm:w-72 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Instructions Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <CalendarClock className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Standing Instructions Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Add your house loan auto-debit, car installment standing instruction, or recurring broadband payments to keep cash flow synchronized.
          </p>
          {!isLimitReached && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Add First Standing Instruction
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isBankSI = item.method === 'bank_standing_instruction';
            const isCard = item.method === 'auto_card_charge';
            const isDuitNow = item.method === 'direct_debit_duitnow';

            return (
              <div
                key={item.id}
                className={`bg-slate-900 border rounded-2xl p-5 transition-all space-y-4 flex flex-col justify-between ${
                  item.isActive ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/60 opacity-65'
                }`}
              >
                <div className="space-y-3">
                  {/* Top bar with title and active toggle */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isBankSI ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        isCard ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {isBankSI ? <Building2 className="w-4 h-4" /> :
                         isCard ? <CreditCard className="w-4 h-4" /> :
                         <CalendarClock className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-slate-400">{item.billerOrRecipient}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUpdate && handleUpdate({ ...item, isActive: !item.isActive })}
                      title={item.isActive ? 'Pause recurring instruction' : 'Resume recurring instruction'}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {item.isActive ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <PauseCircle className="w-5 h-5 text-amber-400" />
                      )}
                    </button>
                  </div>

                  {/* Amount and Frequency */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Scheduled Outflow</div>
                      <div className="text-lg font-extrabold text-white">
                        {formatCurrency(item.amount, currentCurrency)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold capitalize">
                        {item.frequency}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Day {item.executionDay} of month
                      </div>
                    </div>
                  </div>

                  {/* Channel and Source Account Details */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Deduction Channel:</span>
                      <span className="text-slate-200 font-medium">
                        {isBankSI ? 'Bank Standing Instruction' :
                         isCard ? 'Card Auto-Debit' :
                         isDuitNow ? 'DuitNow DirectDebit' : 'Scheduled FPX'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Source Account:</span>
                      <span className="text-slate-200 font-medium truncate max-w-[150px]">
                        {item.sourceAccountName || 'Primary Savings'}
                      </span>
                    </div>
                    {item.referenceNumber && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Ref / Account No:</span>
                        <span className="font-mono text-[10px] text-slate-300">{item.referenceNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Next Execution:</span>
                      <span className="text-emerald-400 font-semibold">{item.nextExecutionDate || 'Pending'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onExecuteNow(item)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Execute / Mark Paid</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete && handleDelete(item.id)}
                    title="Delete instruction"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Standing Instruction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-indigo-400" />
                  Configure Standing Instruction / Auto Payment
                </h3>
                <p className="text-xs text-slate-400">
                  Fixed recurring commitments deducted automatically by banks or card billers.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Quick Presets:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('mortgage')}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-left text-[11px] text-slate-300 transition-colors cursor-pointer"
                >
                  <div className="font-bold text-white">Mortgage Auto</div>
                  <div className="text-[10px] text-slate-500">Day 1 • Bank SI</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('car')}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-left text-[11px] text-slate-300 transition-colors cursor-pointer"
                >
                  <div className="font-bold text-white">Car Loan HP</div>
                  <div className="text-[10px] text-slate-500">Day 5 • Bank SI</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('unifi')}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-left text-[11px] text-slate-300 transition-colors cursor-pointer"
                >
                  <div className="font-bold text-white">UNIFI Fibre</div>
                  <div className="text-[10px] text-slate-500">Day 15 • Card</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('insurance')}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-left text-[11px] text-slate-300 transition-colors cursor-pointer"
                >
                  <div className="font-bold text-white">Medical Card</div>
                  <div className="text-[10px] text-slate-500">Day 28 • Auto</div>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Instruction Title *
                  </label>
                  <input
                    type="text"
                    value={title ?? ''}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. MaxiHome Mortgage Auto-Debit"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Biller / Recipient Name
                  </label>
                  <input
                    type="text"
                    value={billerOrRecipient ?? ''}
                    onChange={(e) => setBillerOrRecipient(e.target.value)}
                    placeholder="e.g. Maybank Islamic Home Financing"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fixed Amount ({activeCurrency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount ?? ''}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={frequency ?? 'monthly'}
                    onChange={(e) => setFrequency(e.target.value as StandingInstructionFrequency)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Execution Day (1–31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={executionDay ?? 1}
                    onChange={(e) => setExecutionDay(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Deduction Channel / Method
                  </label>
                  <select
                    value={method ?? 'bank_standing_instruction'}
                    onChange={(e) => setMethod(e.target.value as StandingInstructionMethod)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="bank_standing_instruction">Bank Standing Instruction (SI)</option>
                    <option value="auto_card_charge">Credit Card Auto-Billing</option>
                    <option value="direct_debit_duitnow">DirectDebit / DuitNow</option>
                    <option value="scheduled_fpx">Scheduled FPX Online Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Source Linked Account
                  </label>
                  <select
                    value={sourceAccountId ?? ''}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.institution} • {acc.type.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category ?? 'Loan Repayment'}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Loan Repayment">Loan Repayment</option>
                    <option value="Housing & Rent">Housing & Rent</option>
                    <option value="Internet & Broadband">Internet & Broadband</option>
                    <option value="Utilities (Electricity, Water, IWK)">Utilities (Electricity, Water, IWK)</option>
                    <option value="Phone & Mobile">Phone & Mobile</option>
                    <option value="Vehicle & Fuel">Vehicle & Fuel</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Savings & Investment">Savings & Investment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reference / Agreement No (Optional)
                  </label>
                  <input
                    type="text"
                    value={referenceNumber ?? ''}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. LN-MYB-883910"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Household Ownership
                  </label>
                  <select
                    value={ownerRole ?? 'husband'}
                    onChange={(e) => setOwnerRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="husband">Husband</option>
                    <option value="wife">Wife</option>
                    <option value="joint">Joint Household Commitment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Execution Mode
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="autoExec"
                      checked={autoExecuted}
                      onChange={(e) => setAutoExecuted(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800"
                    />
                    <label htmlFor="autoExec" className="text-xs text-slate-300 cursor-pointer">
                      Auto-recorded on cycle execution
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes ?? ''}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Monthly mortgage principal and interest deduction"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-colors cursor-pointer"
                >
                  Save Standing Instruction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
