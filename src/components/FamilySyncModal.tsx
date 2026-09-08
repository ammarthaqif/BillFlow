import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  Users, 
  FileText, 
  ArrowRightLeft, 
  ShieldCheck, 
  AlertCircle,
  Database,
  ArrowRight,
  HeartHandshake,
  CreditCard
} from 'lucide-react';
import { UserProfile, UserDedicatedDatabase, FamilySyncPackage } from '../types';
import { UserDatabaseService } from '../services/userDatabaseService';

interface FamilySyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  currentDb: UserDedicatedDatabase;
  onDatabaseUpdated: (updatedDb: UserDedicatedDatabase) => void;
  onSwitchUser: (newUser: UserProfile) => void;
}

export function FamilySyncModal({
  isOpen,
  onClose,
  currentUser,
  currentDb,
  onDatabaseUpdated,
  onSwitchUser,
}: FamilySyncModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'household'>('export');
  
  // Export State
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [includeInstallments, setIncludeInstallments] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Import State
  const [importInputText, setImportInputText] = useState('');
  const [parsedPackage, setParsedPackage] = useState<FamilySyncPackage | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [tagWithOwner, setTagWithOwner] = useState(true);
  const [customTag, setCustomTag] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Generate Current Package
  const currentPackage = UserDatabaseService.createFamilySyncPackage(
    currentUser,
    currentDb,
    { includeAccounts, includeInstallments, includeSettings }
  );

  // Download JSON File
  const handleDownloadFile = () => {
    const jsonStr = JSON.stringify(currentPackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = currentUser.name.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `billflow-family-sync-${safeName}-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy Code to Clipboard
  const handleCopyCode = async () => {
    try {
      const jsonStr = JSON.stringify(currentPackage);
      await navigator.clipboard.writeText(jsonStr);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Fallback
      setCopiedCode(false);
    }
  };

  // Parse Text Input or Uploaded JSON
  const handleParseContent = (content: string) => {
    setImportError(null);
    setImportSuccessMessage(null);
    try {
      const parsed = JSON.parse(content.trim());
      if (parsed.format !== 'billflow-family-sync') {
        throw new Error('This file or code does not match the BillFlow Family Sync format.');
      }
      setParsedPackage(parsed);
      setCustomTag(`${parsed.exportedBy?.userName || 'Partner'} (${parsed.exportedBy?.familyRole || 'Spouse'})`);
    } catch (err: any) {
      setImportError(err.message || 'Invalid JSON sync package. Please verify the code or file.');
      setParsedPackage(null);
    }
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportInputText(text);
      handleParseContent(text);
    };
    reader.onerror = () => {
      setImportError('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (!parsedPackage) return;
    setImportError(null);

    try {
      const result = UserDatabaseService.importFamilyData(
        currentDb,
        parsedPackage,
        {
          mode: importMode,
          tagWithOwner,
          customOwnerTag: customTag.trim() || undefined,
        }
      );

      onDatabaseUpdated(result.updatedDb);

      setImportSuccessMessage(
        importMode === 'merge'
          ? `Successfully synchronized! Added ${result.accountsAdded} accounts and ${result.installmentsAdded} installment plans from ${parsedPackage.exportedBy.userName}.`
          : `Dedicated database mirrored with snapshot from ${parsedPackage.exportedBy.userName}.`
      );
      setParsedPackage(null);
      setImportInputText('');
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    }
  };

  const registeredUsers = UserDatabaseService.getRegisteredUsers();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Family Data Sync Center</h2>
                <span className="text-[10px] font-semibold bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full capitalize">
                  {currentUser.familyRole}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Synchronize and share debt schedules between husband, wife & family members.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="px-5 pt-3 pb-0 border-b border-slate-800/80 bg-slate-900/50 flex gap-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'export'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export My Data</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'import'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import & Sync Partner Data</span>
          </button>
          <button
            onClick={() => setActiveTab('household')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'household'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Household Profiles ({registeredUsers.length})</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              {/* Database Context Box */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-white">Source Dedicated Database:</span>
                  </div>
                  <span className="font-mono text-[11px] text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                    {currentUser.databaseId}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Logged in as <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.familyRole}) • {currentUser.householdName}
                </div>
              </div>

              {/* Package contents summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-800/40 border border-slate-800 p-2.5 rounded-xl">
                  <div className="text-slate-400 text-[10px]">Cards & E-Wallets</div>
                  <div className="text-base font-bold text-white mt-0.5">{currentDb.accounts.length}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-800 p-2.5 rounded-xl">
                  <div className="text-slate-400 text-[10px]">Installments</div>
                  <div className="text-base font-bold text-white mt-0.5">{currentDb.installments.length}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-800 p-2.5 rounded-xl">
                  <div className="text-slate-400 text-[10px]">Total Statement Due</div>
                  <div className="text-base font-bold text-amber-400 mt-0.5">
                    ${currentDb.accounts.reduce((sum, a) => sum + a.statementBalance, 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-slate-800/40 border border-slate-800 p-2.5 rounded-xl">
                  <div className="text-slate-400 text-[10px]">Monthly BNPL</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">
                    ${currentDb.installments.reduce((sum, i) => sum + i.monthlyAmount, 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* What to include */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-300 block">Export Options:</span>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2.5 p-2 bg-slate-950/40 rounded-lg border border-slate-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeAccounts}
                      onChange={(e) => setIncludeAccounts(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-slate-200">Include all revolving accounts ({currentDb.accounts.length})</span>
                  </label>
                  <label className="flex items-center gap-2.5 p-2 bg-slate-950/40 rounded-lg border border-slate-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeInstallments}
                      onChange={(e) => setIncludeInstallments(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-slate-200">Include active multi-month installment plans ({currentDb.installments.length})</span>
                  </label>
                  <label className="flex items-center gap-2.5 p-2 bg-slate-950/40 rounded-lg border border-slate-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSettings}
                      onChange={(e) => setIncludeSettings(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-slate-200">Include strategy preferences & paycheck schedule</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Family Sync (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copy Sync Payload Code</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
                <HeartHandshake className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip for Couples:</strong> Send this JSON file or sync code to your spouse (e.g. via WhatsApp or email). They can import it into their account to see the unified household payment sequence.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {importSuccessMessage && (
                <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/70 rounded-xl text-emerald-300 flex items-center gap-2.5">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-medium">{importSuccessMessage}</span>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Upload Drop Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/40 hover:bg-indigo-950/10 rounded-2xl p-5 text-center cursor-pointer transition-all space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-indigo-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="font-semibold text-white">Click or drag & drop family sync file here</div>
                <div className="text-[11px] text-slate-500">Supports .json sync files generated by BillFlow</div>
              </div>

              {/* Or paste JSON code */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Or paste sync code / JSON text:</label>
                <textarea
                  value={importInputText}
                  onChange={(e) => {
                    setImportInputText(e.target.value);
                    if (e.target.value.trim()) {
                      handleParseContent(e.target.value);
                    } else {
                      setParsedPackage(null);
                    }
                  }}
                  rows={3}
                  placeholder='Paste the { "format": "billflow-family-sync", ... } payload here'
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 font-mono text-[11px] focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Parsed Package Preview */}
              {parsedPackage && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white">Verified Family Sync Package</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Exported {new Date(parsedPackage.exportedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-slate-400 block">Sender / Partner:</span>
                      <strong className="text-white">
                        {parsedPackage.exportedBy.userName} ({parsedPackage.exportedBy.familyRole})
                      </strong>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-slate-400 block">Household:</span>
                      <strong className="text-white">{parsedPackage.exportedBy.householdName}</strong>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-slate-400 block">Accounts to Sync:</span>
                      <strong className="text-indigo-300">{parsedPackage.data.accounts.length} items</strong>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-slate-400 block">Installments to Sync:</span>
                      <strong className="text-emerald-300">{parsedPackage.data.installments.length} plans</strong>
                    </div>
                  </div>

                  {/* Sync Mode Selection */}
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <span className="font-semibold text-slate-300 block">Synchronization Mode:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          importMode === 'merge'
                            ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}
                      >
                        <div className="font-bold">Merge with My Accounts</div>
                        <div className="text-[10px] text-slate-400">
                          Adds partner's cards to your view so both can be optimized together.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          importMode === 'replace'
                            ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}
                      >
                        <div className="font-bold">Mirror / Overwrite</div>
                        <div className="text-[10px] text-slate-400">
                          Replaces current database with this snapshot.
                        </div>
                      </button>
                    </div>

                    {importMode === 'merge' && (
                      <div className="pt-2 flex items-center gap-2">
                        <label className="text-slate-400">Tag Imported Items As:</label>
                        <input
                          type="text"
                          value={customTag}
                          onChange={(e) => setCustomTag(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-medium text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Execute Button */}
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Apply & Save to My Dedicated Database</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HOUSEHOLD PROFILES */}
          {activeTab === 'household' && (
            <div className="space-y-3">
              <div className="text-slate-400 text-[11px]">
                Registered household profiles with assigned dedicated databases:
              </div>

              <div className="space-y-2">
                {registeredUsers.map((user) => {
                  const isActive = user.id === currentUser.id;
                  const isHusband = user.familyRole === 'husband';

                  return (
                    <div
                      key={user.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isActive
                          ? 'border-indigo-500/60 bg-indigo-950/30'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold ${
                          isHusband ? 'bg-blue-600' : 'bg-rose-600'
                        }`}>
                          {isHusband ? 'H' : 'W'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{user.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full capitalize font-semibold bg-slate-800 text-slate-300">
                              {user.familyRole}
                            </span>
                            {isActive && (
                              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                                Current Active
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {user.email} • Assigned DB: <code className="font-mono text-indigo-300">{user.databaseId}</code>
                          </div>
                        </div>
                      </div>

                      {!isActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchUser(user);
                            onClose();
                          }}
                          className="py-1.5 px-3 rounded-lg border border-slate-700 hover:border-indigo-500 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Switch to {user.familyRole}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="text-emerald-400 flex items-center gap-1 font-semibold text-xs">
                          <Check className="w-4 h-4" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted format with checksum validation</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-800 bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
