import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { portalAuthOptions } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { DocumentType, DocumentStatus } from '@prisma/client'
import { PortalDashboard } from './portal-dashboard'

// Required document types for clients
const REQUIRED_DOCUMENTS: DocumentType[] = [
  'ID',
  'PROOF_OF_ADDRESS',
  'SOURCE_OF_WEALTH',
  'SOURCE_OF_FUNDS',
]

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  ID: 'ID Document',
  PROOF_OF_ADDRESS: 'Proof of Address',
  TAX_RETURNS: 'Tax Returns',
  BANK_STATEMENTS: 'Bank Statements',
  SOURCE_OF_WEALTH: 'Source of Wealth Declaration',
  SOURCE_OF_FUNDS: 'Source of Funds Documentation',
  EXCHANGE_STATEMENTS: 'Exchange Statements',
  WALLET_PROOF: 'Wallet Ownership Proof',
  OTHER: 'Other Documents',
}

interface DocumentChecklist {
  type: DocumentType
  label: string
  isRequired: boolean
  status: 'missing' | 'pending' | 'verified' | 'rejected'
  documents: {
    id: string
    filename: string
    status: DocumentStatus
    notes: string | null
    createdAt: string
  }[]
}

export default async function PortalDashboardPage() {
  const session = await getServerSession(portalAuthOptions)

  if (!session?.user?.clientId) {
    redirect('/portal/login')
  }

  const clientId = session.user.clientId

  // Fetch client data with documents
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' },
      },
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

  // Build document checklist
  const documentsByType = new Map<DocumentType, typeof client.documents>()
  for (const doc of client.documents) {
    const existing = documentsByType.get(doc.category) || []
    existing.push(doc)
    documentsByType.set(doc.category, existing)
  }

  const documentChecklist: DocumentChecklist[] = []

  // Add required documents first
  for (const docType of REQUIRED_DOCUMENTS) {
    const docs = documentsByType.get(docType) || []
    const hasVerified = docs.some((d) => d.status === 'VERIFIED')
    const hasPending = docs.some((d) => d.status === 'PENDING')
    const hasRejected = docs.some((d) => d.status === 'REJECTED')

    let status: DocumentChecklist['status'] = 'missing'
    if (hasVerified) {
      status = 'verified'
    } else if (hasPending) {
      status = 'pending'
    } else if (hasRejected) {
      status = 'rejected'
    }

    documentChecklist.push({
      type: docType,
      label: DOCUMENT_LABELS[docType],
      isRequired: true,
      status,
      documents: docs.map((d) => ({
        id: d.id,
        filename: d.originalName,
        status: d.status,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
      })),
    })
  }

  // Add optional document types that have been uploaded
  const optionalTypes = Object.keys(DOCUMENT_LABELS).filter(
    (t) => !REQUIRED_DOCUMENTS.includes(t as DocumentType)
  ) as DocumentType[]

  for (const docType of optionalTypes) {
    const docs = documentsByType.get(docType) || []
    if (docs.length === 0) continue

    const hasVerified = docs.some((d) => d.status === 'VERIFIED')
    const hasPending = docs.some((d) => d.status === 'PENDING')
    const hasRejected = docs.some((d) => d.status === 'REJECTED')

    let status: DocumentChecklist['status'] = 'missing'
    if (hasVerified) {
      status = 'verified'
    } else if (hasPending) {
      status = 'pending'
    } else if (hasRejected) {
      status = 'rejected'
    }

    documentChecklist.push({
      type: docType,
      label: DOCUMENT_LABELS[docType],
      isRequired: false,
      status,
      documents: docs.map((d) => ({
        id: d.id,
        filename: d.originalName,
        status: d.status,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
      })),
    })
  }

  // Calculate overall progress
  const requiredChecklist = documentChecklist.filter((c) => c.isRequired)
  const verifiedRequired = requiredChecklist.filter((c) => c.status === 'verified').length
  const totalRequired = requiredChecklist.length
  const progress = totalRequired > 0 ? Math.round((verifiedRequired / totalRequired) * 100) : 0

  // Get unread message count
  const unreadMessages = await prisma.portalMessage.count({
    where: {
      clientId,
      portalUserId: null, // Messages from staff
      isRead: false,
    },
  })

  // Get assigned analyst info
  const assignedAnalyst = client.cases[0]?.assignedTo || null

  return (
    <PortalDashboard
      clientName={client.name}
      organizationName={session.user.organizationName}
      documentChecklist={documentChecklist}
      progress={progress}
      unreadMessages={unreadMessages}
      assignedAnalyst={assignedAnalyst}
      clientId={clientId}
    />
  )
}
