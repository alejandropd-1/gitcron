import type {NextConfig} from 'next';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Static export for Electron packaging (generates out/).
  // In dev the Next.js dev server is used, so output stays default.
  // Asset paths stay absolute (default) — Electron uses a custom 'app://'
  // protocol handler that resolves them correctly (see electron/main.ts).
  ...(isProd ? {
    output: 'export',
    // trailingSlash ensures pages are exported as dir/index.html instead of dir.html,
    // which works more reliably with the app:// protocol handler's index.html fallback.
    trailingSlash: true,
  } : {}),
  images: {
    // Static export doesn't support the Next.js image optimization server.
    unoptimized: true,
  },
  transpilePackages: ['motion'],
  webpack: (config, { dev }) => {
    if (dev) {
      if (process.env.DISABLE_HMR === 'true') {
        config.watchOptions = { ignored: /.*/ };
      } else {
        // En dev, ignorar las rutas que la propia aplicación modifica en runtime
        // (por ejemplo: openspec/changes/<id>/tasks.md y task-log.md al tildar tareas
        // o sincronizar especificaciones con OpenSpec, y metadatos de Git/CodeGraph).
        // Si webpack las observara en desarrollo, cada escritura de la aplicación dispararía
        // una recompilación y HMR en bucle, provocando "Runtime Error: [object Event]"
        // al usar gitCronos sobre su propio repositorio (caso real 2026-08-26).
        config.watchOptions = {
          ...config.watchOptions,
          ignored: [
            '**/openspec/**',
            '**/.git/**',
            '**/.codegraph/**',
          ],
        };
      }
    }
    return config;
  },
};

export default nextConfig;
