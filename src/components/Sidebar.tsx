import React from 'react';
import { 
  LayoutDashboard, 
  Shirt, 
  Sparkles, 
  Target, 
  CheckCircle2, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Bot, 
  Compass,
  UserCheck
} from 'lucide-react';
import { ActiveTab, UserProfile } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userProfile: UserProfile | null;
  onSignOut: () => void;
  onOpenOnboarding: () => void;
  onToggleAssistant: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userProfile,
  onSignOut,
  onOpenOnboarding,
  onToggleAssistant,
  isCollapsed,
  onToggleCollapse,
}) => {
  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'today_wear' as ActiveTab, label: 'Today Wear', icon: Shirt, badge: 'AI' },
    { id: 'my_look' as ActiveTab, label: 'My Look', icon: Sparkles },
    { id: 'projects' as ActiveTab, label: 'Projects', icon: Target },
    { id: 'habits' as ActiveTab, label: 'Habits', icon: CheckCircle2 },
    { id: 'settings' as ActiveTab, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800 text-white z-40 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header - Master Brand Anchor */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            {!isCollapsed && (
              <div className="animate-fadeIn">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-lg tracking-tight text-white">
                    Sync<span className="text-indigo-400">Mate</span>
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase rounded-full bg-indigo-950/80 text-indigo-400 border border-indigo-800">
                    AI
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  Autonomous Secretary
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* AI Secretary Trigger */}
        <div className="p-3">
          <button
            onClick={onToggleAssistant}
            className={`w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-indigo-600/90 to-purple-600/90 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center transition-all ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Bot className="w-4 h-4 animate-pulse shrink-0 text-indigo-200" />
              {!isCollapsed && <span>AI Secretary</span>}
            </div>
            {!isCollapsed && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center transition-all rounded-2xl px-3.5 py-3 text-xs font-bold ${
                  isCollapsed ? 'justify-center' : 'justify-between'
                } ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title={item.label}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          {!isCollapsed && userProfile && (
            <div className="mb-3 p-2.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
              <div className="truncate">
                <span className="block text-xs font-bold text-white truncate">
                  {userProfile.name}
                </span>
                <span className="block text-[10px] text-indigo-400 font-medium truncate">
                  {userProfile.occupation}
                </span>
              </div>
              <button
                onClick={onOpenOnboarding}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition-colors"
                title="Edit Secretary Profile"
              >
                <UserCheck className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={onSignOut}
            className={`w-full py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-red-950/80 hover:text-red-300 text-slate-400 text-xs font-bold transition-all flex items-center ${
              isCollapsed ? 'justify-center' : 'space-x-2'
            }`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Floating Bottom Navbar */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50 bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-2 shadow-2xl flex items-center justify-around text-white">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all ${
                isActive ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
