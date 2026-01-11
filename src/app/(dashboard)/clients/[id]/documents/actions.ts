'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { DocumentStatus, DocumentType } from '@prisma/client'

// TODO: Replace with actual user from session once auth is implemented
const TEMP_USER_ID = 'temp-user-id'

const verifyDocumentSchema = z.object({
  documentId: z.string().min(1),
  status: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().optional(),
})

export async function verifyDocument(formData: FormData) {
  const parsed = verifyDocumentSchema.safeParse({
    documentId: formData.get('documentId'),
    status: formData.get('status'),
    notes: formData.get('notes'),
  })

  if (!parsed.success) {
    return { success: false, error: 'Invalid form data' }
  }

  const { documentId, status, notes } = parsed.data

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { client: true },
    })

    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: status as DocumentStatus,
        notes: notes || null,
        verifiedAt: new Date(),
        verifiedById: TEMP_USER_ID,
      },
    })

    revalidatePath(`/clients/${document.clientId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to verify document:', error)
    return { success: false, error: 'Failed to verify document' }
  }
}

export async function getDocumentsByClient(clientId: string) {
  return prisma.document.findMany({
    where: { clientId },
    include: {
      verifiedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getDocumentById(documentId: string) {
  return prisma.document.findUnique({
    where: { id: documentId },
    include: {
      client: true,
      verifiedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })
}

// Required document types for due diligence
export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  'ID',
  'PROOF_OF_ADDRESS',
  'SOURCE_OF_WEALTH',
  'SOURCE_OF_FUNDS',
]

// Get document checklist status for a client
export async function getDocumentChecklistStatus(clientId: string) {
  const documents = await prisma.document.findMany({
    where: { clientId },
    select: {
      category: true,
      status: true,
    },
  })

  // Create a map of category to best document status
  const categoryStatusMap = new Map<DocumentType, DocumentStatus>()

  for (const doc of documents) {
    const currentStatus = categoryStatusMap.get(doc.category)
    // VERIFIED > PENDING > REJECTED (priority order)
    if (!currentStatus) {
      categoryStatusMap.set(doc.category, doc.status)
    } else if (doc.status === 'VERIFIED') {
      categoryStatusMap.set(doc.category, 'VERIFIED')
    } else if (doc.status === 'PENDING' && currentStatus === 'REJECTED') {
      categoryStatusMap.set(doc.category, 'PENDING')
    }
  }

  const checklistItems = REQUIRED_DOCUMENT_TYPES.map((type) => ({
    category: type,
    status: categoryStatusMap.get(type) || null,
    isUploaded: categoryStatusMap.has(type),
    isVerified: categoryStatusMap.get(type) === 'VERIFIED',
  }))

  const verifiedCount = checklistItems.filter((item) => item.isVerified).length
  const totalRequired = REQUIRED_DOCUMENT_TYPES.length

  return {
    items: checklistItems,
    completionPercentage: Math.round((verifiedCount / totalRequired) * 100),
    verifiedCount,
    totalRequired,
    missingDocuments: checklistItems
      .filter((item) => !item.isUploaded)
      .map((item) => item.category),
    pendingDocuments: checklistItems
      .filter((item) => item.isUploaded && !item.isVerified)
      .map((item) => item.category),
  }
}
