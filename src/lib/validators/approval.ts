import { z } from 'zod'

// Approval decision enum
export const approvalDecisionEnum = z.enum(['APPROVE', 'REJECT'])

// Schema for submitting a case for review
export const submitForReviewSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
})

// Schema for approving or rejecting a case
export const caseApprovalSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
  decision: approvalDecisionEnum,
  comment: z
    .string()
    .min(10, 'Comment must be at least 10 characters')
    .max(2000, 'Comment must be less than 2000 characters'),
})

// Infer types from schemas
export type ApprovalDecision = z.infer<typeof approvalDecisionEnum>
export type SubmitForReviewInput = z.infer<typeof submitForReviewSchema>
export type CaseApprovalInput = z.infer<typeof caseApprovalSchema>

// Human-readable labels
export const DECISION_LABELS: Record<ApprovalDecision, string> = {
  APPROVE: 'Approve',
  REJECT: 'Reject',
}
