import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { UserManagement } from './user-management'
import {
  getUsers,
  getPendingInvitations,
  inviteUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  cancelUserInvitation,
  resendUserInvitation,
  getUserActivityLog,
  unlockUser,
} from './actions'

export const dynamic = 'force-dynamic'

async function getAuthenticatedUser() {
  const user = await getCurrentUser()
  if (user) return user

  // Development fallback
  return {
    id: 'dev-user',
    email: 'dev@example.com',
    name: 'Dev User',
    role: 'ADMIN',
    organizationId: 'temp-org-id',
    organizationName: 'Development Org',
  }
}

export default async function UsersPage() {
  const currentUser = await getAuthenticatedUser()

  if (!hasPermission(currentUser.role, 'users:read')) {
    redirect('/dashboard?error=access_denied')
  }

  const [usersResult, invitationsResult] = await Promise.all([
    getUsers(),
    getPendingInvitations(),
  ])

  const users = usersResult.data || []
  const invitations = invitationsResult.data || []

  // Server action wrappers
  async function handleInviteUser(data: { email: string; role: string }) {
    'use server'
    return inviteUser({ email: data.email, role: data.role as 'ADMIN' | 'MANAGER' | 'ANALYST' | 'COMPLIANCE_OFFICER' | 'AUDITOR' })
  }

  async function handleUpdateUser(userId: string, data: { name: string; role: string; isActive: boolean }) {
    'use server'
    return updateUser(userId, { name: data.name, role: data.role as 'ADMIN' | 'MANAGER' | 'ANALYST' | 'COMPLIANCE_OFFICER' | 'AUDITOR', isActive: data.isActive })
  }

  async function handleDeactivateUser(userId: string) {
    'use server'
    return deactivateUser(userId)
  }

  async function handleReactivateUser(userId: string) {
    'use server'
    return reactivateUser(userId)
  }

  async function handleCancelInvitation(invitationId: string) {
    'use server'
    return cancelUserInvitation(invitationId)
  }

  async function handleResendInvitation(invitationId: string) {
    'use server'
    return resendUserInvitation(invitationId)
  }

  async function handleGetUserActivityLog(userId: string): Promise<{ success: boolean; error?: string; data?: { id: string; action: string; entityType: string; entityId: string | null; details: unknown; ipAddress: string | null; timestamp: string }[] }> {
    'use server'
    const result = await getUserActivityLog(userId)
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.map(log => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          details: log.details,
          ipAddress: log.ipAddress,
          timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : String(log.timestamp),
        })),
      }
    }
    return { success: false, error: result.error, data: [] }
  }

  async function handleUnlockUser(userId: string) {
    'use server'
    return unlockUser(userId)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-600 mt-1">Manage users in your organization</p>
      </div>

      <UserManagement
        users={users.map(u => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        }))}
        invitations={invitations.map(i => ({
          ...i,
          expiresAt: i.expiresAt.toISOString(),
          createdAt: i.createdAt.toISOString(),
        }))}
        currentUserId={currentUser.id}
        canInvite={hasPermission(currentUser.role, 'users:invite')}
        canEdit={hasPermission(currentUser.role, 'users:update')}
        canDelete={hasPermission(currentUser.role, 'users:delete')}
        onInviteUser={handleInviteUser}
        onUpdateUser={handleUpdateUser}
        onDeactivateUser={handleDeactivateUser}
        onReactivateUser={handleReactivateUser}
        onCancelInvitation={handleCancelInvitation}
        onResendInvitation={handleResendInvitation}
        onGetUserActivityLog={handleGetUserActivityLog}
        onUnlockUser={handleUnlockUser}
      />
    </div>
  )
}
