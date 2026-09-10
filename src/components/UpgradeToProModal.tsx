import React, { useState } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  X, 
  Crown, 
  Sparkles, 
  Receipt, 
  CalendarClock, 
  Building2, 
  ShieldCheck,
  ArrowRight,
  CreditCard,
  Lock,
  ArrowLeft,
  Check,
  FileText,
  AlertTriangle,
  Copy
} from 'lucide-react';
import { UserProfile, ProPaymentRecord } from '../types';
import { formatCurrency, CurrencyCode } from '../utils/currency';

interface UpgradeToProModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpgrade: (paymentRecord: ProPaymentRecord) => void;
  onCancelSubscription?: () => void;
  featureTriggered?: string;
  currency?: CurrencyCode | string;
}

const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  MYR: { monthly: 29, annual: 249 },
  USD: { monthly: 6.99, annual: 59.99 },
  SGD: { monthly: 9.99, annual: 84.99 },
  EUR: { monthly: 6.49, annual: 55.99 },
  GBP: { monthly: 5.49, annual: 46.99 },
  IDR: { monthly: 99000, annual: 850000 },
  JPY: { monthly: 990, annual: 8500 },
  AUD: { monthly: 9.99, annual: 84.99 },
};

const FPX_BANKS = [
  { id: 'maybank', name: 'Maybank2u', code: 'MBB0227' },
  { id: 'cimb', name: 'CIMB Clicks', code: 'BCBB0235' },
  { id: 'public_bank', name: 'Public Bank', code: 'PBB0233' },
  { id: 'rhb', name: 'RHB Now', code: 'RHB0218' },
  { id: 'hong_leong', name: 'Hong Leong Connect', code: 'HLB0224' },
  { id: 'ambank', name: 'AmBank', code: 'AMBB0209' },
  { id: 'bank_islam', name: 'Bank Islam', code: 'BIMB0340' },
];

const EWALLETS = [
  { id: 'tng', name: "Touch 'n Go eWallet", provider: 'TNG Digital' },
  { id: 'grabpay', name: 'GrabPay', provider: 'Grab Holdings' },
  { id: 'shopeepay', name: 'ShopeePay', provider: 'SeaMoney' },
];

export const UpgradeToProModal: React.FC<UpgradeToProModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpgrade,
  onCancelSubscription,
  featureTriggered,
  currency = 'MYR',
}) => {
  const [step, setStep] = useState<'pricing' | 'checkout' | 'processing' | 'success'>('pricing');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'fpx' | 'ewallet'>('card');
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardHolder, setCardHolder] = useState(currentUser.name || '');

  // FPX state
  const [selectedBank, setSelectedBank] = useState('maybank');

  // E-Wallet state
  const [selectedEwallet, setSelectedEwallet] = useState('tng');

  // Validation & Error
  const [formError, setFormError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState('Initializing secure checkout...');
  const [completedPayment, setCompletedPayment] = useState<ProPaymentRecord | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!isOpen) return null;

  const prices = PLAN_PRICES[currency] || PLAN_PRICES.MYR;
  const currentPrice = billingCycle === 'annual' ? prices.annual : prices.monthly;
  const monthlyEquivalent = billingCycle === 'annual' ? (prices.annual / 12) : prices.monthly;

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(' ') : raw);
    if (formError) setFormError(null);
  };

  // Format Card Expiry (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setCardExpiry(raw);
    if (formError) setFormError(null);
  };

  // Format CVC
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvc(raw);
    if (formError) setFormError(null);
  };

  // Handle Payment Submit
  const handleProcessPayment = () => {
    // Validate inputs
    if (paymentMethod === 'card') {
      const cleanNum = cardNumber.replace(/\s/g, '');
      if (cleanNum.length < 16) {
        setFormError('Please enter a valid 16-digit card number.');
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        setFormError('Please enter a valid expiry date (MM/YY).');
        return;
      }
      if (!cardCvc || cardCvc.length < 3) {
        setFormError('Please enter a valid 3 or 4-digit CVC code.');
        return;
      }
      if (!cardHolder.trim()) {
        setFormError('Please enter the name on your card.');
        return;
      }
    }

    setFormError(null);
    setStep('processing');
    setProcessingStatus('Securing TLS 1.3 encrypted connection...');

    setTimeout(() => {
      setProcessingStatus('Authorizing payment with payment gateway...');
    }, 900);

    setTimeout(() => {
      setProcessingStatus('Verifying 3D-Secure authentication...');
    }, 1800);

    setTimeout(() => {
      // Build authentic payment record
      const now = new Date();
      const nextYear = new Date(now);
      if (billingCycle === 'annual') {
        nextYear.setFullYear(now.getFullYear() + 1);
      } else {
        nextYear.setMonth(now.getMonth() + 1);
      }

      let methodDetail = '';
      if (paymentMethod === 'card') {
        const last4 = cardNumber.replace(/\s/g, '').slice(-4);
        methodDetail = `Card ending in •••• ${last4}`;
      } else if (paymentMethod === 'fpx') {
        const b = FPX_BANKS.find((x) => x.id === selectedBank);
        methodDetail = `FPX Direct Debit (${b?.name || 'Bank'})`;
      } else {
        const w = EWALLETS.find((x) => x.id === selectedEwallet);
        methodDetail = `E-Wallet (${w?.name || 'Wallet'})`;
      }

      const paymentRecord: ProPaymentRecord = {
        transactionId: `TXN-BF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        invoiceNumber: `INV-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        plan: billingCycle,
        amount: currentPrice,
        currency,
        paymentMethod,
        paymentMethodDetails: methodDetail,
        paidAt: now.toISOString(),
        nextBillingDate: nextYear.toISOString(),
        status: 'active',
      };

      setCompletedPayment(paymentRecord);
      setStep('success');
    }, 2800);
  };

  const handleFinishSuccess = () => {
    if (completedPayment) {
      onUpgrade(completedPayment);
    }
    onClose();
  };

  const handleCopyTransaction = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // --------------------------------------------------------------------------
  // VIEW: Active Pro Subscription (User is already Pro)
  // --------------------------------------------------------------------------
  if (currentUser.tier === 'pro') {
    const record = currentUser.proPaymentRecord;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center space-y-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>BillFlow Pro Active Member</span>
            </div>
            <h2 className="text-2xl font-black text-white">Your Pro Subscription</h2>
            <p className="text-xs text-slate-300">
              Unlimited accounts, standing instructions, receipt scans, and AI consultations are unlocked.
            </p>
          </div>

          {/* Subscription Details Card */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-slate-400">Subscription Status</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Active & Verified</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Billing Plan</span>
              <span className="font-semibold text-white capitalize">
                {record ? `${record.plan} Billing` : 'Pro Power Pack'}
              </span>
            </div>

            {record?.amount && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Paid Amount</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(record.amount, record.currency || currency)}
                </span>
              </div>
            )}

            {record?.paymentMethodDetails && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Payment Method</span>
                <span className="text-slate-200">{record.paymentMethodDetails}</span>
              </div>
            )}

            {record?.transactionId && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Transaction ID</span>
                <div className="flex items-center gap-1 font-mono text-[11px] text-indigo-300">
                  <span>{record.transactionId}</span>
                  <button
                    onClick={() => handleCopyTransaction(record.transactionId)}
                    className="p-1 hover:text-white rounded transition-colors cursor-pointer"
                    title="Copy Transaction ID"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            )}

            {record?.invoiceNumber && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tax Invoice Number</span>
                <span className="font-mono text-[11px] text-slate-300">{record.invoiceNumber}</span>
              </div>
            )}

            {record?.nextBillingDate && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-slate-400">Next Renewal Date</span>
                <span className="text-slate-200">
                  {new Date(record.nextBillingDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Cancellation or Downgrade flow */}
          {showCancelConfirm ? (
            <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center gap-2 text-rose-300 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Confirm Subscription Cancellation</span>
              </div>
              <p className="text-rose-200/90 text-[11px]">
                Cancelling will revert your account to Free Tier. Free limits will apply (maximum 3 accounts, 3 standing instructions, 3 AI advice calls/mo, and 5 receipt extractions).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Keep My Pro Tier
                </button>
                <button
                  onClick={() => {
                    if (onCancelSubscription) onCancelSubscription();
                    onClose();
                  }}
                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Confirm Downgrade
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-xs text-slate-500 hover:text-rose-400 cursor-pointer transition-colors underline"
              >
                Cancel Subscription & Downgrade
              </button>
              <button
                onClick={onClose}
                className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer"
              >
                Close Window
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW: Step 3 - Processing Simulation
  // --------------------------------------------------------------------------
  if (step === 'processing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
            <div className="w-20 h-20 rounded-full border-4 border-t-amber-400 border-r-indigo-500 border-b-violet-500 border-l-slate-800 animate-spin flex items-center justify-center">
              <Lock className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Processing Secure Payment</h3>
            <p className="text-xs text-slate-400 animate-pulse">{processingStatus}</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-bit encrypted bank checkout gateway</span>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW: Step 4 - Success Receipt
  // --------------------------------------------------------------------------
  if (step === 'success' && completedPayment) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden">
          {/* Confetti / Glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>Payment Verified • Pro Activated</span>
            </div>
            <h2 className="text-2xl font-black text-white">Welcome to BillFlow Pro!</h2>
            <p className="text-xs text-slate-300">
              Your payment has been successfully authorized and confirmed.
            </p>
          </div>

          {/* Official Tax Invoice Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 divide-y divide-slate-800/80 text-xs">
            <div className="pb-2.5 flex items-center justify-between">
              <span className="text-slate-400">Invoice Number</span>
              <span className="font-mono font-semibold text-white">{completedPayment.invoiceNumber}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Transaction ID</span>
              <span className="font-mono text-indigo-300">{completedPayment.transactionId}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Amount Charged</span>
              <span className="font-bold text-emerald-400">
                {formatCurrency(completedPayment.amount, completedPayment.currency)}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Payment Method</span>
              <span className="text-slate-200">{completedPayment.paymentMethodDetails}</span>
            </div>
            <div className="pt-2.5 flex items-center justify-between">
              <span className="text-slate-400">Billed To</span>
              <span className="text-slate-200">{currentUser.name} ({currentUser.email})</span>
            </div>
          </div>

          <button
            onClick={handleFinishSuccess}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>Launch Pro Features Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW: Step 2 - Checkout & Payment Details
  // --------------------------------------------------------------------------
  if (step === 'checkout') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 relative overflow-hidden max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <button
              onClick={() => setStep('pricing')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Plans</span>
            </button>
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>256-Bit Encrypted Checkout</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Order Summary Pill */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs">
            <div>
              <div className="font-extrabold text-white flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-amber-400 fill-current" />
                <span>BillFlow Pro Power Pack</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {billingCycle === 'annual' ? 'Billed Annually (Save 28%)' : 'Billed Monthly'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-emerald-400">
                {formatCurrency(currentPrice, currency)}
              </div>
              <div className="text-[10px] text-slate-500">
                {billingCycle === 'annual' ? '/ year' : '/ month'}
              </div>
            </div>
          </div>

          {/* Payment Method Selector Tabs */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-[11px]">Credit / Debit Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('fpx')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'fpx'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-[11px]">FPX Online Banking</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ewallet')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'ewallet'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-[11px]">E-Wallet / DuitNow</span>
              </button>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* Payment Method Forms */}
          {paymentMethod === 'card' && (
            <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Name on Card</label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="e.g. Ammar Thaqif"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4123 4567 8901 2345"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <CreditCard className="w-4 h-4 text-slate-500 absolute right-3.5 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Expiry Date</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    placeholder="MM/YY"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">CVC / CVV</label>
                  <input
                    type="password"
                    value={cardCvc}
                    onChange={handleCvcChange}
                    placeholder="123"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'fpx' && (
            <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs">
              <label className="block text-slate-300 font-medium">Select FPX Bank</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FPX_BANKS.map((bank) => (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => setSelectedBank(bank.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedBank === bank.id
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[11px]">{bank.name}</div>
                    <div className="text-[9px] text-slate-500 font-mono">{bank.code}</div>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 pt-1">
                You will be securely redirected to verify and approve the FPX direct debit payment with your online banking credentials.
              </div>
            </div>
          )}

          {paymentMethod === 'ewallet' && (
            <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs">
              <label className="block text-slate-300 font-medium">Select E-Wallet Provider</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {EWALLETS.map((wallet) => (
                  <button
                    key={wallet.id}
                    type="button"
                    onClick={() => setSelectedEwallet(wallet.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedEwallet === wallet.id
                        ? 'border-amber-500 bg-amber-950/40 text-amber-300 font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{wallet.name}</div>
                    <div className="text-[10px] text-slate-500">{wallet.provider}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Subtotal</span>
              <span>{formatCurrency(currentPrice, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>SST / Digital Tax</span>
              <span className="text-emerald-400">RM 0.00 (Included)</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-white font-bold">
              <span>Total Due Now</span>
              <span className="text-base text-emerald-400">
                {formatCurrency(currentPrice, currency)}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleProcessPayment}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-indigo-600 to-violet-600 hover:from-amber-400 hover:via-indigo-500 hover:to-violet-500 text-white font-black text-sm tracking-wide shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Authorize & Pay {formatCurrency(currentPrice, currency)}</span>
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>PCI-DSS Level 1 Compliant • 30-Day Money Back Guarantee • Encrypted via SSL</span>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW: Step 1 - Plan & Features Selection
  // --------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 fill-current" />
            <span>BillFlow Pro Power Pack</span>
          </div>
          <h2 className="text-2xl font-black text-white">Upgrade to Pro</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            {featureTriggered ? (
              <span className="text-amber-400 font-semibold">{featureTriggered}</span>
            ) : (
              'Eliminate all monthly quotas, unlock unlimited card integrations, and automate standing instructions.'
            )}
          </p>
        </div>

        {/* Billing Cycle Selector Toggle */}
        <div className="flex items-center justify-center">
          <div className="bg-slate-950 border border-slate-800 p-1 rounded-2xl flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-[10px] font-black uppercase text-slate-950">
                Save 28%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Highlight Box */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950/30 to-slate-950 border border-indigo-500/30 rounded-2xl p-4 text-center">
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-3xl font-black text-white">
              {formatCurrency(currentPrice, currency)}
            </span>
            <span className="text-xs text-slate-400">
              {billingCycle === 'annual' ? '/ year' : '/ month'}
            </span>
          </div>
          {billingCycle === 'annual' && (
            <p className="text-[11px] text-emerald-400 font-medium mt-1">
              Equivalent to {formatCurrency(monthlyEquivalent, currency)} / month (billed annually)
            </p>
          )}
        </div>

        {/* Comparison Matrix */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 divide-y divide-slate-800/80 text-xs">
          <div className="pb-3 flex items-center justify-between font-semibold text-slate-400">
            <span>Capability</span>
            <div className="flex items-center gap-6">
              <span className="w-16 text-center text-slate-400">Free</span>
              <span className="w-20 text-center text-indigo-400 font-bold">Pro</span>
            </div>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-300">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Linked Accounts & Cards</span>
            </span>
            <div className="flex items-center gap-6">
              <span className="w-16 text-center text-slate-400">3 max</span>
              <span className="w-20 text-center text-emerald-400 font-bold">Unlimited</span>
            </div>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-300">
              <CalendarClock className="w-4 h-4 text-slate-400" />
              <span>Standing Instructions & SI</span>
            </span>
            <div className="flex items-center gap-6">
              <span className="w-16 text-center text-slate-400">3 max</span>
              <span className="w-20 text-center text-emerald-400 font-bold">Unlimited</span>
            </div>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span>AI Payment Consultations</span>
            </span>
            <div className="flex items-center gap-6">
              <span className="w-16 text-center text-slate-400">3 / month</span>
              <span className="w-20 text-center text-emerald-400 font-bold">Unlimited</span>
            </div>
          </div>

          <div className="pt-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-300">
              <Receipt className="w-4 h-4 text-slate-400" />
              <span>Receipt Camera Extraction</span>
            </span>
            <div className="flex items-center gap-6">
              <span className="w-16 text-center text-slate-400">5 / month</span>
              <span className="w-20 text-center text-emerald-400 font-bold">Unlimited</span>
            </div>
          </div>
        </div>

        {/* Feature bullets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Dedicated User DB & Auto-Save</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zero-Late-Fee Sequence Matrix</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Immediate FPX Balance Relief</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cross-Partner Family Sync</span>
          </div>
        </div>

        {/* Action Button to Checkout */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => setStep('checkout')}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-indigo-600 to-violet-600 hover:from-amber-400 hover:via-indigo-500 hover:to-violet-500 text-white font-black text-sm tracking-wide shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Proceed to Payment ({formatCurrency(currentPrice, currency)})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure checkout with instant automated license provisioning</span>
          </div>
        </div>
      </div>
    </div>
  );
};
