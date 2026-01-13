import { NextRequest } from 'next/server'
import NextAuth from 'next-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ nextauth: string[] }>
}

async function auth(req: NextRequest, context: RouteContext) {
  const { authOptions } = await import('@/lib/auth')
  const params = await context.params
  return NextAuth(authOptions)(req as any, { params })
}

export { auth as GET, auth as POST }
