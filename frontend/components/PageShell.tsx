import React from 'react'
import Sidebar from '@/app/sidebar'
import { Badge } from '@/components/ui/kit'

/* App shell for all feature pages: global Header (from layout) + left Sidebar + page hero */
export default function PageShell({
  title,
  subtitle,
  icon,
  category,
  actions,
  children,
  variant = 'default',
}: {
  title: string
  subtitle?: string
  icon?: string
  category?: string
  actions?: React.ReactNode
  children: React.ReactNode
  variant?: 'default' | 'terminal'
}) {
  if (variant === 'terminal') {
    return (
      <>
        <Sidebar />
        <div className="lg:pl-64 h-[100dvh] pt-20 overflow-hidden flex flex-col bg-[#0f1115]">
          {/* Extremely dense terminal header */}
          <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-[#131722] shrink-0">
            <div className="flex items-center gap-3">
              {icon && <iconify-icon icon={icon} class="text-primary text-xl"></iconify-icon>}
              <h1 className="text-sm font-bold text-foreground">{title}</h1>
              {subtitle && <span className="text-xs text-soft hidden sm:inline-block pl-3 border-l border-border">{subtitle}</span>}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald/10 border border-emerald/20 text-[10px] font-bold text-primary uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-primary ticker-live"></span> Live
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Sidebar />
      <div className="lg:pl-64 min-h-screen">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          {/* Hero header */}
          <header className="fade-up mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {icon && (
                  <div className="w-12 h-12 rounded-2xl bg-primary/12 border border-primary/25 text-primary flex items-center justify-center shrink-0">
                    <iconify-icon icon={icon} width="24"></iconify-icon>
                  </div>
                )}
                <div>
                  {category && (
                    <div className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">{category}</div>
                  )}
                  <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-foreground text-balance">{title}</h1>
                  {subtitle && <p className="text-soft text-sm mt-1 max-w-2xl text-pretty">{subtitle}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {actions}
                <Badge tone="primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary ticker-live"></span> Live
                </Badge>
              </div>
            </div>
          </header>

          {children}
        </div>
      </div>
    </>
  )
}

