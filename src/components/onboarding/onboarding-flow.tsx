'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped'

interface OnboardingStep {
  id: string
  title: string
  description: string
  status: StepStatus
  completedAt?: Date
  completedBy?: string
  blockedReason?: string
  progress?: number // 0-100 for in_progress steps
  tasks?: {
    id: string
    label: string
    completed: boolean
  }[]
}

interface OnboardingFlowProps {
  clientName: string
  clientId: string
  steps: OnboardingStep[]
  currentStep: number
  startedAt: Date
  estimatedCompletion?: Date
  onStepClick?: (step: OnboardingStep, index: number) => void
  onTaskToggle?: (stepId: string, taskId: string) => void
}

// Step status configuration
const stepStatusConfig: Record<StepStatus, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending: {
    color: 'text-void-500',
    bg: 'bg-void-800',
    border: 'border-void-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  in_progress: {
    color: 'text-neon-400',
    bg: 'bg-neon-500/10',
    border: 'border-neon-500/50',
    icon: (
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  completed: {
    color: 'text-profit-400',
    bg: 'bg-profit-500/10',
    border: 'border-profit-500/50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  blocked: {
    color: 'text-risk-400',
    bg: 'bg-risk-500/10',
    border: 'border-risk-500/50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  skipped: {
    color: 'text-void-500',
    bg: 'bg-void-800/50',
    border: 'border-void-700/50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
      </svg>
    ),
  },
}

// Progress bar component
function ProgressBar({ steps }: { steps: OnboardingStep[] }) {
  const completed = steps.filter(s => s.status === 'completed').length
  const total = steps.length
  const percentage = (completed / total) * 100

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-void-400">Overall Progress</span>
        <span className="text-sm font-mono text-void-300">{completed}/{total} steps</span>
      </div>
      <div className="h-2 bg-void-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-neon-500 to-profit-500"
          style={{
            boxShadow: percentage > 0 ? '0 0 20px rgba(6, 182, 212, 0.5)' : undefined,
          }}
        />
      </div>
    </div>
  )
}

// Step card component
function StepCard({
  step,
  index,
  isExpanded,
  onClick,
  onTaskToggle,
}: {
  step: OnboardingStep
  index: number
  isExpanded: boolean
  onClick: () => void
  onTaskToggle?: (taskId: string) => void
}) {
  const config = stepStatusConfig[step.status]
  const taskCompleted = step.tasks?.filter(t => t.completed).length || 0
  const taskTotal = step.tasks?.length || 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="relative"
    >
      {/* Connector line */}
      {index > 0 && (
        <div className="absolute -top-6 left-6 w-0.5 h-6 bg-void-700" />
      )}

      <button
        onClick={onClick}
        className={`w-full text-left p-4 rounded-xl border transition-all ${config.border} ${
          step.status === 'in_progress' ? 'shadow-glow-sm' : ''
        } ${isExpanded ? 'bg-void-800/50' : 'hover:bg-void-800/30'}`}
      >
        <div className="flex items-start gap-4">
          {/* Step indicator */}
          <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center ${config.bg} ${config.color}`}>
            {step.status === 'in_progress' && step.progress !== undefined ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-void-700" />
                  <motion.circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${step.progress * 1.26} 126`}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: 126 }}
                    animate={{ strokeDashoffset: 126 - step.progress * 1.26 }}
                    className="text-neon-400"
                  />
                </svg>
                <span className="text-xs font-mono font-bold">{step.progress}%</span>
              </div>
            ) : (
              config.icon
            )}
            {/* Step number badge */}
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-void-900 border border-void-700 flex items-center justify-center text-2xs font-mono text-void-400">
              {index + 1}
            </span>
          </div>

          {/* Step content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-lg font-semibold ${
                step.status === 'completed' ? 'text-void-300' :
                step.status === 'in_progress' ? 'text-void-100' :
                step.status === 'blocked' ? 'text-risk-400' :
                'text-void-400'
              }`}>
                {step.title}
              </span>
              {step.status === 'blocked' && (
                <span className="px-2 py-0.5 rounded text-2xs bg-risk-500/10 text-risk-400 border border-risk-500/30">
                  Blocked
                </span>
              )}
            </div>
            <p className="text-sm text-void-500">{step.description}</p>

            {/* Task progress */}
            {step.tasks && step.tasks.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-void-800 rounded-full overflow-hidden max-w-32">
                  <div
                    className={`h-full rounded-full transition-all ${
                      taskCompleted === taskTotal ? 'bg-profit-500' : 'bg-neon-500'
                    }`}
                    style={{ width: `${(taskCompleted / taskTotal) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-void-500 font-mono">
                  {taskCompleted}/{taskTotal} tasks
                </span>
              </div>
            )}

            {/* Completed info */}
            {step.status === 'completed' && step.completedAt && (
              <p className="mt-2 text-xs text-void-500">
                Completed {format(step.completedAt, 'MMM d, yyyy')}
                {step.completedBy && ` by ${step.completedBy}`}
              </p>
            )}

            {/* Blocked reason */}
            {step.status === 'blocked' && step.blockedReason && (
              <p className="mt-2 text-xs text-risk-400">{step.blockedReason}</p>
            )}
          </div>

          {/* Expand indicator */}
          <svg
            className={`w-5 h-5 text-void-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded task list */}
      <AnimatePresence>
        {isExpanded && step.tasks && step.tasks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden ml-16 mt-2"
          >
            <div className="space-y-1 p-3 rounded-lg bg-void-900/50 border border-void-800">
              {step.tasks.map((task) => (
                <label
                  key={task.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-void-800/50 cursor-pointer transition-colors"
                >
                  <div
                    onClick={(e) => {
                      e.preventDefault()
                      onTaskToggle?.(task.id)
                    }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      task.completed
                        ? 'bg-profit-500/20 border-profit-500 text-profit-400'
                        : 'border-void-600 hover:border-void-500'
                    }`}
                  >
                    {task.completed && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${task.completed ? 'text-void-500 line-through' : 'text-void-300'}`}>
                    {task.label}
                  </span>
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Timeline visualization
function StepTimeline({ steps, currentStep }: { steps: OnboardingStep[]; currentStep: number }) {
  return (
    <div className="hidden lg:block">
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-void-800 rounded-full" />

        {/* Progress line */}
        <motion.div
          className="absolute top-6 left-0 h-1 bg-gradient-to-r from-neon-500 to-profit-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 1 }}
          style={{
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.5)',
          }}
        />

        {/* Step dots */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const config = stepStatusConfig[step.status]
            const isActive = index === currentStep
            const isPast = index < currentStep

            return (
              <div key={step.id} className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive
                      ? 'bg-neon-500/20 border-neon-500 text-neon-400 shadow-glow'
                      : isPast
                      ? 'bg-profit-500/20 border-profit-500 text-profit-400'
                      : 'bg-void-900 border-void-700 text-void-500'
                  }`}
                >
                  {step.status === 'completed' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-mono font-bold">{index + 1}</span>
                  )}
                </motion.div>
                <span className={`mt-2 text-xs text-center max-w-20 ${
                  isActive ? 'text-neon-400 font-medium' : 'text-void-500'
                }`}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function OnboardingFlow({
  clientName,
  clientId,
  steps,
  currentStep,
  startedAt,
  estimatedCompletion,
  onStepClick,
  onTaskToggle,
}: OnboardingFlowProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(steps[currentStep]?.id || null)

  const handleStepClick = (step: OnboardingStep, index: number) => {
    setExpandedStep(expandedStep === step.id ? null : step.id)
    onStepClick?.(step, index)
  }

  const completedSteps = steps.filter(s => s.status === 'completed').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-void-500 mb-1">Client Onboarding</p>
            <h1 className="text-2xl font-display font-bold text-void-100">{clientName}</h1>
            <p className="text-sm text-void-400 mt-1">
              Started {format(startedAt, 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-neon-400">{completedSteps}</p>
              <p className="text-xs text-void-500">of {steps.length} complete</p>
            </div>
            {estimatedCompletion && (
              <div className="text-center border-l border-void-700 pl-6">
                <p className="text-sm font-medium text-void-300">
                  {format(estimatedCompletion, 'MMM d')}
                </p>
                <p className="text-xs text-void-500">Est. completion</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Timeline visualization (desktop) */}
      <div className="glass-card p-6">
        <StepTimeline steps={steps} currentStep={currentStep} />
      </div>

      {/* Progress bar */}
      <div className="glass-card p-6">
        <ProgressBar steps={steps} />

        {/* Step list */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              isExpanded={expandedStep === step.id}
              onClick={() => handleStepClick(step, index)}
              onTaskToggle={(taskId) => onTaskToggle?.(step.id, taskId)}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-between"
      >
        <button className="btn-ghost">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Client
        </button>
        <div className="flex items-center gap-3">
          {currentStep < steps.length - 1 && steps[currentStep]?.status === 'in_progress' && (
            <button className="btn-primary">
              Complete Step
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}
          {completedSteps === steps.length && (
            <button className="px-6 py-2.5 rounded-lg bg-profit-500 text-void-950 font-semibold hover:bg-profit-400 transition-all shadow-glow-profit">
              <svg className="w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Finalize Onboarding
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// Compact version for dashboard/cards
export function OnboardingProgress({
  clientName,
  completedSteps,
  totalSteps,
  currentStepName,
}: {
  clientName: string
  completedSteps: number
  totalSteps: number
  currentStepName: string
}) {
  const percentage = (completedSteps / totalSteps) * 100

  return (
    <div className="data-panel">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-void-200">{clientName}</span>
        <span className="text-xs font-mono text-void-400">{completedSteps}/{totalSteps}</span>
      </div>
      <div className="h-1.5 bg-void-800 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon-500 to-profit-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-void-500">
        Current: <span className="text-void-400">{currentStepName}</span>
      </p>
    </div>
  )
}
