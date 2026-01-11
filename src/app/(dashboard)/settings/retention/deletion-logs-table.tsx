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
import { getDeletionLogsAction } from './actions'

interface DeletionLog {
  id: string
  entityType: string
  entityId: string
  entityTitle: string | null
  deletedAt: string
  deletedByName: string | null
  deletionReason: string | null
}

interface DeletionLogsTableProps {
  initialData: {
    logs: DeletionLog[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  CASE: 'Case',
  CLIENT: 'Client',
  DOCUMENT: 'Document',
  TRANSACTION: 'Transaction',
  WALLET: 'Wallet',
  FINDING: 'Finding',
  ARCHIVED_CASE: 'Archived Case',
}

export function DeletionLogsTable({ initialData }: DeletionLogsTableProps) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)

  const handlePageChange = async (newPage: number) => {
    setLoading(true)
    const newData = await getDeletionLogsAction(newPage, data.limit)
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
              <TableHead>Entity Type</TableHead>
              <TableHead>Title / ID</TableHead>
              <TableHead>Deleted</TableHead>
              <TableHead>Deleted By</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant="default">
                    {ENTITY_TYPE_LABELS[log.entityType] || log.entityType}
                  </Badge>
                </TableCell>
                <TableCell>
                  {log.entityTitle ? (
                    <div>
                      <div className="font-medium">{log.entityTitle}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {log.entityId.slice(0, 8)}...
                      </div>
                    </div>
                  ) : (
                    <span className="font-mono text-sm">{log.entityId}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {format(new Date(log.deletedAt), 'MMM d, yyyy HH:mm')}
                </TableCell>
                <TableCell className="text-sm">
                  {log.deletedByName || <span className="text-slate-400">System</span>}
                </TableCell>
                <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                  {log.deletionReason || '-'}
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
