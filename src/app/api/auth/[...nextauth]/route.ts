import { NextRequest } from 'next/server'
import NextAuth from 'next-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function auth(req: NextRequest) {
  const { authOptions } = await import('@/lib/auth')
  return NextAuth(authOptions)(req as any)
}

export const GET = auth
export const POST = auth
