'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

const LANGUAGES = [
  { code: 'en',    label: 'English',    flag: '🇺🇸' },
  { code: 'hi',    label: 'हिन्दी',      flag: '🇮🇳' },
  { code: 'bn',    label: 'বাংলা',       flag: '🇧🇩' },
  { code: 'te',    label: 'తెలుగు',      flag: '🇮🇳' },
  { code: 'mr',    label: 'मराठी',       flag: '🇮🇳' },
  { code: 'ta',    label: 'தமிழ்',       flag: '🇮🇳' },
  { code: 'gu',    label: 'ગુજરાતી',     flag: '🇮🇳' },
  { code: 'kn',    label: 'ಕನ್ನಡ',       flag: '🇮🇳' },
  { code: 'ml',    label: 'മലയാളം',     flag: '🇮🇳' },
  { code: 'pa',    label: 'ਪੰਜਾਬੀ',      flag: '🇮🇳' },
  { code: 'zh-CN', label: '中文',        flag: '🇨🇳' },
  { code: 'ja',    label: '日本語',      flag: '🇯🇵' },
  { code: 'ko',    label: '한국어',      flag: '🇰🇷' },
  { code: 'ar',    label: 'العربية',    flag: '🇸🇦' },
  { code: 'es',    label: 'Español',    flag: '🇪🇸' },
  { code: 'fr',    label: 'Français',   flag: '🇫🇷' },
  { code: 'de',    label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'pt',    label: 'Português',  flag: '🇧🇷' },
  { code: 'ru',    label: 'Русский',    flag: '🇷🇺' },
];

// Finds the Google Translate select element and fires a language change
function applyTranslation(code: string) {
  const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (select) {
    select.value = code;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input',  { bubbles: true }));
    return true;
  }
  return false;
}

// Cookie fallback: set googtrans cookie and reload
function applyViaCookie(code: string) {
  const val = code === 'en' ? '' : `/en/${code}`;
  document.cookie = `googtrans=${val};path=/`;
  document.cookie = `googtrans=${val};domain=${location.hostname};path=/`;
  location.reload();
}

// Retry combo approach; after all retries fall back to cookie+reload
function switchLang(code: string, attempt = 0) {
  if (applyTranslation(code)) return;
  if (attempt < 20) {
    setTimeout(() => switchLang(code, attempt + 1), 300);
  } else {
    applyViaCookie(code);
  }
}

function getStoredLang(): string {
  if (typeof localStorage === 'undefined') return 'en';
  return localStorage.getItem('portai_lang') || 'en';
}

export default function LanguageSwitcher() {
  const [open, setOpen]         = useState(false);
  const [current, setCurrent]   = useState('en');
  const [dropPos, setDropPos]   = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted]   = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = getStoredLang();
    setCurrent(saved);
    // Re-apply stored language after page load (widget may not be ready immediately)
    if (saved !== 'en') switchLang(saved);
  }, []);

  // Close on outside click — check any [data-lang-root] (includes portal dropdown)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest?.('[data-lang-root]')) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen(v => !v);
  };

  const selectLang = useCallback((code: string) => {
    setOpen(false);
    if (code === current) return;
    setCurrent(code);
    localStorage.setItem('portai_lang', code);
    switchLang(code);
  }, [current]);

  const active = LANGUAGES.find(l => l.code === current) ?? LANGUAGES[0];

  const dropdown = open && dropPos && mounted ? createPortal(
    <div
      data-lang-root
      style={{ position: 'fixed', top: dropPos.top, right: dropPos.right, zIndex: 9999 }}
      className="w-52 rounded-2xl border border-black/10 bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      <div className="px-3 pt-3 pb-2 border-b border-black/5">
        <span className="text-[10px] text-black/40 uppercase tracking-widest font-mono font-semibold">Language</span>
      </div>
      <div className="max-h-72 overflow-y-auto py-1 scrollbar-hide">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => selectLang(lang.code)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors text-left font-mono uppercase tracking-wider ${
              lang.code === current ? 'bg-accent/10 text-accent font-semibold' : 'text-black/60 hover:bg-black/5 hover:text-black'
            }`}
          >
            <span className="text-base leading-none">{lang.flag}</span>
            <span>{lang.label}</span>
            {lang.code === current && (
              <svg className="w-3.5 h-3.5 text-accent ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div data-lang-root>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 bg-white hover:bg-black/[0.03] transition-all text-xs font-mono uppercase tracking-wider text-black/60"
        title="Change language"
      >
        <span className="text-base leading-none">{active.flag}</span>
        <span className="hidden sm:inline">{active.label}</span>
        <svg className={`w-3 h-3 text-black/30 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {dropdown}
    </div>
  );
}
