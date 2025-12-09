/**
 * Ontology Enrichments
 *
 * These schemas enrich the base ontology entities with AI-generated
 * business intelligence:
 *
 * - Industries → BusinessTypes, BusinessModelCanvas, competitive dynamics
 * - Occupations → Pain points, workflows, tools, buying triggers
 * - Tasks → Automation potential, time spent, error rates
 * - Processes → Bottlenecks, dependencies, optimization opportunities
 *
 * Each .describe() serves as the AI prompt for generating that field.
 */

import { z } from 'zod'

// =============================================================================
// BUSINESS MODEL CANVAS (for Industries)
// =============================================================================

export const CustomerSegmentCanvas = z.object({
  segment: z.string().describe('Name of the customer segment'),
  description: z.string().describe('Description of who these customers are'),
  size: z.enum(['small', 'medium', 'large']).describe('Relative size of this segment'),
  willingness: z.enum(['low', 'medium', 'high']).describe('Willingness to pay for solutions'),
  accessibility: z.enum(['easy', 'medium', 'hard']).describe('How easy to reach/sell to'),
})
export type CustomerSegmentCanvas = z.infer<typeof CustomerSegmentCanvas>

export const ValuePropositionCanvas = z.object({
  proposition: z.string().describe('The core value proposition'),
  customerJobs: z.array(z.string()).describe('Jobs customers are trying to get done'),
  pains: z.array(z.string()).describe('Customer pains this addresses'),
  gains: z.array(z.string()).describe('Gains customers receive'),
})
export type ValuePropositionCanvas = z.infer<typeof ValuePropositionCanvas>

export const ChannelType = z.enum([
  'direct-sales',
  'inside-sales',
  'partner-reseller',
  'marketplace',
  'self-service',
  'content-marketing',
  'paid-advertising',
  'referral',
  'events-conferences',
  'cold-outreach',
]).describe('Go-to-market channel type')
export type ChannelType = z.infer<typeof ChannelType>

export const RevenueStreamType = z.enum([
  'subscription',
  'transaction-fee',
  'usage-based',
  'licensing',
  'professional-services',
  'advertising',
  'data-monetization',
  'commission',
  'one-time-purchase',
]).describe('Type of revenue stream')
export type RevenueStreamType = z.infer<typeof RevenueStreamType>

export const BusinessModelCanvas = z.object({
  customerSegments: z.array(CustomerSegmentCanvas).describe('Who are the customers?'),
  valuePropositions: z.array(ValuePropositionCanvas).describe('What value do we deliver?'),
  channels: z.array(z.object({
    type: ChannelType,
    effectiveness: z.enum(['low', 'medium', 'high']).describe('How effective for this industry'),
    cost: z.enum(['low', 'medium', 'high']).describe('Relative cost'),
  })).describe('How do we reach customers?'),
  customerRelationships: z.array(z.object({
    type: z.enum(['self-service', 'automated', 'personal', 'dedicated', 'community', 'co-creation']),
    description: z.string().describe('How we maintain the relationship'),
  })).describe('What relationship do customers expect?'),
  revenueStreams: z.array(z.object({
    type: RevenueStreamType,
    description: z.string().describe('How this revenue stream works'),
    percentage: z.number().min(0).max(100).optional().describe('Percentage of total revenue'),
  })).describe('How do we make money?'),
  keyResources: z.array(z.string()).describe('What resources are required?'),
  keyActivities: z.array(z.string()).describe('What activities are critical?'),
  keyPartners: z.array(z.string()).describe('Who are key partners/suppliers?'),
  costStructure: z.object({
    type: z.enum(['cost-driven', 'value-driven']).describe('Cost structure type'),
    fixedCosts: z.array(z.string()).describe('Major fixed costs'),
    variableCosts: z.array(z.string()).describe('Major variable costs'),
  }),
})
export type BusinessModelCanvas = z.infer<typeof BusinessModelCanvas>

// =============================================================================
// BUSINESS TYPE (for Industries)
// =============================================================================

export const BusinessTypeCategory = z.enum([
  'b2b-saas',
  'b2b-services',
  'b2b-marketplace',
  'b2c-saas',
  'b2c-services',
  'b2c-marketplace',
  'b2b2c',
  'd2c-ecommerce',
  'platform',
  'infrastructure',
  'data-provider',
  'agency',
  'consultancy',
]).describe('High-level business type category')
export type BusinessTypeCategory = z.infer<typeof BusinessTypeCategory>

export const BusinessType = z.object({
  id: z.string().describe('Unique identifier for this business type'),
  name: z.string().describe('Name of the business type'),
  category: BusinessTypeCategory,
  description: z.string().describe('What this type of business does'),

  // Market characteristics
  marketDynamics: z.object({
    competitiveness: z.enum(['blue-ocean', 'emerging', 'growing', 'mature', 'declining']).describe('Market maturity'),
    consolidation: z.enum(['fragmented', 'consolidating', 'oligopoly', 'monopoly']).describe('Market structure'),
    barriers: z.enum(['low', 'medium', 'high']).describe('Barriers to entry'),
    regulation: z.enum(['none', 'light', 'moderate', 'heavy']).describe('Regulatory burden'),
  }),

  // Economics
  economics: z.object({
    typicalMargins: z.enum(['low', 'medium', 'high']).describe('Typical gross margins'),
    capitalIntensity: z.enum(['low', 'medium', 'high']).describe('Capital requirements'),
    timeToRevenue: z.enum(['immediate', 'short', 'medium', 'long']).describe('Time to first revenue'),
    scalability: z.enum(['linear', 'sublinear', 'superlinear']).describe('How revenue scales with effort'),
  }),

  // GTM
  typicalGTM: z.object({
    salesCycle: z.enum(['days', 'weeks', 'months', 'quarters', 'years']).describe('Typical sales cycle length'),
    aov: z.enum(['micro', 'low', 'medium', 'high', 'enterprise']).describe('Average order value tier'),
    channels: z.array(ChannelType).describe('Most effective channels'),
    buyerPersonas: z.array(z.string()).describe('Typical buyer personas'),
  }),

  // AI opportunity
  aiOpportunity: z.object({
    automationPotential: z.enum(['low', 'medium', 'high']).describe('How much can be automated with AI'),
    disruptionRisk: z.enum(['low', 'medium', 'high']).describe('Risk of AI disruption'),
    aiUseCases: z.array(z.string()).describe('Key AI use cases in this business type'),
  }),
})
export type BusinessType = z.infer<typeof BusinessType>

// =============================================================================
// ENRICHED INDUSTRY
// =============================================================================

export const CompetitiveLandscape = z.object({
  marketLeaders: z.array(z.string()).describe('Names of market-leading companies'),
  emergingPlayers: z.array(z.string()).describe('Notable emerging/startup players'),
  disruptors: z.array(z.string()).describe('Companies disrupting the industry'),
  consolidationTrends: z.string().describe('M&A and consolidation activity'),
})
export type CompetitiveLandscape = z.infer<typeof CompetitiveLandscape>

export const IndustryTrend = z.object({
  trend: z.string().describe('Name of the trend'),
  description: z.string().describe('What is happening'),
  impact: z.enum(['low', 'medium', 'high', 'transformative']).describe('Impact on the industry'),
  timeframe: z.enum(['now', '1-2-years', '3-5-years', '5-plus-years']).describe('When impact will be felt'),
  opportunity: z.string().describe('Startup opportunity this creates'),
})
export type IndustryTrend = z.infer<typeof IndustryTrend>

export const EnrichedIndustry = z.object({
  industryId: z.string().describe('Reference to base Industry entity'),

  // Business context
  businessTypes: z.array(BusinessType).describe('Common business types in this industry'),
  businessModelCanvas: BusinessModelCanvas.describe('Typical business model canvas'),
  competitiveLandscape: CompetitiveLandscape.describe('Competitive dynamics'),

  // Market intelligence
  trends: z.array(IndustryTrend).describe('Key industry trends'),
  painPoints: z.array(z.string()).describe('Major pain points across the industry'),
  regulations: z.array(z.string()).describe('Key regulations affecting the industry'),
  technologyAdoption: z.enum(['laggard', 'early-majority', 'late-majority', 'innovator']).describe('Tech adoption curve position'),

  // Sizing
  marketSize: z.object({
    tam: z.string().describe('Total addressable market estimate'),
    sam: z.string().describe('Serviceable addressable market estimate'),
    growth: z.string().describe('Annual growth rate'),
  }),

  // AI specific
  aiReadiness: z.object({
    dataAvailability: z.enum(['scarce', 'limited', 'moderate', 'abundant']).describe('Availability of training data'),
    processStandardization: z.enum(['chaotic', 'ad-hoc', 'defined', 'managed', 'optimized']).describe('Process maturity'),
    aiAdoption: z.enum(['none', 'experimenting', 'piloting', 'scaling', 'embedded']).describe('Current AI adoption'),
    topAIUseCases: z.array(z.string()).describe('Most promising AI use cases'),
  }),
})
export type EnrichedIndustry = z.infer<typeof EnrichedIndustry>

// =============================================================================
// OCCUPATION PAIN POINTS & WORKFLOWS
// =============================================================================

// =============================================================================
// STORYBRAND-STYLE PROBLEM ANALYSIS
// =============================================================================

export const ExternalProblem = z.object({
  problem: z.string().describe('The tangible, visible problem (what they can point to)'),
  manifestations: z.array(z.string()).describe('How this problem shows up day-to-day'),
  metrics: z.array(z.string()).describe('Measurable symptoms of this problem'),
  villains: z.array(z.string()).describe('External forces/entities causing this problem'),
  cost: z.string().describe('Quantified cost of this problem (time, money, opportunity)'),
})
export type ExternalProblem = z.infer<typeof ExternalProblem>

export const InternalProblem = z.object({
  feeling: z.string().describe('How this makes them feel (frustrated, overwhelmed, incompetent)'),
  fear: z.string().describe('What they are afraid of happening'),
  doubt: z.string().describe('What they doubt about themselves'),
  desire: z.string().describe('What they secretly want (but may not admit)'),
  identity: z.string().describe('How this affects their professional identity'),
})
export type InternalProblem = z.infer<typeof InternalProblem>

export const PhilosophicalProblem = z.object({
  injustice: z.string().describe('Why this situation is simply wrong/unfair'),
  shouldBe: z.string().describe('How things ought to be in a just world'),
  higherPurpose: z.string().describe('The larger mission or principle at stake'),
  villain: z.string().describe('The philosophical villain (inefficiency, bureaucracy, greed)'),
})
export type PhilosophicalProblem = z.infer<typeof PhilosophicalProblem>

export const ProblemStack = z.object({
  id: z.string().describe('Unique identifier for this problem stack'),
  title: z.string().describe('Short title summarizing the problem'),
  context: z.string().describe('Situation or trigger where this problem arises'),

  external: ExternalProblem.describe('The external, tangible problem'),
  internal: InternalProblem.describe('The internal, emotional problem'),
  philosophical: PhilosophicalProblem.describe('The philosophical, moral problem'),

  // Story elements
  stakes: z.string().describe('What happens if this problem is not solved'),
  transformation: z.string().describe('Who they become when the problem is solved'),
  successLooksLike: z.string().describe('Concrete picture of success'),

  // Solution positioning
  guideEmpathy: z.string().describe('How we show we understand their struggle'),
  guideAuthority: z.string().describe('Why we are qualified to help'),
  plan: z.array(z.string()).min(3).max(5).describe('3-5 step plan to solve the problem'),
  cta: z.string().describe('Clear call to action'),
})
export type ProblemStack = z.infer<typeof ProblemStack>

export const PainPointSeverity = z.enum([
  'annoyance',      // Minor friction
  'frustration',    // Regular frustration
  'blocker',        // Significant obstacle
  'crisis',         // Critical problem
]).describe('How severe is this pain point')
export type PainPointSeverity = z.infer<typeof PainPointSeverity>

export const PainPointFrequency = z.enum([
  'rare',           // Once a year or less
  'occasional',     // Monthly
  'regular',        // Weekly
  'daily',          // Every day
  'constant',       // Multiple times per day
]).describe('How often this pain point is experienced')
export type PainPointFrequency = z.infer<typeof PainPointFrequency>

export const PainPoint = z.object({
  id: z.string().describe('Unique identifier for this pain point'),
  title: z.string().describe('Short title for the pain point'),
  description: z.string().describe('Detailed description of the pain and its impact'),
  severity: PainPointSeverity,
  frequency: PainPointFrequency,

  // Context
  triggers: z.array(z.string()).describe('What triggers this pain point'),
  consequences: z.array(z.string()).describe('What happens if not addressed'),
  workarounds: z.array(z.string()).describe('Current workarounds used'),

  // Solution space
  existingSolutions: z.array(z.string()).describe('Current solutions in market'),
  solutionGaps: z.array(z.string()).describe('What existing solutions miss'),
  idealSolution: z.string().describe('What the ideal solution would look like'),

  // Economics
  timeWasted: z.string().optional().describe('Time wasted per week due to this pain'),
  costImpact: z.string().optional().describe('Financial impact of this pain'),
  willingnessToPay: z.enum(['low', 'medium', 'high']).describe('Willingness to pay for solution'),
})
export type PainPoint = z.infer<typeof PainPoint>

export const WorkflowStep = z.object({
  order: z.number().describe('Step order in workflow'),
  name: z.string().describe('Name of this step'),
  description: z.string().describe('What happens in this step'),
  tools: z.array(z.string()).describe('Tools used in this step'),
  inputs: z.array(z.string()).describe('What this step needs as input'),
  outputs: z.array(z.string()).describe('What this step produces'),
  painPoints: z.array(z.string()).describe('Pain point IDs related to this step'),
  automationPotential: z.enum(['none', 'partial', 'full']).describe('Can AI automate this?'),
  timeSpent: z.string().describe('Typical time spent on this step'),
})
export type WorkflowStep = z.infer<typeof WorkflowStep>

export const Workflow = z.object({
  id: z.string().describe('Unique identifier for this workflow'),
  name: z.string().describe('Name of the workflow'),
  description: z.string().describe('What this workflow accomplishes'),
  frequency: PainPointFrequency.describe('How often this workflow is performed'),
  steps: z.array(WorkflowStep).describe('Steps in the workflow'),
  totalTime: z.string().describe('Total time to complete workflow'),
  bottlenecks: z.array(z.string()).describe('Where the workflow gets stuck'),
})
export type Workflow = z.infer<typeof Workflow>

export const BuyingTrigger = z.object({
  trigger: z.string().describe('What event triggers a buying decision'),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).describe('How urgent when triggered'),
  budget: z.enum(['no-budget', 'discretionary', 'allocated', 'strategic']).describe('Budget availability'),
  decisionMakers: z.array(z.string()).describe('Who is involved in decision'),
  evaluationCriteria: z.array(z.string()).describe('What they evaluate solutions on'),
})
export type BuyingTrigger = z.infer<typeof BuyingTrigger>

export const EnrichedOccupation = z.object({
  occupationId: z.string().describe('Reference to base Occupation entity'),

  // Day in the life
  typicalDay: z.string().describe('Description of a typical work day'),
  responsibilities: z.array(z.string()).describe('Core responsibilities'),
  kpis: z.array(z.string()).describe('Key performance indicators they are measured on'),
  stressors: z.array(z.string()).describe('Main sources of work stress'),

  // Deep problem analysis (StoryBrand-style)
  problemStacks: z.array(ProblemStack).describe('Deep analysis of problems with external/internal/philosophical layers'),
  topProblemIds: z.array(z.string()).describe('IDs of top 3 most critical problem stacks'),

  // Pain points (tactical level)
  painPoints: z.array(PainPoint).describe('Key pain points for this occupation'),
  topPainPointIds: z.array(z.string()).describe('IDs of top 3 most critical pain points'),

  // Workflows
  workflows: z.array(Workflow).describe('Key workflows performed'),
  timeAllocation: z.record(z.string(), z.number()).describe('Percentage of time spent on each activity type'),

  // Tools & Technology
  currentTools: z.array(z.object({
    name: z.string().describe('Tool name'),
    category: z.string().describe('Tool category'),
    satisfaction: z.enum(['hates', 'dislikes', 'neutral', 'likes', 'loves']).describe('Satisfaction level'),
    switching: z.enum(['locked-in', 'reluctant', 'open', 'actively-looking']).describe('Willingness to switch'),
  })).describe('Tools currently used'),
  toolGaps: z.array(z.string()).describe('Tool categories with unmet needs'),

  // Buying behavior
  buyingTriggers: z.array(BuyingTrigger).describe('What triggers purchasing decisions'),
  budgetAuthority: z.enum(['none', 'small', 'moderate', 'large', 'unlimited']).describe('Budget authority level'),
  decisionRole: z.enum(['user', 'influencer', 'decision-maker', 'economic-buyer', 'blocker']).describe('Role in buying decisions'),

  // AI opportunity
  aiOpportunity: z.object({
    tasks: z.array(z.object({
      task: z.string().describe('Task description'),
      automationLevel: z.enum(['augment', 'partial', 'full']).describe('Level of AI automation possible'),
      timeFreed: z.string().describe('Time freed up if automated'),
      resistance: z.enum(['welcome', 'cautious', 'resistant', 'hostile']).describe('Expected resistance to automation'),
    })).describe('Tasks that could be AI-assisted or automated'),
    totalAutomationPotential: z.string().describe('Percentage of role that could be automated'),
    aiReadiness: z.enum(['resistant', 'curious', 'experimenting', 'adopting', 'championing']).describe('AI adoption readiness'),
  }),

  // Messaging hooks
  messagingHooks: z.object({
    headlines: z.array(z.string()).describe('Attention-grabbing headlines for this persona'),
    emailSubjects: z.array(z.string()).describe('Email subject lines that would get opened'),
    adCopy: z.array(z.string()).describe('Short ad copy variations'),
    socialPosts: z.array(z.string()).describe('Social media post ideas'),
    objections: z.array(z.object({
      objection: z.string().describe('Common objection'),
      response: z.string().describe('How to overcome it'),
    })).describe('Common objections and responses'),
  }),
})
export type EnrichedOccupation = z.infer<typeof EnrichedOccupation>

// =============================================================================
// MERMAID DIAGRAMS
// =============================================================================

export const MermaidDiagramType = z.enum([
  'flowchart',      // Process flow
  'sequence',       // Actor interactions over time
  'stateDiagram',   // State transitions
  'erDiagram',      // Entity relationships
  'classDiagram',   // Class/object structure
  'gantt',          // Timeline/schedule
  'journey',        // User journey
  'mindmap',        // Concept hierarchy
]).describe('Type of Mermaid diagram')
export type MermaidDiagramType = z.infer<typeof MermaidDiagramType>

export const MermaidDiagram = z.object({
  type: MermaidDiagramType,
  title: z.string().describe('Diagram title'),
  description: z.string().describe('What this diagram illustrates'),
  code: z.string().describe('Mermaid diagram code'),
})
export type MermaidDiagram = z.infer<typeof MermaidDiagram>

// =============================================================================
// TASK DIAGRAMS
// =============================================================================

export const TaskDiagrams = z.object({
  flowchart: MermaidDiagram.describe('Flowchart showing task execution steps'),
  sequence: MermaidDiagram.optional().describe('Sequence diagram if task involves multiple actors'),
  stateDiagram: MermaidDiagram.optional().describe('State diagram for tasks with clear states'),
})
export type TaskDiagrams = z.infer<typeof TaskDiagrams>

// =============================================================================
// ENRICHED TASK
// =============================================================================

export const EnrichedTask = z.object({
  taskId: z.string().describe('Reference to base Task entity'),

  // Execution details
  averageTime: z.string().describe('Average time to complete this task'),
  frequency: PainPointFrequency.describe('How often this task is performed'),
  complexity: z.enum(['trivial', 'simple', 'moderate', 'complex', 'expert']).describe('Task complexity'),
  errorRate: z.enum(['rare', 'occasional', 'common', 'frequent']).describe('How often errors occur'),

  // Dependencies
  prerequisites: z.array(z.string()).describe('What must be done before this task'),
  blockedBy: z.array(z.string()).describe('Common blockers for this task'),
  enables: z.array(z.string()).describe('What this task enables'),

  // Automation
  automationPotential: z.object({
    level: z.enum(['none', 'assist', 'partial', 'full']).describe('Automation potential'),
    currentState: z.enum(['manual', 'tool-assisted', 'semi-automated', 'automated']).describe('Current automation state'),
    barriers: z.array(z.string()).describe('Barriers to automation'),
    aiApproach: z.string().describe('How AI could address this task'),
  }),

  // Value
  businessImpact: z.enum(['low', 'medium', 'high', 'critical']).describe('Business impact if done wrong'),
  skillRequired: z.enum(['entry', 'intermediate', 'advanced', 'expert']).describe('Skill level required'),

  // Diagrams
  diagrams: TaskDiagrams.describe('Mermaid diagrams visualizing the task'),
})
export type EnrichedTask = z.infer<typeof EnrichedTask>

// =============================================================================
// ENRICHED PROCESS
// =============================================================================

export const ProcessBottleneck = z.object({
  location: z.string().describe('Where in the process the bottleneck occurs'),
  cause: z.string().describe('Root cause of the bottleneck'),
  impact: z.string().describe('Impact on overall process'),
  solutionApproaches: z.array(z.string()).describe('Potential solutions'),
})
export type ProcessBottleneck = z.infer<typeof ProcessBottleneck>

// =============================================================================
// PROCESS DIAGRAMS
// =============================================================================

export const ProcessDiagrams = z.object({
  flowchart: MermaidDiagram.describe('Flowchart showing process steps and decision points'),
  sequence: MermaidDiagram.describe('Sequence diagram showing actor interactions'),
  stateDiagram: MermaidDiagram.describe('State diagram showing process states and transitions'),
  erDiagram: MermaidDiagram.describe('Entity relationship diagram showing data entities'),
  journey: MermaidDiagram.describe('User journey through the process'),
})
export type ProcessDiagrams = z.infer<typeof ProcessDiagrams>

export const EnrichedProcess = z.object({
  processId: z.string().describe('Reference to base Process entity'),

  // Process characteristics
  maturityLevel: z.enum(['initial', 'managed', 'defined', 'quantified', 'optimizing']).describe('CMMI maturity level'),
  variability: z.enum(['standard', 'some-variation', 'high-variation', 'chaotic']).describe('Process variability'),
  documentation: z.enum(['none', 'partial', 'complete', 'automated']).describe('Documentation quality'),

  // Performance
  cycleTime: z.string().describe('Typical cycle time'),
  throughput: z.string().describe('Typical throughput'),
  qualityRate: z.string().describe('First-pass quality rate'),
  costPerExecution: z.string().optional().describe('Cost per process execution'),

  // Pain points
  bottlenecks: z.array(ProcessBottleneck).describe('Process bottlenecks'),
  handoffPoints: z.array(z.object({
    from: z.string().describe('Who hands off'),
    to: z.string().describe('Who receives'),
    friction: z.enum(['smooth', 'some-friction', 'problematic', 'broken']).describe('Handoff quality'),
  })).describe('Handoff points in the process'),

  // Optimization
  automationOpportunities: z.array(z.object({
    step: z.string().describe('Which step to automate'),
    approach: z.string().describe('How to automate'),
    effort: z.enum(['low', 'medium', 'high']).describe('Implementation effort'),
    impact: z.enum(['low', 'medium', 'high']).describe('Expected impact'),
  })).describe('Automation opportunities'),

  // Integration
  systemsTouched: z.array(z.string()).describe('Systems involved in this process'),
  dataFlows: z.array(z.object({
    from: z.string().describe('Data source'),
    to: z.string().describe('Data destination'),
    format: z.string().describe('Data format'),
    frequency: z.string().describe('How often data flows'),
  })).describe('Data flows in the process'),

  // Diagrams
  diagrams: ProcessDiagrams.describe('Mermaid diagrams visualizing the process'),
})
export type EnrichedProcess = z.infer<typeof EnrichedProcess>
