/**
 * Experiment & Metrics Schemas
 *
 * After generating startup concepts, we run experiments to validate:
 * - SEO/AEO: Can we rank and get organic traffic?
 * - Social: Does content resonate and get engagement?
 * - Outbound: Do prospects respond to cold outreach?
 * - Paid: What's the CPA and conversion rate?
 * - Waitlist: Is there demand signal?
 *
 * Winners get promoted, losers get killed or pivoted.
 */

import { z } from 'zod'

// =============================================================================
// EXPERIMENT CHANNELS
// =============================================================================

export const ExperimentChannel = z.enum([
  // Organic
  'seo',                // Search engine optimization
  'aeo',                // Answer engine optimization (AI search)
  'content-marketing',  // Blog posts, guides, resources
  'youtube',            // Video content
  'podcast',            // Audio content

  // Social
  'twitter',
  'linkedin',
  'reddit',
  'hacker-news',
  'product-hunt',
  'indie-hackers',

  // Outbound
  'cold-email',
  'linkedin-outreach',
  'cold-calling',

  // Paid
  'google-ads',
  'meta-ads',
  'linkedin-ads',
  'twitter-ads',
  'reddit-ads',

  // Community
  'community-building',
  'partnerships',
  'affiliate',
  'referral',

  // Direct
  'waitlist',
  'landing-page',
  'demo-requests',
]).describe('Channel for running experiment')
export type ExperimentChannel = z.infer<typeof ExperimentChannel>

export const ExperimentChannelCategory = z.enum([
  'organic',
  'social',
  'outbound',
  'paid',
  'community',
  'direct',
]).describe('Category of experiment channel')
export type ExperimentChannelCategory = z.infer<typeof ExperimentChannelCategory>

// =============================================================================
// EXPERIMENT TYPES
// =============================================================================

export const ExperimentType = z.enum([
  // Validation experiments
  'demand-validation',    // Is there demand?
  'message-testing',      // Which message resonates?
  'channel-testing',      // Which channel works?
  'price-testing',        // What price point works?
  'audience-testing',     // Which audience converts?

  // Growth experiments
  'acquisition',          // Can we acquire users?
  'activation',           // Can we activate users?
  'retention',            // Can we retain users?
  'referral',             // Can we get referrals?
  'revenue',              // Can we monetize?

  // Optimization
  'conversion-optimization', // Improve conversion rates
  'content-optimization',    // Improve content performance
  'funnel-optimization',     // Improve funnel metrics
]).describe('Type of experiment being run')
export type ExperimentType = z.infer<typeof ExperimentType>

// =============================================================================
// EXPERIMENT METRICS
// =============================================================================

export const MetricType = z.enum([
  // Traffic metrics
  'impressions',
  'clicks',
  'ctr',                  // Click-through rate
  'visits',
  'unique-visitors',
  'page-views',
  'time-on-site',
  'bounce-rate',

  // Engagement metrics
  'likes',
  'comments',
  'shares',
  'saves',
  'follows',
  'engagement-rate',

  // Conversion metrics
  'signups',
  'waitlist-signups',
  'demo-requests',
  'trial-starts',
  'conversions',
  'conversion-rate',

  // Revenue metrics
  'revenue',
  'mrr',
  'arr',
  'arpu',
  'ltv',
  'cac',
  'ltv-cac-ratio',

  // Outreach metrics
  'emails-sent',
  'email-opens',
  'email-open-rate',
  'email-replies',
  'email-reply-rate',
  'meetings-booked',

  // Paid metrics
  'ad-spend',
  'cpm',
  'cpc',
  'cpa',
  'roas',

  // SEO metrics
  'rankings',
  'keywords-ranked',
  'organic-traffic',
  'domain-authority',
  'backlinks',
]).describe('Type of metric being tracked')
export type MetricType = z.infer<typeof MetricType>

export const Metric = z.object({
  type: MetricType,
  value: z.number().describe('Metric value'),
  unit: z.string().optional().describe('Unit of measurement'),
  period: z.string().optional().describe('Time period (e.g., "daily", "weekly")'),
  comparison: z.object({
    previous: z.number().optional().describe('Previous period value'),
    change: z.number().optional().describe('Percentage change'),
    trend: z.enum(['up', 'down', 'flat']).optional(),
  }).optional(),
})
export type Metric = z.infer<typeof Metric>

// =============================================================================
// EXPERIMENT HYPOTHESIS
// =============================================================================

export const ExperimentHypothesis = z.object({
  statement: z.string().describe('The hypothesis statement ("If we X, then Y because Z")'),
  assumption: z.string().describe('The key assumption being tested'),
  successCriteria: z.array(z.object({
    metric: MetricType,
    operator: z.enum(['>=', '<=', '>', '<', '=']),
    target: z.number(),
    description: z.string(),
  })).describe('What success looks like'),
  failureCriteria: z.array(z.object({
    metric: MetricType,
    operator: z.enum(['>=', '<=', '>', '<', '=']),
    threshold: z.number(),
    description: z.string(),
  })).optional().describe('What failure looks like'),
})
export type ExperimentHypothesis = z.infer<typeof ExperimentHypothesis>

// =============================================================================
// EXPERIMENT DESIGN
// =============================================================================

export const ExperimentVariant = z.object({
  id: z.string().describe('Variant identifier (e.g., "control", "variant-a")'),
  name: z.string().describe('Variant name'),
  description: z.string().describe('What this variant tests'),
  allocation: z.number().min(0).max(100).describe('Traffic allocation percentage'),
  config: z.record(z.string(), z.unknown()).describe('Variant-specific configuration'),
})
export type ExperimentVariant = z.infer<typeof ExperimentVariant>

export const ExperimentDesign = z.object({
  type: z.enum(['ab-test', 'multivariate', 'holdout', 'sequential']).describe('Experiment design type'),
  variants: z.array(ExperimentVariant).min(1).describe('Experiment variants'),
  sampleSize: z.number().optional().describe('Required sample size'),
  duration: z.string().describe('Planned duration'),
  significance: z.number().optional().describe('Required statistical significance'),
})
export type ExperimentDesign = z.infer<typeof ExperimentDesign>

// =============================================================================
// EXPERIMENT ASSETS
// =============================================================================

export const ContentAsset = z.object({
  id: z.string().describe('Asset ID'),
  type: z.enum([
    'landing-page',
    'blog-post',
    'email-sequence',
    'ad-creative',
    'social-post',
    'video',
    'lead-magnet',
    'case-study',
  ]).describe('Type of content asset'),
  title: z.string().describe('Asset title'),
  url: z.string().optional().describe('URL if published'),
  status: z.enum(['draft', 'review', 'published', 'paused', 'archived']).describe('Asset status'),
  variant: z.string().optional().describe('Which experiment variant this belongs to'),
  performance: z.array(Metric).optional().describe('Performance metrics'),
})
export type ContentAsset = z.infer<typeof ContentAsset>

// =============================================================================
// EXPERIMENT
// =============================================================================

export const ExperimentStatus = z.enum([
  'planned',            // Designed but not started
  'setup',              // Being set up
  'running',            // Currently running
  'paused',             // Temporarily paused
  'completed',          // Finished running
  'analyzing',          // Analyzing results
  'concluded',          // Analysis complete
]).describe('Current experiment status')
export type ExperimentStatus = z.infer<typeof ExperimentStatus>

export const ExperimentResult = z.enum([
  'winner',             // Clear winner identified
  'loser',              // Failed to meet criteria
  'inconclusive',       // Not enough data
  'learning',           // Generated insights but no clear winner
]).describe('Experiment outcome')
export type ExperimentResult = z.infer<typeof ExperimentResult>

export const Experiment = z.object({
  // Identity
  id: z.string().describe('Unique experiment ID'),
  name: z.string().describe('Experiment name'),
  description: z.string().describe('What this experiment tests'),

  // Association
  startupConceptId: z.string().describe('Startup concept being tested'),
  brandFamilyId: z.string().optional().describe('Brand family if applicable'),

  // Classification
  type: ExperimentType,
  channel: ExperimentChannel,
  channelCategory: ExperimentChannelCategory,

  // Hypothesis
  hypothesis: ExperimentHypothesis,

  // Design
  design: ExperimentDesign,

  // Assets
  assets: z.array(ContentAsset).describe('Content assets for this experiment'),

  // Budget
  budget: z.object({
    allocated: z.number().describe('Allocated budget in USD'),
    spent: z.number().describe('Spent budget in USD'),
    remaining: z.number().describe('Remaining budget'),
  }).optional(),

  // Timeline
  timeline: z.object({
    plannedStart: z.string().datetime().describe('Planned start date'),
    actualStart: z.string().datetime().optional().describe('Actual start date'),
    plannedEnd: z.string().datetime().describe('Planned end date'),
    actualEnd: z.string().datetime().optional().describe('Actual end date'),
  }),

  // Status
  status: ExperimentStatus,

  // Results
  results: z.object({
    metrics: z.array(Metric).describe('Collected metrics'),
    winningVariant: z.string().optional().describe('Winning variant ID'),
    result: ExperimentResult.optional(),
    confidence: z.number().optional().describe('Statistical confidence'),
    insights: z.array(z.string()).describe('Key insights from experiment'),
    recommendations: z.array(z.string()).describe('Recommended next steps'),
  }).optional(),

  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().describe('Who created this experiment'),
  tags: z.array(z.string()),
})
export type Experiment = z.infer<typeof Experiment>

// =============================================================================
// EXPERIMENT TEMPLATES
// =============================================================================

export const ExperimentTemplate = z.object({
  id: z.string().describe('Template ID'),
  name: z.string().describe('Template name'),
  description: z.string().describe('What this template is for'),

  // Pre-configured
  type: ExperimentType,
  channel: ExperimentChannel,
  suggestedDuration: z.string(),
  suggestedBudget: z.number().optional(),

  // Default metrics
  primaryMetrics: z.array(MetricType).describe('Primary metrics to track'),
  secondaryMetrics: z.array(MetricType).describe('Secondary metrics'),

  // Success criteria template
  successCriteriaTemplate: z.array(z.object({
    metric: MetricType,
    operator: z.enum(['>=', '<=', '>', '<', '=']),
    benchmarkType: z.enum(['absolute', 'relative', 'percentile']),
    benchmarkValue: z.number(),
  })),

  // Required assets
  requiredAssets: z.array(z.string()).describe('Asset types required'),

  // Playbook
  playbook: z.object({
    setup: z.array(z.string()).describe('Setup steps'),
    execution: z.array(z.string()).describe('Execution steps'),
    analysis: z.array(z.string()).describe('Analysis steps'),
  }),
})
export type ExperimentTemplate = z.infer<typeof ExperimentTemplate>

// =============================================================================
// EXPERIMENT BATCH (Run multiple experiments)
// =============================================================================

export const ExperimentBatch = z.object({
  id: z.string().describe('Batch ID'),
  name: z.string().describe('Batch name'),
  description: z.string().describe('Batch description'),

  // Configuration
  experiments: z.array(z.string()).describe('Experiment IDs in this batch'),
  strategy: z.enum([
    'parallel',           // Run all simultaneously
    'sequential',         // Run one after another
    'staged',             // Run in stages based on results
  ]).describe('Execution strategy'),

  // Resource allocation
  totalBudget: z.number().optional(),
  budgetAllocation: z.record(z.string(), z.number()).describe('Budget per experiment'),

  // Status
  status: z.enum(['planned', 'running', 'completed']),

  // Results
  summary: z.object({
    totalExperiments: z.number(),
    completed: z.number(),
    winners: z.number(),
    losers: z.number(),
    inconclusive: z.number(),
  }).optional(),
})
export type ExperimentBatch = z.infer<typeof ExperimentBatch>

// =============================================================================
// FUNNEL & CONVERSION TRACKING
// =============================================================================

export const FunnelStage = z.object({
  id: z.string().describe('Stage ID'),
  name: z.string().describe('Stage name'),
  order: z.number().describe('Stage order'),
  description: z.string().describe('What happens at this stage'),
  entryMetric: MetricType.describe('Metric for entering this stage'),
  exitMetric: MetricType.describe('Metric for exiting this stage'),
})
export type FunnelStage = z.infer<typeof FunnelStage>

export const Funnel = z.object({
  id: z.string().describe('Funnel ID'),
  name: z.string().describe('Funnel name'),
  stages: z.array(FunnelStage).describe('Funnel stages'),

  // Metrics
  metrics: z.object({
    topOfFunnel: z.number().describe('Entries at top'),
    bottomOfFunnel: z.number().describe('Conversions at bottom'),
    overallConversion: z.number().describe('Overall conversion rate'),
    stageConversions: z.record(z.string(), z.number()).describe('Conversion rate by stage'),
  }).optional(),
})
export type Funnel = z.infer<typeof Funnel>

// =============================================================================
// EXPERIMENT DASHBOARD
// =============================================================================

export const ExperimentDashboard = z.object({
  // Overview
  totalExperiments: z.number(),
  activeExperiments: z.number(),
  completedExperiments: z.number(),

  // Performance
  winRate: z.number().describe('Percentage of experiments that won'),
  avgROI: z.number().optional().describe('Average ROI across experiments'),
  totalSpend: z.number().describe('Total experiment spend'),
  totalRevenue: z.number().optional().describe('Total attributed revenue'),

  // By channel
  byChannel: z.record(ExperimentChannel, z.object({
    experiments: z.number(),
    winRate: z.number(),
    avgCPA: z.number().optional(),
  })),

  // Top performers
  topWinners: z.array(z.object({
    experimentId: z.string(),
    name: z.string(),
    metric: MetricType,
    improvement: z.number(),
  })).max(5),

  // Learnings
  recentInsights: z.array(z.string()),
})
export type ExperimentDashboard = z.infer<typeof ExperimentDashboard>
