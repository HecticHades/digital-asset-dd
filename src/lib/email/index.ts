import { prisma } from '@/lib/db'

// ============================================
// Types
// ============================================

export interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  html: string
  template: string
  userId?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// ============================================
// Email Service Configuration
// ============================================

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com'
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Digital Asset DD'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Check if email sending is configured
 */
export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY
}

// ============================================
// Core Email Sending
// ============================================

/**
 * Send an email using Resend
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const { to, toName, subject, html, template, userId } = params

  // Check if email is configured
  if (!isEmailConfigured()) {
    console.log('[Email] Resend API key not configured - skipping email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
        to: toName ? `${toName} <${to}>` : to,
        subject,
        html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      // Log failed email
      await prisma.emailLog.create({
        data: {
          toEmail: to,
          toName,
          subject,
          template,
          status: 'FAILED',
          errorMessage: data.message || JSON.stringify(data),
          userId,
        },
      })

      console.error('[Email] Failed to send:', data)
      return { success: false, error: data.message || 'Failed to send email' }
    }

    // Log successful email
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        toName,
        subject,
        template,
        status: 'SENT',
        messageId: data.id,
        userId,
      },
    })

    console.log('[Email] Sent successfully:', data.id)
    return { success: true, messageId: data.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log failed email
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        toName,
        subject,
        template,
        status: 'FAILED',
        errorMessage,
        userId,
      },
    })

    console.error('[Email] Error sending email:', error)
    return { success: false, error: errorMessage }
  }
}

// ============================================
// Email Templates
// ============================================

/**
 * Generate base email layout
 */
function emailLayout(content: string, unsubscribeLink?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital Asset DD</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; padding: 20px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { background: white; padding: 30px; border: 1px solid #e2e8f0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .button:hover { background: #1d4ed8; }
    .footer { padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
    .footer a { color: #64748b; }
    .alert { padding: 12px 16px; border-radius: 6px; margin: 16px 0; }
    .alert-danger { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .alert-warning { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    .alert-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Digital Asset Due Diligence</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This email was sent from Digital Asset DD.</p>
      ${unsubscribeLink ? `<p><a href="${unsubscribeLink}">Manage notification preferences</a></p>` : ''}
      <p>&copy; ${new Date().getFullYear()} Digital Asset DD. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`
}

// ============================================
// Notification Email Templates
// ============================================

/**
 * Case assigned email
 */
export function caseAssignedEmail(params: {
  userName: string
  caseTitle: string
  caseId: string
  clientName: string
  assignedByName: string
  dueDate?: Date | null
}): { subject: string; html: string } {
  const { userName, caseTitle, caseId, clientName, assignedByName, dueDate } = params
  const caseUrl = `${APP_URL}/cases/${caseId}`
  const preferencesUrl = `${APP_URL}/settings/notifications`

  const content = `
    <h2>Case Assigned to You</h2>
    <p>Hi ${userName},</p>
    <p>${assignedByName} has assigned a new case to you:</p>

    <div class="alert alert-info">
      <strong>Case:</strong> ${caseTitle}<br>
      <strong>Client:</strong> ${clientName}<br>
      ${dueDate ? `<strong>Due Date:</strong> ${dueDate.toLocaleDateString()}` : ''}
    </div>

    <p>Please review the case and begin your analysis.</p>

    <p style="text-align: center; margin: 24px 0;">
      <a href="${caseUrl}" class="button">View Case</a>
    </p>
  `

  return {
    subject: `Case Assigned: ${caseTitle}`,
    html: emailLayout(content, preferencesUrl),
  }
}

/**
 * Deadline reminder email
 */
export function deadlineReminderEmail(params: {
  userName: string
  caseTitle: string
  caseId: string
  clientName: string
  dueDate: Date
  daysUntilDue: number
}): { subject: string; html: string } {
  const { userName, caseTitle, caseId, clientName, dueDate, daysUntilDue } = params
  const caseUrl = `${APP_URL}/cases/${caseId}`
  const preferencesUrl = `${APP_URL}/settings/notifications`

  const urgencyClass = daysUntilDue <= 1 ? 'alert-danger' : daysUntilDue <= 3 ? 'alert-warning' : 'alert-info'
  const urgencyText = daysUntilDue <= 0
    ? 'This case is overdue!'
    : daysUntilDue === 1
    ? 'This case is due tomorrow!'
    : `This case is due in ${daysUntilDue} days.`

  const content = `
    <h2>Deadline Reminder</h2>
    <p>Hi ${userName},</p>

    <div class="alert ${urgencyClass}">
      <strong>${urgencyText}</strong>
    </div>

    <p>The following case requires your attention:</p>

    <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <strong>Case:</strong> ${caseTitle}<br>
      <strong>Client:</strong> ${clientName}<br>
      <strong>Due Date:</strong> ${dueDate.toLocaleDateString()}
    </div>

    <p>Please ensure the case is completed before the deadline.</p>

    <p style="text-align: center; margin: 24px 0;">
      <a href="${caseUrl}" class="button">View Case</a>
    </p>
  `

  return {
    subject: `${daysUntilDue <= 1 ? 'URGENT: ' : ''}Deadline Reminder: ${caseTitle}`,
    html: emailLayout(content, preferencesUrl),
  }
}

/**
 * High risk flag email
 */
export function highRiskFlagEmail(params: {
  userName: string
  caseTitle: string
  caseId: string
  clientName: string
  flagTitle: string
  flagDescription: string
  severity: string
}): { subject: string; html: string } {
  const { userName, caseTitle, caseId, clientName, flagTitle, flagDescription, severity } = params
  const caseUrl = `${APP_URL}/cases/${caseId}`
  const preferencesUrl = `${APP_URL}/settings/notifications`

  const severityClass = severity === 'CRITICAL' ? 'alert-danger' : 'alert-warning'

  const content = `
    <h2>High Risk Flag Detected</h2>
    <p>Hi ${userName},</p>
    <p>A ${severity.toLowerCase()} severity risk flag has been detected in one of your cases:</p>

    <div class="alert ${severityClass}">
      <strong>${severity}: ${flagTitle}</strong><br>
      ${flagDescription}
    </div>

    <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <strong>Case:</strong> ${caseTitle}<br>
      <strong>Client:</strong> ${clientName}
    </div>

    <p>Please review this finding and take appropriate action.</p>

    <p style="text-align: center; margin: 24px 0;">
      <a href="${caseUrl}" class="button">Review Case</a>
    </p>
  `

  return {
    subject: `${severity} Risk Flag: ${caseTitle}`,
    html: emailLayout(content, preferencesUrl),
  }
}

/**
 * Daily/weekly digest email
 */
export function digestEmail(params: {
  userName: string
  frequency: 'DAILY' | 'WEEKLY'
  stats: {
    newCases: number
    completedCases: number
    pendingReviews: number
    newRiskFlags: number
    upcomingDeadlines: number
  }
  highlights: Array<{
    type: string
    title: string
    link: string
  }>
}): { subject: string; html: string } {
  const { userName, frequency, stats, highlights } = params
  const dashboardUrl = `${APP_URL}/dashboard`
  const preferencesUrl = `${APP_URL}/settings/notifications`

  const periodLabel = frequency === 'DAILY' ? 'today' : 'this week'

  const highlightsList = highlights.length > 0
    ? highlights.map(h => `<li><a href="${h.link}">${h.title}</a></li>`).join('')
    : '<li>No notable activity</li>'

  const content = `
    <h2>${frequency === 'DAILY' ? 'Daily' : 'Weekly'} Summary</h2>
    <p>Hi ${userName},</p>
    <p>Here's your activity summary for ${periodLabel}:</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 12px; background: #eff6ff; border-radius: 6px 0 0 0;">
          <strong style="font-size: 24px; color: #1e40af;">${stats.newCases}</strong><br>
          <span style="color: #64748b; font-size: 12px;">New Cases</span>
        </td>
        <td style="padding: 12px; background: #f0fdf4;">
          <strong style="font-size: 24px; color: #166534;">${stats.completedCases}</strong><br>
          <span style="color: #64748b; font-size: 12px;">Completed</span>
        </td>
        <td style="padding: 12px; background: #fffbeb; border-radius: 0 6px 0 0;">
          <strong style="font-size: 24px; color: #92400e;">${stats.pendingReviews}</strong><br>
          <span style="color: #64748b; font-size: 12px;">Pending Review</span>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 12px; background: ${stats.newRiskFlags > 0 ? '#fef2f2' : '#f8fafc'}; border-radius: 0 0 0 6px;">
          <strong style="font-size: 24px; color: ${stats.newRiskFlags > 0 ? '#991b1b' : '#64748b'};">${stats.newRiskFlags}</strong><br>
          <span style="color: #64748b; font-size: 12px;">Risk Flags</span>
        </td>
        <td style="padding: 12px; background: ${stats.upcomingDeadlines > 0 ? '#fef3cd' : '#f8fafc'}; border-radius: 0 0 6px 0;">
          <strong style="font-size: 24px; color: ${stats.upcomingDeadlines > 0 ? '#856404' : '#64748b'};">${stats.upcomingDeadlines}</strong><br>
          <span style="color: #64748b; font-size: 12px;">Due Soon</span>
        </td>
      </tr>
    </table>

    <hr>

    <h3>Highlights</h3>
    <ul>${highlightsList}</ul>

    <p style="text-align: center; margin: 24px 0;">
      <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
    </p>
  `

  return {
    subject: `Your ${frequency === 'DAILY' ? 'Daily' : 'Weekly'} Summary - Digital Asset DD`,
    html: emailLayout(content, preferencesUrl),
  }
}

// ============================================
// Event-Based Email Sending
// ============================================

/**
 * Send case assignment email if user has it enabled
 */
export async function sendCaseAssignmentEmail(params: {
  userId: string
  userEmail: string
  userName: string
  caseId: string
  caseTitle: string
  clientName: string
  assignedByName: string
  dueDate?: Date | null
}): Promise<EmailResult> {
  // Check user preferences
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId: params.userId },
  })

  // If preferences exist and email is disabled, skip
  if (preferences && (!preferences.emailEnabled || !preferences.emailCaseAssigned)) {
    return { success: false, error: 'Email notifications disabled for user' }
  }

  const email = caseAssignedEmail({
    userName: params.userName,
    caseTitle: params.caseTitle,
    caseId: params.caseId,
    clientName: params.clientName,
    assignedByName: params.assignedByName,
    dueDate: params.dueDate,
  })

  return sendEmail({
    to: params.userEmail,
    toName: params.userName,
    subject: email.subject,
    html: email.html,
    template: 'case-assigned',
    userId: params.userId,
  })
}

/**
 * Send deadline reminder email if user has it enabled
 */
export async function sendDeadlineReminderEmail(params: {
  userId: string
  userEmail: string
  userName: string
  caseId: string
  caseTitle: string
  clientName: string
  dueDate: Date
  daysUntilDue: number
}): Promise<EmailResult> {
  // Check user preferences
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId: params.userId },
  })

  // If preferences exist and email is disabled, skip
  if (preferences && (!preferences.emailEnabled || !preferences.emailDeadlineReminder)) {
    return { success: false, error: 'Email notifications disabled for user' }
  }

  const email = deadlineReminderEmail({
    userName: params.userName,
    caseTitle: params.caseTitle,
    caseId: params.caseId,
    clientName: params.clientName,
    dueDate: params.dueDate,
    daysUntilDue: params.daysUntilDue,
  })

  return sendEmail({
    to: params.userEmail,
    toName: params.userName,
    subject: email.subject,
    html: email.html,
    template: 'deadline-reminder',
    userId: params.userId,
  })
}

/**
 * Send high risk flag email if user has it enabled
 */
export async function sendHighRiskFlagEmail(params: {
  userId: string
  userEmail: string
  userName: string
  caseId: string
  caseTitle: string
  clientName: string
  flagTitle: string
  flagDescription: string
  severity: string
}): Promise<EmailResult> {
  // Only send for HIGH or CRITICAL severity
  if (params.severity !== 'HIGH' && params.severity !== 'CRITICAL') {
    return { success: false, error: 'Only HIGH or CRITICAL severity flags trigger emails' }
  }

  // Check user preferences
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId: params.userId },
  })

  // If preferences exist and email is disabled, skip
  if (preferences && (!preferences.emailEnabled || !preferences.emailHighRiskFlag)) {
    return { success: false, error: 'Email notifications disabled for user' }
  }

  const email = highRiskFlagEmail({
    userName: params.userName,
    caseTitle: params.caseTitle,
    caseId: params.caseId,
    clientName: params.clientName,
    flagTitle: params.flagTitle,
    flagDescription: params.flagDescription,
    severity: params.severity,
  })

  return sendEmail({
    to: params.userEmail,
    toName: params.userName,
    subject: email.subject,
    html: email.html,
    template: 'high-risk-flag',
    userId: params.userId,
  })
}

/**
 * Send digest email
 */
export async function sendDigestEmailToUser(params: {
  userId: string
  userEmail: string
  userName: string
  frequency: 'DAILY' | 'WEEKLY'
  stats: {
    newCases: number
    completedCases: number
    pendingReviews: number
    newRiskFlags: number
    upcomingDeadlines: number
  }
  highlights: Array<{
    type: string
    title: string
    link: string
  }>
}): Promise<EmailResult> {
  // Check user preferences
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId: params.userId },
  })

  // If preferences exist and digest is disabled, skip
  if (preferences && (!preferences.emailEnabled || !preferences.digestEnabled)) {
    return { success: false, error: 'Digest emails disabled for user' }
  }

  // Check frequency matches
  if (preferences && preferences.digestFrequency !== params.frequency) {
    return { success: false, error: 'Digest frequency mismatch' }
  }

  const email = digestEmail({
    userName: params.userName,
    frequency: params.frequency,
    stats: params.stats,
    highlights: params.highlights,
  })

  const result = await sendEmail({
    to: params.userEmail,
    toName: params.userName,
    subject: email.subject,
    html: email.html,
    template: `digest-${params.frequency.toLowerCase()}`,
    userId: params.userId,
  })

  // Update last digest sent time
  if (result.success) {
    await prisma.notificationPreference.update({
      where: { userId: params.userId },
      data: { lastDigestSentAt: new Date() },
    })
  }

  return result
}

// ============================================
// Digest Job Helpers
// ============================================

/**
 * Get all users who should receive a digest email
 */
export async function getUsersForDigest(frequency: 'DAILY' | 'WEEKLY') {
  const now = new Date()
  const cutoffDate = new Date()

  if (frequency === 'DAILY') {
    // Daily: last sent more than 23 hours ago (or never)
    cutoffDate.setHours(cutoffDate.getHours() - 23)
  } else {
    // Weekly: last sent more than 6.5 days ago (or never)
    cutoffDate.setDate(cutoffDate.getDate() - 6)
    cutoffDate.setHours(cutoffDate.getHours() - 12)
  }

  const preferences = await prisma.notificationPreference.findMany({
    where: {
      emailEnabled: true,
      digestEnabled: true,
      digestFrequency: frequency,
      OR: [
        { lastDigestSentAt: null },
        { lastDigestSentAt: { lt: cutoffDate } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          organizationId: true,
        },
      },
    },
  })

  return preferences.map(p => p.user)
}

/**
 * Get digest stats for a user
 */
export async function getDigestStatsForUser(userId: string, organizationId: string, frequency: 'DAILY' | 'WEEKLY') {
  const cutoffDate = new Date()
  if (frequency === 'DAILY') {
    cutoffDate.setDate(cutoffDate.getDate() - 1)
  } else {
    cutoffDate.setDate(cutoffDate.getDate() - 7)
  }

  const upcomingDeadlineDate = new Date()
  upcomingDeadlineDate.setDate(upcomingDeadlineDate.getDate() + 3)

  const [newCases, completedCases, pendingReviews, newRiskFlags, upcomingDeadlines] = await Promise.all([
    // New cases assigned to user
    prisma.case.count({
      where: {
        organizationId,
        assignedToId: userId,
        createdAt: { gte: cutoffDate },
      },
    }),
    // Cases completed by user
    prisma.case.count({
      where: {
        organizationId,
        assignedToId: userId,
        status: { in: ['COMPLETED', 'APPROVED'] },
        updatedAt: { gte: cutoffDate },
      },
    }),
    // Cases pending review
    prisma.case.count({
      where: {
        organizationId,
        assignedToId: userId,
        status: 'PENDING_REVIEW',
      },
    }),
    // New risk flags
    prisma.finding.count({
      where: {
        organizationId,
        case: { assignedToId: userId },
        createdAt: { gte: cutoffDate },
        severity: { in: ['HIGH', 'CRITICAL'] },
      },
    }),
    // Cases with upcoming deadlines
    prisma.case.count({
      where: {
        organizationId,
        assignedToId: userId,
        status: { in: ['DRAFT', 'IN_PROGRESS'] },
        dueDate: {
          gte: new Date(),
          lte: upcomingDeadlineDate,
        },
      },
    }),
  ])

  return {
    newCases,
    completedCases,
    pendingReviews,
    newRiskFlags,
    upcomingDeadlines,
  }
}
