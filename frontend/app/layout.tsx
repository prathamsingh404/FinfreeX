import type { Metadata } from 'next'
import './globals.css'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'FinfreeX — Institutional-Grade Financial Intelligence',
  description:
    'AI-powered financial intelligence platform. Hedge-fund quality market analysis, screening, and portfolio tools for every investor.',
}

export const viewport = {
  themeColor: '#0c1017',
  width: 'device-width',
  initialScale: 1,
}

import Header from '@/components/Header'
import { AuthProvider } from '@/context/AuthContext'
import AuthLanyardBadge from '@/components/AuthLanyardBadge'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import GoogleTranslateRoot from '@/components/GoogleTranslateRoot'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased bg-background text-foreground overflow-x-hidden w-full min-h-screen">
        {/* Clean background with subtle grid */}
        <div className="fixed inset-0 -z-10 pointer-events-none bg-background">
          <div className="absolute inset-0 grid-texture opacity-20"></div>
        </div>

        <AuthProvider>
          <Header />
          {children}
          <AuthLanyardBadge />
          <div className="fixed bottom-14 right-4 z-[70] lg:hidden">
            <LanguageSwitcher />
          </div>
        </AuthProvider>

        {/* Google Translate root — client-only to avoid hydration mismatch */}
        <GoogleTranslateRoot />

        {/* External scripts loaded after interactive to prevent hydration issues */}
        <Script
          src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"
          strategy="afterInteractive"
        />
        <Script id="google-translate-init" strategy="afterInteractive">
          {`
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
          `}
        </Script>
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
        <Script id="sw-register" strategy="lazyOnload">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                console.log('PWA SW registered:', reg.scope);
              }).catch(function(err) {
                console.warn('PWA SW failed:', err);
              });
            }
          `}
        </Script>

        {/* Hide Google Translate widget chrome */}
        <style>{`
          #gt_root { position: absolute; overflow: hidden; height: 1px; width: 1px; top: -1px; left: -1px; }
          .goog-te-banner-frame { display: none !important; }
          .goog-te-balloon-frame { display: none !important; }
          body { top: 0px !important; }
        `}</style>
      </body>
    </html>
  )
}
