import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// TODO: Get actual user/org from session
const TEMP_ORG_ID = 'temp-org-id'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/documents/[id] - Get document metadata or serve file
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === 'true'
    const preview = searchParams.get('preview') === 'true'

    // Get document from database
    const document = await prisma.document.findFirst({
      where: {
        id,
        organizationId: TEMP_ORG_ID,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // If download or preview requested, serve the file
    if (download || preview) {
      try {
        const filePath = join(process.cwd(), document.path)
        const fileBuffer = await readFile(filePath)

        const headers = new Headers()
        headers.set('Content-Type', document.mimeType)
        headers.set('Content-Length', document.size.toString())

        if (download) {
          headers.set(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(document.originalName)}"`
          )
        } else {
          headers.set(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(document.originalName)}"`
          )
        }

        return new NextResponse(fileBuffer, { headers })
      } catch {
        return NextResponse.json(
          { error: 'File not found on server' },
          { status: 404 }
        )
      }
    }

    // Return document metadata
    return NextResponse.json({
      document: {
        id: document.id,
        filename: document.filename,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        category: document.category,
        status: document.status,
        notes: document.notes,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        verifiedAt: document.verifiedAt,
        verifiedBy: document.verifiedBy,
        client: document.client,
      },
    })
  } catch (error) {
    console.error('Failed to get document:', error)
    return NextResponse.json(
      { error: 'Failed to get document' },
      { status: 500 }
    )
  }
}
