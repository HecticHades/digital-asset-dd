import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/db'
import { updateEmailPreferencesSchema } from '@/lib/validators/notification'

// GET /api/email/preferences - Get email preferences
export async function GET(request: Request) {
  try {
    const token = await getToken({ req: request as Parameters<typeof getToken>[0]['req'] })

    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create preferences
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: token.sub },
    })

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: { userId: token.sub },
      })
    }

    return NextResponse.json({
      emailEnabled: preferences.emailEnabled,
      emailCaseAssigned: preferences.emailCaseAssigned,
      emailDeadlineReminder: preferences.emailDeadlineReminder,
      emailHighRiskFlag: preferences.emailHighRiskFlag,
      digestEnabled: preferences.digestEnabled,
      digestFrequency: preferences.digestFrequency,
    })
  } catch (error) {
    console.error('[API] Error getting email preferences:', error)
    return NextResponse.json({ error: 'Failed to get preferences' }, { status: 500 })
  }
}

// PUT /api/email/preferences - Update email preferences
export async function PUT(request: Request) {
  try {
    const token = await getToken({ req: request as Parameters<typeof getToken>[0]['req'] })

    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateEmailPreferencesSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: token.sub },
      update: validation.data,
      create: {
        userId: token.sub,
        ...validation.data,
      },
    })

    return NextResponse.json({
      emailEnabled: preferences.emailEnabled,
      emailCaseAssigned: preferences.emailCaseAssigned,
      emailDeadlineReminder: preferences.emailDeadlineReminder,
      emailHighRiskFlag: preferences.emailHighRiskFlag,
      digestEnabled: preferences.digestEnabled,
      digestFrequency: preferences.digestFrequency,
    })
  } catch (error) {
    console.error('[API] Error updating email preferences:', error)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
