import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { portalAuthOptions } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { MessagesView } from './messages-view'

export const dynamic = 'force-dynamic'

export default async function PortalMessagesPage() {
  const session = await getServerSession(portalAuthOptions)

  if (!session?.user?.clientId) {
    redirect('/portal/login')
  }

  const clientId = session.user.clientId

  // Get client info
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      cases: {
        where: {
          status: { in: ['IN_PROGRESS', 'PENDING_REVIEW'] },
        },
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!client) {
    redirect('/portal/login')
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

  // Serialize messages for client component
  const serializedMessages = messages.map((m) => ({
    id: m.id,
    content: m.content,
    isRead: m.isRead,
    createdAt: m.createdAt.toISOString(),
    isFromClient: !!m.portalUserId,
    senderName: m.portalUserId ? m.portalUser?.name : m.staffUser?.name,
  }))

  const assignedAnalyst = client.cases[0]?.assignedTo || null

  return (
    <MessagesView
      clientId={clientId}
      clientName={client.name}
      organizationName={session.user.organizationName}
      portalUserId={session.user.id}
      messages={serializedMessages}
      assignedAnalyst={assignedAnalyst}
    />
  )
}
