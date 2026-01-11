'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  WEBHOOK_EVENT_TYPES,
  EVENT_TYPE_LABELS,
  type CreateWebhookClientInput,
  type UpdateWebhookClientInput,
  type WebhookEventType,
} from '@/lib/validators/webhook'
import { maskWebhookSecret } from '@/lib/webhooks'
import { formatDistanceToNow, format } from 'date-fns'

// Inline SVG Icons
function WebhookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function DocumentTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  secret: string
  isActive: boolean
  headers: Record<string, string> | null
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string } | null
  _count: { deliveryLogs: number }
}

interface DeliveryLog {
  id: string
  eventType: string
  eventId: string
  statusCode: number | null
  responseTimeMs: number | null
  error: string | null
  attempt: number
  deliveredAt: string | null
  createdAt: string
  caseId: string | null
  clientId: string | null
  findingId: string | null
}

interface WebhookManagementProps {
  webhooks: Webhook[]
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onCreateWebhook: (data: CreateWebhookClientInput) => Promise<{
    success: boolean
    webhook?: { id: string; secret: string }
    error?: string
  }>
  onUpdateWebhook: (
    webhookId: string,
    data: UpdateWebhookClientInput
  ) => Promise<{ success: boolean; error?: string }>
  onDeleteWebhook: (webhookId: string) => Promise<{ success: boolean; error?: string }>
  onRegenerateSecret: (webhookId: string) => Promise<{
    success: boolean
    secret?: string
    error?: string
  }>
  onGetDeliveryLogs: (
    webhookId: string,
    options?: { limit?: number; offset?: number }
  ) => Promise<{ logs: DeliveryLog[]; total: number; hasMore: boolean }>
}

export function WebhookManagement({
  webhooks,
  canCreate,
  canUpdate,
  canDelete,
  onCreateWebhook,
  onUpdateWebhook,
  onDeleteWebhook,
  onRegenerateSecret,
  onGetDeliveryLogs,
}: WebhookManagementProps) {
  const router = useRouter()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([])

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (!url.trim()) {
      setError('URL is required')
      return
    }

    if (!url.startsWith('https://')) {
      setError('Webhook URL must use HTTPS')
      return
    }

    if (selectedEvents.length === 0) {
      setError('At least one event type is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await onCreateWebhook({
      name: name.trim(),
      url: url.trim(),
      events: selectedEvents,
    })

    setIsSubmitting(false)

    if (result.success && result.webhook) {
      setNewSecret(result.webhook.secret)
      setIsCreateModalOpen(false)
      setIsSuccessModalOpen(true)
      setName('')
      setUrl('')
      setSelectedEvents([])
      router.refresh()
    } else {
      setError(result.error || 'Failed to create webhook')
    }
  }

  const handleDelete = async () => {
    if (!selectedWebhook) return

    setIsSubmitting(true)
    setError(null)

    const result = await onDeleteWebhook(selectedWebhook.id)

    setIsSubmitting(false)

    if (result.success) {
      setIsDeleteModalOpen(false)
      setSelectedWebhook(null)
      router.refresh()
    } else {
      setError(result.error || 'Failed to delete webhook')
    }
  }

  const handleToggleActive = async (webhook: Webhook) => {
    const result = await onUpdateWebhook(webhook.id, { isActive: !webhook.isActive })
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to update webhook')
    }
  }

  const handleRegenerateSecret = async () => {
    if (!selectedWebhook) return

    setIsSubmitting(true)
    setError(null)

    const result = await onRegenerateSecret(selectedWebhook.id)

    setIsSubmitting(false)

    if (result.success && result.secret) {
      setNewSecret(result.secret)
      setIsSecretModalOpen(false)
      setIsSuccessModalOpen(true)
      router.refresh()
    } else {
      setError(result.error || 'Failed to regenerate secret')
    }
  }

  const handleViewLogs = async (webhook: Webhook) => {
    setSelectedWebhook(webhook)
    setLogsLoading(true)
    setIsLogsModalOpen(true)

    try {
      const result = await onGetDeliveryLogs(webhook.id, { limit: 20 })
      setDeliveryLogs(result.logs)
    } catch (err) {
      console.error('Failed to load delivery logs:', err)
      setDeliveryLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  const toggleEvent = (event: WebhookEventType) => {
    if (selectedEvents.includes(event)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== event))
    } else {
      setSelectedEvents([...selectedEvents, event])
    }
  }

  const copyToClipboard = async () => {
    if (!newSecret) return
    await navigator.clipboard.writeText(newSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeWebhooks = webhooks.filter((w) => w.isActive)
  const inactiveWebhooks = webhooks.filter((w) => !w.isActive)

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{webhooks.length}</div>
            <p className="text-sm text-slate-500">Total Webhooks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeWebhooks.length}</div>
            <p className="text-sm text-slate-500">Active Webhooks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-400">{inactiveWebhooks.length}</div>
            <p className="text-sm text-slate-500">Inactive Webhooks</p>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <WebhookIcon className="h-5 w-5" />
            Webhooks
          </CardTitle>
          {canCreate && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <WebhookIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No webhooks configured</p>
              <p className="text-sm mt-1">Create a webhook to receive real-time event notifications</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deliveries</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded max-w-[200px] truncate block">
                        {webhook.url}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map((event) => (
                          <Badge key={event} variant="default">
                            {EVENT_TYPE_LABELS[event as WebhookEventType]?.label || event}
                          </Badge>
                        ))}
                        {webhook.events.length > 2 && (
                          <Badge variant="default">+{webhook.events.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={webhook.isActive ? 'success' : 'default'}>
                        {webhook.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{webhook._count.deliveryLogs.toLocaleString()}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(webhook.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLogs(webhook)}
                          title="View delivery logs"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                        </Button>
                        {canUpdate && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(webhook)}
                              title={webhook.isActive ? 'Disable webhook' : 'Enable webhook'}
                            >
                              {webhook.isActive ? (
                                <EyeSlashIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedWebhook(webhook)
                                setIsSecretModalOpen(true)
                              }}
                              title="Regenerate secret"
                            >
                              <RefreshIcon className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canDelete && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedWebhook(webhook)
                              setIsDeleteModalOpen(true)
                            }}
                            title="Delete webhook"
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

      {/* Webhook Signature Info */}
      <Card>
        <CardContent className="pt-6">
          <div>
            <h3 className="font-medium">Webhook Signature Verification</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              All webhook payloads are signed with HMAC-SHA256. Verify the signature to ensure requests are authentic.
            </p>
            <div className="bg-slate-100 p-4 rounded-lg font-mono text-sm">
              <p className="text-slate-600 mb-2">{`// Headers included with each request:`}</p>
              <p>X-Webhook-Signature: &lt;HMAC-SHA256 signature&gt;</p>
              <p>X-Webhook-Timestamp: &lt;Unix timestamp&gt;</p>
              <p>X-Webhook-Id: &lt;Unique event ID&gt;</p>
              <p className="text-slate-600 mt-4 mb-2">{`// Verify signature:`}</p>
              <p>signed_payload = timestamp + &quot;.&quot; + JSON.stringify(payload)</p>
              <p>expected_signature = HMAC_SHA256(secret, signed_payload)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Webhook">
        <ModalContent>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
            )}

            <Input
              label="Webhook Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Notifications"
            />

            <Input
              label="Endpoint URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/webhooks"
              hint="Must be HTTPS"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Events</label>
              <div className="space-y-2">
                {WEBHOOK_EVENT_TYPES.map((event) => (
                  <label
                    key={event}
                    className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{EVENT_TYPE_LABELS[event].label}</div>
                      <div className="text-sm text-slate-500">
                        {EVENT_TYPE_LABELS[event].description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Webhook'}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* Success Modal - Show new secret */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false)
          setNewSecret(null)
        }}
        title="Webhook Secret"
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg">
              <p className="font-medium">Important: Copy your webhook secret now</p>
              <p className="text-sm mt-1">
                This is the only time you will see this secret. Store it securely to verify webhook signatures.
              </p>
            </div>

            <div className="bg-slate-100 p-4 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <code className="text-sm break-all flex-1">{newSecret}</code>
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
                  setNewSecret(null)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* Regenerate Secret Confirmation Modal */}
      <Modal
        isOpen={isSecretModalOpen}
        onClose={() => {
          setIsSecretModalOpen(false)
          setSelectedWebhook(null)
        }}
        title="Regenerate Webhook Secret"
      >
        <ModalContent>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
            )}

            <p>
              Are you sure you want to regenerate the secret for webhook{' '}
              <strong>&quot;{selectedWebhook?.name}&quot;</strong>?
            </p>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
              <p className="font-medium">Warning</p>
              <p className="mt-1">
                The old secret will be invalidated immediately. You will need to update your endpoint
                with the new secret to continue verifying webhook signatures.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSecretModalOpen(false)
                  setSelectedWebhook(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleRegenerateSecret} disabled={isSubmitting}>
                {isSubmitting ? 'Regenerating...' : 'Regenerate Secret'}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedWebhook(null)
        }}
        title="Delete Webhook"
      >
        <ModalContent>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
            )}

            <p>
              Are you sure you want to delete the webhook{' '}
              <strong>&quot;{selectedWebhook?.name}&quot;</strong>?
            </p>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
              <p className="font-medium">Warning</p>
              <p className="mt-1">
                This action cannot be undone. All delivery logs for this webhook will also be deleted.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setSelectedWebhook(null)
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Delete Webhook'}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* Delivery Logs Modal */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => {
          setIsLogsModalOpen(false)
          setSelectedWebhook(null)
          setDeliveryLogs([])
        }}
        title={`Delivery Logs: ${selectedWebhook?.name || ''}`}
      >
        <ModalContent>
          <div className="space-y-4">
            {logsLoading ? (
              <div className="text-center py-8 text-slate-500">Loading delivery logs...</div>
            ) : deliveryLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p className="font-medium">No delivery logs yet</p>
                <p className="text-sm mt-1">Logs will appear here when events are sent to this webhook</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Response Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="font-medium">
                            {EVENT_TYPE_LABELS[log.eventType as WebhookEventType]?.label || log.eventType}
                          </div>
                          <div className="text-xs text-slate-500">{log.eventId.substring(0, 8)}...</div>
                        </TableCell>
                        <TableCell>
                          {log.deliveredAt ? (
                            <Badge variant="success">{log.statusCode}</Badge>
                          ) : log.error ? (
                            <Badge variant="error">Failed</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                          {log.attempt > 1 && (
                            <span className="text-xs text-slate-500 ml-1">
                              (attempt {log.attempt})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.responseTimeMs ? `${log.responseTimeMs}ms` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsLogsModalOpen(false)
                  setSelectedWebhook(null)
                  setDeliveryLogs([])
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  )
}
