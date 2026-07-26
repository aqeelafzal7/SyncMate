import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Phone, 
  Sparkles, 
  Search, 
  Filter, 
  ExternalLink, 
  Zap, 
  Gem, 
  Crown, 
  AlertCircle,
  Calendar,
  Check,
  X,
  UserCheck,
  Eye,
  User,
  Calculator
} from 'lucide-react';
import { SubscriptionRequest, SubscriptionTier, UserProfile } from '../types';
import { 
  getSubscriptionRequestsFromFirestore, 
  updateSubscriptionRequestStatus, 
  activateUserSubscriptionInFirestore,
  getUserProfile
} from '../lib/firebase';
import { calculateExpirationDate, getTierDefaultCredits } from '../lib/subscriptionService';
import { UserInspectorModal } from './UserInspectorModal';
import { PkrInvoiceCalculator } from './PkrInvoiceCalculator';

interface AdminSubscriptionQueueProps {
  onRefreshStats?: () => void;
}

export const AdminSubscriptionQueue: React.FC<AdminSubscriptionQueueProps> = ({ onRefreshStats }) => {
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'pending_contacted' | 'all' | 'pending' | 'contacted' | 'approved' | 'rejected'>('pending_contacted');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Activate Modal state
  const [selectedReqForModal, setSelectedReqForModal] = useState<SubscriptionRequest | null>(null);
  const [modalPlan, setModalPlan] = useState<'spark' | 'premium' | 'extra_premium'>('premium');
  const [modalDurationMonths, setModalDurationMonths] = useState<number>(1);
  const [modalCustomCredits, setModalCustomCredits] = useState<number>(500);
  const [isActivating, setIsActivating] = useState<boolean>(false);

  // User Inspector Modal state
  const [inspectedUser, setInspectedUser] = useState<UserProfile | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  const handleInspectUser = async (req: SubscriptionRequest) => {
    try {
      const userProf = await getUserProfile(req.userId);
      if (userProf) {
        setInspectedUser(userProf);
      } else {
        setInspectedUser({
          uid: req.userId,
          email: req.userGmail,
          name: req.userGmail ? req.userGmail.split('@')[0] : 'User',
          whatsappNumber: req.whatsappNumber,
          tier: req.planRequested === 'spark' || req.planRequested === 'premium' || req.planRequested === 'extra_premium' ? req.planRequested : 'free',
          dailyCredits: 6,
          byokUnlocked: false,
          createdAt: req.createdAt
        });
      }
      setIsInspectorOpen(true);
    } catch (err) {
      console.error('Failed to fetch user for inspection:', err);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getSubscriptionRequestsFromFirestore();
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch subscription requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // WhatsApp Contact Action
  const handleContactWhatsApp = async (req: SubscriptionRequest) => {
    const cleanNumber = req.whatsappNumber.replace(/[^0-9]/g, '');
    const message = `Hi! This is SyncMate Admin regarding your request for the ${req.planRequested} plan. How can I assist you with payment?`;
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    // Open WhatsApp in new tab
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Automatically update status to 'contacted'
    try {
      await updateSubscriptionRequestStatus(req.id, 'contacted', req.userId);
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'contacted' } : r));
      triggerToast(`Request from ${req.userGmail} marked as Contacted.`);
    } catch (err) {
      console.error('Error updating status to contacted:', err);
    }
  };

  // Open Activate Modal
  const handleOpenActivateModal = (req: SubscriptionRequest) => {
    setSelectedReqForModal(req);
    const initialPlan = (req.planRequested === 'spark' || req.planRequested === 'premium' || req.planRequested === 'extra_premium')
      ? req.planRequested
      : 'premium';
    setModalPlan(initialPlan);
    setModalDurationMonths(1);
    setModalCustomCredits(500);
  };

  // Submit Activation
  const handleConfirmActivation = async () => {
    if (!selectedReqForModal) return;

    setIsActivating(true);
    try {
      const { endDate } = await activateUserSubscriptionInFirestore(
        selectedReqForModal.userId,
        modalPlan,
        modalDurationMonths,
        modalPlan === 'extra_premium' ? modalCustomCredits : undefined
      );

      // Update request status to 'approved'
      await updateSubscriptionRequestStatus(selectedReqForModal.id, 'approved', selectedReqForModal.userId);

      setRequests(prev => prev.map(r => r.id === selectedReqForModal.id ? { ...r, status: 'approved' } : r));

      const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      triggerToast(`Subscription activated! Expiration set to ${formattedEndDate}`);
      setSelectedReqForModal(null);
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('Failed to activate subscription:', err);
      triggerToast('Error activating subscription. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    // Status filtering
    if (statusFilter === 'pending_contacted') {
      if (req.status !== 'pending' && req.status !== 'contacted') return false;
    } else if (statusFilter !== 'all') {
      if (req.status !== statusFilter) return false;
    }

    // Search term filtering
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchEmail = req.userGmail?.toLowerCase().includes(q);
      const matchPhone = req.whatsappNumber?.toLowerCase().includes(q);
      const matchPlan = req.planRequested?.toLowerCase().includes(q);
      const matchCustom = req.customRequirements?.toLowerCase().includes(q);
      if (!matchEmail && !matchPhone && !matchPlan && !matchCustom) return false;
    }

    return true;
  });

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'spark':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Spark Plan</span>
          </span>
        );
      case 'premium':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 border border-purple-400/50">
            <Gem className="w-3 h-3 text-purple-300" />
            <span>Premium</span>
          </span>
        );
      case 'extra_premium':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            <Crown className="w-3 h-3 text-cyan-400" />
            <span>Extra Premium</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700 uppercase">
            <span>{plan}</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 animate-pulse" />
            <span>Pending</span>
          </span>
        );
      case 'contacted':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <MessageSquare className="w-3 h-3" />
            <span>Contacted</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Activated</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-950 border border-emerald-500/50 text-emerald-200 text-xs font-bold shadow-2xl flex items-center space-x-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative rounded-3xl p-6 bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>SyncMate Concierge Operations</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Subscription Request Queue
          </h1>
          <p className="text-slate-400 text-xs">
            Review incoming upgrade requests, contact users directly on WhatsApp, and activate custom tiers.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shrink-0 self-start md:self-auto border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'pending_contacted', label: 'Pending & Contacted' },
            { id: 'all', label: 'All Requests' },
            { id: 'pending', label: 'Pending' },
            { id: 'contacted', label: 'Contacted' },
            { id: 'approved', label: 'Approved' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search Gmail or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Table View */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-extrabold">
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5">Gmail</th>
                <th className="py-4 px-5">Requested Plan</th>
                <th className="py-4 px-5">Custom Requirements</th>
                <th className="py-4 px-5">WhatsApp Number</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Sparkles className="w-6 h-6 text-indigo-400 animate-spin" />
                      <span>Loading subscription queue...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Clock className="w-8 h-8 text-slate-600" />
                      <span className="font-bold text-slate-400">No subscription requests found</span>
                      <span className="text-[11px] text-slate-600">Try adjusting your filters or search query</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Date */}
                    <td className="py-4 px-5 whitespace-nowrap text-slate-400 text-[11px]">
                      {new Date(req.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      <span className="block text-[10px] text-slate-600">
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Gmail */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="font-bold text-white">
                        {req.userGmail}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ID: {req.userId.substring(0, 8)}...
                      </span>
                    </td>

                    {/* Requested Plan */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      {getPlanBadge(req.planRequested)}
                    </td>

                    {/* Custom Requirements */}
                    <td className="py-4 px-5 max-w-xs truncate text-slate-300">
                      {req.customRequirements ? (
                        <span title={req.customRequirements} className="cursor-help underline decoration-slate-600 underline-offset-2">
                          {req.customRequirements}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* WhatsApp Number */}
                    <td className="py-4 px-5 whitespace-nowrap font-mono text-emerald-400 font-medium">
                      {req.whatsappNumber}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 whitespace-nowrap text-right space-x-2">
                      {/* 👁️ Eye Inspect Button */}
                      <button
                        onClick={() => handleInspectUser(req)}
                        title="Inspect User Telemetry & Overrides"
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition-all shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5 shrink-0" />
                        <span>👁️ Inspect</span>
                      </button>

                      {/* Direct WhatsApp Action Button */}
                      <button
                        onClick={() => handleContactWhatsApp(req)}
                        title="Contact on WhatsApp Web"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition-all shadow-sm"
                      >
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>💬 Contact on WhatsApp</span>
                      </button>

                      {/* Activate Subscription Button */}
                      <button
                        onClick={() => handleOpenActivateModal(req)}
                        title="Activate User Subscription"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all shadow-sm"
                      >
                        <UserCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>✅ Activate Subscription</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APPROVE & ACTIVATE MODAL */}
      {selectedReqForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-indigo-500/40 shadow-2xl p-6 space-y-6 animate-scaleUp relative">
            <button
              onClick={() => setSelectedReqForModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Activate Subscription
                </h3>
                <p className="text-xs text-slate-400">
                  User: <span className="text-indigo-300 font-bold">{selectedReqForModal.userGmail}</span>
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Plan Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Subscription Tier
                </label>
                <select
                  value={modalPlan}
                  onChange={(e) => setModalPlan(e.target.value as any)}
                  className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="spark">Spark Plan (BYOK + 10 Daily System Credits)</option>
                  <option value="premium">Premium Member (150 Daily System Credits)</option>
                  <option value="extra_premium">Extra Premium / Custom Tier</option>
                </select>
              </div>

              {/* Duration Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Duration
                </label>
                <select
                  value={modalDurationMonths}
                  onChange={(e) => setModalDurationMonths(Number(e.target.value))}
                  className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>1 Month (Ends at 23:59:59)</option>
                  <option value={3}>3 Months (Ends at 23:59:59)</option>
                  <option value={6}>6 Months (Ends at 23:59:59)</option>
                  <option value={12}>12 Months / 1 Year (Ends at 23:59:59)</option>
                </select>
              </div>

              {/* Custom Credits (Only for Extra Premium) */}
              {modalPlan === 'extra_premium' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-300">
                    Daily System Credits Amount
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={modalCustomCredits}
                    onChange={(e) => setModalCustomCredits(Number(e.target.value))}
                    className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Set total daily system AI credits assigned to this user.
                  </p>
                </div>
              )}

              {/* Expiration Calculation Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Calculated Expiration Timestamp
                </span>
                <p className="text-xs font-mono font-bold text-emerald-400">
                  {new Date(calculateExpirationDate(modalDurationMonths)).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReqForModal(null)}
                className="w-1/2 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isActivating}
                onClick={handleConfirmActivation}
                className="w-1/2 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 hover:opacity-90 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isActivating ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-white" />
                    <span>Activating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Confirm & Activate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* User Inspector Slide-Over Modal */}
      <UserInspectorModal
        user={inspectedUser}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onUserSaved={(updated) => {
          triggerToast(`Updated profile for ${updated.email || updated.name}`);
          if (onRefreshStats) onRefreshStats();
        }}
      />
    </div>
  );
};
