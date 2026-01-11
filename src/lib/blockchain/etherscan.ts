/**
 * Etherscan API client for fetching EVM chain transactions
 * Supports Ethereum, Polygon, Arbitrum, Optimism, BSC, Avalanche
 */

import type { Blockchain } from '@prisma/client'
import type { ParsedTransaction } from '@/types/transaction'

// API endpoints for different EVM chains
const CHAIN_ENDPOINTS: Record<string, string> = {
  ETHEREUM: 'https://api.etherscan.io/api',
  POLYGON: 'https://api.polygonscan.com/api',
  ARBITRUM: 'https://api.arbiscan.io/api',
  OPTIMISM: 'https://api-optimistic.etherscan.io/api',
  BSC: 'https://api.bscscan.com/api',
  AVALANCHE: 'https://api.snowtrace.io/api',
}

// Native currency symbols for each chain
const NATIVE_SYMBOLS: Record<string, string> = {
  ETHEREUM: 'ETH',
  POLYGON: 'MATIC',
  ARBITRUM: 'ETH',
  OPTIMISM: 'ETH',
  BSC: 'BNB',
  AVALANCHE: 'AVAX',
}

// API key environment variable names per chain
const API_KEY_VARS: Record<string, string> = {
  ETHEREUM: 'ETHERSCAN_API_KEY',
  POLYGON: 'POLYGONSCAN_API_KEY',
  ARBITRUM: 'ARBISCAN_API_KEY',
  OPTIMISM: 'OPTIMISTIC_ETHERSCAN_API_KEY',
  BSC: 'BSCSCAN_API_KEY',
  AVALANCHE: 'SNOWTRACE_API_KEY',
}

interface EtherscanTransaction {
  hash: string
  blockNumber: string
  timeStamp: string
  from: string
  to: string
  value: string
  gas: string
  gasUsed: string
  gasPrice: string
  isError: string
  txreceipt_status: string
  contractAddress: string
  input: string
  methodId: string
  functionName: string
}

interface EtherscanInternalTransaction {
  hash: string
  blockNumber: string
  timeStamp: string
  from: string
  to: string
  value: string
  isError: string
  type: string
  traceId: string
  errCode: string
}

interface EtherscanTokenTransfer {
  hash: string
  blockNumber: string
  timeStamp: string
  from: string
  to: string
  value: string
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
  contractAddress: string
}

interface EtherscanResponse<T> {
  status: string
  message: string
  result: T[]
}

interface FetchOptions {
  startBlock?: number
  endBlock?: number
  page?: number
  offset?: number
}

/**
 * Check if a blockchain is an EVM chain supported by Etherscan-style APIs
 */
export function isEVMChain(blockchain: Blockchain): boolean {
  return blockchain in CHAIN_ENDPOINTS
}

/**
 * Get the API key for a specific chain
 */
function getApiKey(blockchain: Blockchain): string {
  const envVar = API_KEY_VARS[blockchain]
  const key = process.env[envVar] || ''
  return key
}

/**
 * Make an Etherscan API request
 */
async function makeRequest<T>(
  blockchain: Blockchain,
  module: string,
  action: string,
  params: Record<string, string | number>
): Promise<T[]> {
  const endpoint = CHAIN_ENDPOINTS[blockchain]
  if (!endpoint) {
    throw new Error(`Unsupported blockchain: ${blockchain}`)
  }

  const apiKey = getApiKey(blockchain)
  const queryParams = new URLSearchParams({
    module,
    action,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
    ...(apiKey ? { apikey: apiKey } : {}),
  })

  const url = `${endpoint}?${queryParams.toString()}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as EtherscanResponse<T>

  if (data.status === '0' && data.message !== 'No transactions found') {
    throw new Error(data.message || 'API request failed')
  }

  return data.result || []
}

/**
 * Fetch normal (external) transactions for an address
 */
export async function fetchNormalTransactions(
  address: string,
  blockchain: Blockchain,
  options: FetchOptions = {}
): Promise<EtherscanTransaction[]> {
  return makeRequest<EtherscanTransaction>(blockchain, 'account', 'txlist', {
    address,
    startblock: options.startBlock ?? 0,
    endblock: options.endBlock ?? 99999999,
    page: options.page ?? 1,
    offset: options.offset ?? 10000,
    sort: 'asc',
  })
}

/**
 * Fetch internal transactions for an address
 */
export async function fetchInternalTransactions(
  address: string,
  blockchain: Blockchain,
  options: FetchOptions = {}
): Promise<EtherscanInternalTransaction[]> {
  return makeRequest<EtherscanInternalTransaction>(blockchain, 'account', 'txlistinternal', {
    address,
    startblock: options.startBlock ?? 0,
    endblock: options.endBlock ?? 99999999,
    page: options.page ?? 1,
    offset: options.offset ?? 10000,
    sort: 'asc',
  })
}

/**
 * Fetch ERC-20 token transfers for an address
 */
export async function fetchTokenTransfers(
  address: string,
  blockchain: Blockchain,
  options: FetchOptions = {}
): Promise<EtherscanTokenTransfer[]> {
  return makeRequest<EtherscanTokenTransfer>(blockchain, 'account', 'tokentx', {
    address,
    startblock: options.startBlock ?? 0,
    endblock: options.endBlock ?? 99999999,
    page: options.page ?? 1,
    offset: options.offset ?? 10000,
    sort: 'asc',
  })
}

/**
 * Get current ETH/native token balance for an address
 */
export async function getBalance(
  address: string,
  blockchain: Blockchain
): Promise<string> {
  const result = await makeRequest<string>(blockchain, 'account', 'balance', {
    address,
    tag: 'latest',
  })
  // Result is returned as a string directly, not an array
  return result as unknown as string
}

/**
 * Convert wei value to ether
 */
function weiToEther(wei: string): number {
  return parseFloat(wei) / 1e18
}

/**
 * Convert token value to decimal
 */
function tokenToDecimal(value: string, decimals: string): number {
  const decimalPlaces = parseInt(decimals, 10)
  return parseFloat(value) / Math.pow(10, decimalPlaces)
}

/**
 * Determine transaction type based on the direction and method
 */
function determineTransactionType(
  tx: EtherscanTransaction | EtherscanInternalTransaction | EtherscanTokenTransfer,
  walletAddress: string,
  isInternal = false
): 'deposit' | 'withdrawal' | 'transfer' | 'swap' | 'other' {
  const from = tx.from.toLowerCase()
  const to = tx.to?.toLowerCase() || ''
  const wallet = walletAddress.toLowerCase()

  // Check for known DEX method signatures
  if ('functionName' in tx && tx.functionName) {
    const fn = tx.functionName.toLowerCase()
    if (fn.includes('swap') || fn.includes('exchange')) {
      return 'swap'
    }
  }

  if (from === wallet && to === wallet) {
    return 'transfer'
  } else if (from === wallet) {
    return 'withdrawal'
  } else if (to === wallet) {
    return 'deposit'
  }

  return 'transfer'
}

/**
 * Parse Etherscan transactions into our normalized format
 */
export function parseEtherscanTransactions(
  normalTxs: EtherscanTransaction[],
  internalTxs: EtherscanInternalTransaction[],
  tokenTxs: EtherscanTokenTransfer[],
  walletAddress: string,
  blockchain: Blockchain
): ParsedTransaction[] {
  const nativeSymbol = NATIVE_SYMBOLS[blockchain] || 'ETH'
  const transactions: ParsedTransaction[] = []
  const seenHashes = new Set<string>()

  // Process normal transactions (external)
  for (const tx of normalTxs) {
    if (tx.isError === '1') continue // Skip failed transactions

    const value = weiToEther(tx.value)
    if (value > 0) {
      transactions.push({
        timestamp: new Date(parseInt(tx.timeStamp, 10) * 1000),
        type: determineTransactionType(tx, walletAddress),
        asset: nativeSymbol,
        amount: value,
        fee: weiToEther(tx.gasUsed) * weiToEther(tx.gasPrice) * 1e18,
        exchange: blockchain,
        source: 'ON_CHAIN',
        rawData: {
          txHash: tx.hash,
          blockNumber: tx.blockNumber,
          from: tx.from,
          to: tx.to,
          methodId: tx.methodId,
          functionName: tx.functionName,
        },
      })
    }
    seenHashes.add(tx.hash)
  }

  // Process internal transactions
  for (const tx of internalTxs) {
    if (tx.isError === '1') continue
    if (seenHashes.has(tx.hash)) continue // Avoid duplicates

    const value = weiToEther(tx.value)
    if (value > 0) {
      transactions.push({
        timestamp: new Date(parseInt(tx.timeStamp, 10) * 1000),
        type: determineTransactionType(tx, walletAddress, true),
        asset: nativeSymbol,
        amount: value,
        exchange: blockchain,
        source: 'ON_CHAIN',
        rawData: {
          txHash: tx.hash,
          blockNumber: tx.blockNumber,
          from: tx.from,
          to: tx.to,
          type: tx.type,
          traceId: tx.traceId,
        },
      })
    }
  }

  // Process token transfers
  for (const tx of tokenTxs) {
    const value = tokenToDecimal(tx.value, tx.tokenDecimal)
    if (value > 0) {
      transactions.push({
        timestamp: new Date(parseInt(tx.timeStamp, 10) * 1000),
        type: determineTransactionType(tx, walletAddress),
        asset: tx.tokenSymbol || 'UNKNOWN',
        amount: value,
        exchange: blockchain,
        source: 'ON_CHAIN',
        rawData: {
          txHash: tx.hash,
          blockNumber: tx.blockNumber,
          from: tx.from,
          to: tx.to,
          tokenName: tx.tokenName,
          tokenSymbol: tx.tokenSymbol,
          contractAddress: tx.contractAddress,
        },
      })
    }
  }

  // Sort by timestamp
  transactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return transactions
}

/**
 * Fetch all transactions for an EVM wallet and return normalized format
 */
export async function fetchAllTransactions(
  address: string,
  blockchain: Blockchain,
  options: FetchOptions = {}
): Promise<ParsedTransaction[]> {
  if (!isEVMChain(blockchain)) {
    throw new Error(`${blockchain} is not an EVM chain`)
  }

  // Fetch all transaction types in parallel
  const [normalTxs, internalTxs, tokenTxs] = await Promise.all([
    fetchNormalTransactions(address, blockchain, options),
    fetchInternalTransactions(address, blockchain, options),
    fetchTokenTransfers(address, blockchain, options),
  ])

  return parseEtherscanTransactions(
    normalTxs,
    internalTxs,
    tokenTxs,
    address,
    blockchain
  )
}

/**
 * Calculate wallet balance at a specific timestamp
 * Returns balance per asset
 */
export function calculateBalanceAtTime(
  transactions: ParsedTransaction[],
  walletAddress: string,
  targetTime: Date
): Record<string, number> {
  const balances: Record<string, number> = {}
  const wallet = walletAddress.toLowerCase()

  for (const tx of transactions) {
    if (tx.timestamp > targetTime) break

    const rawData = tx.rawData as { from?: string; to?: string } | undefined
    const from = rawData?.from?.toLowerCase()
    const to = rawData?.to?.toLowerCase()

    if (!balances[tx.asset]) {
      balances[tx.asset] = 0
    }

    if (to === wallet) {
      balances[tx.asset] += tx.amount
    }
    if (from === wallet) {
      balances[tx.asset] -= tx.amount
      // Subtract fees for outgoing transactions
      if (tx.fee) {
        const nativeAsset = Object.values(NATIVE_SYMBOLS).find(s => s === tx.asset) ? tx.asset : 'ETH'
        if (!balances[nativeAsset]) balances[nativeAsset] = 0
        balances[nativeAsset] -= tx.fee
      }
    }
  }

  // Filter out zero and negative balances (rounding errors)
  return Object.fromEntries(
    Object.entries(balances).filter(([, v]) => v > 0.00000001)
  )
}

/**
 * Get the latest block number for a chain
 */
export async function getLatestBlockNumber(blockchain: Blockchain): Promise<number> {
  const result = await makeRequest<{ result: string }>(blockchain, 'proxy', 'eth_blockNumber', {})
  // Result format is hex
  const hexBlock = result as unknown as string
  return parseInt(hexBlock, 16)
}
