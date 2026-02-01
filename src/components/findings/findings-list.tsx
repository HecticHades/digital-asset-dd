'use client'

import { useState, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { AddFindingForm } from './add-finding-form'
import { ResolveFindingModal } from './resolve-finding-modal'
import {
  SEVERITY_LABELS,
  CATEGORY_LABELS,
  type FindingSeverity,
  type FindingCategory,
} from '@/lib/validators/finding'

interface Finding {
  id: string
  title: string
  description: string | null
  severity: string
  category: string
  isResolved: boolean
  resolution: string | null
  createdAt: string
  resolvedAt: string | null
  wallet?: {
    id: string
    address: string
    blockchain: string
    label: string | null
  } | null
  transaction?: {
    id: string
    txHash: string | null
    type: string
    asset: string
  } | null
  resolvedBy?: {
    id: string
    name: string
  } | null
}

interface FindingsListProps {
  findings: Finding[]
  caseId: string
  onCreateFinding: (data: {
    title: string
    description?: string
    severity: FindingSeverity
    category: FindingCategory
    caseId: string
  }) => Promise<{ success: boolean; error?: string }>
  onResolveFinding: (id: string, resolution: string) => Promise<{ success: boolean; error?: string }>
  onReopenFinding: (id: string) => Promise<{ success: boolean; error?: string }>
}

// Severity order for grouping (most severe first)
const SEVERITY_ORDER: FindingSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'LOW':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'INFO':
      return 'bg-slate-100 text-slate-800 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200'
  }
}

function getSeverityBgColor(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-50 border-red-200'
    case 'HIGH':
      return 'bg-orange-50 border-orange-200'
    case 'MEDIUM':
      return 'bg-yellow-50 border-yellow-200'
    case 'LOW':
      return 'bg-blue-50 border-blue-200'
    case 'INFO':
      return 'bg-slate-50 border-slate-200'
    default:
      return 'bg-slate-50 border-slate-200'
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'SANCTIONS':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      )
    case 'MIXER':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    case 'PRIVACY':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      )
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
  }
}

export function FindingsList({
  findings,
  caseId,
  onCreateFinding,
  onResolveFinding,
  onReopenFinding,
}: FindingsListProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null)

  // Memoize filtered findings to prevent recalculation on every render
  const openFindings = useMemo(
    () => findings.filter((f) => !f.isResolved),
    [findings]
  )

  const resolvedFindings = useMemo(
    () => findings.filter((f) => f.isResolved),
    [findings]
  )

  // Group open findings by severity - memoized
  const groupedFindings = useMemo(() => {
    return SEVERITY_ORDER.reduce((acc, severity) => {
      const group = openFindings.filter((f) => f.severity === severity)
      if (group.length > 0) {
        acc[severity] = group
      }
      return acc
    }, {} as Record<FindingSeverity, Finding[]>)
  }, [openFindings])

  // Summary counts - memoized
  const summaryCounts = useMemo(() => ({
    critical: openFindings.filter((f) => f.severity === 'CRITICAL').length,
    high: openFindings.filter((f) => f.severity === 'HIGH').length,
    medium: openFindings.filter((f) => f.severity === 'MEDIUM').length,
    lowInfo: openFindings.filter((f) => f.severity === 'LOW' || f.severity === 'INFO').length,
  }), [openFindings])

  // Stable event handlers with useCallback
  const handleAddFinding = useCallback(async (data: {
    title: string
    description?: string
    severity: FindingSeverity
    category: FindingCategory
    caseId: string
  }) => {
    const result = await onCreateFinding(data)
    if (result.success) {
      setShowAddModal(false)
    }
    return result
  }, [onCreateFinding])

  const handleResolve = useCallback(async (id: string, resolution: string) => {
    const result = await onResolveFinding(id, resolution)
    if (result.success) {
      setSelectedFinding(null)
    }
    return result
  }, [onResolveFinding])

  const handleReopen = useCallback(async (id: string) => {
    await onReopenFinding(id)
  }, [onReopenFinding])

  const renderFindingCard = (finding: Finding) => {
    const isExpanded = expandedFinding === finding.id

    return (
      <div
        key={finding.id}
        className={`border rounded-lg p-4 ${finding.isResolved ? 'bg-slate-50 border-slate-200' : getSeverityBgColor(finding.severity)}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`flex-shrink-0 p-2 rounded-full ${getSeverityColor(finding.severity)}`}>
              {getCategoryIcon(finding.category)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`font-medium ${finding.isResolved ? 'text-slate-500' : 'text-slate-900'}`}>
                  {finding.title}
                </h4>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getSeverityColor(finding.severity)}`}>
                  {SEVERITY_LABELS[finding.severity as FindingSeverity]}
                </span>
                <Badge variant="default" className="text-xs">
                  {CATEGORY_LABELS[finding.category as FindingCategory]}
                </Badge>
                {finding.isResolved && (
                  <Badge variant="success" className="text-xs">Resolved</Badge>
                )}
              </div>

              {finding.description && (
                <p className={`mt-1 text-sm ${finding.isResolved ? 'text-slate-400' : 'text-slate-600'}`}>
                  {finding.description}
                </p>
              )}

              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span>Created {format(new Date(finding.createdAt), 'MMM d, yyyy')}</span>
                {finding.wallet && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {finding.wallet.label || `${finding.wallet.address.slice(0, 8)}...`}
                  </span>
                )}
                {finding.transaction?.txHash && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                    </svg>
                    {finding.transaction.txHash.slice(0, 8)}...
                  </span>
                )}
              </div>

              {/* Expandable resolution details */}
              {finding.isResolved && finding.resolution && (
                <div className="mt-2">
                  <button
                    onClick={() => setExpandedFinding(isExpanded ? null : finding.id)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    {isExpanded ? 'Hide' : 'Show'} resolution details
                    <svg
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="mt-2 p-3 bg-white rounded-md border border-slate-200 text-sm">
                      <p className="text-slate-600">{finding.resolution}</p>
                      <div className="mt-2 text-xs text-slate-500">
                        Resolved by {finding.resolvedBy?.name || 'Unknown'} on{' '}
                        {finding.resolvedAt ? format(new Date(finding.resolvedAt), 'MMM d, yyyy') : 'Unknown'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            {finding.isResolved ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReopen(finding.id)}
              >
                Reopen
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFinding(finding)}
              >
                Resolve
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {summaryCounts.critical > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-sm font-medium">{summaryCounts.critical} Critical</span>
            </div>
          )}
          {summaryCounts.high > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="text-sm font-medium">{summaryCounts.high} High</span>
            </div>
          )}
          {summaryCounts.medium > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-sm font-medium">{summaryCounts.medium} Medium</span>
            </div>
          )}
          {summaryCounts.lowInfo > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-sm font-medium">{summaryCounts.lowInfo} Low/Info</span>
            </div>
          )}
          {openFindings.length === 0 && (
            <span className="text-sm text-slate-500">No open findings</span>
          )}
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Finding
        </Button>
      </div>

      {/* Open Findings Grouped by Severity */}
      {Object.entries(groupedFindings).map(([severity, severityFindings]) => (
        <Card key={severity}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getSeverityColor(severity)}`}>
                {SEVERITY_LABELS[severity as FindingSeverity]}
              </span>
              <span className="text-slate-500 font-normal">
                ({severityFindings.length} {severityFindings.length === 1 ? 'finding' : 'findings'})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {severityFindings.map(renderFindingCard)}
          </CardContent>
        </Card>
      ))}

      {/* Empty State */}
      {openFindings.length === 0 && resolvedFindings.length === 0 && (
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-900">No findings yet</h3>
          <p className="mt-2 text-sm text-slate-500">
            Add a finding manually or run analysis to auto-generate flags.
          </p>
          <Button className="mt-4" onClick={() => setShowAddModal(true)}>
            Add First Finding
          </Button>
        </div>
      )}

      {/* Resolved Findings */}
      {resolvedFindings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="success">Resolved</Badge>
              <span className="text-slate-500 font-normal">
                ({resolvedFindings.length} {resolvedFindings.length === 1 ? 'finding' : 'findings'})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resolvedFindings.map(renderFindingCard)}
          </CardContent>
        </Card>
      )}

      {/* Add Finding Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Risk Finding">
        <AddFindingForm
          caseId={caseId}
          onSubmit={handleAddFinding}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Resolve Finding Modal */}
      {selectedFinding && (
        <ResolveFindingModal
          finding={selectedFinding}
          isOpen={!!selectedFinding}
          onClose={() => setSelectedFinding(null)}
          onResolve={handleResolve}
        />
      )}
    </div>
  )
}
