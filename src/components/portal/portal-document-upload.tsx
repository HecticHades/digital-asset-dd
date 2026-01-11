'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DocumentType } from '@prisma/client'

interface PortalDocumentUploadProps {
  clientId: string
  documentType: DocumentType
  onUploadComplete: () => void
  onCancel: () => void
}

type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error'

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  ID: 'ID Document',
  PROOF_OF_ADDRESS: 'Proof of Address',
  TAX_RETURNS: 'Tax Returns',
  BANK_STATEMENTS: 'Bank Statements',
  SOURCE_OF_WEALTH: 'Source of Wealth Declaration',
  SOURCE_OF_FUNDS: 'Source of Funds Documentation',
  EXCHANGE_STATEMENTS: 'Exchange Statements',
  WALLET_PROOF: 'Wallet Ownership Proof',
  OTHER: 'Other Documents',
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function PortalDocumentUpload({
  clientId,
  documentType,
  onUploadComplete,
  onCancel,
}: PortalDocumentUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const acceptedMimeTypes = Object.keys(ACCEPTED_TYPES)
    if (!acceptedMimeTypes.includes(file.type)) {
      return 'Invalid file type. Please upload a PDF, JPG, or PNG file.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
    }
    return null
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const processFile = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      setUploadError(error)
      setUploadState('error')
      return
    }

    setSelectedFile(file)
    setUploadError(null)
    setUploadState('selected')
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        processFile(files[0])
      }
    },
    [processFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        processFile(files[0])
      }
    },
    [processFile]
  )

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploadState('uploading')
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('clientId', clientId)
      formData.append('category', documentType)

      const response = await fetch('/api/portal/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload document')
      }

      setUploadState('success')
      setTimeout(() => {
        onUploadComplete()
      }, 1500)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload document')
      setUploadState('error')
    }
  }

  const resetState = () => {
    setUploadState('idle')
    setSelectedFile(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <div className="text-center pb-4 border-b border-slate-200">
        <h3 className="font-medium text-slate-900">
          Upload {DOCUMENT_LABELS[documentType]}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Please upload a clear, readable copy of your document.
        </p>
      </div>

      {uploadState === 'idle' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-300 hover:border-slate-400'
            }
          `}
        >
          <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-sm font-medium text-slate-900">
            Drop your file here
          </p>
          <p className="mt-1 text-sm text-slate-500">
            or <span className="text-primary-600">browse</span> to select a file
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Supports PDF, JPG, and PNG files up to 10MB
          </p>
        </div>
      )}

      {uploadState === 'selected' && selectedFile && (
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
            <FileIcon file={selectedFile} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
              <Badge className="mt-2">{getFileTypeLabel(selectedFile.type)}</Badge>
            </div>
            <button
              onClick={resetState}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Remove file"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {uploadState === 'uploading' && (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner />
          <p className="mt-4 text-sm text-slate-600">Uploading {selectedFile?.name}...</p>
        </div>
      )}

      {uploadState === 'success' && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <div className="flex items-start">
            <SuccessIcon className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">
                Document Uploaded Successfully
              </h3>
              <p className="mt-2 text-sm text-green-700">
                Your document has been submitted for verification.
              </p>
            </div>
          </div>
        </div>
      )}

      {uploadState === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start">
            <ErrorIcon className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
              <p className="mt-2 text-sm text-red-700">{uploadError}</p>
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={resetState}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileSelect}
      />

      {(uploadState === 'idle' || uploadState === 'selected') && (
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {uploadState === 'selected' && (
            <Button onClick={handleUpload}>Upload Document</Button>
          )}
        </div>
      )}
    </div>
  )
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileTypeLabel(mimeType: string): string {
  const labels: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
  }
  return labels[mimeType] || 'File'
}

function FileIcon({ file }: { file: File }) {
  const isImage = file.type.startsWith('image/')
  const isPDF = file.type === 'application/pdf'

  if (isPDF) {
    return (
      <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded border border-red-200">
        <PDFIcon className="w-6 h-6 text-red-600" />
      </div>
    )
  }

  if (isImage) {
    return (
      <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded border border-blue-200">
        <ImageIcon className="w-6 h-6 text-blue-600" />
      </div>
    )
  }

  return (
    <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded border border-slate-200">
      <DocumentIcon className="w-6 h-6 text-slate-400" />
    </div>
  )
}

// Icons
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  )
}

function PDFIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  )
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function SuccessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
