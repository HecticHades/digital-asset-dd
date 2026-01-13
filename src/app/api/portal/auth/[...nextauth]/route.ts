import { NextRequest } from 'next/server'
import NextAuth from 'next-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ nextauth: string[] }>
}

async function auth(req: NextRequest, context: RouteContext) {
  const { portalAuthOptions } = await import('@/lib/portal-auth')
  const params = await context.params
  return NextAuth(portalAuthOptions)(req as any, { params })
}

export { auth as GET, auth as POST }
