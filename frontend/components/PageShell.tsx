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
}: {
  title: string
  subtitle?: string
  icon?: string
  category?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
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
                  <div className="w-12 h-12 rounded-2xl bg-emerald/12 border border-emerald/25 text-emerald-bright flex items-center justify-center shrink-0">
                    <iconify-icon icon={icon} width="24"></iconify-icon>
                  </div>
                )}
                <div>
                  {category && (
                    <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-bright mb-1">{category}</div>
                  )}
                  <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-foreground text-balance">{title}</h1>
                  {subtitle && <p className="text-soft text-sm mt-1 max-w-2xl text-pretty">{subtitle}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {actions}
                <Badge tone="emerald">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright ticker-live"></span> Live
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
