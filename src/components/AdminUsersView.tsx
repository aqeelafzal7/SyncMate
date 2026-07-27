import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Eye, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  Crown, 
  Key, 
  PartyPopper, 
  Sparkles,
  Award,
  Activity
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';
import { db, getAllUsersFromFirestore } from '../lib/firebase';
import { checkIsBirthday } from '../lib/birthdayUtils';
import { UserInspectorModal } from './UserInspectorModal';

interface AdminUsersViewProps {
  onRefreshStats?: () => void;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ onRefreshStats }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Real-time analytics state
  const [analyticsData, setAnalyticsData] = useState<{
    totalCreditsConsumed: number;
    totalApiCallsToday: number;
  }>({ totalCreditsConsumed: 0, totalApiCallsToday: 0 });

  // Selected user for Inspector Modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllUsersFromFirestore();
      setUsers(allUsers);
    } catch (err) {
      console.error('Failed to fetch users for admin view:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Real-time listener for system_analytics/${todayDate}
  useEffect(() => {
    const todayDate = new Date().toISOString().split('T')[0];
    const analyticsDocRef = doc(db, 'system_analytics', todayDate);
    const unsubscribe = onSnapshot(
      analyticsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setAnalyticsData({
            totalCreditsConsumed: data.totalCreditsConsumed || 0,
            totalApiCallsToday: data.totalApiCallsToday || 0,
          });
        } else {
          setAnalyticsData({ totalCreditsConsumed: 0, totalApiCallsToday: 0 });
        }
      },
      (err) => {
        console.warn('Real-time listener on system_analytics error:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleInspect = (user: UserProfile) => {
    setSelectedUser(user);
    setIsInspectorOpen(true);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.uid && u.uid.toLowerCase().includes(q))
    );
  });

  const totalUsersCount = users.length;
  const premiumCount = users.filter(u => u.tier === 'premium' || u.tier === 'spark' || u.tier === 'extra_premium').length;
  const totalAllocatedPool = users.reduce((acc, u) => acc + (u.dailyCredits || 6), 0);
  const creditsConsumedToday = analyticsData.totalCreditsConsumed || 0;
  const totalApiCallsToday = analyticsData.totalApiCallsToday || 0;
  const usagePercentage = totalAllocatedPool > 0
    ? Math.min(100, Math.round((creditsConsumedToday / totalAllocatedPool) * 100))
    : 0;

  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'premium':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 inline-flex items-center space-x-1">
            <Crown className="w-3 h-3 text-purple-400" />
            <span>Premium</span>
          </span>
        );
      case 'spark':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center space-x-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Spark</span>
          </span>
        );
      case 'extra_premium':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 inline-flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Extra Premium</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            Free
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: User Directory */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">User Directory</span>
              <span className="text-2xl font-black text-white">{totalUsersCount} Users</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 inline-flex items-center space-x-1 shrink-0">
            <Crown className="w-3 h-3 text-purple-400" />
            <span>{premiumCount} Subscribed</span>
          </span>
        </div>

        {/* Card 2: Daily Credit Consumption */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg flex flex-col justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Daily Credit Consumption</span>
              <span className="text-xl font-black text-white">{creditsConsumedToday} / {totalAllocatedPool} Used</span>
            </div>
          </div>
          <div className="space-y-1 pt-1">
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
              <div 
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-full transition-all duration-500 rounded-full" 
                style={{ width: `${usagePercentage}%` }} 
              />
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 block text-right">
              {usagePercentage}% Pool Consumed
            </span>
          </div>
        </div>

        {/* Card 3: Real-Time API Health */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg flex flex-col justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Real-Time API Health</span>
              <span className="text-xl font-black text-white">{totalApiCallsToday} System API Requests</span>
            </div>
          </div>
          <div className="pt-1">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center space-x-1">
              <span>🟢 System Key Active (Cloudflare Env)</span>
            </span>
          </div>
        </div>
      </div>

      {/* User Search & Refresh Bar */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by Gmail, Name, or UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <button
            onClick={fetchUsers}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center space-x-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh User Directory</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-black text-slate-400">
              <tr>
                <th className="py-3.5 px-4">User Identity</th>
                <th className="py-3.5 px-4">Plan Tier</th>
                <th className="py-3.5 px-4">Daily Credits</th>
                <th className="py-3.5 px-4">BYOK Key Access</th>
                <th className="py-3.5 px-4">Date of Birth</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading registered users from Firestore...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No matching users found in directory.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isBirthday = checkIsBirthday(u.dateOfBirth || u.dob);
                  return (
                    <tr key={u.uid} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs uppercase">
                            {u.name ? u.name.charAt(0) : 'U'}
                          </div>
                          <div>
                            <span className="block font-bold text-white text-xs">
                              {u.name || 'SyncMate User'}
                            </span>
                            <span className="block text-[11px] text-slate-400 font-mono">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getTierBadge(u.tier)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {u.dailyCredits ?? 6} Credits
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          u.byokUnlocked
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}>
                          {u.byokUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span>{u.dateOfBirth || u.dob || 'Not set'}</span>
                          {isBirthday && (
                            <PartyPopper className="w-3.5 h-3.5 text-pink-400 animate-bounce" title="Birthday Today!" />
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleInspect(u)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition-all shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>👁️ Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Inspector Modal */}
      <UserInspectorModal
        user={selectedUser}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onUserSaved={(updated) => {
          fetchUsers();
          if (onRefreshStats) onRefreshStats();
        }}
      />
    </div>
  );
};
