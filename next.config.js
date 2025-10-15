/** @type {import('next').NextConfig} */
const isStaticExport = process.env.NEXT_OUTPUT_EXPORT === 'true';

const nextConfig = {
  // Only enable static export when explicitly building for production
  // In development (npm run dev), API routes will work normally
  ...(isStaticExport ? { 
     
    
  } : {}),
  transpilePackages: ["@remotion/player", "remotion"],
  // Generate unique build IDs to bust browser cache
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Increase body size limit for API routes (for image uploads)
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self)'
          }
        ]
      }
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle Node.js modules in browser environment
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        encoding: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
