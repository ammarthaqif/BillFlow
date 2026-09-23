import { 
  UserProfile, 
  UserDedicatedDatabase, 
  FamilySyncPackage, 
  BillAccount, 
  InstallmentPlan, 
  UserSettings, 
  FamilyRole,
  ExpenseItem,
  StandingInstruction,
  BankScheduledTransaction,
  ProPaymentRecord,
  PartnerConnection,
  PartnerConnectionRequest,
  PartnerConnectionPermissions,
  QuickPayTemplate,
  DatabaseBackupPackage,
  UtilityBillItem
} from '../types';
import { 
  downloadTransactionsCSV, 
  generateTransactionsCSV 
} from '../utils/csvExport';
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_INSTALLMENTS, 
  INITIAL_SETTINGS, 
  INITIAL_EXPENSES, 
  INITIAL_STANDING_INSTRUCTIONS, 
  INITIAL_BANK_SCHEDULED_TRANSACTIONS,
  INITIAL_QUICK_PAY_TEMPLATES,
  INITIAL_UTILITY_BILLS
} from '../data/seedData';

const USERS_INDEX_KEY = 'billflow_registered_users';
const ACTIVE_USER_KEY = 'billflow_active_user_id';
const DB_PREFIX = 'billflow_user_db_';
const PARTNER_REQUESTS_KEY = 'billflow_partner_connection_requests_v1';

export class UserDatabaseService {
  /**
   * Helper to generate a standardized household ID slug from household name
   */
  static normalizeHouseholdId(name?: string): string {
    const clean = (name || 'my_family').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `hh_${clean || 'default'}`;
  }

  /**
   * Returns list of all registered users, ensuring no unpaid Pro access persists
   * and ensuring all users have a valid householdId.
   */
  static getRegisteredUsers(): UserProfile[] {
    try {
      const raw = localStorage.getItem(USERS_INDEX_KEY);
      if (raw) {
        const users: UserProfile[] = JSON.parse(raw);
        let modified = false;

        // Security check & household backfill
        for (const user of users) {
          if (!user.householdId) {
            user.householdId = this.normalizeHouseholdId(user.householdName);
            modified = true;
          }

          if (user.tier === 'pro' && (!user.proPaymentRecord || user.proPaymentRecord.status !== 'active' || !user.proPaymentRecord.transactionId)) {
            console.warn(`[Security Alert] User ${user.email} had Pro tier without verified payment. Reverting to Free tier.`);
            user.tier = 'free';
            user.proPaymentRecord = undefined;
            user.tierLimits = {
              maxAccounts: 3,
              maxStandingInstructions: 3,
              monthlyAiConsultations: 3,
              monthlyReceiptExtractions: 5,
              aiConsultationsUsed: user.tierLimits?.aiConsultationsUsed || 0,
              receiptExtractionsUsed: user.tierLimits?.receiptExtractionsUsed || 0,
            };
            modified = true;
          }
        }

        if (modified) {
          localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(users));
        }

        return users;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Returns only users belonging to the same household
   */
  static getHouseholdMembers(currentUser: UserProfile): UserProfile[] {
    const allUsers = this.getRegisteredUsers();
    const currentHId = currentUser.householdId || this.normalizeHouseholdId(currentUser.householdName);
    const currentHName = (currentUser.householdName || '').trim().toLowerCase();

    return allUsers.filter((u) => {
      const uHId = u.householdId || this.normalizeHouseholdId(u.householdName);
      const uHName = (u.householdName || '').trim().toLowerCase();
      return uHId === currentHId || (currentHName && uHName === currentHName);
    });
  }

  /**
   * @deprecated Household isolation is enforced. Viewing or switching to other households
   * is strictly restricted for privacy and security. Returns an empty array.
   */
  static getOtherHouseholdGroups(_currentUser: UserProfile): Array<{
    householdId: string;
    householdName: string;
    members: UserProfile[];
  }> {
    // Strictly return empty list to enforce household isolation and prevent peeking into other households.
    return [];
  }

  /**
   * Get all partner connection requests
   */
  static getPartnerConnectionRequests(): PartnerConnectionRequest[] {
    try {
      const raw = localStorage.getItem(PARTNER_REQUESTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save all partner connection requests
   */
  static savePartnerConnectionRequests(requests: PartnerConnectionRequest[]): void {
    localStorage.setItem(PARTNER_REQUESTS_KEY, JSON.stringify(requests));
  }

  /**
   * Get incoming pending requests for a user
   */
  static getIncomingPartnerRequests(user: UserProfile): PartnerConnectionRequest[] {
    const all = this.getPartnerConnectionRequests();
    const email = user.email.trim().toLowerCase();
    const now = new Date().getTime();

    return all.filter((r) => 
      r.status === 'pending' &&
      r.receiverEmail.trim().toLowerCase() === email &&
      new Date(r.expiresAt).getTime() > now
    );
  }

  /**
   * Get outgoing pending requests sent by a user
   */
  static getOutgoingPartnerRequests(user: UserProfile): PartnerConnectionRequest[] {
    const all = this.getPartnerConnectionRequests();
    const now = new Date().getTime();

    return all.filter((r) => 
      r.senderId === user.id &&
      r.status === 'pending' &&
      new Date(r.expiresAt).getTime() > now
    );
  }

  /**
   * Send a connection request to spouse / partner with generated 6-digit verification code
   */
  static sendPartnerConnectionRequest(params: {
    sender: UserProfile;
    receiverEmail: string;
    receiverRole?: FamilyRole;
    permissions?: Partial<PartnerConnectionPermissions>;
  }): PartnerConnectionRequest {
    const { sender, receiverEmail, receiverRole, permissions } = params;
    const cleanReceiverEmail = receiverEmail.trim().toLowerCase();
    const cleanSenderEmail = sender.email.trim().toLowerCase();

    if (!cleanReceiverEmail) {
      throw new Error("Please provide your partner's email address.");
    }

    if (cleanReceiverEmail === cleanSenderEmail) {
      throw new Error('You cannot send a partner connection request to yourself.');
    }

    const allRequests = this.getPartnerConnectionRequests();
    
    // Check if an active verified partner already exists
    if (sender.linkedPartner && sender.linkedPartner.status === 'verified') {
      throw new Error(`You are already linked to ${sender.linkedPartner.partnerName} (${sender.linkedPartner.partnerRole}). Disconnect existing partner before initiating a new connection.`);
    }

    // Check if receiver is already registered
    const allUsers = this.getRegisteredUsers();
    const registeredReceiver = allUsers.find((u) => u.email.trim().toLowerCase() === cleanReceiverEmail);

    // Cancel any previous pending requests from this sender to the same receiver
    const filteredRequests = allRequests.filter(
      (r) => !(r.senderId === sender.id && r.receiverEmail.trim().toLowerCase() === cleanReceiverEmail && r.status === 'pending')
    );

    // Generate secure 6-digit PIN (e.g. 582914)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const newRequest: PartnerConnectionRequest = {
      id: `pconn_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: sender.id,
      senderName: sender.name,
      senderEmail: sender.email,
      senderRole: sender.familyRole,
      senderHouseholdName: sender.householdName,
      senderHouseholdId: sender.householdId || this.normalizeHouseholdId(sender.householdName),
      receiverEmail: cleanReceiverEmail,
      receiverName: registeredReceiver ? registeredReceiver.name : undefined,
      receiverRole: receiverRole || (sender.familyRole === 'husband' ? 'wife' : sender.familyRole === 'wife' ? 'husband' : 'partner'),
      verificationCode,
      status: 'pending',
      permissions: {
        shareAccounts: permissions?.shareAccounts ?? true,
        shareInstallments: permissions?.shareInstallments ?? true,
        shareExpenses: permissions?.shareExpenses ?? true,
        allowBidirectionalSync: permissions?.allowBidirectionalSync ?? true,
      },
      createdAt: now.toISOString(),
      expiresAt,
    };

    filteredRequests.push(newRequest);
    this.savePartnerConnectionRequests(filteredRequests);

    return newRequest;
  }

  /**
   * Verify 6-digit code and accept partner connection request (Dual-Party Acceptance)
   */
  static verifyAndAcceptPartnerRequest(params: {
    requestId: string;
    verificationCode: string;
    receiver: UserProfile;
  }): {
    senderUser: UserProfile;
    receiverUser: UserProfile;
    connection: PartnerConnection;
  } {
    const { requestId, verificationCode, receiver } = params;
    const cleanCode = (verificationCode || '').trim();

    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error('Please enter the valid 6-digit verification PIN provided by your spouse.');
    }

    const allRequests = this.getPartnerConnectionRequests();
    const reqIndex = allRequests.findIndex((r) => r.id === requestId);

    if (reqIndex === -1) {
      throw new Error('Connection request not found or has expired.');
    }

    const request = allRequests[reqIndex];

    if (request.status !== 'pending') {
      throw new Error(`This request has already been ${request.status}.`);
    }

    if (new Date(request.expiresAt).getTime() <= Date.now()) {
      request.status = 'revoked';
      this.savePartnerConnectionRequests(allRequests);
      throw new Error('This connection request has expired. Please ask your spouse to generate a new invite.');
    }

    // Check receiver email match
    if (request.receiverEmail.trim().toLowerCase() !== receiver.email.trim().toLowerCase()) {
      throw new Error('This request was sent to a different email address.');
    }

    // Verify code strictly
    if (request.verificationCode !== cleanCode) {
      throw new Error('Verification PIN mismatch. Please check the 6-digit PIN with your spouse.');
    }

    const allUsers = this.getRegisteredUsers();
    const senderIndex = allUsers.findIndex((u) => u.id === request.senderId);
    const receiverIndex = allUsers.findIndex((u) => u.id === receiver.id);

    if (senderIndex === -1) {
      throw new Error('The sender profile was not found on this system.');
    }

    const senderUser = allUsers[senderIndex];
    const receiverUser = receiverIndex !== -1 ? allUsers[receiverIndex] : receiver;

    // Harmonize Household: Unify both partners into a shared household
    const sharedHouseholdName = senderUser.householdName || receiverUser.householdName || 'My Family';
    const sharedHouseholdId = senderUser.householdId || receiverUser.householdId || this.normalizeHouseholdId(sharedHouseholdName);

    senderUser.householdName = sharedHouseholdName;
    senderUser.householdId = sharedHouseholdId;
    receiverUser.householdName = sharedHouseholdName;
    receiverUser.householdId = sharedHouseholdId;

    const connectionId = `pconn_${Date.now()}`;
    const verifiedAt = new Date().toISOString();

    const senderConnection: PartnerConnection = {
      id: connectionId,
      partnerUserId: receiverUser.id,
      partnerName: receiverUser.name,
      partnerEmail: receiverUser.email,
      partnerRole: receiverUser.familyRole,
      status: 'verified',
      verifiedAt,
      verificationCode: cleanCode,
      sharedHouseholdName,
      sharedHouseholdId,
      permissions: request.permissions,
      lastSyncedAt: undefined,
    };

    const receiverConnection: PartnerConnection = {
      id: connectionId,
      partnerUserId: senderUser.id,
      partnerName: senderUser.name,
      partnerEmail: senderUser.email,
      partnerRole: senderUser.familyRole,
      status: 'verified',
      verifiedAt,
      verificationCode: cleanCode,
      sharedHouseholdName,
      sharedHouseholdId,
      permissions: request.permissions,
      lastSyncedAt: undefined,
    };

    senderUser.linkedPartner = senderConnection;
    receiverUser.linkedPartner = receiverConnection;

    allUsers[senderIndex] = senderUser;
    if (receiverIndex !== -1) {
      allUsers[receiverIndex] = receiverUser;
    } else {
      allUsers.push(receiverUser);
    }
    localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(allUsers));

    // Update request state
    request.status = 'accepted';
    request.acceptedAt = verifiedAt;
    allRequests[reqIndex] = request;
    this.savePartnerConnectionRequests(allRequests);

    return {
      senderUser,
      receiverUser,
      connection: receiverConnection,
    };
  }

  /**
   * Decline / reject an incoming partner connection request
   */
  static rejectPartnerRequest(requestId: string, receiver: UserProfile): void {
    const allRequests = this.getPartnerConnectionRequests();
    const req = allRequests.find((r) => r.id === requestId);
    if (!req) return;

    if (req.receiverEmail.trim().toLowerCase() !== receiver.email.trim().toLowerCase()) {
      throw new Error('Unauthorized to decline this request.');
    }

    req.status = 'rejected';
    this.savePartnerConnectionRequests(allRequests);
  }

  /**
   * Cancel / revoke an outgoing partner request
   */
  static cancelPartnerRequest(requestId: string, sender: UserProfile): void {
    const allRequests = this.getPartnerConnectionRequests();
    const req = allRequests.find((r) => r.id === requestId);
    if (!req) return;

    if (req.senderId !== sender.id) {
      throw new Error('Unauthorized to cancel this request.');
    }

    req.status = 'revoked';
    this.savePartnerConnectionRequests(allRequests);
  }

  /**
   * Disconnect / Sever partner connection mutually
   */
  static disconnectPartner(userId: string): { currentUser: UserProfile; exPartnerUser?: UserProfile } {
    const allUsers = this.getRegisteredUsers();
    const userIdx = allUsers.findIndex((u) => u.id === userId);
    if (userIdx === -1) {
      throw new Error('User not found.');
    }

    const current = allUsers[userIdx];
    const partnerId = current.linkedPartner?.partnerUserId;
    current.linkedPartner = undefined;
    allUsers[userIdx] = current;

    let exPartnerUser: UserProfile | undefined;
    if (partnerId) {
      const partnerIdx = allUsers.findIndex((u) => u.id === partnerId);
      if (partnerIdx !== -1) {
        exPartnerUser = allUsers[partnerIdx];
        exPartnerUser.linkedPartner = undefined;
        allUsers[partnerIdx] = exPartnerUser;
      }
    }

    localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(allUsers));
    return { currentUser: current, exPartnerUser };
  }

  /**
   * 1-Click Sync Data between Verified Partners
   */
  static syncVerifiedPartnerData(currentUserId: string, partnerUserId: string): {
    updatedDb: UserDedicatedDatabase;
    accountsAdded: number;
    installmentsAdded: number;
    expensesAdded: number;
  } {
    const allUsers = this.getRegisteredUsers();
    const currentUser = allUsers.find((u) => u.id === currentUserId);
    const partnerUser = allUsers.find((u) => u.id === partnerUserId);

    if (!currentUser || !partnerUser) {
      throw new Error('Users not found for synchronization.');
    }

    // Verify dual-party connection
    if (
      currentUser.linkedPartner?.status !== 'verified' ||
      currentUser.linkedPartner.partnerUserId !== partnerUserId ||
      partnerUser.linkedPartner?.status !== 'verified' ||
      partnerUser.linkedPartner.partnerUserId !== currentUserId
    ) {
      throw new Error('Both parties must have verified and accepted their partner connection to sync data.');
    }

    const currentDb = this.loadUserDatabase(currentUserId);
    const partnerDb = this.loadUserDatabase(partnerUserId);

    const now = new Date().toISOString();
    let accountsAdded = 0;
    let installmentsAdded = 0;
    let expensesAdded = 0;

    const existingAccIds = new Set(currentDb.accounts.map((a) => a.id));
    const newAccounts: BillAccount[] = [...currentDb.accounts];

    for (const pAcc of partnerDb.accounts) {
      if (!existingAccIds.has(pAcc.id)) {
        // Tag with partner ownership and harmonize household
        newAccounts.push({
          ...pAcc,
          ownerName: `${partnerUser.name} (${partnerUser.familyRole})`,
          ownerRole: partnerUser.familyRole,
          householdId: currentDb.householdId,
          householdName: currentDb.householdName,
        });
        existingAccIds.add(pAcc.id);
        accountsAdded++;
      }
    }

    const existingInstIds = new Set(currentDb.installments.map((i) => i.id));
    const newInstallments: InstallmentPlan[] = [...currentDb.installments];

    for (const pInst of partnerDb.installments) {
      if (!existingInstIds.has(pInst.id)) {
        newInstallments.push({
          ...pInst,
          ownerName: `${partnerUser.name} (${partnerUser.familyRole})`,
          ownerRole: partnerUser.familyRole,
          householdId: currentDb.householdId,
          householdName: currentDb.householdName,
        });
        existingInstIds.add(pInst.id);
        installmentsAdded++;
      }
    }

    const existingExpIds = new Set((currentDb.expenses || []).map((e) => e.id));
    const deletedExpIds = new Set(currentDb.deletedExpenseIds || []);
    const newExpenses: ExpenseItem[] = [...(currentDb.expenses || [])];

    if (currentUser.linkedPartner.permissions.shareExpenses && partnerDb.expenses) {
      for (const pExp of partnerDb.expenses) {
        if (!existingExpIds.has(pExp.id) && !deletedExpIds.has(pExp.id)) {
          newExpenses.push({
            ...pExp,
            ownerName: `${partnerUser.name} (${partnerUser.familyRole})`,
            ownerRole: partnerUser.familyRole,
            householdId: currentDb.householdId,
            householdName: currentDb.householdName,
          });
          existingExpIds.add(pExp.id);
          expensesAdded++;
        }
      }
    }

    // Update current DB
    const updatedCurrentDb: UserDedicatedDatabase = {
      ...currentDb,
      accounts: newAccounts,
      installments: newInstallments,
      expenses: newExpenses,
      lastUpdated: now,
      version: currentDb.version + 1,
    };
    this.saveUserDatabase(updatedCurrentDb);

    // If bidirectional sync is enabled, sync back into partnerDb
    if (currentUser.linkedPartner.permissions.allowBidirectionalSync) {
      const partnerExistingAccIds = new Set(partnerDb.accounts.map((a) => a.id));
      const partnerNewAccounts = [...partnerDb.accounts];
      for (const cAcc of currentDb.accounts) {
        if (!partnerExistingAccIds.has(cAcc.id)) {
          partnerNewAccounts.push({
            ...cAcc,
            ownerName: `${currentUser.name} (${currentUser.familyRole})`,
            ownerRole: currentUser.familyRole,
            householdId: partnerDb.householdId,
            householdName: partnerDb.householdName,
          });
          partnerExistingAccIds.add(cAcc.id);
        }
      }

      const partnerExistingInstIds = new Set(partnerDb.installments.map((i) => i.id));
      const partnerNewInst = [...partnerDb.installments];
      for (const cInst of currentDb.installments) {
        if (!partnerExistingInstIds.has(cInst.id)) {
          partnerNewInst.push({
            ...cInst,
            ownerName: `${currentUser.name} (${currentUser.familyRole})`,
            ownerRole: currentUser.familyRole,
            householdId: partnerDb.householdId,
            householdName: partnerDb.householdName,
          });
          partnerExistingInstIds.add(cInst.id);
        }
      }

      const updatedPartnerDb: UserDedicatedDatabase = {
        ...partnerDb,
        accounts: partnerNewAccounts,
        installments: partnerNewInst,
        lastUpdated: now,
        version: partnerDb.version + 1,
      };
      this.saveUserDatabase(updatedPartnerDb);
    }

    // Update lastSyncedAt on both profiles
    if (currentUser.linkedPartner) {
      currentUser.linkedPartner.lastSyncedAt = now;
      this.updateUserProfile(currentUser);
    }
    if (partnerUser.linkedPartner) {
      partnerUser.linkedPartner.lastSyncedAt = now;
      this.updateUserProfile(partnerUser);
    }

    return {
      updatedDb: updatedCurrentDb,
      accountsAdded,
      installmentsAdded,
      expensesAdded,
    };
  }

  /**
   * Check if switching to a target user is authorized
   */
  static canSwitchToUser(currentUser: UserProfile, targetUserId: string): { allowed: boolean; reason?: string } {
    if (currentUser.id === targetUserId) {
      return { allowed: true };
    }

    const allUsers = this.getRegisteredUsers();
    const targetUser = allUsers.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return { allowed: false, reason: 'Target profile not found on this device.' };
    }

    // Verify same household
    const currentHId = currentUser.householdId || this.normalizeHouseholdId(currentUser.householdName);
    const targetHId = targetUser.householdId || this.normalizeHouseholdId(targetUser.householdName);
    if (currentHId !== targetHId) {
      return { 
        allowed: false, 
        reason: 'Cross-household switching is blocked. You cannot view or switch to accounts from another household.' 
      };
    }

    // Must be verified partner connection
    const isVerifiedPartner = 
      currentUser.linkedPartner?.status === 'verified' &&
      currentUser.linkedPartner.partnerUserId === targetUserId &&
      targetUser.linkedPartner?.status === 'verified' &&
      targetUser.linkedPartner.partnerUserId === currentUser.id;

    if (!isVerifiedPartner) {
      return {
        allowed: false,
        reason: 'Dual-party verification required. Spouses must send, verify with the 6-digit PIN, and accept a Partner Connection before switching is permitted.'
      };
    }

    return { allowed: true };
  }

  /**
   * Update and persist a user's profile
   */
  static updateUserProfile(user: UserProfile): void {
    const users = this.getRegisteredUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(users));
  }

  /**
   * Increment AI consultation usage count for user
   */
  static incrementAiUsage(userId: string): UserProfile | null {
    const users = this.getRegisteredUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    if (!user.tierLimits) {
      user.tierLimits = {
        maxAccounts: 3,
        maxStandingInstructions: 3,
        monthlyAiConsultations: 3,
        monthlyReceiptExtractions: 5,
        aiConsultationsUsed: 0,
        receiptExtractionsUsed: 0,
      };
    }
    user.tierLimits.aiConsultationsUsed = (user.tierLimits.aiConsultationsUsed || 0) + 1;
    this.updateUserProfile(user);
    return user;
  }

  static incrementAiConsultationUsage(userId: string): UserProfile | null {
    return this.incrementAiUsage(userId);
  }

  /**
   * Increment receipt scanning/extraction usage count for user
   */
  static incrementReceiptUsage(userId: string): UserProfile | null {
    const users = this.getRegisteredUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    if (!user.tierLimits) {
      user.tierLimits = {
        maxAccounts: 3,
        maxStandingInstructions: 3,
        monthlyAiConsultations: 3,
        monthlyReceiptExtractions: 5,
        aiConsultationsUsed: 0,
        receiptExtractionsUsed: 0,
      };
    }
    user.tierLimits.receiptExtractionsUsed = (user.tierLimits.receiptExtractionsUsed || 0) + 1;
    this.updateUserProfile(user);
    return user;
  }

  /**
   * Upgrade user to Pro Tier upon verified payment processing
   */
  static upgradeToPro(userId: string, paymentRecord: ProPaymentRecord): UserProfile | null {
    if (!paymentRecord || !paymentRecord.transactionId || paymentRecord.amount <= 0 || paymentRecord.status !== 'active') {
      throw new Error('Upgrade to Pro rejected: Valid payment transaction record is required.');
    }
    const users = this.getRegisteredUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    user.tier = 'pro';
    user.proPaymentRecord = paymentRecord;
    user.tierLimits = {
      maxAccounts: 999,
      maxStandingInstructions: 999,
      monthlyAiConsultations: 999,
      monthlyReceiptExtractions: 999,
      aiConsultationsUsed: user.tierLimits?.aiConsultationsUsed || 0,
      receiptExtractionsUsed: user.tierLimits?.receiptExtractionsUsed || 0,
    };
    this.updateUserProfile(user);
    return user;
  }

  /**
   * Cancel or downgrade Pro subscription back to Free tier
   */
  static cancelProSubscription(userId: string): UserProfile | null {
    const users = this.getRegisteredUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    user.tier = 'free';
    if (user.proPaymentRecord) {
      user.proPaymentRecord.status = 'cancelled';
    }
    user.tierLimits = {
      maxAccounts: 3,
      maxStandingInstructions: 3,
      monthlyAiConsultations: 3,
      monthlyReceiptExtractions: 5,
      aiConsultationsUsed: user.tierLimits?.aiConsultationsUsed || 0,
      receiptExtractionsUsed: user.tierLimits?.receiptExtractionsUsed || 0,
    };
    this.updateUserProfile(user);
    return user;
  }

  /**
   * Get the active logged in user
   */
  static getActiveUser(): UserProfile | null {
    try {
      const activeId = localStorage.getItem(ACTIVE_USER_KEY);
      if (!activeId) return null;
      const users = this.getRegisteredUsers();
      return users.find((u) => u.id === activeId) || null;
    } catch {
      return null;
    }
  }

  /**
   * Set active logged in user
   */
  static setActiveUser(userId: string): UserProfile | null {
    const users = this.getRegisteredUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      localStorage.setItem(ACTIVE_USER_KEY, user.id);
      return user;
    }
    return null;
  }

  /**
   * Logout current user
   */
  static logout(): void {
    localStorage.removeItem(ACTIVE_USER_KEY);
  }

  /**
   * Register a new user and assign a dedicated database
   */
  static registerUser(params: {
    name: string;
    email: string;
    passphrase?: string;
    familyRole: FamilyRole;
    householdName?: string;
    householdId?: string;
    initialDataTemplate?: 'husband_starter' | 'wife_starter' | 'standard' | 'blank';
  }): { user: UserProfile; db: UserDedicatedDatabase } {
    const users = this.getRegisteredUsers();
    const existing = users.find((u) => u.email.toLowerCase() === params.email.trim().toLowerCase());
    if (existing) {
      throw new Error(`An account with email ${params.email} already exists.`);
    }

    const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const cleanName = params.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const databaseId = `db_${cleanName}_${Date.now().toString(36)}`;
    const householdName = params.householdName?.trim() || 'My Family';
    const householdId = params.householdId || this.normalizeHouseholdId(householdName);

    const newUser: UserProfile = {
      id: userId,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      passphrase: params.passphrase?.trim() || undefined,
      familyRole: params.familyRole,
      householdName,
      householdId,
      createdAt: new Date().toISOString(),
      databaseId,
      tier: 'free',
      tierLimits: {
        maxAccounts: 3,
        maxStandingInstructions: 3,
        monthlyAiConsultations: 3,
        monthlyReceiptExtractions: 5,
        aiConsultationsUsed: 0,
        receiptExtractionsUsed: 0,
      },
    };

    // Construct dedicated database
    let initialAccounts: BillAccount[] = [];
    let initialInstallments: InstallmentPlan[] = [];
    let initialExpenses: ExpenseItem[] = [];
    let initialStandingInstructions: StandingInstruction[] = [];

    if (params.initialDataTemplate === 'wife_starter') {
      initialAccounts = INITIAL_ACCOUNTS.slice(2, 5).map((a) => ({
        ...a,
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
        householdId,
        householdName,
      }));
      initialInstallments = INITIAL_INSTALLMENTS.slice(1, 3).map((i) => ({
        ...i,
        id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
        householdId,
        householdName,
      }));
      initialExpenses = INITIAL_EXPENSES.filter((e) => e.ownerRole !== 'husband').slice(0, 5).map((e) => ({
        ...e,
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
        householdId,
        householdName,
      }));
      initialStandingInstructions = INITIAL_STANDING_INSTRUCTIONS.slice(1, 3);
    } else if (params.initialDataTemplate !== 'blank') {
      // Free plan starter: 3 accounts (at limit), 2 installments, 5 expenses, 2 standing instructions
      initialAccounts = INITIAL_ACCOUNTS.slice(0, 3).map((a) => ({
        ...a,
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
        householdId,
        householdName,
      }));
      initialInstallments = INITIAL_INSTALLMENTS.slice(0, 2).map((i) => ({
        ...i,
        id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
        householdId,
        householdName,
      }));
      initialExpenses = INITIAL_EXPENSES.slice(0, 6).map((e) => ({
        ...e,
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
        householdId,
        householdName,
      }));
      initialStandingInstructions = INITIAL_STANDING_INSTRUCTIONS.slice(0, 2);
    }

    const newDb: UserDedicatedDatabase = {
      databaseId,
      userId,
      userEmail: newUser.email,
      householdId,
      householdName,
      lastUpdated: new Date().toISOString(),
      version: 1,
      accounts: initialAccounts,
      installments: initialInstallments,
      expenses: initialExpenses,
      standingInstructions: initialStandingInstructions,
      bankScheduledTransactions: [...INITIAL_BANK_SCHEDULED_TRANSACTIONS],
      quickPayTemplates: [...INITIAL_QUICK_PAY_TEMPLATES],
      utilityBills: [...INITIAL_UTILITY_BILLS],
      settings: { ...INITIAL_SETTINGS },
      paidScheduleIds: [],
      scheduledScheduleIds: [],
      alertThresholds: [7, 3, 1],
    };

    // Save to users index
    users.push(newUser);
    localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(users));

    // Save dedicated database
    localStorage.setItem(`${DB_PREFIX}${userId}`, JSON.stringify(newDb));

    // Set as active
    localStorage.setItem(ACTIVE_USER_KEY, userId);

    // Sync to backend if available
    this.syncDatabaseToBackend(newDb).catch(() => {});

    return { user: newUser, db: newDb };
  }

  /**
   * Load user's dedicated database
   */
  static loadUserDatabase(userId: string): UserDedicatedDatabase {
    const raw = localStorage.getItem(`${DB_PREFIX}${userId}`);
    if (raw) {
      try {
        const parsed: UserDedicatedDatabase = JSON.parse(raw);
        if (!parsed.settings) {
          parsed.settings = { ...INITIAL_SETTINGS };
        } else {
          parsed.settings.currency = parsed.settings.currency || 'MYR';
          parsed.settings.allocatedCashForBills = parsed.settings.allocatedCashForBills ?? 3500;
          parsed.settings.monthlyIncome = parsed.settings.monthlyIncome ?? 6500;
          parsed.settings.paycheckDates = parsed.settings.paycheckDates || [1, 15];
          parsed.settings.monthlySpendingCap = parsed.settings.monthlySpendingCap ?? 5000;
        }
        // Migration: ensure accounts have valid defaults and expenses/standing instructions array are present
        if (!Array.isArray(parsed.expenses)) {
          parsed.expenses = [];
        }
        if (!Array.isArray(parsed.deletedExpenseIds)) {
          parsed.deletedExpenseIds = [];
        }
        if (!Array.isArray(parsed.dismissedRecurringKeys)) {
          parsed.dismissedRecurringKeys = [];
        }
        // Filter out any deleted expenses by ID
        if (parsed.deletedExpenseIds.length > 0) {
          const delSet = new Set(parsed.deletedExpenseIds);
          parsed.expenses = parsed.expenses.filter((e) => !delSet.has(e.id));
        }
        if (!Array.isArray(parsed.deletedStandingInstructionIds)) {
          parsed.deletedStandingInstructionIds = [];
        }
        if (!Array.isArray(parsed.standingInstructions)) {
          parsed.standingInstructions = [];
        } else if (parsed.deletedStandingInstructionIds.length > 0) {
          const delSiSet = new Set(parsed.deletedStandingInstructionIds);
          parsed.standingInstructions = parsed.standingInstructions.filter((si) => !delSiSet.has(si.id));
        }
        if (!Array.isArray(parsed.bankScheduledTransactions)) {
          parsed.bankScheduledTransactions = [];
        }
        if (!Array.isArray(parsed.quickPayTemplates)) {
          parsed.quickPayTemplates = [];
        }
        if (!Array.isArray(parsed.utilityBills)) {
          parsed.utilityBills = [];
        }
        return parsed;
      } catch (err) {
        console.warn('Error parsing user database from localStorage:', err);
      }
    }

    // Fallback based on profile
    const users = this.getRegisteredUsers();
    const user = users.find((u) => u.id === userId);
    const databaseId = user ? user.databaseId : `db_auto_${userId}`;

    const fallbackDb: UserDedicatedDatabase = {
      databaseId,
      userId,
      userEmail: user?.email || '',
      lastUpdated: new Date().toISOString(),
      version: 1,
      accounts: INITIAL_ACCOUNTS.slice(0, 3),
      installments: INITIAL_INSTALLMENTS.slice(0, 2),
      expenses: INITIAL_EXPENSES.slice(0, 6),
      standingInstructions: INITIAL_STANDING_INSTRUCTIONS.slice(0, 2),
      bankScheduledTransactions: [...INITIAL_BANK_SCHEDULED_TRANSACTIONS],
      quickPayTemplates: [...INITIAL_QUICK_PAY_TEMPLATES],
      utilityBills: [...INITIAL_UTILITY_BILLS],
      settings: INITIAL_SETTINGS,
      paidScheduleIds: [],
      scheduledScheduleIds: [],
      alertThresholds: [7, 3, 1],
    };

    localStorage.setItem(`${DB_PREFIX}${userId}`, JSON.stringify(fallbackDb));
    return fallbackDb;
  }

  /**
   * Save changes directly to the dedicated database (Auto-save)
   */
  static saveUserDatabase(db: UserDedicatedDatabase): void {
    db.lastUpdated = new Date().toISOString();
    db.version = (db.version || 1) + 1;
    localStorage.setItem(`${DB_PREFIX}${db.userId}`, JSON.stringify(db));

    // Also persist to backend asynchronously
    this.syncDatabaseToBackend(db).catch((e) => {
      console.debug('Backend database sync deferred or running in client-only mode:', e);
    });
  }

  /**
   * Sync to server-side endpoint if running full-stack
   */
  private static async syncDatabaseToBackend(db: UserDedicatedDatabase): Promise<void> {
    try {
      await fetch(`/api/user-db/${encodeURIComponent(db.userId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db),
      });
    } catch {
      // Graceful offline fallback
    }
  }

  /**
   * Reset user's password / passphrase
   */
  static resetUserPassphrase(email: string, newPassphrase: string): UserProfile {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = newPassphrase.trim();
    if (!cleanEmail) {
      throw new Error('Please provide your registered email address.');
    }
    if (!cleanPass || cleanPass.length < 3) {
      throw new Error('Passphrase must be at least 3 characters long.');
    }

    const users = this.getRegisteredUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error(`No registered account found for ${cleanEmail}.`);
    }

    user.passphrase = cleanPass;
    this.updateUserProfile(user);
    return user;
  }

  /**
   * Verify credentials for login
   */
  static verifyCredentials(email: string, passphrase: string): { valid: boolean; error?: string; user?: UserProfile } {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getRegisteredUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { valid: false, error: `No registered account found for ${cleanEmail}.` };
    }

    // If user has a passphrase configured, verify it
    if (user.passphrase && user.passphrase.trim() !== '') {
      if (user.passphrase !== passphrase.trim()) {
        return { 
          valid: false, 
          error: 'Incorrect security passphrase. Click "Forgot Passphrase?" to reset it.',
          user 
        };
      }
    }

    return { valid: true, user };
  }

  /**
   * Reset a user's dedicated database for a fresh restart
   */
  /**
   * Resets a user's dedicated database partition to a chosen clean template.
   * 'standard': Clean starter with accounts at 0 debt balance, 0 expenses, 0 unsettled swipes.
   * 'demo': Restores starter accounts with 6 sample transactions and 2 sample installment plans.
   * 'blank': Pristine zero-data partition.
   */
  static resetUserDatabase(
    userId: string, 
    template: 'standard' | 'wife_starter' | 'demo' | 'blank' = 'standard'
  ): UserDedicatedDatabase {
    const users = this.getRegisteredUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const householdId = user.householdId || this.normalizeHouseholdId(user.householdName);
    const householdName = user.householdName || 'My Family';

    let accounts: BillAccount[] = [];
    let installments: InstallmentPlan[] = [];
    let expenses: ExpenseItem[] = [];
    let standingInstructions: StandingInstruction[] = [];
    let quickPayTemplates: QuickPayTemplate[] = [];

    if (template === 'wife_starter') {
      accounts = INITIAL_ACCOUNTS.slice(2, 5).map((a) => ({
        ...a,
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${user.name} (${user.familyRole})`,
        ownerRole: user.familyRole,
        householdId,
        householdName,
        totalBalance: a.type === 'bank_account' ? a.totalBalance : 0,
        statementBalance: 0,
      }));
      installments = [];
      expenses = []; // Guaranteed clean restart with 0 expenses
      standingInstructions = INITIAL_STANDING_INSTRUCTIONS.slice(1, 3);
      quickPayTemplates = [...INITIAL_QUICK_PAY_TEMPLATES];
    } else if (template === 'demo') {
      // Demo mode with sample expenses and active installments
      accounts = INITIAL_ACCOUNTS.slice(0, 3).map((a) => ({
        ...a,
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${user.name} (${user.familyRole})`,
        ownerRole: user.familyRole,
        householdId,
        householdName,
      }));
      installments = INITIAL_INSTALLMENTS.slice(0, 2).map((i) => ({
        ...i,
        id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${user.name} (${user.familyRole})`,
        ownerRole: user.familyRole,
        householdId,
        householdName,
      }));
      expenses = INITIAL_EXPENSES.slice(0, 6).map((e) => ({
        ...e,
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${user.name} (${user.familyRole})`,
        ownerRole: user.familyRole,
        householdId,
        householdName,
      }));
      standingInstructions = INITIAL_STANDING_INSTRUCTIONS.slice(0, 2);
      quickPayTemplates = [...INITIAL_QUICK_PAY_TEMPLATES];
    } else if (template === 'standard') {
      // Standard Clean Starter: Accounts initialized with RM 0 debt balances and 0 expenses/swipes
      accounts = INITIAL_ACCOUNTS.slice(0, 3).map((a) => ({
        ...a,
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${user.name} (${user.familyRole})`,
        ownerRole: user.familyRole,
        householdId,
        householdName,
        totalBalance: a.type === 'bank_account' ? a.totalBalance : 0,
        statementBalance: 0,
      }));
      installments = []; // Clean restart with 0 active installment plans
      expenses = []; // Clean restart with 0 logged expenses and 0 pending swipes awaiting settlement
      standingInstructions = INITIAL_STANDING_INSTRUCTIONS.slice(0, 2);
      quickPayTemplates = [...INITIAL_QUICK_PAY_TEMPLATES];
    } // for 'blank', they remain empty arrays []

    const resetDb: UserDedicatedDatabase = {
      databaseId: user.databaseId,
      userId,
      userEmail: user.email,
      householdId,
      householdName,
      lastUpdated: new Date().toISOString(),
      version: 1,
      accounts,
      installments,
      expenses,
      standingInstructions,
      bankScheduledTransactions: template === 'blank' ? [] : [...INITIAL_BANK_SCHEDULED_TRANSACTIONS],
      quickPayTemplates,
      settings: { ...INITIAL_SETTINGS, allocatedCashForBills: template === 'blank' ? 0 : 3500 },
      paidScheduleIds: [],
      scheduledScheduleIds: [],
      alertThresholds: [7, 3, 1],
    };

    localStorage.setItem(`${DB_PREFIX}${userId}`, JSON.stringify(resetDb));
    this.syncDatabaseToBackend(resetDb).catch(() => {});
    return resetDb;
  }

  /**
   * Purges all expense records for the specified user while leaving accounts,
   * installments, and standing instructions completely intact.
   */
  static clearUserExpenses(userId: string): UserDedicatedDatabase {
    const db = this.loadUserDatabase(userId);
    const existingIds = (db.expenses || []).map((e) => e.id);
    db.deletedExpenseIds = Array.from(new Set([...(db.deletedExpenseIds || []), ...existingIds]));
    db.expenses = [];
    db.lastUpdated = new Date().toISOString();
    this.saveUserDatabase(db);
    return db;
  }

  /**
   * Purges only unsettled swipes awaiting settlement for the specified user.
   */
  static clearUnsettledSwipes(userId: string): UserDedicatedDatabase {
    const db = this.loadUserDatabase(userId);
    const unsettledIds = (db.expenses || []).filter((e) => e.status === 'unsettled').map((e) => e.id);
    db.deletedExpenseIds = Array.from(new Set([...(db.deletedExpenseIds || []), ...unsettledIds]));
    db.expenses = (db.expenses || []).filter((e) => e.status !== 'unsettled');
    db.lastUpdated = new Date().toISOString();
    this.saveUserDatabase(db);
    return db;
  }

  /**
   * Factory reset all user databases and registered profiles for total fresh start
   */
  static factoryResetAllData(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('billflow_') || key.startsWith(DB_PREFIX))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.error('Failed to clear localStorage during factory reset:', e);
    }
  }

  /**
   * Export dedicated database for family synchronization
   */
  static createFamilySyncPackage(
    user: UserProfile,
    db: UserDedicatedDatabase,
    includeOptions: {
      includeAccounts: boolean;
      includeInstallments: boolean;
      includeSettings: boolean;
      includeExpenses?: boolean;
    }
  ): FamilySyncPackage {
    const selectedAccounts = includeOptions.includeAccounts ? db.accounts : [];
    const selectedInstallments = includeOptions.includeInstallments ? db.installments : [];
    const selectedExpenses = includeOptions.includeExpenses !== false ? (db.expenses || []) : [];

    const totalDebt = selectedAccounts.reduce((sum, a) => sum + a.statementBalance, 0);
    const totalMonthlyInstallments = selectedInstallments.reduce((sum, i) => sum + i.monthlyAmount, 0);

    const checksum = `bf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      format: 'billflow-family-sync',
      version: 1,
      exportedAt: new Date().toISOString(),
      checksum,
      exportedBy: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        familyRole: user.familyRole,
        householdName: user.householdName,
        householdId: user.householdId || this.normalizeHouseholdId(user.householdName),
      },
      data: {
        accounts: selectedAccounts,
        installments: selectedInstallments,
        expenses: selectedExpenses,
        quickPayTemplates: db.quickPayTemplates || [],
        settings: includeOptions.includeSettings ? db.settings : undefined,
      },
      summary: {
        totalAccounts: selectedAccounts.length,
        totalInstallments: selectedInstallments.length,
        totalExpenses: selectedExpenses.length,
        totalDebt: Math.round(totalDebt * 100) / 100,
        totalMonthlyInstallments: Math.round(totalMonthlyInstallments * 100) / 100,
      },
    };
  }

  /**
   * Import and synchronize family data into current dedicated database
   * with strict household boundary validation to prevent cross-household contamination.
   */
  static importFamilyData(
    currentDb: UserDedicatedDatabase,
    syncPackage: FamilySyncPackage,
    options: {
      mode: 'merge' | 'replace';
      tagWithOwner: boolean;
      customOwnerTag?: string;
      targetHouseholdName?: string;
      targetHouseholdId?: string;
      allowCrossHouseholdMerge?: boolean;
    }
  ): { updatedDb: UserDedicatedDatabase; accountsAdded: number; installmentsAdded: number; expensesAdded?: number } {
    if (syncPackage.format !== 'billflow-family-sync') {
      throw new Error('Invalid file format. Please upload a valid BillFlow Family Sync file.');
    }

    // Household Isolation Guard
    const targetHName = (options.targetHouseholdName || currentDb.householdName || '').trim().toLowerCase();
    const incomingHName = (syncPackage.exportedBy.householdName || '').trim().toLowerCase();
    const targetHId = options.targetHouseholdId || currentDb.householdId || this.normalizeHouseholdId(targetHName);
    const incomingHId = syncPackage.exportedBy.householdId || this.normalizeHouseholdId(incomingHName);

    const isCrossHousehold = (targetHId && incomingHId && targetHId !== incomingHId) ||
      (targetHName && incomingHName && targetHName !== incomingHName);

    if (isCrossHousehold && !options.allowCrossHouseholdMerge) {
      throw new Error(
        `Household Isolation Guard: This sync package originates from household "${syncPackage.exportedBy.householdName}", while your active profile belongs to "${options.targetHouseholdName || currentDb.householdName || 'Current Household'}". Cross-household syncing is blocked to prevent accidental merging of accounts between different households.`
      );
    }

    const partnerName = syncPackage.exportedBy.userName || 'Family Partner';
    const partnerRole = syncPackage.exportedBy.familyRole || 'partner';
    const ownerLabel = options.customOwnerTag || `${partnerName} (${partnerRole})`;

    if (options.mode === 'replace') {
      // Full replacement
      const updatedDb: UserDedicatedDatabase = {
        ...currentDb,
        householdId: targetHId,
        householdName: options.targetHouseholdName || currentDb.householdName,
        lastUpdated: new Date().toISOString(),
        version: currentDb.version + 1,
        accounts: syncPackage.data.accounts.map((a) => ({
          ...a,
          ownerName: options.tagWithOwner ? a.ownerName || ownerLabel : a.ownerName,
          householdId: targetHId,
          householdName: options.targetHouseholdName || currentDb.householdName,
        })),
        installments: syncPackage.data.installments.map((i) => ({
          ...i,
          ownerName: options.tagWithOwner ? i.ownerName || ownerLabel : i.ownerName,
          householdId: targetHId,
          householdName: options.targetHouseholdName || currentDb.householdName,
        })),
        expenses: (syncPackage.data.expenses || []).map((e) => ({
          ...e,
          ownerName: options.tagWithOwner ? e.ownerName || ownerLabel : e.ownerName,
          householdId: targetHId,
          householdName: options.targetHouseholdName || currentDb.householdName,
        })),
      };
      this.saveUserDatabase(updatedDb);
      return {
        updatedDb,
        accountsAdded: updatedDb.accounts.length,
        installmentsAdded: updatedDb.installments.length,
        expensesAdded: (updatedDb.expenses || []).length,
      };
    }

    // Merge mode: Add partner's accounts that aren't already duplicate
    const existingAccountIds = new Set(currentDb.accounts.map((a) => a.id));
    const newAccounts: BillAccount[] = [];

    for (const incomingAcc of syncPackage.data.accounts) {
      if (existingAccountIds.has(incomingAcc.id)) {
        newAccounts.push({
          ...incomingAcc,
          id: `sync-${partnerRole}-${incomingAcc.id}-${Date.now().toString(36)}`,
          ownerName: options.tagWithOwner ? incomingAcc.ownerName || ownerLabel : incomingAcc.ownerName,
          ownerRole: partnerRole,
          householdId: targetHId,
          householdName: options.targetHouseholdName || currentDb.householdName,
        });
      } else {
        newAccounts.push({
          ...incomingAcc,
          ownerName: options.tagWithOwner ? incomingAcc.ownerName || ownerLabel : incomingAcc.ownerName,
          ownerRole: partnerRole,
          householdId: targetHId,
          householdName: options.targetHouseholdName || currentDb.householdName,
        });
      }
    }

    // Merge installments
    const existingInstIds = new Set(currentDb.installments.map((i) => i.id));
    const newInstallments: InstallmentPlan[] = [];

    for (const incomingInst of syncPackage.data.installments) {
      if (existingInstIds.has(incomingInst.id)) {
        newInstallments.push({
          ...incomingInst,
          id: `sync-inst-${partnerRole}-${incomingInst.id}-${Date.now().toString(36)}`,
          ownerName: options.tagWithOwner ? incomingInst.ownerName || ownerLabel : incomingInst.ownerName,
          ownerRole: partnerRole,
          householdId: targetHId,
          householdName: options.targetHouseholdName || currentDb.householdName,
        });
      } else {
        newInstallments.push({
          ...incomingInst,
          ownerName: options.tagWithOwner ? incomingInst.ownerName || ownerLabel : incomingInst.ownerName,
          ownerRole: partnerRole,
          householdId: targetHId,
          householdName: options.targetHouseholdName || currentDb.householdName,
        });
      }
    }

    // Merge expenses
    const existingExpIds = new Set((currentDb.expenses || []).map((e) => e.id));
    const newExpenses: ExpenseItem[] = [];

    for (const incomingExp of (syncPackage.data.expenses || [])) {
      if (existingExpIds.has(incomingExp.id)) {
        newExpenses.push({
          ...incomingExp,
          id: `sync-exp-${partnerRole}-${incomingExp.id}-${Date.now().toString(36)}`,
          ownerName: options.tagWithOwner ? incomingExp.ownerName || ownerLabel : incomingExp.ownerName,
          ownerRole: partnerRole,
          householdId: targetHId,
          householdName: options.targetHouseholdName || currentDb.householdName,
        });
      } else {
        newExpenses.push({
          ...incomingExp,
          ownerName: options.tagWithOwner ? incomingExp.ownerName || ownerLabel : incomingExp.ownerName,
          ownerRole: partnerRole,
          householdId: targetHId,
          householdName: options.targetHouseholdName || currentDb.householdName,
        });
      }
    }

    const updatedDb: UserDedicatedDatabase = {
      ...currentDb,
      householdId: targetHId,
      householdName: options.targetHouseholdName || currentDb.householdName,
      lastUpdated: new Date().toISOString(),
      version: currentDb.version + 1,
      accounts: [...currentDb.accounts, ...newAccounts],
      installments: [...currentDb.installments, ...newInstallments],
      expenses: [...(currentDb.expenses || []), ...newExpenses],
    };

    this.saveUserDatabase(updatedDb);

    return {
      updatedDb,
      accountsAdded: newAccounts.length,
      installmentsAdded: newInstallments.length,
      expensesAdded: newExpenses.length,
    };
  }

  /**
   * Create an unadulterated, comprehensive database backup package for personal safekeeping.
   */
  static createDatabaseBackup(
    user: UserProfile,
    db: UserDedicatedDatabase
  ): DatabaseBackupPackage {
    const totalDebt = (db.accounts || []).reduce((sum, a) => sum + (Number(a.statementBalance) || 0), 0);
    const totalMonthlyInstallments = (db.installments || []).reduce((sum, i) => sum + (Number(i.monthlyAmount) || 0), 0);
    const checksum = `bf_backup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      format: 'billflow-database-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      checksum,
      exportedBy: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        familyRole: user.familyRole,
        householdName: user.householdName,
        householdId: user.householdId || this.normalizeHouseholdId(user.householdName),
      },
      data: {
        accounts: db.accounts || [],
        installments: db.installments || [],
        expenses: db.expenses || [],
        standingInstructions: db.standingInstructions || [],
        quickPayTemplates: db.quickPayTemplates || [],
        utilityBills: db.utilityBills || [],
        settings: db.settings,
        paidScheduleIds: db.paidScheduleIds || [],
        scheduledScheduleIds: db.scheduledScheduleIds || [],
      },
      summary: {
        totalAccounts: (db.accounts || []).length,
        totalInstallments: (db.installments || []).length,
        totalExpenses: (db.expenses || []).length,
        totalStandingInstructions: (db.standingInstructions || []).length,
        totalQuickPayTemplates: (db.quickPayTemplates || []).length,
        totalDebt: Math.round(totalDebt * 100) / 100,
        totalMonthlyInstallments: Math.round(totalMonthlyInstallments * 100) / 100,
      },
    };
  }

  /**
   * Trigger a client-side JSON download of the complete database backup.
   */
  static downloadDatabaseBackup(
    user: UserProfile,
    db: UserDedicatedDatabase
  ): { filename: string; jsonSize: number } {
    const backup = this.createDatabaseBackup(user, db);
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const cleanName = user.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') || 'user';
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `billflow-backup-${cleanName}-${dateStr}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { filename, jsonSize: jsonStr.length };
  }

  /**
   * Import and restore database from a backup JSON file or family sync package.
   * Supports 'replace' (complete database restore) and 'merge' modes.
   */
  static restoreDatabaseBackup(
    currentDb: UserDedicatedDatabase,
    backupPayload: any,
    options: {
      mode: 'replace' | 'merge';
      targetUser: UserProfile;
    }
  ): {
    updatedDb: UserDedicatedDatabase;
    accountsRestored: number;
    installmentsRestored: number;
    expensesRestored: number;
    standingInstructionsRestored: number;
    quickPayTemplatesRestored: number;
    utilityBillsRestored?: number;
    mode: 'replace' | 'merge';
    originFormat: string;
  } {
    if (!backupPayload || typeof backupPayload !== 'object') {
      throw new Error('Invalid backup file. The uploaded payload is not a valid JSON object.');
    }

    // Determine format
    const format = backupPayload.format || (backupPayload.data?.accounts ? 'billflow-database-backup' : 'raw-database');

    // Extract records defensively
    let incomingAccounts: BillAccount[] = [];
    let incomingInstallments: InstallmentPlan[] = [];
    let incomingExpenses: ExpenseItem[] = [];
    let incomingStandingInstructions: StandingInstruction[] = [];
    let incomingQuickPayTemplates: QuickPayTemplate[] = [];
    let incomingUtilityBills: UtilityBillItem[] = [];
    let incomingSettings: UserSettings | undefined;
    let incomingPaidScheduleIds: string[] = [];
    let incomingScheduledScheduleIds: string[] = [];

    if (backupPayload.data) {
      incomingAccounts = Array.isArray(backupPayload.data.accounts) ? backupPayload.data.accounts : [];
      incomingInstallments = Array.isArray(backupPayload.data.installments) ? backupPayload.data.installments : [];
      incomingExpenses = Array.isArray(backupPayload.data.expenses) ? backupPayload.data.expenses : [];
      incomingStandingInstructions = Array.isArray(backupPayload.data.standingInstructions) ? backupPayload.data.standingInstructions : [];
      incomingQuickPayTemplates = Array.isArray(backupPayload.data.quickPayTemplates) ? backupPayload.data.quickPayTemplates : [];
      incomingUtilityBills = Array.isArray(backupPayload.data.utilityBills) ? backupPayload.data.utilityBills : [];
      incomingSettings = backupPayload.data.settings;
      incomingPaidScheduleIds = Array.isArray(backupPayload.data.paidScheduleIds) ? backupPayload.data.paidScheduleIds : [];
      incomingScheduledScheduleIds = Array.isArray(backupPayload.data.scheduledScheduleIds) ? backupPayload.data.scheduledScheduleIds : [];
    } else {
      // Direct raw database structure fallback
      incomingAccounts = Array.isArray(backupPayload.accounts) ? backupPayload.accounts : [];
      incomingInstallments = Array.isArray(backupPayload.installments) ? backupPayload.installments : [];
      incomingExpenses = Array.isArray(backupPayload.expenses) ? backupPayload.expenses : [];
      incomingStandingInstructions = Array.isArray(backupPayload.standingInstructions) ? backupPayload.standingInstructions : [];
      incomingQuickPayTemplates = Array.isArray(backupPayload.quickPayTemplates) ? backupPayload.quickPayTemplates : [];
      incomingUtilityBills = Array.isArray(backupPayload.utilityBills) ? backupPayload.utilityBills : [];
      incomingSettings = backupPayload.settings;
      incomingPaidScheduleIds = Array.isArray(backupPayload.paidScheduleIds) ? backupPayload.paidScheduleIds : [];
      incomingScheduledScheduleIds = Array.isArray(backupPayload.scheduledScheduleIds) ? backupPayload.scheduledScheduleIds : [];
    }

    if (incomingAccounts.length === 0 && incomingExpenses.length === 0 && incomingInstallments.length === 0) {
      throw new Error('The backup file does not contain any valid accounts, installments, or expense transactions.');
    }

    const targetHId = options.targetUser.householdId || currentDb.householdId || this.normalizeHouseholdId(options.targetUser.householdName);
    const targetHName = options.targetUser.householdName || currentDb.householdName;

    if (options.mode === 'replace') {
      const updatedDb: UserDedicatedDatabase = {
        databaseId: currentDb.databaseId,
        userId: currentDb.userId,
        userEmail: currentDb.userEmail,
        householdId: targetHId,
        householdName: targetHName,
        version: (currentDb.version || 1) + 1,
        lastUpdated: new Date().toISOString(),
        alertThresholds: currentDb.alertThresholds || [7, 3, 1],
        accounts: incomingAccounts.map((a) => ({
          ...a,
          householdId: a.householdId || targetHId,
          householdName: a.householdName || targetHName,
        })),
        installments: incomingInstallments.map((i) => ({
          ...i,
          householdId: i.householdId || targetHId,
          householdName: i.householdName || targetHName,
        })),
        expenses: incomingExpenses.map((e) => ({
          ...e,
          householdId: e.householdId || targetHId,
          householdName: e.householdName || targetHName,
        })),
        standingInstructions: incomingStandingInstructions,
        bankScheduledTransactions: currentDb.bankScheduledTransactions || [],
        quickPayTemplates: incomingQuickPayTemplates.length > 0 ? incomingQuickPayTemplates : (currentDb.quickPayTemplates || []),
        utilityBills: incomingUtilityBills.length > 0 ? incomingUtilityBills : (currentDb.utilityBills || []),
        settings: incomingSettings ? { ...currentDb.settings, ...incomingSettings } : currentDb.settings,
        paidScheduleIds: incomingPaidScheduleIds,
        scheduledScheduleIds: incomingScheduledScheduleIds,
      };

      this.saveUserDatabase(updatedDb);

      return {
        updatedDb,
        accountsRestored: updatedDb.accounts.length,
        installmentsRestored: updatedDb.installments.length,
        expensesRestored: (updatedDb.expenses || []).length,
        standingInstructionsRestored: (updatedDb.standingInstructions || []).length,
        quickPayTemplatesRestored: (updatedDb.quickPayTemplates || []).length,
        utilityBillsRestored: (updatedDb.utilityBills || []).length,
        mode: 'replace',
        originFormat: format,
      };
    }

    // Merge mode: Add records that don't collide or update existing
    const existingAccIds = new Set(currentDb.accounts.map((a) => a.id));
    const mergedAccounts: BillAccount[] = [...currentDb.accounts];
    let accountsAdded = 0;

    for (const inAcc of incomingAccounts) {
      if (!existingAccIds.has(inAcc.id)) {
        mergedAccounts.push({
          ...inAcc,
          householdId: targetHId,
          householdName: targetHName,
        });
        existingAccIds.add(inAcc.id);
        accountsAdded++;
      }
    }

    const existingInstIds = new Set(currentDb.installments.map((i) => i.id));
    const mergedInstallments: InstallmentPlan[] = [...currentDb.installments];
    let installmentsAdded = 0;

    for (const inInst of incomingInstallments) {
      if (!existingInstIds.has(inInst.id)) {
        mergedInstallments.push({
          ...inInst,
          householdId: targetHId,
          householdName: targetHName,
        });
        existingInstIds.add(inInst.id);
        installmentsAdded++;
      }
    }

    const existingExpIds = new Set((currentDb.expenses || []).map((e) => e.id));
    const mergedExpenses: ExpenseItem[] = [...(currentDb.expenses || [])];
    let expensesAdded = 0;

    for (const inExp of incomingExpenses) {
      if (!existingExpIds.has(inExp.id)) {
        mergedExpenses.push({
          ...inExp,
          householdId: targetHId,
          householdName: targetHName,
        });
        existingExpIds.add(inExp.id);
        expensesAdded++;
      }
    }

    const existingSiIds = new Set((currentDb.standingInstructions || []).map((s) => s.id));
    const deletedSiIds = new Set(currentDb.deletedStandingInstructionIds || []);
    const mergedStandingInstructions: StandingInstruction[] = [...(currentDb.standingInstructions || [])];
    let siAdded = 0;

    for (const inSi of incomingStandingInstructions) {
      if (!existingSiIds.has(inSi.id) && !deletedSiIds.has(inSi.id)) {
        mergedStandingInstructions.push(inSi);
        existingSiIds.add(inSi.id);
        siAdded++;
      }
    }

    const existingTplIds = new Set((currentDb.quickPayTemplates || []).map((t) => t.id));
    const mergedTemplates: QuickPayTemplate[] = [...(currentDb.quickPayTemplates || [])];
    let tplAdded = 0;

    for (const inTpl of incomingQuickPayTemplates) {
      if (!existingTplIds.has(inTpl.id)) {
        mergedTemplates.push(inTpl);
        existingTplIds.add(inTpl.id);
        tplAdded++;
      }
    }

    const existingUbIds = new Set((currentDb.utilityBills || []).map((u) => u.id));
    const mergedUtilityBills: UtilityBillItem[] = [...(currentDb.utilityBills || [])];
    let ubAdded = 0;

    for (const inUb of incomingUtilityBills) {
      if (!existingUbIds.has(inUb.id)) {
        mergedUtilityBills.push(inUb);
        existingUbIds.add(inUb.id);
        ubAdded++;
      }
    }

    const updatedDb: UserDedicatedDatabase = {
      ...currentDb,
      householdId: targetHId,
      householdName: targetHName,
      version: (currentDb.version || 1) + 1,
      lastUpdated: new Date().toISOString(),
      accounts: mergedAccounts,
      installments: mergedInstallments,
      expenses: mergedExpenses,
      standingInstructions: mergedStandingInstructions,
      quickPayTemplates: mergedTemplates,
      utilityBills: mergedUtilityBills,
      settings: incomingSettings ? { ...currentDb.settings, ...incomingSettings } : currentDb.settings,
    };

    this.saveUserDatabase(updatedDb);

    return {
      updatedDb,
      accountsRestored: accountsAdded,
      installmentsRestored: installmentsAdded,
      expensesRestored: expensesAdded,
      standingInstructionsRestored: siAdded,
      quickPayTemplatesRestored: tplAdded,
      utilityBillsRestored: ubAdded,
      mode: 'merge',
      originFormat: format,
    };
  }

  /**
   * Audit accounts and detect any foreign or cross-household data
   */
  static auditHouseholdAccounts(
    db: UserDedicatedDatabase,
    currentUser: UserProfile
  ): {
    foreignAccounts: BillAccount[];
    foreignInstallments: InstallmentPlan[];
    foreignExpenses: ExpenseItem[];
    isContaminated: boolean;
  } {
    const currentHId = currentUser.householdId || this.normalizeHouseholdId(currentUser.householdName);
    const currentHName = (currentUser.householdName || '').trim().toLowerCase();

    // Household members
    const householdMembers = this.getHouseholdMembers(currentUser);
    const memberRoles = new Set(householdMembers.map((m) => m.familyRole));
    const memberNames = new Set(householdMembers.map((m) => m.name.toLowerCase()));

    const foreignAccounts = db.accounts.filter((acc) => {
      // Direct household mismatch
      if (acc.householdId && acc.householdId !== currentHId) return true;
      if (acc.householdName && acc.householdName.trim().toLowerCase() !== currentHName) return true;
      
      // Check if account was synced from an external user who is not a member of current household
      if (acc.id.startsWith('sync-') && acc.ownerName) {
        const lowerOwner = acc.ownerName.toLowerCase();
        const matchesAnyMember = Array.from(memberNames).some((n) => lowerOwner.includes(n));
        if (!matchesAnyMember && !memberRoles.has(acc.ownerRole as any)) {
          return true;
        }
      }
      return false;
    });

    const foreignAccountIds = new Set(foreignAccounts.map((a) => a.id));

    const foreignInstallments = db.installments.filter((inst) => {
      if (foreignAccountIds.has(inst.accountId)) return true;
      if (inst.householdId && inst.householdId !== currentHId) return true;
      if (inst.householdName && inst.householdName.trim().toLowerCase() !== currentHName) return true;
      return false;
    });

    const foreignExpenses = (db.expenses || []).filter((exp) => {
      if (foreignAccountIds.has(exp.accountId)) return true;
      if (exp.householdId && exp.householdId !== currentHId) return true;
      if (exp.householdName && exp.householdName.trim().toLowerCase() !== currentHName) return true;
      return false;
    });

    return {
      foreignAccounts,
      foreignInstallments,
      foreignExpenses,
      isContaminated: foreignAccounts.length > 0 || foreignInstallments.length > 0 || foreignExpenses.length > 0,
    };
  }

  /**
   * Purge foreign accounts and their linked items from the database
   */
  static purgeForeignAccounts(
    db: UserDedicatedDatabase,
    accountIdsToPurge: string[]
  ): UserDedicatedDatabase {
    const purgeSet = new Set(accountIdsToPurge);

    const updatedDb: UserDedicatedDatabase = {
      ...db,
      lastUpdated: new Date().toISOString(),
      version: db.version + 1,
      accounts: db.accounts.filter((a) => !purgeSet.has(a.id)),
      installments: db.installments.filter((i) => !purgeSet.has(i.accountId) && !purgeSet.has(i.id)),
      expenses: (db.expenses || []).filter((e) => !purgeSet.has(e.accountId) && !purgeSet.has(e.id)),
    };

    this.saveUserDatabase(updatedDb);
    return updatedDb;
  }

  /**
   * Reassign all accounts in database to belong cleanly to current user and household
   */
  static reassignAllAccountsToCurrentHousehold(
    db: UserDedicatedDatabase,
    currentUser: UserProfile
  ): UserDedicatedDatabase {
    const currentHId = currentUser.householdId || this.normalizeHouseholdId(currentUser.householdName);
    const currentHName = currentUser.householdName;

    const updatedDb: UserDedicatedDatabase = {
      ...db,
      householdId: currentHId,
      householdName: currentHName,
      lastUpdated: new Date().toISOString(),
      version: db.version + 1,
      accounts: db.accounts.map((a) => ({
        ...a,
        householdId: currentHId,
        householdName: currentHName,
      })),
      installments: db.installments.map((i) => ({
        ...i,
        householdId: currentHId,
        householdName: currentHName,
      })),
      expenses: (db.expenses || []).map((e) => ({
        ...e,
        householdId: currentHId,
        householdName: currentHName,
      })),
    };

    this.saveUserDatabase(updatedDb);
    return updatedDb;
  }

  /**
   * Save or update a Quick Pay Template in the user's dedicated database
   */
  static saveQuickPayTemplate(
    target: string | UserDedicatedDatabase,
    template: QuickPayTemplate
  ): QuickPayTemplate[] {
    const db: UserDedicatedDatabase = typeof target === 'string' 
      ? this.loadUserDatabase(target) 
      : target;
    const existing = Array.isArray(db.quickPayTemplates) ? db.quickPayTemplates : [];
    const index = existing.findIndex((t) => t.id === template.id);

    let updatedTemplates: QuickPayTemplate[];
    let savedTemplate: QuickPayTemplate;

    if (index >= 0) {
      savedTemplate = { ...existing[index], ...template };
      updatedTemplates = [...existing];
      updatedTemplates[index] = savedTemplate;
    } else {
      savedTemplate = {
        ...template,
        id: template.id || `qpt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: template.createdAt || new Date().toISOString(),
        usageCount: template.usageCount || 0,
      };
      updatedTemplates = [savedTemplate, ...existing];
    }

    const updatedDb: UserDedicatedDatabase = {
      ...db,
      quickPayTemplates: updatedTemplates,
      lastUpdated: new Date().toISOString(),
      version: (db.version || 1) + 1,
    };

    this.saveUserDatabase(updatedDb);
    return updatedTemplates;
  }

  /**
   * Delete a Quick Pay Template
   */
  static deleteQuickPayTemplate(
    target: string | UserDedicatedDatabase,
    templateId: string
  ): QuickPayTemplate[] {
    const db: UserDedicatedDatabase = typeof target === 'string' 
      ? this.loadUserDatabase(target) 
      : target;
    const existing = Array.isArray(db.quickPayTemplates) ? db.quickPayTemplates : [];
    const filtered = existing.filter((t) => t.id !== templateId);

    const updatedDb: UserDedicatedDatabase = {
      ...db,
      quickPayTemplates: filtered,
      lastUpdated: new Date().toISOString(),
      version: (db.version || 1) + 1,
    };

    this.saveUserDatabase(updatedDb);
    return filtered;
  }

  /**
   * Record usage of a Quick Pay Template (increments usage count and sets lastUsedAt)
   */
  static recordQuickPayUsage(
    target: string | UserDedicatedDatabase,
    templateId: string
  ): QuickPayTemplate[] {
    const db: UserDedicatedDatabase = typeof target === 'string' 
      ? this.loadUserDatabase(target) 
      : target;
    const existing = Array.isArray(db.quickPayTemplates) ? db.quickPayTemplates : [];
    const updated = existing.map((t) => {
      if (t.id === templateId) {
        return {
          ...t,
          usageCount: (t.usageCount || 0) + 1,
          lastUsedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    const updatedDb: UserDedicatedDatabase = {
      ...db,
      quickPayTemplates: updated,
      lastUpdated: new Date().toISOString(),
      version: (db.version || 1) + 1,
    };

    this.saveUserDatabase(updatedDb);
    return updated;
  }
}
