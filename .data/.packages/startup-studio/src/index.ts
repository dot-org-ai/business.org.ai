/**
 * Startup Studio
 *
 * A complete type system for programmatic startup generation.
 *
 * The workflow:
 * 1. Define HYPOTHESES (meta-strategies like "Headless SaaS for Agents")
 * 2. ENRICH ontology entities with AI-generated business intelligence
 * 3. GENERATE millions of startup concepts via cross-product
 * 4. SCORE concepts for viability
 * 5. BRAND concepts with names, identities, and subdomain allocation
 * 6. PRODUCTIZE as packaged AI services
 * 7. DEPLOY to brand family subdomains
 * 8. EXPERIMENT with SEO, social, outbound, paid channels
 * 9. ANALYZE results and iterate
 *
 * All types use Zod schemas with .describe() for AI function prompts.
 */

// =============================================================================
// ONTOLOGY - The foundational business taxonomy
// =============================================================================
export {
  // Base entity
  OntologyEntity,

  // Core entities
  Occupation,
  OccupationCategory,
  OccupationSegment,
  Industry,
  IndustryVertical,
  Task,
  Activity,
  TaskCategory,
  Process,
  ProcessCategory,
  Service,
  ServiceDeliveryModel,
  Product,
  Technology,
  Tool,
  TechCategory,
  Location,
  Market,
  MarketRegion,
  MarketSize,

  // Collections
  Ontology,
  OntologyRelationship,
  RelationshipType,
} from './ontology'

// =============================================================================
// HYPOTHESIS - Meta-strategies for startup generation
// =============================================================================
export {
  // Customer & value
  TargetCustomerType,
  CustomerSegment,
  ValuePropAngle,
  ValueProposition,

  // Pricing
  PricingModel,
  PricingStrategy,

  // Business model
  BusinessModelType,
  BusinessModel,

  // Hypothesis
  HypothesisStatus,
  OntologyDimensionConfig,
  HypothesisDimensions,
  Hypothesis,
  HypothesisExample,
  HypothesisRegistry,
} from './hypothesis'

// =============================================================================
// ENRICHMENTS - AI-generated business intelligence
// =============================================================================
export {
  // Industry enrichments
  CustomerSegmentCanvas,
  ValuePropositionCanvas,
  ChannelType,
  RevenueStreamType,
  BusinessModelCanvas,
  BusinessTypeCategory,
  BusinessType,
  CompetitiveLandscape,
  IndustryTrend,
  EnrichedIndustry,

  // Problem analysis (StoryBrand-style)
  ExternalProblem,
  InternalProblem,
  PhilosophicalProblem,
  ProblemStack,

  // Occupation enrichments
  PainPointSeverity,
  PainPointFrequency,
  PainPoint,
  WorkflowStep,
  Workflow,
  BuyingTrigger,
  EnrichedOccupation,

  // Task enrichments
  EnrichedTask,

  // Process enrichments
  MermaidDiagramType,
  MermaidDiagram,
  ProcessDiagrams,
  TaskDiagrams,
  ProcessBottleneck,
  EnrichedProcess,
} from './enrichments'

// =============================================================================
// PRODUCTIZED SERVICE - Packaging AI services
// =============================================================================
export {
  // Service fundamentals
  ServiceScope,
  ServiceDeliverable,
  ServiceTimeline,

  // Pricing
  PricingTier,
  AddOn,
  ServicePricing,

  // Process
  ProcessStep,
  ServiceProcess,

  // Positioning
  ServiceCategory,
  ServicePositioning,

  // Proof
  CaseStudy,
  ServiceProof,

  // FAQ & objections
  FAQ,
  ObjectionHandler,

  // AI specifics
  AICapability,
  HumanInLoop,
  AIServiceConfig,

  // Complete service
  ProductizedService,
  ServicePackage,
  ServiceCatalog,

  // Templates
  ServicePattern,
  ServiceTemplate,
} from './productized-service'

// =============================================================================
// AI SERVICE OVERLAY - Coaching, training, analysis for any task
// =============================================================================
export {
  // Overlay types
  AIOverlayType,
  AIOverlayTiming,

  // Specific overlays
  CoachingOverlay,
  TrainingOverlay,
  AnalysisOverlay,
  ConsultingOverlay,
  PlanningOverlay,
  ReviewOverlay,
  DocumentationOverlay,
  MonitoringOverlay,

  // Unified overlay
  AIOverlayService,

  // Bundles
  TaskOverlayBundle,
  ProcessOverlayBundle,

  // Opportunity scoring
  OverlayOpportunityScore,
  OverlayOpportunityAssessment,
} from './ai-service-overlay'

// =============================================================================
// STARTUP - The core startup concept entity
// =============================================================================
export {
  // Ontology reference
  OntologyTarget,

  // Naming & branding
  BrandTone,
  StartupName,
  BrandIdentity,

  // Viability
  ViabilityDimension,
  ViabilityScore,

  // Startup concept
  StartupConceptStatus,
  StartupConcept,

  // Variants
  VariantType,
  StartupVariant,

  // Generation
  GenerationConfig,

  // Portfolio
  StartupPortfolio,
} from './startup'

// =============================================================================
// BRAND FAMILY - Subdomain strategy
// =============================================================================
export {
  // Domain strategy
  TLDCategory,
  DomainTLD,
  SubdomainPattern,
  SubdomainNamingRule,

  // Brand family
  BrandFamilyType,
  BrandFamilyPositioning,
  BrandFamilyVisual,
  BrandFamily,

  // Allocation
  SubdomainAllocation,
  BrandFamilyRegistry,

  // Templates
  BrandFamilyTemplate,
  BRAND_FAMILY_TEMPLATES,
} from './brand-family'

// =============================================================================
// EXPERIMENT - Validation experiments
// =============================================================================
export {
  // Channels
  ExperimentChannel,
  ExperimentChannelCategory,

  // Types
  ExperimentType,

  // Metrics
  MetricType,
  Metric,

  // Design
  ExperimentHypothesis,
  ExperimentVariant,
  ExperimentDesign,

  // Assets
  ContentAsset,

  // Experiment
  ExperimentStatus,
  ExperimentResult,
  Experiment,

  // Templates & batches
  ExperimentTemplate,
  ExperimentBatch,

  // Funnel
  FunnelStage,
  Funnel,

  // Dashboard
  ExperimentDashboard,
} from './experiment'

// =============================================================================
// WORKFLOW - Orchestration functions
// =============================================================================
export {
  // Context
  WorkflowContext,

  // Enrichment functions
  EnrichIndustryInput,
  EnrichIndustryOutput,
  enrichIndustry,
  EnrichOccupationInput,
  EnrichOccupationOutput,
  enrichOccupation,
  EnrichProcessInput,
  EnrichProcessOutput,
  enrichProcess,

  // Generation functions
  GenerateConceptsInput,
  GenerateConceptsOutput,
  generateConcepts,
  GenerateOverlaysInput,
  GenerateOverlaysOutput,
  generateOverlays,

  // Scoring functions
  ScoreConceptInput,
  ScoreConceptOutput,
  scoreConcept,
  RankConceptsInput,
  RankConceptsOutput,
  rankConcepts,

  // Branding functions
  GenerateNameInput,
  GenerateNameOutput,
  generateName,
  GenerateBrandInput,
  GenerateBrandOutput,
  generateBrand,
  AllocateSubdomainInput,
  AllocateSubdomainOutput,
  allocateSubdomain,

  // Productization functions
  ProductizeServiceInput,
  ProductizeServiceOutput,
  productizeService,

  // Deployment functions
  GenerateAssetsInput,
  GenerateAssetsOutput,
  generateAssets,
  DeployConceptInput,
  DeployConceptOutput,
  deployConcept,

  // Experimentation functions
  DesignExperimentInput,
  DesignExperimentOutput,
  designExperiment,
  RunExperimentBatchInput,
  RunExperimentBatchOutput,
  runExperimentBatch,

  // Analysis functions
  AnalyzeResultsInput,
  AnalyzeResultsOutput,
  analyzeResults,

  // Orchestration
  PipelineStep,
  WorkflowExecution,
  executeWorkflow,
} from './workflow'
