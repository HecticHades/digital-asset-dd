import NextAuth from 'next-auth'
import { portalAuthOptions } from '@/lib/portal-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const handler = NextAuth(portalAuthOptions)

export const GET = handler
export const POST = handler
