import React from 'react'
import Sidebar from '@/app/sidebar'

/* App shell for feature pages: global Header (from layout) + left Sidebar + page header */
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
        <div className="lg:pl-64 h-[100dvh] pt-20 overflow-hidden flex flex-col bg-background">
          <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface shrink-0">
            <div className="flex items-center gap-3">
              {icon && <iconify-icon icon={icon} class="text-muted text-lg"></iconify-icon>}
              <h1 className="text-sm font-semibold text-foreground">{title}</h1>
              {subtitle && (
                <span className="text-xs text-muted hidden sm:inline-block pl-3 border-l border-border">{subtitle}</span>
              )}
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </header>
          <div className="flex-1 overflow-hidden">{children}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Sidebar />
      <div className="lg:pl-64 min-h-screen">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <header className="fade-up mb-7">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                {category && <div className="text-[11px] uppercase tracking-wider text-muted mb-1.5">{category}</div>}
                <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">{title}</h1>
                {subtitle && <p className="text-soft text-sm mt-1.5 max-w-2xl text-pretty">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </header>

          {children}
        </div>
      </div>
    </>
  )
}
