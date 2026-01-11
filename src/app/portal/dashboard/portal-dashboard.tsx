'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DocumentType, DocumentStatus } from '@prisma/client'
import { PortalDocumentUpload } from '@/components/portal/portal-document-upload'
import { Modal, ModalContent } from '@/components/ui/modal'

interface DocumentChecklist {
  type: DocumentType
  label: string
  isRequired: boolean
  status: 'missing' | 'pending' | 'verified' | 'rejected'
  documents: {
    id: string
    filename: string
    status: DocumentStatus
    notes: string | null
    createdAt: string
  }[]
}

interface PortalDashboardProps {
  clientName: string
  organizationName: string
  documentChecklist: DocumentChecklist[]
  progress: number
  unreadMessages: number
  assignedAnalyst: { id: string; name: string; email: string } | null
  clientId: string
}

export function PortalDashboard({
  clientName,
  organizationName,
  documentChecklist,
  progress,
  unreadMessages,
  assignedAnalyst,
  clientId,
}: PortalDashboardProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null)

  const handleUploadClick = (docType: DocumentType) => {
    setSelectedDocType(docType)
    setIsUploadModalOpen(true)
  }

  const handleUploadComplete = () => {
    setIsUploadModalOpen(false)
    setSelectedDocType(null)
    // Refresh the page to show updated documents
    window.location.reload()
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/portal/login' })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Client Portal</h1>
                <p className="text-xs text-slate-500">{organizationName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/portal/messages" className="relative">
                <Button variant="ghost" size="sm">
                  <MessageIcon className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  )}
                </Button>
              </Link>
              <div className="text-sm text-slate-600">{clientName}</div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Welcome, {clientName}</h2>
          <p className="text-slate-600 mt-1">
            Please upload the required documents to complete your onboarding.
          </p>
        </div>

        {/* Progress Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Document Completion</CardTitle>
            <CardDescription>
              {progress}% of required documents have been verified
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  progress === 100
                    ? 'bg-green-500'
                    : progress >= 50
                    ? 'bg-yellow-500'
                    : 'bg-primary-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {progress === 100 && (
              <p className="mt-4 text-sm text-green-600 flex items-center gap-2">
                <CheckIcon className="w-5 h-5" />
                All required documents have been verified!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Analyst Contact Card */}
        {assignedAnalyst && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Assigned Analyst</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-medium">
                      {assignedAnalyst.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{assignedAnalyst.name}</p>
                    <p className="text-sm text-slate-500">{assignedAnalyst.email}</p>
                  </div>
                </div>
                <Link href="/portal/messages">
                  <Button>
                    <MessageIcon className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Document Checklist</CardTitle>
            <CardDescription>
              Upload and track the status of your required documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-200">
              {documentChecklist.map((item) => (
                <div key={item.type} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={item.status} />
                        <h3 className="font-medium text-slate-900">{item.label}</h3>
                        {item.isRequired && (
                          <Badge variant="default">Required</Badge>
                        )}
                      </div>
                      <StatusMessage status={item.status} />

                      {/* Show uploaded documents */}
                      {item.documents.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {item.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between text-sm bg-slate-50 rounded-md p-2"
                            >
                              <div className="flex items-center gap-2">
                                <DocumentIcon className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-700">{doc.filename}</span>
                                <DocumentStatusBadge status={doc.status} />
                              </div>
                              <span className="text-xs text-slate-500">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                          {/* Show rejection notes */}
                          {item.documents.some((d) => d.status === 'REJECTED' && d.notes) && (
                            <div className="mt-2 p-3 bg-red-50 rounded-md">
                              <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                              {item.documents
                                .filter((d) => d.status === 'REJECTED' && d.notes)
                                .map((d) => (
                                  <p key={d.id} className="text-sm text-red-700 mt-1">
                                    {d.notes}
                                  </p>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      {(item.status === 'missing' || item.status === 'rejected') && (
                        <Button
                          size="sm"
                          onClick={() => handleUploadClick(item.type)}
                        >
                          <UploadIcon className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      )}
                      {item.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUploadClick(item.type)}
                        >
                          Upload Another
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Document">
        <ModalContent>
          {selectedDocType && (
            <PortalDocumentUpload
              clientId={clientId}
              documentType={selectedDocType}
              onUploadComplete={handleUploadComplete}
              onCancel={() => setIsUploadModalOpen(false)}
            />
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'verified':
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />
    case 'pending':
      return <ClockIcon className="w-5 h-5 text-yellow-500" />
    case 'rejected':
      return <XCircleIcon className="w-5 h-5 text-red-500" />
    default:
      return <CircleIcon className="w-5 h-5 text-slate-300" />
  }
}

function StatusMessage({ status }: { status: string }) {
  switch (status) {
    case 'verified':
      return <p className="text-sm text-green-600 mt-1">Document verified</p>
    case 'pending':
      return <p className="text-sm text-yellow-600 mt-1">Awaiting verification</p>
    case 'rejected':
      return <p className="text-sm text-red-600 mt-1">Document rejected - please upload a new one</p>
    default:
      return <p className="text-sm text-slate-500 mt-1">Not yet uploaded</p>
  }
}

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  switch (status) {
    case 'VERIFIED':
      return <Badge variant="success">Verified</Badge>
    case 'PENDING':
      return <Badge variant="warning">Pending</Badge>
    case 'REJECTED':
      return <Badge variant="error">Rejected</Badge>
    default:
      return null
  }
}

// Icons
function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  )
}
