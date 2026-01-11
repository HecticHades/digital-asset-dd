import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// GET /api/email/unsubscribe?token=xxx&type=all|digest|specific
// This endpoint handles unsubscribe links from emails
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const type = searchParams.get('type') || 'all'

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    // Token format: base64(userId:timestamp:hash)
    // Decode the token
    let userId: string
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const parts = decoded.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid token format')
      }
      userId = parts[0]
      const timestamp = parseInt(parts[1], 10)
      const hash = parts[2]

      // Verify the hash
      const expectedHash = crypto
        .createHmac('sha256', process.env.NEXTAUTH_SECRET || 'fallback-secret')
        .update(`${userId}:${timestamp}`)
        .digest('hex')
        .substring(0, 16)

      if (hash !== expectedHash) {
        throw new Error('Invalid token hash')
      }

      // Check if token is expired (30 days)
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      if (Date.now() - timestamp > thirtyDaysMs) {
        throw new Error('Token expired')
      }
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    // Update preferences based on type
    let updateData: Record<string, boolean> = {}

    switch (type) {
      case 'all':
        updateData = { emailEnabled: false }
        break
      case 'digest':
        updateData = { digestEnabled: false }
        break
      case 'case-assigned':
        updateData = { emailCaseAssigned: false }
        break
      case 'deadline-reminder':
        updateData = { emailDeadlineReminder: false }
        break
      case 'high-risk-flag':
        updateData = { emailHighRiskFlag: false }
        break
      default:
        updateData = { emailEnabled: false }
    }

    await prisma.notificationPreference.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    })

    // Return HTML page
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - Digital Asset DD</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    h1 { color: #1e293b; margin-bottom: 16px; }
    p { color: #64748b; line-height: 1.6; }
    .success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px 16px; border-radius: 8px; margin: 20px 0; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Successfully Unsubscribed</h1>
    <div class="success">
      You have been unsubscribed from ${type === 'all' ? 'all email notifications' : type.replace(/-/g, ' ') + ' emails'}.
    </div>
    <p>If you change your mind, you can re-enable notifications in your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/notifications">notification settings</a>.</p>
  </div>
</body>
</html>
`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    console.error('[API] Error processing unsubscribe:', error)
    return NextResponse.json({ error: 'Failed to process unsubscribe' }, { status: 500 })
  }
}

// Helper function to generate unsubscribe token
function generateUnsubscribeToken(userId: string): string {
  const timestamp = Date.now()
  const hash = crypto
    .createHmac('sha256', process.env.NEXTAUTH_SECRET || 'fallback-secret')
    .update(`${userId}:${timestamp}`)
    .digest('hex')
    .substring(0, 16)

  return Buffer.from(`${userId}:${timestamp}:${hash}`).toString('base64')
}
