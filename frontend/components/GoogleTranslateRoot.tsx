'use client'

import { useEffect, useState } from 'react'

/**
 * Client-only wrapper for the Google Translate root div.
 * Renders only after mount to prevent SSR/hydration mismatch.
 */
export default function GoogleTranslateRoot() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <div id="gt_root" />
}
