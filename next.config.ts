import type { NextConfig } from 'next'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL. Revisa .env.local.')
}
const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }],
  },
}

export default nextConfig
