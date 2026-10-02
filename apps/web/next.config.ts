import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'https-proxy-agent': false,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://localhost:4000'}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
