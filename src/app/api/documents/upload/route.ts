import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { DocumentType, DocumentStatus } from '@prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { dispatchDocumentUploaded } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

// TODO: Get actual user/org from session
const TEMP_ORG_ID = 'temp-org-id'

// Allowed MIME types
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Upload directory
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'documents')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const clientId = formData.get('clientId') as string | null
    const category = formData.get('category') as DocumentType | null

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
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

    // Verify client exists and belongs to the organization
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: TEMP_ORG_ID,
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
        organizationId: TEMP_ORG_ID,
      },
    })

    // Dispatch webhook for document upload (fire and forget)
    dispatchDocumentUploaded({
      organizationId: TEMP_ORG_ID,
      documentId: document.id,
      documentName: document.originalName,
      category: document.category,
      clientId: client.id,
      clientName: client.name,
    }).catch((err) => console.error('[Webhook] Failed to dispatch document.uploaded:', err))

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
