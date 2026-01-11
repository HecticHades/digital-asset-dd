'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DocumentType } from '@prisma/client'

interface DocumentUploadProps {
  clientId: string
  onUploadComplete?: (document: UploadedDocument) => void
  onCancel?: () => void
}

interface UploadedDocument {
  id: string
  filename: string
  originalName: string
  category: DocumentType
  size: number
  mimeType: string
}

type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error'

const DOCUMENT_CATEGORIES: { value: DocumentType; label: string }[] = [
  { value: 'ID', label: 'ID Document' },
  { value: 'PROOF_OF_ADDRESS', label: 'Proof of Address' },
  { value: 'TAX_RETURNS', label: 'Tax Returns' },
  { value: 'BANK_STATEMENTS', label: 'Bank Statements' },
  { value: 'SOURCE_OF_WEALTH', label: 'Source of Wealth' },
  { value: 'SOURCE_OF_FUNDS', label: 'Source of Funds' },
  { value: 'EXCHANGE_STATEMENTS', label: 'Exchange Statements' },
  { value: 'WALLET_PROOF', label: 'Wallet Proof' },
  { value: 'OTHER', label: 'Other' },
]

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function DocumentUpload({ clientId, onUploadComplete, onCancel }: DocumentUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState<DocumentType>('OTHER')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocument | null>(null)
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

    // Try to auto-detect category based on filename
    const lowercaseName = file.name.toLowerCase()
    if (lowercaseName.includes('id') || lowercaseName.includes('passport') || lowercaseName.includes('license')) {
      setCategory('ID')
    } else if (lowercaseName.includes('address') || lowercaseName.includes('utility') || lowercaseName.includes('bill')) {
      setCategory('PROOF_OF_ADDRESS')
    } else if (lowercaseName.includes('tax')) {
      setCategory('TAX_RETURNS')
    } else if (lowercaseName.includes('bank') || lowercaseName.includes('statement')) {
      setCategory('BANK_STATEMENTS')
    } else if (lowercaseName.includes('exchange') || lowercaseName.includes('binance') || lowercaseName.includes('coinbase')) {
      setCategory('EXCHANGE_STATEMENTS')
    } else if (lowercaseName.includes('wallet') || lowercaseName.includes('address')) {
      setCategory('WALLET_PROOF')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploadState('uploading')
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('clientId', clientId)
      formData.append('category', category)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload document')
      }

      setUploadedDocument(data.document)
      setUploadState('success')
      onUploadComplete?.(data.document)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload document')
      setUploadState('error')
    }
  }

  const resetState = () => {
    setUploadState('idle')
    setSelectedFile(null)
    setCategory('OTHER')
    setUploadError(null)
    setUploadedDocument(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
        <CardDescription>
          Upload PDF or image files (JPG, PNG). Maximum size: 10MB.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {uploadState === 'idle' && (
          <DropZone
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onBrowseClick={handleBrowseClick}
          />
        )}

        {uploadState === 'selected' && selectedFile && (
          <FilePreview
            file={selectedFile}
            category={category}
            onCategoryChange={setCategory}
            onRemove={resetState}
          />
        )}

        {uploadState === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner />
            <p className="mt-4 text-sm text-slate-600">Uploading {selectedFile?.name}...</p>
          </div>
        )}

        {uploadState === 'success' && uploadedDocument && (
          <SuccessDisplay
            document={uploadedDocument}
            onUploadAnother={resetState}
          />
        )}

        {uploadState === 'error' && (
          <ErrorDisplay
            error={uploadError || 'Unknown error'}
            onTryAgain={resetState}
          />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileSelect}
        />
      </CardContent>

      <CardFooter className="flex justify-end gap-3">
        {(uploadState === 'selected' || uploadState === 'error') && (
          <>
            <Button
              variant="outline"
              onClick={() => {
                resetState()
                onCancel?.()
              }}
            >
              Cancel
            </Button>
            {uploadState === 'selected' && (
              <Button onClick={handleUpload}>
                Upload Document
              </Button>
            )}
          </>
        )}
        {uploadState === 'success' && (
          <Button
            variant="outline"
            onClick={() => {
              resetState()
              onCancel?.()
            }}
          >
            Done
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

interface DropZoneProps {
  isDragging: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onBrowseClick: () => void
}

function DropZone({ isDragging, onDragOver, onDragLeave, onDrop, onBrowseClick }: DropZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
        ${isDragging
          ? 'border-primary-500 bg-primary-50'
          : 'border-slate-300 hover:border-slate-400'
        }
      `}
      onClick={onBrowseClick}
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
  )
}

interface FilePreviewProps {
  file: File
  category: DocumentType
  onCategoryChange: (category: DocumentType) => void
  onRemove: () => void
}

function FilePreview({ file, category, onCategoryChange, onRemove }: FilePreviewProps) {
  const isImage = file.type.startsWith('image/')
  const isPDF = file.type === 'application/pdf'
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Create preview URL for images
  useState(() => {
    if (isImage) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
        <div className="flex-shrink-0">
          {isImage && previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-16 h-16 object-cover rounded border border-slate-200"
            />
          ) : isPDF ? (
            <div className="w-16 h-16 flex items-center justify-center bg-red-100 rounded border border-red-200">
              <PDFIcon className="w-8 h-8 text-red-600" />
            </div>
          ) : (
            <div className="w-16 h-16 flex items-center justify-center bg-slate-100 rounded border border-slate-200">
              <FileIcon className="w-8 h-8 text-slate-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
          <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
          <Badge className="mt-2">{getFileTypeLabel(file.type)}</Badge>
        </div>
        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-slate-600"
          aria-label="Remove file"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <div>
        <Select
          label="Document Category"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as DocumentType)}
          options={DOCUMENT_CATEGORIES}
          hint="Select the appropriate category for this document"
        />
      </div>
    </div>
  )
}

interface ErrorDisplayProps {
  error: string
  onTryAgain: () => void
}

function ErrorDisplay({ error, onTryAgain }: ErrorDisplayProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <div className="flex items-start">
        <ErrorIcon className="h-5 w-5 text-red-500 mt-0.5" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onTryAgain}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SuccessDisplayProps {
  document: UploadedDocument
  onUploadAnother: () => void
}

function SuccessDisplay({ document, onUploadAnother }: SuccessDisplayProps) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-6">
      <div className="flex items-start">
        <SuccessIcon className="h-5 w-5 text-green-500 mt-0.5" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-green-800">Document Uploaded Successfully</h3>
          <div className="mt-2 text-sm text-green-700">
            <p><strong>File:</strong> {document.originalName}</p>
            <p><strong>Category:</strong> {formatCategory(document.category)}</p>
            <p><strong>Size:</strong> {formatFileSize(document.size)}</p>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onUploadAnother}>
              Upload Another Document
            </Button>
          </div>
        </div>
      </div>
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

function formatCategory(category: DocumentType): string {
  const labels: Record<DocumentType, string> = {
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
  return labels[category]
}

// Icons
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  )
}

function PDFIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SuccessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
