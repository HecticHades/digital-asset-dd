'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Finding, FindingSeverity, FindingCategory, Blockchain } from '@prisma/client'
import { format } from 'date-fns'

interface WalletRiskFlagsProps {
  walletId: string
  walletAddress: string
  blockchain: Blockchain
  findings: Finding[]
  onFindingsUpdate?: () => void
}

type SeverityColor = 'error' | 'warning' | 'info' | 'default'

const SEVERITY_COLORS: Record<FindingSeverity, SeverityColor> = {
  CRITICAL: 'error',
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'info',
  INFO: 'default',
}

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
}

const CATEGORY_ICONS: Record<FindingCategory, string> = {
  SANCTIONS: '\u26a0\ufe0f', // Warning sign
  MIXER: '\ud83c\udf00', // Cyclone (mixing)
  SOURCE: '\ud83d\udcb0', // Money bag
  JURISDICTION: '\ud83c\udf0d', // Globe
  BEHAVIOR: '\ud83d\udd0d', // Magnifying glass
  PRIVACY: '\ud83d\udd12', // Lock
  MARKET: '\ud83c\udfea', // Store
  OTHER: '\u2753', // Question mark
}

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  SANCTIONS: 'Sanctions',
  MIXER: 'Mixer',
  SOURCE: 'Source of Funds',
  JURISDICTION: 'Jurisdiction',
  BEHAVIOR: 'Behavior',
  PRIVACY: 'Privacy',
  MARKET: 'Market',
  OTHER: 'Other',
}

export function WalletRiskFlags({
  walletId,
  walletAddress,
  blockchain,
  findings,
  onFindingsUpdate,
}: WalletRiskFlagsProps) {
  const [isScreening, setIsScreening] = useState(false)
  const [screeningError, setScreeningError] = useState<string | null>(null)
  const [lastScreenResult, setLastScreenResult] = useState<{
    newFindings: number
    skipped: number
  } | null>(null)

  // Sort findings by severity
  const sortedFindings = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )

  // Group findings by category
  const findingsByCategory = sortedFindings.reduce(
    (acc, finding) => {
      if (!acc[finding.category]) {
        acc[finding.category] = []
      }
      acc[finding.category].push(finding)
      return acc
    },
    {} as Record<FindingCategory, Finding[]>
  )

  const handleScreenWallet = async () => {
    setIsScreening(true)
    setScreeningError(null)
    setLastScreenResult(null)

    try {
      const response = await fetch(`/api/wallets/${walletId}/screen`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Screening failed')
      }

      const result = await response.json()

      setLastScreenResult({
        newFindings: result.summary.newFindingsCreated,
        skipped: result.summary.existingFindingsSkipped,
      })

      if (onFindingsUpdate && result.summary.newFindingsCreated > 0) {
        onFindingsUpdate()
      }
    } catch (error) {
      setScreeningError(error instanceof Error ? error.message : 'Screening failed')
    } finally {
      setIsScreening(false)
    }
  }

  const unresolvedFindings = sortedFindings.filter((f) => !f.isResolved)
  const resolvedFindings = sortedFindings.filter((f) => f.isResolved)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Risk Screening</CardTitle>
        <Button
          size="sm"
          onClick={handleScreenWallet}
          disabled={isScreening}
        >
          {isScreening ? (
            <>
              <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
              Screening...
            </>
          ) : (
            <>
              <ShieldIcon className="w-4 h-4 mr-2" />
              Screen Wallet
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Screening Result Message */}
        {lastScreenResult && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <p className="font-medium text-green-800">Screening Complete</p>
            <p className="text-green-700">
              {lastScreenResult.newFindings} new finding(s) created
              {lastScreenResult.skipped > 0 && `, ${lastScreenResult.skipped} existing finding(s) skipped`}
            </p>
          </div>
        )}

        {/* Screening Error */}
        {screeningError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
            <p className="font-medium text-red-800">Screening Error</p>
            <p className="text-red-700">{screeningError}</p>
          </div>
        )}

        {/* Risk Summary */}
        {unresolvedFindings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="error">
              {unresolvedFindings.filter((f) => f.severity === 'CRITICAL').length} Critical
            </Badge>
            <Badge variant="warning">
              {unresolvedFindings.filter((f) => f.severity === 'HIGH').length} High
            </Badge>
            <Badge variant="info">
              {unresolvedFindings.filter((f) => f.severity === 'MEDIUM').length} Medium
            </Badge>
            <Badge>
              {unresolvedFindings.filter((f) => ['LOW', 'INFO'].includes(f.severity)).length} Low/Info
            </Badge>
          </div>
        )}

        {/* Empty State */}
        {findings.length === 0 && !lastScreenResult && (
          <div className="text-center py-8 text-slate-500">
            <ShieldIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No Risk Flags</p>
            <p className="text-sm mt-1">
              Click &quot;Screen Wallet&quot; to check for sanctions, mixers, and privacy coin risks.
            </p>
          </div>
        )}

        {/* Findings by Category */}
        {Object.entries(findingsByCategory).map(([category, categoryFindings]) => (
          <div key={category} className="border rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b flex items-center gap-2">
              <span>{CATEGORY_ICONS[category as FindingCategory]}</span>
              <span className="font-medium text-sm">
                {CATEGORY_LABELS[category as FindingCategory]}
              </span>
              <Badge variant="default" className="ml-auto">
                {categoryFindings.filter((f) => !f.isResolved).length} active
              </Badge>
            </div>
            <div className="divide-y">
              {categoryFindings.map((finding) => (
                <div
                  key={finding.id}
                  className={`p-4 ${finding.isResolved ? 'bg-slate-50 opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={SEVERITY_COLORS[finding.severity]}>
                          {finding.severity}
                        </Badge>
                        <span className="font-medium text-sm truncate">
                          {finding.title}
                        </span>
                        {finding.isResolved && (
                          <Badge variant="success">Resolved</Badge>
                        )}
                      </div>
                      {finding.description && (
                        <p className="text-sm text-slate-600 mt-2">
                          {finding.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        Detected {format(new Date(finding.createdAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Resolved Findings Summary */}
        {resolvedFindings.length > 0 && unresolvedFindings.length > 0 && (
          <div className="text-sm text-slate-500 pt-2 border-t">
            {resolvedFindings.length} resolved finding(s) not shown above
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
