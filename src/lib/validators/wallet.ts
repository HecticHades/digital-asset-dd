import { z } from 'zod'
import { Blockchain } from '@prisma/client'

// Address validation patterns per blockchain
const ADDRESS_PATTERNS: Record<Blockchain, RegExp> = {
  ETHEREUM: /^0x[a-fA-F0-9]{40}$/,
  POLYGON: /^0x[a-fA-F0-9]{40}$/,
  ARBITRUM: /^0x[a-fA-F0-9]{40}$/,
  OPTIMISM: /^0x[a-fA-F0-9]{40}$/,
  BSC: /^0x[a-fA-F0-9]{40}$/,
  AVALANCHE: /^0x[a-fA-F0-9]{40}$/,
  BITCOIN: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/, // Legacy, SegWit, and Bech32
  SOLANA: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, // Base58 format
  OTHER: /^.+$/, // Accept any non-empty string for OTHER
}

// Human-readable blockchain names
export const BLOCKCHAIN_LABELS: Record<Blockchain, string> = {
  ETHEREUM: 'Ethereum (ETH)',
  BITCOIN: 'Bitcoin (BTC)',
  POLYGON: 'Polygon (MATIC)',
  ARBITRUM: 'Arbitrum (ARB)',
  OPTIMISM: 'Optimism (OP)',
  BSC: 'BNB Chain (BSC)',
  AVALANCHE: 'Avalanche (AVAX)',
  SOLANA: 'Solana (SOL)',
  OTHER: 'Other',
}

export function validateAddress(address: string, blockchain: Blockchain): boolean {
  const pattern = ADDRESS_PATTERNS[blockchain]
  return pattern.test(address)
}

export function getAddressError(blockchain: Blockchain): string {
  switch (blockchain) {
    case 'ETHEREUM':
    case 'POLYGON':
    case 'ARBITRUM':
    case 'OPTIMISM':
    case 'BSC':
    case 'AVALANCHE':
      return 'Invalid EVM address. Must start with 0x followed by 40 hex characters.'
    case 'BITCOIN':
      return 'Invalid Bitcoin address. Must be a valid Legacy, SegWit, or Bech32 address.'
    case 'SOLANA':
      return 'Invalid Solana address. Must be a valid Base58 encoded address.'
    default:
      return 'Invalid wallet address.'
  }
}

// Schema for creating a new wallet
export const createWalletSchema = z.object({
  address: z.string().min(1, 'Wallet address is required'),
  blockchain: z.nativeEnum(Blockchain, {
    errorMap: () => ({ message: 'Please select a blockchain' }),
  }),
  label: z.string().optional(),
  clientId: z.string().min(1, 'Client ID is required'),
}).refine(
  (data) => validateAddress(data.address, data.blockchain),
  (data) => ({
    message: getAddressError(data.blockchain),
    path: ['address'],
  })
)

// Schema for verifying a wallet with a proof document
export const verifyWalletSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
  proofDocumentId: z.string().min(1, 'Proof document is required'),
})

// Schema for deleting a wallet
export const deleteWalletSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
})

export type CreateWalletInput = z.infer<typeof createWalletSchema>
export type VerifyWalletInput = z.infer<typeof verifyWalletSchema>
export type DeleteWalletInput = z.infer<typeof deleteWalletSchema>
