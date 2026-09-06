import { 
  UserProfile, 
  UserDedicatedDatabase, 
  FamilySyncPackage, 
  BillAccount, 
  InstallmentPlan, 
  UserSettings, 
  FamilyRole 
} from '../types';
import { INITIAL_ACCOUNTS, INITIAL_INSTALLMENTS, INITIAL_SETTINGS } from '../data/seedData';

const USERS_INDEX_KEY = 'billflow_registered_users';
const ACTIVE_USER_KEY = 'billflow_active_user_id';
const DB_PREFIX = 'billflow_user_db_';

// Default pre-configured family profiles for husband & wife
export const PRESET_FAMILY_USERS: UserProfile[] = [
  {
    id: 'usr_ammar_01',
    name: 'Ammar Thaqif',
    email: 'ammarthaqif.ar@gmail.com',
    familyRole: 'husband',
    householdName: 'Thaqif Household',
    createdAt: '2026-09-01T08:00:00.000Z',
    databaseId: 'db_ammar_thaqif',
  },
  {
    id: 'usr_sarah_02',
    name: 'Sarah Thaqif',
    email: 'sarah.thaqif@gmail.com',
    familyRole: 'wife',
    householdName: 'Thaqif Household',
    createdAt: '2026-09-01T08:00:00.000Z',
    databaseId: 'db_sarah_thaqif',
  },
];

// Helper: Seed initial database for Husband
function getInitialHusbandDatabase(): UserDedicatedDatabase {
  return {
    databaseId: 'db_ammar_thaqif',
    userId: 'usr_ammar_01',
    userEmail: 'ammarthaqif.ar@gmail.com',
    lastUpdated: new Date().toISOString(),
    version: 1,
    accounts: INITIAL_ACCOUNTS.slice(0, 3).map((a) => ({
      ...a,
      ownerName: 'Ammar (Husband)',
      ownerRole: 'husband',
    })),
    installments: INITIAL_INSTALLMENTS.slice(0, 2).map((i) => ({
      ...i,
      ownerName: 'Ammar (Husband)',
      ownerRole: 'husband',
    })),
    settings: {
      ...INITIAL_SETTINGS,
      allocatedCashForBills: 3800,
    },
    paidScheduleIds: [],
    scheduledScheduleIds: [],
    alertThresholds: [7, 3, 1],
  };
}

// Helper: Seed initial database for Wife
function getInitialWifeDatabase(): UserDedicatedDatabase {
  return {
    databaseId: 'db_sarah_thaqif',
    userId: 'usr_sarah_02',
    userEmail: 'sarah.thaqif@gmail.com',
    lastUpdated: new Date().toISOString(),
    version: 1,
    accounts: INITIAL_ACCOUNTS.slice(2).map((a) => ({
      ...a,
      ownerName: 'Sarah (Wife)',
      ownerRole: 'wife',
    })),
    installments: INITIAL_INSTALLMENTS.slice(2).map((i) => ({
      ...i,
      ownerName: 'Sarah (Wife)',
      ownerRole: 'wife',
    })),
    settings: {
      ...INITIAL_SETTINGS,
      monthlyIncome: 5500,
      allocatedCashForBills: 2600,
    },
    paidScheduleIds: [],
    scheduledScheduleIds: [],
    alertThresholds: [5, 2, 1],
  };
}

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
      // Initialize with preset family profiles
      localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(PRESET_FAMILY_USERS));
      // Seed dedicated databases for both
      if (!localStorage.getItem(`${DB_PREFIX}usr_ammar_01`)) {
        localStorage.setItem(`${DB_PREFIX}usr_ammar_01`, JSON.stringify(getInitialHusbandDatabase()));
      }
      if (!localStorage.getItem(`${DB_PREFIX}usr_sarah_02`)) {
        localStorage.setItem(`${DB_PREFIX}usr_sarah_02`, JSON.stringify(getInitialWifeDatabase()));
      }
      return PRESET_FAMILY_USERS;
    } catch {
      return PRESET_FAMILY_USERS;
    }
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
    };

    // Construct dedicated database
    let initialAccounts: BillAccount[] = [];
    let initialInstallments: InstallmentPlan[] = [];

    if (params.initialDataTemplate === 'wife_starter') {
      initialAccounts = INITIAL_ACCOUNTS.slice(2).map((a) => ({
        ...a,
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
      }));
      initialInstallments = INITIAL_INSTALLMENTS.slice(2).map((i) => ({
        ...i,
        id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
      }));
    } else if (params.initialDataTemplate !== 'blank') {
      initialAccounts = INITIAL_ACCOUNTS.map((a) => ({
        ...a,
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
      }));
      initialInstallments = INITIAL_INSTALLMENTS.map((i) => ({
        ...i,
        id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: `${newUser.name} (${newUser.familyRole})`,
        ownerRole: newUser.familyRole,
      }));
    }

    const newDb: UserDedicatedDatabase = {
      databaseId,
      userId,
      userEmail: newUser.email,
      lastUpdated: new Date().toISOString(),
      version: 1,
      accounts: initialAccounts,
      installments: initialInstallments,
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
        const parsed = JSON.parse(raw);
        if (parsed && parsed.settings) {
          parsed.settings.currency = parsed.settings.currency || 'MYR';
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
      accounts: INITIAL_ACCOUNTS,
      installments: INITIAL_INSTALLMENTS,
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
    }
  ): FamilySyncPackage {
    const selectedAccounts = includeOptions.includeAccounts ? db.accounts : [];
    const selectedInstallments = includeOptions.includeInstallments ? db.installments : [];

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
        settings: includeOptions.includeSettings ? db.settings : undefined,
      },
      summary: {
        totalAccounts: selectedAccounts.length,
        totalInstallments: selectedInstallments.length,
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
  ): { updatedDb: UserDedicatedDatabase; accountsAdded: number; installmentsAdded: number } {
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
      };
      this.saveUserDatabase(updatedDb);
      return {
        updatedDb,
        accountsAdded: updatedDb.accounts.length,
        installmentsAdded: updatedDb.installments.length,
      };
    }

    // Merge mode: Add partner's accounts that aren't already duplicate
    const existingAccountIds = new Set(currentDb.accounts.map((a) => a.id));
    const newAccounts: BillAccount[] = [];

    for (const incomingAcc of syncPackage.data.accounts) {
      if (existingAccountIds.has(incomingAcc.id)) {
        // Create cloned ID with partner prefix to avoid collisions
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

    const updatedDb: UserDedicatedDatabase = {
      ...currentDb,
      lastUpdated: new Date().toISOString(),
      version: currentDb.version + 1,
      accounts: [...currentDb.accounts, ...newAccounts],
      installments: [...currentDb.installments, ...newInstallments],
    };

    this.saveUserDatabase(updatedDb);

    return {
      updatedDb,
      accountsAdded: newAccounts.length,
      installmentsAdded: newInstallments.length,
    };
  }
}
