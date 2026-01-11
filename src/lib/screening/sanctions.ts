/**
 * On-chain Address Risk Screening
 *
 * This module provides risk screening capabilities for blockchain addresses:
 * - OFAC SDN list checking
 * - Known mixer address detection (Tornado Cash, etc.)
 * - Privacy coin flagging (Monero, Zcash)
 *
 * Note: For production use, consider integrating with professional APIs like:
 * - Chainalysis
 * - Elliptic
 * - TRM Labs
 */

import type { Blockchain, FindingSeverity, FindingCategory } from '@prisma/client'

// ============================================
// Types
// ============================================

export interface ScreeningResult {
  address: string
  blockchain: Blockchain
  screenedAt: Date
  flags: ScreeningFlag[]
  isSanctioned: boolean
  isMixerRelated: boolean
  isPrivacyCoinRelated: boolean
  riskScore: number // 0-100
}

export interface ScreeningFlag {
  title: string
  description: string
  severity: FindingSeverity
  category: FindingCategory
  source: string // e.g., 'OFAC SDN List', 'Known Mixer Addresses'
  matchedValue?: string // The specific value that triggered the flag
}

export interface TransactionScreeningResult {
  txHash: string
  flags: ScreeningFlag[]
  fromAddress?: string
  toAddress?: string
  asset: string
}

// ============================================
// Known Sanctioned Addresses (OFAC SDN List - Sample)
// ============================================

/**
 * OFAC SDN List - Sanctioned Crypto Addresses
 * Source: https://www.treasury.gov/resource-center/sanctions/SDN-List/
 *
 * NOTE: This is a sample list for demonstration. In production, you should:
 * 1. Use the official OFAC SDN list API or data feed
 * 2. Integrate with services like Chainalysis or Elliptic for real-time updates
 * 3. Update this list regularly via an automated process
 *
 * Last Updated: Sample data - not for production use
 */
export const OFAC_SANCTIONED_ADDRESSES: Set<string> = new Set([
  // Tornado Cash Deployer
  '0x77777feddddffc19ff86db637967013e6c6a116c',
  // Tornado Cash Router
  '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b',
  // Lazarus Group attributed addresses (sample)
  '0xa7e5d5a720f06526557c513402f2e6b5fa20b008',
  '0x901bb9583b24d97e995513c6778dc6888ab6870e',
  '0x0a3f9147c7e5c77b8bcd10f0f8c15be74cb1fa25',
  // Blender.io attributed addresses (sample)
  '0x23773e65ed146a459791799d01336db287f25334',
  // Suex OTC sanctioned addresses (sample)
  '0x2f389ce8bd8ff92de3402ffce4691d17fc4f6535',
  '0xdf7f1cc4cba47e0e77a7c81ae3a89e3df3d785e5',
  // Chatex sanctioned addresses (sample)
  '0x6f1ca141a28907f78ebaa64fb83a9088b02a8352',
  // Garantex sanctioned addresses (sample)
  '0x7db418b5d567a4e0e8c59ad71be1fce48f3e6107',
])

// ============================================
// Known Mixer Addresses
// ============================================

/**
 * Tornado Cash contract addresses on various networks
 * These are the official Tornado Cash contracts
 */
export const TORNADO_CASH_ADDRESSES: Record<string, Set<string>> = {
  // Ethereum Mainnet
  ETHEREUM: new Set([
    // ETH pools
    '0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc', // 0.1 ETH
    '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936', // 1 ETH
    '0x910cbd523d972eb0a6f4cae4618ad62622b39dbf', // 10 ETH
    '0xa160cdab225685da1d56aa342ad8841c3b53f291', // 100 ETH
    // DAI pools
    '0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3', // 100 DAI
    '0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144', // 1000 DAI
    '0x07687e702b410fa43f4cb4af7fa097918ffd2730', // 10000 DAI
    '0x23773e65ed146a459791799d01336db287f25334', // 100000 DAI
    // cDAI pools
    '0x22aaa7720ddd5388a3c0a3333430953c68f1849b', // 5000 cDAI
    '0x03893a7c7463ae47d46bc7f091665f1893656003', // 50000 cDAI
    '0x2717c5e28cf931547b621a5dddb772ab6a35b701', // 500000 cDAI
    '0xd21be7248e0197ee08e0c20d4a2c25e5eA7dfb83', // 5000000 cDAI
    // USDC pools
    '0xd691f27f38b395864ea86cfc7253969b409c362d', // 100 USDC
    '0x4736dcf1b7a3d580672cce6e7c65cd5cc9cfba9d', // 1000 USDC
    // USDT pools
    '0x169ad27a470d064dede56a2d3ff727986b15d52b', // 100 USDT
    '0x0836222f2b2b24a3f36f98668ed8f0b38d1a872f', // 1000 USDT
    // WBTC pools
    '0x178169b423a011fff22b9e3f3abea13414ddd0f1', // 0.1 WBTC
    '0x610b717796ad172b316836ac95a2ffad065ceab4', // 1 WBTC
    '0xbb93e510bbcd0b7beb5a853875f9ec60275cf498', // 10 WBTC
    // Tornado Cash Nova (private pool)
    '0xa160cdab225685da1d56aa342ad8841c3b53f291',
    // Tornado Cash Governance
    '0x5efda50f22d34f262c29268506c5fa42cb56a1ce',
    // Tornado Cash Router
    '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b',
  ]),
  // BSC (BNB Smart Chain)
  BSC: new Set([
    '0x84443cfd09a48af6ef360c6976c5392ac5023a1f', // 0.1 BNB
    '0xd47438c816c9e7f2e2888e060936a499af9582b3', // 1 BNB
    '0x330bdfade01ee9bf63c209ee33102dd334618e0a', // 10 BNB
    '0x1e34a77868e19a6647b1f2f47b51ed72dede95dd', // 100 BNB
  ]),
  // Polygon
  POLYGON: new Set([
    '0x1e34a77868e19a6647b1f2f47b51ed72dede95dd', // 100 MATIC
    '0xdf231d99ff8b6c6cbf4e9b9a945cba1c8a83f2af', // 1000 MATIC
    '0xaf4c0b70b2ea9fb7487c7cbb37ada259579fe040', // 10000 MATIC
    '0xa5c2254e4253490c54cef0a4347fddb8f75a4998', // 100000 MATIC
  ]),
  // Arbitrum
  ARBITRUM: new Set([
    '0x84443cfd09a48af6ef360c6976c5392ac5023a1f', // 0.1 ETH
    '0xd47438c816c9e7f2e2888e060936a499af9582b3', // 1 ETH
    '0x330bdfade01ee9bf63c209ee33102dd334618e0a', // 10 ETH
    '0x1e34a77868e19a6647b1f2f47b51ed72dede95dd', // 100 ETH
  ]),
  // Optimism
  OPTIMISM: new Set([
    '0x84443cfd09a48af6ef360c6976c5392ac5023a1f', // 0.1 ETH
    '0xd47438c816c9e7f2e2888e060936a499af9582b3', // 1 ETH
    '0x330bdfade01ee9bf63c209ee33102dd334618e0a', // 10 ETH
    '0x1e34a77868e19a6647b1f2f47b51ed72dede95dd', // 100 ETH
  ]),
  // Avalanche
  AVALANCHE: new Set([
    '0x330bdfade01ee9bf63c209ee33102dd334618e0a', // 10 AVAX
    '0x1e34a77868e19a6647b1f2f47b51ed72dede95dd', // 100 AVAX
    '0xaf4c0b70b2ea9fb7487c7cbb37ada259579fe040', // 500 AVAX
  ]),
}

/**
 * Other known mixer services and tumbler addresses
 */
export const OTHER_MIXER_ADDRESSES: Set<string> = new Set([
  // Blender.io (Bitcoin mixer - OFAC sanctioned)
  // Note: These are placeholder addresses for demonstration
  // ChipMixer addresses
  // Wasabi Wallet CoinJoin coordinator (not sanctioned but privacy enhancing)
  // Samourai Wallet Whirlpool coordinator
])

// ============================================
// Privacy Coins
// ============================================

/**
 * Privacy-focused cryptocurrencies that may require additional scrutiny
 */
export const PRIVACY_COINS: Set<string> = new Set([
  'XMR',  // Monero
  'ZEC',  // Zcash
  'DASH', // Dash (optional privacy features)
  'ZEN',  // Horizen
  'SCRT', // Secret Network
  'ARRR', // Pirate Chain
  'BEAM', // Beam
  'GRIN', // Grin
  'FIRO', // Firo (formerly Zcoin)
  'XVG',  // Verge
  'DCR',  // Decred (optional privacy)
  'KMD',  // Komodo
  'NAV',  // NavCoin
  'PIVX', // PIVX
])

/**
 * Wrapped/bridged versions of privacy coins
 */
export const WRAPPED_PRIVACY_COINS: Set<string> = new Set([
  'WXMR',    // Wrapped Monero
  'renZEC',  // RenVM Zcash
  'wZEC',    // Wrapped Zcash
])

// ============================================
// High-Risk Jurisdiction Indicators
// ============================================

/**
 * Exchanges/services known to operate in high-risk jurisdictions
 * or with weak KYC/AML compliance
 */
export const HIGH_RISK_EXCHANGES: Set<string> = new Set([
  // Note: This list is for demonstration purposes
  // Real implementation should use updated regulatory guidance
])

// ============================================
// Screening Functions
// ============================================

/**
 * Normalize address for comparison (lowercase, trim)
 */
function normalizeAddress(address: string): string {
  return address.toLowerCase().trim()
}

/**
 * Check if an address is on the OFAC SDN list
 */
export function checkOFACSanctions(address: string): ScreeningFlag | null {
  const normalized = normalizeAddress(address)

  if (OFAC_SANCTIONED_ADDRESSES.has(normalized)) {
    return {
      title: 'OFAC Sanctioned Address',
      description: 'This address is on the U.S. Treasury OFAC Specially Designated Nationals (SDN) list. Transactions with this address are prohibited under U.S. law.',
      severity: 'CRITICAL',
      category: 'SANCTIONS',
      source: 'OFAC SDN List',
      matchedValue: normalized,
    }
  }

  return null
}

/**
 * Check if an address is a known Tornado Cash contract
 */
export function checkTornadoCash(address: string, blockchain: Blockchain): ScreeningFlag | null {
  const normalized = normalizeAddress(address)
  const chainAddresses = TORNADO_CASH_ADDRESSES[blockchain]

  if (chainAddresses && chainAddresses.has(normalized)) {
    return {
      title: 'Tornado Cash Contract',
      description: 'This address is a known Tornado Cash mixing contract. Tornado Cash has been sanctioned by OFAC for money laundering activities.',
      severity: 'CRITICAL',
      category: 'MIXER',
      source: 'Known Mixer Addresses',
      matchedValue: normalized,
    }
  }

  return null
}

/**
 * Check if an address is associated with other known mixers
 */
export function checkOtherMixers(address: string): ScreeningFlag | null {
  const normalized = normalizeAddress(address)

  if (OTHER_MIXER_ADDRESSES.has(normalized)) {
    return {
      title: 'Known Mixer Service',
      description: 'This address is associated with a known cryptocurrency mixing or tumbling service.',
      severity: 'HIGH',
      category: 'MIXER',
      source: 'Known Mixer Addresses',
      matchedValue: normalized,
    }
  }

  return null
}

/**
 * Check if an asset is a privacy coin
 */
export function checkPrivacyCoin(asset: string): ScreeningFlag | null {
  const normalized = asset.toUpperCase().trim()

  if (PRIVACY_COINS.has(normalized) || WRAPPED_PRIVACY_COINS.has(normalized)) {
    return {
      title: 'Privacy Coin Transaction',
      description: `Transaction involves ${normalized}, a privacy-focused cryptocurrency. These assets may require additional scrutiny due to their enhanced anonymity features.`,
      severity: 'MEDIUM',
      category: 'PRIVACY',
      source: 'Privacy Coin Detection',
      matchedValue: normalized,
    }
  }

  return null
}

/**
 * Screen an address for all known risks
 */
export function screenAddress(address: string, blockchain: Blockchain): ScreeningResult {
  const flags: ScreeningFlag[] = []

  // Check OFAC sanctions
  const sanctionFlag = checkOFACSanctions(address)
  if (sanctionFlag) {
    flags.push(sanctionFlag)
  }

  // Check Tornado Cash
  const tornadoFlag = checkTornadoCash(address, blockchain)
  if (tornadoFlag) {
    flags.push(tornadoFlag)
  }

  // Check other mixers
  const mixerFlag = checkOtherMixers(address)
  if (mixerFlag) {
    flags.push(mixerFlag)
  }

  // Calculate risk score based on flags
  const riskScore = calculateRiskScore(flags)

  return {
    address,
    blockchain,
    screenedAt: new Date(),
    flags,
    isSanctioned: flags.some(f => f.category === 'SANCTIONS'),
    isMixerRelated: flags.some(f => f.category === 'MIXER'),
    isPrivacyCoinRelated: false, // Address screening doesn't detect privacy coins
    riskScore,
  }
}

/**
 * Screen a transaction for risks (including counterparties and assets)
 */
export function screenTransaction(
  txHash: string,
  fromAddress: string | undefined,
  toAddress: string | undefined,
  asset: string,
  blockchain: Blockchain
): TransactionScreeningResult {
  const flags: ScreeningFlag[] = []

  // Screen from address
  if (fromAddress) {
    const fromSanction = checkOFACSanctions(fromAddress)
    if (fromSanction) {
      fromSanction.title = `Sender: ${fromSanction.title}`
      flags.push(fromSanction)
    }

    const fromTornado = checkTornadoCash(fromAddress, blockchain)
    if (fromTornado) {
      fromTornado.title = `Sender: ${fromTornado.title}`
      flags.push(fromTornado)
    }

    const fromMixer = checkOtherMixers(fromAddress)
    if (fromMixer) {
      fromMixer.title = `Sender: ${fromMixer.title}`
      flags.push(fromMixer)
    }
  }

  // Screen to address
  if (toAddress) {
    const toSanction = checkOFACSanctions(toAddress)
    if (toSanction) {
      toSanction.title = `Recipient: ${toSanction.title}`
      flags.push(toSanction)
    }

    const toTornado = checkTornadoCash(toAddress, blockchain)
    if (toTornado) {
      toTornado.title = `Recipient: ${toTornado.title}`
      flags.push(toTornado)
    }

    const toMixer = checkOtherMixers(toAddress)
    if (toMixer) {
      toMixer.title = `Recipient: ${toMixer.title}`
      flags.push(toMixer)
    }
  }

  // Check privacy coin
  const privacyFlag = checkPrivacyCoin(asset)
  if (privacyFlag) {
    flags.push(privacyFlag)
  }

  return {
    txHash,
    flags,
    fromAddress,
    toAddress,
    asset,
  }
}

/**
 * Calculate a risk score based on screening flags
 */
function calculateRiskScore(flags: ScreeningFlag[]): number {
  if (flags.length === 0) return 0

  const severityScores: Record<FindingSeverity, number> = {
    CRITICAL: 40,
    HIGH: 25,
    MEDIUM: 15,
    LOW: 8,
    INFO: 3,
  }

  let score = 0
  for (const flag of flags) {
    score += severityScores[flag.severity]
  }

  // Cap at 100
  return Math.min(score, 100)
}

/**
 * Batch screen multiple addresses
 */
export function screenAddresses(
  addresses: Array<{ address: string; blockchain: Blockchain }>
): ScreeningResult[] {
  return addresses.map(({ address, blockchain }) => screenAddress(address, blockchain))
}

/**
 * Get severity level description
 */
export function getSeverityDescription(severity: FindingSeverity): string {
  const descriptions: Record<FindingSeverity, string> = {
    CRITICAL: 'Immediate attention required. Potential regulatory violation.',
    HIGH: 'Significant risk requiring review before proceeding.',
    MEDIUM: 'Notable concern that should be documented and monitored.',
    LOW: 'Minor concern for awareness.',
    INFO: 'Informational finding for completeness.',
  }
  return descriptions[severity]
}

/**
 * Get category description
 */
export function getCategoryDescription(category: FindingCategory): string {
  const descriptions: Record<FindingCategory, string> = {
    SANCTIONS: 'OFAC or international sanctions compliance',
    MIXER: 'Cryptocurrency mixing or tumbling services',
    SOURCE: 'Source of funds concerns',
    JURISDICTION: 'High-risk jurisdiction exposure',
    BEHAVIOR: 'Suspicious transaction patterns',
    PRIVACY: 'Privacy-enhancing technologies',
    MARKET: 'Illicit market exposure',
    OTHER: 'Other risk factors',
  }
  return descriptions[category]
}
