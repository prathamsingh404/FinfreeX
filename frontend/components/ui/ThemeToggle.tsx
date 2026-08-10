'use client'

import React from 'react'
import { useTheme } from '@/context/ThemeContext'

/**
 * Two states, one control. The icon shows the current theme, the label
 * (when shown) names what pressing it will do.
 */
export default function ThemeToggle({ withLabel = false, className = '' }: { withLabel?: boolean; className?: string }) {
  const { theme, toggle } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`inline-flex items-center gap-2 h-8 ${withLabel ? 'px-2.5' : 'w-8 justify-center'} rounded border border-border bg-surface-2 text-muted hover:text-foreground hover:border-border-strong transition-colors cursor-pointer ${className}`}
    >
      <iconify-icon
        icon={theme === 'dark' ? 'solar:moon-linear' : 'solar:sun-2-linear'}
        width="15"
      ></iconify-icon>
      {withLabel && <span className="text-xs capitalize">{theme}</span>}
    </button>
  )
}
