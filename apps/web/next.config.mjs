// apps/web/next.config.mjs
const isProd = process.env.NODE_ENV === 'production';
const rawApiUrl =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (!isProd ? 'http://localhost:3000' : undefined);

const normalizedApiUrl = rawApiUrl?.replace(/\/$/, '');

function isLocalhostUrl(url) {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local')
    );
  } catch {
    return false;
  }
}

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!normalizedApiUrl) {
      console.warn(
        '[@fairflow/web] No API_URL/NEXT_PUBLIC_API_URL set. Skipping /api rewrite to avoid crashing serverless functions.'
      );
      return [];
    }

    if (isProd && isLocalhostUrl(normalizedApiUrl)) {
      console.warn(
        '[@fairflow/web] API_URL/NEXT_PUBLIC_API_URL points to localhost in production. Skipping /api rewrite to prevent proxying Vercel functions back into themselves.'
      );
      return [];
    }

    return [
      { source: '/api/:path*', destination: `${normalizedApiUrl}/api/:path*` },
    ];
  },
};

export default nextConfig;