'use server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import { CaseStatus, RiskLevel } from '@prisma/client'

// TODO: Get actual user/org from session - for now use temp values
const TEMP_ORG_ID = 'temp-org-id'
const TEMP_USER_ID = 'temp-user-id'

/**
 * Helper to get current user or temp user for development
 */
async function getAuthenticatedUser() {
  const user = await getCurrentUser()
  if (user) {
    return {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId,
    }
  }
  // Fallback for development
  return {
    id: TEMP_USER_ID,
    role: 'MANAGER' as string,
    organizationId: TEMP_ORG_ID,
  }
}

export interface AnalystWorkload {
  id: string
  name: string
  email: string
  totalCases: number
  activeCases: number
  pendingReview: number
  completedCases: number
  overdueCases: number
  avgCaseDurationDays: number | null
  casesByStatus: { status: CaseStatus; count: number }[]
  casesByRiskLevel: { riskLevel: RiskLevel; count: number }[]
}

export interface TeamProgress {
  totalCases: number
  activeCases: number
  completedCases: number
  pendingReview: number
  overdueCases: number
  dueSoon: number
  avgCompletionDays: number | null
  completedThisWeek: number
  completedThisMonth: number
}

export interface CaseForAssignment {
  id: string
  title: string
  clientName: string
  status: CaseStatus
  riskLevel: RiskLevel | null
  riskScore: number | null
  dueDate: Date | null
  createdAt: Date
  assignedTo: { id: string; name: string } | null
  isOverdue: boolean
  isDueSoon: boolean
}

/**
 * Get all analysts with their workload
 */
export async function getAnalystsWorkload(): Promise<{ success: boolean; data: AnalystWorkload[]; error?: string }> {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'workload:view')) {
    return { success: false, data: [], error: 'You do not have permission to view workload' }
  }

  try {
    // Get all analysts in the organization
    const analysts = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: { in: ['ANALYST', 'MANAGER'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    })

    const now = new Date()
    const workloads: AnalystWorkload[] = []

    for (const analyst of analysts) {
      // Get all cases assigned to this analyst
      const cases = await prisma.case.findMany({
        where: {
          organizationId: user.organizationId,
          assignedToId: analyst.id,
        },
        select: {
          id: true,
          status: true,
          riskLevel: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true, // Use updatedAt as proxy for completion time
        },
      })

      // Calculate metrics
      const totalCases = cases.length
      const activeCases = cases.filter(c => c.status === 'IN_PROGRESS' || c.status === 'DRAFT').length
      const pendingReview = cases.filter(c => c.status === 'PENDING_REVIEW').length
      const completedCases = cases.filter(c => c.status === 'COMPLETED').length
      const overdueCases = cases.filter(c =>
        c.dueDate &&
        c.dueDate < now &&
        !['COMPLETED', 'ARCHIVED'].includes(c.status)
      ).length

      // Calculate average case duration for completed cases (use updatedAt as completion proxy)
      const completedCasesList = cases.filter(c => c.status === 'COMPLETED')
      let avgCaseDurationDays: number | null = null
      if (completedCasesList.length > 0) {
        const totalDays = completedCasesList.reduce((sum, c) => {
          const duration = (c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          return sum + duration
        }, 0)
        avgCaseDurationDays = Math.round(totalDays / completedCasesList.length)
      }

      // Group by status
      const statusCounts = new Map<CaseStatus, number>()
      cases.forEach(c => {
        statusCounts.set(c.status, (statusCounts.get(c.status) || 0) + 1)
      })
      const casesByStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }))

      // Group by risk level
      const riskCounts = new Map<RiskLevel, number>()
      cases.forEach(c => {
        if (c.riskLevel) {
          riskCounts.set(c.riskLevel, (riskCounts.get(c.riskLevel) || 0) + 1)
        }
      })
      const casesByRiskLevel = Array.from(riskCounts.entries()).map(([riskLevel, count]) => ({ riskLevel, count }))

      workloads.push({
        id: analyst.id,
        name: analyst.name || 'Unknown',
        email: analyst.email,
        totalCases,
        activeCases,
        pendingReview,
        completedCases,
        overdueCases,
        avgCaseDurationDays,
        casesByStatus,
        casesByRiskLevel,
      })
    }

    // Sort by active cases (descending) to show busiest analysts first
    workloads.sort((a, b) => b.activeCases - a.activeCases)

    return { success: true, data: workloads }
  } catch (error) {
    console.error('Failed to fetch analyst workload:', error)
    return { success: false, data: [], error: 'Failed to fetch analyst workload' }
  }
}

/**
 * Get team progress overview
 */
export async function getTeamProgress(): Promise<{ success: boolean; data: TeamProgress | null; error?: string }> {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'workload:view')) {
    return { success: false, data: null, error: 'You do not have permission to view team progress' }
  }

  try {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Fetch all cases for the organization
    const cases = await prisma.case.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        status: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true, // Use updatedAt as proxy for completion time
      },
    })

    const totalCases = cases.length
    const activeCases = cases.filter(c => c.status === 'IN_PROGRESS' || c.status === 'DRAFT').length
    const completedCasesCount = cases.filter(c => c.status === 'COMPLETED').length
    const pendingReview = cases.filter(c => c.status === 'PENDING_REVIEW').length

    // Overdue = has due date, past due, not completed/archived
    const overdueCases = cases.filter(c =>
      c.dueDate &&
      c.dueDate < now &&
      !['COMPLETED', 'ARCHIVED'].includes(c.status)
    ).length

    // Due soon = due within 3 days, not overdue, not completed/archived
    const dueSoon = cases.filter(c =>
      c.dueDate &&
      c.dueDate >= now &&
      c.dueDate <= threeDaysFromNow &&
      !['COMPLETED', 'ARCHIVED'].includes(c.status)
    ).length

    // Completed this week/month (use updatedAt as completion proxy)
    const completedThisWeek = cases.filter(c =>
      c.status === 'COMPLETED' && c.updatedAt >= weekAgo
    ).length
    const completedThisMonth = cases.filter(c =>
      c.status === 'COMPLETED' && c.updatedAt >= monthAgo
    ).length

    // Average completion time (use updatedAt as completion proxy)
    const completedCasesList = cases.filter(c => c.status === 'COMPLETED')
    let avgCompletionDays: number | null = null
    if (completedCasesList.length > 0) {
      const totalDays = completedCasesList.reduce((sum, c) => {
        const duration = (c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        return sum + duration
      }, 0)
      avgCompletionDays = Math.round(totalDays / completedCasesList.length)
    }

    return {
      success: true,
      data: {
        totalCases,
        activeCases,
        completedCases: completedCasesCount,
        pendingReview,
        overdueCases,
        dueSoon,
        avgCompletionDays,
        completedThisWeek,
        completedThisMonth,
      },
    }
  } catch (error) {
    console.error('Failed to fetch team progress:', error)
    return { success: false, data: null, error: 'Failed to fetch team progress' }
  }
}

/**
 * Get cases for assignment/reassignment
 */
export async function getCasesForAssignment(): Promise<{ success: boolean; data: CaseForAssignment[]; error?: string }> {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'cases:assign')) {
    return { success: false, data: [], error: 'You do not have permission to assign cases' }
  }

  try {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    const cases = await prisma.case.findMany({
      where: {
        organizationId: user.organizationId,
        status: { notIn: ['COMPLETED', 'ARCHIVED'] },
      },
      include: {
        client: { select: { name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    const data: CaseForAssignment[] = cases.map(c => ({
      id: c.id,
      title: c.title,
      clientName: c.client.name,
      status: c.status,
      riskLevel: c.riskLevel,
      riskScore: c.riskScore,
      dueDate: c.dueDate,
      createdAt: c.createdAt,
      assignedTo: c.assignedTo ? { id: c.assignedTo.id, name: c.assignedTo.name || 'Unknown' } : null,
      isOverdue: c.dueDate ? c.dueDate < now : false,
      isDueSoon: c.dueDate ? (c.dueDate >= now && c.dueDate <= threeDaysFromNow) : false,
    }))

    return { success: true, data }
  } catch (error) {
    console.error('Failed to fetch cases for assignment:', error)
    return { success: false, data: [], error: 'Failed to fetch cases' }
  }
}

/**
 * Get overdue cases
 */
export async function getOverdueCases(): Promise<{ success: boolean; data: CaseForAssignment[]; error?: string }> {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'workload:view')) {
    return { success: false, data: [], error: 'You do not have permission to view overdue cases' }
  }

  try {
    const now = new Date()

    const cases = await prisma.case.findMany({
      where: {
        organizationId: user.organizationId,
        status: { notIn: ['COMPLETED', 'ARCHIVED'] },
        dueDate: { lt: now },
      },
      include: {
        client: { select: { name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    const data: CaseForAssignment[] = cases.map(c => ({
      id: c.id,
      title: c.title,
      clientName: c.client.name,
      status: c.status,
      riskLevel: c.riskLevel,
      riskScore: c.riskScore,
      dueDate: c.dueDate,
      createdAt: c.createdAt,
      assignedTo: c.assignedTo ? { id: c.assignedTo.id, name: c.assignedTo.name || 'Unknown' } : null,
      isOverdue: true,
      isDueSoon: false,
    }))

    return { success: true, data }
  } catch (error) {
    console.error('Failed to fetch overdue cases:', error)
    return { success: false, data: [], error: 'Failed to fetch overdue cases' }
  }
}

/**
 * Assign or reassign a case to an analyst
 */
export async function assignCase(
  caseId: string,
  analystId: string | null
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'cases:assign')) {
    return { success: false, error: 'You do not have permission to assign cases' }
  }

  try {
    // Verify the case exists and belongs to this organization
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId: user.organizationId,
      },
    })

    if (!caseData) {
      return { success: false, error: 'Case not found' }
    }

    // If assigning to an analyst, verify they exist and are in same org
    if (analystId) {
      const analyst = await prisma.user.findFirst({
        where: {
          id: analystId,
          organizationId: user.organizationId,
          role: { in: ['ANALYST', 'MANAGER'] },
          isActive: true,
        },
      })

      if (!analyst) {
        return { success: false, error: 'Analyst not found' }
      }
    }

    // Update the case assignment
    await prisma.case.update({
      where: { id: caseId },
      data: {
        assignedToId: analystId,
        // If case is in draft and being assigned, move to in progress
        ...(caseData.status === 'DRAFT' && analystId ? { status: 'IN_PROGRESS' } : {}),
      },
    })

    revalidatePath('/manager')
    revalidatePath('/cases')
    revalidatePath(`/cases/${caseId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to assign case:', error)
    return { success: false, error: 'Failed to assign case. Please try again.' }
  }
}

/**
 * Bulk assign cases to an analyst
 */
export async function bulkAssignCases(
  caseIds: string[],
  analystId: string
): Promise<{ success: boolean; assignedCount: number; error?: string }> {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'cases:assign')) {
    return { success: false, assignedCount: 0, error: 'You do not have permission to assign cases' }
  }

  try {
    // Verify the analyst exists
    const analyst = await prisma.user.findFirst({
      where: {
        id: analystId,
        organizationId: user.organizationId,
        role: { in: ['ANALYST', 'MANAGER'] },
        isActive: true,
      },
    })

    if (!analyst) {
      return { success: false, assignedCount: 0, error: 'Analyst not found' }
    }

    // Update all cases
    const result = await prisma.case.updateMany({
      where: {
        id: { in: caseIds },
        organizationId: user.organizationId,
      },
      data: {
        assignedToId: analystId,
      },
    })

    revalidatePath('/manager')
    revalidatePath('/cases')

    return { success: true, assignedCount: result.count }
  } catch (error) {
    console.error('Failed to bulk assign cases:', error)
    return { success: false, assignedCount: 0, error: 'Failed to assign cases. Please try again.' }
  }
}

/**
 * Get available analysts for assignment
 */
export async function getAvailableAnalysts(): Promise<{ success: boolean; data: { id: string; name: string; activeCases: number }[]; error?: string }> {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'cases:assign')) {
    return { success: false, data: [], error: 'You do not have permission to view analysts' }
  }

  try {
    const analysts = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: { in: ['ANALYST', 'MANAGER'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            assignedCases: {
              where: {
                status: { in: ['IN_PROGRESS', 'DRAFT', 'PENDING_REVIEW'] },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const data = analysts.map(a => ({
      id: a.id,
      name: a.name || 'Unknown',
      activeCases: a._count.assignedCases,
    }))

    // Sort by active cases (ascending) to show least busy first
    data.sort((a, b) => a.activeCases - b.activeCases)

    return { success: true, data }
  } catch (error) {
    console.error('Failed to fetch analysts:', error)
    return { success: false, data: [], error: 'Failed to fetch analysts' }
  }
}
