import { z } from 'zod'

export const createCaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  description: z.string().max(2000, 'Description is too long').optional().or(z.literal('')),
  clientId: z.string().min(1, 'Client is required'),
  assignedToId: z.string().optional().or(z.literal('')),
  dueDate: z.string().optional().or(z.literal('')),
})

export type CreateCaseInput = z.infer<typeof createCaseSchema>

export const updateCaseSchema = createCaseSchema.partial().extend({
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'ARCHIVED']).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNASSESSED']).optional(),
  riskScore: z.number().min(0).max(100).optional().nullable(),
})

export type UpdateCaseInput = z.infer<typeof updateCaseSchema>
