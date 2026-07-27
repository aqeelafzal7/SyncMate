import React, { useState, useEffect, useCallback } from 'react';
import { 
  Menu,
  Key,
  Sparkles
} from 'lucide-react';
import { UserProfile, ThemeMode } from '../types';
import { ApiKeyModal } from './ApiKeyModal';
import { getDecryptedApiKey } from '../lib/cryptoStorage';

interface NavbarProps {
  userProfile: UserProfile | null;
  theme?: ThemeMode;
  onThemeChange?: (mode: ThemeMode) => void;
  onSignOut: () => void;
  onOpenOnboarding: () => void;
  onToggleAssistant: () => void;
  isAssistantOpen: boolean;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userProfile,
  onToggleMobileSidebar,
}) => {
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const isEligibleForApiKey = userProfile && (userProfile.tier !== 'free' || userProfile.email === 'chaqeelpak@gmail.com');

  const checkKeyStatus = useCallback(() => {
    getDecryptedApiKey().then((key) => {
      setHasApiKey(!!key);
    });
  }, []);

  useEffect(() => {
    checkKeyStatus();
  }, [checkKeyStatus]);

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-200">
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

          {/* Right Side: API Key Badge (Gated for Paid / Admin Users Only) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {isEligibleForApiKey && (
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                title={hasApiKey ? 'Gemini API Key Connected (Click to Manage)' : 'Connect Gemini API Key'}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs border cursor-pointer ${
                  hasApiKey
                    ? 'bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 animate-pulse'
                }`}
              >
                {hasApiKey ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="hidden xs:inline">🔑 AI Engine Connected</span>
                    <span className="xs:hidden">🔑 Connected</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                    <span className="hidden xs:inline">⚠️ Connect AI Key</span>
                    <span className="xs:hidden">⚠️ Connect Key</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </header>

      {/* API Key Modal Dialog */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={checkKeyStatus}
      />
    </>
  );
};

