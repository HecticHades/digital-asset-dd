/**
 * Blockchair API client for fetching Bitcoin transactions
 */

import type { ParsedTransaction } from '@/types/transaction'

const BLOCKCHAIR_ENDPOINT = 'https://api.blockchair.com/bitcoin'

interface BlockchairAddressInfo {
  address: {
    type: string
    script_hex: string
    balance: number
    balance_usd: number
    received: number
    received_usd: number
    spent: number
    spent_usd: number
    output_count: number
    unspent_output_count: number
    first_seen_receiving: string
    last_seen_receiving: string
    first_seen_spending: string
    last_seen_spending: string
    scripthash_type: string | null
    transaction_count: number
  }
  transactions: string[]
  utxo: Array<{
    block_id: number
    transaction_hash: string
    index: number
    value: number
  }>
}

interface BlockchairTransactionInfo {
  block_id: number
  id: number
  hash: string
  date: string
  time: string
  size: number
  weight: number
  version: number
  lock_time: number
  is_coinbase: boolean
  has_witness: boolean
  input_count: number
  output_count: number
  input_total: number
  input_total_usd: number
  output_total: number
  output_total_usd: number
  fee: number
  fee_usd: number
  fee_per_kb: number
  fee_per_kb_usd: number
  fee_per_kwu: number
  fee_per_kwu_usd: number
  cdd_total: number
}

interface BlockchairInput {
  block_id: number
  transaction_id: number
  index: number
  transaction_hash: string
  date: string
  time: string
  value: number
  value_usd: number
  recipient: string
  type: string
  script_hex: string
  is_from_coinbase: boolean
  is_spendable: boolean
  spending_block_id: number
  spending_transaction_id: number
  spending_index: number
  spending_transaction_hash: string
  spending_date: string
  spending_time: string
  spending_value_usd: number
  spending_sequence: number
  spending_signature_hex: string
  spending_witness: string
  lifespan: number
  cdd: number
}

interface BlockchairOutput {
  block_id: number
  transaction_id: number
  index: number
  transaction_hash: string
  date: string
  time: string
  value: number
  value_usd: number
  recipient: string
  type: string
  script_hex: string
  is_from_coinbase: boolean
  is_spendable: boolean
  is_spent: boolean
  spending_block_id: number | null
  spending_transaction_id: number | null
  spending_index: number | null
  spending_transaction_hash: string | null
  spending_date: string | null
  spending_time: string | null
  spending_value_usd: number | null
  spending_sequence: number | null
  spending_signature_hex: string | null
  spending_witness: string | null
  lifespan: number | null
  cdd: number | null
}

interface BlockchairTransactionDetail {
  transaction: BlockchairTransactionInfo
  inputs: BlockchairInput[]
  outputs: BlockchairOutput[]
}

interface BlockchairAddressResponse {
  data: {
    [address: string]: BlockchairAddressInfo
  }
  context: {
    code: number
    error?: string
    limit: string
    offset: string
    results: number
    state: number
  }
}

interface BlockchairTransactionResponse {
  data: {
    [txHash: string]: BlockchairTransactionDetail
  }
  context: {
    code: number
    error?: string
    results: number
    state: number
  }
}

/**
 * Get API key from environment
 */
function getApiKey(): string {
  return process.env.BLOCKCHAIR_API_KEY || ''
}

/**
 * Make a Blockchair API request
 */
async function makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = getApiKey()
  const queryParams = new URLSearchParams(params)
  if (apiKey) {
    queryParams.set('key', apiKey)
  }

  const url = `${BLOCKCHAIR_ENDPOINT}${endpoint}?${queryParams.toString()}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Blockchair API request failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as T & { context?: { error?: string } }

  if (data.context?.error) {
    throw new Error(data.context.error)
  }

  return data
}

/**
 * Fetch address information including transaction list
 */
export async function fetchAddressInfo(address: string): Promise<BlockchairAddressInfo> {
  const data = await makeRequest<BlockchairAddressResponse>(
    `/dashboards/address/${address}`,
    { transaction_details: 'true' }
  )

  const addressData = data.data[address]
  if (!addressData) {
    throw new Error(`Address not found: ${address}`)
  }

  return addressData
}

/**
 * Fetch transaction details by hash
 */
export async function fetchTransactionDetails(txHash: string): Promise<BlockchairTransactionDetail> {
  const data = await makeRequest<BlockchairTransactionResponse>(
    `/dashboards/transaction/${txHash}`
  )

  const txData = data.data[txHash]
  if (!txData) {
    throw new Error(`Transaction not found: ${txHash}`)
  }

  return txData
}

/**
 * Fetch multiple transaction details at once (up to 10 per request)
 */
export async function fetchMultipleTransactions(txHashes: string[]): Promise<BlockchairTransactionDetail[]> {
  if (txHashes.length === 0) return []

  // Blockchair allows up to 10 transactions per request
  const batches: string[][] = []
  for (let i = 0; i < txHashes.length; i += 10) {
    batches.push(txHashes.slice(i, i + 10))
  }

  const results: BlockchairTransactionDetail[] = []

  for (const batch of batches) {
    const hashList = batch.join(',')
    const data = await makeRequest<BlockchairTransactionResponse>(
      `/dashboards/transactions/${hashList}`
    )

    for (const hash of batch) {
      if (data.data[hash]) {
        results.push(data.data[hash])
      }
    }

    // Rate limiting: wait a bit between batches
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  return results
}

/**
 * Convert satoshis to BTC
 */
function satoshisToBTC(satoshis: number): number {
  return satoshis / 100000000
}

/**
 * Determine transaction type based on inputs and outputs
 */
function determineTransactionType(
  tx: BlockchairTransactionDetail,
  walletAddress: string
): 'deposit' | 'withdrawal' | 'transfer' {
  const isInput = tx.inputs.some(input => input.recipient === walletAddress)
  const isOutput = tx.outputs.some(output => output.recipient === walletAddress)

  if (isInput && isOutput) {
    return 'transfer'
  } else if (isInput) {
    return 'withdrawal'
  } else if (isOutput) {
    return 'deposit'
  }

  return 'transfer'
}

/**
 * Calculate the net amount for a wallet from a transaction
 */
function calculateNetAmount(
  tx: BlockchairTransactionDetail,
  walletAddress: string
): { received: number; sent: number; fee: number } {
  let received = 0
  let sent = 0
  const fee = tx.transaction.fee

  // Sum outputs to our address (received)
  for (const output of tx.outputs) {
    if (output.recipient === walletAddress) {
      received += output.value
    }
  }

  // Sum inputs from our address (sent)
  for (const input of tx.inputs) {
    if (input.recipient === walletAddress) {
      sent += input.value
    }
  }

  return { received, sent, fee }
}

/**
 * Parse Bitcoin transactions into our normalized format
 */
export function parseBitcoinTransactions(
  txDetails: BlockchairTransactionDetail[],
  walletAddress: string
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  for (const tx of txDetails) {
    const type = determineTransactionType(tx, walletAddress)
    const { received, sent, fee } = calculateNetAmount(tx, walletAddress)

    // Calculate net amount
    let amount: number
    let txFee: number | undefined

    if (type === 'deposit') {
      amount = satoshisToBTC(received)
    } else if (type === 'withdrawal') {
      amount = satoshisToBTC(sent)
      // Fee is paid by the sender
      txFee = satoshisToBTC(fee)
    } else {
      // Transfer (self-send)
      amount = satoshisToBTC(received)
      txFee = satoshisToBTC(fee)
    }

    if (amount > 0) {
      transactions.push({
        timestamp: new Date(tx.transaction.time),
        type,
        asset: 'BTC',
        amount,
        fee: txFee,
        exchange: 'BITCOIN',
        source: 'ON_CHAIN',
        rawData: {
          txHash: tx.transaction.hash,
          blockId: tx.transaction.block_id,
          inputCount: tx.transaction.input_count,
          outputCount: tx.transaction.output_count,
          inputTotal: satoshisToBTC(tx.transaction.input_total),
          outputTotal: satoshisToBTC(tx.transaction.output_total),
        },
      })
    }
  }

  // Sort by timestamp
  transactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return transactions
}

/**
 * Fetch all transactions for a Bitcoin address
 */
export async function fetchAllTransactions(
  address: string
): Promise<ParsedTransaction[]> {
  // First get the address info to get all transaction hashes
  const addressInfo = await fetchAddressInfo(address)

  if (addressInfo.transactions.length === 0) {
    return []
  }

  // Fetch details for all transactions
  const txDetails = await fetchMultipleTransactions(addressInfo.transactions)

  return parseBitcoinTransactions(txDetails, address)
}

/**
 * Get current BTC balance for an address
 */
export async function getBalance(address: string): Promise<number> {
  const addressInfo = await fetchAddressInfo(address)
  return satoshisToBTC(addressInfo.address.balance)
}

/**
 * Calculate wallet balance at a specific timestamp
 * Returns balance in BTC
 */
export function calculateBalanceAtTime(
  transactions: ParsedTransaction[],
  walletAddress: string,
  targetTime: Date
): number {
  let balance = 0

  for (const tx of transactions) {
    if (tx.timestamp > targetTime) break

    const rawData = tx.rawData as { txHash?: string } | undefined

    if (tx.type === 'deposit') {
      balance += tx.amount
    } else if (tx.type === 'withdrawal') {
      balance -= tx.amount
      if (tx.fee) {
        balance -= tx.fee
      }
    }
  }

  return Math.max(0, balance)
}
