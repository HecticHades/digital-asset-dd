'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { format, formatDistanceToNow } from 'date-fns'

interface Finding {
  id: string
  title: string
  severity: string
  category: string
}

interface ChecklistItem {
  id: string
  title: string
  isCompleted: boolean
  isRequired: boolean
}

interface CaseData {
  id: string
  title: string
  description: string | null
  riskLevel: string
  riskScore: number | null
  dueDate: string | null
  createdAt: string
  client: {
    id: string
    name: string
  }
  assignedTo: {
    id: string
    name: string
    email: string
  } | null
  findings: Finding[]
  checklistItems: ChecklistItem[]
}

interface PendingCaseCardProps {
  caseData: CaseData
  onApprove: (caseId: string, comment: string) => Promise<{ success: boolean; error?: string }>
  onReject: (caseId: string, comment: string) => Promise<{ success: boolean; error?: string }>
}

export function PendingCaseCard({ caseData, onApprove, onReject }: PendingCaseCardProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showApproveForm, setShowApproveForm] = useState(false)
  const [comment, setComment] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const criticalFindings = caseData.findings.filter((f) => f.severity === 'CRITICAL')
  const highFindings = caseData.findings.filter((f) => f.severity === 'HIGH')
  const requiredIncomplete = caseData.checklistItems.filter((c) => c.isRequired && !c.isCompleted)
  const checklistComplete = requiredIncomplete.length === 0

  const isDueSoon = caseData.dueDate && new Date(caseData.dueDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  const isOverdue = caseData.dueDate && new Date(caseData.dueDate) < new Date()

  const handleApprove = async () => {
    if (comment.length < 10) {
      setError('Comment must be at least 10 characters')
      return
    }
    setIsProcessing(true)
    setError(null)
    try {
      const result = await onApprove(caseData.id, comment)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || 'Failed to approve case')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (comment.length < 10) {
      setError('Comment must be at least 10 characters')
      return
    }
    setIsProcessing(true)
    setError(null)
    try {
      const result = await onReject(caseData.id, comment)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || 'Failed to reject case')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className={`${isOverdue ? 'border-red-300' : isDueSoon ? 'border-amber-300' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <Link href={`/cases/${caseData.id}`}>
                <CardTitle className="text-lg hover:text-primary-600">{caseData.title}</CardTitle>
              </Link>
              <RiskBadge level={caseData.riskLevel as 'UNASSESSED' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'} />
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>
                Client:{' '}
                <Link href={`/clients/${caseData.client.id}`} className="text-primary-600 hover:text-primary-700">
                  {caseData.client.name}
                </Link>
              </span>
              <span>Analyst: {caseData.assignedTo?.name || 'Unassigned'}</span>
              {caseData.dueDate && (
                <span className={isOverdue ? 'text-red-600 font-medium' : isDueSoon ? 'text-amber-600' : ''}>
                  Due: {format(new Date(caseData.dueDate), 'MMM d, yyyy')}
                  {isOverdue && ' (Overdue)'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/cases/${caseData.id}`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Summary Stats */}
        <div className="flex items-center gap-6 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Findings:</span>
            <span className="font-medium">{caseData.findings.length}</span>
            {criticalFindings.length > 0 && (
              <Badge variant="error">{criticalFindings.length} Critical</Badge>
            )}
            {highFindings.length > 0 && (
              <Badge variant="warning">{highFindings.length} High</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Checklist:</span>
            {checklistComplete ? (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <CheckIcon className="h-4 w-4" /> Complete
              </span>
            ) : (
              <span className="text-amber-600 font-medium">
                {requiredIncomplete.length} required item(s) pending
              </span>
            )}
          </div>
          {caseData.riskScore !== null && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Risk Score:</span>
              <span className="font-medium">{caseData.riskScore}/100</span>
            </div>
          )}
        </div>

        {/* Expandable Details */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          {isExpanded ? 'Hide details' : 'Show details'}
          <ChevronIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isExpanded && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            {/* Description */}
            {caseData.description && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-700 mb-1">Description</h4>
                <p className="text-sm text-slate-600">{caseData.description}</p>
              </div>
            )}

            {/* Findings Summary */}
            {caseData.findings.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Open Findings</h4>
                <div className="space-y-1">
                  {caseData.findings.slice(0, 5).map((finding) => (
                    <div key={finding.id} className="flex items-center gap-2 text-sm">
                      <SeverityDot severity={finding.severity} />
                      <span className="text-slate-600">{finding.title}</span>
                      <span className="text-slate-400">({finding.category})</span>
                    </div>
                  ))}
                  {caseData.findings.length > 5 && (
                    <p className="text-sm text-slate-500">
                      + {caseData.findings.length - 5} more findings
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Checklist Status */}
            {!checklistComplete && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Incomplete Required Items</h4>
                <ul className="space-y-1">
                  {requiredIncomplete.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm text-slate-600">
                      <XIcon className="h-4 w-4 text-red-500" />
                      {item.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Forms */}
        {(showApproveForm || showRejectForm) && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {showApproveForm ? 'Approval Comment' : 'Rejection Reason'} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={showApproveForm
                ? 'Add any notes about this approval...'
                : 'Explain what needs to be addressed before resubmission...'
              }
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isProcessing}
            />
            <p className="text-xs text-slate-500 mt-1">
              {comment.length}/2000 characters (minimum 10 required)
            </p>

            {error && (
              <div className="mt-2 bg-red-50 text-red-700 px-3 py-2 rounded-md text-sm">{error}</div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <Button
                variant={showApproveForm ? 'primary' : 'destructive'}
                onClick={showApproveForm ? handleApprove : handleReject}
                disabled={isProcessing || comment.length < 10}
              >
                {isProcessing ? 'Processing...' : showApproveForm ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowApproveForm(false)
                  setShowRejectForm(false)
                  setComment('')
                  setError(null)
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showApproveForm && !showRejectForm && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => setShowApproveForm(true)}
              className="flex-1"
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowRejectForm(true)}
              className="flex-1"
            >
              <XIcon className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-amber-500',
    LOW: 'bg-blue-500',
    INFO: 'bg-slate-400',
  }
  return <span className={`h-2 w-2 rounded-full ${colors[severity] || 'bg-slate-400'}`} />
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
