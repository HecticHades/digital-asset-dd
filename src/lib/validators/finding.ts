import { z } from 'zod'

// Finding severity levels
export const findingSeverityEnum = z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

// Finding categories
export const findingCategoryEnum = z.enum([
  'SANCTIONS',
  'MIXER',
  'SOURCE',
  'JURISDICTION',
  'BEHAVIOR',
  'PRIVACY',
  'MARKET',
  'OTHER',
])

// Schema for creating a new finding (manual flag by analyst)
export const createFindingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  severity: findingSeverityEnum,
  category: findingCategoryEnum,
  caseId: z.string().min(1, 'Case ID is required'),
  walletId: z.string().optional(),
  transactionId: z.string().optional(),
  linkedAddress: z.string().optional(),
})

// Schema for updating a finding
export const updateFindingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  severity: findingSeverityEnum.optional(),
  category: findingCategoryEnum.optional(),
})

// Schema for resolving a finding
export const resolveFindingSchema = z.object({
  resolution: z.string().min(1, 'Resolution notes are required').max(2000, 'Resolution must be less than 2000 characters'),
})

// Infer types from schemas
export type CreateFindingInput = z.infer<typeof createFindingSchema>
export type UpdateFindingInput = z.infer<typeof updateFindingSchema>
export type ResolveFindingInput = z.infer<typeof resolveFindingSchema>
export type FindingSeverity = z.infer<typeof findingSeverityEnum>
export type FindingCategory = z.infer<typeof findingCategoryEnum>

// Human-readable labels
export const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  INFO: 'Info',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

export const CATEGORY_LABELS: Record<FindingCategory, string> = {
  SANCTIONS: 'Sanctions',
  MIXER: 'Mixer Activity',
  SOURCE: 'Source of Funds',
  JURISDICTION: 'Jurisdiction',
  BEHAVIOR: 'Behavior',
  PRIVACY: 'Privacy',
  MARKET: 'Market Risk',
  OTHER: 'Other',
}
