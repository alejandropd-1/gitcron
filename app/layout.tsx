import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// DESIGN.MD: single-font strategy using Inter for "unified, modern aesthetic
// that feels both human and technical". JetBrains Mono kept for code/diff
// regions only (mono spacing required).
const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GitCron - Advanced Git Client',
  description: 'Technical dark Git management platform',
};

/**
 * Content Security Policy
 *
 *   default-src 'self'                  → only allow local resources by default
 *   script-src                          → allow Next.js inline scripts; in dev we also need
 *                                         'unsafe-eval' for HMR/webpack. We accept this in
 *                                         dev because devTools are open anyway. For a
 *                                         packaged production build, tighten further.
 *   style-src 'self' 'unsafe-inline'    → Tailwind injects styles inline
 *   img-src                             → allow GitHub avatars + local + data URIs
 *   connect-src                         → fetches go to GitHub API only (and localhost in dev)
 *   font-src 'self' data:               → Inter + JetBrains Mono fonts (bundled)
 *   object-src 'none'                   → block <object>, <embed>, plugins
 *   base-uri 'self'                     → can't be hijacked with <base>
 *   frame-ancestors 'none'              → can't be iframed
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com https://*.githubusercontent.com",
  "connect-src 'self' http://localhost:* ws://localhost:* https://api.github.com https://github.com",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
