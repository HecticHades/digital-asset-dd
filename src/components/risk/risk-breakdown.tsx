'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  RiskBreakdown as RiskBreakdownType,
  RiskCategoryScore,
  formatCategoryName,
  getCategoryBarColor,
  getRiskScoreColor,
  getRiskScoreBgColor,
} from '@/lib/analyzers/risk'

interface RiskBreakdownProps {
  breakdown: RiskBreakdownType
}

/**
 * Visual chart showing risk score breakdown by category
 */
export function RiskBreakdown({ breakdown }: RiskBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Risk Assessment</span>
          <div className={`flex items-center gap-2 ${getRiskScoreColor(breakdown.overallScore)}`}>
            <span className="text-2xl font-bold">{breakdown.overallScore}</span>
            <span className="text-sm font-normal text-slate-500">/ 100</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Score Gauge */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-600">Overall Risk Score</span>
            <span className={`font-medium ${getRiskScoreColor(breakdown.overallScore)}`}>
              {breakdown.riskLevel}
            </span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getRiskScoreBgColor(breakdown.overallScore).replace('bg-', 'bg-').replace('-100', '-500')}`}
              style={{ width: `${breakdown.overallScore}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
            <span>Critical</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-700">Risk Categories</h4>
          {breakdown.categories.map((category) => (
            <CategoryBar key={category.category} category={category} />
          ))}
        </div>

        {/* Findings Summary */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Findings Summary</h4>
          <div className="grid grid-cols-5 gap-2 text-center">
            <FindingStat
              count={breakdown.criticalFindings}
              label="Critical"
              color="text-red-600 bg-red-50"
            />
            <FindingStat
              count={breakdown.highFindings}
              label="High"
              color="text-orange-600 bg-orange-50"
            />
            <FindingStat
              count={breakdown.mediumFindings}
              label="Medium"
              color="text-yellow-600 bg-yellow-50"
            />
            <FindingStat
              count={breakdown.lowFindings}
              label="Low"
              color="text-blue-600 bg-blue-50"
            />
            <FindingStat
              count={breakdown.infoFindings}
              label="Info"
              color="text-slate-600 bg-slate-50"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface CategoryBarProps {
  category: RiskCategoryScore
}

function CategoryBar({ category }: CategoryBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">
            {formatCategoryName(category.category)}
          </span>
          {category.findings > 0 && (
            <span className="text-xs text-slate-500">
              ({category.findings} finding{category.findings !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        <span className={`font-medium ${getRiskScoreColor(category.score)}`}>
          {category.score}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getCategoryBarColor(category.score)}`}
          style={{ width: `${category.score}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1">{category.description}</p>
    </div>
  )
}

interface FindingStatProps {
  count: number
  label: string
  color: string
}

function FindingStat({ count, label, color }: FindingStatProps) {
  return (
    <div className={`rounded-lg p-2 ${color.split(' ')[1]}`}>
      <div className={`text-lg font-bold ${color.split(' ')[0]}`}>{count}</div>
      <div className="text-xs text-slate-600">{label}</div>
    </div>
  )
}

/**
 * Compact version of risk breakdown for display in cards/summaries
 */
export function RiskScoreGauge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-24 h-24 text-2xl',
  }

  const circumference = 2 * Math.PI * 45 // radius of 45 for 100x100 viewBox
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-100"
        />
        {/* Score arc */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={getRiskScoreColor(score).replace('text-', 'text-')}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-bold ${getRiskScoreColor(score)}`}>
        {score}
      </div>
    </div>
  )
}

/**
 * Mini risk category indicator for inline display
 */
export function RiskCategoryIndicator({
  categories,
}: {
  categories: RiskCategoryScore[]
}) {
  // Only show categories with non-zero scores
  const activeCategories = categories.filter(c => c.score > 0)

  if (activeCategories.length === 0) {
    return <span className="text-sm text-slate-400">No risk flags</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {activeCategories.map((category) => (
        <span
          key={category.category}
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${getRiskScoreBgColor(category.score)} ${getRiskScoreColor(category.score)}`}
          title={`${formatCategoryName(category.category)}: ${category.score}/100`}
        >
          {formatCategoryName(category.category)}
        </span>
      ))}
    </div>
  )
}
