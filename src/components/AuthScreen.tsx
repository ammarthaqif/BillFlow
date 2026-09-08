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
  Info
} from 'lucide-react';
import { UserProfile, FamilyRole } from '../types';
import { UserDatabaseService } from '../services/userDatabaseService';

interface AuthScreenProps {
  onAuthenticated: (user: UserProfile) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [familyRole, setFamilyRole] = useState<FamilyRole>('husband');
  const [householdName, setHouseholdName] = useState('My Household');
  const [starterData, setStarterData] = useState<'standard' | 'wife_starter' | 'blank'>('standard');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sign in by email
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const users = UserDatabaseService.getRegisteredUsers();
      const existing = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (existing) {
        UserDatabaseService.setActiveUser(existing.id);
        onAuthenticated(existing);
      } else {
        setError(`No account found for ${email}. Please register your free account below.`);
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
        familyRole,
        householdName: householdName.trim() || 'My Household',
        initialDataTemplate: starterData,
      });
      onAuthenticated(user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => { setIsRegistering(true); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isRegistering 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register Free Account
            </button>
            <button
              type="button"
              onClick={() => { setIsRegistering(false); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !isRegistering 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In to Existing DB
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRegistering ? (
            /* Registration Form */
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
                      value={name ?? ''}
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
                      value={familyRole ?? 'husband'}
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
                      value={email ?? ''}
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
                    value={householdName ?? ''}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="e.g. Thaqif Household"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Security Passphrase
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={passphrase ?? ''}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Create a personal access passphrase"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Starter Data Preset (Within Free 3-Account Limit)
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
                <span>Create Free Account & Open Dedicated DB</span>
              </button>
            </form>
          ) : (
            /* Sign In Form */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email ?? ''}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@domain.com"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Security Passphrase
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={passphrase ?? ''}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter passphrase"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Signing in loads your personal database partition from local storage or cloud server.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                <span>Sign In to My Dedicated Database</span>
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

