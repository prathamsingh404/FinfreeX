'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { TOP_NAV } from '@/lib/nav'
import LanguageSwitcher from './LanguageSwitcher'
import { openCommandPalette } from './CommandPalette'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isPublicPage = pathname === '/' || pathname === '/about' || pathname === '/contact' || pathname === '/pricing' || pathname === '/auth'

  if (!isPublicPage) return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center px-3 py-3">
      <div
        className={`w-full max-w-6xl flex items-center justify-between px-4 sm:px-5 h-14 rounded-md transition-colors duration-200 ${
          scrolled ? 'bg-surface border border-border' : 'bg-surface/90 border border-transparent'
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 pl-10 lg:pl-0">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">FinfreeX</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {TOP_NAV.map((link) => {
            const active = pathname === link.route
            return (
              <Link
                key={link.route}
                href={link.route}
                className={`px-3 py-1.5 rounded text-[13px] transition-colors ${
                  active ? 'text-foreground bg-white/[0.06]' : 'text-soft hover:text-foreground hover:bg-white/[0.04]'
                }`}
              >
                {link.title}
              </Link>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openCommandPalette}
            aria-label="Open command palette"
            className="hidden sm:flex items-center gap-2 px-3 h-8 rounded-md bg-white/[0.04] border border-border hover:border-border-strong text-muted hover:text-soft transition-colors cursor-pointer"
          >
            <iconify-icon icon="solar:magnifer-linear" width="14"></iconify-icon>
            <span className="text-xs">Search</span>
            <span className="kbd">Ctrl</span>
            <span className="kbd">K</span>
          </button>
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              <button onClick={() => signOut()} className="text-xs font-medium text-muted hover:text-coral transition-colors px-2 cursor-pointer">
                Sign Out
              </button>
              <div className="w-8 h-8 rounded-md bg-white/[0.06] border border-border flex items-center justify-center text-primary overflow-hidden">
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
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-xs font-bold transition-colors"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
