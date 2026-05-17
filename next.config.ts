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
  ...(isProd ? { output: 'export' } : {}),
  images: {
    // Static export doesn't support the Next.js image optimization server.
    unoptimized: true,
  },
  transpilePackages: ['motion'],
  webpack: (config, { dev }) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = { ignored: /.*/ };
    }
    return config;
  },
};

export default nextConfig;
