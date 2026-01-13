import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { StaffMessagesView } from './staff-messages-view'

export const dynamic = 'force-dynamic'

export default async function ClientMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const organizationId = user.organizationId

  const { id: clientId } = await params

  // Get user info for the current user
  const userId = user.id

  // Get client with portal user
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId,
    },
    include: {
      portalUser: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  if (!client) {
    notFound()
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
  if (userId) {
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
  }

  // Serialize messages for client component
  const serializedMessages = messages.map((m) => ({
    id: m.id,
    content: m.content,
    isRead: m.isRead,
    createdAt: m.createdAt.toISOString(),
    isFromClient: !!m.portalUserId,
    senderName: m.portalUserId ? m.portalUser?.name : m.staffUser?.name,
  }))

  return (
    <StaffMessagesView
      clientId={clientId}
      clientName={client.name}
      hasPortalAccess={!!client.portalUser}
      portalUserName={client.portalUser?.name || null}
      messages={serializedMessages}
      currentUserId={userId || null}
    />
  )
}
