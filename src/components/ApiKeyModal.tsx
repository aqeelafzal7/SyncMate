import React, { useState, useEffect } from 'react';
import { 
  Key, 
  X, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { encryptAndSaveApiKey, getDecryptedApiKey, removeSavedApiKey } from '../lib/cryptoStorage';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved
}) => {
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      setTesting(false);
      getDecryptedApiKey().then((key) => {
        if (key) {
          setInputKey(key);
          setHasExistingKey(true);
        } else {
          setInputKey('');
          setHasExistingKey(false);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputKey.trim();

    if (!trimmed) {
      setStatusMessage({
        text: '❌ Please enter a valid Gemini API key.',
        type: 'error'
      });
      return;
    }

    setTesting(true);
    setStatusMessage(null);

    try {
      // Test request to Gemini Flash API
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${trimmed}`;
      const res = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }]
        })
      });

      if (res.ok) {
        await encryptAndSaveApiKey(trimmed);
        setStatusMessage({
          text: '✅ API Key Verified & Encrypted!',
          type: 'success'
        });
        setHasExistingKey(true);
        if (onKeySaved) onKeySaved();
        
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        const errorData = await res.json().catch(() => ({}));
        const rawMsg = JSON.stringify(errorData);
        let msg = errorData.error?.message || 'Invalid API Key. Please verify in Google AI Studio.';
        if (
          res.status === 403 ||
          rawMsg.includes('API_KEY_HTTP_REFERRER_BLOCKED') ||
          rawMsg.includes('PERMISSION_DENIED')
        ) {
          msg = "API Key Blocked: Your Google API key is restricted by HTTP Referrer. Please add 'https://*.run.app/*' and 'https://syncmate.pages.dev/*' to your allowed websites in Google Cloud Console.";
        }
        setStatusMessage({
          text: `❌ ${msg}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        text: '❌ Network error while verifying key. Please check connection.',
        type: 'error'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRemoveKey = () => {
    removeSavedApiKey();
    setInputKey('');
    setHasExistingKey(false);
    setStatusMessage({
      text: 'API Key removed.',
      type: 'success'
    });
    if (onKeySaved) onKeySaved();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden transition-all transform scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Connect Your Gemini AI Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AES-256 encrypted directly on your local device
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* 3-Step Visual Guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              3-Step Quick Setup Guide
            </h4>
            
            <div className="grid gap-2.5">
              {/* Step 1 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                    1
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Get Free Google API Key
                  </span>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm shrink-0"
                >
                  <span>Google AI Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Step 2 */}
              <div className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                  2
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Sign in with any Google account & click <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">"Create API key"</strong>
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                  3
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Copy your key string (starts with <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200">AIzaSy...</code>) and paste it below
                </span>
              </div>
            </div>
          </div>

          {/* Form Input Section */}
          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Gemini API Key
              </label>
              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Paste your key here (AIzaSy...)"
                  className="w-full pl-4 pr-11 py-3 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all font-mono"
                  disabled={testing}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Status Feedback Banner */}
            {statusMessage && (
              <div className={`flex items-start space-x-2 p-3 rounded-2xl text-xs font-medium border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}>
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Privacy Guarantee Note */}
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Your key is client-side encrypted with AES-GCM and never leaves your browser.</span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 space-x-3">
              {hasExistingKey ? (
                <button
                  type="button"
                  onClick={handleRemoveKey}
                  disabled={testing}
                  className="inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Key</span>
                </button>
              ) : <div />}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={testing}
                  className="px-4 py-2.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testing || !inputKey.trim()}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold transition-all shadow-md hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Test & Save Key</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
};
