'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { Blockchain } from '@prisma/client'

interface WalletBalanceCardProps {
  walletId: string
  blockchain: Blockchain
}

export function WalletBalanceCard({ walletId, blockchain }: WalletBalanceCardProps) {
  const [balance, setBalance] = useState<string | null>(null)
  const [symbol, setSymbol] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBalance() {
      try {
        const response = await fetch(`/api/wallets/${walletId}/balance`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch balance')
        }

        setBalance(data.balance)
        setSymbol(data.symbol)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balance')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalance()
  }, [walletId])

  const formatBalance = (bal: string): string => {
    const num = parseFloat(bal)
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
    if (num >= 1) return num.toFixed(4)
    if (num >= 0.0001) return num.toFixed(6)
    return num.toFixed(8)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {isLoading ? (
          <>
            <div className="h-8 w-24 bg-slate-200 animate-pulse rounded" />
            <p className="text-sm text-slate-500 mt-1">Loading balance...</p>
          </>
        ) : error ? (
          <>
            <div className="text-2xl font-bold text-slate-400">-</div>
            <p className="text-sm text-red-500">{error}</p>
          </>
        ) : balance !== null ? (
          <>
            <div className="text-2xl font-bold text-slate-900">
              {formatBalance(balance)} {symbol}
            </div>
            <p className="text-sm text-slate-500">Current Balance</p>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-slate-400">-</div>
            <p className="text-sm text-slate-500">Balance unavailable</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
