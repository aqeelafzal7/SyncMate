import React from 'react';
import { 
  Users, 
  ClipboardList, 
  Receipt, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles,
  Zap
} from 'lucide-react';
import { ActiveTab, UserProfile } from '../types';
import { AdminUsersView } from './AdminUsersView';
import { AdminSubscriptionQueue } from './AdminSubscriptionQueue';
import { PkrInvoiceCalculator } from './PkrInvoiceCalculator';

interface AdminLayoutProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userProfile: UserProfile | null;
  onRefreshStats?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onSelectTab,
  userProfile,
  onRefreshStats
}) => {
  // Normalize current sub-tab
  const currentAdminTab = 
    activeTab === 'admin_requests' || activeTab === 'admin_queue'
      ? 'admin_requests'
      : activeTab === 'admin_vouchers'
      ? 'admin_vouchers'
      : 'admin_users';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Specialized Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between shrink-0 shadow-2xl">
        <div className="space-y-6">
          {/* Prominent Back to App / Dashboard Exit Button */}
          <button
            onClick={() => onSelectTab('dashboard')}
            className="w-full py-3 px-4 rounded-2xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 font-extrabold text-xs flex items-center justify-center space-x-2 transition-all shadow-md group"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400 group-hover:-translate-x-1 transition-transform" />
            <span>← Back to App / Dashboard</span>
          </button>

          {/* Admin Header Title */}
          <div className="px-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center space-x-2 text-indigo-400">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <h1 className="text-sm font-black uppercase tracking-wider text-white">
                Admin Console
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              Restricted: {userProfile?.email || 'chaqeelpak@gmail.com'}
            </p>
          </div>

          {/* Admin Navigation Links */}
          <nav className="space-y-1.5 pt-2">
            <button
              onClick={() => onSelectTab('admin_users')}
              className={`w-full p-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 ${
                currentAdminTab === 'admin_users'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>👥 1. All Users</span>
            </button>

            <button
              onClick={() => onSelectTab('admin_requests')}
              className={`w-full p-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 ${
                currentAdminTab === 'admin_requests'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>📋 2. Plan Requests</span>
            </button>

            <button
              onClick={() => onSelectTab('admin_vouchers')}
              className={`w-full p-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 ${
                currentAdminTab === 'admin_vouchers'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span>🧾 3. Vouchers & Receipts</span>
            </button>
          </nav>
        </div>

        {/* Footer Admin Status */}
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 space-y-1">
          <div className="flex items-center space-x-1 text-emerald-400 font-bold">
            <Zap className="w-3 h-3" />
            <span>Admin Active Session</span>
          </div>
          <p className="font-mono">SyncMate v2.5 Admin Engine</p>
        </div>
      </aside>

      {/* Admin Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
        {currentAdminTab === 'admin_users' && (
          <div className="animate-fadeIn">
            <AdminUsersView onRefreshStats={onRefreshStats} />
          </div>
        )}

        {currentAdminTab === 'admin_requests' && (
          <div className="animate-fadeIn">
            <AdminSubscriptionQueue onRefreshStats={onRefreshStats} />
          </div>
        )}

        {currentAdminTab === 'admin_vouchers' && (
          <div className="animate-fadeIn">
            <PkrInvoiceCalculator />
          </div>
        )}
      </main>
    </div>
  );
};
