import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { DocumentStatus } from '@prisma/client'

// TODO: Replace with actual user from session once auth is implemented
const TEMP_USER_ID = 'temp-user-id'

const verifyDocumentSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  status: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const parsed = verifyDocumentSchema.safeParse({
      documentId: formData.get('documentId'),
      status: formData.get('status'),
      notes: formData.get('notes'),
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { documentId, status, notes } = parsed.data

    // Get the document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if document is already verified/rejected
    if (document.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Document is already ${document.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Update the document
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: status as DocumentStatus,
        notes: notes || null,
        verifiedAt: new Date(),
        verifiedById: TEMP_USER_ID,
      },
      include: {
        verifiedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      document: {
        id: updatedDocument.id,
        status: updatedDocument.status,
        notes: updatedDocument.notes,
        verifiedAt: updatedDocument.verifiedAt,
        verifiedBy: updatedDocument.verifiedBy,
      },
    })
  } catch (error) {
    console.error('Failed to verify document:', error)
    return NextResponse.json(
      { error: 'Failed to verify document' },
      { status: 500 }
    )
  }
}
