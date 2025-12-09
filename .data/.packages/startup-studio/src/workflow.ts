/**
 * Workflow Orchestration
 *
 * These are the core workflow functions that orchestrate the
 * Startup Studio pipeline:
 *
 * 1. ENRICH: Enrich ontology entities with AI-generated insights
 * 2. GENERATE: Cross-product hypotheses × ontology to create concepts
 * 3. SCORE: Score concepts for viability
 * 4. BRAND: Assign brand families and generate names
 * 5. PRODUCTIZE: Package as productized services
 * 6. DEPLOY: Generate assets and deploy
 * 7. EXPERIMENT: Run validation experiments
 * 8. ANALYZE: Analyze results and iterate
 *
 * Each function is typed with Zod schemas for AI function compatibility.
 */

import { z } from 'zod'
import { Industry, Occupation, Task, Process, Service, OntologyEntity } from './ontology'
import { Hypothesis, HypothesisDimensions } from './hypothesis'
import { EnrichedIndustry, EnrichedOccupation, EnrichedTask, EnrichedProcess, ProblemStack } from './enrichments'
import { ProductizedService, ServicePattern, ServiceTemplate } from './productized-service'
import { AIOverlayType, TaskOverlayBundle, OverlayOpportunityAssessment } from './ai-service-overlay'
import { StartupConcept, StartupName, BrandIdentity, ViabilityScore, GenerationConfig } from './startup'
import { BrandFamily, SubdomainAllocation } from './brand-family'
import { Experiment, ExperimentTemplate, ExperimentBatch, ContentAsset } from './experiment'

// =============================================================================
// WORKFLOW CONTEXT
// =============================================================================

export const WorkflowContext = z.object({
  workflowId: z.string().describe('Unique workflow execution ID'),
  hypothesisId: z.string().describe('Hypothesis being executed'),
  brandFamilyId: z.string().optional().describe('Target brand family'),
  phase: z.enum([
    'enrichment',
    'generation',
    'scoring',
    'branding',
    'productization',
    'deployment',
    'experimentation',
    'analysis',
  ]).describe('Current workflow phase'),
  startedAt: z.string().datetime(),
  config: z.record(z.string(), z.unknown()).describe('Workflow configuration'),
})
export type WorkflowContext = z.infer<typeof WorkflowContext>

// =============================================================================
// PHASE 1: ENRICHMENT FUNCTIONS
// =============================================================================

export const EnrichIndustryInput = z.object({
  industry: Industry.describe('The industry to enrich'),
  depth: z.enum(['basic', 'standard', 'comprehensive']).describe('How deep to go with enrichment'),
})
export type EnrichIndustryInput = z.infer<typeof EnrichIndustryInput>

export const EnrichIndustryOutput = z.object({
  enriched: EnrichedIndustry.describe('The enriched industry with business types, canvas, etc.'),
  confidence: z.number().min(0).max(1).describe('Confidence in the enrichment'),
})
export type EnrichIndustryOutput = z.infer<typeof EnrichIndustryOutput>

/**
 * Enrich an industry with business types, business model canvas,
 * competitive landscape, trends, and AI opportunity analysis.
 */
export const enrichIndustry = z.function()
  .args(EnrichIndustryInput)
  .returns(z.promise(EnrichIndustryOutput))
  .describe('Enrich an industry with deep business intelligence')

export const EnrichOccupationInput = z.object({
  occupation: Occupation.describe('The occupation to enrich'),
  industryContext: z.string().optional().describe('Industry context for more relevant enrichment'),
  depth: z.enum(['basic', 'standard', 'comprehensive']).describe('How deep to go with enrichment'),
})
export type EnrichOccupationInput = z.infer<typeof EnrichOccupationInput>

export const EnrichOccupationOutput = z.object({
  enriched: EnrichedOccupation.describe('The enriched occupation with problem stacks, workflows, etc.'),
  topProblems: z.array(ProblemStack).describe('Top 3 problem stacks to target'),
  confidence: z.number().min(0).max(1).describe('Confidence in the enrichment'),
})
export type EnrichOccupationOutput = z.infer<typeof EnrichOccupationOutput>

/**
 * Enrich an occupation with deep problem analysis (external/internal/philosophical),
 * workflows, pain points, buying triggers, and AI opportunity.
 */
export const enrichOccupation = z.function()
  .args(EnrichOccupationInput)
  .returns(z.promise(EnrichOccupationOutput))
  .describe('Enrich an occupation with pain points, workflows, and problem stacks')

export const EnrichProcessInput = z.object({
  process: Process.describe('The process to enrich'),
  industryContext: z.string().optional().describe('Industry context'),
  occupationContext: z.string().optional().describe('Occupation context'),
  includeDiagrams: z.boolean().describe('Whether to generate Mermaid diagrams'),
})
export type EnrichProcessInput = z.infer<typeof EnrichProcessInput>

export const EnrichProcessOutput = z.object({
  enriched: EnrichedProcess.describe('The enriched process with bottlenecks, diagrams, etc.'),
  diagrams: z.object({
    flowchart: z.string().describe('Mermaid flowchart code'),
    sequence: z.string().describe('Mermaid sequence diagram code'),
    stateDiagram: z.string().describe('Mermaid state diagram code'),
  }).optional(),
  automationOpportunities: z.array(z.object({
    step: z.string(),
    aiApproach: z.string(),
    impact: z.enum(['low', 'medium', 'high']),
  })).describe('AI automation opportunities'),
})
export type EnrichProcessOutput = z.infer<typeof EnrichProcessOutput>

/**
 * Enrich a process with performance characteristics, bottlenecks,
 * handoff points, automation opportunities, and Mermaid diagrams.
 */
export const enrichProcess = z.function()
  .args(EnrichProcessInput)
  .returns(z.promise(EnrichProcessOutput))
  .describe('Enrich a process with analysis and diagrams')

// =============================================================================
// PHASE 2: GENERATION FUNCTIONS
// =============================================================================

export const GenerateConceptsInput = z.object({
  hypothesis: Hypothesis.describe('The hypothesis to generate from'),
  config: GenerationConfig.describe('Generation configuration'),
  batchSize: z.number().optional().describe('Number of concepts per batch'),
})
export type GenerateConceptsInput = z.infer<typeof GenerateConceptsInput>

export const GenerateConceptsOutput = z.object({
  concepts: z.array(StartupConcept).describe('Generated startup concepts'),
  totalGenerated: z.number().describe('Total concepts generated'),
  filteredOut: z.number().describe('Concepts filtered out by constraints'),
  nextBatch: z.boolean().describe('Whether more batches are available'),
})
export type GenerateConceptsOutput = z.infer<typeof GenerateConceptsOutput>

/**
 * Generate startup concepts by crossing hypothesis with ontology dimensions.
 * Applies filters and constraints from the generation config.
 */
export const generateConcepts = z.function()
  .args(GenerateConceptsInput)
  .returns(z.promise(GenerateConceptsOutput))
  .describe('Generate startup concepts from hypothesis × ontology')

export const GenerateOverlaysInput = z.object({
  entityType: z.enum(['task', 'process', 'activity', 'occupation']).describe('Entity type'),
  entityId: z.string().describe('Entity ID'),
  overlayTypes: z.array(AIOverlayType).optional().describe('Specific overlay types to generate'),
})
export type GenerateOverlaysInput = z.infer<typeof GenerateOverlaysInput>

export const GenerateOverlaysOutput = z.object({
  bundle: TaskOverlayBundle.describe('Generated overlay bundle'),
  opportunities: OverlayOpportunityAssessment.describe('Opportunity assessment'),
})
export type GenerateOverlaysOutput = z.infer<typeof GenerateOverlaysOutput>

/**
 * Generate AI service overlays (coaching, training, analysis, etc.)
 * for any task, process, or occupation.
 */
export const generateOverlays = z.function()
  .args(GenerateOverlaysInput)
  .returns(z.promise(GenerateOverlaysOutput))
  .describe('Generate AI overlay services for a task/process/occupation')

// =============================================================================
// PHASE 3: SCORING FUNCTIONS
// =============================================================================

export const ScoreConceptInput = z.object({
  concept: StartupConcept.describe('The concept to score'),
  enrichedIndustry: EnrichedIndustry.optional().describe('Enriched industry data'),
  enrichedOccupation: EnrichedOccupation.optional().describe('Enriched occupation data'),
})
export type ScoreConceptInput = z.infer<typeof ScoreConceptInput>

export const ScoreConceptOutput = z.object({
  score: ViabilityScore.describe('Viability score with dimensions'),
  topStrengths: z.array(z.string()).describe('Top 3 strengths'),
  topWeaknesses: z.array(z.string()).describe('Top 3 weaknesses'),
  recommendation: z.string().describe('Overall recommendation'),
})
export type ScoreConceptOutput = z.infer<typeof ScoreConceptOutput>

/**
 * Score a startup concept for viability across multiple dimensions:
 * market size, problem severity, solution fit, competition, GTM ease,
 * monetization, defensibility, and timing.
 */
export const scoreConcept = z.function()
  .args(ScoreConceptInput)
  .returns(z.promise(ScoreConceptOutput))
  .describe('Score a startup concept for viability')

export const RankConceptsInput = z.object({
  concepts: z.array(StartupConcept).describe('Concepts to rank'),
  weights: z.record(z.string(), z.number()).optional().describe('Custom dimension weights'),
  topN: z.number().optional().describe('Return only top N'),
})
export type RankConceptsInput = z.infer<typeof RankConceptsInput>

export const RankConceptsOutput = z.object({
  ranked: z.array(z.object({
    concept: StartupConcept,
    rank: z.number(),
    score: z.number(),
  })).describe('Ranked concepts'),
  tiers: z.record(z.string(), z.array(z.string())).describe('Concept IDs by tier'),
})
export type RankConceptsOutput = z.infer<typeof RankConceptsOutput>

/**
 * Rank multiple concepts by their viability scores.
 */
export const rankConcepts = z.function()
  .args(RankConceptsInput)
  .returns(z.promise(RankConceptsOutput))
  .describe('Rank concepts by viability score')

// =============================================================================
// PHASE 4: BRANDING FUNCTIONS
// =============================================================================

export const GenerateNameInput = z.object({
  concept: StartupConcept.describe('The concept to name'),
  brandFamily: BrandFamily.optional().describe('Brand family constraints'),
  style: z.enum(['descriptive', 'abstract', 'metaphorical', 'compound']).optional(),
  alternatives: z.number().optional().describe('Number of alternative names'),
})
export type GenerateNameInput = z.infer<typeof GenerateNameInput>

export const GenerateNameOutput = z.object({
  primary: StartupName.describe('Primary recommended name'),
  alternatives: z.array(StartupName).describe('Alternative names'),
  domainAvailability: z.record(z.string(), z.boolean()).describe('Domain availability check'),
})
export type GenerateNameOutput = z.infer<typeof GenerateNameOutput>

/**
 * Generate a name for a startup concept, with domain suggestions.
 */
export const generateName = z.function()
  .args(GenerateNameInput)
  .returns(z.promise(GenerateNameOutput))
  .describe('Generate startup name and domain')

export const GenerateBrandInput = z.object({
  concept: StartupConcept.describe('The concept to brand'),
  name: StartupName.describe('The name to build brand around'),
  brandFamily: BrandFamily.optional().describe('Brand family for consistency'),
})
export type GenerateBrandInput = z.infer<typeof GenerateBrandInput>

export const GenerateBrandOutput = z.object({
  brand: BrandIdentity.describe('Complete brand identity'),
  assets: z.object({
    logoPrompt: z.string().describe('Prompt for logo generation'),
    colorPalette: z.array(z.string()).describe('Full color palette'),
    fontPairings: z.array(z.string()).describe('Recommended font pairings'),
  }),
})
export type GenerateBrandOutput = z.infer<typeof GenerateBrandOutput>

/**
 * Generate a complete brand identity for a concept.
 */
export const generateBrand = z.function()
  .args(GenerateBrandInput)
  .returns(z.promise(GenerateBrandOutput))
  .describe('Generate brand identity')

export const AllocateSubdomainInput = z.object({
  concept: StartupConcept.describe('Concept to allocate subdomain for'),
  brandFamily: BrandFamily.describe('Target brand family'),
  preferredSubdomain: z.string().optional().describe('Preferred subdomain'),
})
export type AllocateSubdomainInput = z.infer<typeof AllocateSubdomainInput>

export const AllocateSubdomainOutput = z.object({
  allocation: SubdomainAllocation.describe('Subdomain allocation'),
  alternatives: z.array(z.string()).describe('Alternative subdomains if preferred unavailable'),
})
export type AllocateSubdomainOutput = z.infer<typeof AllocateSubdomainOutput>

/**
 * Allocate a subdomain within a brand family.
 */
export const allocateSubdomain = z.function()
  .args(AllocateSubdomainInput)
  .returns(z.promise(AllocateSubdomainOutput))
  .describe('Allocate subdomain from brand family')

// =============================================================================
// PHASE 5: PRODUCTIZATION FUNCTIONS
// =============================================================================

export const ProductizeServiceInput = z.object({
  concept: StartupConcept.describe('Concept to productize'),
  pattern: ServicePattern.describe('Service pattern to follow'),
  pricingTiers: z.number().optional().describe('Number of pricing tiers'),
})
export type ProductizeServiceInput = z.infer<typeof ProductizeServiceInput>

export const ProductizeServiceOutput = z.object({
  service: ProductizedService.describe('Productized service definition'),
  landingPageCopy: z.object({
    headline: z.string(),
    subheadline: z.string(),
    features: z.array(z.string()),
    cta: z.string(),
  }).describe('Landing page copy'),
})
export type ProductizeServiceOutput = z.infer<typeof ProductizeServiceOutput>

/**
 * Package a concept as a productized service with clear scope,
 * deliverables, pricing, and process.
 */
export const productizeService = z.function()
  .args(ProductizeServiceInput)
  .returns(z.promise(ProductizeServiceOutput))
  .describe('Package concept as productized service')

// =============================================================================
// PHASE 6: DEPLOYMENT FUNCTIONS
// =============================================================================

export const GenerateAssetsInput = z.object({
  concept: StartupConcept.describe('Concept to generate assets for'),
  assetTypes: z.array(z.enum([
    'landing-page',
    'blog-posts',
    'email-sequence',
    'social-posts',
    'ad-creative',
    'lead-magnet',
  ])).describe('Asset types to generate'),
  count: z.record(z.string(), z.number()).optional().describe('Count per asset type'),
})
export type GenerateAssetsInput = z.infer<typeof GenerateAssetsInput>

export const GenerateAssetsOutput = z.object({
  assets: z.array(ContentAsset).describe('Generated assets'),
  summary: z.object({
    total: z.number(),
    byType: z.record(z.string(), z.number()),
  }),
})
export type GenerateAssetsOutput = z.infer<typeof GenerateAssetsOutput>

/**
 * Generate content assets for a startup concept.
 */
export const generateAssets = z.function()
  .args(GenerateAssetsInput)
  .returns(z.promise(GenerateAssetsOutput))
  .describe('Generate content assets for deployment')

export const DeployConceptInput = z.object({
  concept: StartupConcept.describe('Concept to deploy'),
  subdomain: SubdomainAllocation.describe('Subdomain to deploy to'),
  assets: z.array(ContentAsset).describe('Assets to deploy'),
})
export type DeployConceptInput = z.infer<typeof DeployConceptInput>

export const DeployConceptOutput = z.object({
  url: z.string().describe('Deployed URL'),
  status: z.enum(['deployed', 'pending', 'failed']),
  deployedAssets: z.array(z.string()).describe('Asset IDs deployed'),
})
export type DeployConceptOutput = z.infer<typeof DeployConceptOutput>

/**
 * Deploy a concept to its subdomain with generated assets.
 */
export const deployConcept = z.function()
  .args(DeployConceptInput)
  .returns(z.promise(DeployConceptOutput))
  .describe('Deploy concept to subdomain')

// =============================================================================
// PHASE 7: EXPERIMENTATION FUNCTIONS
// =============================================================================

export const DesignExperimentInput = z.object({
  concept: StartupConcept.describe('Concept to experiment on'),
  template: ExperimentTemplate.optional().describe('Template to use'),
  channel: z.string().optional().describe('Specific channel to test'),
  budget: z.number().optional().describe('Budget for experiment'),
})
export type DesignExperimentInput = z.infer<typeof DesignExperimentInput>

export const DesignExperimentOutput = z.object({
  experiment: Experiment.describe('Designed experiment'),
  requiredAssets: z.array(z.string()).describe('Assets needed'),
  estimatedDuration: z.string().describe('Estimated duration'),
})
export type DesignExperimentOutput = z.infer<typeof DesignExperimentOutput>

/**
 * Design an experiment to validate a startup concept.
 */
export const designExperiment = z.function()
  .args(DesignExperimentInput)
  .returns(z.promise(DesignExperimentOutput))
  .describe('Design validation experiment')

export const RunExperimentBatchInput = z.object({
  concepts: z.array(StartupConcept).describe('Concepts to test'),
  experimentType: z.string().describe('Type of experiment'),
  totalBudget: z.number().describe('Total budget'),
  strategy: z.enum(['parallel', 'sequential', 'staged']).describe('Execution strategy'),
})
export type RunExperimentBatchInput = z.infer<typeof RunExperimentBatchInput>

export const RunExperimentBatchOutput = z.object({
  batch: ExperimentBatch.describe('Created experiment batch'),
  experiments: z.array(Experiment).describe('Individual experiments'),
})
export type RunExperimentBatchOutput = z.infer<typeof RunExperimentBatchOutput>

/**
 * Run a batch of experiments across multiple concepts.
 */
export const runExperimentBatch = z.function()
  .args(RunExperimentBatchInput)
  .returns(z.promise(RunExperimentBatchOutput))
  .describe('Run batch of experiments')

// =============================================================================
// PHASE 8: ANALYSIS FUNCTIONS
// =============================================================================

export const AnalyzeResultsInput = z.object({
  experiment: Experiment.describe('Experiment to analyze'),
  metrics: z.array(z.object({
    type: z.string(),
    value: z.number(),
  })).describe('Collected metrics'),
})
export type AnalyzeResultsInput = z.infer<typeof AnalyzeResultsInput>

export const AnalyzeResultsOutput = z.object({
  result: z.enum(['winner', 'loser', 'inconclusive', 'learning']),
  confidence: z.number().describe('Statistical confidence'),
  insights: z.array(z.string()).describe('Key insights'),
  recommendations: z.array(z.object({
    action: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    rationale: z.string(),
  })).describe('Recommended actions'),
  nextExperiment: z.string().optional().describe('Suggested next experiment'),
})
export type AnalyzeResultsOutput = z.infer<typeof AnalyzeResultsOutput>

/**
 * Analyze experiment results and generate recommendations.
 */
export const analyzeResults = z.function()
  .args(AnalyzeResultsInput)
  .returns(z.promise(AnalyzeResultsOutput))
  .describe('Analyze experiment results')

// =============================================================================
// WORKFLOW ORCHESTRATOR
// =============================================================================

export const PipelineStep = z.object({
  id: z.string().describe('Step ID'),
  name: z.string().describe('Step name'),
  phase: z.string().describe('Workflow phase'),
  function: z.string().describe('Function to execute'),
  input: z.record(z.string(), z.unknown()).describe('Input parameters'),
  dependsOn: z.array(z.string()).optional().describe('Step IDs this depends on'),
  output: z.record(z.string(), z.unknown()).optional().describe('Step output'),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  error: z.string().optional().describe('Error if failed'),
})
export type PipelineStep = z.infer<typeof PipelineStep>

export const WorkflowExecution = z.object({
  id: z.string().describe('Execution ID'),
  workflowId: z.string().describe('Workflow definition ID'),
  context: WorkflowContext,
  steps: z.array(PipelineStep).describe('Workflow steps'),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'paused']),
  progress: z.number().min(0).max(100).describe('Progress percentage'),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  results: z.record(z.string(), z.unknown()).optional().describe('Final results'),
})
export type WorkflowExecution = z.infer<typeof WorkflowExecution>

/**
 * Execute a complete workflow from hypothesis to validated startup.
 */
export const executeWorkflow = z.function()
  .args(z.object({
    hypothesis: Hypothesis,
    config: GenerationConfig,
    brandFamily: BrandFamily.optional(),
    experimentBudget: z.number().optional(),
  }))
  .returns(z.promise(WorkflowExecution))
  .describe('Execute complete startup studio workflow')
