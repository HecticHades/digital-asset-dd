'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'

interface Finding {
  id: string
  title: string
  description: string | null
  severity: string
  category: string
  isResolved: boolean
  resolution: string | null
  createdAt: string
  resolvedAt: string | null
}

interface ChecklistItem {
  id: string
  title: string
  description: string | null
  isRequired: boolean
  isCompleted: boolean
  notes: string | null
  completedAt: string | null
}

interface Report {
  id: string
  version: number
  filename: string
  isLocked: boolean
  createdAt: string
}

interface Client {
  id: string
  name: string
  email: string | null
}

interface CaseData {
  id: string
  title: string
  description: string | null
  status: string
  riskScore: number | null
  riskLevel: string
  dueDate: string | null
  createdAt: string
  updatedAt: string
  reviewedAt: string | null
  reviewNotes: string | null
  client: Client
  findings: Finding[]
  checklistItems: ChecklistItem[]
  reports: Report[]
  assignedTo: { id: string; name: string; email: string } | null
  reviewedBy: { id: string; name: string; email: string } | null
}

interface TimelineEvent {
  date: string
  title: string
  description: string
  type: string
}

interface CaseTabsProps {
  caseData: CaseData
  timeline: TimelineEvent[]
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800'
    case 'LOW':
      return 'bg-blue-100 text-blue-800'
    case 'INFO':
      return 'bg-slate-100 text-slate-800'
    default:
      return 'bg-slate-100 text-slate-800'
  }
}

function getTimelineIcon(type: string) {
  switch (type) {
    case 'created':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      )
    case 'assigned':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )
    case 'approved':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )
    case 'rejected':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
  }
}

export function CaseTabs({ caseData, timeline }: CaseTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="findings">Findings ({caseData.findings.length})</TabsTrigger>
        <TabsTrigger value="checklist">Checklist</TabsTrigger>
        <TabsTrigger value="reports">Reports ({caseData.reports.length})</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-slate-500">Description</dt>
                <dd className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">
                  {caseData.description || 'No description provided'}
                </dd>
              </div>
              {caseData.reviewNotes && (
                <div>
                  <dt className="text-sm font-medium text-slate-500">Review Notes</dt>
                  <dd className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">
                    {caseData.reviewNotes}
                  </dd>
                </div>
              )}
              <div className="pt-4 border-t border-slate-200">
                <dt className="text-sm font-medium text-slate-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {format(new Date(caseData.updatedAt), 'PPpp')}
                </dd>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-slate-500">Name</dt>
                <dd className="mt-1 text-sm text-slate-900">{caseData.client.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Email</dt>
                <dd className="mt-1 text-sm text-slate-900">{caseData.client.email || '-'}</dd>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="findings">
        {caseData.findings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-slate-900">No findings yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Findings will appear here as the case is analyzed.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caseData.findings.map((finding) => (
                  <TableRow key={finding.id}>
                    <TableCell className="font-medium">{finding.title}</TableCell>
                    <TableCell>
                      <Badge variant="default">{finding.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getSeverityColor(finding.severity)}`}>
                        {finding.severity}
                      </span>
                    </TableCell>
                    <TableCell>
                      {finding.isResolved ? (
                        <Badge variant="success">Resolved</Badge>
                      ) : (
                        <Badge variant="warning">Open</Badge>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(finding.createdAt), 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="checklist">
        {caseData.checklistItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-slate-900">No checklist items</h3>
            <p className="mt-2 text-sm text-slate-500">
              Checklist items will be added when compliance review begins.
            </p>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-4">
                {caseData.checklistItems.map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 mt-0.5 ${item.isCompleted ? 'text-green-600' : 'text-slate-300'}`}>
                      {item.isCompleted ? (
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth={2} />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${item.isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                          {item.title}
                        </span>
                        {item.isRequired && (
                          <Badge variant="default">Required</Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                      )}
                      {item.completedAt && (
                        <p className="mt-1 text-xs text-slate-400">
                          Completed on {format(new Date(item.completedAt), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="reports">
        {caseData.reports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-slate-900">No reports generated</h3>
            <p className="mt-2 text-sm text-slate-500">
              Reports will appear here once they are generated.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caseData.reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">v{report.version}</TableCell>
                    <TableCell>{report.filename}</TableCell>
                    <TableCell>
                      {report.isLocked ? (
                        <Badge variant="success">Final</Badge>
                      ) : (
                        <Badge variant="default">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(report.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        Download
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="timeline">
        <Card>
          <CardContent className="pt-6">
            <div className="flow-root">
              <ul className="-mb-8">
                {timeline.map((event, eventIdx) => (
                  <li key={eventIdx}>
                    <div className="relative pb-8">
                      {eventIdx !== timeline.length - 1 && (
                        <span
                          className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        {getTimelineIcon(event.type)}
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{event.title}</p>
                            <p className="text-sm text-slate-500">{event.description}</p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-slate-500">
                            {format(new Date(event.date), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
