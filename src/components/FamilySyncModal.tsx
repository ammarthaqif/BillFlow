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
  CreditCard,
  ShieldAlert,
  Trash2,
  Building2,
  Lock,
  RefreshCw,
  Send,
  KeyRound,
  CheckCircle2,
  UserCheck,
  UserX,
  HelpCircle,
  FileSpreadsheet,
  HardDrive
} from 'lucide-react';
import { UserProfile, UserDedicatedDatabase, FamilySyncPackage, FamilyRole, PartnerConnectionPermissions } from '../types';
import { UserDatabaseService } from '../services/userDatabaseService';
import { downloadTransactionsCSV } from '../utils/csvExport';

interface FamilySyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  currentDb: UserDedicatedDatabase;
  onDatabaseUpdated: (updatedDb: UserDedicatedDatabase) => void;
  onSwitchUser: (newUser: UserProfile) => void;
  onUserUpdated?: (updatedUser: UserProfile) => void;
  onOpenResetDatabase?: () => void;
}

export function FamilySyncModal({
  isOpen,
  onClose,
  currentUser,
  currentDb,
  onDatabaseUpdated,
  onSwitchUser,
  onUserUpdated,
  onOpenResetDatabase,
}: FamilySyncModalProps) {
  const [activeTab, setActiveTab] = useState<'household' | 'import' | 'export'>('household');
  const [, setRefreshKey] = useState(0);
  
  // Export State
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [includeInstallments, setIncludeInstallments] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [csvExportNotice, setCsvExportNotice] = useState<string | null>(null);
  const [backupDownloadNotice, setBackupDownloadNotice] = useState<string | null>(null);

  // Import State
  const [importInputText, setImportInputText] = useState('');
  const [parsedPackage, setParsedPackage] = useState<FamilySyncPackage | null>(null);
  const [isFullBackupPackage, setIsFullBackupPackage] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [tagWithOwner, setTagWithOwner] = useState(true);
  const [customTag, setCustomTag] = useState('');
  const [crossHouseholdOverride, setCrossHouseholdOverride] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [rectifyFeedback, setRectifyFeedback] = useState<string | null>(null);

  // Partner Link & Verification State
  const [partnerEmailInput, setPartnerEmailInput] = useState('');
  const [partnerRoleInput, setPartnerRoleInput] = useState<FamilyRole>(
    currentUser.familyRole === 'husband' ? 'wife' : currentUser.familyRole === 'wife' ? 'husband' : 'partner'
  );
  const [permShareAccounts, setPermShareAccounts] = useState(true);
  const [permShareInstallments, setPermShareInstallments] = useState(true);
  const [permShareExpenses, setPermShareExpenses] = useState(true);
  const [permAllowBidirectional, setPermAllowBidirectional] = useState(true);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [sendRequestError, setSendRequestError] = useState<string | null>(null);
  const [sendRequestSuccess, setSendRequestSuccess] = useState<string | null>(null);

  // Incoming Request Acceptance State
  const [incomingVerificationCode, setIncomingVerificationCode] = useState('');
  const [isVerifyingIncoming, setIsVerifyingIncoming] = useState(false);
  const [incomingVerifyError, setIncomingVerifyError] = useState<string | null>(null);
  const [incomingVerifySuccess, setIncomingVerifySuccess] = useState<string | null>(null);

  // Instant 1-Click Partner Sync State
  const [isInstantSyncing, setIsInstantSyncing] = useState(false);
  const [instantSyncFeedback, setInstantSyncFeedback] = useState<string | null>(null);

  // Profile Switching Security & Verification Guard State
  const [switchTargetUser, setSwitchTargetUser] = useState<UserProfile | null>(null);
  const [switchDeniedReason, setSwitchDeniedReason] = useState<string | null>(null);
  const [copiedInviteText, setCopiedInviteText] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Fresh user resolution to catch updated partner links
  const allRegistered = UserDatabaseService.getRegisteredUsers();
  const activeUser = allRegistered.find((u) => u.id === currentUser.id) || currentUser;
  const householdAudit = UserDatabaseService.auditHouseholdAccounts(currentDb, activeUser);
  const householdMembers = UserDatabaseService.getHouseholdMembers(activeUser);
  const incomingRequests = UserDatabaseService.getIncomingPartnerRequests(activeUser);
  const outgoingRequests = UserDatabaseService.getOutgoingPartnerRequests(activeUser);
  const linkedPartner = activeUser.linkedPartner;

  // Potential registered spouses on this device for convenience
  const otherSameDeviceUsers = allRegistered.filter(
    (u) => u.id !== activeUser.id && u.email.toLowerCase() !== activeUser.email.toLowerCase()
  );

  // Detect cross-household package
  const isCrossHousehold = parsedPackage ? (
    (parsedPackage.exportedBy?.householdId && activeUser.householdId && parsedPackage.exportedBy.householdId !== activeUser.householdId) ||
    (parsedPackage.exportedBy?.householdName && activeUser.householdName && 
     parsedPackage.exportedBy.householdName.trim().toLowerCase() !== activeUser.householdName.trim().toLowerCase())
  ) : false;

  // Generate Current Package
  const currentPackage = UserDatabaseService.createFamilySyncPackage(
    activeUser,
    currentDb,
    { includeAccounts, includeInstallments, includeSettings }
  );

  const refreshState = () => {
    setRefreshKey((k) => k + 1);
  };

  // Download JSON File
  const handleDownloadFile = () => {
    const jsonStr = JSON.stringify(currentPackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = activeUser.name.replace(/[^a-zA-Z0-9]/g, '_');
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
      setCopiedCode(false);
    }
  };

  // Parse Text Input or Uploaded JSON
  const handleParseContent = (content: string) => {
    setImportError(null);
    setImportSuccessMessage(null);
    setCrossHouseholdOverride(false);
    try {
      const parsed = JSON.parse(content.trim());
      const format = parsed.format || (parsed.data?.accounts || parsed.accounts ? 'billflow-database-backup' : undefined);
      
      if (format !== 'billflow-family-sync' && format !== 'billflow-database-backup' && !parsed.accounts) {
        throw new Error('This file or code does not match BillFlow Family Sync or Database Backup formats.');
      }
      
      const isBackup = format === 'billflow-database-backup' || Boolean(parsed.accounts);
      setIsFullBackupPackage(isBackup);
      setParsedPackage(parsed);

      if (isBackup) {
        setCustomTag(`${parsed.exportedBy?.userName || 'Backup'} (${parsed.exportedBy?.familyRole || 'Personal'})`);
      } else {
        setCustomTag(`${parsed.exportedBy?.userName || 'Partner'} (${parsed.exportedBy?.familyRole || 'Spouse'})`);
      }
    } catch (err: any) {
      setImportError(err.message || 'Invalid JSON package. Please verify the code or file.');
      setParsedPackage(null);
      setIsFullBackupPackage(false);
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

    // If it's a full database backup package, use restoreDatabaseBackup
    if (isFullBackupPackage || (parsedPackage as any).format === 'billflow-database-backup') {
      try {
        const result = UserDatabaseService.restoreDatabaseBackup(
          currentDb,
          parsedPackage,
          {
            mode: importMode,
            targetUser: activeUser,
          }
        );

        onDatabaseUpdated(result.updatedDb);

        setImportSuccessMessage(
          result.mode === 'replace'
            ? `Full database restore complete! Loaded ${result.accountsRestored} account(s), ${result.expensesRestored} transaction(s), and ${result.installmentsRestored} installment(s).`
            : `Smart merge complete! Appended ${result.accountsRestored} account(s) and ${result.expensesRestored} transaction(s) into your active database.`
        );
        setParsedPackage(null);
        setImportInputText('');
        setIsFullBackupPackage(false);
        return;
      } catch (err: any) {
        setImportError(err.message || 'Database restore failed.');
        return;
      }
    }

    if (isCrossHousehold && !crossHouseholdOverride) {
      setImportError(
        `Cross-Household Guard: This package is from household "${parsedPackage.exportedBy.householdName}". You are currently in "${activeUser.householdName}". To prevent accidental merging into the wrong household, check the confirmation override or switch households first.`
      );
      return;
    }

    try {
      const result = UserDatabaseService.importFamilyData(
        currentDb,
        parsedPackage,
        {
          mode: importMode,
          tagWithOwner,
          customOwnerTag: customTag.trim() || undefined,
          targetHouseholdName: activeUser.householdName,
          targetHouseholdId: activeUser.householdId,
          allowCrossHouseholdMerge: crossHouseholdOverride,
        }
      );

      onDatabaseUpdated(result.updatedDb);

      setImportSuccessMessage(
        importMode === 'merge'
          ? `Successfully synchronized! Added ${result.accountsAdded} accounts and ${result.installmentsAdded} installment plans into household "${activeUser.householdName}".`
          : `Dedicated database mirrored with snapshot from ${parsedPackage.exportedBy.userName}.`
      );
      setParsedPackage(null);
      setImportInputText('');
      setCrossHouseholdOverride(false);
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    }
  };

  // Handle Purge Foreign Accounts
  const handlePurgeForeign = () => {
    if (!householdAudit.isContaminated) return;
    const toPurge = householdAudit.foreignAccounts.map((a) => a.id);
    const updated = UserDatabaseService.purgeForeignAccounts(currentDb, toPurge);
    onDatabaseUpdated(updated);
    setRectifyFeedback(`Cleaned up ${toPurge.length} foreign account(s) and their linked installments/expenses.`);
    setTimeout(() => setRectifyFeedback(null), 4000);
  };

  // Handle Adopt/Reassign All Accounts to Active Household
  const handleAdoptAll = () => {
    const updated = UserDatabaseService.reassignAllAccountsToCurrentHousehold(currentDb, activeUser);
    onDatabaseUpdated(updated);
    setRectifyFeedback(`Successfully reassigned all accounts strictly to household "${activeUser.householdName}".`);
    setTimeout(() => setRectifyFeedback(null), 4000);
  };

  // Handle Send Partner Request
  const handleSendPartnerRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setSendRequestError(null);
    setSendRequestSuccess(null);
    setIsSendingRequest(true);

    try {
      const newReq = UserDatabaseService.sendPartnerConnectionRequest({
        sender: activeUser,
        receiverEmail: partnerEmailInput,
        receiverRole: partnerRoleInput,
        permissions: {
          shareAccounts: permShareAccounts,
          shareInstallments: permShareInstallments,
          shareExpenses: permShareExpenses,
          allowBidirectionalSync: permAllowBidirectional,
        },
      });

      setSendRequestSuccess(
        `Connection request sent! Share the 6-digit verification code (${newReq.verificationCode}) with your spouse to verify and accept.`
      );
      setPartnerEmailInput('');
      refreshState();
    } catch (err: any) {
      setSendRequestError(err.message || 'Failed to send partner connection request.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Handle Verify & Accept Incoming Request
  const handleVerifyAndAcceptRequest = (requestId: string) => {
    setIncomingVerifyError(null);
    setIncomingVerifySuccess(null);
    setIsVerifyingIncoming(true);

    try {
      const res = UserDatabaseService.verifyAndAcceptPartnerRequest({
        requestId,
        verificationCode: incomingVerificationCode,
        receiver: activeUser,
      });

      setIncomingVerifySuccess(
        `Partner connection verified and accepted! You and ${res.senderUser.name} (${res.senderUser.familyRole}) are now linked.`
      );
      setIncomingVerificationCode('');
      if (onUserUpdated) {
        onUserUpdated(res.receiverUser);
      }
      refreshState();
    } catch (err: any) {
      setIncomingVerifyError(err.message || 'Verification failed. Please check the 6-digit code.');
    } finally {
      setIsVerifyingIncoming(false);
    }
  };

  // Handle Decline Incoming Request
  const handleDeclineRequest = (requestId: string) => {
    try {
      UserDatabaseService.rejectPartnerRequest(requestId, activeUser);
      refreshState();
    } catch (err: any) {
      setIncomingVerifyError(err.message || 'Failed to decline request.');
    }
  };

  // Handle Cancel Outgoing Request
  const handleCancelOutgoing = (requestId: string) => {
    try {
      UserDatabaseService.cancelPartnerRequest(requestId, activeUser);
      refreshState();
    } catch (err: any) {
      setSendRequestError(err.message || 'Failed to cancel request.');
    }
  };

  // Handle Disconnect Partner
  const handleDisconnectPartner = () => {
    if (!window.confirm('Are you sure you want to disconnect your verified partner? This will sever data synchronization and profile switching until a new dual-party request is verified.')) {
      return;
    }

    try {
      const res = UserDatabaseService.disconnectPartner(activeUser.id);
      if (onUserUpdated) {
        onUserUpdated(res.currentUser);
      }
      refreshState();
      setRectifyFeedback('Partner connection has been disconnected.');
      setTimeout(() => setRectifyFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect partner.');
    }
  };

  // Handle 1-Click Instant Partner Sync
  const handleInstantPartnerSync = () => {
    if (!linkedPartner || linkedPartner.status !== 'verified') return;
    setIsInstantSyncing(true);
    setInstantSyncFeedback(null);

    try {
      const res = UserDatabaseService.syncVerifiedPartnerData(activeUser.id, linkedPartner.partnerUserId);
      onDatabaseUpdated(res.updatedDb);
      setInstantSyncFeedback(
        `Synchronized with ${linkedPartner.partnerName}! Added ${res.accountsAdded} account(s) and ${res.installmentsAdded} installment plan(s).`
      );
      refreshState();
      setTimeout(() => setInstantSyncFeedback(null), 5000);
    } catch (err: any) {
      setInstantSyncFeedback(`Sync failed: ${err.message}`);
    } finally {
      setIsInstantSyncing(false);
    }
  };

  // Handle Request Profile Switch
  const handleAttemptSwitch = (targetUser: UserProfile) => {
    setSwitchDeniedReason(null);
    const check = UserDatabaseService.canSwitchToUser(activeUser, targetUser.id);
    if (!check.allowed) {
      setSwitchDeniedReason(check.reason || 'Switching to this profile is prohibited.');
      return;
    }
    setSwitchTargetUser(targetUser);
  };

  // Confirm Switch
  const handleConfirmSwitch = () => {
    if (!switchTargetUser) return;
    onSwitchUser(switchTargetUser);
    onClose();
  };

  // Copy Verification Invite Text
  const handleCopyInviteMessage = async (code: string, receiverEmail: string) => {
    const inviteText = `Hi darling! I have sent you a connection request on BillFlow to sync our household finances. Your 6-digit verification code is: ${code}. Please open Family Sync on your account (${receiverEmail}) and enter this code to verify and connect our accounts.`;
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopiedInviteText(true);
      setTimeout(() => setCopiedInviteText(false), 2500);
    } catch {
      setCopiedInviteText(false);
    }
  };

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
                <h2 className="text-base font-bold text-white">Family Data Sync & Partner Link</h2>
                <span className="text-[10px] font-semibold bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full capitalize">
                  {activeUser.familyRole}
                </span>
                <span className="text-[10px] font-semibold bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full">
                  {activeUser.householdName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Verified dual-party synchronization and strict household isolation.
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

        {/* Cross-Contamination Alert Banner if detected */}
        {householdAudit.isContaminated && (
          <div className="bg-rose-950/70 border-b border-rose-800/80 p-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-rose-200">
                  Cross-Household Account Contamination Detected!
                </div>
                <div className="text-rose-300/80 text-[11px] mt-0.5">
                  {householdAudit.foreignAccounts.length} account(s) belong to foreign households.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePurgeForeign}
                className="px-2.5 py-1.5 rounded-lg border border-rose-700/60 bg-rose-900/60 hover:bg-rose-800 text-rose-100 font-semibold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                <span>Purge Foreign</span>
              </button>
              <button
                type="button"
                onClick={handleAdoptAll}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Adopt to Household</span>
              </button>
            </div>
          </div>
        )}

        {rectifyFeedback && (
          <div className="bg-emerald-950/60 border-b border-emerald-800/60 p-2.5 px-5 text-xs text-emerald-300 flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{rectifyFeedback}</span>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="px-5 pt-3 pb-0 border-b border-slate-800/80 bg-slate-900/50 flex gap-2">
          <button
            onClick={() => setActiveTab('household')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'household'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Household & Partner Link</span>
            {incomingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
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
            <span>Sync & Import Data</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'export'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Snapshot</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* TAB 1: HOUSEHOLD PROFILES & PARTNER LINK (PRIMARY) */}
          {activeTab === 'household' && (
            <div className="space-y-5">
              
              {/* Household Scope Header */}
              <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="text-slate-400 text-[11px]">Active Household: </span>
                    <strong className="text-white font-semibold">{activeUser.householdName}</strong>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                  ID: {activeUser.householdId}
                </span>
              </div>

              {/* INCOMING PARTNER REQUEST BANNER */}
              {incomingRequests.length > 0 && (
                <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span>Incoming Partner Connection Request</span>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                      Requires 6-Digit PIN
                    </span>
                  </div>

                  {incomingRequests.map((req) => (
                    <div key={req.id} className="space-y-3 pt-1">
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong className="text-white font-semibold">{req.senderName}</strong> ({req.senderRole} • {req.senderEmail}) wants to link accounts and synchronize household debt schedules with you.
                      </p>

                      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2">
                        <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                          <span>Enter the 6-digit verification PIN provided by your spouse:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={incomingVerificationCode}
                            onChange={(e) => setIncomingVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="e.g. 582914"
                            className="bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono text-sm tracking-widest text-center w-36 outline-none"
                          />
                          <button
                            type="button"
                            disabled={incomingVerificationCode.length !== 6 || isVerifyingIncoming}
                            onClick={() => handleVerifyAndAcceptRequest(req.id)}
                            className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Verify Code & Accept Connection</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineRequest(req.id)}
                            className="py-2 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {incomingVerifyError && (
                    <div className="text-rose-400 text-[11px] flex items-center gap-1.5 bg-rose-950/40 p-2 rounded-lg border border-rose-900/50">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{incomingVerifyError}</span>
                    </div>
                  )}

                  {incomingVerifySuccess && (
                    <div className="text-emerald-400 text-[11px] flex items-center gap-1.5 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/50">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>{incomingVerifySuccess}</span>
                    </div>
                  )}
                </div>
              )}

              {/* OUTGOING PENDING REQUEST BANNER */}
              {outgoingRequests.length > 0 && !linkedPartner && (
                <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                      <Send className="w-4 h-4 text-indigo-400" />
                      <span>Pending Spouse Verification & Acceptance</span>
                    </div>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                      Outgoing Invite
                    </span>
                  </div>

                  {outgoingRequests.map((req) => (
                    <div key={req.id} className="space-y-3">
                      <p className="text-slate-300 text-[11px]">
                        Invitation sent to <strong className="text-white">{req.receiverEmail}</strong>. Provide your spouse the 6-digit verification PIN below:
                      </p>

                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            Verification PIN Code
                          </div>
                          <div className="font-mono text-2xl font-black text-amber-300 tracking-[0.25em] mt-0.5">
                            {req.verificationCode}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => handleCopyInviteMessage(req.verificationCode, req.receiverEmail)}
                            className="flex-1 sm:flex-none py-1.5 px-3 rounded-lg border border-indigo-500/40 bg-indigo-900/40 hover:bg-indigo-800 text-indigo-200 font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedInviteText ? 'Copied Message!' : 'Copy Invite'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelOutgoing(req.id)}
                            className="py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Your spouse must log into their BillFlow account and enter this PIN to verify mutual consent.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* DUAL-PARTY VERIFIED PARTNER ACTIVE CARD */}
              {linkedPartner && linkedPartner.status === 'verified' ? (
                <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-white font-bold text-xs flex items-center gap-1.5">
                          <span>Verified Partner Connection</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                            Dual-Verified
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Linked with <strong className="text-white">{linkedPartner.partnerName}</strong> ({linkedPartner.partnerRole} • {linkedPartner.partnerEmail})
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDisconnectPartner}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold hover:underline cursor-pointer"
                    >
                      Disconnect Partner
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
                    <div className="text-slate-400">
                      Last Synchronized: <span className="text-slate-200 font-medium">{linkedPartner.lastSyncedAt ? new Date(linkedPartner.lastSyncedAt).toLocaleString() : 'Never'}</span>
                    </div>

                    <button
                      type="button"
                      disabled={isInstantSyncing}
                      onClick={handleInstantPartnerSync}
                      className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isInstantSyncing ? 'animate-spin' : ''}`} />
                      <span>1-Click Sync with {linkedPartner.partnerName}</span>
                    </button>
                  </div>

                  {instantSyncFeedback && (
                    <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-[11px] text-emerald-300 font-medium">
                      {instantSyncFeedback}
                    </div>
                  )}
                </div>
              ) : (
                /* INITIATE CONNECTION REQUEST FORM IF NOT LINKED */
                (!outgoingRequests.length && (
                  <form onSubmit={handleSendPartnerRequest} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-indigo-400" />
                      <span className="font-bold text-white text-xs">Connect Spouse Account (Dual-Party Verification)</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      For financial privacy, viewing another account or syncing debt schedules requires verification and mutual acceptance from both spouses.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-slate-300 text-[10px] font-semibold">Spouse / Partner Email</label>
                        <input
                          type="email"
                          required
                          value={partnerEmailInput}
                          onChange={(e) => setPartnerEmailInput(e.target.value)}
                          placeholder="e.g. spouse@family.com"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-300 text-[10px] font-semibold">Partner Role</label>
                        <select
                          value={partnerRoleInput}
                          onChange={(e) => setPartnerRoleInput(e.target.value as FamilyRole)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="wife">Wife</option>
                          <option value="husband">Husband</option>
                          <option value="partner">Partner</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick-select registered accounts on this device */}
                    {otherSameDeviceUsers.length > 0 && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1 flex-wrap">
                        <span>Registered on this device:</span>
                        {otherSameDeviceUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setPartnerEmailInput(u.email);
                              setPartnerRoleInput(u.familyRole);
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors cursor-pointer"
                          >
                            {u.name} ({u.familyRole})
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Permissions */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Sync Permissions Requested</span>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permShareAccounts}
                            onChange={(e) => setPermShareAccounts(e.target.checked)}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <span>Revolving Cards & BNPL</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permShareInstallments}
                            onChange={(e) => setPermShareInstallments(e.target.checked)}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <span>Installment Plans</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permShareExpenses}
                            onChange={(e) => setPermShareExpenses(e.target.checked)}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <span>Household Swipes & Bills</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permAllowBidirectional}
                            onChange={(e) => setPermAllowBidirectional(e.target.checked)}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <span>Bi-directional Sync</span>
                        </label>
                      </div>
                    </div>

                    {sendRequestError && (
                      <div className="text-rose-400 text-[11px] flex items-center gap-1.5 bg-rose-950/40 p-2 rounded-lg border border-rose-900/50">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{sendRequestError}</span>
                      </div>
                    )}

                    {sendRequestSuccess && (
                      <div className="text-emerald-400 text-[11px] flex items-center gap-1.5 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/50">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>{sendRequestSuccess}</span>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSendingRequest || !partnerEmailInput}
                        className="py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSendingRequest ? 'Generating Invite...' : 'Generate 6-Digit PIN & Send Request'}</span>
                      </button>
                    </div>
                  </form>
                ))
              )}

              {/* HOUSEHOLD MEMBERS LISTING & CONTROLLED SWITCHING */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="font-semibold text-slate-300">Household Members</span>
                  <span>{householdMembers.length} profile(s)</span>
                </div>

                {householdMembers.map((user) => {
                  const isActive = user.id === activeUser.id;
                  const isPartner = linkedPartner?.status === 'verified' && linkedPartner.partnerUserId === user.id;
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
                            {isActive ? (
                              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                                Current Active
                              </span>
                            ) : isPartner ? (
                              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                <span>Verified Partner</span>
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Unverified</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {user.email} • DB: <code className="font-mono text-indigo-300">{user.databaseId}</code>
                          </div>
                        </div>
                      </div>

                      {!isActive ? (
                        <div className="flex items-center gap-2">
                          {isPartner ? (
                            <button
                              type="button"
                              onClick={() => handleAttemptSwitch(user)}
                              className="py-1.5 px-3 rounded-lg border border-indigo-500/60 hover:border-indigo-400 bg-indigo-900/40 hover:bg-indigo-800 text-indigo-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Switch to {user.familyRole}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                              <Lock className="w-3 h-3 text-slate-500" />
                              <span>Verification Required to Switch</span>
                            </div>
                          )}
                        </div>
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

              {/* Strict Privacy & Household Isolation Notice */}
              <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl flex items-start gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-slate-300">Strict Household Privacy: </strong>
                  Profiles from other registered households are completely hidden from view. Switching across households is disallowed. To access an account from another household, please log out and sign in with authorized credentials.
                </div>
              </div>

              {/* Database Maintenance & Fresh Restart */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-rose-950/40 text-rose-400 border border-rose-800/40">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Database Fresh Restart</div>
                    <div className="text-[10px] text-slate-400">Clear partition or re-seed with fresh Malaysian starter defaults.</div>
                  </div>
                </div>
                {onOpenResetDatabase && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenResetDatabase();
                    }}
                    className="py-1.5 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Reset Database
                  </button>
                )}
              </div>

              {switchDeniedReason && (
                <div className="text-rose-400 text-[11px] flex items-center gap-1.5 bg-rose-950/60 p-3 rounded-xl border border-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{switchDeniedReason}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMPORT & SYNC PARTNER DATA */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              
              {/* If Verified Partner Linked, Feature 1-Click Sync */}
              {linkedPartner && linkedPartner.status === 'verified' && (
                <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-indigo-400" />
                      <span className="font-bold text-white text-xs">Verified Partner Direct Synchronization</span>
                    </div>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                      1-Click Verified
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Pull and harmonize the latest credit cards, BNPL plans, and debt schedules directly from <strong className="text-white">{linkedPartner.partnerName}</strong> ({linkedPartner.partnerRole}) into your dedicated database.
                  </p>
                  <button
                    type="button"
                    disabled={isInstantSyncing}
                    onClick={handleInstantPartnerSync}
                    className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <RefreshCw className={`w-4 h-4 ${isInstantSyncing ? 'animate-spin' : ''}`} />
                    <span>{isInstantSyncing ? 'Synchronizing Databases...' : `Direct Sync with ${linkedPartner.partnerName}`}</span>
                  </button>
                  {instantSyncFeedback && (
                    <div className="text-[11px] text-emerald-400 font-medium bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/50">
                      {instantSyncFeedback}
                    </div>
                  )}
                </div>
              )}

              {/* Offline / Cross-Device File & Code Sync Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 text-xs">Cross-Device Offline Sync Package (JSON)</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload JSON File</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

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
                  rows={4}
                  placeholder="Paste BillFlow sync code or drag & drop family sync JSON here..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-[11px] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {importError && (
                <div className="text-rose-400 text-[11px] flex items-start gap-1.5 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/50">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccessMessage && (
                <div className="text-emerald-400 text-[11px] flex items-center gap-1.5 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/50">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{importSuccessMessage}</span>
                </div>
              )}

              {parsedPackage && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Package Preview</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                      Checksum: {parsedPackage.checksum}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
                    <div>
                      <span className="text-slate-500">From: </span>
                      <strong className="text-white">{parsedPackage.exportedBy.userName}</strong> ({parsedPackage.exportedBy.familyRole})
                    </div>
                    <div>
                      <span className="text-slate-500">Household: </span>
                      <strong className="text-white">{parsedPackage.exportedBy.householdName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Accounts: </span>
                      <strong className="text-white">{parsedPackage.payload.accounts?.length || 0}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Installments: </span>
                      <strong className="text-white">{parsedPackage.payload.installments?.length || 0}</strong>
                    </div>
                  </div>

                  {isCrossHousehold && (
                    <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg bg-amber-950/40 border border-amber-900/50 text-[11px] text-amber-300">
                      <input
                        type="checkbox"
                        checked={crossHouseholdOverride}
                        onChange={(e) => setCrossHouseholdOverride(e.target.checked)}
                        className="mt-0.5 rounded border-amber-700 text-amber-600 focus:ring-0"
                      />
                      <span>I confirm I want to merge data from household "{parsedPackage.exportedBy.householdName}" into "{activeUser.householdName}".</span>
                    </label>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="text-indigo-600"
                        />
                        <span>Merge Safely</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="text-indigo-600"
                        />
                        <span>Replace Existing</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      className="py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Complete Import</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXPORT SNAPSHOT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-slate-400 text-xs leading-relaxed">
                Export an encrypted, checksum-verified JSON package of your dedicated database. Your spouse can import this file or code to sync debt schedules.
              </p>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Include in Export</span>
                <div className="space-y-2 text-slate-300">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Revolving Accounts ({currentDb.accounts.length})</span>
                    <input
                      type="checkbox"
                      checked={includeAccounts}
                      onChange={(e) => setIncludeAccounts(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Active Installment Plans ({currentDb.installments.length})</span>
                    <input
                      type="checkbox"
                      checked={includeInstallments}
                      onChange={(e) => setIncludeInstallments(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Income, Budget & Strategy Preferences</span>
                    <input
                      type="checkbox"
                      checked={includeSettings}
                      onChange={(e) => setIncludeSettings(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Family Sync .json</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* DEDICATED DATA EXPORT & BACKUP FOR PERSONAL RECORD-KEEPING */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">
                  Personal Record-Keeping & Full Backups
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Export Transactions as CSV */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-white text-xs">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>Transaction History (CSV)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Download all {(currentDb.expenses || []).length} recorded expense swipes formatted for Excel, Google Sheets & Apple Numbers.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const res = downloadTransactionsCSV(
                          currentDb.expenses || [],
                          currentDb.settings.currency || 'MYR',
                          currentDb.accounts || [],
                          activeUser.name
                        );
                        setCsvExportNotice(`Exported ${res.totalExported} records to ${res.filename}`);
                        setTimeout(() => setCsvExportNotice(null), 4000);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Transactions CSV</span>
                    </button>
                  </div>

                  {/* Complete Database Backup */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-white text-xs">
                        <HardDrive className="w-4 h-4 text-indigo-400" />
                        <span>Complete Database Backup</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Save a full JSON backup of accounts, installments, expenses, and configuration for safekeeping.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const res = UserDatabaseService.downloadDatabaseBackup(activeUser, currentDb);
                        setBackupDownloadNotice(`Backup saved: ${res.filename}`);
                        setTimeout(() => setBackupDownloadNotice(null), 4000);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Full Backup (.json)</span>
                    </button>
                  </div>
                </div>

                {csvExportNotice && (
                  <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-lg p-2.5 flex items-center gap-2 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{csvExportNotice}</span>
                  </div>
                )}

                {backupDownloadNotice && (
                  <div className="bg-indigo-950/50 border border-indigo-500/30 rounded-lg p-2.5 flex items-center gap-2 text-indigo-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{backupDownloadNotice}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PROFILE SWITCH CONFIRMATION MODAL */}
        {switchTargetUser && (
          <div className="p-4 bg-indigo-950/90 border-t border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-200">
              <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white">Switch to verified spouse profile: </span>
                <span>{switchTargetUser.name} ({switchTargetUser.familyRole})?</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSwitchTargetUser(null)}
                className="py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitch}
                className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Confirm Switch
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dual-party mutual verification & strict household boundary protection</span>
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
