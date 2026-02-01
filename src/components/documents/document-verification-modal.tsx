'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal, ModalContent, ModalFooter } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import type { Document, DocumentStatus, DocumentType } from '@prisma/client'

interface DocumentVerificationModalProps {
  document: Document & {
    verifiedBy?: { id: string; name: string; email: string } | null
  }
  isOpen: boolean
  onClose: () => void
  onVerify: (documentId: string, status: 'VERIFIED' | 'REJECTED', notes?: string) => Promise<void>
}

export function DocumentVerificationModal({
  document,
  isOpen,
  onClose,
  onVerify,
}: DocumentVerificationModalProps) {
  const [notes, setNotes] = useState(document.notes || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async (status: 'VERIFIED' | 'REJECTED') => {
    setIsSubmitting(true)
    setError(null)
    try {
      await onVerify(document.id, status, notes)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document status')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isPending = document.status === 'PENDING'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verify Document"
      size="lg"
    >
      <ModalContent>
        <div className="space-y-4">
          {/* Document Preview */}
          <div className="bg-void-800/50 border border-void-700/50 rounded-lg min-h-[300px] flex items-center justify-center">
            {document.mimeType.startsWith('image/') ? (
              <img
                src={`/api/documents/${document.id}?preview=true`}
                alt={document.originalName}
                className="max-w-full max-h-[400px] object-contain"
              />
            ) : document.mimeType === 'application/pdf' ? (
              <iframe
                src={`/api/documents/${document.id}?preview=true`}
                className="w-full h-[400px]"
                title={document.originalName}
              />
            ) : (
              <div className="text-center p-8">
                <FileIcon className="h-16 w-16 text-void-500 mx-auto" />
                <p className="mt-4 text-void-400">Preview not available</p>
              </div>
            )}
          </div>

          {/* Document Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-void-400">File Name</dt>
              <dd className="font-medium text-void-200">{document.originalName}</dd>
            </div>
            <div>
              <dt className="text-void-400">Category</dt>
              <dd className="font-medium text-void-200">
                {formatDocumentType(document.category)}
              </dd>
            </div>
            <div>
              <dt className="text-void-400">Status</dt>
              <dd><DocumentStatusBadge status={document.status} /></dd>
            </div>
            <div>
              <dt className="text-void-400">Uploaded</dt>
              <dd className="font-medium text-void-200">
                {format(new Date(document.createdAt), 'PPpp')}
              </dd>
            </div>
            {document.verifiedBy && document.verifiedAt && (
              <>
                <div>
                  <dt className="text-void-400">Verified By</dt>
                  <dd className="font-medium text-void-200">{document.verifiedBy.name}</dd>
                </div>
                <div>
                  <dt className="text-void-400">Verified At</dt>
                  <dd className="font-medium text-void-200">
                    {format(new Date(document.verifiedAt), 'PPpp')}
                  </dd>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="verification-notes"
              className="block text-sm font-medium text-void-300 mb-1"
            >
              Verification Notes
            </label>
            <textarea
              id="verification-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="block w-full rounded-md border border-void-700 bg-void-800 px-3 py-2 text-sm text-void-100 placeholder:text-void-500 focus:outline-none focus:ring-2 focus:ring-neon-500 focus:border-neon-500"
              placeholder="Add notes about this document (optional)"
              disabled={!isPending}
            />
          </div>

          {error && (
            <div className="rounded-md bg-risk-500/10 border border-risk-500/30 p-3 text-sm text-risk-400">
              {error}
            </div>
          )}
        </div>
      </ModalContent>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Close
        </Button>
        {isPending && (
          <>
            <Button
              variant="destructive"
              onClick={() => handleVerify('REJECTED')}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Reject'}
            </Button>
            <Button
              onClick={() => handleVerify('VERIFIED')}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Verify'}
            </Button>
          </>
        )}
        <a href={`/api/documents/${document.id}?download=true`} download>
          <Button variant="secondary">
            <DownloadIcon className="w-4 h-4 mr-2" />
            Download
          </Button>
        </a>
      </ModalFooter>
    </Modal>
  )
}

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const variants: Record<DocumentStatus, 'default' | 'success' | 'error' | 'warning'> = {
    PENDING: 'warning',
    VERIFIED: 'success',
    REJECTED: 'error',
  }
  return <Badge variant={variants[status]}>{status}</Badge>
}

function formatDocumentType(type: DocumentType): string {
  const names: Record<DocumentType, string> = {
    ID: 'ID Document',
    PROOF_OF_ADDRESS: 'Proof of Address',
    TAX_RETURNS: 'Tax Returns',
    BANK_STATEMENTS: 'Bank Statements',
    SOURCE_OF_WEALTH: 'Source of Wealth',
    SOURCE_OF_FUNDS: 'Source of Funds',
    EXCHANGE_STATEMENTS: 'Exchange Statements',
    WALLET_PROOF: 'Wallet Proof',
    OTHER: 'Other',
  }
  return names[type]
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}
