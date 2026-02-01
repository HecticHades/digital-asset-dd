import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

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

async function getClients(organizationId: string) {
  try {
    return await prisma.client.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  } catch {
    return []
  }
}

export default async function ClientsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const organizationId = user.organizationId

  const clients = await getClients(organizationId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-void-100">Clients</h1>
          <p className="text-void-400 mt-2">Manage your client onboarding</p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-500/10 border border-neon-500/30 text-neon-400 hover:bg-neon-500/20 hover:border-neon-400/50 transition-all text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-void-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-void-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-display font-semibold text-void-100 mb-2">No clients yet</h3>
          <p className="text-void-400 text-sm mb-4">
            Get started by adding your first client.
          </p>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-500/10 border border-neon-500/30 text-neon-400 hover:bg-neon-500/20 transition-colors text-sm font-medium"
          >
            Add Client
          </Link>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="table-dark">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Risk Level</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const statusStyle = STATUS_STYLES[client.status] || STATUS_STYLES.PENDING
                const riskStyle = RISK_STYLES[client.riskLevel] || RISK_STYLES.MEDIUM

                return (
                  <tr key={client.id} className="group">
                    <td className="font-medium text-void-100">{client.name}</td>
                    <td className="text-void-400">{client.email || '-'}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-mono ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                        {client.status}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-mono ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}>
                        {client.riskLevel}
                      </span>
                    </td>
                    <td className="text-void-400 font-mono text-sm">{format(client.createdAt, 'MMM d, yyyy')}</td>
                    <td className="text-right">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-neon-400 hover:text-neon-300 text-sm font-medium transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
