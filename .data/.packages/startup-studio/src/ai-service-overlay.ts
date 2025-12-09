/**
 * AI Service Overlay Schemas
 *
 * Even for tasks that cannot be fully automated (physical services,
 * complex human judgment, etc.), AI can provide valuable overlay services:
 *
 * - COACHING: Guide humans through the task better
 * - TRAINING: Teach humans how to do the task
 * - ANALYSIS: Analyze performance and outcomes
 * - CONSULTING: Advise on strategy and optimization
 * - PLANNING: Help plan and prepare for the task
 * - QA/REVIEW: Review and validate work done by humans
 * - DOCUMENTATION: Document processes and create SOPs
 * - MONITORING: Track metrics and alert on issues
 *
 * This means EVERY occupation, task, process, and activity in the ontology
 * can generate multiple AI service opportunities.
 */

import { z } from 'zod'

// =============================================================================
// AI SERVICE OVERLAY TYPES
// =============================================================================

export const AIOverlayType = z.enum([
  // Pre-task services
  'planning',           // Help plan how to approach the task
  'preparation',        // Help gather inputs and prepare
  'training',           // Teach how to do the task
  'simulation',         // Practice/simulate before doing

  // During-task services
  'coaching',           // Real-time guidance during execution
  'assistance',         // AI assists with parts of the task
  'co-pilot',           // AI works alongside the human
  'monitoring',         // Track progress and metrics in real-time

  // Post-task services
  'analysis',           // Analyze outcomes and performance
  'review',             // QA review of completed work
  'feedback',           // Provide feedback for improvement
  'documentation',      // Document what was done

  // Meta services
  'consulting',         // Strategic advice on the domain
  'optimization',       // Optimize processes and workflows
  'benchmarking',       // Compare against best practices
  'forecasting',        // Predict outcomes and trends
]).describe('Type of AI overlay service')
export type AIOverlayType = z.infer<typeof AIOverlayType>

export const AIOverlayTiming = z.enum([
  'before',             // Before the task/activity
  'during',             // During execution
  'after',              // After completion
  'ongoing',            // Continuous/always-on
]).describe('When the AI service is engaged relative to the task')
export type AIOverlayTiming = z.infer<typeof AIOverlayTiming>

// =============================================================================
// OVERLAY SERVICE DEFINITIONS
// =============================================================================

export const CoachingOverlay = z.object({
  type: z.literal('coaching'),
  timing: z.enum(['during', 'ongoing']),

  // What the AI coach does
  capabilities: z.object({
    realTimeGuidance: z.boolean().describe('Provides real-time suggestions'),
    contextualTips: z.boolean().describe('Offers contextual tips based on situation'),
    mistakePrevention: z.boolean().describe('Warns before common mistakes'),
    bestPractices: z.boolean().describe('Suggests best practices'),
    adaptiveAdvice: z.boolean().describe('Adapts advice based on skill level'),
  }),

  // Interaction model
  interaction: z.object({
    mode: z.enum(['push', 'pull', 'hybrid']).describe('Push notifications vs ask-based'),
    channels: z.array(z.enum(['chat', 'voice', 'overlay', 'email', 'sms'])).describe('Communication channels'),
    frequency: z.string().describe('How often AI reaches out'),
  }),

  // Value proposition
  valueProps: z.object({
    headline: z.string().describe('Headline for this coaching service'),
    benefits: z.array(z.string()).describe('Key benefits'),
    metrics: z.array(z.string()).describe('Metrics that improve'),
  }),
})
export type CoachingOverlay = z.infer<typeof CoachingOverlay>

export const TrainingOverlay = z.object({
  type: z.literal('training'),
  timing: z.literal('before'),

  // Training structure
  curriculum: z.object({
    modules: z.array(z.object({
      name: z.string().describe('Module name'),
      description: z.string().describe('What is taught'),
      duration: z.string().describe('Time to complete'),
      format: z.enum(['video', 'interactive', 'text', 'simulation', 'quiz']),
    })).describe('Training modules'),
    totalDuration: z.string().describe('Total training time'),
    certification: z.boolean().describe('Whether certification is offered'),
  }),

  // Personalization
  personalization: z.object({
    skillAssessment: z.boolean().describe('Assesses current skill level'),
    adaptivePath: z.boolean().describe('Adapts curriculum to learner'),
    practiceExercises: z.boolean().describe('Includes hands-on practice'),
    progressTracking: z.boolean().describe('Tracks learning progress'),
  }),

  // Value proposition
  valueProps: z.object({
    headline: z.string().describe('Headline for this training service'),
    benefits: z.array(z.string()).describe('Key benefits'),
    outcomes: z.array(z.string()).describe('What learner will be able to do'),
  }),
})
export type TrainingOverlay = z.infer<typeof TrainingOverlay>

export const AnalysisOverlay = z.object({
  type: z.literal('analysis'),
  timing: z.enum(['after', 'ongoing']),

  // What gets analyzed
  analysisScope: z.object({
    performance: z.boolean().describe('Analyzes performance metrics'),
    quality: z.boolean().describe('Analyzes output quality'),
    efficiency: z.boolean().describe('Analyzes time/resource efficiency'),
    patterns: z.boolean().describe('Identifies patterns and trends'),
    anomalies: z.boolean().describe('Detects anomalies and outliers'),
    comparisons: z.boolean().describe('Compares against benchmarks'),
  }),

  // Output
  deliverables: z.object({
    dashboards: z.boolean().describe('Interactive dashboards'),
    reports: z.boolean().describe('Periodic reports'),
    alerts: z.boolean().describe('Real-time alerts'),
    recommendations: z.boolean().describe('Actionable recommendations'),
    forecasts: z.boolean().describe('Predictive forecasts'),
  }),

  // Value proposition
  valueProps: z.object({
    headline: z.string().describe('Headline for this analysis service'),
    benefits: z.array(z.string()).describe('Key benefits'),
    insights: z.array(z.string()).describe('Types of insights provided'),
  }),
})
export type AnalysisOverlay = z.infer<typeof AnalysisOverlay>

export const ConsultingOverlay = z.object({
  type: z.literal('consulting'),
  timing: z.enum(['before', 'ongoing']),

  // Consulting capabilities
  capabilities: z.object({
    strategyAdvice: z.boolean().describe('Strategic recommendations'),
    processDesign: z.boolean().describe('Process design and optimization'),
    toolSelection: z.boolean().describe('Tool and technology recommendations'),
    benchmarking: z.boolean().describe('Industry benchmarking'),
    changeManagement: z.boolean().describe('Change management guidance'),
  }),

  // Engagement model
  engagement: z.object({
    format: z.enum(['chat', 'report', 'session', 'ongoing']).describe('How consulting is delivered'),
    depth: z.enum(['quick-answer', 'analysis', 'comprehensive']).describe('Depth of engagement'),
    followUp: z.boolean().describe('Whether follow-up is included'),
  }),

  // Value proposition
  valueProps: z.object({
    headline: z.string().describe('Headline for this consulting service'),
    benefits: z.array(z.string()).describe('Key benefits'),
    expertise: z.array(z.string()).describe('Areas of expertise'),
  }),
})
export type ConsultingOverlay = z.infer<typeof ConsultingOverlay>

export const PlanningOverlay = z.object({
  type: z.literal('planning'),
  timing: z.literal('before'),

  // Planning capabilities
  capabilities: z.object({
    taskBreakdown: z.boolean().describe('Breaks complex tasks into steps'),
    resourceEstimation: z.boolean().describe('Estimates resources needed'),
    riskIdentification: z.boolean().describe('Identifies potential risks'),
    contingencyPlanning: z.boolean().describe('Creates backup plans'),
    scheduling: z.boolean().describe('Creates timelines and schedules'),
    checklistGeneration: z.boolean().describe('Generates checklists'),
  }),

  // Output formats
  outputs: z.object({
    projectPlan: z.boolean().describe('Detailed project plan'),
    ganttChart: z.boolean().describe('Visual timeline'),
    checklist: z.boolean().describe('Action checklist'),
    resourceList: z.boolean().describe('Resource requirements'),
    riskRegister: z.boolean().describe('Risk assessment'),
  }),

  // Value proposition
  valueProps: z.object({
    headline: z.string().describe('Headline for this planning service'),
    benefits: z.array(z.string()).describe('Key benefits'),
    outcomes: z.array(z.string()).describe('Planning outcomes'),
  }),
})
export type PlanningOverlay = z.infer<typeof PlanningOverlay>

export const ReviewOverlay = z.object({
  type: z.literal('review'),
  timing: z.literal('after'),

  // Review capabilities
  capabilities: z.object({
    qualityCheck: z.boolean().describe('Checks output quality'),
    complianceCheck: z.boolean().describe('Checks regulatory compliance'),
    consistencyCheck: z.boolean().describe('Checks consistency with standards'),
    completenessCheck: z.boolean().describe('Checks for completeness'),
    errorDetection: z.boolean().describe('Detects errors and issues'),
    improvementSuggestions: z.boolean().describe('Suggests improvements'),
  }),

  // Review process
  process: z.object({
    automated: z.boolean().describe('Fully automated review'),
    escalation: z.boolean().describe('Escalates issues to humans'),
    scoring: z.boolean().describe('Provides quality scores'),
    feedback: z.boolean().describe('Provides detailed feedback'),
  }),

  // Value proposition
  valueProps: z.object({
    headline: z.string().describe('Headline for this review service'),
    benefits: z.array(z.string()).describe('Key benefits'),
    qualityImprovements: z.array(z.string()).describe('Quality improvements achieved'),
  }),
})
export type ReviewOverlay = z.infer<typeof ReviewOverlay>

export const DocumentationOverlay = z.object({
  type: z.literal('documentation'),
  timing: z.enum(['after', 'ongoing']),

  // Documentation capabilities
  capabilities: z.object({
    sopGeneration: z.boolean().describe('Generates standard operating procedures'),
    processMapping: z.boolean().describe('Creates process maps'),
    knowledgeCapture: z.boolean().describe('Captures institutional knowledge'),
    templateCreation: z.boolean().describe('Creates reusable templates'),
    versionControl: z.boolean().describe('Manages document versions'),
  }),

  // Output formats
  formats: z.object({
    text: z.boolean().describe('Written documentation'),
    diagrams: z.boolean().describe('Visual diagrams'),
    videos: z.boolean().describe('Video documentation'),
    interactive: z.boolean().describe('Interactive guides'),
  }),

  // Value proposition
  valueProps: z.object({
    headline: z.string().describe('Headline for this documentation service'),
    benefits: z.array(z.string()).describe('Key benefits'),
    outputs: z.array(z.string()).describe('Documentation outputs'),
  }),
})
export type DocumentationOverlay = z.infer<typeof DocumentationOverlay>

export const MonitoringOverlay = z.object({
  type: z.literal('monitoring'),
  timing: z.literal('ongoing'),

  // Monitoring capabilities
  capabilities: z.object({
    metricsTracking: z.boolean().describe('Tracks key metrics'),
    anomalyDetection: z.boolean().describe('Detects anomalies'),
    trendAnalysis: z.boolean().describe('Analyzes trends over time'),
    alerting: z.boolean().describe('Sends alerts on thresholds'),
    reporting: z.boolean().describe('Generates periodic reports'),
  }),

  // Alert configuration
  alerts: z.object({
    channels: z.array(z.enum(['email', 'sms', 'slack', 'webhook'])).describe('Alert channels'),
    severity: z.array(z.enum(['info', 'warning', 'critical'])).describe('Alert severity levels'),
    customizable: z.boolean().describe('Custom alert rules'),
  }),

  // Value proposition
  valueProps: z.object({
    headline: z.string().describe('Headline for this monitoring service'),
    benefits: z.array(z.string()).describe('Key benefits'),
    metrics: z.array(z.string()).describe('Metrics monitored'),
  }),
})
export type MonitoringOverlay = z.infer<typeof MonitoringOverlay>

// =============================================================================
// UNIFIED AI OVERLAY SERVICE
// =============================================================================

export const AIOverlayService = z.discriminatedUnion('type', [
  CoachingOverlay,
  TrainingOverlay,
  AnalysisOverlay,
  ConsultingOverlay,
  PlanningOverlay,
  ReviewOverlay,
  DocumentationOverlay,
  MonitoringOverlay,
])
export type AIOverlayService = z.infer<typeof AIOverlayService>

// =============================================================================
// OVERLAY BUNDLE FOR A TASK/PROCESS
// =============================================================================

export const TaskOverlayBundle = z.object({
  taskId: z.string().describe('Reference to the task this bundle applies to'),
  taskName: z.string().describe('Name of the task'),

  // Available overlays
  availableOverlays: z.array(AIOverlayType).describe('All overlay types applicable to this task'),

  // Configured overlays
  overlays: z.object({
    planning: PlanningOverlay.optional(),
    training: TrainingOverlay.optional(),
    coaching: CoachingOverlay.optional(),
    analysis: AnalysisOverlay.optional(),
    review: ReviewOverlay.optional(),
    documentation: DocumentationOverlay.optional(),
    monitoring: MonitoringOverlay.optional(),
    consulting: ConsultingOverlay.optional(),
  }),

  // Bundle pricing
  pricing: z.object({
    individual: z.record(AIOverlayType, z.number()).describe('Price per overlay type'),
    bundle: z.number().optional().describe('Bundled price for all overlays'),
    subscription: z.number().optional().describe('Monthly subscription for ongoing overlays'),
  }),

  // Value summary
  totalValue: z.object({
    timesSaved: z.string().describe('Total time savings'),
    errorReduction: z.string().describe('Error reduction percentage'),
    qualityImprovement: z.string().describe('Quality improvement'),
    roiEstimate: z.string().describe('Estimated ROI'),
  }),
})
export type TaskOverlayBundle = z.infer<typeof TaskOverlayBundle>

export const ProcessOverlayBundle = z.object({
  processId: z.string().describe('Reference to the process this bundle applies to'),
  processName: z.string().describe('Name of the process'),

  // Per-step overlays
  stepOverlays: z.array(z.object({
    stepName: z.string().describe('Process step name'),
    overlays: z.array(AIOverlayType).describe('Overlays for this step'),
  })).describe('Overlays broken down by process step'),

  // Process-level overlays
  processOverlays: z.object({
    planning: PlanningOverlay.optional(),
    monitoring: MonitoringOverlay.optional(),
    analysis: AnalysisOverlay.optional(),
    consulting: ConsultingOverlay.optional(),
    documentation: DocumentationOverlay.optional(),
  }),

  // Value summary
  endToEndValue: z.object({
    cycleTimeReduction: z.string().describe('Cycle time improvement'),
    qualityImprovement: z.string().describe('Quality improvement'),
    costReduction: z.string().describe('Cost reduction'),
    complianceImprovement: z.string().describe('Compliance improvement'),
  }),
})
export type ProcessOverlayBundle = z.infer<typeof ProcessOverlayBundle>

// =============================================================================
// OVERLAY OPPORTUNITY CALCULATOR
// =============================================================================

export const OverlayOpportunityScore = z.object({
  overlayType: AIOverlayType,
  feasibility: z.number().min(0).max(100).describe('How feasible is this overlay (0-100)'),
  value: z.number().min(0).max(100).describe('Value potential (0-100)'),
  competition: z.number().min(0).max(100).describe('Competitive landscape (0=crowded, 100=blue ocean)'),
  overall: z.number().min(0).max(100).describe('Overall opportunity score'),
  rationale: z.string().describe('Why this score'),
})
export type OverlayOpportunityScore = z.infer<typeof OverlayOpportunityScore>

export const OverlayOpportunityAssessment = z.object({
  entityType: z.enum(['task', 'process', 'activity', 'occupation']).describe('What type of entity'),
  entityId: z.string().describe('Entity ID'),
  entityName: z.string().describe('Entity name'),

  // Scores for each overlay type
  opportunities: z.array(OverlayOpportunityScore).describe('Opportunity scores by overlay type'),

  // Top recommendations
  topOpportunities: z.array(z.object({
    overlayType: AIOverlayType,
    recommendation: z.string().describe('Why this is a top opportunity'),
    nextSteps: z.array(z.string()).describe('Steps to pursue this'),
  })).max(3).describe('Top 3 overlay opportunities'),
})
export type OverlayOpportunityAssessment = z.infer<typeof OverlayOpportunityAssessment>
