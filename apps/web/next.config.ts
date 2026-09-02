import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@arena/types', '@arena/demo-data'],
  poweredByHeader: false,
};

export default nextConfig;
