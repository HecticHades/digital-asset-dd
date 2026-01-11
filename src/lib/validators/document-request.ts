import { z } from 'zod'

// Document request status enum
export const DocumentRequestStatus = z.enum([
  'PENDING',
  'SUBMITTED',
  'VERIFIED',
  'REJECTED',
  'CANCELLED',
])

export type DocumentRequestStatusType = z.infer<typeof DocumentRequestStatus>

// Document request priority
export const DocumentRequestPriority = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])

export type DocumentRequestPriorityType = z.infer<typeof DocumentRequestPriority>

// Document types for requests
export const DocumentType = z.enum([
  'ID',
  'PROOF_OF_ADDRESS',
  'TAX_RETURNS',
  'BANK_STATEMENTS',
  'SOURCE_OF_WEALTH',
  'SOURCE_OF_FUNDS',
  'EXCHANGE_STATEMENTS',
  'WALLET_PROOF',
  'OTHER',
])

// Create document request schema
export const createDocumentRequestSchema = z.object({
  clientId: z.string().cuid(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional().nullable(),
  category: DocumentType,
  priority: DocumentRequestPriority.default('NORMAL'),
  dueDate: z.coerce.date().optional().nullable(),
  sendEmail: z.boolean().default(true),
})

export type CreateDocumentRequestInput = z.infer<typeof createDocumentRequestSchema>

// Update document request schema
export const updateDocumentRequestSchema = z.object({
  requestId: z.string().cuid(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  priority: DocumentRequestPriority.optional(),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export type UpdateDocumentRequestInput = z.infer<typeof updateDocumentRequestSchema>

// Cancel document request schema
export const cancelDocumentRequestSchema = z.object({
  requestId: z.string().cuid(),
  notes: z.string().max(2000).optional(),
})

export type CancelDocumentRequestInput = z.infer<typeof cancelDocumentRequestSchema>

// Verify/reject submitted document schema
export const processDocumentRequestSchema = z.object({
  requestId: z.string().cuid(),
  action: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().max(2000).optional(),
})

export type ProcessDocumentRequestInput = z.infer<typeof processDocumentRequestSchema>

// Submit document for request (portal user)
export const submitDocumentRequestSchema = z.object({
  requestId: z.string().cuid(),
  documentId: z.string().cuid(),
})

export type SubmitDocumentRequestInput = z.infer<typeof submitDocumentRequestSchema>

// Status labels for UI
export const DOCUMENT_REQUEST_STATUS_LABELS: Record<DocumentRequestStatusType, { label: string; description: string }> = {
  PENDING: {
    label: 'Pending',
    description: 'Waiting for client to upload document',
  },
  SUBMITTED: {
    label: 'Submitted',
    description: 'Client has submitted a document, awaiting review',
  },
  VERIFIED: {
    label: 'Verified',
    description: 'Document has been verified by analyst',
  },
  REJECTED: {
    label: 'Rejected',
    description: 'Document was rejected and needs to be resubmitted',
  },
  CANCELLED: {
    label: 'Cancelled',
    description: 'Request was cancelled',
  },
}

// Priority labels for UI
export const DOCUMENT_REQUEST_PRIORITY_LABELS: Record<DocumentRequestPriorityType, { label: string; color: string }> = {
  LOW: {
    label: 'Low',
    color: 'text-slate-600',
  },
  NORMAL: {
    label: 'Normal',
    color: 'text-blue-600',
  },
  HIGH: {
    label: 'High',
    color: 'text-amber-600',
  },
  URGENT: {
    label: 'Urgent',
    color: 'text-red-600',
  },
}

// Document type labels for UI
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ID: 'Government-Issued ID',
  PROOF_OF_ADDRESS: 'Proof of Address',
  TAX_RETURNS: 'Tax Returns',
  BANK_STATEMENTS: 'Bank Statements',
  SOURCE_OF_WEALTH: 'Source of Wealth Documentation',
  SOURCE_OF_FUNDS: 'Source of Funds Documentation',
  EXCHANGE_STATEMENTS: 'Exchange Statements',
  WALLET_PROOF: 'Wallet Ownership Proof',
  OTHER: 'Other Document',
}

// Priority options for dropdowns
export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low Priority' },
  { value: 'NORMAL', label: 'Normal Priority' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'URGENT', label: 'Urgent' },
] as const

// Document type options for dropdowns
export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'ID', label: 'Government-Issued ID' },
  { value: 'PROOF_OF_ADDRESS', label: 'Proof of Address' },
  { value: 'TAX_RETURNS', label: 'Tax Returns' },
  { value: 'BANK_STATEMENTS', label: 'Bank Statements' },
  { value: 'SOURCE_OF_WEALTH', label: 'Source of Wealth' },
  { value: 'SOURCE_OF_FUNDS', label: 'Source of Funds' },
  { value: 'EXCHANGE_STATEMENTS', label: 'Exchange Statements' },
  { value: 'WALLET_PROOF', label: 'Wallet Proof' },
  { value: 'OTHER', label: 'Other' },
] as const
