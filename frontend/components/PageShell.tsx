import React from 'react'
import Sidebar from '@/app/sidebar'
import Backdrop from '@/components/ui/Backdrop'

type BackdropVariant = 'contour' | 'lattice' | 'mesh' | 'tape' | 'radial'

/**
 * App shell for feature pages.
 *
 * `terminal` fills the viewport and gives the page its own scroll
 * regions — use it for grids, chains and anything that should never
 * scroll the whole document. `default` is a normal scrolling page with
 * a generated backdrop behind the header.
 */
export default function PageShell({
  title,
  subtitle,
  icon,
  category,
  actions,
  children,
  variant = 'default',
  backdrop,
  status,
}: {
  title: string
  subtitle?: string
  icon?: string
  category?: string
  actions?: React.ReactNode
  children: React.ReactNode
  variant?: 'default' | 'terminal'
  /** Generated section artwork behind the page header */
  backdrop?: BackdropVariant
  /** Right-side status line in the terminal rail, e.g. "Live · 15m delayed" */
  status?: React.ReactNode
}) {
  if (variant === 'terminal') {
    return (
      <>
        <Sidebar />
        <div className="lg:pl-64 h-[100dvh] pt-14 lg:pt-0 overflow-hidden flex flex-col bg-background">
          <header className="flex items-center justify-between gap-3 px-3 h-11 border-b border-border bg-surface shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {icon && <iconify-icon icon={icon} width="16" class="text-muted shrink-0"></iconify-icon>}
              <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
              {category && <span className="chip hidden md:inline-flex">{category}</span>}
              {subtitle && (
                <span className="text-xs text-muted hidden lg:inline-block pl-3 border-l border-border truncate">
                  {subtitle}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {status && <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted">{status}</span>}
              {actions}
            </div>
          </header>
          <div className="flex-1 overflow-hidden min-h-0">{children}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Sidebar />
      <div className="lg:pl-64 min-h-screen">
        <div className="relative">
          {backdrop && <Backdrop variant={backdrop} fade="top" />}
          <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-20 lg:pt-10 pb-14">
            <header className="fade-up mb-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="min-w-0">
                  {category && (
                    <div className="flex items-center gap-2 mb-2">
                      {icon && <iconify-icon icon={icon} width="13" class="text-muted"></iconify-icon>}
                      <span className="eyebrow">{category}</span>
                    </div>
                  )}
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                  {subtitle && <p className="text-soft text-sm mt-1.5 max-w-2xl">{subtitle}</p>}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
              </div>
              <div className="h-px bg-border mt-5" />
            </header>

            {children}
          </div>
        </div>
      </div>
    </>
  )
}
