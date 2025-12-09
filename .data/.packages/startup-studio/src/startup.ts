/**
 * Startup Concept Schemas
 *
 * A Startup is the concrete manifestation of crossing:
 * - A Hypothesis (meta-strategy)
 * - Ontology dimensions (occupation, industry, process, etc.)
 * - Positioning variants (branding, pricing, value prop)
 * - AI Service Overlays (coaching, analysis, etc.)
 *
 * This produces millions of startup concepts that can then be
 * filtered, scored, and experimented with.
 */

import { z } from 'zod'
import { Hypothesis, BusinessModel, ValueProposition, PricingStrategy } from './hypothesis'
import { ProductizedService, ServicePattern } from './productized-service'
import { AIOverlayType, TaskOverlayBundle } from './ai-service-overlay'
import { ProblemStack } from './enrichments'

// =============================================================================
// ONTOLOGY REFERENCE (what this startup targets)
// =============================================================================

export const OntologyTarget = z.object({
  occupationId: z.string().optional().describe('Target occupation from ontology'),
  occupationName: z.string().optional().describe('Occupation name'),
  industryId: z.string().optional().describe('Target industry from ontology'),
  industryName: z.string().optional().describe('Industry name'),
  processId: z.string().optional().describe('Target process from ontology'),
  processName: z.string().optional().describe('Process name'),
  taskId: z.string().optional().describe('Target task from ontology'),
  taskName: z.string().optional().describe('Task name'),
  serviceId: z.string().optional().describe('Target service from ontology'),
  serviceName: z.string().optional().describe('Service name'),
})
export type OntologyTarget = z.infer<typeof OntologyTarget>

// =============================================================================
// STARTUP NAMING & BRANDING
// =============================================================================

export const BrandTone = z.enum([
  'professional',     // Corporate, trustworthy
  'technical',        // Developer-focused, precise
  'friendly',         // Approachable, warm
  'playful',          // Fun, creative
  'bold',             // Confident, disruptive
  'minimal',          // Clean, simple
  'premium',          // Luxury, high-end
]).describe('Brand voice and visual tone')
export type BrandTone = z.infer<typeof BrandTone>

export const StartupName = z.object({
  name: z.string().describe('The startup name'),
  tagline: z.string().describe('Short tagline (max 10 words)'),
  domain: z.string().describe('Primary domain name'),
  alternativeDomains: z.array(z.string()).describe('Alternative domain options'),

  // Naming analysis
  naming: z.object({
    pattern: z.enum([
      'compound',         // Two words combined (e.g., Facebook)
      'portmanteau',      // Blended words (e.g., Pinterest)
      'misspelling',      // Intentional misspelling (e.g., Lyft)
      'suffix',           // Word + suffix (e.g., Shopify)
      'prefix',           // Prefix + word (e.g., Instagram)
      'acronym',          // Acronym (e.g., IBM)
      'real-word',        // Real word (e.g., Apple)
      'abstract',         // Made-up word (e.g., Kodak)
      'descriptive',      // Describes function (e.g., Salesforce)
      'metaphor',         // Metaphorical (e.g., Amazon)
    ]).describe('Naming pattern used'),
    pronunciation: z.string().describe('Phonetic pronunciation'),
    memorability: z.enum(['low', 'medium', 'high']).describe('How memorable'),
    spellability: z.enum(['easy', 'medium', 'hard']).describe('How easy to spell'),
  }),
})
export type StartupName = z.infer<typeof StartupName>

export const BrandIdentity = z.object({
  name: StartupName,
  tone: BrandTone,

  // Visual identity hints
  visual: z.object({
    primaryColor: z.string().describe('Primary brand color (hex)'),
    secondaryColor: z.string().describe('Secondary brand color (hex)'),
    iconStyle: z.enum(['geometric', 'organic', 'abstract', 'lettermark', 'mascot']).describe('Icon/logo style'),
    typography: z.enum(['sans-serif', 'serif', 'mono', 'display']).describe('Typography style'),
  }),

  // Voice
  voice: z.object({
    personality: z.array(z.string()).describe('3-5 personality traits'),
    doSay: z.array(z.string()).describe('Phrases we would say'),
    dontSay: z.array(z.string()).describe('Phrases we avoid'),
  }),
})
export type BrandIdentity = z.infer<typeof BrandIdentity>

// =============================================================================
// BRAND FAMILY & SUBDOMAIN STRATEGY
// =============================================================================

export const BrandFamily = z.object({
  id: z.string().describe('Brand family identifier'),
  name: z.string().describe('Brand family name'),
  rootDomain: z.string().describe('Root domain (e.g., "headless.ly", "agentic.services")'),
  positioning: z.string().describe('What this brand family represents'),
  tone: BrandTone,

  // Subdomain strategy
  subdomainPattern: z.enum([
    'occupation',       // cfo.headless.ly
    'industry',         // healthcare.headless.ly
    'process',          // invoicing.headless.ly
    'task',             // scheduling.headless.ly
    'geography',        // uk.headless.ly
    'product',          // pro.headless.ly
  ]).describe('What subdomains represent'),

  // Examples
  examples: z.array(z.object({
    subdomain: z.string().describe('Full subdomain'),
    concept: z.string().describe('What this would be'),
  })).describe('Example subdomains'),
})
export type BrandFamily = z.infer<typeof BrandFamily>

// =============================================================================
// STARTUP VIABILITY SCORING
// =============================================================================

export const ViabilityDimension = z.object({
  dimension: z.string().describe('What is being scored'),
  score: z.number().min(0).max(100).describe('Score 0-100'),
  weight: z.number().min(0).max(1).describe('Weight in overall score'),
  rationale: z.string().describe('Why this score'),
  signals: z.array(z.string()).describe('Supporting signals/evidence'),
})
export type ViabilityDimension = z.infer<typeof ViabilityDimension>

export const ViabilityScore = z.object({
  overall: z.number().min(0).max(100).describe('Overall viability score'),

  dimensions: z.object({
    marketSize: ViabilityDimension.describe('TAM/SAM potential'),
    problemSeverity: ViabilityDimension.describe('How painful the problem is'),
    solutionFit: ViabilityDimension.describe('How well AI solves it'),
    competition: ViabilityDimension.describe('Competitive landscape (higher=less competition)'),
    gtmEase: ViabilityDimension.describe('Ease of reaching customers'),
    monetization: ViabilityDimension.describe('Ability to monetize'),
    defensibility: ViabilityDimension.describe('Moat potential'),
    timing: ViabilityDimension.describe('Market timing'),
  }),

  // Tier classification
  tier: z.enum(['S', 'A', 'B', 'C', 'D']).describe('Quality tier'),
  recommendation: z.enum([
    'pursue-aggressively',
    'test-hypothesis',
    'explore-further',
    'deprioritize',
    'skip',
  ]).describe('Recommendation'),
})
export type ViabilityScore = z.infer<typeof ViabilityScore>

// =============================================================================
// STARTUP CONCEPT (The Core Entity)
// =============================================================================

export const StartupConceptStatus = z.enum([
  'generated',        // Just generated, not reviewed
  'scored',           // Viability scored
  'selected',         // Selected for experimentation
  'experimenting',    // Active experiments running
  'validated',        // Hypothesis validated
  'invalidated',      // Hypothesis invalidated
  'building',         // Building the product
  'launched',         // Product launched
  'paused',           // Paused/on hold
  'killed',           // Killed/abandoned
]).describe('Current status of the startup concept')
export type StartupConceptStatus = z.infer<typeof StartupConceptStatus>

export const StartupConcept = z.object({
  // Identity
  id: z.string().describe('Unique identifier for this startup concept'),
  slug: z.string().describe('URL-friendly slug'),
  version: z.number().describe('Concept version (for iterations)'),

  // Origin
  hypothesisId: z.string().describe('Parent hypothesis that generated this'),
  ontologyTarget: OntologyTarget.describe('What ontology entities this targets'),

  // Core positioning
  name: StartupName.describe('Startup name and domain'),
  brand: BrandIdentity.describe('Full brand identity'),
  brandFamilyId: z.string().optional().describe('Brand family this belongs to'),

  // What it does
  oneLiner: z.string().max(100).describe('One line description (max 100 chars)'),
  pitch: z.string().max(500).describe('Elevator pitch (max 500 chars)'),
  problem: ProblemStack.describe('The problem being solved (external/internal/philosophical)'),
  solution: z.string().describe('How we solve the problem'),

  // AI Service definition
  serviceType: z.enum([
    'full-automation',        // AI does the entire task
    'augmentation',           // AI assists human
    'overlay',                // AI provides coaching/analysis/etc overlay
    'platform',               // AI-powered platform
    'api',                    // API for other systems
  ]).describe('Type of AI service'),
  aiOverlays: z.array(AIOverlayType).describe('AI overlay types if applicable'),
  productizedService: ProductizedService.optional().describe('If packaged as productized service'),

  // Business model
  businessModel: BusinessModel.describe('Business model details'),
  valueProps: z.array(ValueProposition).describe('Value propositions'),
  pricing: PricingStrategy.describe('Pricing strategy'),

  // Scoring
  viability: ViabilityScore.describe('Viability assessment'),

  // Status & tracking
  status: StartupConceptStatus,
  createdAt: z.string().datetime().describe('When concept was generated'),
  updatedAt: z.string().datetime().describe('Last update time'),
  createdBy: z.enum(['system', 'human', 'hybrid']).describe('How it was created'),

  // Variants
  variants: z.array(z.string()).optional().describe('IDs of variant concepts'),
  parentConceptId: z.string().optional().describe('If this is a variant, parent ID'),

  // Tags & organization
  tags: z.array(z.string()).describe('Tags for filtering'),
  notes: z.string().optional().describe('Internal notes'),
})
export type StartupConcept = z.infer<typeof StartupConcept>

// =============================================================================
// STARTUP VARIANTS
// =============================================================================

export const VariantType = z.enum([
  'branding',         // Different brand/name
  'pricing',          // Different pricing model
  'positioning',      // Different value prop angle
  'geography',        // Different target geography
  'language',         // Different language
  'segment',          // Different customer segment
  'feature',          // Different feature focus
]).describe('Type of variant')
export type VariantType = z.infer<typeof VariantType>

export const StartupVariant = z.object({
  id: z.string().describe('Variant ID'),
  parentConceptId: z.string().describe('Parent concept ID'),
  variantType: VariantType,
  description: z.string().describe('What makes this variant different'),

  // Override fields (only include what's different)
  nameOverride: StartupName.optional(),
  brandOverride: BrandIdentity.partial().optional(),
  pricingOverride: PricingStrategy.optional(),
  valuePropsOverride: z.array(ValueProposition).optional(),
  geoTarget: z.string().optional().describe('Target geography if geo variant'),
  language: z.string().optional().describe('Target language if language variant'),
})
export type StartupVariant = z.infer<typeof StartupVariant>

// =============================================================================
// STARTUP GENERATION CONFIG
// =============================================================================

export const GenerationConfig = z.object({
  // Source hypothesis
  hypothesisId: z.string().describe('Hypothesis to generate from'),

  // Ontology filters
  ontologyFilters: z.object({
    occupationIds: z.array(z.string()).optional(),
    industryIds: z.array(z.string()).optional(),
    processIds: z.array(z.string()).optional(),
    taskIds: z.array(z.string()).optional(),
    occupationSegments: z.array(z.string()).optional(),
    industryVerticals: z.array(z.string()).optional(),
  }),

  // Generation controls
  controls: z.object({
    maxConcepts: z.number().describe('Max concepts to generate'),
    minViabilityScore: z.number().describe('Min score to include'),
    includeVariants: z.boolean().describe('Generate variants'),
    variantsPerConcept: z.number().optional().describe('Variants per concept'),
    variantTypes: z.array(VariantType).optional().describe('Which variant types'),
  }),

  // Brand family assignment
  brandFamilies: z.array(z.string()).optional().describe('Brand families to assign to'),

  // AI overlay config
  aiOverlayConfig: z.object({
    includeOverlays: z.boolean().describe('Generate AI overlay bundles'),
    overlayTypes: z.array(AIOverlayType).optional().describe('Which overlay types'),
  }),
})
export type GenerationConfig = z.infer<typeof GenerationConfig>

// =============================================================================
// STARTUP PORTFOLIO
// =============================================================================

export const StartupPortfolio = z.object({
  id: z.string().describe('Portfolio ID'),
  name: z.string().describe('Portfolio name'),
  description: z.string().describe('Portfolio description'),

  // Concepts
  concepts: z.array(z.string()).describe('Concept IDs in this portfolio'),

  // Organization
  hypotheses: z.array(z.string()).describe('Hypotheses represented'),
  brandFamilies: z.array(z.string()).describe('Brand families represented'),

  // Stats
  stats: z.object({
    totalConcepts: z.number(),
    byStatus: z.record(StartupConceptStatus, z.number()),
    byTier: z.record(z.string(), z.number()),
    avgViabilityScore: z.number(),
  }),

  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type StartupPortfolio = z.infer<typeof StartupPortfolio>
