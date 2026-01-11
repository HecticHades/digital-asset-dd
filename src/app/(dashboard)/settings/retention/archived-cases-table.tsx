'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { restoreCaseAction, getArchivedCasesAction } from './actions'
import type { CaseStatus, RiskLevel } from '@prisma/client'

interface ArchivedCase {
  id: string
  originalCaseId: string
  title: string
  status: CaseStatus
  riskLevel: RiskLevel
  clientName: string
  archivedAt: string
  archivedByName: string | null
  expiresAt: string | null
}

interface ArchivedCasesTableProps {
  initialData: {
    cases: ArchivedCase[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const RISK_LEVEL_VARIANTS: Record<RiskLevel, 'default' | 'success' | 'warning' | 'error'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'error',
  CRITICAL: 'error',
  UNASSESSED: 'default',
}

export function ArchivedCasesTable({ initialData }: ArchivedCasesTableProps) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleRestore = async (archivedCaseId: string) => {
    if (!confirm('Are you sure you want to restore this case? It will be moved back to active cases.')) {
      return
    }

    setRestoringId(archivedCaseId)
    const result = await restoreCaseAction(archivedCaseId)

    if (result.success) {
      // Refresh the data
      const newData = await getArchivedCasesAction(data.page, data.limit)
      if (newData) {
        setData(newData)
      }
    } else {
      alert(result.error || 'Failed to restore case')
    }

    setRestoringId(null)
  }

  const handlePageChange = async (newPage: number) => {
    setLoading(true)
    const newData = await getArchivedCasesAction(newPage, data.limit)
    if (newData) {
      setData(newData)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Archived</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.cases.map((archivedCase) => (
              <TableRow key={archivedCase.id}>
                <TableCell className="font-medium">{archivedCase.title}</TableCell>
                <TableCell>{archivedCase.clientName}</TableCell>
                <TableCell>
                  <Badge variant="default">{archivedCase.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={RISK_LEVEL_VARIANTS[archivedCase.riskLevel]}>
                    {archivedCase.riskLevel}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  <div>{format(new Date(archivedCase.archivedAt), 'MMM d, yyyy')}</div>
                  {archivedCase.archivedByName && (
                    <div className="text-xs">by {archivedCase.archivedByName}</div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {archivedCase.expiresAt
                    ? format(new Date(archivedCase.expiresAt), 'MMM d, yyyy')
                    : '-'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(archivedCase.id)}
                    disabled={restoringId === archivedCase.id}
                  >
                    {restoringId === archivedCase.id ? 'Restoring...' : 'Restore'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(data.page - 1)}
              disabled={data.page <= 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(data.page + 1)}
              disabled={data.page >= data.totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
