/**
 * Blockchain data fetching module
 * Unified interface for fetching on-chain data across multiple blockchains
 */

import type { Blockchain } from '@prisma/client'
import type { ParsedTransaction } from '@/types/transaction'
import * as etherscan from './etherscan'
import * as blockchair from './blockchair'

export { isEVMChain, calculateBalanceAtTime as calculateEVMBalanceAtTime } from './etherscan'
export { calculateBalanceAtTime as calculateBTCBalanceAtTime } from './blockchair'

/**
 * Check if a blockchain is supported for on-chain data fetching
 */
export function isSupportedBlockchain(blockchain: Blockchain): boolean {
  return blockchain === 'BITCOIN' || etherscan.isEVMChain(blockchain)
}

/**
 * Fetch all transactions for a wallet address
 * Automatically selects the appropriate API based on blockchain type
 */
export async function fetchWalletTransactions(
  address: string,
  blockchain: Blockchain
): Promise<ParsedTransaction[]> {
  if (blockchain === 'BITCOIN') {
    return blockchair.fetchAllTransactions(address)
  }

  if (etherscan.isEVMChain(blockchain)) {
    return etherscan.fetchAllTransactions(address, blockchain)
  }

  throw new Error(`Unsupported blockchain for on-chain fetching: ${blockchain}`)
}

/**
 * Get current wallet balance
 * Returns balance as a string in the native unit (ETH, BTC, etc.)
 */
export async function getWalletBalance(
  address: string,
  blockchain: Blockchain
): Promise<{ balance: string; symbol: string }> {
  if (blockchain === 'BITCOIN') {
    const balance = await blockchair.getBalance(address)
    return { balance: balance.toString(), symbol: 'BTC' }
  }

  if (etherscan.isEVMChain(blockchain)) {
    const balanceWei = await etherscan.getBalance(address, blockchain)
    const balanceEth = parseFloat(balanceWei) / 1e18
    const symbols: Record<string, string> = {
      ETHEREUM: 'ETH',
      POLYGON: 'MATIC',
      ARBITRUM: 'ETH',
      OPTIMISM: 'ETH',
      BSC: 'BNB',
      AVALANCHE: 'AVAX',
    }
    return { balance: balanceEth.toString(), symbol: symbols[blockchain] || 'ETH' }
  }

  throw new Error(`Unsupported blockchain for balance fetching: ${blockchain}`)
}

/**
 * Calculate wallet balance at a specific point in time
 * Returns balances per asset
 */
export function calculateHistoricalBalance(
  transactions: ParsedTransaction[],
  walletAddress: string,
  blockchain: Blockchain,
  targetTime: Date
): Record<string, number> {
  if (blockchain === 'BITCOIN') {
    const btcBalance = blockchair.calculateBalanceAtTime(transactions, walletAddress, targetTime)
    return { BTC: btcBalance }
  }

  if (etherscan.isEVMChain(blockchain)) {
    return etherscan.calculateBalanceAtTime(transactions, walletAddress, targetTime)
  }

  return {}
}

/**
 * Get blockchain display name
 */
export function getBlockchainDisplayName(blockchain: Blockchain): string {
  const names: Record<Blockchain, string> = {
    ETHEREUM: 'Ethereum',
    BITCOIN: 'Bitcoin',
    POLYGON: 'Polygon',
    ARBITRUM: 'Arbitrum',
    OPTIMISM: 'Optimism',
    BSC: 'BNB Smart Chain',
    AVALANCHE: 'Avalanche',
    SOLANA: 'Solana',
    OTHER: 'Other',
  }
  return names[blockchain]
}

/**
 * Get blockchain native token symbol
 */
export function getNativeSymbol(blockchain: Blockchain): string {
  const symbols: Record<Blockchain, string> = {
    ETHEREUM: 'ETH',
    BITCOIN: 'BTC',
    POLYGON: 'MATIC',
    ARBITRUM: 'ETH',
    OPTIMISM: 'ETH',
    BSC: 'BNB',
    AVALANCHE: 'AVAX',
    SOLANA: 'SOL',
    OTHER: 'UNKNOWN',
  }
  return symbols[blockchain]
}

/**
 * Get block explorer URL for an address
 */
export function getAddressExplorerUrl(address: string, blockchain: Blockchain): string | null {
  const explorers: Partial<Record<Blockchain, string>> = {
    ETHEREUM: `https://etherscan.io/address/${address}`,
    BITCOIN: `https://blockchair.com/bitcoin/address/${address}`,
    POLYGON: `https://polygonscan.com/address/${address}`,
    ARBITRUM: `https://arbiscan.io/address/${address}`,
    OPTIMISM: `https://optimistic.etherscan.io/address/${address}`,
    BSC: `https://bscscan.com/address/${address}`,
    AVALANCHE: `https://snowtrace.io/address/${address}`,
    SOLANA: `https://solscan.io/account/${address}`,
  }
  return explorers[blockchain] || null
}

/**
 * Get block explorer URL for a transaction
 */
export function getTxExplorerUrl(txHash: string, blockchain: Blockchain): string | null {
  const explorers: Partial<Record<Blockchain, string>> = {
    ETHEREUM: `https://etherscan.io/tx/${txHash}`,
    BITCOIN: `https://blockchair.com/bitcoin/transaction/${txHash}`,
    POLYGON: `https://polygonscan.com/tx/${txHash}`,
    ARBITRUM: `https://arbiscan.io/tx/${txHash}`,
    OPTIMISM: `https://optimistic.etherscan.io/tx/${txHash}`,
    BSC: `https://bscscan.com/tx/${txHash}`,
    AVALANCHE: `https://snowtrace.io/tx/${txHash}`,
    SOLANA: `https://solscan.io/tx/${txHash}`,
  }
  return explorers[blockchain] || null
}
