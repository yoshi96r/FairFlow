// apps/web/next.config.mjs
const isProd = process.env.NODE_ENV === 'production';
const rawApiUrl =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (!isProd ? 'http://localhost:3000' : undefined);

const normalizedApiUrl = rawApiUrl?.replace(/\/$/, '');

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!normalizedApiUrl) {
      console.warn(
        '[@fairflow/web] No API_URL/NEXT_PUBLIC_API_URL set. Skipping /api rewrite to avoid crashing serverless functions.'
      );
      return [];
    }

    return [
      { source: '/api/:path*', destination: `${normalizedApiUrl}/api/:path*` },
    ];
  },
};

export default nextConfig;