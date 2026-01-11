'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { parseFile, getSupportedExchanges } from '@/lib/parsers'
import type { ParseResult, ParsedTransaction } from '@/types/transaction'
import { format } from 'date-fns'

interface CEXUploadProps {
  clientId: string
  onImportComplete?: (transactionCount: number) => void
  onCancel?: () => void
}

type UploadState = 'idle' | 'parsing' | 'preview' | 'importing' | 'error'

export function CEXUpload({ clientId, onImportComplete, onCancel }: CEXUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      await processFile(files[0])
    }
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await processFile(files[0])
    }
  }, [])

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportError('Please upload a CSV file')
      setUploadState('error')
      return
    }

    setSelectedFile(file)
    setUploadState('parsing')
    setImportError(null)

    try {
      const result = await parseFile(file)
      setParseResult(result)

      if (result.success && result.transactions.length > 0) {
        setUploadState('preview')
      } else {
        setUploadState('error')
      }
    } catch (error) {
      setImportError('Failed to parse file')
      setUploadState('error')
    }
  }

  const handleImport = async () => {
    if (!parseResult || !parseResult.transactions.length) return

    setUploadState('importing')
    setImportError(null)

    try {
      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          transactions: parseResult.transactions,
          exchange: parseResult.exchange,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import transactions')
      }

      onImportComplete?.(data.count)
      resetState()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import transactions')
      setUploadState('error')
    }
  }

  const resetState = () => {
    setUploadState('idle')
    setParseResult(null)
    setSelectedFile(null)
    setImportError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import CEX Transactions</CardTitle>
        <CardDescription>
          Upload a CSV export from your exchange. Supported: {getSupportedExchanges().join(', ')}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {uploadState === 'idle' && (
          <DropZone
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onBrowseClick={handleBrowseClick}
          />
        )}

        {uploadState === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner />
            <p className="mt-4 text-sm text-slate-600">Parsing {selectedFile?.name}...</p>
          </div>
        )}

        {uploadState === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner />
            <p className="mt-4 text-sm text-slate-600">Importing transactions...</p>
          </div>
        )}

        {uploadState === 'error' && (
          <ErrorDisplay
            errors={parseResult?.errors || (importError ? [importError] : ['Unknown error'])}
            fileName={selectedFile?.name}
            onTryAgain={resetState}
          />
        )}

        {uploadState === 'preview' && parseResult && (
          <TransactionPreview
            result={parseResult}
            fileName={selectedFile?.name || ''}
          />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileSelect}
        />
      </CardContent>

      <CardFooter className="flex justify-end gap-3">
        {(uploadState === 'preview' || uploadState === 'error') && (
          <>
            <Button
              variant="outline"
              onClick={() => {
                resetState()
                onCancel?.()
              }}
            >
              Cancel
            </Button>
            {uploadState === 'preview' && (
              <Button onClick={handleImport}>
                Import {parseResult?.transactions.length} Transactions
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  )
}

interface DropZoneProps {
  isDragging: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onBrowseClick: () => void
}

function DropZone({ isDragging, onDragOver, onDragLeave, onDrop, onBrowseClick }: DropZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
        ${isDragging
          ? 'border-primary-500 bg-primary-50'
          : 'border-slate-300 hover:border-slate-400'
        }
      `}
      onClick={onBrowseClick}
    >
      <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
      <p className="mt-4 text-sm font-medium text-slate-900">
        Drop your CSV file here
      </p>
      <p className="mt-1 text-sm text-slate-500">
        or <span className="text-primary-600">browse</span> to select a file
      </p>
      <p className="mt-4 text-xs text-slate-400">
        Supports Binance, Coinbase, Coinbase Pro, and Kraken exports
      </p>
    </div>
  )
}

interface ErrorDisplayProps {
  errors: string[]
  fileName?: string
  onTryAgain: () => void
}

function ErrorDisplay({ errors, fileName, onTryAgain }: ErrorDisplayProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <div className="flex items-start">
        <ErrorIcon className="h-5 w-5 text-red-500 mt-0.5" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {fileName ? `Error parsing ${fileName}` : 'Import Error'}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <ul className="list-disc pl-5 space-y-1">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onTryAgain}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface TransactionPreviewProps {
  result: ParseResult
  fileName: string
}

function TransactionPreview({ result, fileName }: TransactionPreviewProps) {
  const { transactions, exchange } = result
  const previewCount = Math.min(transactions.length, 10)
  const previewTransactions = transactions.slice(0, previewCount)

  const summary = calculateSummary(transactions)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">{fileName}</p>
          <p className="text-sm text-slate-500">
            {exchange && <Badge className="mr-2">{exchange}</Badge>}
            {transactions.length} transactions found
          </p>
        </div>
        <SuccessIcon className="h-8 w-8 text-green-500" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Transactions" value={transactions.length.toString()} />
        <SummaryCard label="Date Range" value={summary.dateRange} />
        <SummaryCard label="Unique Assets" value={summary.uniqueAssets.toString()} />
        <SummaryCard label="Transaction Types" value={summary.types.join(', ')} />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewTransactions.map((tx, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">
                  {format(tx.timestamp, 'MMM d, yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <TransactionTypeBadge type={tx.type} />
                </TableCell>
                <TableCell className="font-medium">{tx.asset}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatAmount(tx.amount)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {tx.price ? `$${formatAmount(tx.price)}` : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {transactions.length > previewCount && (
          <div className="px-4 py-3 bg-slate-50 text-sm text-slate-500 text-center">
            ... and {transactions.length - previewCount} more transactions
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900 mt-1">{value}</p>
    </div>
  )
}

function TransactionTypeBadge({ type }: { type: string }) {
  const variants: Record<string, 'default' | 'success' | 'error' | 'info' | 'warning'> = {
    buy: 'success',
    sell: 'error',
    deposit: 'info',
    withdrawal: 'warning',
    transfer: 'default',
    swap: 'info',
    stake: 'success',
    unstake: 'warning',
    reward: 'success',
    fee: 'default',
    other: 'default',
  }
  return <Badge variant={variants[type] || 'default'}>{type.toUpperCase()}</Badge>
}

function calculateSummary(transactions: ParsedTransaction[]) {
  const assets = new Set(transactions.map(t => t.asset))
  const types = Array.from(new Set(transactions.map(t => t.type)))

  const dates = transactions.map(t => t.timestamp).sort((a, b) => a.getTime() - b.getTime())
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  const dateRange = startDate && endDate
    ? `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`
    : 'N/A'

  return {
    uniqueAssets: assets.size,
    types: types.slice(0, 3),
    dateRange,
  }
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`
  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`
  if (amount >= 1) return amount.toFixed(4)
  return amount.toFixed(8)
}

// Icons
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  )
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SuccessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
