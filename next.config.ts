import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      // Fichiers statiques (JS/CSS avec hash) — cache long terme OK
      source: '/_next/static/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      // Pages HTML — jamais mises en cache, toujours la version fraîche
      source: '/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Pragma',        value: 'no-cache' },
        { key: 'Expires',       value: '0' },
      ],
    },
  ],
};

export default nextConfig;
