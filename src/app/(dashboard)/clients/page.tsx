import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { StatusBadge, RiskBadge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

// TODO: Get actual org from session
const TEMP_ORG_ID = 'temp-org-id'

async function getClients() {
  try {
    return await prisma.client.findMany({
      where: {
        organizationId: TEMP_ORG_ID,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  } catch {
    // Database might not be set up yet
    return []
  }
}

export default async function ClientsPage() {
  const clients = await getClients()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-600 mt-1">Manage your client onboarding</p>
        </div>
        <Link href="/clients/new">
          <Button>
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Client
          </Button>
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <svg
            className="mx-auto h-12 w-12 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-900">No clients yet</h3>
          <p className="mt-2 text-sm text-slate-500">
            Get started by adding your first client.
          </p>
          <div className="mt-6">
            <Link href="/clients/new">
              <Button>Add Client</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.email || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge status={client.status} />
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={client.riskLevel} />
                  </TableCell>
                  <TableCell>{format(client.createdAt, 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
