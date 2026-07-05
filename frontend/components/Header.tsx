'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { TOP_NAV } from '@/lib/nav'
import LanguageSwitcher from './LanguageSwitcher'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center px-3 py-3">
      <div
        className={`w-full max-w-6xl flex items-center justify-between px-4 sm:px-5 h-14 rounded-2xl transition-all duration-300 ${
          scrolled ? 'bg-surface/90 backdrop-blur-xl border border-white/[0.08]' : 'bg-surface/50 backdrop-blur-md border border-white/[0.05]'
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0 pl-10 lg:pl-0">
          <div className="w-8 h-8 rounded-xl bg-emerald flex items-center justify-center transition-transform group-hover:scale-105">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#04120C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <span className="text-sm font-extrabold tracking-tight text-foreground">
            Finfree<span className="text-emerald-bright">X</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {TOP_NAV.map((link) => {
            const active = pathname === link.route
            return (
              <Link
                key={link.route}
                href={link.route}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  active ? 'text-emerald-bright bg-emerald/10' : 'text-soft hover:text-foreground hover:bg-white/[0.05]'
                }`}
              >
                {link.title}
              </Link>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              <button onClick={() => signOut()} className="text-xs font-medium text-muted hover:text-coral transition-colors px-2">
                Sign Out
              </button>
              <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-emerald-bright overflow-hidden">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <iconify-icon icon="solar:user-bold" width="17"></iconify-icon>
                )}
              </div>
            </div>
          ) : (
            <Link
              href="/auth"
              className="bg-emerald hover:bg-emerald-bright text-[#04120C] px-4 py-2 rounded-xl text-xs font-bold transition-all magnetic-btn"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
