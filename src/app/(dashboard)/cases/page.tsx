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
import { CaseFilters } from './case-filters'

export const dynamic = 'force-dynamic'

// TODO: Get actual org from session
const TEMP_ORG_ID = 'temp-org-id'

interface CasesPageProps {
  searchParams: Promise<{
    status?: string
    riskLevel?: string
    assignedToId?: string
  }>
}

async function getCases(filters: {
  status?: string
  riskLevel?: string
  assignedToId?: string
}) {
  try {
    const where: Record<string, unknown> = {
      organizationId: TEMP_ORG_ID,
    }

    if (filters.status) {
      where.status = filters.status
    }
    if (filters.riskLevel) {
      where.riskLevel = filters.riskLevel
    }
    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId
    }

    return await prisma.case.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
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

async function getAnalysts() {
  try {
    return await prisma.user.findMany({
      where: {
        organizationId: TEMP_ORG_ID,
        role: {
          in: ['ANALYST', 'MANAGER'],
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
  } catch {
    return []
  }
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const params = await searchParams
  const [cases, analysts] = await Promise.all([
    getCases(params),
    getAnalysts(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cases</h1>
          <p className="text-slate-600 mt-1">Manage due diligence cases</p>
        </div>
        <Link href="/cases/new">
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
            New Case
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <CaseFilters analysts={analysts} currentFilters={params} />

      {cases.length === 0 ? (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-900">No cases found</h3>
          <p className="mt-2 text-sm text-slate-500">
            {Object.keys(params).length > 0
              ? 'Try adjusting your filters or create a new case.'
              : 'Get started by creating your first case.'}
          </p>
          <div className="mt-6">
            <Link href="/cases/new">
              <Button>New Case</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((caseItem) => (
                <TableRow key={caseItem.id}>
                  <TableCell className="font-medium">{caseItem.title}</TableCell>
                  <TableCell>
                    <Link
                      href={`/clients/${caseItem.client.id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {caseItem.client.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={caseItem.status} />
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={caseItem.riskLevel} />
                  </TableCell>
                  <TableCell>{caseItem.assignedTo?.name || '-'}</TableCell>
                  <TableCell>
                    {caseItem.dueDate ? format(caseItem.dueDate, 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>{format(caseItem.createdAt, 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/cases/${caseItem.id}`}
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
