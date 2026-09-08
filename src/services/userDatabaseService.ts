import { 
  UserProfile, 
  UserDedicatedDatabase, 
  FamilySyncPackage, 
  BillAccount, 
  InstallmentPlan, 
  UserSettings, 
  FamilyRole,
  ExpenseItem,
  StandingInstruction 
} from '../types';
import { INITIAL_ACCOUNTS, INITIAL_INSTALLMENTS, INITIAL_SETTINGS, INITIAL_EXPENSES, INITIAL_STANDING_INSTRUCTIONS } from '../data/seedData';

const USERS_INDEX_KEY = 'billflow_registered_users';
const ACTIVE_USER_KEY = 'billflow_active_user_id';
const DB_PREFIX = 'billflow_user_db_';

export class UserDatabaseService {
  /**
   * Returns list of all registered users
   */
  static getRegisteredUsers(): UserProfile[] {
    try {
      const raw = localStorage.getItem(USERS_INDEX_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
      return [];
    } catch {
      return [];
    }
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
   * Upgrade user to Pro Tier (unlimited features)
   */
  static upgradeToPro(userId: string): UserProfile | null {
    const users = this.getRegisteredUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    user.tier = 'pro';
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
    familyRole: FamilyRole;
    householdName?: string;
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

    const newUser: UserProfile = {
      id: userId,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      familyRole: params.familyRole,
      householdName: params.householdName?.trim() || 'My Family',
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
      }));
      initialInstallments = INITIAL_INSTALLMENTS.slice(1, 3).map((i) => ({
        ...i,
        id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
      }));
      initialExpenses = INITIAL_EXPENSES.filter((e) => e.ownerRole !== 'husband').slice(0, 5).map((e) => ({
        ...e,
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
      }));
      initialStandingInstructions = INITIAL_STANDING_INSTRUCTIONS.slice(1, 3);
    } else if (params.initialDataTemplate !== 'blank') {
      // Free plan starter: 3 accounts (at limit), 2 installments, 5 expenses, 2 standing instructions
      initialAccounts = INITIAL_ACCOUNTS.slice(0, 3).map((a) => ({
        ...a,
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
      }));
      initialInstallments = INITIAL_INSTALLMENTS.slice(0, 2).map((i) => ({
        ...i,
        id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
      }));
      initialExpenses = INITIAL_EXPENSES.slice(0, 6).map((e) => ({
        ...e,
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
      }));
      initialStandingInstructions = INITIAL_STANDING_INSTRUCTIONS.slice(0, 2);
    }

    const newDb: UserDedicatedDatabase = {
      databaseId,
      userId,
      userEmail: newUser.email,
      lastUpdated: new Date().toISOString(),
      version: 1,
      accounts: initialAccounts,
      installments: initialInstallments,
      expenses: initialExpenses,
      standingInstructions: initialStandingInstructions,
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
        if (parsed && parsed.settings) {
          parsed.settings.currency = parsed.settings.currency || 'MYR';
        }
        // Migration: ensure accounts have valid defaults and expenses/standing instructions array are present
        if (!parsed.expenses || parsed.expenses.length === 0) {
          parsed.expenses = INITIAL_EXPENSES.slice(0, 6);
        }
        if (!parsed.standingInstructions) {
          parsed.standingInstructions = INITIAL_STANDING_INSTRUCTIONS.slice(0, 2);
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
      },
      data: {
        accounts: selectedAccounts,
        installments: selectedInstallments,
        expenses: selectedExpenses,
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
   */
  static importFamilyData(
    currentDb: UserDedicatedDatabase,
    syncPackage: FamilySyncPackage,
    options: {
      mode: 'merge' | 'replace';
      tagWithOwner: boolean;
      customOwnerTag?: string;
    }
  ): { updatedDb: UserDedicatedDatabase; accountsAdded: number; installmentsAdded: number; expensesAdded?: number } {
    if (syncPackage.format !== 'billflow-family-sync') {
      throw new Error('Invalid file format. Please upload a valid BillFlow Family Sync file.');
    }

    const partnerName = syncPackage.exportedBy.userName || 'Family Partner';
    const partnerRole = syncPackage.exportedBy.familyRole || 'partner';
    const ownerLabel = options.customOwnerTag || `${partnerName} (${partnerRole})`;

    if (options.mode === 'replace') {
      // Full replacement
      const updatedDb: UserDedicatedDatabase = {
        ...currentDb,
        lastUpdated: new Date().toISOString(),
        version: currentDb.version + 1,
        accounts: syncPackage.data.accounts.map((a) => ({
          ...a,
          ownerName: options.tagWithOwner ? a.ownerName || ownerLabel : a.ownerName,
        })),
        installments: syncPackage.data.installments.map((i) => ({
          ...i,
          ownerName: options.tagWithOwner ? i.ownerName || ownerLabel : i.ownerName,
        })),
        expenses: (syncPackage.data.expenses || []).map((e) => ({
          ...e,
          ownerName: options.tagWithOwner ? e.ownerName || ownerLabel : e.ownerName,
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
        });
      } else {
        newAccounts.push({
          ...incomingAcc,
          ownerName: options.tagWithOwner ? incomingAcc.ownerName || ownerLabel : incomingAcc.ownerName,
          ownerRole: partnerRole,
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
        });
      } else {
        newInstallments.push({
          ...incomingInst,
          ownerName: options.tagWithOwner ? incomingInst.ownerName || ownerLabel : incomingInst.ownerName,
          ownerRole: partnerRole,
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
        });
      } else {
        newExpenses.push({
          ...incomingExp,
          ownerName: options.tagWithOwner ? incomingExp.ownerName || ownerLabel : incomingExp.ownerName,
          ownerRole: partnerRole,
        });
      }
    }

    const updatedDb: UserDedicatedDatabase = {
      ...currentDb,
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
}
