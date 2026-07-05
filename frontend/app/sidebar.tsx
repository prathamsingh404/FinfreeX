'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from '@/lib/nav'

export { NAV as features } from '@/lib/nav'

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    if (!query.trim()) return NAV
    const q = query.toLowerCase()
    return NAV.map((g) => ({
      ...g,
      items: g.items.filter((i) => i.title.toLowerCase().includes(q)),
    })).filter((g) => g.items.length)
  }, [query])

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation"
        className="fixed top-3 left-3 z-[99] lg:hidden w-10 h-10 rounded-xl bg-surface border border-white/10 flex items-center justify-center text-foreground"
      >
        <iconify-icon icon={isOpen ? 'solar:close-linear' : 'solar:hamburger-menu-linear'} width="20"></iconify-icon>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden" onClick={() => setIsOpen(false)}></div>
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-surface border-r border-white/[0.06] z-[95] flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <Link href="/" className="h-16 flex items-center px-5 shrink-0 border-b border-white/[0.06] group">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#04120C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <span className="text-sm font-extrabold tracking-tight text-foreground">
              Finfree<span className="text-emerald-bright">X</span>
            </span>
          </div>
        </Link>

        {/* Search */}
        <div className="px-3 py-3 shrink-0">
          <div className="flex items-center gap-2 px-3 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] focus-within:border-emerald/40">
            <iconify-icon icon="solar:magnifer-linear" width="15" className="text-muted"></iconify-icon>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools…"
              className="bg-transparent outline-none text-xs text-foreground placeholder:text-muted w-full"
            />
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto w-full px-3 pb-4 space-y-5 custom-scrollbar">
          {groups.map((group, i) => (
            <div key={i} className="px-1">
              <h4 className="text-[10px] font-bold text-muted tracking-widest uppercase mb-2 px-2">{group.category}</h4>
              <ul className="space-y-0.5">
                {group.items.map((item, j) => {
                  const isActive = pathname === item.route
                  return (
                    <li key={j}>
                      <Link
                        href={item.route}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors relative ${
                          isActive ? 'bg-emerald/12 text-emerald-bright' : 'text-soft hover:text-foreground hover:bg-white/[0.04]'
                        }`}
                      >
                        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full bg-emerald"></span>}
                        <iconify-icon icon={item.icon} width="17" className={isActive ? 'text-emerald-bright' : 'text-muted'}></iconify-icon>
                        {item.title}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {groups.length === 0 && <p className="text-xs text-muted px-3">No tools match “{query}”.</p>}
        </nav>

        {/* Status */}
        <div className="p-3 border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-emerald/15 flex items-center justify-center text-emerald-bright shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-bright ticker-live"></span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted">Market Data</div>
              <div className="text-xs font-semibold text-emerald-bright truncate">Live · Streaming</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
