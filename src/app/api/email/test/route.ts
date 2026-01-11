import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/db'
import { sendEmail, isEmailConfigured } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// POST /api/email/test - Send a test email to the current user
export async function POST(request: Request) {
  try {
    const token = await getToken({ req: request as Parameters<typeof getToken>[0]['req'] })

    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if email is configured
    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email service is not configured. Please set RESEND_API_KEY in environment variables.' },
        { status: 400 }
      )
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Send test email
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Email</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; padding: 20px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { background: white; padding: 30px; border: 1px solid #e2e8f0; }
    .success { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Digital Asset Due Diligence</h1>
    </div>
    <div class="content">
      <h2>Test Email</h2>
      <p>Hi ${user.name},</p>

      <div class="success">
        <strong>Your email notifications are working!</strong>
      </div>

      <p>This is a test email to confirm that your email notification settings are configured correctly.</p>

      <p>You will receive emails for:</p>
      <ul>
        <li>Case assignments</li>
        <li>Deadline reminders</li>
        <li>High-risk flag alerts</li>
        <li>Daily/weekly digests (if enabled)</li>
      </ul>

      <p>You can manage your email preferences in the <a href="${APP_URL}/settings/notifications">notification settings</a>.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Digital Asset DD. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`

    const result = await sendEmail({
      to: user.email,
      toName: user.name,
      subject: 'Test Email - Digital Asset DD',
      html,
      template: 'test-email',
      userId: user.id,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent to ${user.email}`,
        messageId: result.messageId
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[API] Error sending test email:', error)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
