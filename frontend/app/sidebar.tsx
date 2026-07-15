'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV, NavGroup, NavItem } from '@/lib/nav'
import { openCommandPalette } from '@/components/CommandPalette'

export { NAV as features } from '@/lib/nav'

function NavLink({ item, accent, onNavigate }: { item: NavItem; accent?: 'ai'; onNavigate: () => void }) {
  const pathname = usePathname()
  const isActive = pathname === item.route
  const activeCls =
    accent === 'ai'
      ? 'bg-ai/12 text-ai-bright'
      : 'bg-primary/12 text-primary'
  return (
    <li>
      <Link
        href={item.route}
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors relative ${
          isActive ? activeCls : 'text-soft hover:text-foreground hover:bg-white/[0.04]'
        }`}
      >
        {isActive && (
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full ${
              accent === 'ai' ? 'bg-ai' : 'bg-primary'
            }`}
          ></span>
        )}
        <iconify-icon
          icon={item.icon}
          width="16"
          class={isActive ? (accent === 'ai' ? 'text-ai-bright' : 'text-primary') : 'text-muted'}
        ></iconify-icon>
        {item.title}
      </Link>
    </li>
  )
}

function Group({ group, onNavigate }: { group: NavGroup; onNavigate: () => void }) {
  const pathname = usePathname()
  const core = group.items.filter((i) => i.tier !== 'pro')
  const pro = group.items.filter((i) => i.tier === 'pro')
  // Auto-expand the "More" section when the active route lives inside it
  const [showPro, setShowPro] = useState(() => pro.some((i) => i.route === pathname))

  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase mb-1.5 px-2 text-muted">
        {group.accent === 'ai' && <span className="w-1.5 h-1.5 rounded-full bg-ai agent-pulse"></span>}
        {group.category}
      </h4>
      <ul className="space-y-px">
        {core.map((item) => (
          <NavLink key={item.route} item={item} accent={group.accent} onNavigate={onNavigate} />
        ))}
        {showPro &&
          pro.map((item) => (
            <NavLink key={item.route} item={item} accent={group.accent} onNavigate={onNavigate} />
          ))}
        {pro.length > 0 && (
          <li>
            <button
              onClick={() => setShowPro((v) => !v)}
              className="w-full flex items-center gap-2.5 px-2.5 py-[6px] rounded-md text-xs font-medium text-muted hover:text-soft hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <iconify-icon
                icon={showPro ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                width="14"
              ></iconify-icon>
              {showPro ? 'Less' : `${pro.length} more`}
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const close = () => setIsOpen(false)

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation"
        className="fixed top-3 left-3 z-[99] lg:hidden w-10 h-10 rounded-md bg-surface border border-border flex items-center justify-center text-foreground cursor-pointer"
      >
        <iconify-icon icon={isOpen ? 'solar:close-linear' : 'solar:hamburger-menu-linear'} width="20"></iconify-icon>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden" onClick={close}></div>
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-surface border-r border-border z-[95] flex flex-col transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <Link href="/" className="h-16 flex items-center px-5 shrink-0 border-b border-border group">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <span className="text-sm font-extrabold tracking-tight text-foreground">
              Finfree<span className="text-primary">X</span>
            </span>
          </div>
        </Link>

        {/* Command palette trigger */}
        <div className="px-3 py-3 shrink-0">
          <button
            onClick={() => {
              close()
              openCommandPalette()
            }}
            className="w-full flex items-center gap-2 px-3 h-9 rounded-md bg-white/[0.04] border border-border hover:border-border-strong text-left transition-colors cursor-pointer group"
          >
            <iconify-icon icon="solar:magnifer-linear" width="15" class="text-muted"></iconify-icon>
            <span className="text-xs text-muted group-hover:text-soft flex-1">Search anything…</span>
            <span className="kbd">Ctrl</span>
            <span className="kbd">K</span>
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto w-full px-3 pb-4 space-y-5 custom-scrollbar">
          {NAV.map((group) => (
            <Group key={group.category} group={group} onNavigate={close} />
          ))}
        </nav>

        {/* Status */}
        <div className="p-3 border-t border-border shrink-0">
          <div className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-md border border-border">
            <div className="w-8 h-8 rounded-md bg-emerald/15 flex items-center justify-center text-emerald shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald ticker-live"></span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted">Market Data</div>
              <div className="text-xs font-semibold text-emerald truncate">Live · Streaming</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
