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
import {
  deactivateOrganizationAction,
  reactivateOrganizationAction,
  listOrganizationsAction,
} from './actions'

interface Organization {
  id: string
  name: string
  logo: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  userCount: number
  clientCount: number
  caseCount: number
}

interface OrganizationsTableProps {
  initialData: {
    organizations: Organization[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export function OrganizationsTable({ initialData }: OrganizationsTableProps) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleToggleActive = async (org: Organization) => {
    const action = org.isActive ? 'deactivate' : 'reactivate'
    if (!confirm(`Are you sure you want to ${action} "${org.name}"?`)) {
      return
    }

    setProcessingId(org.id)

    const result = org.isActive
      ? await deactivateOrganizationAction(org.id)
      : await reactivateOrganizationAction(org.id)

    if (result.success) {
      // Refresh data
      const newData = await listOrganizationsAction(data.page, data.limit)
      if (newData) {
        setData(newData)
      }
    } else {
      alert(result.error || `Failed to ${action} organization`)
    }

    setProcessingId(null)
  }

  const handlePageChange = async (newPage: number) => {
    setLoading(true)
    const newData = await listOrganizationsAction(newPage, data.limit)
    if (newData) {
      setData(newData)
    }
    setLoading(false)
  }

  if (data.organizations.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No organizations found.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Clients</TableHead>
              <TableHead>Cases</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.organizations.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {org.logo ? (
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                        <OrgLogo logo={org.logo} name={org.name} />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{org.id}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{org.userCount}</TableCell>
                <TableCell>{org.clientCount}</TableCell>
                <TableCell>{org.caseCount}</TableCell>
                <TableCell>
                  {org.isActive ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="error">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {format(new Date(org.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(org)}
                    disabled={processingId === org.id}
                    className={
                      org.isActive
                        ? 'text-amber-600 border-amber-300 hover:bg-amber-50'
                        : 'text-green-600 border-green-300 hover:bg-green-50'
                    }
                  >
                    {processingId === org.id
                      ? 'Processing...'
                      : org.isActive
                      ? 'Deactivate'
                      : 'Reactivate'}
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
            Page {data.page} of {data.totalPages} ({data.total} total)
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

function OrgLogo({ logo, name }: { logo: string; name: string }) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <span className="text-sm font-medium text-primary-600">
        {name.charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <img
      src={logo}
      alt={name}
      className="h-8 w-8 object-cover"
      onError={() => setError(true)}
    />
  )
}
