import { z } from 'zod'

// Default checklist items for compliance
export const DEFAULT_CHECKLIST_ITEMS = [
  {
    title: 'KYC verified',
    description: 'Identity documents verified and approved',
    isRequired: true,
    order: 1,
  },
  {
    title: 'Source of Wealth documented',
    description: 'Documentation explaining how wealth was accumulated',
    isRequired: true,
    order: 2,
  },
  {
    title: 'Source of Funds verified',
    description: 'Documentation verifying the origin of funds being onboarded',
    isRequired: true,
    order: 3,
  },
  {
    title: 'Sanctions screening complete',
    description: 'All addresses and counterparties screened against sanctions lists',
    isRequired: true,
    order: 4,
  },
  {
    title: 'Risk assessment complete',
    description: 'Full risk analysis performed and documented',
    isRequired: true,
    order: 5,
  },
] as const

export const createChecklistItemSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  description: z.string().max(500, 'Description is too long').optional().or(z.literal('')),
  isRequired: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
})

export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>

export const updateChecklistItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long').optional(),
  description: z.string().max(500, 'Description is too long').optional().or(z.literal('')),
  isRequired: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  notes: z.string().max(1000, 'Notes are too long').optional().or(z.literal('')),
})

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>

export const completeChecklistItemSchema = z.object({
  notes: z.string().max(1000, 'Notes are too long').optional().or(z.literal('')),
})

export type CompleteChecklistItemInput = z.infer<typeof completeChecklistItemSchema>

// Checklist completion status type
export interface ChecklistCompletionStatus {
  total: number
  completed: number
  required: number
  requiredCompleted: number
  percentage: number
  requiredPercentage: number
  isComplete: boolean
  missingRequired: string[]
}
