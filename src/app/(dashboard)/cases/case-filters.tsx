'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface CaseFiltersProps {
  analysts: { id: string; name: string }[]
  currentFilters: {
    status?: string
    riskLevel?: string
    assignedToId?: string
  }
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const RISK_LEVEL_OPTIONS = [
  { value: '', label: 'All Risk Levels' },
  { value: 'LOW', label: 'Low Risk' },
  { value: 'MEDIUM', label: 'Medium Risk' },
  { value: 'HIGH', label: 'High Risk' },
  { value: 'CRITICAL', label: 'Critical Risk' },
  { value: 'UNASSESSED', label: 'Unassessed' },
]

export function CaseFilters({ analysts, currentFilters }: CaseFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/cases?${params.toString()}`)
  }

  function clearFilters() {
    router.push('/cases')
  }

  const hasFilters = currentFilters.status || currentFilters.riskLevel || currentFilters.assignedToId

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-48">
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={currentFilters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
          />
        </div>

        <div className="w-48">
          <Select
            label="Risk Level"
            options={RISK_LEVEL_OPTIONS}
            value={currentFilters.riskLevel || ''}
            onChange={(e) => updateFilter('riskLevel', e.target.value)}
          />
        </div>

        <div className="w-48">
          <Select
            label="Assigned To"
            options={[
              { value: '', label: 'All Assignees' },
              ...analysts.map((a) => ({ value: a.id, label: a.name })),
            ]}
            value={currentFilters.assignedToId || ''}
            onChange={(e) => updateFilter('assignedToId', e.target.value)}
          />
        </div>

        {hasFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}
