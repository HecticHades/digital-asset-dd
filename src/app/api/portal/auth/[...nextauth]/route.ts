import { NextRequest } from 'next/server'
import NextAuth from 'next-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function auth(req: NextRequest) {
  const { portalAuthOptions } = await import('@/lib/portal-auth')
  return NextAuth(portalAuthOptions)(req as any)
}

export const GET = auth
export const POST = auth
