import React from 'react';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Menu
} from 'lucide-react';
import { UserProfile, ThemeMode } from '../types';

interface NavbarProps {
  userProfile: UserProfile | null;
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onSignOut: () => void;
  onOpenOnboarding: () => void;
  onToggleAssistant: () => void;
  isAssistantOpen: boolean;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  onThemeChange,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Left Side: Mobile Hamburger Menu + Logo + Brand Name + Context Engine Indicator */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Open Mobile Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <img 
              src="https://i.ibb.co/PztwKQdM/Sync-Mate.png" 
              alt="SyncMate Logo" 
              className="w-8 h-8 object-contain rounded-lg shadow-sm" 
            />
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
              Sync<span className="text-indigo-600 dark:text-indigo-400">Mate</span>
            </span>
            <div 
              className="flex items-center space-x-1 pl-1 cursor-pointer" 
              title="Context Engine Active"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
            </div>
          </div>
        </div>

        {/* Right Side: Theme Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0">
            <button
              onClick={() => onThemeChange('light')}
              title="Light Theme"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'light'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => onThemeChange('dark')}
              title="Dark Theme"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-slate-700 text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onThemeChange('system')}
              title="System Theme"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'system'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
