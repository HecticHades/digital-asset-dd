import { prisma } from '@/lib/db'
import { DocumentType } from '@prisma/client'
import { DOCUMENT_TYPE_LABELS } from '@/lib/validators/document-request'

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
async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
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
// Email Layout
// ============================================

function emailLayout(content: string): string {
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
    .alert-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
    .alert-warning { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
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
      <p>&copy; ${new Date().getFullYear()} Digital Asset DD. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`
}

// ============================================
// Document Request Email Template
// ============================================

interface DocumentRequestEmailParams {
  clientEmail: string
  clientName: string
  requestTitle: string
  requestDescription?: string
  documentType: DocumentType
  dueDate?: Date | null
  requestedByName: string
  portalLoginUrl: string
}

/**
 * Generate document request email content
 */
function documentRequestEmailTemplate(params: DocumentRequestEmailParams): { subject: string; html: string } {
  const {
    clientName,
    requestTitle,
    requestDescription,
    documentType,
    dueDate,
    requestedByName,
    portalLoginUrl,
  } = params

  const documentTypeLabel = DOCUMENT_TYPE_LABELS[documentType] || documentType

  const dueDateInfo = dueDate
    ? `<div class="alert alert-warning">
        <strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>`
    : ''

  const content = `
    <h2>Document Request</h2>
    <p>Hi ${clientName},</p>
    <p>A document has been requested for your account. Please upload the following document at your earliest convenience:</p>

    <div class="alert alert-info">
      <strong>${requestTitle}</strong><br>
      <strong>Document Type:</strong> ${documentTypeLabel}
      ${requestDescription ? `<br><br>${requestDescription}` : ''}
    </div>

    ${dueDateInfo}

    <p>To upload your document, please log in to your client portal using the button below:</p>

    <p style="text-align: center; margin: 24px 0;">
      <a href="${portalLoginUrl}" class="button">Log in to Portal</a>
    </p>

    <hr>

    <p style="color: #64748b; font-size: 14px;">
      This request was made by ${requestedByName} from your financial institution.
      If you have any questions, please log in to the portal and send a message to your assigned analyst.
    </p>
  `

  return {
    subject: `Document Request: ${requestTitle}`,
    html: emailLayout(content),
  }
}

/**
 * Send document request email to client
 */
export async function sendDocumentRequestEmail(params: DocumentRequestEmailParams): Promise<EmailResult> {
  const email = documentRequestEmailTemplate(params)

  return sendEmail({
    to: params.clientEmail,
    toName: params.clientName,
    subject: email.subject,
    html: email.html,
    template: 'document-request',
  })
}

/**
 * Generate document submitted notification email content
 */
function documentSubmittedEmailTemplate(params: {
  analystName: string
  clientName: string
  requestTitle: string
  documentType: DocumentType
  caseUrl: string
}): { subject: string; html: string } {
  const { analystName, clientName, requestTitle, documentType, caseUrl } = params
  const documentTypeLabel = DOCUMENT_TYPE_LABELS[documentType] || documentType

  const content = `
    <h2>Document Submitted</h2>
    <p>Hi ${analystName},</p>
    <p>A document has been submitted in response to your request:</p>

    <div class="alert alert-info">
      <strong>Request:</strong> ${requestTitle}<br>
      <strong>Client:</strong> ${clientName}<br>
      <strong>Document Type:</strong> ${documentTypeLabel}
    </div>

    <p>Please review the submitted document and verify or reject it as appropriate.</p>

    <p style="text-align: center; margin: 24px 0;">
      <a href="${caseUrl}" class="button">Review Document</a>
    </p>
  `

  return {
    subject: `Document Submitted: ${requestTitle} - ${clientName}`,
    html: emailLayout(content),
  }
}

/**
 * Send notification to analyst when client submits document
 */
export async function sendDocumentSubmittedNotification(params: {
  analystEmail: string
  analystName: string
  clientName: string
  clientId: string
  requestTitle: string
  documentType: DocumentType
  userId?: string
}): Promise<EmailResult> {
  const caseUrl = `${APP_URL}/clients/${params.clientId}`

  const email = documentSubmittedEmailTemplate({
    analystName: params.analystName,
    clientName: params.clientName,
    requestTitle: params.requestTitle,
    documentType: params.documentType,
    caseUrl,
  })

  return sendEmail({
    to: params.analystEmail,
    toName: params.analystName,
    subject: email.subject,
    html: email.html,
    template: 'document-submitted',
    userId: params.userId,
  })
}
