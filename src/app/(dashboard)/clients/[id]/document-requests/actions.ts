'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import {
  createDocumentRequestSchema,
  updateDocumentRequestSchema,
  cancelDocumentRequestSchema,
  processDocumentRequestSchema,
  type CreateDocumentRequestInput,
  type UpdateDocumentRequestInput,
} from '@/lib/validators/document-request'
import { sendDocumentRequestEmail } from '@/lib/email/document-request'
import { notifyDocumentUploaded } from '@/lib/notifications'
import { DocumentRequestStatus } from '@prisma/client'

// TODO: Replace with actual user from session once fully integrated
const TEMP_ORG_ID = 'temp-org-id'
const TEMP_USER_ID = 'temp-user-id'

/**
 * Get authenticated user info (with dev fallback)
 */
async function getAuthenticatedUser() {
  // In a real implementation, this would use getServerSession
  // For now, we return a dev fallback
  return {
    id: TEMP_USER_ID,
    organizationId: TEMP_ORG_ID,
    name: 'Dev User',
    email: 'dev@example.com',
  }
}

/**
 * Create a new document request
 */
export async function createDocumentRequest(input: CreateDocumentRequestInput) {
  const validation = createDocumentRequestSchema.safeParse(input)
  if (!validation.success) {
    return { success: false, error: 'Invalid input', details: validation.error.flatten() }
  }

  const user = await getAuthenticatedUser()
  const { clientId, title, description, category, priority, dueDate, sendEmail } = validation.data

  try {
    // Verify client exists and user has access
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: user.organizationId,
      },
      include: {
        portalUser: true,
      },
    })

    if (!client) {
      return { success: false, error: 'Client not found' }
    }

    // Create the document request
    const request = await prisma.documentRequest.create({
      data: {
        title,
        description,
        category,
        priority,
        dueDate,
        organizationId: user.organizationId,
        clientId,
        requestedById: user.id,
      },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Send email to client if they have a portal account and email is requested
    if (sendEmail && client.portalUser && client.email) {
      try {
        const emailResult = await sendDocumentRequestEmail({
          clientEmail: client.email,
          clientName: client.name,
          requestTitle: title,
          requestDescription: description || undefined,
          documentType: category,
          dueDate,
          requestedByName: user.name,
          portalLoginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/login`,
        })

        if (emailResult.success && emailResult.messageId) {
          // Update request with email tracking info
          await prisma.documentRequest.update({
            where: { id: request.id },
            data: {
              emailSentAt: new Date(),
              emailMessageId: emailResult.messageId,
            },
          })
        }
      } catch (emailError) {
        console.error('Failed to send document request email:', emailError)
        // Don't fail the request creation if email fails
      }
    }

    revalidatePath(`/clients/${clientId}`)
    return { success: true, request }
  } catch (error) {
    console.error('Failed to create document request:', error)
    return { success: false, error: 'Failed to create document request' }
  }
}

/**
 * Get document requests for a client
 */
export async function getDocumentRequests(clientId: string) {
  const user = await getAuthenticatedUser()

  return prisma.documentRequest.findMany({
    where: {
      clientId,
      organizationId: user.organizationId,
    },
    include: {
      requestedBy: {
        select: { id: true, name: true, email: true },
      },
      document: {
        select: {
          id: true,
          filename: true,
          originalName: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' }, // Pending first
      { createdAt: 'desc' },
    ],
  })
}

/**
 * Get a single document request by ID
 */
export async function getDocumentRequest(requestId: string) {
  const user = await getAuthenticatedUser()

  return prisma.documentRequest.findFirst({
    where: {
      id: requestId,
      organizationId: user.organizationId,
    },
    include: {
      client: {
        select: { id: true, name: true, email: true },
      },
      requestedBy: {
        select: { id: true, name: true, email: true },
      },
      document: true,
    },
  })
}

/**
 * Update a document request
 */
export async function updateDocumentRequest(input: UpdateDocumentRequestInput) {
  const validation = updateDocumentRequestSchema.safeParse(input)
  if (!validation.success) {
    return { success: false, error: 'Invalid input', details: validation.error.flatten() }
  }

  const user = await getAuthenticatedUser()
  const { requestId, ...updates } = validation.data

  try {
    const request = await prisma.documentRequest.findFirst({
      where: {
        id: requestId,
        organizationId: user.organizationId,
      },
    })

    if (!request) {
      return { success: false, error: 'Document request not found' }
    }

    // Can only update pending requests
    if (request.status !== 'PENDING') {
      return { success: false, error: 'Can only update pending requests' }
    }

    const updated = await prisma.documentRequest.update({
      where: { id: requestId },
      data: updates,
    })

    revalidatePath(`/clients/${request.clientId}`)
    return { success: true, request: updated }
  } catch (error) {
    console.error('Failed to update document request:', error)
    return { success: false, error: 'Failed to update document request' }
  }
}

/**
 * Cancel a document request
 */
export async function cancelDocumentRequest(input: { requestId: string; notes?: string }) {
  const validation = cancelDocumentRequestSchema.safeParse(input)
  if (!validation.success) {
    return { success: false, error: 'Invalid input' }
  }

  const user = await getAuthenticatedUser()
  const { requestId, notes } = validation.data

  try {
    const request = await prisma.documentRequest.findFirst({
      where: {
        id: requestId,
        organizationId: user.organizationId,
      },
    })

    if (!request) {
      return { success: false, error: 'Document request not found' }
    }

    // Can only cancel pending or rejected requests
    if (!['PENDING', 'REJECTED'].includes(request.status)) {
      return { success: false, error: 'Can only cancel pending or rejected requests' }
    }

    const updated = await prisma.documentRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        notes: notes || request.notes,
      },
    })

    revalidatePath(`/clients/${request.clientId}`)
    return { success: true, request: updated }
  } catch (error) {
    console.error('Failed to cancel document request:', error)
    return { success: false, error: 'Failed to cancel document request' }
  }
}

/**
 * Process a submitted document (verify or reject)
 */
export async function processDocumentRequest(input: { requestId: string; action: 'VERIFIED' | 'REJECTED'; notes?: string }) {
  const validation = processDocumentRequestSchema.safeParse(input)
  if (!validation.success) {
    return { success: false, error: 'Invalid input' }
  }

  const user = await getAuthenticatedUser()
  const { requestId, action, notes } = validation.data

  try {
    const request = await prisma.documentRequest.findFirst({
      where: {
        id: requestId,
        organizationId: user.organizationId,
      },
      include: {
        document: true,
      },
    })

    if (!request) {
      return { success: false, error: 'Document request not found' }
    }

    if (request.status !== 'SUBMITTED') {
      return { success: false, error: 'Can only process submitted requests' }
    }

    if (!request.document) {
      return { success: false, error: 'No document submitted' }
    }

    // Update request status
    const updated = await prisma.documentRequest.update({
      where: { id: requestId },
      data: {
        status: action as DocumentRequestStatus,
        notes: notes || request.notes,
      },
    })

    // Also update the document status to match
    await prisma.document.update({
      where: { id: request.document.id },
      data: {
        status: action === 'VERIFIED' ? 'VERIFIED' : 'REJECTED',
        notes: notes || null,
        verifiedAt: new Date(),
        verifiedById: user.id,
      },
    })

    revalidatePath(`/clients/${request.clientId}`)
    return { success: true, request: updated }
  } catch (error) {
    console.error('Failed to process document request:', error)
    return { success: false, error: 'Failed to process document request' }
  }
}

/**
 * Submit a document for a request (called from portal)
 */
export async function submitDocumentForRequest(requestId: string, documentId: string, clientId: string) {
  try {
    const request = await prisma.documentRequest.findFirst({
      where: {
        id: requestId,
        clientId,
        status: { in: ['PENDING', 'REJECTED'] },
      },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        client: {
          select: { name: true },
        },
      },
    })

    if (!request) {
      return { success: false, error: 'Document request not found or already processed' }
    }

    // Verify the document exists and belongs to the client
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        clientId,
      },
    })

    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    // Update the request
    const updated = await prisma.documentRequest.update({
      where: { id: requestId },
      data: {
        status: 'SUBMITTED',
        documentId,
      },
    })

    // Notify the analyst who created the request
    if (request.requestedBy) {
      try {
        // Get the organizationId from the document
        const orgId = document.organizationId
        await notifyDocumentUploaded({
          userId: request.requestedBy.id,
          caseId: null,
          clientId,
          documentName: document.originalName,
          uploadedByName: request.client.name,
          organizationId: orgId,
        })
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError)
      }
    }

    revalidatePath(`/clients/${clientId}`)
    return { success: true, request: updated }
  } catch (error) {
    console.error('Failed to submit document for request:', error)
    return { success: false, error: 'Failed to submit document' }
  }
}

/**
 * Get pending document requests for a client (portal view)
 */
export async function getClientPendingRequests(clientId: string) {
  return prisma.documentRequest.findMany({
    where: {
      clientId,
      status: { in: ['PENDING', 'REJECTED'] },
    },
    include: {
      requestedBy: {
        select: { name: true },
      },
      document: {
        select: {
          id: true,
          filename: true,
          originalName: true,
          status: true,
        },
      },
    },
    orderBy: [
      { priority: 'desc' }, // Urgent first
      { dueDate: 'asc' }, // Earliest due date first
      { createdAt: 'desc' },
    ],
  })
}

/**
 * Resend email notification for a document request
 */
export async function resendDocumentRequestEmail(requestId: string) {
  const user = await getAuthenticatedUser()

  try {
    const request = await prisma.documentRequest.findFirst({
      where: {
        id: requestId,
        organizationId: user.organizationId,
      },
      include: {
        client: {
          include: {
            portalUser: true,
          },
        },
        requestedBy: {
          select: { name: true },
        },
      },
    })

    if (!request) {
      return { success: false, error: 'Document request not found' }
    }

    if (!request.client.email || !request.client.portalUser) {
      return { success: false, error: 'Client does not have a portal account or email' }
    }

    const emailResult = await sendDocumentRequestEmail({
      clientEmail: request.client.email,
      clientName: request.client.name,
      requestTitle: request.title,
      requestDescription: request.description || undefined,
      documentType: request.category,
      dueDate: request.dueDate,
      requestedByName: request.requestedBy?.name || 'Your analyst',
      portalLoginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/login`,
    })

    if (emailResult.success) {
      await prisma.documentRequest.update({
        where: { id: requestId },
        data: {
          emailSentAt: new Date(),
          emailMessageId: emailResult.messageId,
        },
      })
    }

    return emailResult
  } catch (error) {
    console.error('Failed to resend document request email:', error)
    return { success: false, error: 'Failed to send email' }
  }
}
