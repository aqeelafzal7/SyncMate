import React, { useState } from 'react';
import { 
  Zap, 
  Gem, 
  Crown, 
  Check, 
  Sparkles, 
  Phone, 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  Key, 
  Clock, 
  HelpCircle,
  MessageSquare,
  Gift,
  ArrowRight,
  AlertCircle,
  Users,
  Copy
} from 'lucide-react';
import { UserProfile, SubscriptionTier } from '../types';
import { addSubscriptionRequestToFirestore } from '../lib/firebase';
import { getUserReferralStats } from '../lib/referralService';

interface BuySubscriptionViewProps {
  userProfile: UserProfile | null;
  onGoToSettings?: () => void;
}

export const BuySubscriptionView: React.FC<BuySubscriptionViewProps> = ({
  userProfile,
  onGoToSettings
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'spark' | 'premium' | 'extra_premium'>('premium');
  const [whatsappNumber, setWhatsappNumber] = useState<string>(userProfile?.whatsappNumber || '');
  const [customRequirements, setCustomRequirements] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const referralStats = getUserReferralStats(userProfile);

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralStats.referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = referralStats.referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const plans = [
    {
      id: 'spark' as const,
      name: 'Spark Plan',
      price: '₨ 399',
      period: '/ month',
      badge: 'Popular for BYOK',
      icon: Zap,
      gradient: 'from-amber-500 to-orange-600',
      border: 'border-amber-500/40 hover:border-amber-400',
      glow: 'shadow-amber-500/10',
      badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      features: [
        'Unlock Personal Gemini API Key (BYOK)',
        'Unlimited Chat via personal API Key',
        '10 Daily System AI Credits',
        '+10 Birthday Bonus Credits',
        'Standard Response Speed'
      ]
    },
    {
      id: 'premium' as const,
      name: 'Premium Member',
      price: '₨ 1,299',
      period: '/ month',
      badge: 'Most Popular',
      popular: true,
      icon: Gem,
      gradient: 'from-indigo-500 via-purple-500 to-pink-500',
      border: 'border-purple-500/60 hover:border-purple-400',
      glow: 'shadow-purple-500/20',
      badgeStyle: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 border-purple-400/50',
      features: [
        'High-Priority System AI (Gemini 2.5 Flash)',
        '150 Daily System AI Credits',
        '250 Chat Messages / day',
        'BYOK Unlocked (Unlimited with Key)',
        '+25 Birthday Bonus Credits',
        'Nano Banana Visualizer 4K Support'
      ]
    },
    {
      id: 'extra_premium' as const,
      name: 'Extra Premium / Custom',
      price: 'Custom',
      period: 'tailored pricing',
      badge: 'Enterprise & Teams',
      icon: Crown,
      gradient: 'from-cyan-500 to-emerald-500',
      border: 'border-cyan-500/40 hover:border-cyan-400',
      glow: 'shadow-cyan-500/10',
      badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      features: [
        'Custom Credits & Feature Overrides',
        'Dedicated 24/7 Priority Support',
        'Custom Agent Persona Tuning',
        'WhatsApp Direct Concierge Service',
        'Tailored Team Multi-User Quotas'
      ]
    }
  ];

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    const trimmedWhatsapp = whatsappNumber.trim();
    if (!trimmedWhatsapp) {
      setSubmitError('Please enter a valid WhatsApp number so our team can reach out to you.');
      return;
    }

    if (selectedPlan === 'extra_premium' && !customRequirements.trim()) {
      setSubmitError('Please briefly specify your custom AI & credit requirements.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await addSubscriptionRequestToFirestore({
        userId: userProfile.uid,
        userGmail: userProfile.email || 'user@syncmate.ai',
        planRequested: selectedPlan,
        customRequirements: selectedPlan === 'extra_premium' ? customRequirements.trim() : undefined,
        whatsappNumber: trimmedWhatsapp,
        status: 'pending'
      });

      setIsSubmittedSuccess(true);
    } catch (err: any) {
      console.error('Failed to submit subscription request:', err);
      setSubmitError('Failed to submit request. Please check your network or try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTier = userProfile?.tier || 'free';

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-fadeIn">
      {/* Top Header & Current Tier Status */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Background Decorative Glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-bold shadow-sm">
              <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>SyncMate Membership & Credits</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Upgrade Your Executive AI Intelligence
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
              Unlock high-capacity daily credits, BYOK (Bring Your Own Key) unlimited access, and high-priority AI model throughput.
            </p>
          </div>

          {/* Current Tier Badge Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md flex items-center space-x-4 shrink-0 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Current Plan
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-white capitalize">
                  {currentTier === 'free' ? 'Free Tier' : `${currentTier} Plan`}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                  {currentTier === 'free' ? '6 Credits/Day' : `${userProfile?.dailyCredits || 0} Credits/Day`}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {userProfile?.byokUnlocked ? '🔑 BYOK Unlocked' : '🔒 BYOK Locked'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selectedPlan === plan.id;

          return (
            <div
              key={plan.id}
              onClick={() => {
                setSelectedPlan(plan.id);
                setIsSubmittedSuccess(false);
              }}
              className={`relative rounded-3xl p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between border-2 ${
                isSelected
                  ? `${plan.border} bg-slate-900 shadow-2xl ${plan.glow} scale-[1.02]`
                  : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              {/* Popular Ribbon Header */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black tracking-wider uppercase shadow-md flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>{plan.badge}</span>
                </div>
              )}

              <div>
                {/* Plan Card Top Bar */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${plan.gradient} flex items-center justify-center text-white shadow-md`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {!plan.popular && (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${plan.badgeStyle}`}>
                      {plan.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mb-1">
                  {plan.name}
                </h3>

                <div className="flex items-baseline space-x-1 mb-6">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {plan.period}
                  </span>
                </div>

                {/* Features List */}
                <div className="space-y-2.5 pt-4 border-t border-slate-800/80 mb-6">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Select Radio / Button */}
              <button
                type="button"
                className={`w-full py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center space-x-2 ${
                  isSelected
                    ? `bg-gradient-to-r ${plan.gradient} text-white shadow-lg`
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Plan Selected</span>
                  </>
                ) : (
                  <>
                    <span>Select {plan.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Subscription Request Form or Success Confirmation Card */}
      {isSubmittedSuccess ? (
        <div className="rounded-3xl p-8 bg-slate-900 border border-emerald-500/40 shadow-2xl text-center space-y-6 max-w-2xl mx-auto animate-scaleUp">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">
              🎉 Request Received!
            </h2>
            <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              Thank you for choosing the <strong className="text-indigo-400 capitalize">{selectedPlan.replace('_', ' ')}</strong> plan.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2 text-xs text-slate-300 max-w-md mx-auto">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold border-b border-slate-800 pb-2">
              <Phone className="w-4 h-4 shrink-0" />
              <span>WhatsApp Contact Initiated</span>
            </div>
            <p>
              Our Admin team will manually contact you on WhatsApp (<strong className="text-white">{whatsappNumber}</strong>) shortly to finalize payment details and dispatch your activation receipt.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsSubmittedSuccess(false)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl p-6 sm:p-8 bg-slate-900 border border-slate-800 shadow-2xl space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                Finalize Your Subscription Request
              </h2>
              <p className="text-xs text-slate-400">
                Provide your WhatsApp contact. Our admin team will reach out directly to set up your account.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-5">
            {submitError && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Selected Plan Summary Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Requested Plan:</span>
              <span className="font-bold text-indigo-400 uppercase tracking-wide bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                {selectedPlan.replace('_', ' ')}
              </span>
            </div>

            {/* WhatsApp Number Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                WhatsApp Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="+92 300 1234567"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-medium placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Required for direct admin contact, invoice generation, and manual tier activation.
              </p>
            </div>

            {/* Custom Requirements Textarea (For Extra Premium / Custom) */}
            {selectedPlan === 'extra_premium' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="block text-xs font-bold text-slate-300">
                  Custom AI & Credit Requirements <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write your custom AI & credit requirements..."
                  value={customRequirements}
                  onChange={(e) => setCustomRequirements(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-medium placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-xl shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-white" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span>Submit Subscription Request</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* 🎁 Referral & Reward System Card */}
      <div className="bg-gradient-to-br from-purple-950/70 via-indigo-950/80 to-slate-900 border border-purple-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl mb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Gift className="w-32 h-32 text-purple-400" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-bold">
              <Gift className="w-3.5 h-3.5 text-pink-400" />
              <span>Referral Rewards Engine</span>
            </div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span>🎁 Invite Friends, Earn Credits</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Share your personal invite link with friends, family, or colleagues. Every time a friend signs up using your link, both of you instantly receive <strong className="text-amber-300 font-bold">+10 Bonus Daily Credits!</strong>
            </p>
          </div>

          {/* Stats Counters */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-900/80 border border-purple-500/20 px-4 py-3 rounded-2xl text-center min-w-[100px]">
              <span className="block text-xl font-black text-purple-300">{referralStats.totalReferrals}</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Referrals</span>
            </div>
            <div className="bg-slate-900/80 border border-amber-500/20 px-4 py-3 rounded-2xl text-center min-w-[100px]">
              <span className="block text-xl font-black text-amber-300">+{referralStats.earnedCredits} ⚡</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Credits Earned</span>
            </div>
          </div>
        </div>

        {/* Copy Link Input Bar */}
        <div className="mt-5 pt-4 border-t border-purple-500/20 flex flex-col sm:flex-row items-center gap-2.5 relative z-10">
          <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-mono text-purple-200 truncate select-all flex items-center justify-between">
            <span className="truncate">{referralStats.referralLink}</span>
          </div>
          <button
            onClick={handleCopyReferral}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center space-x-2 transition-all shrink-0 active:scale-95"
          >
            {copiedLink ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Copied! 🎉</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-purple-200" />
                <span>📋 Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Information Grid / FAQ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/60">
        <div className="bg-slate-900/90 dark:bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-2 mb-4">
          <div className="text-indigo-400 font-bold text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm shadow-indigo-500/20">
              <Key className="w-4 h-4" />
            </div>
            <span>BYOK Direct Access</span>
          </div>
          <p className="text-slate-300 dark:text-slate-300 text-sm leading-relaxed font-normal">
            Spark and Premium members unlock Bring Your Own Key mode for personal Gemini API keys without token throttling.
          </p>
        </div>

        <div className="bg-slate-900/90 dark:bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-2 mb-4">
          <div className="text-purple-400 font-bold text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 shadow-sm shadow-purple-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <span>Daily Reset Schedule</span>
          </div>
          <p className="text-slate-300 dark:text-slate-300 text-sm leading-relaxed font-normal">
            Daily system credits automatically reset every 24 hours at midnight to keep your lifestyle context engine fresh.
          </p>
        </div>

        <div className="bg-slate-900/90 dark:bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-2 mb-4">
          <div className="text-cyan-400 font-bold text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm shadow-cyan-500/20">
              <Gift className="w-4 h-4" />
            </div>
            <span>Birthday Bonuses</span>
          </div>
          <p className="text-slate-300 dark:text-slate-300 text-sm leading-relaxed font-normal">
            Enjoy automatic credit multiplier boosts on your birthday along with interactive balloon overlays!
          </p>
        </div>
      </div>
    </div>
  );
};
