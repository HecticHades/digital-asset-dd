/**
 * PDF Document Components
 *
 * Uses @react-pdf/renderer to create professional PDF reports
 * for digital asset due diligence cases.
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { ReportData } from './template'
import type { FindingSeverity, RiskLevel } from '@prisma/client'
import { format } from 'date-fns'

// ============================================
// Styles
// ============================================

const colors = {
  primary: '#1e40af', // Blue 800
  secondary: '#475569', // Slate 600
  success: '#16a34a', // Green 600
  warning: '#ca8a04', // Yellow 600
  danger: '#dc2626', // Red 600
  muted: '#94a3b8', // Slate 400
  background: '#f8fafc', // Slate 50
  border: '#e2e8f0', // Slate 200
  white: '#ffffff',
  black: '#0f172a', // Slate 900
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: colors.black,
  },
  // Cover Page
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  coverSubtitle: {
    fontSize: 24,
    color: colors.secondary,
    marginBottom: 30,
  },
  coverMeta: {
    marginTop: 40,
    textAlign: 'center',
  },
  coverMetaItem: {
    fontSize: 11,
    color: colors.secondary,
    marginBottom: 5,
  },
  coverRiskBadge: {
    marginTop: 20,
    padding: '8 20',
    borderRadius: 4,
  },
  coverConfidentiality: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    fontSize: 8,
    color: colors.muted,
    textAlign: 'center',
    borderTop: `1 solid ${colors.border}`,
    paddingTop: 10,
  },
  // Headers
  header: {
    borderBottom: `2 solid ${colors.primary}`,
    paddingBottom: 10,
    marginBottom: 20,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: `1 solid ${colors.border}`,
    paddingBottom: 5,
    marginBottom: 15,
    fontSize: 8,
    color: colors.muted,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
    marginTop: 20,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 10,
    marginTop: 15,
  },
  // Content
  paragraph: {
    marginBottom: 10,
    lineHeight: 1.5,
  },
  label: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    marginBottom: 8,
  },
  // Cards/Boxes
  card: {
    backgroundColor: colors.background,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    border: `1 solid ${colors.border}`,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  // Grid layouts
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  col2: {
    width: '50%',
    paddingRight: 10,
  },
  col3: {
    width: '33.33%',
    paddingRight: 10,
  },
  col4: {
    width: '25%',
    paddingRight: 10,
  },
  // Stats
  statCard: {
    backgroundColor: colors.background,
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
    border: `1 solid ${colors.border}`,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 4,
  },
  // Tables
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottom: `1 solid ${colors.border}`,
    padding: '6 8',
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1 solid ${colors.border}`,
    padding: '6 8',
  },
  tableCell: {
    fontSize: 9,
  },
  // Badges
  badge: {
    padding: '3 8',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  badgeCritical: {
    backgroundColor: '#fee2e2',
    color: colors.danger,
  },
  badgeHigh: {
    backgroundColor: '#ffedd5',
    color: '#ea580c',
  },
  badgeMedium: {
    backgroundColor: '#fef9c3',
    color: colors.warning,
  },
  badgeLow: {
    backgroundColor: '#dbeafe',
    color: colors.primary,
  },
  badgeInfo: {
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
  },
  // Risk gauge
  riskGauge: {
    width: '100%',
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    marginTop: 5,
    marginBottom: 5,
  },
  riskGaugeFill: {
    height: 10,
    borderRadius: 5,
  },
  // Chart bars
  chartBar: {
    height: 16,
    marginBottom: 6,
    borderRadius: 2,
  },
  chartLabel: {
    fontSize: 9,
    marginBottom: 2,
  },
  // Lists
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  listBullet: {
    width: 15,
    fontSize: 10,
    color: colors.muted,
  },
  listContent: {
    flex: 1,
  },
  // Findings
  finding: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 4,
    borderLeft: `3 solid ${colors.border}`,
  },
  findingTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  findingDescription: {
    fontSize: 9,
    color: colors.secondary,
    marginBottom: 4,
  },
  findingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: colors.muted,
  },
  // Footer
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: colors.muted,
    borderTop: `1 solid ${colors.border}`,
    paddingTop: 5,
  },
  pageNumber: {
    textAlign: 'right',
  },
  // TOC
  tocEntry: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  tocSection: {
    width: 30,
    fontSize: 10,
    color: colors.muted,
  },
  tocTitle: {
    flex: 1,
    fontSize: 10,
  },
  tocDots: {
    flex: 1,
    borderBottom: `1 dotted ${colors.muted}`,
    marginHorizontal: 5,
  },
  tocSubEntry: {
    marginLeft: 30,
    marginBottom: 4,
  },
})

// ============================================
// Helper Components
// ============================================

function PageHeader({ title, caseRef }: { title: string; caseRef: string }) {
  return (
    <View style={styles.pageHeader} fixed>
      <Text>{title}</Text>
      <Text>Case: {caseRef}</Text>
    </View>
  )
}

function PageFooter({ organizationName }: { organizationName: string }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>{organizationName}</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  )
}

function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  const badgeStyles: Record<FindingSeverity, typeof styles.badgeCritical> = {
    CRITICAL: styles.badgeCritical,
    HIGH: styles.badgeHigh,
    MEDIUM: styles.badgeMedium,
    LOW: styles.badgeLow,
    INFO: styles.badgeInfo,
  }

  return (
    <View style={[styles.badge, badgeStyles[severity]]}>
      <Text>{severity}</Text>
    </View>
  )
}

function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  const getBadgeStyle = () => {
    switch (level) {
      case 'CRITICAL':
        return { backgroundColor: colors.danger, color: colors.white }
      case 'HIGH':
        return { backgroundColor: '#ea580c', color: colors.white }
      case 'MEDIUM':
        return { backgroundColor: colors.warning, color: colors.white }
      case 'LOW':
        return { backgroundColor: colors.success, color: colors.white }
      default:
        return { backgroundColor: colors.muted, color: colors.white }
    }
  }

  return (
    <View style={[styles.coverRiskBadge, getBadgeStyle()]}>
      <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
        {level} RISK{score !== undefined ? ` (${score}/100)` : ''}
      </Text>
    </View>
  )
}

function RiskGauge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 75) return colors.danger
    if (score >= 50) return '#ea580c'
    if (score >= 25) return colors.warning
    return colors.success
  }

  return (
    <View style={styles.riskGauge}>
      <View
        style={[
          styles.riskGaugeFill,
          { width: `${score}%`, backgroundColor: getColor() },
        ]}
      />
    </View>
  )
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function LabelValue({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? 'N/A'}</Text>
    </View>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} style={styles.listItem}>
          <Text style={styles.listBullet}>{'\u2022'}</Text>
          <Text style={styles.listContent}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM d, yyyy')
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ============================================
// Page Components
// ============================================

function CoverPage({ data }: { data: ReportData }) {
  const { coverPage } = data
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.coverPage}>
        <Text style={styles.coverTitle}>{coverPage.title}</Text>
        <Text style={styles.coverSubtitle}>{coverPage.subtitle}</Text>

        <RiskBadge level={coverPage.riskLevel} score={coverPage.riskScore} />

        <View style={styles.coverMeta}>
          <Text style={styles.coverMetaItem}>Case Reference: {coverPage.caseReference}</Text>
          <Text style={styles.coverMetaItem}>Report Date: {formatDate(coverPage.reportDate)}</Text>
          <Text style={styles.coverMetaItem}>Prepared For: {coverPage.preparedFor}</Text>
          <Text style={styles.coverMetaItem}>Prepared By: {coverPage.preparedBy}</Text>
          <Text style={[styles.coverMetaItem, { marginTop: 10, fontWeight: 'bold' }]}>
            Status: {coverPage.status}
          </Text>
        </View>
      </View>

      <View style={styles.coverConfidentiality}>
        <Text>{coverPage.confidentialityNotice}</Text>
      </View>
    </Page>
  )
}

function TableOfContentsPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader title="Table of Contents" caseRef={data.coverPage.caseReference} />
      <Text style={styles.sectionTitle}>Table of Contents</Text>

      {data.tableOfContents.entries.map((entry, idx) => (
        <View key={idx}>
          <View style={styles.tocEntry}>
            <Text style={styles.tocSection}>{entry.section}</Text>
            <Text style={styles.tocTitle}>{entry.title}</Text>
          </View>
          {entry.subsections?.map((sub, subIdx) => (
            <View key={subIdx} style={[styles.tocEntry, styles.tocSubEntry]}>
              <Text style={styles.tocSection}>{sub.section}</Text>
              <Text style={styles.tocTitle}>{sub.title}</Text>
            </View>
          ))}
        </View>
      ))}

      <PageFooter organizationName={data.metadata.organizationName} />
    </Page>
  )
}

function ExecutiveSummaryPage({ data }: { data: ReportData }) {
  const { executiveSummary, coverPage, metadata } = data

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader title="Executive Summary" caseRef={coverPage.caseReference} />
      <Text style={styles.sectionTitle}>1. Executive Summary</Text>

      <Text style={styles.paragraph}>{executiveSummary.overview}</Text>

      {/* Key Metrics */}
      <View style={styles.row}>
        <View style={styles.col4}>
          <StatCard value={formatNumber(executiveSummary.keyMetrics.totalTransactions)} label="Transactions" />
        </View>
        <View style={styles.col4}>
          <StatCard value={executiveSummary.keyMetrics.uniqueExchanges} label="Exchanges" />
        </View>
        <View style={styles.col4}>
          <StatCard value={executiveSummary.keyMetrics.uniqueWallets} label="Wallets" />
        </View>
        <View style={styles.col4}>
          <StatCard value={`${executiveSummary.documentCompleteness.percentage}%`} label="Docs Complete" />
        </View>
      </View>

      {/* Risk Score */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overall Risk Assessment</Text>
        <View style={styles.row}>
          <View style={styles.col2}>
            <Text style={styles.label}>Risk Score</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary }}>
              {coverPage.riskScore}/100
            </Text>
            <RiskGauge score={coverPage.riskScore} />
          </View>
          <View style={styles.col2}>
            <Text style={styles.label}>Risk Level</Text>
            <RiskBadge level={coverPage.riskLevel} />
          </View>
        </View>
      </View>

      {/* Legitimacy Assessment */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Legitimacy Assessment</Text>
        <View style={styles.row}>
          <View style={styles.col2}>
            <LabelValue label="Rating" value={executiveSummary.legitimacyAssessment.rating.replace('_', ' ')} />
          </View>
          <View style={styles.col2}>
            <LabelValue label="Confidence" value={`${executiveSummary.legitimacyAssessment.confidence}%`} />
          </View>
        </View>
        <Text style={styles.paragraph}>{executiveSummary.legitimacyAssessment.summary}</Text>
      </View>

      {/* Source of Wealth/Funds */}
      <View style={styles.row}>
        <View style={styles.col2}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Source of Wealth</Text>
            <LabelValue label="Status" value={executiveSummary.sourceOfWealth.verified ? 'Verified' : 'Unverified'} />
            <Text style={styles.label}>Sources</Text>
            <BulletList items={executiveSummary.sourceOfWealth.sources} />
          </View>
        </View>
        <View style={styles.col2}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Source of Funds</Text>
            <LabelValue label="Status" value={executiveSummary.sourceOfFunds.verified ? 'Verified' : 'Unverified'} />
            <Text style={styles.label}>Sources</Text>
            <BulletList items={executiveSummary.sourceOfFunds.sources} />
          </View>
        </View>
      </View>

      {/* Critical Findings */}
      {executiveSummary.criticalFindings.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Critical Findings</Text>
          {executiveSummary.criticalFindings.map((finding, idx) => (
            <View key={idx} style={styles.finding}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.findingTitle}>{finding.title}</Text>
                <SeverityBadge severity={finding.severity} />
              </View>
              <Text style={styles.findingDescription}>{finding.description}</Text>
            </View>
          ))}
        </View>
      )}

      <PageFooter organizationName={metadata.organizationName} />
    </Page>
  )
}

function ClientProfilePage({ data }: { data: ReportData }) {
  const { clientProfile, coverPage, metadata } = data

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader title="Client Profile" caseRef={coverPage.caseReference} />
      <Text style={styles.sectionTitle}>2. Client Profile</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.col2}>
            <LabelValue label="Client Name" value={clientProfile.name} />
            <LabelValue label="Email" value={clientProfile.email} />
            <LabelValue label="Phone" value={clientProfile.phone} />
          </View>
          <View style={styles.col2}>
            <LabelValue label="Status" value={clientProfile.status} />
            <LabelValue label="Risk Level" value={clientProfile.riskLevel} />
            <LabelValue label="Client Since" value={formatDate(clientProfile.createdAt)} />
          </View>
        </View>
        {clientProfile.address && (
          <View>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{clientProfile.address}</Text>
          </View>
        )}
      </View>

      {/* Summary Stats */}
      <View style={styles.row}>
        <View style={styles.col4}>
          <StatCard value={clientProfile.walletCount} label="Wallets" />
        </View>
        <View style={styles.col4}>
          <StatCard value={clientProfile.documentCount} label="Documents" />
        </View>
        <View style={styles.col4}>
          <StatCard value={formatNumber(clientProfile.transactionCount)} label="Transactions" />
        </View>
        <View style={styles.col4}>
          <StatCard value={clientProfile.caseCount} label="Cases" />
        </View>
      </View>

      {/* ID Documents */}
      <Text style={styles.subsectionTitle}>Identification Documents</Text>
      {clientProfile.identificationDocuments.length > 0 ? (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Document Type</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Status</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Verified</Text>
          </View>
          {clientProfile.identificationDocuments.map((doc, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '40%' }]}>{doc.type}</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>{doc.status}</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>
                {doc.verifiedAt ? formatDate(doc.verifiedAt) : 'Pending'}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.paragraph}>No identification documents on file.</Text>
      )}

      {/* Address Verification */}
      <Text style={styles.subsectionTitle}>Address Verification</Text>
      <View style={styles.card}>
        <LabelValue
          label="Status"
          value={clientProfile.addressVerification.verified ? 'Verified' : 'Not Verified'}
        />
        {clientProfile.addressVerification.document && (
          <LabelValue
            label="Verified On"
            value={formatDate(clientProfile.addressVerification.document.verifiedAt)}
          />
        )}
      </View>

      <PageFooter organizationName={metadata.organizationName} />
    </Page>
  )
}

function PortfolioSummaryPage({ data }: { data: ReportData }) {
  const { portfolioSummary, coverPage, metadata } = data

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader title="Portfolio Summary" caseRef={coverPage.caseReference} />
      <Text style={styles.sectionTitle}>3. Digital Asset Portfolio Summary</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.col2}>
            <Text style={styles.label}>Total Portfolio Value</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>
              {formatCurrency(portfolioSummary.totalValueUSD)}
            </Text>
          </View>
          <View style={styles.col2}>
            <LabelValue label="As of Date" value={formatDate(portfolioSummary.asOfDate)} />
          </View>
        </View>
      </View>

      {/* Holdings */}
      <Text style={styles.subsectionTitle}>Holdings Breakdown</Text>
      {portfolioSummary.holdings.length > 0 ? (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Asset</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Amount</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Source</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Location</Text>
          </View>
          {portfolioSummary.holdings.slice(0, 15).map((holding, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '25%' }]}>{holding.asset}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{formatNumber(holding.amount)}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{holding.source}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{holding.location ?? 'N/A'}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.paragraph}>No holdings data available.</Text>
      )}

      {/* Allocation by Asset */}
      <Text style={styles.subsectionTitle}>Allocation by Asset</Text>
      <View style={styles.card}>
        {portfolioSummary.allocationByAsset.slice(0, 10).map((item, idx) => (
          <View key={idx} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.chartLabel}>{item.label}</Text>
              <Text style={styles.chartLabel}>{formatNumber(item.value)}</Text>
            </View>
            <View
              style={[
                styles.chartBar,
                {
                  width: `${Math.min(100, (item.value / Math.max(...portfolioSummary.allocationByAsset.map((a) => a.value), 1)) * 100)}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Allocation by Source */}
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.subsectionTitle}>By Source</Text>
          <View style={styles.card}>
            {portfolioSummary.allocationBySource.map((item, idx) => (
              <View key={idx} style={styles.row}>
                <Text style={[styles.tableCell, { width: '50%' }]}>{item.label}</Text>
                <Text style={[styles.tableCell, { width: '50%' }]}>{formatNumber(item.value)}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.col2}>
          <Text style={styles.subsectionTitle}>By Blockchain</Text>
          <View style={styles.card}>
            {portfolioSummary.allocationByBlockchain.map((item, idx) => (
              <View key={idx} style={styles.row}>
                <Text style={[styles.tableCell, { width: '50%' }]}>{item.label}</Text>
                <Text style={[styles.tableCell, { width: '50%' }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <PageFooter organizationName={metadata.organizationName} />
    </Page>
  )
}

function CEXAnalysisPages({ data }: { data: ReportData }) {
  const { cexAnalysis, coverPage, metadata } = data

  if (cexAnalysis.length === 0) {
    return null
  }

  return (
    <>
      {cexAnalysis.map((exchange, exchangeIdx) => (
        <Page key={exchangeIdx} size="A4" style={styles.page}>
          <PageHeader title={`CEX Analysis - ${exchange.exchange}`} caseRef={coverPage.caseReference} />
          <Text style={styles.sectionTitle}>4.{exchangeIdx + 1} {exchange.exchange}</Text>

          {/* Account Summary */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Summary</Text>
            <View style={styles.row}>
              <View style={styles.col3}>
                <LabelValue label="First Activity" value={formatDate(exchange.accountSummary.firstActivityDate)} />
              </View>
              <View style={styles.col3}>
                <LabelValue label="Last Activity" value={formatDate(exchange.accountSummary.lastActivityDate)} />
              </View>
              <View style={styles.col3}>
                <LabelValue label="Total Transactions" value={formatNumber(exchange.accountSummary.totalTransactions)} />
              </View>
            </View>
          </View>

          {/* Transaction Types */}
          <Text style={styles.subsectionTitle}>Activity by Type</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Count</Text>
            </View>
            {exchange.activity.transactionsByType.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '50%' }]}>{item.type}</Text>
                <Text style={[styles.tableCell, { width: '50%' }]}>{formatNumber(item.count)}</Text>
              </View>
            ))}
          </View>

          {/* Top Assets */}
          <Text style={styles.subsectionTitle}>Top Assets</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Asset</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Buy Volume</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Sell Volume</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Trades</Text>
            </View>
            {exchange.activity.topAssets.slice(0, 10).map((asset, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '25%' }]}>{asset.asset}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{formatNumber(asset.buyVolume)}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{formatNumber(asset.sellVolume)}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{asset.transactionCount}</Text>
              </View>
            ))}
          </View>

          {/* Flags */}
          {exchange.flags.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Risk Flags</Text>
              {exchange.flags.map((flag, idx) => (
                <View key={idx} style={styles.finding}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.findingTitle}>{flag.title}</Text>
                    <SeverityBadge severity={flag.severity} />
                  </View>
                  <Text style={styles.findingDescription}>{flag.description}</Text>
                </View>
              ))}
            </>
          )}

          <PageFooter organizationName={metadata.organizationName} />
        </Page>
      ))}
    </>
  )
}

function OnChainAnalysisPages({ data }: { data: ReportData }) {
  const { onChainAnalysis, coverPage, metadata } = data

  if (onChainAnalysis.length === 0) {
    return null
  }

  return (
    <>
      {onChainAnalysis.map((wallet, walletIdx) => (
        <Page key={walletIdx} size="A4" style={styles.page}>
          <PageHeader title={`On-Chain Analysis - ${wallet.wallet.label ?? wallet.wallet.blockchain}`} caseRef={coverPage.caseReference} />
          <Text style={styles.sectionTitle}>
            5.{walletIdx + 1} {wallet.wallet.label ?? `${wallet.wallet.blockchain} Wallet`}
          </Text>

          {/* Wallet Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Wallet Details</Text>
            <LabelValue label="Address" value={wallet.wallet.address} />
            <View style={styles.row}>
              <View style={styles.col3}>
                <LabelValue label="Blockchain" value={wallet.wallet.blockchain} />
              </View>
              <View style={styles.col3}>
                <LabelValue label="Verified" value={wallet.wallet.isVerified ? 'Yes' : 'No'} />
              </View>
              <View style={styles.col3}>
                <LabelValue label="Transactions" value={formatNumber(wallet.summary.totalTransactions)} />
              </View>
            </View>
          </View>

          {/* Summary Stats */}
          <View style={styles.row}>
            <View style={styles.col3}>
              <StatCard value={formatNumber(wallet.summary.totalReceived)} label="Total Received" />
            </View>
            <View style={styles.col3}>
              <StatCard value={formatNumber(wallet.summary.totalSent)} label="Total Sent" />
            </View>
            <View style={styles.col3}>
              <StatCard value={formatNumber(wallet.summary.currentBalance)} label="Current Balance" />
            </View>
          </View>

          {/* Activity Period */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.col2}>
                <LabelValue label="First Transaction" value={formatDate(wallet.summary.firstTransactionDate)} />
              </View>
              <View style={styles.col2}>
                <LabelValue label="Last Transaction" value={formatDate(wallet.summary.lastTransactionDate)} />
              </View>
            </View>
          </View>

          {/* Top Counterparties */}
          {wallet.counterparties.topCounterparties.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Top Counterparties</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Address</Text>
                  <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Transactions</Text>
                  <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Volume</Text>
                </View>
                {wallet.counterparties.topCounterparties.slice(0, 8).map((cp, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: '50%', fontSize: 8 }]}>
                      {cp.address.slice(0, 20)}...
                    </Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>{cp.transactionCount}</Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {formatNumber(cp.totalReceived + cp.totalSent)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Flags */}
          {wallet.flags.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Risk Flags</Text>
              {wallet.flags.map((flag, idx) => (
                <View key={idx} style={styles.finding}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.findingTitle}>{flag.title}</Text>
                    <SeverityBadge severity={flag.severity} />
                  </View>
                  <Text style={styles.findingDescription}>{flag.description}</Text>
                </View>
              ))}
            </>
          )}

          <PageFooter organizationName={metadata.organizationName} />
        </Page>
      ))}
    </>
  )
}

function RiskAssessmentPage({ data }: { data: ReportData }) {
  const { riskAssessment, coverPage, metadata } = data

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader title="Risk Assessment" caseRef={coverPage.caseReference} />
      <Text style={styles.sectionTitle}>7. Risk Assessment</Text>

      {/* Overall Risk */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overall Risk</Text>
        <View style={styles.row}>
          <View style={styles.col2}>
            <Text style={styles.label}>Risk Score</Text>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.primary }}>
              {riskAssessment.overallRiskScore}/100
            </Text>
            <RiskGauge score={riskAssessment.overallRiskScore} />
          </View>
          <View style={styles.col2}>
            <Text style={styles.label}>Risk Level</Text>
            <RiskBadge level={riskAssessment.overallRiskLevel} />
          </View>
        </View>
        <Text style={[styles.paragraph, { marginTop: 10 }]}>{riskAssessment.narrative}</Text>
      </View>

      {/* Category Breakdown */}
      <Text style={styles.subsectionTitle}>Risk Categories</Text>
      <View style={styles.card}>
        {riskAssessment.categoryDetails.map((cat, idx) => (
          <View key={idx} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.chartLabel}>{cat.category}</Text>
              <Text style={styles.chartLabel}>{cat.score}/100 ({cat.findingsCount} findings)</Text>
            </View>
            <RiskGauge score={cat.score} />
          </View>
        ))}
      </View>

      {/* Findings Summary */}
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.subsectionTitle}>Risk Factors</Text>
          <View style={styles.card}>
            <BulletList items={riskAssessment.riskFactors} />
          </View>
        </View>
        <View style={styles.col2}>
          <Text style={styles.subsectionTitle}>Mitigating Factors</Text>
          <View style={styles.card}>
            <BulletList items={riskAssessment.mitigatingFactors} />
          </View>
        </View>
      </View>

      {/* Screening Results */}
      <Text style={styles.subsectionTitle}>Screening Results</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Screening Type</Text>
          <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Status</Text>
          <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Result</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { width: '40%' }]}>Sanctions Screening</Text>
          <Text style={[styles.tableCell, { width: '30%' }]}>{riskAssessment.screeningResults.sanctions.checked ? 'Completed' : 'Pending'}</Text>
          <Text style={[styles.tableCell, { width: '30%' }]}>{riskAssessment.screeningResults.sanctions.matchesFound ? 'Matches Found' : 'Clear'}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { width: '40%' }]}>Mixer Exposure</Text>
          <Text style={[styles.tableCell, { width: '30%' }]}>{riskAssessment.screeningResults.mixerExposure.checked ? 'Completed' : 'Pending'}</Text>
          <Text style={[styles.tableCell, { width: '30%' }]}>{riskAssessment.screeningResults.mixerExposure.detected ? 'Detected' : 'Clear'}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { width: '40%' }]}>Privacy Coins</Text>
          <Text style={[styles.tableCell, { width: '30%' }]}>{riskAssessment.screeningResults.privacyCoins.checked ? 'Completed' : 'Pending'}</Text>
          <Text style={[styles.tableCell, { width: '30%' }]}>{riskAssessment.screeningResults.privacyCoins.detected ? 'Detected' : 'Clear'}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { width: '40%' }]}>High-Risk Jurisdictions</Text>
          <Text style={[styles.tableCell, { width: '30%' }]}>{riskAssessment.screeningResults.highRiskJurisdictions.checked ? 'Completed' : 'Pending'}</Text>
          <Text style={[styles.tableCell, { width: '30%' }]}>{riskAssessment.screeningResults.highRiskJurisdictions.detected ? 'Detected' : 'Clear'}</Text>
        </View>
      </View>

      <PageFooter organizationName={metadata.organizationName} />
    </Page>
  )
}

function ConclusionPage({ data }: { data: ReportData }) {
  const { conclusion, coverPage, metadata } = data

  const getRecommendationColor = () => {
    switch (conclusion.recommendation) {
      case 'APPROVE':
        return colors.success
      case 'CONDITIONAL_APPROVE':
        return colors.warning
      case 'REJECT':
        return colors.danger
      default:
        return colors.muted
    }
  }

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader title="Conclusion" caseRef={coverPage.caseReference} />
      <Text style={styles.sectionTitle}>8. Conclusion & Recommendation</Text>

      {/* Recommendation */}
      <View style={[styles.card, { borderLeft: `4 solid ${getRecommendationColor()}` }]}>
        <Text style={styles.cardTitle}>Recommendation</Text>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: getRecommendationColor(), marginBottom: 10 }}>
          {conclusion.recommendation.replace('_', ' ')}
        </Text>
        <Text style={styles.paragraph}>{conclusion.summary}</Text>
      </View>

      {/* Key Findings */}
      {conclusion.keyFindings.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>Key Findings</Text>
          <View style={styles.card}>
            <BulletList items={conclusion.keyFindings} />
          </View>
        </>
      )}

      {/* Conditions */}
      {conclusion.conditions && conclusion.conditions.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>Conditions for Approval</Text>
          <View style={styles.card}>
            <BulletList items={conclusion.conditions} />
          </View>
        </>
      )}

      {/* Actions Required */}
      {conclusion.actionsRequired && conclusion.actionsRequired.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>Actions Required</Text>
          <View style={styles.card}>
            <BulletList items={conclusion.actionsRequired} />
          </View>
        </>
      )}

      {/* Reviewer Sign-off */}
      {conclusion.reviewedBy && (
        <>
          <Text style={styles.subsectionTitle}>Review Sign-off</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.col2}>
                <LabelValue label="Reviewed By" value={conclusion.reviewedBy.name} />
                <LabelValue label="Role" value={conclusion.reviewedBy.role} />
              </View>
              <View style={styles.col2}>
                <LabelValue label="Review Date" value={formatDate(conclusion.reviewedAt)} />
              </View>
            </View>
            {conclusion.reviewNotes && (
              <>
                <Text style={styles.label}>Review Notes</Text>
                <Text style={styles.paragraph}>{conclusion.reviewNotes}</Text>
              </>
            )}
          </View>
        </>
      )}

      <PageFooter organizationName={metadata.organizationName} />
    </Page>
  )
}

// ============================================
// Main Document Component
// ============================================

interface ReportDocumentProps {
  data: ReportData
}

export function ReportDocument({ data }: ReportDocumentProps) {
  return (
    <Document
      title={`Due Diligence Report - ${data.coverPage.subtitle}`}
      author={data.coverPage.preparedBy}
      subject="Digital Asset Due Diligence Report"
      creator="Digital Asset DD Tool"
    >
      <CoverPage data={data} />
      <TableOfContentsPage data={data} />
      <ExecutiveSummaryPage data={data} />
      <ClientProfilePage data={data} />
      <PortfolioSummaryPage data={data} />
      <CEXAnalysisPages data={data} />
      <OnChainAnalysisPages data={data} />
      <RiskAssessmentPage data={data} />
      <ConclusionPage data={data} />
    </Document>
  )
}

export default ReportDocument
