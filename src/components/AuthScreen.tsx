import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Sparkles, Mail, Lock, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

interface AuthScreenProps {
  onGuestLogin: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onGuestLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed. Please check credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Try logging in.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign in failed. Try email login or Guest Mode.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 mb-4 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            SyncMate
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mt-1">
            Your Autonomous Secretary
          </p>
          <p className="text-xs text-slate-400 mt-2">
            AI-driven dynamic scheduling, prayer & focus anchors, and proactive context engine.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 mb-6">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              !isSignUp ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              isSignUp ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-pulse">Authenticating...</span>
            ) : (
              <>
                <span>{isSignUp ? 'Initialize SyncMate' : 'Access Your Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500">
            or continue with
          </span>
        </div>

        {/* Google & Guest Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-medium py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.6-.8-1-1.8-1-3z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 22.3 12 23z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          <button
            type="button"
            onClick={onGuestLogin}
            className="w-full bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-800/60 text-indigo-300 text-xs font-medium py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all"
          >
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Continue as Guest (Demo Account)</span>
          </button>
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Secured with Firebase Auth & Cloud Firestore</span>
        </div>

      </div>
    </div>
  );
};
