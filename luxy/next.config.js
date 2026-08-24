/** @type {import('next').NextConfig} */

// OpenNext (Netlify plugin v5) reads allowedOrigins to validate the Host header
// on ALL requests. We build the list from env vars so it works across environments.
const allowedOrigins = ['localhost:3000']

const netlifyUrl = process.env.NETLIFY_URL || process.env.URL || ''
if (netlifyUrl) {
  try {
    allowedOrigins.push(new URL(netlifyUrl).host)
  } catch (_) {}
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.booking.com' },
      { protocol: 'https', hostname: '**.expedia.com' },
      { protocol: 'https', hostname: 'maps.googleapis.com' },
      { protocol: 'https', hostname: '**.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
}

module.exports = nextConfig
