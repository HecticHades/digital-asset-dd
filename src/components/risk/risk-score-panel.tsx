'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface RiskCategory {
  id: string
  name: string
  score: number // 0-100
  weight: number // percentage weight in total
  findings: number
  description: string
  status: 'clear' | 'low' | 'medium' | 'high' | 'critical'
}

interface RiskScorePanelProps {
  overallScore: number // 0-100
  overallRating: 'low' | 'medium' | 'high' | 'critical'
  categories: RiskCategory[]
  lastUpdated?: Date
  onCategoryClick?: (category: RiskCategory) => void
}

// Animated score ring
function ScoreRing({
  score,
  rating,
  size = 200,
}: {
  score: number
  rating: 'low' | 'medium' | 'high' | 'critical'
  size?: number
}) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference

  const ratingColors = {
    low: { stroke: '#34d399', glow: 'rgba(52, 211, 153, 0.5)', text: 'text-profit-400' },
    medium: { stroke: '#fbbf24', glow: 'rgba(251, 191, 36, 0.5)', text: 'text-caution-400' },
    high: { stroke: '#fb7185', glow: 'rgba(251, 113, 133, 0.5)', text: 'text-risk-400' },
    critical: { stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.6)', text: 'text-risk-500' },
  }

  const colors = ratingColors[rating]

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background ring */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-void-800"
        />
      </svg>

      {/* Animated progress ring */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            filter: `drop-shadow(0 0 8px ${colors.glow})`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className={`text-5xl font-display font-bold ${colors.text}`}
        >
          {score}
        </motion.span>
        <span className="text-void-400 text-sm font-medium mt-1">Risk Score</span>
        <span className={`text-xs font-mono uppercase tracking-wider mt-2 px-3 py-1 rounded-full ${
          rating === 'low' ? 'bg-profit-500/10 text-profit-400 border border-profit-500/30' :
          rating === 'medium' ? 'bg-caution-500/10 text-caution-400 border border-caution-500/30' :
          rating === 'high' ? 'bg-risk-500/10 text-risk-400 border border-risk-500/30' :
          'bg-risk-500/20 text-risk-500 border border-risk-500/50'
        }`}>
          {rating}
        </span>
      </div>
    </div>
  )
}

// Individual category bar
function CategoryBar({
  category,
  index,
  onClick,
  isExpanded,
}: {
  category: RiskCategory
  index: number
  onClick?: () => void
  isExpanded: boolean
}) {
  const statusColors = {
    clear: { bar: 'bg-profit-500', text: 'text-profit-400', glow: 'shadow-glow-profit' },
    low: { bar: 'bg-profit-400', text: 'text-profit-400', glow: '' },
    medium: { bar: 'bg-caution-500', text: 'text-caution-400', glow: '' },
    high: { bar: 'bg-risk-400', text: 'text-risk-400', glow: '' },
    critical: { bar: 'bg-risk-500', text: 'text-risk-500', glow: 'shadow-glow-risk' },
  }

  const colors = statusColors[category.status]

  const categoryIcons: Record<string, React.ReactNode> = {
    sanctions: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    mixer: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    source: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    jurisdiction: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    behavior: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    privacy: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    ),
    market: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group"
    >
      <button
        onClick={onClick}
        className="w-full text-left p-3 rounded-lg hover:bg-void-800/50 transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-md bg-void-800 ${colors.text}`}>
              {categoryIcons[category.id] || (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium text-void-200 group-hover:text-void-100 transition-colors">
              {category.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {category.findings > 0 && (
              <span className="text-2xs font-mono px-2 py-0.5 rounded bg-void-800 text-void-400">
                {category.findings} finding{category.findings !== 1 ? 's' : ''}
              </span>
            )}
            <span className={`text-sm font-mono font-semibold ${colors.text}`}>
              {category.score}
            </span>
            <svg
              className={`w-4 h-4 text-void-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-void-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${category.score}%` }}
            transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
            className={`h-full rounded-full ${colors.bar} ${colors.glow}`}
          />
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 pt-3 border-t border-void-800 overflow-hidden"
            >
              <p className="text-sm text-void-400">{category.description}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-void-500">
                <span>Weight: {category.weight}%</span>
                <span>|</span>
                <span className={colors.text}>Status: {category.status.toUpperCase()}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  )
}

// Risk indicator dots
function RiskIndicators({ categories }: { categories: RiskCategory[] }) {
  const statusColors = {
    clear: 'bg-profit-500',
    low: 'bg-profit-400',
    medium: 'bg-caution-500',
    high: 'bg-risk-400',
    critical: 'bg-risk-500 animate-pulse',
  }

  return (
    <div className="flex items-center gap-1">
      {categories.map((cat) => (
        <div
          key={cat.id}
          className={`w-2 h-2 rounded-full ${statusColors[cat.status]}`}
          title={`${cat.name}: ${cat.status}`}
        />
      ))}
    </div>
  )
}

export function RiskScorePanel({
  overallScore,
  overallRating,
  categories,
  lastUpdated,
  onCategoryClick,
}: RiskScorePanelProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const handleCategoryClick = (category: RiskCategory) => {
    setExpandedCategory(expandedCategory === category.id ? null : category.id)
    onCategoryClick?.(category)
  }

  const criticalCount = categories.filter((c) => c.status === 'critical').length
  const highCount = categories.filter((c) => c.status === 'high').length

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-display font-semibold text-void-100">Risk Assessment</h2>
          <p className="text-sm text-void-400 mt-1">
            Composite score across {categories.length} risk categories
          </p>
        </div>
        <RiskIndicators categories={categories} />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Score ring */}
        <div className="flex flex-col items-center justify-center">
          <ScoreRing score={overallScore} rating={overallRating} />

          {/* Alert badges */}
          {(criticalCount > 0 || highCount > 0) && (
            <div className="flex items-center gap-2 mt-6">
              {criticalCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-risk-500/10 text-risk-400 border border-risk-500/30 text-xs font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-risk-500 animate-pulse" />
                  {criticalCount} Critical
                </motion.span>
              )}
              {highCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-caution-500/10 text-caution-400 border border-caution-500/30 text-xs font-medium"
                >
                  {highCount} High
                </motion.span>
              )}
            </div>
          )}

          {lastUpdated && (
            <p className="text-xs text-void-500 font-mono mt-4">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>

        {/* Category breakdown */}
        <div className="space-y-1">
          {categories.map((category, index) => (
            <CategoryBar
              key={category.id}
              category={category}
              index={index}
              onClick={() => handleCategoryClick(category)}
              isExpanded={expandedCategory === category.id}
            />
          ))}
        </div>
      </div>

      {/* Footer legend */}
      <div className="mt-6 pt-4 border-t border-void-800 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 rounded-full bg-profit-500" />
          <span className="text-void-400">Clear/Low (0-25)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 rounded-full bg-caution-500" />
          <span className="text-void-400">Medium (26-50)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 rounded-full bg-risk-400" />
          <span className="text-void-400">High (51-75)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 rounded-full bg-risk-500" />
          <span className="text-void-400">Critical (76-100)</span>
        </div>
      </div>
    </div>
  )
}

// Compact version for dashboard/cards
export function RiskScoreCompact({
  score,
  rating,
  label,
}: {
  score: number
  rating: 'low' | 'medium' | 'high' | 'critical'
  label?: string
}) {
  const ratingConfig = {
    low: { color: 'text-profit-400', bg: 'bg-profit-500', border: 'border-profit-500/30' },
    medium: { color: 'text-caution-400', bg: 'bg-caution-500', border: 'border-caution-500/30' },
    high: { color: 'text-risk-400', bg: 'bg-risk-400', border: 'border-risk-500/30' },
    critical: { color: 'text-risk-500', bg: 'bg-risk-500', border: 'border-risk-500/50' },
  }

  const config = ratingConfig[rating]

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg border ${config.border} bg-void-900/50`}>
      <div className="relative w-10 h-10">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-void-800"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${score} 100`}
            strokeLinecap="round"
            className={config.color}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${config.color}`}>
          {score}
        </span>
      </div>
      <div>
        {label && <p className="text-xs text-void-400">{label}</p>}
        <p className={`text-sm font-semibold uppercase ${config.color}`}>{rating}</p>
      </div>
    </div>
  )
}
