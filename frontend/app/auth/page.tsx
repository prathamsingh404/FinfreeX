'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const router = useRouter();
  const { user } = useAuth();

  // Redirect if logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Handle URL errors (e.g. if Supabase redirects back with OAuth error)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;

      if (hash.includes('error') || search.includes('error')) {
        const params = new URLSearchParams(hash.replace('#', '?') || search);
        const errDesc = params.get('error_description') || params.get('error');

        if (errDesc) {
          const textLower = errDesc.toLowerCase();
          if (textLower.includes('provider') || textLower.includes('not_enabled') || textLower.includes('unsupported')) {
            setMessage({
              type: 'info',
              text: 'Google Sign-In requires configuring Google OAuth keys in your Supabase Dashboard. You can sign in using Email & Password or Demo Account below!',
            });
          } else {
            setMessage({
              type: 'error',
              text: decodeURIComponent(errDesc).replace(/\+/g, ' '),
            });
          }
        }
      }
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName.trim(),
              phone_number: phone.trim(),
            },
          },
        });
        if (error) throw error;

        if (data.session) {
          setMessage({ type: 'success', text: 'Account created successfully! Redirecting...' });
          setTimeout(() => router.push('/dashboard'), 800);
        } else {
          setMessage({
            type: 'success',
            text: 'Registration successful! Check your email inbox to confirm your account.',
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (phone.trim()) {
          await supabase.auth.updateUser({
            data: { phone_number: phone.trim() },
          });
        }

        setMessage({ type: 'success', text: 'Login successful! Redirecting to workspace...' });
        setTimeout(() => router.push('/dashboard'), 800);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Authentication failed. Check your email & password.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('provider') || msg.includes('not enabled') || msg.includes('unsupported')) {
          throw new Error(
            'Google Sign-In is disabled in Supabase Auth Settings. Enable the Google Provider in Supabase Dashboard, or sign in using Email & Password below.'
          );
        }
        throw error;
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Google sign-in failed. Please use Email & Password below.',
      });
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setMessage(null);
    try {
      // Try demo credentials or sign up demo account
      const demoEmail = 'demo@finfreex.io';
      const demoPassword = 'DemoUser123!';

      let { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      if (error) {
        // If demo account doesn't exist yet, create it automatically
        const signUpRes = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
          options: {
            data: { full_name: 'Demo Trader' },
          },
        });
        if (signUpRes.error) throw signUpRes.error;
      }

      setMessage({ type: 'success', text: 'Demo access granted! Entering dashboard...' });
      setTimeout(() => router.push('/dashboard'), 600);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Demo login error. Please create a new account using Email & Password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-bright/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-soft bg-surface border border-border hover:border-border-strong hover:text-foreground transition-all shadow-sm"
        >
          <iconify-icon icon="solar:alt-arrow-left-linear" width="16"></iconify-icon>
          Back to Home
        </Link>
      </div>

      <div className="w-full max-w-md fade-up z-10 my-8">
        <div className="bg-surface border border-border rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          {/* Top Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />

          {/* Logo & Heading */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 mb-4 transition-all duration-300 hover:scale-105">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-soft text-xs mt-1.5">
              {isSignUp
                ? 'Join FinfreeX multi-agent intelligence workspace'
                : 'Access your active portfolios & AI research'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-surface-2 border border-border rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setMessage(null); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !isSignUp ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-soft'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setMessage(null); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isSignUp ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-soft'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-soft mb-1.5 ml-1">
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted group-focus-within:text-primary transition-colors">
                    <iconify-icon icon="solar:user-linear" width="18"></iconify-icon>
                  </div>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl py-3 pl-10 pr-4 text-foreground placeholder:text-muted focus:outline-none focus:border-primary/60 transition-all text-xs font-medium"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-soft mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted group-focus-within:text-primary transition-colors">
                  <iconify-icon icon="solar:letter-linear" width="18"></iconify-icon>
                </div>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 pl-10 pr-4 text-foreground placeholder:text-muted focus:outline-none focus:border-primary/60 transition-all text-xs font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-soft mb-1.5 ml-1">
                WhatsApp / Phone <span className="text-muted font-normal">(optional alerts)</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted group-focus-within:text-primary transition-colors">
                  <iconify-icon icon="solar:phone-linear" width="18"></iconify-icon>
                </div>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 pl-10 pr-4 text-foreground placeholder:text-muted focus:outline-none focus:border-primary/60 transition-all text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-soft mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted group-focus-within:text-primary transition-colors">
                  <iconify-icon icon="solar:lock-keyhole-minimalistic-linear" width="18"></iconify-icon>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 pl-10 pr-11 text-foreground placeholder:text-muted focus:outline-none focus:border-primary/60 transition-all text-xs font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <iconify-icon
                    icon={showPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'}
                    width="18"
                  ></iconify-icon>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-primary/20 cursor-pointer mt-6 text-xs uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <iconify-icon icon="solar:restart-linear" className="animate-spin" width="18"></iconify-icon>
                  Processing…
                </>
              ) : (
                <>
                  <iconify-icon
                    icon={isSignUp ? 'solar:user-plus-linear' : 'solar:login-2-linear'}
                    width="18"
                  ></iconify-icon>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="bg-surface px-3 text-muted">Or choose quick option</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {/* Demo Login Button */}
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full bg-emerald-bright/10 hover:bg-emerald-bright/20 border border-emerald-bright/30 text-emerald-bright font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <iconify-icon icon="solar:user-check-bold" width="16"></iconify-icon>
              Instant Demo Access
            </button>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-surface-2 border border-border text-foreground font-medium py-2.5 rounded-xl hover:bg-hover hover:border-border-strong transition-all duration-200 flex items-center justify-center gap-2.5 text-xs cursor-pointer"
            >
              <iconify-icon icon="logos:google-icon" width="16"></iconify-icon>
              Continue with Google
            </button>
          </div>

          {/* Status Message */}
          {message && (
            <div
              className={`mt-5 p-3.5 rounded-xl text-xs flex items-start gap-3 fade-up ${
                message.type === 'success'
                  ? 'bg-emerald-bright/10 text-emerald-bright border border-emerald-bright/30'
                  : message.type === 'info'
                  ? 'bg-primary/10 text-soft border border-primary/30'
                  : 'bg-coral/10 text-coral border border-coral/30'
              }`}
            >
              <iconify-icon
                icon={
                  message.type === 'success'
                    ? 'solar:check-circle-bold'
                    : message.type === 'info'
                    ? 'solar:info-circle-bold'
                    : 'solar:danger-triangle-bold'
                }
                width="18"
                className="shrink-0 mt-0.5"
              ></iconify-icon>
              <span className="leading-relaxed font-medium">{message.text}</span>
            </div>
          )}
        </div>

        <p className="text-center mt-6 text-muted text-[11px]">
          By continuing, you agree to FinfreeX{' '}
          <Link href="/docs" className="text-soft hover:text-foreground transition-colors underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/docs" className="text-soft hover:text-foreground transition-colors underline">
            Privacy Policy
          </Link>.
        </p>
      </div>
    </main>
  );
}
