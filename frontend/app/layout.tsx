import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PortAI – Institutional-Grade Financial Intelligence',
  description: 'AI-powered financial intelligence platform for Indian retail investors. Hedge-fund quality analysis for everyone.',
}

import Header from '@/components/Header'
import { AuthProvider } from '@/context/AuthContext'
import AuthLanyardBadge from '@/components/AuthLanyardBadge'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import GlobalCursor from '@/components/GlobalCursor'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
        {/* UnicornStudio Script */}
        <script src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.34/dist/unicornStudio.umd.js" async={true}></script>
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
        {/* Suppress Google Translate's own UI — we use our custom switcher */}
        <style>{`
          #gt_root { position: absolute; overflow: hidden; height: 1px; width: 1px; top: -1px; left: -1px; }
          .goog-te-banner-frame { display: none !important; }
          .goog-te-balloon-frame { display: none !important; }
          body { top: 0px !important; }
        `}
        </style>
      </head>
      <body className="antialiased selection:bg-indigo-500 selection:text-white pb-20 bg-[#0A0A0F] text-slate-200 overflow-x-hidden w-full">
        {/* Dark Background with animated gradient orbs */}
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          {/* Main ambient glow */}
          <div className="absolute top-[20%] left-[30%] w-[600px] h-[600px] rounded-full bg-indigo-500/[0.04] blur-[120px]" style={{ animation: 'breathe 10s ease-in-out infinite' }}></div>
          <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] rounded-full bg-purple-500/[0.03] blur-[100px]" style={{ animation: 'breathe 12s ease-in-out infinite 2s' }}></div>
          <div className="absolute top-[60%] left-[60%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.02] blur-[80px]" style={{ animation: 'breathe 14s ease-in-out infinite 4s' }}></div>
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
        </div>

        {/* Global interactive cursor */}
        <GlobalCursor />

        {/* Google Translate mount point */}
        <div id="gt_root" />

        <AuthProvider>
          <Header />
          {children}
          <AuthLanyardBadge />
          <div className="fixed bottom-14 right-4 z-[70] lg:hidden">
            <LanguageSwitcher />
          </div>
        </AuthProvider>
        
        {/* Init UnicornStudio wrapper script */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('load', function() {
            if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
              window.UnicornStudio.init();
              window.UnicornStudio.isInitialized = true;
            }
          });
        `}} />
      </body>
    </html>
  )
}

// Root app layout featuring GlobalCursor and premium radial grid visual meshes
