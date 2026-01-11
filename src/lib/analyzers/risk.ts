/**
 * Risk Scoring System
 *
 * Calculates overall risk score (0-100) based on 7 risk categories:
 * 1. Sanctions - OFAC/sanctioned address interaction
 * 2. Mixer - Tornado Cash, tumbler usage
 * 3. Source - Large unexplained deposits
 * 4. Jurisdiction - High-risk country transactions
 * 5. Behavior - Layering, rapid movements
 * 6. Privacy - Privacy coins, cross-chain bridges
 * 7. Market - Darknet, wash trading
 */

import { FindingCategory, FindingSeverity, RiskLevel } from '@prisma/client'

// ============================================
// Types
// ============================================

export interface RiskCategoryScore {
  category: RiskCategory
  score: number // 0-100
  weight: number // Weight multiplier
  findings: number // Number of findings in this category
  description: string
}

export interface RiskBreakdown {
  overallScore: number // 0-100
  riskLevel: RiskLevel
  categories: RiskCategoryScore[]
  totalFindings: number
  criticalFindings: number
  highFindings: number
  mediumFindings: number
  lowFindings: number
  infoFindings: number
}

export type RiskCategory =
  | 'SANCTIONS'
  | 'MIXER'
  | 'SOURCE'
  | 'JURISDICTION'
  | 'BEHAVIOR'
  | 'PRIVACY'
  | 'MARKET'

export interface FindingInput {
  category: FindingCategory
  severity: FindingSeverity
  isResolved: boolean
}

// ============================================
// Constants
// ============================================

/**
 * Category weights determine the relative importance of each risk category
 * in the overall score calculation. Higher weights = more impact on final score.
 */
export const CATEGORY_WEIGHTS: Record<RiskCategory, number> = {
  SANCTIONS: 1.5,    // Highest weight - regulatory/legal risk
  MIXER: 1.3,        // High weight - money laundering indicator
  SOURCE: 1.2,       // High weight - unexplained wealth
  JURISDICTION: 1.0, // Standard weight
  BEHAVIOR: 1.1,     // Slightly elevated - patterns matter
  PRIVACY: 1.0,      // Standard weight
  MARKET: 0.9,       // Slightly lower - less direct compliance risk
}

/**
 * Category descriptions for UI display
 */
export const CATEGORY_DESCRIPTIONS: Record<RiskCategory, string> = {
  SANCTIONS: 'Interactions with OFAC sanctioned addresses or entities',
  MIXER: 'Use of Tornado Cash, tumblers, or mixing services',
  SOURCE: 'Large unexplained deposits or unclear source of funds',
  JURISDICTION: 'Transactions involving high-risk jurisdictions',
  BEHAVIOR: 'Suspicious patterns like layering or rapid movements',
  PRIVACY: 'Privacy coin usage or cross-chain bridge activity',
  MARKET: 'Darknet market exposure or wash trading patterns',
}

/**
 * Severity score multipliers
 * These determine how much each finding severity contributes to the category score
 */
export const SEVERITY_SCORES: Record<FindingSeverity, number> = {
  CRITICAL: 40,
  HIGH: 25,
  MEDIUM: 15,
  LOW: 8,
  INFO: 3,
}

/**
 * Maximum points per category before weight is applied
 * This caps the raw score to prevent runaway scores from many findings
 */
export const MAX_CATEGORY_SCORE = 100

// ============================================
// Risk Calculation Functions
// ============================================

/**
 * Calculate the risk score for a single category based on its findings
 */
function calculateCategoryScore(findings: FindingInput[]): number {
  // Filter to unresolved findings only - resolved findings don't contribute to active risk
  const unresolvedFindings = findings.filter(f => !f.isResolved)

  if (unresolvedFindings.length === 0) {
    return 0
  }

  // Sum up severity scores for all unresolved findings
  const rawScore = unresolvedFindings.reduce((total, finding) => {
    return total + SEVERITY_SCORES[finding.severity]
  }, 0)

  // Cap at maximum category score
  return Math.min(rawScore, MAX_CATEGORY_SCORE)
}

/**
 * Group findings by category
 */
function groupFindingsByCategory(findings: FindingInput[]): Record<RiskCategory, FindingInput[]> {
  const groups: Record<RiskCategory, FindingInput[]> = {
    SANCTIONS: [],
    MIXER: [],
    SOURCE: [],
    JURISDICTION: [],
    BEHAVIOR: [],
    PRIVACY: [],
    MARKET: [],
  }

  for (const finding of findings) {
    // Map FindingCategory enum to our RiskCategory
    // FindingCategory includes all our risk categories plus 'OTHER'
    if (finding.category in groups) {
      groups[finding.category as RiskCategory].push(finding)
    }
    // 'OTHER' category findings are not included in risk scoring
  }

  return groups
}

/**
 * Count findings by severity
 */
function countFindingsBySeverity(findings: FindingInput[]): {
  critical: number
  high: number
  medium: number
  low: number
  info: number
} {
  const unresolvedFindings = findings.filter(f => !f.isResolved)

  return {
    critical: unresolvedFindings.filter(f => f.severity === 'CRITICAL').length,
    high: unresolvedFindings.filter(f => f.severity === 'HIGH').length,
    medium: unresolvedFindings.filter(f => f.severity === 'MEDIUM').length,
    low: unresolvedFindings.filter(f => f.severity === 'LOW').length,
    info: unresolvedFindings.filter(f => f.severity === 'INFO').length,
  }
}

/**
 * Convert numeric score to RiskLevel enum
 */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'CRITICAL'
  if (score >= 50) return 'HIGH'
  if (score >= 25) return 'MEDIUM'
  if (score > 0) return 'LOW'
  return 'UNASSESSED'
}

/**
 * Calculate complete risk breakdown for a set of findings
 *
 * @param findings - Array of finding objects with category, severity, and resolution status
 * @returns Complete risk breakdown with overall score, category scores, and statistics
 */
export function calculateRiskBreakdown(findings: FindingInput[]): RiskBreakdown {
  // Group findings by category
  const findingsByCategory = groupFindingsByCategory(findings)

  // Calculate score for each category
  const categoryScores: RiskCategoryScore[] = (Object.keys(CATEGORY_WEIGHTS) as RiskCategory[]).map(category => {
    const categoryFindings = findingsByCategory[category]
    const rawScore = calculateCategoryScore(categoryFindings)

    return {
      category,
      score: rawScore,
      weight: CATEGORY_WEIGHTS[category],
      findings: categoryFindings.filter(f => !f.isResolved).length,
      description: CATEGORY_DESCRIPTIONS[category],
    }
  })

  // Calculate weighted overall score
  const totalWeight = categoryScores.reduce((sum, cs) => sum + cs.weight, 0)
  const weightedSum = categoryScores.reduce((sum, cs) => sum + (cs.score * cs.weight), 0)

  // Normalize to 0-100 scale
  // Max possible weighted sum is MAX_CATEGORY_SCORE * totalWeight
  const maxWeightedSum = MAX_CATEGORY_SCORE * totalWeight
  const overallScore = maxWeightedSum > 0 ? Math.round((weightedSum / maxWeightedSum) * 100) : 0

  // Count findings by severity
  const severityCounts = countFindingsBySeverity(findings)

  return {
    overallScore,
    riskLevel: scoreToRiskLevel(overallScore),
    categories: categoryScores,
    totalFindings: findings.filter(f => !f.isResolved).length,
    criticalFindings: severityCounts.critical,
    highFindings: severityCounts.high,
    mediumFindings: severityCounts.medium,
    lowFindings: severityCounts.low,
    infoFindings: severityCounts.info,
  }
}

/**
 * Calculate just the overall risk score (convenience function)
 */
export function calculateRiskScore(findings: FindingInput[]): number {
  return calculateRiskBreakdown(findings).overallScore
}

/**
 * Get a color class for a risk score (for UI display)
 */
export function getRiskScoreColor(score: number): string {
  if (score >= 75) return 'text-red-600'
  if (score >= 50) return 'text-orange-600'
  if (score >= 25) return 'text-yellow-600'
  if (score > 0) return 'text-blue-600'
  return 'text-slate-400'
}

/**
 * Get a background color class for a risk score (for UI display)
 */
export function getRiskScoreBgColor(score: number): string {
  if (score >= 75) return 'bg-red-100'
  if (score >= 50) return 'bg-orange-100'
  if (score >= 25) return 'bg-yellow-100'
  if (score > 0) return 'bg-blue-100'
  return 'bg-slate-100'
}

/**
 * Get the bar color for category chart display
 */
export function getCategoryBarColor(score: number): string {
  if (score >= 75) return 'bg-red-500'
  if (score >= 50) return 'bg-orange-500'
  if (score >= 25) return 'bg-yellow-500'
  if (score > 0) return 'bg-blue-500'
  return 'bg-slate-200'
}

/**
 * Format category name for display
 */
export function formatCategoryName(category: RiskCategory): string {
  const names: Record<RiskCategory, string> = {
    SANCTIONS: 'Sanctions',
    MIXER: 'Mixer',
    SOURCE: 'Source of Funds',
    JURISDICTION: 'Jurisdiction',
    BEHAVIOR: 'Behavior',
    PRIVACY: 'Privacy',
    MARKET: 'Market',
  }
  return names[category]
}
