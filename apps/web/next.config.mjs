// apps/web/next.config.mjs
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!API_URL) return [];
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
