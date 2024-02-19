/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    async rewrites() {
        return [
          {
            source: '/ers-api/:path*',
            destination: 'http://54.183.62.198:3001/:path*',
          }
        ]
      }
  };

module.exports = nextConfig
