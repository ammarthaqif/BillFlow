import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Database, 
  KeyRound, 
  Mail, 
  User, 
  Heart, 
  CheckCircle2,
  Sparkles, 
  Zap, 
  Info,
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  Layers,
  Trash2,
  Lock
} from 'lucide-react';
import { UserProfile, FamilyRole } from '../types';
import { UserDatabaseService } from '../services/userDatabaseService';

interface AuthScreenProps {
  onAuthenticated: (user: UserProfile) => void;
}

type AuthViewMode = 'register' | 'signin' | 'forgot_passphrase' | 'reset_database';

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [viewMode, setViewMode] = useState<AuthViewMode>('signin');
  
  // Registration fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [familyRole, setFamilyRole] = useState<FamilyRole>('husband');
  const [householdName, setHouseholdName] = useState('My Household');
  const [starterData, setStarterData] = useState<'standard' | 'wife_starter' | 'blank'>('standard');

  // Password reset fields
  const [resetEmail, setResetEmail] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmNewPassphrase, setConfirmNewPassphrase] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Database reset fields from auth screen
  const [dbResetEmail, setDbResetEmail] = useState('');
  const [dbResetPassphrase, setDbResetPassphrase] = useState('');
  const [dbResetTemplate, setDbResetTemplate] = useState<'standard' | 'wife_starter' | 'blank' | 'factory'>('standard');
  const [dbResetConfirmWord, setDbResetConfirmWord] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sign in by email & passphrase
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const result = UserDatabaseService.verifyCredentials(email, passphrase);
      if (result.valid && result.user) {
        UserDatabaseService.setActiveUser(result.user.id);
        onAuthenticated(result.user);
      } else {
        setError(result.error || `No account found for ${email}. Please check your credentials or register below.`);
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Register new user with dedicated database & Free Tier limits
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please provide your name and email address to create your account.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const { user } = UserDatabaseService.registerUser({
        name: name.trim(),
        email: email.trim(),
        passphrase: passphrase.trim() || undefined,
        familyRole,
        householdName: householdName.trim() || 'My Household',
        initialDataTemplate: starterData,
      });
      UserDatabaseService.setActiveUser(user.id);
      onAuthenticated(user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset forgotten password
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    if (!newPassphrase.trim() || newPassphrase.trim().length < 3) {
      setError('New passphrase must be at least 3 characters long.');
      return;
    }
    if (newPassphrase !== confirmNewPassphrase) {
      setError('New passphrase and confirmation do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedUser = UserDatabaseService.resetUserPassphrase(resetEmail, newPassphrase);
      setResetSuccessMessage(`Passphrase updated successfully for ${updatedUser.name}! Logging you in...`);
      setTimeout(() => {
        UserDatabaseService.setActiveUser(updatedUser.id);
        onAuthenticated(updatedUser);
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to reset passphrase. Please ensure the email is registered.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset database from login screen
  const handleResetDatabaseFromAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (dbResetTemplate === 'factory') {
      if (dbResetConfirmWord.trim().toUpperCase() !== 'RESET') {
        setError('Please type RESET to confirm factory reset.');
        return;
      }
      setIsLoading(true);
      UserDatabaseService.factoryResetAllData();
      setError(null);
      setResetSuccessMessage('Factory reset complete. Returning to registration...');
      setTimeout(() => {
        window.location.reload();
      }, 800);
      return;
    }

    if (!dbResetEmail.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    if (dbResetConfirmWord.trim().toUpperCase() !== 'RESET') {
      setError('Please type RESET in the confirmation box.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const users = UserDatabaseService.getRegisteredUsers();
      const existing = users.find((u) => u.email.toLowerCase() === dbResetEmail.trim().toLowerCase());
      if (!existing) {
        throw new Error(`No account found for ${dbResetEmail}.`);
      }

      // If user has passphrase, verify
      if (existing.passphrase && existing.passphrase !== dbResetPassphrase.trim()) {
        throw new Error('Incorrect security passphrase for this account.');
      }

      const freshDb = UserDatabaseService.resetUserDatabase(
        existing.id,
        dbResetTemplate === 'wife_starter' ? 'wife_starter' : dbResetTemplate === 'blank' ? 'blank' : 'standard'
      );

      setResetSuccessMessage(`Database partition reset successfully for ${existing.name}! Loading fresh session...`);
      setTimeout(() => {
        UserDatabaseService.setActiveUser(existing.id);
        onAuthenticated(existing);
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to reset database.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background ambient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dedicated Multi-User Financial Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Database className="w-5 h-5" />
            </div>
            BillFlow
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Sequencing engine for bills, loans, BNPL, credit cards, and scheduled standing instructions with dedicated per-user storage.
          </p>
        </div>

        {/* Free Plan Limits Showcase Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] tracking-wide uppercase flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                Free Account Tier
              </div>
              <span className="text-xs font-bold text-white">Included Quotas & Capabilities</span>
            </div>
            <span className="text-[11px] text-slate-400">No credit card required</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs font-extrabold text-indigo-400">3 Accounts</div>
              <div className="text-[10px] text-slate-400">Cards & Loans</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs font-extrabold text-emerald-400">3 Instructions</div>
              <div className="text-[10px] text-slate-400">Scheduled / Month</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs font-extrabold text-amber-400">3 AI Advice</div>
              <div className="text-[10px] text-slate-400">Consultations / mo</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs font-extrabold text-rose-400">5 Scans</div>
              <div className="text-[10px] text-slate-400">Receipt Extractions</div>
            </div>
          </div>
        </div>

        {/* Main Auth Form Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
          {/* Tabs - only visible in signin or register */}
          {(viewMode === 'signin' || viewMode === 'register') && (
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => { setViewMode('signin'); setError(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'signin' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In to Existing DB
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('register'); setError(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'register' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Register Free Account
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resetSuccessMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* VIEW 1: SIGN IN */}
          {viewMode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@domain.com"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Security Passphrase
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setError(null);
                      setResetSuccessMessage(null);
                      setViewMode('forgot_passphrase');
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
                  >
                    Forgot Passphrase?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter passphrase"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Signing in loads your isolated personal database partition from local storage.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                <span>{isLoading ? 'Signing In...' : 'Sign In to My Dedicated Database'}</span>
              </button>

              <div className="pt-2 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setDbResetEmail(email);
                    setError(null);
                    setResetSuccessMessage(null);
                    setViewMode('reset_database');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Need a fresh restart? Reset database partition</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW 2: REGISTER */}
          {viewMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ammar Thaqif"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Family Role
                  </label>
                  <div className="relative">
                    <Heart className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <select
                      value={familyRole}
                      onChange={(e) => setFamilyRole(e.target.value as FamilyRole)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                      <option value="husband">Husband</option>
                      <option value="wife">Wife</option>
                      <option value="partner">Partner</option>
                      <option value="parent">Parent</option>
                      <option value="member">Family Member</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. yourname@domain.com"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Household Name
                  </label>
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="e.g. Thaqif Household"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Security Passphrase (For Account Access & Reset)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Create a secure personal passphrase"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Starter Data Preset
                </label>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setStarterData('standard')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      starterData === 'standard'
                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold">Cards & Loans</div>
                    <div className="text-[10px] text-slate-500">3 pre-seeded items</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStarterData('wife_starter')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      starterData === 'wife_starter'
                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold">E-Wallets & BNPL</div>
                    <div className="text-[10px] text-slate-500">SPayLater & Grab</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStarterData('blank')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      starterData === 'blank'
                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold">Blank Slate</div>
                    <div className="text-[10px] text-slate-500">Zero entries</div>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  A dedicated, isolated database partition (<code className="text-indigo-300 font-mono text-[10px]">db_[name]</code>) will be created with Free Tier quotas applied.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                <span>{isLoading ? 'Creating Account...' : 'Create Free Account & Open Dedicated DB'}</span>
              </button>
            </form>
          )}

          {/* VIEW 3: FORGOT / RESET PASSPHRASE */}
          {viewMode === 'forgot_passphrase' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setViewMode('signin');
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-400" />
                    <span>Reset Security Passphrase</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Verify your registered email and choose a new passphrase for your account.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Your Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter registered email"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  New Security Passphrase
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={newPassphrase}
                    onChange={(e) => setNewPassphrase(e.target.value)}
                    placeholder="Enter new passphrase (min. 3 characters)"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm New Passphrase
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={confirmNewPassphrase}
                    onChange={(e) => setConfirmNewPassphrase(e.target.value)}
                    placeholder="Re-enter new passphrase"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isLoading ? 'Updating Passphrase...' : 'Update Passphrase & Sign In'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setViewMode('signin');
                }}
                className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer text-center"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* VIEW 4: RESET DATABASE FOR FRESH RESTART */}
          {viewMode === 'reset_database' && (
            <form onSubmit={handleResetDatabaseFromAuth} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setViewMode('signin');
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    <span>Reset Database for Fresh Restart</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Wipe current financial records and re-initialize with fresh defaults.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Your Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={dbResetEmail}
                    onChange={(e) => setDbResetEmail(e.target.value)}
                    placeholder="Enter registered email"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Security Passphrase (If set)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={dbResetPassphrase}
                    onChange={(e) => setDbResetPassphrase(e.target.value)}
                    placeholder="Enter passphrase to authorize reset"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Restart Preset
                </label>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDbResetTemplate('standard')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      dbResetTemplate === 'standard'
                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Starter Cards & Bills</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">3 fresh accounts & templates</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDbResetTemplate('blank')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      dbResetTemplate === 'blank'
                        ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Blank Canvas</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Zero accounts / clean start</div>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Type <span className="font-mono text-rose-400 bg-rose-950/60 px-1 py-0.5 rounded border border-rose-900">RESET</span> to confirm:
                </label>
                <input
                  type="text"
                  value={dbResetConfirmWord}
                  onChange={(e) => setDbResetConfirmWord(e.target.value)}
                  placeholder="RESET"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors font-mono uppercase tracking-wider"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || dbResetConfirmWord.trim().toUpperCase() !== 'RESET'}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Resetting Database...' : 'Confirm & Open Fresh Database'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setViewMode('signin');
                }}
                className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer text-center"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>

        {/* Security & author footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 px-2 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automatic per-user database isolation & local sync</span>
          </div>
          <div>
            Developed by <span className="text-slate-400 font-medium">Ammar Thaqif</span>
          </div>
        </div>
      </div>
    </div>
  );
}
