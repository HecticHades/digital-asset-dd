'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, StatusBadge, RiskBadge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Modal, ModalContent } from '@/components/ui/modal'
import { format, formatDistanceToNow } from 'date-fns'
import { assignCase, bulkAssignCases, type AnalystWorkload, type TeamProgress } from './actions'
import { CaseStatus, RiskLevel } from '@prisma/client'
import { cn } from '@/lib/utils'

interface SerializedCase {
  id: string
  title: string
  clientName: string
  status: CaseStatus
  riskLevel: RiskLevel | null
  riskScore: number | null
  dueDate: string | null
  createdAt: string
  assignedTo: { id: string; name: string } | null
  isOverdue: boolean
  isDueSoon: boolean
}

interface ManagerDashboardProps {
  workload: AnalystWorkload[]
  progress: TeamProgress | null
  cases: SerializedCase[]
  overdueCases: SerializedCase[]
  analysts: { id: string; name: string; activeCases: number }[]
}

export function ManagerDashboard({
  workload,
  progress,
  cases,
  overdueCases,
  analysts,
}: ManagerDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('workload')
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set())
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedCaseForAssign, setSelectedCaseForAssign] = useState<SerializedCase | null>(null)
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)

  // Filter states for cases
  const [caseFilter, setCaseFilter] = useState<'all' | 'unassigned' | 'overdue' | 'dueSoon'>('all')

  const filteredCases = cases.filter(c => {
    if (caseFilter === 'unassigned') return !c.assignedTo
    if (caseFilter === 'overdue') return c.isOverdue
    if (caseFilter === 'dueSoon') return c.isDueSoon
    return true
  })

  const handleAssignCase = async (caseId: string, analystId: string | null) => {
    setIsAssigning(true)
    try {
      const result = await assignCase(caseId, analystId)
      if (result.success) {
        router.refresh()
        setAssignModalOpen(false)
        setSelectedCaseForAssign(null)
      }
    } finally {
      setIsAssigning(false)
    }
  }

  const handleBulkAssign = async (analystId: string) => {
    if (selectedCases.size === 0) return

    setIsAssigning(true)
    try {
      const result = await bulkAssignCases(Array.from(selectedCases), analystId)
      if (result.success) {
        router.refresh()
        setBulkAssignModalOpen(false)
        setSelectedCases(new Set())
      }
    } finally {
      setIsAssigning(false)
    }
  }

  const toggleCaseSelection = (caseId: string) => {
    const newSelection = new Set(selectedCases)
    if (newSelection.has(caseId)) {
      newSelection.delete(caseId)
    } else {
      newSelection.add(caseId)
    }
    setSelectedCases(newSelection)
  }

  const selectAllCases = () => {
    if (selectedCases.size === filteredCases.length) {
      setSelectedCases(new Set())
    } else {
      setSelectedCases(new Set(filteredCases.map(c => c.id)))
    }
  }

  return (
    <div className="space-y-6">
      {/* Custom Tabs */}
      <div className="inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('workload')}
          className={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
            activeTab === 'workload'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          Team Workload
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cases')}
          className={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
            activeTab === 'cases'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          Case Assignment
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
            activeTab === 'overdue'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          Overdue Alerts
          {overdueCases.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
              {overdueCases.length}
            </span>
          )}
        </button>
      </div>

      {/* Team Workload Tab */}
      {activeTab === 'workload' && (
        <div className="grid gap-6 mt-4">
          {/* Progress Summary */}
          {progress && progress.avgCompletionDays !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-slate-500">Avg. Completion Time</p>
                    <p className="text-2xl font-bold">{progress.avgCompletionDays} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Completed This Week</p>
                    <p className="text-2xl font-bold text-green-600">{progress.completedThisWeek}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Completed This Month</p>
                    <p className="text-2xl font-bold text-green-600">{progress.completedThisMonth}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Completion Rate</p>
                    <p className="text-2xl font-bold">
                      {progress.totalCases > 0
                        ? Math.round((progress.completedCases / progress.totalCases) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analyst Workload Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workload.map((analyst) => (
              <AnalystCard key={analyst.id} analyst={analyst} />
            ))}

            {workload.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-slate-500">
                  No analysts found in your organization
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Case Assignment Tab */}
      {activeTab === 'cases' && (
        <Card className="mt-4">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Assign Cases</CardTitle>
              <div className="flex items-center gap-3">
                <Select
                  options={[
                    { value: 'all', label: 'All Cases' },
                    { value: 'unassigned', label: 'Unassigned' },
                    { value: 'overdue', label: 'Overdue' },
                    { value: 'dueSoon', label: 'Due Soon' },
                  ]}
                  value={caseFilter}
                  onChange={(e) => setCaseFilter(e.target.value as typeof caseFilter)}
                />
                {selectedCases.size > 0 && (
                  <Button onClick={() => setBulkAssignModalOpen(true)}>
                    Assign {selectedCases.size} Selected
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCases.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                No cases match the current filter
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedCases.size === filteredCases.length && filteredCases.length > 0}
                        onChange={selectAllCases}
                        className="rounded border-slate-300"
                      />
                    </TableHead>
                    <TableHead>Case</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((caseItem) => (
                    <TableRow
                      key={caseItem.id}
                      className={caseItem.isOverdue ? 'bg-red-50' : caseItem.isDueSoon ? 'bg-yellow-50' : ''}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedCases.has(caseItem.id)}
                          onChange={() => toggleCaseSelection(caseItem.id)}
                          className="rounded border-slate-300"
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/cases/${caseItem.id}`} className="font-medium text-primary-600 hover:text-primary-700">
                          {caseItem.title}
                        </Link>
                      </TableCell>
                      <TableCell>{caseItem.clientName}</TableCell>
                      <TableCell>
                        <StatusBadge status={caseItem.status} />
                      </TableCell>
                      <TableCell>
                        {caseItem.riskLevel && <RiskBadge level={caseItem.riskLevel} />}
                      </TableCell>
                      <TableCell>
                        {caseItem.dueDate ? (
                          <span className={caseItem.isOverdue ? 'text-red-600 font-medium' : caseItem.isDueSoon ? 'text-yellow-600' : ''}>
                            {format(new Date(caseItem.dueDate), 'MMM d, yyyy')}
                            {caseItem.isOverdue && (
                              <span className="block text-xs">
                                {formatDistanceToNow(new Date(caseItem.dueDate))} overdue
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {caseItem.assignedTo ? (
                          <span className="text-sm">{caseItem.assignedTo.name}</span>
                        ) : (
                          <Badge variant="warning">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCaseForAssign(caseItem)
                            setAssignModalOpen(true)
                          }}
                        >
                          {caseItem.assignedTo ? 'Reassign' : 'Assign'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overdue Alerts Tab */}
      {activeTab === 'overdue' && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Overdue Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueCases.length === 0 ? (
              <div className="py-8 text-center text-green-600">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">No overdue cases!</p>
                <p className="text-sm text-slate-500">All cases are on track.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {overdueCases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/cases/${caseItem.id}`} className="font-medium text-slate-900 hover:text-primary-600">
                          {caseItem.title}
                        </Link>
                        {caseItem.riskLevel && <RiskBadge level={caseItem.riskLevel} />}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        Client: {caseItem.clientName}
                        {caseItem.assignedTo && ` | Assigned to: ${caseItem.assignedTo.name}`}
                      </div>
                      <div className="text-sm text-red-600 font-medium mt-1">
                        Due: {caseItem.dueDate && format(new Date(caseItem.dueDate), 'MMM d, yyyy')}
                        {' '}&mdash;{' '}
                        {caseItem.dueDate && formatDistanceToNow(new Date(caseItem.dueDate))} overdue
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCaseForAssign(caseItem)
                          setAssignModalOpen(true)
                        }}
                      >
                        {caseItem.assignedTo ? 'Reassign' : 'Assign'}
                      </Button>
                      <Link href={`/cases/${caseItem.id}`}>
                        <Button size="sm">View Case</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Single Case Assign Modal */}
      <Modal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="Assign Case">
        <ModalContent>
          {selectedCaseForAssign && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedCaseForAssign.title}</p>
                <p className="text-sm text-slate-600">Client: {selectedCaseForAssign.clientName}</p>
                {selectedCaseForAssign.assignedTo && (
                  <p className="text-sm text-slate-500">Currently assigned to: {selectedCaseForAssign.assignedTo.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Analyst
                </label>
                <div className="space-y-2">
                  {analysts.map((analyst) => (
                    <button
                      key={analyst.id}
                      onClick={() => handleAssignCase(selectedCaseForAssign.id, analyst.id)}
                      disabled={isAssigning}
                      className="w-full flex items-center justify-between p-3 border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50"
                    >
                      <span className="font-medium">{analyst.name}</span>
                      <span className="text-sm text-slate-500">{analyst.activeCases} active cases</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedCaseForAssign.assignedTo && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleAssignCase(selectedCaseForAssign.id, null)}
                  disabled={isAssigning}
                >
                  Unassign Case
                </Button>
              )}
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Bulk Assign Modal */}
      <Modal isOpen={bulkAssignModalOpen} onClose={() => setBulkAssignModalOpen(false)} title="Bulk Assign Cases">
        <ModalContent>
          <div className="space-y-4">
            <p className="text-slate-600">
              Assign {selectedCases.size} selected cases to an analyst:
            </p>

            <div className="space-y-2">
              {analysts.map((analyst) => (
                <button
                  key={analyst.id}
                  onClick={() => handleBulkAssign(analyst.id)}
                  disabled={isAssigning}
                  className="w-full flex items-center justify-between p-3 border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50"
                >
                  <span className="font-medium">{analyst.name}</span>
                  <span className="text-sm text-slate-500">{analyst.activeCases} active cases</span>
                </button>
              ))}
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  )
}

function AnalystCard({ analyst }: { analyst: AnalystWorkload }) {
  const hasOverdue = analyst.overdueCases > 0

  return (
    <Card className={hasOverdue ? 'border-red-200' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{analyst.name}</CardTitle>
          {hasOverdue && (
            <Badge variant="error">{analyst.overdueCases} overdue</Badge>
          )}
        </div>
        <p className="text-sm text-slate-500">{analyst.email}</p>
      </CardHeader>
      <CardContent>
        {/* Case counts */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-xl font-bold text-blue-700">{analyst.activeCases}</p>
            <p className="text-xs text-blue-600">Active</p>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <p className="text-xl font-bold text-yellow-700">{analyst.pendingReview}</p>
            <p className="text-xs text-yellow-600">Pending Review</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-xl font-bold text-green-700">{analyst.completedCases}</p>
            <p className="text-xs text-green-600">Completed</p>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded">
            <p className="text-xl font-bold text-slate-700">{analyst.totalCases}</p>
            <p className="text-xs text-slate-600">Total</p>
          </div>
        </div>

        {/* Average duration */}
        {analyst.avgCaseDurationDays !== null && (
          <div className="text-sm text-slate-600 mb-3">
            Avg. completion: <span className="font-medium">{analyst.avgCaseDurationDays} days</span>
          </div>
        )}

        {/* Risk breakdown */}
        {analyst.casesByRiskLevel.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {analyst.casesByRiskLevel.map(({ riskLevel, count }) => (
              <div key={riskLevel} className="flex items-center gap-1">
                <RiskBadge level={riskLevel} />
                <span className="text-xs text-slate-500">({count})</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
