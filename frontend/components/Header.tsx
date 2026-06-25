'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { useAuth } from '@/context/AuthContext';
import ShinyText from './reactbits/ShinyText';
import GooeyNav from './reactbits/GooeyNav/GooeyNav';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out flex justify-center px-4 ${scrolled ? 'py-2' : 'py-5'}`}>
      <div className={`transition-all duration-700 ease-out flex items-center justify-between px-6 relative overflow-hidden ${
        scrolled 
          ? 'w-[92%] max-w-5xl h-14 rounded-2xl bg-[#12121A]/80 backdrop-blur-2xl border border-white/[0.06] shadow-2xl shadow-black/40' 
          : 'w-full max-w-7xl h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] backdrop-blur-sm'
      }`}>
        {/* Subtle accent line at top when scrolled */}
        {scrolled && (
          <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"></div>
        )}

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 relative z-10 group cursor-pointer">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center transition-all duration-500 group-hover:shadow-lg group-hover:shadow-indigo-500/25 group-hover:scale-110">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-200 tracking-tight group-hover:text-white transition-colors">
            Port<span className="text-indigo-400">AI</span>
          </span>
        </Link>
        
        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1 relative z-10">
          {[
            { href: '/#markets', label: 'Markets' },
            { href: '/portfolios', label: 'Portfolios' },
            { href: '/intelligence', label: 'Intelligence' },
            { href: '/sectors', label: 'Sectors' },
            { href: '/technical-charts', label: 'Charts' },
            { href: '/hedge-fund', label: 'Hedge Fund' },
          ].map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all duration-300"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 relative z-10">
          <LanguageSwitcher />
          
          {/* Live indicator */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-indigo-500/[0.08] border border-indigo-500/20 text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.5)]"></span>
            Live
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => signOut()}
                className="text-xs font-medium text-slate-500 hover:text-indigo-400 transition-colors"
              >
                Sign Out
              </button>
              <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-indigo-400 overflow-hidden">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <iconify-icon icon="solar:user-bold-duotone" width="18"></iconify-icon>
                )}
              </div>
            </div>
          ) : (
            <Link href="/auth" 
              className="bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 magnetic-btn">
              Get Started
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
