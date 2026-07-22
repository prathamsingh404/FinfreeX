import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinfreeX — Institutional-Grade Financial Intelligence',
  description:
    'AI-powered financial intelligence platform. Hedge-fund quality market analysis, screening, and portfolio tools for every investor.',
}

export const viewport = {
  themeColor: '#070B0A',
  width: 'device-width',
  initialScale: 1,
}

import Header from '@/components/Header'
import { AuthProvider } from '@/context/AuthContext'
import AuthLanyardBadge from '@/components/AuthLanyardBadge'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import GlobalCursor from '@/components/GlobalCursor'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
        {/* Google Translate — hidden widget, driven by LanguageSwitcher */}
        <script dangerouslySetInnerHTML={{ __html: `
          function googleTranslateElementInit() {
            try {
              new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'en,hi,bn,te,mr,ta,gu,kn,ml,pa,zh-CN,ja,ko,ar,es,fr,de,pt,ru',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false
              }, 'gt_root');
            } catch(e) { console.warn('GT init failed', e); }
          }
        `}} />
        <script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>
        <style>{`
          #gt_root { position: absolute; overflow: hidden; height: 1px; width: 1px; top: -1px; left: -1px; }
          .goog-te-banner-frame { display: none !important; }
          .goog-te-balloon-frame { display: none !important; }
          body { top: 0px !important; }
        `}
        </style>
      </head>
      <body className="antialiased bg-background text-foreground overflow-x-hidden w-full min-h-screen">
        {/* Flat vibrant background — solid canvas + subtle grid, no gradients */}
        <div className="fixed inset-0 -z-10 pointer-events-none bg-background">
          <div className="absolute inset-0 grid-texture opacity-60"></div>
          {/* Solid color accent blocks (flat, low-opacity) for immersion */}
          <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-emerald/[0.05] blur-[120px]"></div>
          <div className="absolute bottom-0 right-0 w-[380px] h-[380px] rounded-full bg-coral/[0.04] blur-[120px]"></div>
        </div>

        <GlobalCursor />
        <div id="gt_root" />

        <AuthProvider>
          <Header />
          {children}
          <AuthLanyardBadge />
          <div className="fixed bottom-14 right-4 z-[70] lg:hidden">
            <LanguageSwitcher />
          </div>
        </AuthProvider>

        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('load', function() {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                console.log('PWA Service Worker registered:', reg.scope);
              }).catch(function(err) {
                console.warn('PWA Service Worker registration failed:', err);
              });
            }
          });
        `}} />
      </body>
    </html>
  )
}
