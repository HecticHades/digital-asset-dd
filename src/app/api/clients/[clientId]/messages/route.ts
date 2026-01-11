import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Temp org ID for development
const TEMP_ORG_ID = 'temp-org-id'

// GET - Fetch messages for a client (staff view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // Ensure it's not a portal user
    if (token?.isPortalUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use token org or fallback to temp
    const organizationId = (token?.organizationId as string) || TEMP_ORG_ID

    // Verify client exists and belongs to the organization
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

    // Get messages for this client
    const messages = await prisma.portalMessage.findMany({
      where: { clientId },
      include: {
        portalUser: {
          select: { id: true, name: true },
        },
        staffUser: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Mark unread messages from client as read
    await prisma.portalMessage.updateMany({
      where: {
        clientId,
        staffUserId: null, // Messages from client
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    // Serialize messages for response
    const serializedMessages = messages.map((m) => ({
      id: m.id,
      content: m.content,
      isRead: m.isRead,
      createdAt: m.createdAt.toISOString(),
      isFromClient: !!m.portalUserId,
      senderName: m.portalUserId ? m.portalUser?.name : m.staffUser?.name,
    }))

    return NextResponse.json({ messages: serializedMessages })
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST - Send a message to a client (staff -> client)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // Ensure it's not a portal user
    if (token?.isPortalUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user ID and org ID
    const userId = token?.id as string | undefined
    const organizationId = (token?.organizationId as string) || TEMP_ORG_ID

    // Verify client exists and belongs to the organization
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: organizationId,
      },
      include: {
        portalUser: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (!client.portalUser) {
      return NextResponse.json(
        { error: 'Client does not have portal access' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Message is too long. Maximum 5000 characters.' },
        { status: 400 }
      )
    }

    // Get staff user name for the message
    const staffUser = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true },
        })
      : null

    // Create the message
    const message = await prisma.portalMessage.create({
      data: {
        content: content.trim(),
        clientId,
        staffUserId: userId || null,
      },
      include: {
        staffUser: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt.toISOString(),
        isFromClient: false,
        senderName: message.staffUser?.name || 'Staff',
      },
    })
  } catch (error) {
    console.error('Failed to send message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
