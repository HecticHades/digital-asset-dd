import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, RiskBadge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ClientTabs } from './client-tabs'
import { getDocumentChecklistStatus } from './documents/actions'
import { getExchangeConnections } from './exchanges/actions'
import { getDocumentRequests } from './document-requests/actions'

export const dynamic = 'force-dynamic'

// TODO: Get actual org from session
const TEMP_ORG_ID = 'temp-org-id'

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

async function getClient(id: string) {
  try {
    return await prisma.client.findFirst({
      where: {
        id,
        organizationId: TEMP_ORG_ID,
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
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params
  const [client, checklistStatus, exchangeConnectionsResult, documentRequests] = await Promise.all([
    getClient(id),
    getDocumentChecklistStatus(id),
    getExchangeConnections(id),
    getDocumentRequests(id),
  ])

  if (!client) {
    notFound()
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/clients"
          className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Clients
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
            <p className="text-slate-600 mt-1">{client.email || 'No email provided'}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={client.status} />
            <RiskBadge level={client.riskLevel} />
            <Link href={`/clients/${client.id}/edit`}>
              <Button variant="outline" size="sm">
                Edit Client
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.wallets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.documents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.transactions.length}+</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.cases.length}</div>
          </CardContent>
        </Card>
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

// Client info card for Overview tab
function ClientInfoCard({ client }: { client: { phone?: string | null; address?: string | null; notes?: string | null; createdAt: Date; updatedAt: Date } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <dt className="text-sm font-medium text-slate-500">Phone</dt>
          <dd className="mt-1 text-sm text-slate-900">{client.phone || '-'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Address</dt>
          <dd className="mt-1 text-sm text-slate-900">{client.address || '-'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Notes</dt>
          <dd className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{client.notes || '-'}</dd>
        </div>
        <div className="pt-4 border-t border-slate-200">
          <dt className="text-sm font-medium text-slate-500">Created</dt>
          <dd className="mt-1 text-sm text-slate-900">{format(client.createdAt, 'PPpp')}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Last Updated</dt>
          <dd className="mt-1 text-sm text-slate-900">{format(client.updatedAt, 'PPpp')}</dd>
        </div>
      </CardContent>
    </Card>
  )
}
