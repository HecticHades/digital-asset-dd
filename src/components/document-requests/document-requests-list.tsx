'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal, ModalContent, ModalFooter } from '@/components/ui/modal'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DocumentType, DocumentRequestStatus } from '@prisma/client'
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  DOCUMENT_REQUEST_STATUS_LABELS,
  DOCUMENT_REQUEST_PRIORITY_LABELS,
} from '@/lib/validators/document-request'

// Types for the component props
interface DocumentRequest {
  id: string
  title: string
  description: string | null
  category: DocumentType
  status: DocumentRequestStatus
  priority: string
  dueDate: Date | null
  notes: string | null
  createdAt: Date
  emailSentAt: Date | null
  requestedBy: {
    id: string
    name: string
    email: string
  } | null
  document: {
    id: string
    filename: string
    originalName: string
    status: string
    createdAt: Date
  } | null
}

type PriorityType = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

interface DocumentRequestsListProps {
  clientId: string
  clientName: string
  clientEmail: string | null
  hasPortalAccount: boolean
  requests: DocumentRequest[]
  onCreateRequest: (data: {
    clientId: string
    title: string
    description: string | null
    category: DocumentType
    priority: PriorityType
    dueDate: Date | null
    sendEmail: boolean
  }) => Promise<{ success: boolean; error?: string }>
  onCancelRequest: (data: { requestId: string; notes?: string }) => Promise<{ success: boolean; error?: string }>
  onProcessRequest: (data: { requestId: string; action: 'VERIFIED' | 'REJECTED'; notes?: string }) => Promise<{ success: boolean; error?: string }>
  onResendEmail: (requestId: string) => Promise<{ success: boolean; error?: string }>
}

export function DocumentRequestsList({
  clientId,
  clientName,
  clientEmail,
  hasPortalAccount,
  requests,
  onCreateRequest,
  onCancelRequest,
  onProcessRequest,
  onResendEmail,
}: DocumentRequestsListProps) {
  const router = useRouter()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null)
  const [processAction, setProcessAction] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DocumentType>('OTHER')
  const [priority, setPriority] = useState<PriorityType>('NORMAL')
  const [dueDate, setDueDate] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setCategory('OTHER')
    setPriority('NORMAL')
    setDueDate('')
    setSendEmail(true)
    setNotes('')
    setError(null)
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await onCreateRequest({
        clientId,
        title: title.trim(),
        description: description.trim() || null,
        category,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        sendEmail,
      })

      if (result.success) {
        setIsCreateModalOpen(false)
        resetForm()
        router.refresh()
      } else {
        setError(result.error || 'Failed to create request')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedRequest) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await onCancelRequest({
        requestId: selectedRequest.id,
        notes: notes.trim() || undefined,
      })

      if (result.success) {
        setIsCancelModalOpen(false)
        setSelectedRequest(null)
        setNotes('')
        router.refresh()
      } else {
        setError(result.error || 'Failed to cancel request')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcess = async () => {
    if (!selectedRequest) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await onProcessRequest({
        requestId: selectedRequest.id,
        action: processAction,
        notes: notes.trim() || undefined,
      })

      if (result.success) {
        setIsProcessModalOpen(false)
        setSelectedRequest(null)
        setNotes('')
        router.refresh()
      } else {
        setError(result.error || 'Failed to process request')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async (requestId: string) => {
    const result = await onResendEmail(requestId)
    if (result.success) {
      router.refresh()
    }
  }

  const openCancelModal = (request: DocumentRequest) => {
    setSelectedRequest(request)
    setNotes('')
    setError(null)
    setIsCancelModalOpen(true)
  }

  const openProcessModal = (request: DocumentRequest, action: 'VERIFIED' | 'REJECTED') => {
    setSelectedRequest(request)
    setProcessAction(action)
    setNotes('')
    setError(null)
    setIsProcessModalOpen(true)
  }

  // Group requests by status
  const pendingRequests = requests.filter(r => r.status === 'PENDING' || r.status === 'REJECTED')
  const submittedRequests = requests.filter(r => r.status === 'SUBMITTED')
  const completedRequests = requests.filter(r => r.status === 'VERIFIED' || r.status === 'CANCELLED')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-900">Document Requests</h3>
          <p className="text-sm text-slate-500">
            Request documents from {clientName}
            {!hasPortalAccount && (
              <span className="text-amber-600 ml-2">(No portal account)</span>
            )}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-amber-500" />
              Awaiting Client Response ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-slate-900">{request.title}</div>
                      {request.description && (
                        <div className="text-sm text-slate-500 truncate max-w-xs">
                          {request.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      {DOCUMENT_TYPE_LABELS[request.category] || request.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={request.priority} />
                  </TableCell>
                  <TableCell>
                    {request.dueDate ? (
                      <div className={isPast(new Date(request.dueDate)) ? 'text-red-600' : ''}>
                        {format(new Date(request.dueDate), 'MMM d, yyyy')}
                        {isPast(new Date(request.dueDate)) && (
                          <span className="text-xs ml-1">(overdue)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <RequestStatusBadge status={request.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {hasPortalAccount && clientEmail && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendEmail(request.id)}
                          title="Resend Email"
                        >
                          <MailIcon className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCancelModal(request)}
                        title="Cancel Request"
                      >
                        <XIcon className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Submitted - Awaiting Review */}
      {submittedRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheckIcon className="w-5 h-5 text-blue-500" />
              Submitted - Awaiting Review ({submittedRequests.length})
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Submitted Document</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submittedRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{request.title}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      {DOCUMENT_TYPE_LABELS[request.category] || request.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.document ? (
                      <a
                        href={`/api/documents/${request.document.id}?preview=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline flex items-center gap-1"
                      >
                        <FileIcon className="w-4 h-4" />
                        {request.document.originalName}
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {request.document ? (
                      formatDistanceToNow(new Date(request.document.createdAt), { addSuffix: true })
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openProcessModal(request, 'REJECTED')}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openProcessModal(request, 'VERIFIED')}
                      >
                        Verify
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Completed Requests */}
      {completedRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              Completed ({completedRequests.length})
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{request.title}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      {DOCUMENT_TYPE_LABELS[request.category] || request.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RequestStatusBadge status={request.status} />
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Empty State */}
      {requests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No document requests</h3>
            <p className="text-slate-500 mb-4">
              Create a request to ask {clientName} for specific documents.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create First Request
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Request Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          resetForm()
        }}
        title="Create Document Request"
        size="md"
      >
        <ModalContent>
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Input
              label="Request Title"
              placeholder="e.g., Recent bank statement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description (Instructions for client)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Please provide your most recent bank statement showing your current balance and any transactions from the past 3 months."
              />
            </div>

            <Select
              label="Document Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentType)}
              options={DOCUMENT_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
            />

            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityType)}
              options={PRIORITY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
            />

            <Input
              type="date"
              label="Due Date (Optional)"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            {hasPortalAccount && clientEmail && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="sendEmail" className="text-sm text-slate-700">
                  Send email notification to client ({clientEmail})
                </label>
              </div>
            )}

            {!hasPortalAccount && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-700">
                  This client does not have a portal account. They will not be able to respond to this request online.
                </p>
              </div>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsCreateModalOpen(false)
              resetForm()
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Request'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Cancel Request Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false)
          setSelectedRequest(null)
          setNotes('')
        }}
        title="Cancel Request"
        size="sm"
      >
        <ModalContent>
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <p className="text-slate-600">
              Are you sure you want to cancel this document request?
            </p>

            {selectedRequest && (
              <div className="p-3 bg-slate-50 rounded-md">
                <p className="font-medium text-slate-900">{selectedRequest.title}</p>
                <p className="text-sm text-slate-500">
                  {DOCUMENT_TYPE_LABELS[selectedRequest.category]}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cancellation Reason (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="No longer needed..."
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsCancelModalOpen(false)
              setSelectedRequest(null)
              setNotes('')
            }}
            disabled={isLoading}
          >
            Keep Request
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={isLoading}>
            {isLoading ? 'Cancelling...' : 'Cancel Request'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Process Request Modal */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => {
          setIsProcessModalOpen(false)
          setSelectedRequest(null)
          setNotes('')
        }}
        title={processAction === 'VERIFIED' ? 'Verify Document' : 'Reject Document'}
        size="md"
      >
        <ModalContent>
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {selectedRequest && (
              <>
                <div className="p-3 bg-slate-50 rounded-md">
                  <p className="font-medium text-slate-900">{selectedRequest.title}</p>
                  <p className="text-sm text-slate-500">
                    {DOCUMENT_TYPE_LABELS[selectedRequest.category]}
                  </p>
                </div>

                {selectedRequest.document && (
                  <div className="border border-slate-200 rounded-md p-3">
                    <p className="text-sm font-medium text-slate-700 mb-2">Submitted Document:</p>
                    <a
                      href={`/api/documents/${selectedRequest.document.id}?preview=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <FileIcon className="w-4 h-4" />
                      {selectedRequest.document.originalName}
                    </a>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {processAction === 'VERIFIED' ? 'Verification Notes (Optional)' : 'Rejection Reason'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={
                  processAction === 'VERIFIED'
                    ? 'Document verified successfully...'
                    : 'Please explain why this document was rejected...'
                }
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsProcessModalOpen(false)
              setSelectedRequest(null)
              setNotes('')
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={processAction === 'VERIFIED' ? 'primary' : 'destructive'}
            onClick={handleProcess}
            disabled={isLoading}
          >
            {isLoading
              ? 'Processing...'
              : processAction === 'VERIFIED'
              ? 'Verify Document'
              : 'Reject Document'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

// Helper components

function RequestStatusBadge({ status }: { status: DocumentRequestStatus }) {
  const config = DOCUMENT_REQUEST_STATUS_LABELS[status]
  const variants: Record<DocumentRequestStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    PENDING: 'warning',
    SUBMITTED: 'info',
    VERIFIED: 'success',
    REJECTED: 'error',
    CANCELLED: 'default',
  }
  return <Badge variant={variants[status]}>{config?.label || status}</Badge>
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = DOCUMENT_REQUEST_PRIORITY_LABELS[priority as keyof typeof DOCUMENT_REQUEST_PRIORITY_LABELS]
  const variants: Record<string, 'default' | 'warning' | 'error'> = {
    LOW: 'default',
    NORMAL: 'default',
    HIGH: 'warning',
    URGENT: 'error',
  }
  return <Badge variant={variants[priority] || 'default'}>{config?.label || priority}</Badge>
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function FileCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
