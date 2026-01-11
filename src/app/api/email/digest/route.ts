import { NextResponse } from 'next/server'
import {
  getUsersForDigest,
  getDigestStatsForUser,
  sendDigestEmailToUser,
  isEmailConfigured,
} from '@/lib/email'
import { prisma } from '@/lib/db'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// POST /api/email/digest - Send digest emails
// This endpoint can be called by a cron job service (like Vercel Cron)
// Body: { frequency: 'DAILY' | 'WEEKLY', apiKey: string }
export async function POST(request: Request) {
  try {
    // Simple API key authentication for cron jobs
    const body = await request.json()
    const { frequency, apiKey } = body

    // Validate API key (optional but recommended)
    const expectedApiKey = process.env.DIGEST_CRON_API_KEY
    if (expectedApiKey && apiKey !== expectedApiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Validate frequency
    if (frequency !== 'DAILY' && frequency !== 'WEEKLY') {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be DAILY or WEEKLY' },
        { status: 400 }
      )
    }

    // Check if email is configured
    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email service not configured', sent: 0 },
        { status: 200 }
      )
    }

    // Get users who should receive digest
    const users = await getUsersForDigest(frequency)

    if (users.length === 0) {
      return NextResponse.json({ message: 'No users need digest', sent: 0 })
    }

    // Send digest to each user
    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
    }

    for (const user of users) {
      try {
        // Get stats for user
        const stats = await getDigestStatsForUser(user.id, user.organizationId, frequency)

        // Skip if no activity
        if (
          stats.newCases === 0 &&
          stats.completedCases === 0 &&
          stats.pendingReviews === 0 &&
          stats.newRiskFlags === 0 &&
          stats.upcomingDeadlines === 0
        ) {
          results.skipped++
          continue
        }

        // Get highlights (recent notable items)
        const highlights = await getHighlightsForUser(user.id, user.organizationId, frequency)

        // Send digest email
        const result = await sendDigestEmailToUser({
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          frequency,
          stats,
          highlights,
        })

        if (result.success) {
          results.sent++
        } else {
          results.failed++
        }
      } catch (error) {
        console.error(`[Digest] Error sending digest to ${user.email}:`, error)
        results.failed++
      }
    }

    return NextResponse.json({
      message: `Digest emails processed`,
      ...results,
    })
  } catch (error) {
    console.error('[API] Error sending digest emails:', error)
    return NextResponse.json({ error: 'Failed to send digest emails' }, { status: 500 })
  }
}

// Helper function to get highlights for digest
async function getHighlightsForUser(userId: string, organizationId: string, frequency: 'DAILY' | 'WEEKLY') {
  const cutoffDate = new Date()
  if (frequency === 'DAILY') {
    cutoffDate.setDate(cutoffDate.getDate() - 1)
  } else {
    cutoffDate.setDate(cutoffDate.getDate() - 7)
  }

  const highlights: Array<{ type: string; title: string; link: string }> = []

  // Get high-priority findings
  const criticalFindings = await prisma.finding.findMany({
    where: {
      organizationId,
      case: { assignedToId: userId },
      createdAt: { gte: cutoffDate },
      severity: 'CRITICAL',
      isResolved: false,
    },
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: {
      case: {
        select: { id: true, title: true },
      },
    },
  })

  for (const finding of criticalFindings) {
    highlights.push({
      type: 'critical_finding',
      title: `Critical: ${finding.title} (${finding.case.title})`,
      link: `${APP_URL}/cases/${finding.caseId}`,
    })
  }

  // Get overdue cases
  const overdueCases = await prisma.case.findMany({
    where: {
      organizationId,
      assignedToId: userId,
      status: { in: ['DRAFT', 'IN_PROGRESS'] },
      dueDate: { lt: new Date() },
    },
    take: 3,
    orderBy: { dueDate: 'asc' },
  })

  for (const caseItem of overdueCases) {
    highlights.push({
      type: 'overdue_case',
      title: `Overdue: ${caseItem.title}`,
      link: `${APP_URL}/cases/${caseItem.id}`,
    })
  }

  // Get newly approved cases
  const approvedCases = await prisma.case.findMany({
    where: {
      organizationId,
      assignedToId: userId,
      status: 'APPROVED',
      updatedAt: { gte: cutoffDate },
    },
    take: 2,
    orderBy: { updatedAt: 'desc' },
  })

  for (const caseItem of approvedCases) {
    highlights.push({
      type: 'approved_case',
      title: `Approved: ${caseItem.title}`,
      link: `${APP_URL}/cases/${caseItem.id}`,
    })
  }

  return highlights.slice(0, 5) // Max 5 highlights
}
