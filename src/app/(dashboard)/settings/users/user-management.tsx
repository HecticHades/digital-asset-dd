'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Modal, ModalContent, ModalFooter } from '@/components/ui/modal'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { USER_ROLE_OPTIONS } from '@/lib/validators/user'
import { ROLE_LABELS } from '@/lib/permissions'

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    assignedCases: number
    reviewedCases: number
    auditLogs: number
  }
}

interface Invitation {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
  invitedBy: {
    name: string
  } | null
}

interface ActivityLog {
  id: string
  action: string
  entityType: string
  entityId: string | null
  details: unknown
  ipAddress: string | null
  timestamp: string
}

interface UserManagementProps {
  users: User[]
  invitations: Invitation[]
  currentUserId: string
  canInvite: boolean
  canEdit: boolean
  canDelete: boolean
  onInviteUser: (data: { email: string; role: string }) => Promise<{ success: boolean; error?: string; inviteUrl?: string; message?: string }>
  onUpdateUser: (userId: string, data: { name: string; role: string; isActive: boolean }) => Promise<{ success: boolean; error?: string; message?: string }>
  onDeactivateUser: (userId: string) => Promise<{ success: boolean; error?: string; message?: string }>
  onReactivateUser: (userId: string) => Promise<{ success: boolean; error?: string; message?: string }>
  onCancelInvitation: (invitationId: string) => Promise<{ success: boolean; error?: string; message?: string }>
  onResendInvitation: (invitationId: string) => Promise<{ success: boolean; error?: string; inviteUrl?: string; message?: string }>
  onGetUserActivityLog: (userId: string) => Promise<{ success: boolean; error?: string; data?: ActivityLog[] }>
  onUnlockUser: (userId: string) => Promise<{ success: boolean; error?: string; message?: string }>
}

export function UserManagement({
  users,
  invitations,
  currentUserId,
  canInvite,
  canEdit,
  canDelete,
  onInviteUser,
  onUpdateUser,
  onDeactivateUser,
  onReactivateUser,
  onCancelInvitation,
  onResendInvitation,
  onGetUserActivityLog,
  onUnlockUser,
}: UserManagementProps) {
  const router = useRouter()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('ANALYST')

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)

  const activeUsers = users.filter(u => u.isActive)
  const inactiveUsers = users.filter(u => !u.isActive)

  const handleInvite = async () => {
    setLoading(true)
    setError(null)
    setSuccessUrl(null)

    const result = await onInviteUser({ email: inviteEmail, role: inviteRole })

    if (result.success) {
      setSuccessUrl(result.inviteUrl || null)
      setInviteEmail('')
      setInviteRole('ANALYST')
      router.refresh()
    } else {
      setError(result.error || 'Failed to send invitation')
    }

    setLoading(false)
  }

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user)
    setEditName(user.name)
    setEditRole(user.role)
    setEditIsActive(user.isActive)
    setShowEditModal(true)
    setError(null)
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return

    setLoading(true)
    setError(null)

    const result = await onUpdateUser(selectedUser.id, {
      name: editName,
      role: editRole,
      isActive: editIsActive,
    })

    if (result.success) {
      setShowEditModal(false)
      setSelectedUser(null)
      router.refresh()
    } else {
      setError(result.error || 'Failed to update user')
    }

    setLoading(false)
  }

  const handleOpenDeactivate = (user: User) => {
    setSelectedUser(user)
    setShowDeactivateModal(true)
    setError(null)
  }

  const handleDeactivate = async () => {
    if (!selectedUser) return

    setLoading(true)
    setError(null)

    const result = await onDeactivateUser(selectedUser.id)

    if (result.success) {
      setShowDeactivateModal(false)
      setSelectedUser(null)
      router.refresh()
    } else {
      setError(result.error || 'Failed to deactivate user')
    }

    setLoading(false)
  }

  const handleReactivate = async (user: User) => {
    setLoading(true)
    setError(null)

    const result = await onReactivateUser(user.id)

    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to reactivate user')
    }

    setLoading(false)
  }

  const handleOpenActivityLog = async (user: User) => {
    setSelectedUser(user)
    setShowActivityModal(true)
    setLoading(true)
    setError(null)

    const result = await onGetUserActivityLog(user.id)

    if (result.success && result.data) {
      setActivityLogs(result.data.map(log => ({
        ...log,
        timestamp: typeof log.timestamp === 'string' ? log.timestamp : new Date(log.timestamp as unknown as string).toISOString(),
      })))
    } else {
      setError(result.error || 'Failed to fetch activity log')
      setActivityLogs([])
    }

    setLoading(false)
  }

  const handleCancelInvitation = async (invitationId: string) => {
    setLoading(true)
    const result = await onCancelInvitation(invitationId)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to cancel invitation')
    }
    setLoading(false)
  }

  const handleResendInvitation = async (invitationId: string) => {
    setLoading(true)
    const result = await onResendInvitation(invitationId)
    if (result.success) {
      setSuccessUrl(result.inviteUrl || null)
      router.refresh()
    } else {
      setError(result.error || 'Failed to resend invitation')
    }
    setLoading(false)
  }

  const handleUnlockUser = async (userId: string) => {
    setLoading(true)
    const result = await onUnlockUser(userId)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to unlock user')
    }
    setLoading(false)
  }

  const roleOptions = USER_ROLE_OPTIONS.map(opt => ({
    value: opt.value,
    label: opt.label,
  }))

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activeUsers.length}</div>
            <p className="text-sm text-slate-500">Active Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{inactiveUsers.length}</div>
            <p className="text-sm text-slate-500">Inactive Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{invitations.filter(i => !isPast(new Date(i.expiresAt))).length}</div>
            <p className="text-sm text-slate-500">Pending Invitations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{users.reduce((acc, u) => acc + u._count.assignedCases, 0)}</div>
            <p className="text-sm text-slate-500">Total Assigned Cases</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Success URL Display */}
      {successUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 font-medium mb-2">Invitation sent successfully!</p>
          <p className="text-sm text-green-600 mb-2">Share this link with the user:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={successUrl}
              className="flex-1 px-3 py-2 border border-green-300 rounded text-sm bg-white"
            />
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(successUrl)
              }}
            >
              Copy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSuccessUrl(null)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({invitations.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Users</CardTitle>
              {canInvite && (
                <Button onClick={() => { setShowInviteModal(true); setError(null); setSuccessUrl(null); }}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Invite User
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No users found. Invite your first team member.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cases</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className={!user.isActive ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">
                          {user.name}
                          {user.id === currentUserId && (
                            <span className="ml-2 text-xs text-slate-500">(you)</span>
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="error">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>{user._count.assignedCases}</TableCell>
                        <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenActivityLog(user)}
                            >
                              Activity
                            </Button>
                            {canEdit && user.id !== currentUserId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(user)}
                              >
                                Edit
                              </Button>
                            )}
                            {canDelete && user.id !== currentUserId && user.isActive && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleOpenDeactivate(user)}
                              >
                                Deactivate
                              </Button>
                            )}
                            {canEdit && !user.isActive && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleReactivate(user)}
                                disabled={loading}
                              >
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pending Invitations</CardTitle>
              {canInvite && (
                <Button onClick={() => { setShowInviteModal(true); setError(null); setSuccessUrl(null); }}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Send Invitation
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No pending invitations.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Invited By</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => {
                      const isExpired = isPast(new Date(invitation.expiresAt))
                      return (
                        <TableRow key={invitation.id} className={isExpired ? 'opacity-60' : ''}>
                          <TableCell className="font-medium">{invitation.email}</TableCell>
                          <TableCell>
                            <Badge variant="default">
                              {ROLE_LABELS[invitation.role as keyof typeof ROLE_LABELS] || invitation.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{invitation.invitedBy?.name || '-'}</TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {isExpired ? (
                              <Badge variant="error">Expired</Badge>
                            ) : (
                              <Badge variant="warning">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {canInvite && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleResendInvitation(invitation.id)}
                                    disabled={loading}
                                  >
                                    Resend
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => handleCancelInvitation(invitation.id)}
                                    disabled={loading}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite User">
        <ModalContent>
          <div className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address"
            />
            <Select
              label="Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              options={roleOptions}
            />
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              {USER_ROLE_OPTIONS.find(r => r.value === inviteRole)?.description}
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowInviteModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={!inviteEmail || loading}
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User">
        <ModalContent>
          <div className="space-y-4">
            <div className="text-sm text-slate-500">
              Editing: {selectedUser?.email}
            </div>
            <Input
              label="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter name"
            />
            <Select
              label="Role"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              options={roleOptions}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="rounded border-slate-300"
              />
              <label htmlFor="isActive" className="text-sm">Active Account</label>
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            disabled={!editName || loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Deactivate Modal */}
      <Modal isOpen={showDeactivateModal} onClose={() => setShowDeactivateModal(false)} title="Deactivate User">
        <ModalContent>
          <div className="space-y-4">
            <p>
              Are you sure you want to deactivate <strong>{selectedUser?.name}</strong>?
            </p>
            <p className="text-sm text-slate-600">
              This user will no longer be able to log in. Their data and work history will be preserved.
              You can reactivate the account at any time.
            </p>
            {selectedUser && selectedUser._count.assignedCases > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                <strong>Warning:</strong> This user has {selectedUser._count.assignedCases} assigned case(s).
                Consider reassigning these cases before deactivating.
              </div>
            )}
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowDeactivateModal(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={loading}
          >
            {loading ? 'Deactivating...' : 'Deactivate User'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Activity Log Modal */}
      <Modal isOpen={showActivityModal} onClose={() => setShowActivityModal(false)} title={`Activity Log - ${selectedUser?.name || ''}`} size="lg">
        <ModalContent>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading activity...</div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No activity recorded for this user.</div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <div key={log.id} className="border-b border-slate-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{formatAction(log.action)}</span>
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {log.entityType} {log.entityId ? `(${log.entityId.slice(0, 8)}...)` : ''}
                    </div>
                    {log.ipAddress && (
                      <div className="text-xs text-slate-400 mt-1">
                        IP: {log.ipAddress}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowActivityModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    VIEW: 'Viewed',
    LOGIN: 'Logged in',
    LOGOUT: 'Logged out',
    APPROVE: 'Approved',
    REJECT: 'Rejected',
    UPLOAD: 'Uploaded',
    VERIFY: 'Verified',
    SUBMIT: 'Submitted',
  }
  return actionMap[action] || action
}
