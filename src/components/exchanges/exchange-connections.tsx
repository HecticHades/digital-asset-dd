'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal, ModalContent, ModalFooter } from '@/components/ui/modal'
import { format } from 'date-fns'
import { EXCHANGE_DISPLAY_INFO, type ExchangeTypeValue } from '@/lib/validators/exchange'

interface ExchangeConnectionData {
  id: string
  exchange: ExchangeTypeValue
  label: string | null
  maskedApiKey: string
  isActive: boolean
  lastSyncAt: Date | null
  lastSyncStatus: string | null
  createdAt: Date
}

interface ExchangeConnectionsProps {
  clientId: string
  connections: ExchangeConnectionData[]
  onAddConnection: (data: {
    exchange: ExchangeTypeValue
    apiKey: string
    secretKey: string
    label?: string
  }) => Promise<{ success: boolean; error?: string }>
  onRemoveConnection: (connectionId: string) => Promise<{ success: boolean; error?: string }>
  onSyncConnection: (connectionId: string) => Promise<{
    success: boolean
    error?: string
    transactionsImported?: number
  }>
  onTestCredentials: (data: {
    exchange: ExchangeTypeValue
    apiKey: string
    secretKey: string
  }) => Promise<{
    success: boolean
    error?: string
    permissions?: { canRead: boolean; canTrade?: boolean; canWithdraw?: boolean }
  }>
}

const EXCHANGE_OPTIONS: Array<{ value: ExchangeTypeValue; label: string }> = [
  { value: 'BINANCE', label: 'Binance' },
  { value: 'COINBASE', label: 'Coinbase' },
  { value: 'KRAKEN', label: 'Kraken' },
]

export function ExchangeConnections({
  clientId,
  connections,
  onAddConnection,
  onRemoveConnection,
  onSyncConnection,
  onTestCredentials,
}: ExchangeConnectionsProps) {
  const router = useRouter()

  // Add connection modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addFormData, setAddFormData] = useState({
    exchange: 'BINANCE' as ExchangeTypeValue,
    apiKey: '',
    secretKey: '',
    label: '',
  })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{
    tested: boolean
    success?: boolean
    error?: string
    permissions?: { canRead: boolean; canTrade?: boolean; canWithdraw?: boolean }
  }>({ tested: false })

  // Remove connection modal state
  const [removeConnection, setRemoveConnection] = useState<ExchangeConnectionData | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  // Sync state
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{
    connectionId: string
    success: boolean
    message: string
  } | null>(null)

  const handleTestCredentials = async () => {
    setTestResult({ tested: false })
    setAddLoading(true)
    try {
      const result = await onTestCredentials({
        exchange: addFormData.exchange,
        apiKey: addFormData.apiKey,
        secretKey: addFormData.secretKey,
      })
      setTestResult({
        tested: true,
        success: result.success,
        error: result.error,
        permissions: result.permissions,
      })
    } catch (error) {
      setTestResult({
        tested: true,
        success: false,
        error: 'Failed to test credentials',
      })
    } finally {
      setAddLoading(false)
    }
  }

  const handleAddConnection = async () => {
    setAddLoading(true)
    setAddError(null)
    try {
      const result = await onAddConnection({
        exchange: addFormData.exchange,
        apiKey: addFormData.apiKey,
        secretKey: addFormData.secretKey,
        label: addFormData.label || undefined,
      })

      if (result.success) {
        setShowAddModal(false)
        setAddFormData({ exchange: 'BINANCE', apiKey: '', secretKey: '', label: '' })
        setTestResult({ tested: false })
        router.refresh()
      } else {
        setAddError(result.error || 'Failed to add connection')
      }
    } catch (error) {
      setAddError('An unexpected error occurred')
    } finally {
      setAddLoading(false)
    }
  }

  const handleRemoveConnection = async () => {
    if (!removeConnection) return
    setRemoveLoading(true)
    try {
      const result = await onRemoveConnection(removeConnection.id)
      if (result.success) {
        setRemoveConnection(null)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to remove connection:', error)
    } finally {
      setRemoveLoading(false)
    }
  }

  const handleSyncConnection = async (connection: ExchangeConnectionData) => {
    setSyncingId(connection.id)
    setSyncResult(null)
    try {
      const result = await onSyncConnection(connection.id)
      setSyncResult({
        connectionId: connection.id,
        success: result.success,
        message: result.success
          ? `Imported ${result.transactionsImported || 0} transactions`
          : result.error || 'Sync failed',
      })
      router.refresh()
    } catch (error) {
      setSyncResult({
        connectionId: connection.id,
        success: false,
        message: 'Sync failed',
      })
    } finally {
      setSyncingId(null)
    }
  }

  const connectedExchanges = new Set(connections.map((c) => c.exchange))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-900">Exchange Connections</h3>
          <p className="text-sm text-slate-500">
            Connect exchange APIs to automatically import trading history
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Connection
        </Button>
      </div>

      {/* Connection List */}
      {connections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ExchangeIcon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No exchange connections</h3>
            <p className="mt-2 text-sm text-slate-500">
              Connect your first exchange to import trading history automatically.
            </p>
            <Button className="mt-4" onClick={() => setShowAddModal(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => {
            const info = EXCHANGE_DISPLAY_INFO[connection.exchange]
            const isSyncing = syncingId === connection.id
            const result = syncResult?.connectionId === connection.id ? syncResult : null

            return (
              <Card key={connection.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${info.logoColor} flex items-center justify-center text-white font-bold`}>
                        {info.displayName[0]}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {connection.label || info.displayName}
                        </CardTitle>
                        {connection.label && (
                          <CardDescription className="text-xs">
                            {info.displayName}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <Badge variant={connection.isActive ? 'success' : 'default'}>
                      {connection.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">API Key</dt>
                      <dd className="font-mono text-slate-900">{connection.maskedApiKey}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Last Sync</dt>
                      <dd className="text-slate-900">
                        {connection.lastSyncAt
                          ? format(new Date(connection.lastSyncAt), 'MMM d, yyyy HH:mm')
                          : 'Never'}
                      </dd>
                    </div>
                    {connection.lastSyncStatus && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className={`text-xs ${
                          connection.lastSyncStatus.startsWith('Success')
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {connection.lastSyncStatus}
                        </p>
                      </div>
                    )}
                  </dl>

                  {/* Sync Result */}
                  {result && (
                    <div className={`mt-3 p-2 rounded text-xs ${
                      result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {result.message}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSyncConnection(connection)}
                      disabled={isSyncing || !connection.isActive}
                    >
                      {isSyncing ? (
                        <>
                          <LoadingSpinner className="w-4 h-4 mr-2" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshIcon className="w-4 h-4 mr-2" />
                          Sync
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveConnection(connection)}
                      title="Remove connection"
                    >
                      <TrashIcon className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Connection Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setAddFormData({ exchange: 'BINANCE', apiKey: '', secretKey: '', label: '' })
          setAddError(null)
          setTestResult({ tested: false })
        }}
        title="Add Exchange Connection"
        size="md"
      >
        <ModalContent>
          <div className="space-y-4">
            {addError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{addError}</p>
              </div>
            )}

            {/* Exchange Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Exchange
              </label>
              <Select
                value={addFormData.exchange}
                onChange={(e) => {
                  setAddFormData({ ...addFormData, exchange: e.target.value as ExchangeTypeValue })
                  setTestResult({ tested: false })
                }}
                options={EXCHANGE_OPTIONS.filter(
                  (opt) => !connectedExchanges.has(opt.value)
                )}
                disabled={addLoading}
              />
              <p className="mt-1 text-xs text-slate-500">
                {EXCHANGE_DISPLAY_INFO[addFormData.exchange].description}
              </p>
            </div>

            {/* Label */}
            <Input
              label="Label (optional)"
              placeholder="e.g., Main Trading Account"
              value={addFormData.label}
              onChange={(e) => setAddFormData({ ...addFormData, label: e.target.value })}
              disabled={addLoading}
            />

            {/* API Key */}
            <Input
              label="API Key"
              placeholder="Enter your API key"
              value={addFormData.apiKey}
              onChange={(e) => {
                setAddFormData({ ...addFormData, apiKey: e.target.value })
                setTestResult({ tested: false })
              }}
              disabled={addLoading}
            />

            {/* Secret Key */}
            <Input
              label="Secret Key"
              type="password"
              placeholder="Enter your secret key"
              value={addFormData.secretKey}
              onChange={(e) => {
                setAddFormData({ ...addFormData, secretKey: e.target.value })
                setTestResult({ tested: false })
              }}
              disabled={addLoading}
            />

            {/* Test Result */}
            {testResult.tested && (
              <div className={`p-3 rounded-md ${
                testResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                {testResult.success ? (
                  <div>
                    <p className="text-sm font-medium text-green-700">
                      ✓ Credentials validated successfully
                    </p>
                    {testResult.permissions && (
                      <div className="mt-2 text-xs text-green-600">
                        <p>Permissions: Read{testResult.permissions.canTrade ? ', Trade' : ''}{testResult.permissions.canWithdraw ? ', Withdraw' : ''}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-600">
                    ✗ {testResult.error || 'Validation failed'}
                  </p>
                )}
              </div>
            )}

            {/* Security Notice */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
              <p className="text-xs text-slate-600">
                <strong>Security:</strong> API keys are encrypted before storage using AES-256-GCM.
                We recommend using read-only API keys for maximum security.
              </p>
              <a
                href={EXCHANGE_DISPLAY_INFO[addFormData.exchange].docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block"
              >
                Learn how to create API keys →
              </a>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowAddModal(false)
              setAddFormData({ exchange: 'BINANCE', apiKey: '', secretKey: '', label: '' })
              setAddError(null)
              setTestResult({ tested: false })
            }}
            disabled={addLoading}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleTestCredentials}
            disabled={addLoading || !addFormData.apiKey || !addFormData.secretKey}
          >
            {addLoading && !testResult.tested ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
          <Button
            onClick={handleAddConnection}
            disabled={addLoading || !testResult.success}
          >
            {addLoading && testResult.tested ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                Adding...
              </>
            ) : (
              'Add Connection'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Remove Connection Modal */}
      <Modal
        isOpen={!!removeConnection}
        onClose={() => setRemoveConnection(null)}
        title="Remove Connection"
        size="sm"
      >
        {removeConnection && (
          <>
            <ModalContent>
              <div className="space-y-4">
                <p className="text-slate-600">
                  Are you sure you want to remove the{' '}
                  <strong>{EXCHANGE_DISPLAY_INFO[removeConnection.exchange].displayName}</strong>{' '}
                  connection? This will not delete any imported transactions.
                </p>
              </div>
            </ModalContent>
            <ModalFooter>
              <Button
                variant="outline"
                onClick={() => setRemoveConnection(null)}
                disabled={removeLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveConnection}
                disabled={removeLoading}
              >
                {removeLoading ? 'Removing...' : 'Remove'}
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  )
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function ExchangeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
