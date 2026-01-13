/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure NEXTAUTH_URL has a value during build to prevent "Invalid URL" errors
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  },
}

module.exports = nextConfig
