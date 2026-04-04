/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this line to stop Next.js from buffering streams!
  compress: false, 
  
  allowedDevOrigins: ['unreversible-helga-supermilitary.ngrok-free.dev'],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*'
      }
    ]
  }
};

module.exports = nextConfig;