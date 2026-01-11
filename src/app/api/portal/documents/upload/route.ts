import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/db'
import { DocumentType, DocumentStatus } from '@prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { sendDocumentSubmittedNotification } from '@/lib/email/document-request'

export const dynamic = 'force-dynamic'

// Allowed MIME types
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Upload directory
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'documents')

export async function POST(request: NextRequest) {
  try {
    // Get portal user from token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token?.isPortalUser || !token?.clientId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to the client portal.' },
        { status: 401 }
      )
    }

    const clientId = token.clientId as string
    const organizationId = token.organizationId as string

    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const category = formData.get('category') as DocumentType | null
    const requestId = formData.get('requestId') as string | null

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!category || !isValidDocumentType(category)) {
      return NextResponse.json(
        { error: 'Valid document category is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, JPG, and PNG files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Verify client exists and matches the portal user
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: organizationId,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Generate unique filename
    const fileExt = getFileExtension(file.name, file.type)
    const uniqueFilename = `${randomUUID()}${fileExt}`
    const clientDir = join(UPLOAD_DIR, clientId)
    const filePath = join(clientDir, uniqueFilename)
    const relativePath = join('uploads', 'documents', clientId, uniqueFilename)

    // Ensure upload directory exists
    await mkdir(clientDir, { recursive: true })

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        filename: uniqueFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        path: relativePath,
        category: category,
        status: DocumentStatus.PENDING,
        clientId: clientId,
        organizationId: organizationId,
      },
    })

    // If this upload is in response to a document request, update the request
    if (requestId) {
      const documentRequest = await prisma.documentRequest.findFirst({
        where: {
          id: requestId,
          clientId: clientId,
          status: { in: ['PENDING', 'REJECTED'] },
        },
        include: {
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      if (documentRequest) {
        // Update the request status to SUBMITTED and link the document
        await prisma.documentRequest.update({
          where: { id: requestId },
          data: {
            status: 'SUBMITTED',
            documentId: document.id,
          },
        })

        // Send email notification to the analyst who created the request
        if (documentRequest.requestedBy?.email) {
          try {
            await sendDocumentSubmittedNotification({
              analystEmail: documentRequest.requestedBy.email,
              analystName: documentRequest.requestedBy.name || 'Analyst',
              clientName: client.name,
              clientId: clientId,
              requestTitle: documentRequest.title,
              documentType: documentRequest.category,
              userId: documentRequest.requestedBy.id,
            })
          } catch (emailError) {
            console.error('Failed to send document submitted email:', emailError)
          }
        }
      }
    }

    // Notify the assigned analyst about the new document upload
    const activeCase = await prisma.case.findFirst({
      where: {
        clientId: clientId,
        status: { in: ['IN_PROGRESS', 'PENDING_REVIEW'] },
        assignedToId: { not: null },
      },
      select: { assignedToId: true },
    })

    if (activeCase?.assignedToId) {
      // Create notification for the analyst
      await prisma.notification.create({
        data: {
          type: 'DOCUMENT_UPLOADED',
          title: 'New Document Uploaded',
          message: `${client.name} has uploaded a new document: ${file.name}`,
          link: `/clients/${clientId}`,
          userId: activeCase.assignedToId,
          clientId: clientId,
          organizationId: organizationId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        originalName: document.originalName,
        category: document.category,
        size: document.size,
        mimeType: document.mimeType,
        status: document.status,
        createdAt: document.createdAt,
      },
    })
  } catch (error) {
    console.error('Failed to upload document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}

function isValidDocumentType(type: string): type is DocumentType {
  const validTypes: DocumentType[] = [
    'ID',
    'PROOF_OF_ADDRESS',
    'TAX_RETURNS',
    'BANK_STATEMENTS',
    'SOURCE_OF_WEALTH',
    'SOURCE_OF_FUNDS',
    'EXCHANGE_STATEMENTS',
    'WALLET_PROOF',
    'OTHER',
  ]
  return validTypes.includes(type as DocumentType)
}

function getFileExtension(filename: string, mimeType: string): string {
  // Try to get extension from filename first
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex !== -1) {
    return filename.substring(dotIndex).toLowerCase()
  }

  // Fallback to MIME type
  const mimeExtensions: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
  }
  return mimeExtensions[mimeType] || ''
}
