import { cache } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { format } from 'date-fns'
import { ClientTabs } from './client-tabs'
import { getDocumentChecklistStatus } from './documents/actions'
import { getExchangeConnections } from './exchanges/actions'
import { getDocumentRequests } from './document-requests/actions'

export const dynamic = 'force-dynamic'

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: 'bg-profit-500/10', text: 'text-profit-400', border: 'border-profit-500/30' },
  PENDING: { bg: 'bg-caution-500/10', text: 'text-caution-400', border: 'border-caution-500/30' },
  INACTIVE: { bg: 'bg-void-700', text: 'text-void-400', border: 'border-void-600' },
  SUSPENDED: { bg: 'bg-risk-500/10', text: 'text-risk-400', border: 'border-risk-500/30' },
}

const RISK_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-profit-500/10', text: 'text-profit-400', border: 'border-profit-500/30' },
  MEDIUM: { bg: 'bg-caution-500/10', text: 'text-caution-400', border: 'border-caution-500/30' },
  HIGH: { bg: 'bg-risk-500/10', text: 'text-risk-400', border: 'border-risk-500/30' },
  CRITICAL: { bg: 'bg-risk-500/20', text: 'text-risk-300', border: 'border-risk-500/50' },
}

// Cache client fetching for request deduplication
const getClient = cache(async (id: string, organizationId: string) => {
  try {
    return await prisma.client.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        wallets: true,
        documents: {
          include: {
            verifiedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        cases: {
          orderBy: { createdAt: 'desc' },
        },
        portalUser: {
          select: { id: true },
        },
      },
    })
  } catch {
    return null
  }
})

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const organizationId = user.organizationId

  const { id } = await params
  const [client, checklistStatus, exchangeConnectionsResult, documentRequests] = await Promise.all([
    getClient(id, organizationId),
    getDocumentChecklistStatus(id),
    getExchangeConnections(id),
    getDocumentRequests(id),
  ])

  if (!client) {
    notFound()
  }

  const statusStyle = STATUS_STYLES[client.status] || STATUS_STYLES.PENDING
  const riskStyle = RISK_STYLES[client.riskLevel] || RISK_STYLES.MEDIUM

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/clients"
          className="text-sm text-void-500 hover:text-neon-400 flex items-center gap-1 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Clients
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-void-100">{client.name}</h1>
            <p className="text-void-400 mt-1">{client.email || 'No email provided'}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs font-mono ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
              {client.status}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-mono ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}>
              {client.riskLevel} Risk
            </span>
            <Link
              href={`/clients/${client.id}/edit`}
              className="px-4 py-2 rounded-lg bg-void-800/50 border border-void-700/50 text-void-200 hover:bg-void-700/50 hover:border-void-600 transition-all text-sm font-medium"
            >
              Edit Client
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card border-neon-500/30 hover:border-neon-400/50">
          <div className="text-2xl font-display font-bold text-neon-400">{client.wallets.length}</div>
          <p className="text-sm text-void-400 mt-1">Wallets</p>
        </div>

        <div className="stat-card">
          <div className="text-2xl font-display font-bold text-void-100">{client.documents.length}</div>
          <p className="text-sm text-void-400 mt-1">Documents</p>
        </div>

        <div className="stat-card">
          <div className="text-2xl font-display font-bold text-void-100">{client.transactions.length}+</div>
          <p className="text-sm text-void-400 mt-1">Transactions</p>
        </div>

        <div className="stat-card border-signal-500/30 hover:border-signal-400/50">
          <div className="text-2xl font-display font-bold text-signal-400">{client.cases.length}</div>
          <p className="text-sm text-void-400 mt-1">Cases</p>
        </div>
      </div>

      {/* Tabs */}
      <ClientTabs
        client={client}
        documentChecklist={checklistStatus}
        exchangeConnections={exchangeConnectionsResult.connections}
        documentRequests={documentRequests}
        hasPortalAccount={!!client.portalUser}
      />
    </div>
  )
}
