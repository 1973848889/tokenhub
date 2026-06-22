import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['antd', '@ant-design/icons', '@ant-design/nextjs-registry'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080'}/api/v1/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.deepseek.com' },
      { protocol: 'https', hostname: '**.volccdn.com' },
    ],
  },
};

export default nextConfig;
