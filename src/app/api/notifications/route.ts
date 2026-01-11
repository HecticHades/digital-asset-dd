import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getNotifications, markAllAsRead, getUnreadCount } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// GET /api/notifications - Get notifications for current user
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })

    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const result = await getNotifications(token.sub, {
      limit: Math.min(limit, 50), // Cap at 50
      offset,
      unreadOnly,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Mark all as read
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })

    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (body.action === 'markAllRead') {
      await markAllAsRead(token.sub)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing notification action:', error)
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    )
  }
}
