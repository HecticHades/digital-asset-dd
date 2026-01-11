import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getUnreadCount } from '@/lib/notifications'

// GET /api/notifications/count - Get unread notification count
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })

    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await getUnreadCount(token.sub)

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error fetching notification count:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification count' },
      { status: 500 }
    )
  }
}
