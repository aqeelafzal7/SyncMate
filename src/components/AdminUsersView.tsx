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
  Award
} from 'lucide-react';
import { UserProfile } from '../types';
import { getAllUsersFromFirestore } from '../lib/firebase';
import { checkIsBirthday } from '../lib/birthdayUtils';
import { UserInspectorModal } from './UserInspectorModal';

interface AdminUsersViewProps {
  onRefreshStats?: () => void;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ onRefreshStats }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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
  const totalCreditsGranted = users.reduce((acc, u) => acc + (u.dailyCredits || 6), 0);

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center space-x-4 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Registered Users</span>
            <span className="text-2xl font-black text-white">{totalUsersCount}</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center space-x-4 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pro / Subscribed Members</span>
            <span className="text-2xl font-black text-white">{premiumCount}</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center space-x-4 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Daily Credits Pool</span>
            <span className="text-2xl font-black text-white">{totalCreditsGranted.toLocaleString()}</span>
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
