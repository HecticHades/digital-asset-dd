'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, ModalContent, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge, RiskBadge } from '@/components/ui/badge'
import type { ApprovalDecision } from '@/lib/validators/approval'

interface CaseData {
  id: string
  title: string
  riskLevel: string
  riskScore: number | null
  client: {
    id: string
    name: string
  }
  assignedTo?: {
    id: string
    name: string
  } | null
  findings: Array<{
    id: string
    severity: string
  }>
  checklistItems: Array<{
    id: string
    isCompleted: boolean
    isRequired: boolean
  }>
}

interface CaseApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  caseData: CaseData
  onApprove: (caseId: string, comment: string) => Promise<{ success: boolean; error?: string }>
  onReject: (caseId: string, comment: string) => Promise<{ success: boolean; error?: string }>
}

export function CaseApprovalModal({
  isOpen,
  onClose,
  caseData,
  onApprove,
  onReject,
}: CaseApprovalModalProps) {
  const router = useRouter()
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDecision, setSelectedDecision] = useState<ApprovalDecision | null>(null)

  const openFindingsCount = caseData.findings.filter((f) => {
    // This check is for unresolved findings - but we only get id and severity from props
    // Assume all findings passed to this component are unresolved
    return true
  }).length

  const criticalHighCount = caseData.findings.filter(
    (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
  ).length

  const checklistComplete =
    caseData.checklistItems.filter((i) => i.isRequired && !i.isCompleted).length === 0

  const handleSubmit = async () => {
    if (!selectedDecision) {
      setError('Please select approve or reject')
      return
    }

    if (comment.length < 10) {
      setError('Comment must be at least 10 characters')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const action = selectedDecision === 'APPROVE' ? onApprove : onReject
      const result = await action(caseData.id, comment)

      if (result.success) {
        router.refresh()
        onClose()
        setComment('')
        setSelectedDecision(null)
      } else {
        setError(result.error || 'Failed to process approval')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      setComment('')
      setSelectedDecision(null)
      setError(null)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Review Case" size="lg">
      <ModalContent>
        {/* Case Summary */}
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-medium text-slate-900 mb-2">{caseData.title}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Client:</span>{' '}
                <span className="text-slate-900">{caseData.client.name}</span>
              </div>
              <div>
                <span className="text-slate-500">Analyst:</span>{' '}
                <span className="text-slate-900">{caseData.assignedTo?.name || 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Risk Level:</span>{' '}
                <RiskBadge level={caseData.riskLevel as 'UNASSESSED' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'} />
              </div>
              <div>
                <span className="text-slate-500">Risk Score:</span>{' '}
                <span className="text-slate-900">{caseData.riskScore ?? 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Review Checklist */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700">Pre-Approval Checklist</h4>
            <div className="space-y-2">
              <ChecklistIndicator
                label="All required checklist items completed"
                isComplete={checklistComplete}
              />
              <ChecklistIndicator
                label="Open findings reviewed"
                value={`${openFindingsCount} open finding(s)`}
                isWarning={openFindingsCount > 0}
              />
              {criticalHighCount > 0 && (
                <ChecklistIndicator
                  label="Critical/High severity findings"
                  value={`${criticalHighCount} critical/high finding(s)`}
                  isWarning={true}
                />
              )}
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700">Decision</h4>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedDecision('APPROVE')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  selectedDecision === 'APPROVE'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 hover:border-green-300 text-slate-600'
                }`}
              >
                <CheckIcon className="h-5 w-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Approve</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDecision('REJECT')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  selectedDecision === 'REJECT'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 hover:border-red-300 text-slate-600'
                }`}
              >
                <XIcon className="h-5 w-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Reject</div>
              </button>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label htmlFor="comment" className="block text-sm font-medium text-slate-700">
              Review Comment <span className="text-red-500">*</span>
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                selectedDecision === 'REJECT'
                  ? 'Explain what needs to be addressed before approval...'
                  : 'Add any notes or observations about this review...'
              }
              rows={4}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500">
              {comment.length}/2000 characters (minimum 10 required)
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-md text-sm">{error}</div>
          )}
        </div>
      </ModalContent>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant={selectedDecision === 'REJECT' ? 'destructive' : 'primary'}
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedDecision || comment.length < 10}
        >
          {isSubmitting
            ? 'Processing...'
            : selectedDecision === 'APPROVE'
              ? 'Approve Case'
              : selectedDecision === 'REJECT'
                ? 'Reject Case'
                : 'Submit Decision'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

interface ChecklistIndicatorProps {
  label: string
  isComplete?: boolean
  isWarning?: boolean
  value?: string
}

function ChecklistIndicator({ label, isComplete, isWarning, value }: ChecklistIndicatorProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        {isComplete !== undefined ? (
          isComplete ? (
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          ) : (
            <XCircleIcon className="h-4 w-4 text-red-500" />
          )
        ) : isWarning ? (
          <WarningIcon className="h-4 w-4 text-amber-500" />
        ) : (
          <InfoIcon className="h-4 w-4 text-slate-400" />
        )}
        <span className="text-slate-600">{label}</span>
      </div>
      {value && <span className="text-slate-500">{value}</span>}
    </div>
  )
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
