'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { RiskBreakdown } from '@/components/risk/risk-breakdown'
import { FindingsList } from '@/components/findings/findings-list'
import { ComplianceChecklist } from '@/components/checklist/compliance-checklist'
import { CaseApprovalModal } from '@/components/approval/case-approval-modal'
import type { RiskBreakdown as RiskBreakdownType } from '@/lib/analyzers/risk'
import type { FindingSeverity, FindingCategory } from '@/lib/validators/finding'
import type { ChecklistCompletionStatus } from '@/lib/validators/checklist'

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

interface ChecklistItem {
  id: string
  title: string
  description: string | null
  isRequired: boolean
  isCompleted: boolean
  notes: string | null
  completedAt: string | null
  completedBy?: {
    id: string
    name: string
  } | null
}

interface Report {
  id: string
  version: number
  filename: string
  size: number
  isLocked: boolean
  createdAt: string
}

interface Client {
  id: string
  name: string
  email: string | null
}

interface CaseData {
  id: string
  title: string
  description: string | null
  status: string
  riskScore: number | null
  riskLevel: string
  dueDate: string | null
  createdAt: string
  updatedAt: string
  reviewedAt: string | null
  reviewNotes: string | null
  client: Client
  findings: Finding[]
  checklistItems: ChecklistItem[]
  reports: Report[]
  assignedTo: { id: string; name: string; email: string } | null
  reviewedBy: { id: string; name: string; email: string } | null
}

interface TimelineEvent {
  date: string
  title: string
  description: string
  type: string
}

interface CaseTabsProps {
  caseData: CaseData
  timeline: TimelineEvent[]
  riskBreakdown: RiskBreakdownType
  checklistCompletionStatus: ChecklistCompletionStatus
  onCreateFinding: (data: {
    title: string
    description?: string
    severity: FindingSeverity
    category: FindingCategory
    caseId: string
  }) => Promise<{ success: boolean; error?: string }>
  onResolveFinding: (id: string, resolution: string) => Promise<{ success: boolean; error?: string }>
  onReopenFinding: (id: string) => Promise<{ success: boolean; error?: string }>
  onInitializeChecklist: () => Promise<{ success: boolean; error?: string }>
  onCompleteChecklistItem: (itemId: string, notes?: string) => Promise<{ success: boolean; error?: string }>
  onUncompleteChecklistItem: (itemId: string) => Promise<{ success: boolean; error?: string }>
  onAddChecklistItem: (data: { title: string; description?: string; isRequired: boolean }) => Promise<{ success: boolean; error?: string }>
  onDeleteChecklistItem: (itemId: string) => Promise<{ success: boolean; error?: string }>
  onSubmitForReview: () => Promise<{ success: boolean; error?: string }>
  onApproveCase: (caseId: string, comment: string) => Promise<{ success: boolean; error?: string }>
  onRejectCase: (caseId: string, comment: string) => Promise<{ success: boolean; error?: string }>
  onReopenRejectedCase: (caseId: string) => Promise<{ success: boolean; error?: string }>
  onMarkCaseCompleted: (caseId: string) => Promise<{ success: boolean; error?: string }>
}

function getTimelineIcon(type: string) {
  switch (type) {
    case 'created':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      )
    case 'assigned':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )
    case 'approved':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )
    case 'rejected':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
  }
}

export function CaseTabs({
  caseData,
  timeline,
  riskBreakdown,
  checklistCompletionStatus,
  onCreateFinding,
  onResolveFinding,
  onReopenFinding,
  onInitializeChecklist,
  onCompleteChecklistItem,
  onUncompleteChecklistItem,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onSubmitForReview,
  onApproveCase,
  onRejectCase,
  onReopenRejectedCase,
  onMarkCaseCompleted,
}: CaseTabsProps) {
  const router = useRouter()
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  const openFindingsCount = caseData.findings.filter((f) => !f.isResolved).length
  const checklistComplete = checklistCompletionStatus.isComplete

  // Determine which actions are available based on case status
  const canReview = caseData.status === 'PENDING_REVIEW'
  const canReopen = caseData.status === 'REJECTED'
  const canComplete = caseData.status === 'APPROVED'

  const handleReopenCase = async () => {
    setIsProcessing(true)
    setActionError(null)
    try {
      const result = await onReopenRejectedCase(caseData.id)
      if (!result.success) {
        setActionError(result.error || 'Failed to reopen case')
      }
    } catch {
      setActionError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMarkCompleted = async () => {
    setIsProcessing(true)
    setActionError(null)
    try {
      const result = await onMarkCaseCompleted(caseData.id)
      if (!result.success) {
        setActionError(result.error || 'Failed to complete case')
      }
    } catch {
      setActionError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    setReportError(null)
    try {
      const response = await fetch(`/api/reports/${caseData.id}`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        setReportError(data.error || 'Failed to generate report')
      } else {
        // Refresh the page to show new report
        router.refresh()
      }
    } catch {
      setReportError('An unexpected error occurred')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleDownloadReport = (reportId: string) => {
    window.open(`/api/reports/${caseData.id}/download/${reportId}`, '_blank')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Prepare case data for approval modal
  const approvalCaseData = {
    id: caseData.id,
    title: caseData.title,
    riskLevel: caseData.riskLevel,
    riskScore: caseData.riskScore,
    client: caseData.client,
    assignedTo: caseData.assignedTo,
    findings: caseData.findings.filter((f) => !f.isResolved).map((f) => ({
      id: f.id,
      severity: f.severity,
    })),
    checklistItems: caseData.checklistItems.map((c) => ({
      id: c.id,
      isCompleted: c.isCompleted,
      isRequired: c.isRequired,
    })),
  }

  return (
    <>
      {/* Status-based Action Banner */}
      {(canReview || canReopen || canComplete || caseData.status === 'REJECTED') && (
        <div className={`mb-6 rounded-lg p-4 ${
          caseData.status === 'PENDING_REVIEW' ? 'bg-amber-50 border border-amber-200' :
          caseData.status === 'REJECTED' ? 'bg-red-50 border border-red-200' :
          caseData.status === 'APPROVED' ? 'bg-green-50 border border-green-200' :
          'bg-slate-50 border border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {caseData.status === 'PENDING_REVIEW' && (
                <>
                  <ClockIcon className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-amber-800">Case Pending Review</p>
                    <p className="text-sm text-amber-600">This case is awaiting compliance officer review.</p>
                  </div>
                </>
              )}
              {caseData.status === 'REJECTED' && (
                <>
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-800">Case Rejected</p>
                    <p className="text-sm text-red-600">
                      {caseData.reviewNotes ? `Feedback: ${caseData.reviewNotes}` : 'Please address the feedback and resubmit.'}
                    </p>
                  </div>
                </>
              )}
              {caseData.status === 'APPROVED' && (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-800">Case Approved</p>
                    <p className="text-sm text-green-600">
                      {caseData.reviewedBy ? `Approved by ${caseData.reviewedBy.name}` : 'Ready to be marked as completed.'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canReview && (
                <Button
                  variant="primary"
                  onClick={() => setShowApprovalModal(true)}
                  disabled={isProcessing}
                >
                  Review Case
                </Button>
              )}
              {canReopen && (
                <Button
                  variant="outline"
                  onClick={handleReopenCase}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Reopen for Revision'}
                </Button>
              )}
              {canComplete && (
                <Button
                  variant="primary"
                  onClick={handleMarkCompleted}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Mark as Completed'}
                </Button>
              )}
            </div>
          </div>

          {actionError && (
            <div className="mt-3 bg-red-100 text-red-700 px-3 py-2 rounded-md text-sm">
              {actionError}
            </div>
          )}
        </div>
      )}

      {/* Case Approval Modal */}
      <CaseApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        caseData={approvalCaseData}
        onApprove={onApproveCase}
        onReject={onRejectCase}
      />

      <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
        <TabsTrigger value="findings">
          Findings ({openFindingsCount}
          {caseData.findings.length > openFindingsCount && ` / ${caseData.findings.length}`})
        </TabsTrigger>
        <TabsTrigger value="checklist">
          Checklist ({checklistCompletionStatus.completed}/{checklistCompletionStatus.total})
          {checklistComplete && (
            <svg className="ml-1 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </TabsTrigger>
        <TabsTrigger value="reports">Reports ({caseData.reports.length})</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-slate-500">Description</dt>
                <dd className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">
                  {caseData.description || 'No description provided'}
                </dd>
              </div>
              {caseData.reviewNotes && (
                <div>
                  <dt className="text-sm font-medium text-slate-500">Review Notes</dt>
                  <dd className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">
                    {caseData.reviewNotes}
                  </dd>
                </div>
              )}
              <div className="pt-4 border-t border-slate-200">
                <dt className="text-sm font-medium text-slate-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {format(new Date(caseData.updatedAt), 'PPpp')}
                </dd>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-slate-500">Name</dt>
                <dd className="mt-1 text-sm text-slate-900">{caseData.client.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Email</dt>
                <dd className="mt-1 text-sm text-slate-900">{caseData.client.email || '-'}</dd>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="risk">
        <RiskBreakdown breakdown={riskBreakdown} />
      </TabsContent>

      <TabsContent value="findings">
        <FindingsList
          findings={caseData.findings}
          caseId={caseData.id}
          onCreateFinding={onCreateFinding}
          onResolveFinding={onResolveFinding}
          onReopenFinding={onReopenFinding}
        />
      </TabsContent>

      <TabsContent value="checklist">
        <ComplianceChecklist
          items={caseData.checklistItems}
          caseId={caseData.id}
          caseStatus={caseData.status}
          completionStatus={checklistCompletionStatus}
          onInitialize={onInitializeChecklist}
          onComplete={onCompleteChecklistItem}
          onUncomplete={onUncompleteChecklistItem}
          onAddItem={onAddChecklistItem}
          onDeleteItem={onDeleteChecklistItem}
          onSubmitForReview={onSubmitForReview}
        />
      </TabsContent>

      <TabsContent value="reports">
        <div className="space-y-6">
          {/* Generate Report Section */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-2">
                    Generate a comprehensive PDF due diligence report for this case.
                    The report includes all findings, risk assessment, client profile,
                    transaction analysis, and recommendations.
                  </p>
                  {caseData.reports.length > 0 && (
                    <p className="text-xs text-slate-500">
                      Generating a new report will create version {caseData.reports[0].version + 1}.
                    </p>
                  )}
                </div>
                <Button
                  variant="primary"
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                >
                  {isGeneratingReport ? (
                    <>
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <DocumentPlusIcon className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
              {reportError && (
                <div className="mt-3 bg-red-50 text-red-700 px-3 py-2 rounded-md text-sm">
                  {reportError}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report History */}
          {caseData.reports.length === 0 ? (
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
              <h3 className="mt-4 text-lg font-medium text-slate-900">No reports generated yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Click &quot;Generate Report&quot; to create your first report.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="font-medium text-slate-900">Report History</h3>
                <p className="text-sm text-slate-500">{caseData.reports.length} report(s) generated</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caseData.reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">v{report.version}</TableCell>
                      <TableCell className="text-sm">{report.filename}</TableCell>
                      <TableCell className="text-sm text-slate-500">{formatFileSize(report.size)}</TableCell>
                      <TableCell>
                        {report.isLocked ? (
                          <Badge variant="success">Final</Badge>
                        ) : (
                          <Badge variant="default">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(report.createdAt), 'MMM d, yyyy h:mm a')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadReport(report.id)}
                        >
                          <DownloadIcon className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="timeline">
        <Card>
          <CardContent className="pt-6">
            <div className="flow-root">
              <ul className="-mb-8">
                {timeline.map((event, eventIdx) => (
                  <li key={eventIdx}>
                    <div className="relative pb-8">
                      {eventIdx !== timeline.length - 1 && (
                        <span
                          className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        {getTimelineIcon(event.type)}
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{event.title}</p>
                            <p className="text-sm text-slate-500">{event.description}</p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-slate-500">
                            {format(new Date(event.date), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    </>
  )
}

// Icon components
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function DocumentPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
