'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'finfreex-theme'

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeCtx = createContext<ThemeState>({ theme: 'dark', setTheme: () => {}, toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The inline script in layout.tsx has already stamped data-theme on
  // <html> before paint, so read from there rather than guessing.
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    if (current === 'light' || current === 'dark') setThemeState(current)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement
    // Suppress transitions during the swap; a 200ms cross-fade on every
    // rule in the page reads as lag, not polish.
    root.classList.add('theme-switching')
    root.setAttribute('data-theme', next)
    root.style.colorScheme = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode — the choice just won't persist */
    }
    setThemeState(next)
    window.setTimeout(() => root.classList.remove('theme-switching'), 60)
  }, [])

  const toggle = useCallback(() => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light')
  }, [setTheme])

  // Follow the OS only while the user has not made an explicit choice
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = (e: MediaQueryListEvent) => {
      let stored: string | null = null
      try {
        stored = localStorage.getItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
      if (!stored) setTheme(e.matches ? 'light' : 'dark')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [setTheme])

  return <ThemeCtx.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)

/** Runs before first paint to prevent a flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `
(function(){
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`
