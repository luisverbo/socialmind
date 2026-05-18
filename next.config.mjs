/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // Tell webpack not to bundle these native/binary packages —
  // @sparticuz/chromium downloads its own binary at runtime.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        '@sparticuz/chromium',
        'puppeteer-core',
      ]
    }
    return config
  },
}

export default nextConfig
