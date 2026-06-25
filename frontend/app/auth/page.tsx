'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              phone_number: phone, // Store phone in user_metadata
            },
          },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Registration successful! Check your email to confirm.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // If user logs in and has a phone number entered, update metadata
        if (phone) {
          await supabase.auth.updateUser({
            data: { phone_number: phone },
          });
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/[0.06] blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/[0.04] blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md fade-up z-10">
        <div className="glass-panel rounded-2xl p-8 relative overflow-hidden">
          {/* Top gradient accent line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"></div>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 mb-5 transition-all duration-500 hover:scale-110">
              <iconify-icon icon="solar:user-circle-linear" width="28" className="text-white"></iconify-icon>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              {isSignUp ? 'Create Account' : 'Welcome back'}
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              {isSignUp ? 'Join the intelligent investment platform' : 'Access your portfolio workspace'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-indigo-400 transition-colors">
                  <iconify-icon icon="solar:letter-linear" width="18"></iconify-icon>
                </div>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
                WhatsApp Number <span className="text-slate-600">(for delivery)</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-indigo-400 transition-colors">
                  <iconify-icon icon="solar:phone-linear" width="18"></iconify-icon>
                </div>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm"
                />
              </div>
              <p className="text-xs text-slate-600 mt-1 ml-1">Include country code. AI reports will be delivered here.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-indigo-400 transition-colors">
                  <iconify-icon icon="solar:lock-password-unlocked-linear" width="18"></iconify-icon>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl py-3 pl-11 pr-12 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-slate-600 hover:text-indigo-400 transition-colors"
                >
                  <iconify-icon icon={showPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'} width="18"></iconify-icon>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 mt-6"
            >
              {loading ? (
                <iconify-icon icon="solar:restart-linear" className="animate-spin" width="18"></iconify-icon>
              ) : (
                <>
                  <iconify-icon icon={isSignUp ? "solar:user-plus-linear" : "solar:login-2-linear"} className="group-hover:translate-x-0.5 transition-transform" width="18"></iconify-icon>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#12121A] px-3 text-slate-600">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white/[0.05] border border-white/[0.08] text-slate-300 font-medium py-3 rounded-xl hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <iconify-icon icon="logos:google-icon" width="18"></iconify-icon>
            Sign in with Google
          </button>

          {message && (
            <div className={`mt-6 p-4 rounded-xl text-sm flex items-start gap-3 fade-up ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              <iconify-icon 
                icon={message.type === 'success' ? 'solar:check-circle-linear' : 'solar:danger-triangle-linear'} 
                width="16" 
                className="mt-0.5"
              ></iconify-icon>
              <span className="flex-1 text-xs leading-relaxed">{message.text}</span>
            </div>
          )}
        </div>
        
        <p className="text-center mt-6 text-slate-600 text-xs">
          By signing in, you agree to our <a href="#" className="text-slate-500 hover:text-indigo-400 transition-colors underline">Terms of Service</a>
        </p>
      </div>
    </main>
  );
}

// Glassmorphic Authentication interface - Integrated with Supabase auth client
