import { DocumentType } from '@prisma/client'

// Required document types for due diligence
export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  'ID',
  'PROOF_OF_ADDRESS',
  'SOURCE_OF_WEALTH',
  'SOURCE_OF_FUNDS',
]
