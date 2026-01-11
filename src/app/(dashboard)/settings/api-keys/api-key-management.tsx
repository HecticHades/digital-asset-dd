'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Modal, ModalContent } from '@/components/ui/modal'
import {
  API_KEY_SCOPES,
  SCOPE_LABELS,
  EXPIRATION_OPTIONS,
  getExpirationDate,
  type CreateApiKeyClientInput,
  type UpdateApiKeyClientInput,
  type ApiKeyScope,
} from '@/lib/validators/api-key'
import { maskApiKey } from '@/lib/api-keys'
import { formatDistanceToNow } from 'date-fns'

// Inline SVG Icons
function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  isActive: boolean
  expiresAt: string | null
  lastUsedAt: string | null
  requestCount: number
  createdAt: string
  createdBy: { id: string; name: string } | null
}

interface ApiKeyManagementProps {
  apiKeys: ApiKey[]
  canCreate: boolean
  canUpdate: boolean
  canRevoke: boolean
  onCreateApiKey: (data: CreateApiKeyClientInput) => Promise<{
    success: boolean
    rawKey?: string
    apiKey?: { id: string; keyPrefix: string }
    error?: string
  }>
  onUpdateApiKey: (
    apiKeyId: string,
    data: UpdateApiKeyClientInput
  ) => Promise<{ success: boolean; error?: string }>
  onRevokeApiKey: (apiKeyId: string) => Promise<{ success: boolean; error?: string }>
}

export function ApiKeyManagement({
  apiKeys,
  canCreate,
  canUpdate,
  canRevoke,
  onCreateApiKey,
  onUpdateApiKey,
  onRevokeApiKey,
}: ApiKeyManagementProps) {
  const router = useRouter()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null)
  const [newRawKey, setNewRawKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [name, setName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>(['read'])
  const [expirationOption, setExpirationOption] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (selectedScopes.length === 0) {
      setError('At least one scope is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const expiresAt = getExpirationDate(expirationOption)

    const result = await onCreateApiKey({
      name: name.trim(),
      scopes: selectedScopes,
      expiresAt: expiresAt?.toISOString() || null,
    })

    setIsSubmitting(false)

    if (result.success && result.rawKey) {
      setNewRawKey(result.rawKey)
      setIsCreateModalOpen(false)
      setIsSuccessModalOpen(true)
      setName('')
      setSelectedScopes(['read'])
      setExpirationOption('')
      router.refresh()
    } else {
      setError(result.error || 'Failed to create API key')
    }
  }

  const handleRevoke = async () => {
    if (!selectedApiKey) return

    setIsSubmitting(true)
    setError(null)

    const result = await onRevokeApiKey(selectedApiKey.id)

    setIsSubmitting(false)

    if (result.success) {
      setIsRevokeModalOpen(false)
      setSelectedApiKey(null)
      router.refresh()
    } else {
      setError(result.error || 'Failed to revoke API key')
    }
  }

  const handleToggleActive = async (apiKey: ApiKey) => {
    const result = await onUpdateApiKey(apiKey.id, { isActive: !apiKey.isActive })
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to update API key')
    }
  }

  const toggleScope = (scope: ApiKeyScope) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope))
    } else {
      setSelectedScopes([...selectedScopes, scope])
    }
  }

  const copyToClipboard = async () => {
    if (!newRawKey) return
    await navigator.clipboard.writeText(newRawKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeKeys = apiKeys.filter((k) => k.isActive)
  const inactiveKeys = apiKeys.filter((k) => !k.isActive)

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{apiKeys.length}</div>
            <p className="text-sm text-slate-500">Total API Keys</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeKeys.length}</div>
            <p className="text-sm text-slate-500">Active Keys</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-400">{inactiveKeys.length}</div>
            <p className="text-sm text-slate-500">Inactive Keys</p>
          </CardContent>
        </Card>
      </div>

      {/* API Keys List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <KeyIcon className="h-5 w-5" />
            API Keys
          </CardTitle>
          {canCreate && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <KeyIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No API keys yet</p>
              <p className="text-sm mt-1">Create an API key to enable external integrations</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {maskApiKey(apiKey.keyPrefix)}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {apiKey.scopes.map((scope) => (
                          <Badge key={scope} variant="default">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={apiKey.isActive ? 'success' : 'default'}>
                        {apiKey.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {apiKey.lastUsedAt
                        ? formatDistanceToNow(new Date(apiKey.lastUsedAt), { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                    <TableCell>{apiKey.requestCount.toLocaleString()}</TableCell>
                    <TableCell>
                      {apiKey.expiresAt ? (
                        new Date(apiKey.expiresAt) < new Date() ? (
                          <span className="text-red-600">Expired</span>
                        ) : (
                          formatDistanceToNow(new Date(apiKey.expiresAt), { addSuffix: true })
                        )
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {canUpdate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(apiKey)}
                          >
                            {apiKey.isActive ? (
                              <EyeSlashIcon className="h-4 w-4" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {canRevoke && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedApiKey(apiKey)
                              setIsRevokeModalOpen(true)
                            }}
                          >
                            <TrashIcon className="h-4 w-4" />
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

      {/* API Documentation Link */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">API Documentation</h3>
              <p className="text-sm text-slate-500 mt-1">
                View the API reference documentation with examples
              </p>
            </div>
            <Button variant="outline" onClick={() => window.open('/api/v1/docs', '_blank')}>
              View Documentation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create API Key">
        <ModalContent>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
            )}

            <Input
              label="Key Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production API Key"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Scopes</label>
              <div className="space-y-2">
                {API_KEY_SCOPES.map((scope) => (
                  <label
                    key={scope}
                    className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{SCOPE_LABELS[scope].label}</div>
                      <div className="text-sm text-slate-500">
                        {SCOPE_LABELS[scope].description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Select
              label="Expiration"
              value={expirationOption}
              onChange={(e) => setExpirationOption(e.target.value)}
              options={EXPIRATION_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create API Key'}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* Success Modal - Show new key */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false)
          setNewRawKey(null)
        }}
        title="API Key Created"
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg">
              <p className="font-medium">Important: Copy your API key now</p>
              <p className="text-sm mt-1">
                This is the only time you will see this API key. Store it securely.
              </p>
            </div>

            <div className="bg-slate-100 p-4 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <code className="text-sm break-all flex-1">{newRawKey}</code>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <ClipboardIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setIsSuccessModalOpen(false)
                  setNewRawKey(null)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* Revoke Confirmation Modal */}
      <Modal
        isOpen={isRevokeModalOpen}
        onClose={() => {
          setIsRevokeModalOpen(false)
          setSelectedApiKey(null)
        }}
        title="Revoke API Key"
      >
        <ModalContent>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
            )}

            <p>
              Are you sure you want to revoke the API key{' '}
              <strong>&quot;{selectedApiKey?.name}&quot;</strong>?
            </p>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
              <p className="font-medium">Warning</p>
              <p className="mt-1">
                This action cannot be undone. Any applications using this API key will no longer
                be able to access the API.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRevokeModalOpen(false)
                  setSelectedApiKey(null)
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRevoke} disabled={isSubmitting}>
                {isSubmitting ? 'Revoking...' : 'Revoke API Key'}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  )
}
