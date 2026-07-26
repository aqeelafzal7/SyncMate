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
  UserCheck,
  X,
  Sun,
  Moon,
  MoonStar,
  Monitor,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { ActiveTab, UserProfile, ThemeMode } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userProfile: UserProfile | null;
  onSignOut: () => void;
  onOpenOnboarding: () => void;
  onToggleAssistant: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileSidebarOpen?: boolean;
  onCloseMobileSidebar?: () => void;
  hideBottomNav?: boolean;
  theme?: ThemeMode;
  onThemeChange?: (mode: ThemeMode) => void;
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
  isMobileSidebarOpen = false,
  onCloseMobileSidebar,
  hideBottomNav = false,
  theme = 'system',
  onThemeChange,
}) => {
  const isAdmin = userProfile?.email === 'chaqeelpak@gmail.com';

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'daily_strategy' as ActiveTab, label: 'Daily Strategy', icon: Target, badge: '4 AM' },
    { id: 'today_wear' as ActiveTab, label: 'Today Wear', icon: Shirt, badge: 'AI' },
    { id: 'my_look' as ActiveTab, label: 'My Look', icon: Sparkles },
    { id: 'projects' as ActiveTab, label: 'Projects', icon: UserCheck },
    { id: 'habits' as ActiveTab, label: 'Habits', icon: CheckCircle2 },
    { id: 'prayer_hadith' as ActiveTab, label: 'Prayer & Quran', icon: MoonStar, badge: 'Free' },
    { id: 'buy_subscription' as ActiveTab, label: '⭐ Buy Subscription', icon: Zap, badge: 'Pro', isGlowing: true },
    ...(isAdmin ? [{ id: 'admin_users' as ActiveTab, label: '🛡️ Admin Console', icon: ShieldCheck, badge: 'Admin' }] : []),
    { id: 'settings' as ActiveTab, label: 'Settings', icon: Settings },
  ];

  // Reserve bottom floating nav ONLY for core primary tabs (Dashboard, Today Wear, My Look, Habits)
  const primaryBottomNavItems = navItems.filter((item) => item.id !== 'projects' && item.id !== 'settings' && item.id !== 'daily_strategy' && item.id !== 'buy_subscription' && !item.id.startsWith('admin'));

  const handleSelectTab = (tab: ActiveTab) => {
    onSelectTab(tab);
    onCloseMobileSidebar?.();
  };

  return (
    <>
      {/* Dark Blurred Backdrop on Mobile */}
      {isMobileSidebarOpen && (
        <div
          onClick={onCloseMobileSidebar}
          className="md:hidden fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
        />
      )}

      {/* Off-Canvas Mobile Sidebar & Desktop Sidebar */}
      <aside
        className={`flex flex-col fixed inset-y-0 left-0 z-[100] bg-slate-900 border-r border-slate-800 text-white transform transition-transform duration-300 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${
          isCollapsed ? 'md:w-20' : 'w-64'
        }`}
      >
        {/* Brand Header - Master Brand Anchor */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center space-x-3 overflow-hidden">
            <img 
              src="https://i.ibb.co/PztwKQdM/Sync-Mate.png" 
              alt="SyncMate Logo" 
              className="w-10 h-10 object-contain rounded-xl shrink-0 shadow-md shadow-indigo-500/20" 
            />
            {(!isCollapsed || isMobileSidebarOpen) && (
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
                  Autonomous Assistant
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={onCloseMobileSidebar}
              className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="hidden md:block p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* AI Assistant Trigger */}
        <div className="p-3">
          <button
            onClick={() => {
              onToggleAssistant();
              onCloseMobileSidebar?.();
            }}
            className={`w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-indigo-600/90 to-purple-600/90 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center transition-all ${
              isCollapsed && !isMobileSidebarOpen ? 'justify-center' : 'justify-between'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Bot className="w-4 h-4 animate-pulse shrink-0 text-indigo-200" />
              {(!isCollapsed || isMobileSidebarOpen) && <span>AI Assistant</span>}
            </div>
            {(!isCollapsed || isMobileSidebarOpen) && (
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
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center transition-all rounded-2xl px-3.5 py-3 text-xs font-bold ${
                  isCollapsed && !isMobileSidebarOpen ? 'justify-center' : 'justify-between'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                    : item.isGlowing
                    ? 'bg-gradient-to-r from-indigo-950/60 to-purple-950/60 text-indigo-300 hover:text-white border border-indigo-500/30 shadow-sm hover:border-indigo-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title={item.label}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.isGlowing ? 'text-indigo-400 animate-pulse' : 'text-slate-400'}`} />
                  {(!isCollapsed || isMobileSidebarOpen) && <span>{item.label}</span>}
                </div>

                {(!isCollapsed || isMobileSidebarOpen) && item.badge && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border ${
                    item.badge === 'Pro'
                      ? 'bg-gradient-to-r from-indigo-500/40 to-purple-500/40 text-purple-200 border-purple-400/50 shadow-sm'
                      : 'bg-indigo-500/30 text-indigo-300 border-indigo-400/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Theme Mode Control Bar */}
        {onThemeChange && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/20">
            {(!isCollapsed || isMobileSidebarOpen) ? (
              <div>
                <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
                  THEME MODE
                </div>
                <div className="grid grid-cols-3 gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                  <button
                    onClick={() => onThemeChange('light')}
                    title="Light Theme"
                    className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      theme === 'light'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 shrink-0" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => onThemeChange('dark')}
                    title="Dark Theme"
                    className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      theme === 'dark'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 shrink-0" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => onThemeChange('system')}
                    title="System Theme"
                    className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      theme === 'system'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5 shrink-0" />
                    <span>System</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                <button
                  onClick={() => onThemeChange('light')}
                  title="Light Theme"
                  className={`p-1.5 rounded-lg text-xs transition-all ${
                    theme === 'light' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onThemeChange('dark')}
                  title="Dark Theme"
                  className={`p-1.5 rounded-lg text-xs transition-all ${
                    theme === 'dark' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onThemeChange('system')}
                  title="System Theme"
                  className={`p-1.5 rounded-lg text-xs transition-all ${
                    theme === 'system' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* User Profile & Sign Out Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          {(!isCollapsed || isMobileSidebarOpen) && userProfile && (
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
                onClick={() => {
                  onOpenOnboarding();
                  onCloseMobileSidebar?.();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition-colors"
                title="Edit Assistant Profile"
              >
                <UserCheck className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => {
              onSignOut();
              onCloseMobileSidebar?.();
            }}
            className={`w-full py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-red-950/80 hover:text-red-300 text-slate-400 text-xs font-bold transition-all flex items-center ${
              isCollapsed && !isMobileSidebarOpen ? 'justify-center' : 'space-x-2'
            }`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {(!isCollapsed || isMobileSidebarOpen) && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Floating Bottom Navbar */}
      <nav className={`md:hidden fixed bottom-3 left-3 right-3 z-[100] bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-2 shadow-2xl flex items-center justify-around text-white transition-all duration-500 ease-in-out ${
        (hideBottomNav || isMobileSidebarOpen) ? 'opacity-0 translate-y-12 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}>
        {primaryBottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
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
