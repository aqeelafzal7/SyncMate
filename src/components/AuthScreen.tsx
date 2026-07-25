import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface AuthScreenProps {
  onGuestLogin: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onGuestLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
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
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Try logging in.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setResetMessage('');
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

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset password.');
      return;
    }
    setError('');
    setResetMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage(`Password reset link sent to ${email}`);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to send reset email.');
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#090A0F] relative overflow-hidden flex flex-col justify-center px-6 py-8">
      
      {/* Ambient glowing orbs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10">
        
        {/* Brand Header Streamlining */}
        <div className="text-center mb-6">
          <img 
            src="https://i.ibb.co/PztwKQdM/Sync-Mate.png" 
            alt="SyncMate logo" 
            className="h-20 w-auto mx-auto mb-4 drop-shadow-lg" 
          />
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            SyncMate
          </h1>
          <div className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              YOUR AUTONOMOUS ASSISTANT
            </span>
          </div>
        </div>

        {/* Mode Toggle (Sign In vs Create Account) */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mb-6 backdrop-blur-md">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(''); setResetMessage(''); }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              !isSignUp ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-white/50 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(''); setResetMessage(''); }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              isSignUp ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-white/50 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email Input */}
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={`h-[52px] w-full bg-white/5 border ${
                error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-purple-500 focus:ring-purple-500'
              } rounded-xl backdrop-blur-md text-white px-4 text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 transition-all`}
            />
          </div>

          {/* Password Input & Password Header */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-white/80">
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`h-[52px] w-full bg-white/5 border ${
                  error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-purple-500 focus:ring-purple-500'
                } rounded-xl backdrop-blur-md text-white pl-4 pr-12 text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Inline Error / Reset Message Container (Reserved height prevents layout shifts) */}
            <div className="min-h-[20px] mt-1.5 px-0.5">
              {error && (
                <p className="text-red-400 text-xs font-medium leading-tight">
                  {error}
                </p>
              )}
              {resetMessage && (
                <p className="text-emerald-400 text-xs font-medium leading-tight">
                  {resetMessage}
                </p>
              )}
            </div>
          </div>

          {/* Primary Mobile CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-[0.98] transition-all flex justify-center items-center mt-4 text-base disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <span>Initialize SyncMate ⚡</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-8">
          <hr className="flex-1 border-white/10" />
          <span className="text-xs text-white/40 tracking-wider font-semibold">
            OR CONTINUE WITH
          </span>
          <hr className="flex-1 border-white/10" />
        </div>

        {/* Google Auth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-3 active:bg-white/10 active:scale-[0.98] transition-transform text-white text-sm font-medium disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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

        {/* Guest Mode */}
        <button
          type="button"
          onClick={onGuestLogin}
          className="text-white/50 hover:text-white text-sm mt-6 mx-auto block font-medium transition-colors"
        >
          Continue as Guest (Demo Account)
        </button>

      </div>
    </div>
  );
};

