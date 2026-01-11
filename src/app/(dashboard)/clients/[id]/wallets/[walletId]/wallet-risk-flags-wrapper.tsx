'use client'

import { useRouter } from 'next/navigation'
import { WalletRiskFlags } from '@/components/wallets/wallet-risk-flags'
import type { Finding, Blockchain } from '@prisma/client'

interface WalletRiskFlagsWrapperProps {
  walletId: string
  walletAddress: string
  blockchain: Blockchain
  findings: Finding[]
}

export function WalletRiskFlagsWrapper({
  walletId,
  walletAddress,
  blockchain,
  findings,
}: WalletRiskFlagsWrapperProps) {
  const router = useRouter()

  const handleFindingsUpdate = () => {
    // Refresh the page to get the updated findings
    router.refresh()
  }

  return (
    <WalletRiskFlags
      walletId={walletId}
      walletAddress={walletAddress}
      blockchain={blockchain}
      findings={findings}
      onFindingsUpdate={handleFindingsUpdate}
    />
  )
}
