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
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/gitcron-icon.png', type: 'image/png' },
    ],
    apple: '/gitcron-icon.png',
  },
};

/**
 * Content Security Policy
 *
 *   In DEV we need `'unsafe-eval'` for Webpack/Turbopack HMR and `'unsafe-inline'`
 *   for the Next.js inline bootstrap script. We accept that surface in dev because
 *   the devTools are open anyway and the localhost connect-src/ws-src is needed.
 *
 *   In PROD (packaged Electron build) we drop `'unsafe-eval'` and the localhost
 *   connect/ws origins. `'unsafe-inline'` for scripts stays because Next.js
 *   still injects a bootstrap script tag in the static export; the proper fix
 *   is nonce-based CSP but Next 15 static export doesn't emit nonces yet.
 *
 *   default-src 'self'                  → only allow local resources by default
 *   img-src                             → GitHub avatars + local + data URIs
 *   connect-src                         → GitHub API + active AI provider (OpenRouter); + localhost only in dev
 *   font-src 'self' data:               → Inter + JetBrains Mono fonts (bundled)
 *   object-src 'none'                   → block <object>, <embed>, plugins
 *   base-uri 'self'                     → can't be hijacked with <base>
 *   frame-ancestors 'none'              → can't be iframed
 */
const isDev = process.env.NODE_ENV !== 'production';

const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

// AI providers: only origins of providers we actually use are added. OpenRouter
// (https://openrouter.ai) serves the online AI for both the Temporal Agent and
// Cartografía. http://localhost:1234 is the LOCAL provider (LM Studio, OpenAI-
// compatible) used by Cartografía's AI layer — added explicitly in PROD too
// because dev's localhost:* wildcard is dropped there. Do NOT widen this to every
// provider at once. (The model request itself is made from the MAIN process, but
// we keep the CSP in lockstep with the documented threat model — see SECURITY.md.)
const connectSrc = isDev
  ? "connect-src 'self' http://localhost:* ws://localhost:* https://api.github.com https://github.com https://openrouter.ai"
  : "connect-src 'self' http://localhost:1234 https://api.github.com https://github.com https://openrouter.ai";

const CSP = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com https://*.githubusercontent.com",
  connectSrc,
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
