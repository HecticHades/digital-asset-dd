import { z } from 'zod'
import { UserRole } from '@prisma/client'

/**
 * Schema for inviting a new user
 */
export const inviteUserSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .transform((e) => e.toLowerCase()),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>

/**
 * Schema for updating a user's details
 */
export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  isActive: z.boolean(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

/**
 * Schema for deactivating a user
 */
export const deactivateUserSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  reason: z
    .string()
    .max(500, 'Reason must be less than 500 characters')
    .optional(),
})

export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>

/**
 * Schema for reactivating a user
 */
export const reactivateUserSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
})

export type ReactivateUserInput = z.infer<typeof reactivateUserSchema>

/**
 * User roles available for selection
 */
export const USER_ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Administrator', description: 'Full access to all features' },
  { value: 'MANAGER', label: 'Manager', description: 'Oversee cases and assign analysts' },
  { value: 'ANALYST', label: 'Analyst', description: 'Conduct investigations and analyze' },
  { value: 'COMPLIANCE_OFFICER', label: 'Compliance Officer', description: 'Review and approve cases' },
  { value: 'AUDITOR', label: 'Auditor', description: 'Read-only access for audits' },
] as const
