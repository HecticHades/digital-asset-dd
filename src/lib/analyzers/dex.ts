/**
 * DEX Transaction Detection and Analysis
 *
 * Identifies DEX swaps from on-chain transaction data:
 * - Uniswap V2/V3
 * - SushiSwap
 * - Curve
 * - Balancer
 * - 1inch
 * - PancakeSwap (BSC)
 *
 * Also detects liquidity provision/removal events.
 */

import type { Blockchain } from '@prisma/client'

// ============================================
// Types
// ============================================

export type DEXProtocol =
  | 'UNISWAP_V2'
  | 'UNISWAP_V3'
  | 'SUSHISWAP'
  | 'CURVE'
  | 'BALANCER'
  | 'ONEINCH'
  | 'PANCAKESWAP'
  | 'QUICKSWAP'
  | 'TRADER_JOE'
  | 'UNKNOWN'

export type LiquidityEventType = 'ADD' | 'REMOVE'

export interface TokenInfo {
  address: string
  symbol: string
  decimals: number
}

export interface SwapEvent {
  transactionHash: string
  blockNumber: number
  timestamp: Date
  protocol: DEXProtocol
  blockchain: Blockchain
  walletAddress: string
  tokenIn: TokenInfo
  tokenOut: TokenInfo
  amountIn: number
  amountOut: number
  effectivePrice: number // tokenOut/tokenIn
  gasFee?: number
  poolAddress?: string
  routerAddress?: string
}

export interface LiquidityEvent {
  transactionHash: string
  blockNumber: number
  timestamp: Date
  protocol: DEXProtocol
  blockchain: Blockchain
  walletAddress: string
  eventType: LiquidityEventType
  token0: TokenInfo
  token1: TokenInfo
  amount0: number
  amount1: number
  lpTokenAmount?: number
  poolAddress: string
}

export interface DEXTransaction {
  hash: string
  blockNumber: string | number
  timestamp: string | number
  from: string
  to: string
  value: string
  input: string
  methodId?: string
  functionName?: string
  tokenTransfers?: Array<{
    tokenSymbol: string
    tokenAddress: string
    tokenDecimal: string
    value: string
    from: string
    to: string
  }>
}

export interface DEXAnalysisResult {
  swaps: SwapEvent[]
  liquidityEvents: LiquidityEvent[]
  summary: DEXSummary
}

export interface DEXSummary {
  totalSwaps: number
  totalVolumeUSD?: number
  protocolBreakdown: Record<DEXProtocol, number>
  tokenPairBreakdown: Record<string, number> // "ETH-USDC": 5
  uniqueTokens: string[]
  liquidityAdds: number
  liquidityRemoves: number
  potentialWashTrades: number
}

// ============================================
// Known DEX Contract Addresses
// ============================================

// Uniswap V2 Router addresses
const UNISWAP_V2_ROUTERS: Record<string, string[]> = {
  ETHEREUM: [
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'.toLowerCase(), // Uniswap V2 Router
  ],
  POLYGON: [
    '0xedf6066a2b290C185783862C7F4776A2C8077AD1'.toLowerCase(), // QuickSwap Router
  ],
  ARBITRUM: [
    '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'.toLowerCase(), // SushiSwap Router
  ],
  BSC: [
    '0x10ED43C718714eb63d5aA57B78B54704E256024E'.toLowerCase(), // PancakeSwap Router
  ],
  AVALANCHE: [
    '0x60aE616a2155Ee3d9A68541Ba4544862310933d4'.toLowerCase(), // Trader Joe Router
  ],
}

// Uniswap V3 Router addresses
const UNISWAP_V3_ROUTERS: Record<string, string[]> = {
  ETHEREUM: [
    '0xE592427A0AEce92De3Edee1F18E0157C05861564'.toLowerCase(), // V3 SwapRouter
    '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'.toLowerCase(), // V3 SwapRouter02
  ],
  POLYGON: [
    '0xE592427A0AEce92De3Edee1F18E0157C05861564'.toLowerCase(),
    '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'.toLowerCase(),
  ],
  ARBITRUM: [
    '0xE592427A0AEce92De3Edee1F18E0157C05861564'.toLowerCase(),
    '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'.toLowerCase(),
  ],
  OPTIMISM: [
    '0xE592427A0AEce92De3Edee1F18E0157C05861564'.toLowerCase(),
    '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'.toLowerCase(),
  ],
}

// 1inch Router addresses
const ONEINCH_ROUTERS: Record<string, string[]> = {
  ETHEREUM: [
    '0x1111111254fb6c44bAC0beD2854e76F90643097d'.toLowerCase(), // 1inch v4
    '0x1111111254EEB25477B68fb85Ed929f73A960582'.toLowerCase(), // 1inch v5
  ],
  POLYGON: [
    '0x1111111254fb6c44bAC0beD2854e76F90643097d'.toLowerCase(),
  ],
  ARBITRUM: [
    '0x1111111254fb6c44bAC0beD2854e76F90643097d'.toLowerCase(),
  ],
}

// SushiSwap Router addresses
const SUSHISWAP_ROUTERS: Record<string, string[]> = {
  ETHEREUM: [
    '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'.toLowerCase(),
  ],
  POLYGON: [
    '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'.toLowerCase(),
  ],
  ARBITRUM: [
    '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'.toLowerCase(),
  ],
}

// ============================================
// Method Signatures (function selectors)
// ============================================

// Common swap method signatures (first 4 bytes of keccak256)
const SWAP_METHOD_IDS: Record<string, string> = {
  // Uniswap V2
  '0x38ed1739': 'swapExactTokensForTokens',
  '0x8803dbee': 'swapTokensForExactTokens',
  '0x7ff36ab5': 'swapExactETHForTokens',
  '0xfb3bdb41': 'swapETHForExactTokens',
  '0x18cbafe5': 'swapExactTokensForETH',
  '0x4a25d94a': 'swapTokensForExactETH',
  '0x5c11d795': 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
  '0xb6f9de95': 'swapExactETHForTokensSupportingFeeOnTransferTokens',
  '0x791ac947': 'swapExactTokensForETHSupportingFeeOnTransferTokens',

  // Uniswap V3
  '0x414bf389': 'exactInputSingle',
  '0xc04b8d59': 'exactInput',
  '0xdb3e2198': 'exactOutputSingle',
  '0xf28c0498': 'exactOutput',
  '0x5ae401dc': 'multicall', // V3 multicall often contains swaps

  // 1inch
  '0xe449022e': 'unoswap',
  '0x7c025200': 'swap',
  '0x2e95b6c8': 'uniswapV3Swap',
}

// Liquidity method signatures
const LIQUIDITY_METHOD_IDS: Record<string, { method: string; type: LiquidityEventType }> = {
  // Uniswap V2
  '0xe8e33700': { method: 'addLiquidity', type: 'ADD' },
  '0xf305d719': { method: 'addLiquidityETH', type: 'ADD' },
  '0xbaa2abde': { method: 'removeLiquidity', type: 'REMOVE' },
  '0x02751cec': { method: 'removeLiquidityETH', type: 'REMOVE' },
  '0xaf2979eb': { method: 'removeLiquidityETHSupportingFeeOnTransferTokens', type: 'REMOVE' },
  '0x2195995c': { method: 'removeLiquidityWithPermit', type: 'REMOVE' },

  // Uniswap V3
  '0x88316456': { method: 'mint', type: 'ADD' }, // NFT position manager mint
  '0x0c49ccbe': { method: 'decreaseLiquidity', type: 'REMOVE' },
  '0xfc6f7865': { method: 'collect', type: 'REMOVE' },
}

// ============================================
// Detection Functions
// ============================================

/**
 * Identify the DEX protocol from a transaction
 */
export function identifyProtocol(
  toAddress: string,
  blockchain: Blockchain
): DEXProtocol {
  const to = toAddress.toLowerCase()
  const chain = blockchain as string

  // Check Uniswap V3 first (more specific)
  if (UNISWAP_V3_ROUTERS[chain]?.includes(to)) {
    return 'UNISWAP_V3'
  }

  // Check 1inch
  if (ONEINCH_ROUTERS[chain]?.includes(to)) {
    return 'ONEINCH'
  }

  // Check SushiSwap
  if (SUSHISWAP_ROUTERS[chain]?.includes(to)) {
    return 'SUSHISWAP'
  }

  // Check Uniswap V2 / DEX-specific routers
  if (UNISWAP_V2_ROUTERS[chain]?.includes(to)) {
    // Determine specific protocol based on chain
    if (chain === 'BSC') return 'PANCAKESWAP'
    if (chain === 'POLYGON') return 'QUICKSWAP'
    if (chain === 'AVALANCHE') return 'TRADER_JOE'
    return 'UNISWAP_V2'
  }

  return 'UNKNOWN'
}

/**
 * Check if a transaction is a DEX swap
 */
export function isSwapTransaction(tx: DEXTransaction): boolean {
  const methodId = tx.methodId || tx.input?.slice(0, 10)
  if (!methodId) return false

  return methodId in SWAP_METHOD_IDS
}

/**
 * Check if a transaction is a liquidity event
 */
export function isLiquidityTransaction(tx: DEXTransaction): { isLiquidity: boolean; type?: LiquidityEventType } {
  const methodId = tx.methodId || tx.input?.slice(0, 10)
  if (!methodId) return { isLiquidity: false }

  const liquidityInfo = LIQUIDITY_METHOD_IDS[methodId]
  if (liquidityInfo) {
    return { isLiquidity: true, type: liquidityInfo.type }
  }

  return { isLiquidity: false }
}

/**
 * Parse a swap transaction to extract swap details
 */
export function parseSwapTransaction(
  tx: DEXTransaction,
  walletAddress: string,
  blockchain: Blockchain
): SwapEvent | null {
  if (!isSwapTransaction(tx)) return null

  const protocol = identifyProtocol(tx.to, blockchain)
  const timestamp = typeof tx.timestamp === 'string'
    ? new Date(parseInt(tx.timestamp) * 1000)
    : new Date(tx.timestamp * 1000)

  // Try to extract token info from token transfers
  if (!tx.tokenTransfers || tx.tokenTransfers.length < 2) {
    // Can't determine swap without token transfer info
    return null
  }

  const wallet = walletAddress.toLowerCase()

  // Find the token sent (from wallet) and received (to wallet)
  const tokensSent = tx.tokenTransfers.filter(t => t.from.toLowerCase() === wallet)
  const tokensReceived = tx.tokenTransfers.filter(t => t.to.toLowerCase() === wallet)

  if (tokensSent.length === 0 || tokensReceived.length === 0) {
    return null
  }

  // Take the first token in/out (for multi-hop, this is simplified)
  const tokenInTransfer = tokensSent[0]
  const tokenOutTransfer = tokensReceived[0]

  const tokenIn: TokenInfo = {
    address: tokenInTransfer.tokenAddress,
    symbol: tokenInTransfer.tokenSymbol || 'UNKNOWN',
    decimals: parseInt(tokenInTransfer.tokenDecimal) || 18,
  }

  const tokenOut: TokenInfo = {
    address: tokenOutTransfer.tokenAddress,
    symbol: tokenOutTransfer.tokenSymbol || 'UNKNOWN',
    decimals: parseInt(tokenOutTransfer.tokenDecimal) || 18,
  }

  const amountIn = parseFloat(tokenInTransfer.value) / Math.pow(10, tokenIn.decimals)
  const amountOut = parseFloat(tokenOutTransfer.value) / Math.pow(10, tokenOut.decimals)

  // Calculate effective price (how much tokenOut per tokenIn)
  const effectivePrice = amountIn > 0 ? amountOut / amountIn : 0

  return {
    transactionHash: tx.hash,
    blockNumber: typeof tx.blockNumber === 'string' ? parseInt(tx.blockNumber) : tx.blockNumber,
    timestamp,
    protocol,
    blockchain,
    walletAddress: wallet,
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    effectivePrice,
    routerAddress: tx.to.toLowerCase(),
  }
}

/**
 * Parse a liquidity transaction to extract event details
 */
export function parseLiquidityTransaction(
  tx: DEXTransaction,
  walletAddress: string,
  blockchain: Blockchain
): LiquidityEvent | null {
  const { isLiquidity, type } = isLiquidityTransaction(tx)
  if (!isLiquidity || !type) return null

  const protocol = identifyProtocol(tx.to, blockchain)
  const timestamp = typeof tx.timestamp === 'string'
    ? new Date(parseInt(tx.timestamp) * 1000)
    : new Date(tx.timestamp * 1000)

  // Try to extract tokens from transfers
  if (!tx.tokenTransfers || tx.tokenTransfers.length < 2) {
    return null
  }

  const wallet = walletAddress.toLowerCase()

  // For ADD: tokens go FROM wallet TO pool
  // For REMOVE: tokens go FROM pool TO wallet
  const relevantTransfers = type === 'ADD'
    ? tx.tokenTransfers.filter(t => t.from.toLowerCase() === wallet)
    : tx.tokenTransfers.filter(t => t.to.toLowerCase() === wallet)

  if (relevantTransfers.length < 2) {
    return null
  }

  // Take first two tokens as the pair
  const token0Transfer = relevantTransfers[0]
  const token1Transfer = relevantTransfers[1]

  const token0: TokenInfo = {
    address: token0Transfer.tokenAddress,
    symbol: token0Transfer.tokenSymbol || 'UNKNOWN',
    decimals: parseInt(token0Transfer.tokenDecimal) || 18,
  }

  const token1: TokenInfo = {
    address: token1Transfer.tokenAddress,
    symbol: token1Transfer.tokenSymbol || 'UNKNOWN',
    decimals: parseInt(token1Transfer.tokenDecimal) || 18,
  }

  const amount0 = parseFloat(token0Transfer.value) / Math.pow(10, token0.decimals)
  const amount1 = parseFloat(token1Transfer.value) / Math.pow(10, token1.decimals)

  return {
    transactionHash: tx.hash,
    blockNumber: typeof tx.blockNumber === 'string' ? parseInt(tx.blockNumber) : tx.blockNumber,
    timestamp,
    protocol,
    blockchain,
    walletAddress: wallet,
    eventType: type,
    token0,
    token1,
    amount0,
    amount1,
    poolAddress: tx.to.toLowerCase(),
  }
}

// ============================================
// Analysis Functions
// ============================================

/**
 * Analyze a list of transactions for DEX activity
 */
export function analyzeDEXTransactions(
  transactions: DEXTransaction[],
  walletAddress: string,
  blockchain: Blockchain
): DEXAnalysisResult {
  const swaps: SwapEvent[] = []
  const liquidityEvents: LiquidityEvent[] = []

  for (const tx of transactions) {
    // Try to parse as swap
    const swap = parseSwapTransaction(tx, walletAddress, blockchain)
    if (swap) {
      swaps.push(swap)
      continue
    }

    // Try to parse as liquidity event
    const liquidity = parseLiquidityTransaction(tx, walletAddress, blockchain)
    if (liquidity) {
      liquidityEvents.push(liquidity)
    }
  }

  // Calculate summary
  const summary = calculateDEXSummary(swaps, liquidityEvents)

  return {
    swaps,
    liquidityEvents,
    summary,
  }
}

/**
 * Calculate DEX activity summary
 */
function calculateDEXSummary(
  swaps: SwapEvent[],
  liquidityEvents: LiquidityEvent[]
): DEXSummary {
  // Protocol breakdown
  const protocolBreakdown: Record<DEXProtocol, number> = {
    UNISWAP_V2: 0,
    UNISWAP_V3: 0,
    SUSHISWAP: 0,
    CURVE: 0,
    BALANCER: 0,
    ONEINCH: 0,
    PANCAKESWAP: 0,
    QUICKSWAP: 0,
    TRADER_JOE: 0,
    UNKNOWN: 0,
  }

  for (const swap of swaps) {
    protocolBreakdown[swap.protocol]++
  }

  // Token pair breakdown
  const tokenPairBreakdown: Record<string, number> = {}
  const uniqueTokens = new Set<string>()

  for (const swap of swaps) {
    const pair = [swap.tokenIn.symbol, swap.tokenOut.symbol].sort().join('-')
    tokenPairBreakdown[pair] = (tokenPairBreakdown[pair] || 0) + 1
    uniqueTokens.add(swap.tokenIn.symbol)
    uniqueTokens.add(swap.tokenOut.symbol)
  }

  // Liquidity counts
  const liquidityAdds = liquidityEvents.filter(e => e.eventType === 'ADD').length
  const liquidityRemoves = liquidityEvents.filter(e => e.eventType === 'REMOVE').length

  // Potential wash trades (same token pair traded multiple times in short period)
  const potentialWashTrades = detectWashTrades(swaps)

  return {
    totalSwaps: swaps.length,
    protocolBreakdown,
    tokenPairBreakdown,
    uniqueTokens: Array.from(uniqueTokens),
    liquidityAdds,
    liquidityRemoves,
    potentialWashTrades,
  }
}

/**
 * Detect potential wash trading patterns
 * Wash trading: trading with yourself to inflate volume
 *
 * Detection heuristics:
 * 1. Same token pair traded back and forth within short time window
 * 2. Amounts are very similar
 */
export function detectWashTrades(swaps: SwapEvent[]): number {
  let washTradeCount = 0
  const TIME_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours
  const AMOUNT_TOLERANCE = 0.05 // 5% tolerance

  // Sort swaps by timestamp
  const sortedSwaps = [...swaps].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )

  for (let i = 0; i < sortedSwaps.length - 1; i++) {
    const swap1 = sortedSwaps[i]

    for (let j = i + 1; j < sortedSwaps.length; j++) {
      const swap2 = sortedSwaps[j]

      // Check time window
      if (swap2.timestamp.getTime() - swap1.timestamp.getTime() > TIME_WINDOW_MS) {
        break
      }

      // Check if it's a reverse swap (same pair, opposite direction)
      const isReverse =
        swap1.tokenIn.address.toLowerCase() === swap2.tokenOut.address.toLowerCase() &&
        swap1.tokenOut.address.toLowerCase() === swap2.tokenIn.address.toLowerCase()

      if (isReverse) {
        // Check if amounts are similar
        const amountRatio = swap1.amountIn / swap2.amountOut
        if (Math.abs(1 - amountRatio) < AMOUNT_TOLERANCE) {
          washTradeCount++
        }
      }
    }
  }

  return washTradeCount
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get protocol display name
 */
export function getProtocolDisplayName(protocol: DEXProtocol): string {
  const names: Record<DEXProtocol, string> = {
    UNISWAP_V2: 'Uniswap V2',
    UNISWAP_V3: 'Uniswap V3',
    SUSHISWAP: 'SushiSwap',
    CURVE: 'Curve',
    BALANCER: 'Balancer',
    ONEINCH: '1inch',
    PANCAKESWAP: 'PancakeSwap',
    QUICKSWAP: 'QuickSwap',
    TRADER_JOE: 'Trader Joe',
    UNKNOWN: 'Unknown DEX',
  }
  return names[protocol]
}

/**
 * Format swap for display
 */
export function formatSwapDescription(swap: SwapEvent): string {
  return `Swapped ${swap.amountIn.toFixed(6)} ${swap.tokenIn.symbol} for ${swap.amountOut.toFixed(6)} ${swap.tokenOut.symbol}`
}

/**
 * Get swap pair string
 */
export function getSwapPair(swap: SwapEvent): string {
  return `${swap.tokenIn.symbol} → ${swap.tokenOut.symbol}`
}

/**
 * Calculate trading volume by protocol
 */
export function calculateVolumeByProtocol(swaps: SwapEvent[]): Map<DEXProtocol, { swapCount: number; pairs: string[] }> {
  const volumeMap = new Map<DEXProtocol, { swapCount: number; pairs: Set<string> }>()

  for (const swap of swaps) {
    const existing = volumeMap.get(swap.protocol)
    const pair = [swap.tokenIn.symbol, swap.tokenOut.symbol].sort().join('-')

    if (existing) {
      existing.swapCount++
      existing.pairs.add(pair)
    } else {
      volumeMap.set(swap.protocol, {
        swapCount: 1,
        pairs: new Set([pair]),
      })
    }
  }

  // Convert Sets to arrays for output
  const result = new Map<DEXProtocol, { swapCount: number; pairs: string[] }>()
  volumeMap.forEach((value, key) => {
    result.set(key, {
      swapCount: value.swapCount,
      pairs: Array.from(value.pairs),
    })
  })

  return result
}

/**
 * Group swaps by token pair
 */
export function groupSwapsByPair(swaps: SwapEvent[]): Map<string, SwapEvent[]> {
  const pairMap = new Map<string, SwapEvent[]>()

  for (const swap of swaps) {
    const pair = [swap.tokenIn.symbol, swap.tokenOut.symbol].sort().join('-')
    const existing = pairMap.get(pair) || []
    existing.push(swap)
    pairMap.set(pair, existing)
  }

  return pairMap
}

/**
 * Determine if a transaction is likely DEX-related based on the target address
 */
export function isDEXRouter(address: string, blockchain: Blockchain): boolean {
  const chain = blockchain as string
  const addr = address.toLowerCase()

  return (
    UNISWAP_V2_ROUTERS[chain]?.includes(addr) ||
    UNISWAP_V3_ROUTERS[chain]?.includes(addr) ||
    ONEINCH_ROUTERS[chain]?.includes(addr) ||
    SUSHISWAP_ROUTERS[chain]?.includes(addr) ||
    false
  )
}

/**
 * Filter transactions to only DEX-related ones
 */
export function filterDEXTransactions(
  transactions: DEXTransaction[],
  blockchain: Blockchain
): DEXTransaction[] {
  return transactions.filter(tx => {
    // Check if target is a known DEX router
    if (isDEXRouter(tx.to, blockchain)) {
      return true
    }

    // Check if method ID matches swap or liquidity functions
    const methodId = tx.methodId || tx.input?.slice(0, 10)
    if (methodId) {
      return methodId in SWAP_METHOD_IDS || methodId in LIQUIDITY_METHOD_IDS
    }

    return false
  })
}
