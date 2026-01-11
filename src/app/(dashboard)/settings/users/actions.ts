'use server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createInvitation, resendInvitation, cancelInvitation } from '@/lib/invitations'
import { hasPermission } from '@/lib/permissions'
import { inviteUserSchema, updateUserSchema, type InviteUserInput, type UpdateUserInput } from '@/lib/validators/user'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'

/**
 * Get the authenticated user with fallback for development
 */
async function getAuthenticatedUser() {
  const user = await getCurrentUser()
  if (user) return user

  // Development fallback - return a mock admin user
  // This should be removed in production
  return {
    id: 'dev-user',
    email: 'dev@example.com',
    name: 'Dev User',
    role: 'ADMIN',
    organizationId: 'temp-org-id',
    organizationName: 'Development Org',
  }
}

/**
 * Get all users in the organization
 */
export async function getUsers() {
  try {
    const user = await getAuthenticatedUser()
    if (!hasPermission(user.role, 'users:read')) {
      return { success: false, error: 'Insufficient permissions', data: [] }
    }

    const users = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedCases: true,
            reviewedCases: true,
            auditLogs: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' },
      ],
    })

    return { success: true, data: users }
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return { success: false, error: 'Failed to fetch users', data: [] }
  }
}

/**
 * Get a single user by ID
 */
export async function getUser(userId: string) {
  try {
    const currentUser = await getAuthenticatedUser()
    if (!hasPermission(currentUser.role, 'users:read')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: currentUser.organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        failedAttempts: true,
        lockedUntil: true,
        _count: {
          select: {
            assignedCases: true,
            reviewedCases: true,
            verifiedDocuments: true,
            resolvedFindings: true,
            generatedReports: true,
            auditLogs: true,
          },
        },
      },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    return { success: true, data: user }
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return { success: false, error: 'Failed to fetch user' }
  }
}

/**
 * Invite a new user to the organization
 */
export async function inviteUser(data: InviteUserInput) {
  try {
    const currentUser = await getAuthenticatedUser()
    if (!hasPermission(currentUser.role, 'users:invite')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const validated = inviteUserSchema.safeParse(data)
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || 'Validation failed',
      }
    }

    const result = await createInvitation(
      validated.data.email,
      validated.data.role as UserRole,
      currentUser.organizationId,
      currentUser.id
    )

    if (!result.success) {
      return { success: false, error: result.error }
    }

    revalidatePath('/settings/users')

    // In a real app, we would send an email here with the invitation link
    // For now, return the token so it can be displayed
    const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/register?token=${result.token}`

    return {
      success: true,
      message: 'Invitation sent successfully',
      inviteUrl,
    }
  } catch (error) {
    console.error('Failed to invite user:', error)
    return { success: false, error: 'Failed to send invitation. Please try again.' }
  }
}

/**
 * Update a user's details
 */
export async function updateUser(userId: string, data: UpdateUserInput) {
  try {
    const currentUser = await getAuthenticatedUser()
    if (!hasPermission(currentUser.role, 'users:update')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const validated = updateUserSchema.safeParse(data)
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || 'Validation failed',
      }
    }

    // Check if user belongs to same organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: currentUser.organizationId,
      },
    })

    if (!targetUser) {
      return { success: false, error: 'User not found' }
    }

    // Prevent users from modifying their own role or deactivating themselves
    if (userId === currentUser.id) {
      if (validated.data.role !== currentUser.role) {
        return { success: false, error: 'You cannot change your own role' }
      }
      if (!validated.data.isActive) {
        return { success: false, error: 'You cannot deactivate your own account' }
      }
    }

    // Update the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: validated.data.name,
        role: validated.data.role,
        isActive: validated.data.isActive,
      },
    })

    revalidatePath('/settings/users')

    return { success: true, message: 'User updated successfully' }
  } catch (error) {
    console.error('Failed to update user:', error)
    return { success: false, error: 'Failed to update user. Please try again.' }
  }
}

/**
 * Deactivate a user (soft delete)
 */
export async function deactivateUser(userId: string) {
  try {
    const currentUser = await getAuthenticatedUser()
    if (!hasPermission(currentUser.role, 'users:delete')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Prevent self-deactivation
    if (userId === currentUser.id) {
      return { success: false, error: 'You cannot deactivate your own account' }
    }

    // Check if user belongs to same organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: currentUser.organizationId,
      },
    })

    if (!targetUser) {
      return { success: false, error: 'User not found' }
    }

    // Deactivate the user
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    })

    revalidatePath('/settings/users')

    return { success: true, message: 'User deactivated successfully' }
  } catch (error) {
    console.error('Failed to deactivate user:', error)
    return { success: false, error: 'Failed to deactivate user. Please try again.' }
  }
}

/**
 * Reactivate a user
 */
export async function reactivateUser(userId: string) {
  try {
    const currentUser = await getAuthenticatedUser()
    if (!hasPermission(currentUser.role, 'users:update')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Check if user belongs to same organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: currentUser.organizationId,
      },
    })

    if (!targetUser) {
      return { success: false, error: 'User not found' }
    }

    // Reactivate the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
    })

    revalidatePath('/settings/users')

    return { success: true, message: 'User reactivated successfully' }
  } catch (error) {
    console.error('Failed to reactivate user:', error)
    return { success: false, error: 'Failed to reactivate user. Please try again.' }
  }
}

/**
 * Get pending invitations for the organization
 */
export async function getPendingInvitations() {
  try {
    const currentUser = await getAuthenticatedUser()
    if (!hasPermission(currentUser.role, 'users:read')) {
      return { success: false, error: 'Insufficient permissions', data: [] }
    }

    const invitations = await prisma.userInvitation.findMany({
      where: {
        organizationId: currentUser.organizationId,
        usedAt: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return { success: true, data: invitations }
  } catch (error) {
    console.error('Failed to fetch invitations:', error)
    return { success: false, error: 'Failed to fetch invitations', data: [] }
  }
}

/**
 * Resend an invitation
 */
export async function resendUserInvitation(invitationId: string) {
  try {
    const currentUser = await getAuthenticatedUser()
    if (!hasPermission(currentUser.role, 'users:invite')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const result = await resendInvitation(invitationId, currentUser.organizationId)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    revalidatePath('/settings/users')

    const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/register?token=${result.token}`

    return {
      success: true,
      message: 'Invitation resent successfully',
      inviteUrl,
    }
  } catch (error) {
    console.error('Failed to resend invitation:', error)
    return { success: false, error: 'Failed to resend invitation. Please try again.' }
  }
}

/**
 * Cancel an invitation
 */
export async function cancelUserInvitation(invitationId: string) {
  try {
    const currentUser = await getAuthenticatedUser()
    if (!hasPermission(currentUser.role, 'users:invite')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const result = await cancelInvitation(invitationId, currentUser.organizationId)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    revalidatePath('/settings/users')

    return { success: true, message: 'Invitation cancelled successfully' }
  } catch (error) {
    console.error('Failed to cancel invitation:', error)
    return { success: false, error: 'Failed to cancel invitation. Please try again.' }
  }
}

/**
 * Get user activity log
 */
export async function getUserActivityLog(userId: string, limit: number = 50) {
  try {
    const currentUser = await getAuthenticatedUser()
    if (!hasPermission(currentUser.role, 'users:read')) {
      return { success: false, error: 'Insufficient permissions', data: [] }
    }

    // Verify user belongs to same organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: currentUser.organizationId,
      },
    })

    if (!targetUser) {
      return { success: false, error: 'User not found', data: [] }
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        organizationId: currentUser.organizationId,
      },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        details: true,
        ipAddress: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    })

    return { success: true, data: logs }
  } catch (error) {
    console.error('Failed to fetch user activity log:', error)
    return { success: false, error: 'Failed to fetch activity log', data: [] }
  }
}

/**
 * Unlock a user account
 */
export async function unlockUser(userId: string) {
  try {
    const currentUser = await getAuthenticatedUser()
    if (!hasPermission(currentUser.role, 'users:update')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Check if user belongs to same organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: currentUser.organizationId,
      },
    })

    if (!targetUser) {
      return { success: false, error: 'User not found' }
    }

    // Unlock the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
      },
    })

    revalidatePath('/settings/users')

    return { success: true, message: 'User account unlocked successfully' }
  } catch (error) {
    console.error('Failed to unlock user:', error)
    return { success: false, error: 'Failed to unlock user. Please try again.' }
  }
}
