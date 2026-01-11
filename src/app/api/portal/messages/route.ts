import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Fetch messages for the portal user
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token?.isPortalUser || !token?.clientId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const clientId = token.clientId as string

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

    // Mark unread messages from staff as read
    await prisma.portalMessage.updateMany({
      where: {
        clientId,
        portalUserId: null, // Messages from staff
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

// POST - Send a message from the portal user
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token?.isPortalUser || !token?.clientId || !token?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const clientId = token.clientId as string
    const portalUserId = token.id as string

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

    // Get client info for notification
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        cases: {
          where: {
            status: { in: ['IN_PROGRESS', 'PENDING_REVIEW'] },
            assignedToId: { not: null },
          },
          select: {
            assignedToId: true,
            organizationId: true,
          },
          take: 1,
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Create the message
    const message = await prisma.portalMessage.create({
      data: {
        content: content.trim(),
        clientId,
        portalUserId,
      },
      include: {
        portalUser: {
          select: { id: true, name: true },
        },
      },
    })

    // Notify the assigned analyst
    if (client.cases[0]?.assignedToId) {
      await prisma.notification.create({
        data: {
          type: 'COMMENT_ADDED',
          title: 'New Message from Client',
          message: `${client.name} sent you a message: "${content.trim().substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          link: `/clients/${clientId}`,
          userId: client.cases[0].assignedToId,
          clientId: clientId,
          organizationId: client.cases[0].organizationId,
        },
      })
    }

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt.toISOString(),
        isFromClient: true,
        senderName: message.portalUser?.name,
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
