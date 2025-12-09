/**
 * Hypothesis & Business Model Schemas
 *
 * A Hypothesis is a meta-strategy that defines a class of startups.
 * Examples:
 *   - "Headless SaaS for Agents NOT Humans"
 *   - "On-Demand AI-Delivered Services-as-Software"
 *   - "Vertical AI Agents by Occupation"
 *
 * Each hypothesis generates thousands of startup concepts when
 * cross-producted with ontology dimensions.
 */

import { z } from 'zod'
import {
  IndustryVertical,
  OccupationSegment,
  ProcessCategory,
  ServiceDeliveryModel,
  TechCategory,
} from './ontology'

// =============================================================================
// TARGET CUSTOMER
// =============================================================================

export const TargetCustomerType = z.enum([
  'agent',          // AI agents consume the service (API-first, no UI)
  'human',          // Traditional human users with UI
  'hybrid',         // Both agents and humans (API + UI)
]).describe('Primary consumer of the product - AI agents, humans, or both')
export type TargetCustomerType = z.infer<typeof TargetCustomerType>

export const CustomerSegment = z.enum([
  'enterprise',     // Large enterprises (1000+ employees)
  'mid-market',     // Mid-market companies (100-1000 employees)
  'smb',            // Small and medium businesses (10-100 employees)
  'startup',        // Startups and early-stage companies
  'solopreneur',    // Individual entrepreneurs and freelancers
  'agency',         // Marketing, design, dev agencies
  'consumer',       // Individual consumers (B2C)
]).describe('Business size segment targeted by the startup')
export type CustomerSegment = z.infer<typeof CustomerSegment>

// =============================================================================
// VALUE PROPOSITION
// =============================================================================

export const ValuePropAngle = z.enum([
  'speed',          // Faster than alternatives
  'cost',           // Cheaper than alternatives
  'quality',        // Better output than alternatives
  'ease',           // Easier to use than alternatives
  'compliance',     // Meets regulatory requirements
  'integration',    // Better integrates with existing tools
  'automation',     // Reduces manual work
  'intelligence',   // Provides insights/recommendations
  'scale',          // Handles more volume/complexity
  'reliability',    // More dependable than alternatives
]).describe('Primary angle of value proposition differentiation')
export type ValuePropAngle = z.infer<typeof ValuePropAngle>

export const ValueProposition = z.object({
  primary: ValuePropAngle.describe('The main value proposition angle'),
  secondary: ValuePropAngle.optional().describe('Supporting value proposition angle'),
  statement: z.string().describe('One-sentence value proposition statement'),
  quantified: z.string().optional().describe('Quantified benefit (e.g., "10x faster", "90% cost reduction")'),
})
export type ValueProposition = z.infer<typeof ValueProposition>

// =============================================================================
// PRICING MODEL
// =============================================================================

export const PricingModel = z.enum([
  'usage',          // Pay per API call, token, transaction
  'seat',           // Pay per user/seat
  'flat',           // Flat monthly/annual fee
  'tiered',         // Tiered pricing based on features/limits
  'freemium',       // Free tier with paid upgrades
  'outcome',        // Pay for results/outcomes
  'hybrid',         // Combination of models
  'marketplace',    // Take rate on transactions
  'credits',        // Pre-purchased credits consumed over time
]).describe('Primary revenue/pricing model for the startup')
export type PricingModel = z.infer<typeof PricingModel>

export const PricingStrategy = z.object({
  model: PricingModel,
  freeTrialDays: z.number().optional().describe('Number of days for free trial'),
  freeTier: z.boolean().describe('Whether a free tier exists'),
  startingPrice: z.number().optional().describe('Lowest paid price point in USD/month'),
  enterpriseCustom: z.boolean().describe('Whether enterprise gets custom pricing'),
})
export type PricingStrategy = z.infer<typeof PricingStrategy>

// =============================================================================
// BUSINESS MODEL
// =============================================================================

export const BusinessModelType = z.enum([
  'saas',           // Software-as-a-Service
  'paas',           // Platform-as-a-Service
  'api',            // API-as-a-Service
  'marketplace',    // Two-sided marketplace
  'agency',         // Service delivery agency model
  'productized',    // Productized service
  'data',           // Data-as-a-Service
  'infrastructure', // Infrastructure provider
]).describe('Fundamental business model type')
export type BusinessModelType = z.infer<typeof BusinessModelType>

export const BusinessModel = z.object({
  type: BusinessModelType,
  targetCustomer: TargetCustomerType,
  segments: z.array(CustomerSegment).describe('Target customer segments in priority order'),
  delivery: ServiceDeliveryModel,
  pricing: PricingStrategy,
  valueProps: z.array(ValueProposition).min(1).max(3).describe('Value propositions (1-3)'),
  moat: z.string().describe('Competitive moat or unfair advantage'),
})
export type BusinessModel = z.infer<typeof BusinessModel>

// =============================================================================
// HYPOTHESIS
// =============================================================================

export const HypothesisStatus = z.enum([
  'draft',          // Still being defined
  'active',         // Actively generating startups
  'paused',         // Temporarily paused
  'validated',      // Proven with successful startups
  'invalidated',    // Disproven, no longer pursuing
]).describe('Current status of the hypothesis')
export type HypothesisStatus = z.infer<typeof HypothesisStatus>

export const OntologyDimensionConfig = z.object({
  enabled: z.boolean().describe('Whether this dimension is used in cross-product'),
  filter: z.object({
    ids: z.array(z.string()).optional().describe('Specific IDs to include'),
    excludeIds: z.array(z.string()).optional().describe('Specific IDs to exclude'),
    levels: z.array(z.number()).optional().describe('Hierarchy levels to include'),
    namePattern: z.string().optional().describe('Regex pattern for name matching'),
    limit: z.number().optional().describe('Maximum entities to include'),
  }).optional().describe('Filtering criteria for this dimension'),
  priority: z.number().min(1).max(10).describe('Priority weight for scoring (1-10)'),
})
export type OntologyDimensionConfig = z.infer<typeof OntologyDimensionConfig>

export const HypothesisDimensions = z.object({
  occupations: OntologyDimensionConfig.describe('Configuration for occupation dimension'),
  industries: OntologyDimensionConfig.describe('Configuration for industry dimension'),
  processes: OntologyDimensionConfig.describe('Configuration for process dimension'),
  tasks: OntologyDimensionConfig.describe('Configuration for task dimension'),
  services: OntologyDimensionConfig.describe('Configuration for service dimension'),
  technologies: OntologyDimensionConfig.describe('Configuration for technology/tool dimension'),
})
export type HypothesisDimensions = z.infer<typeof HypothesisDimensions>

export const Hypothesis = z.object({
  id: z.string().describe('Unique identifier for the hypothesis (kebab-case)'),
  name: z.string().describe('Human-readable name for the hypothesis'),
  thesis: z.string().describe('Core belief statement that this hypothesis tests'),
  description: z.string().describe('Detailed description of the hypothesis and its rationale'),

  // Business model defaults
  businessModel: BusinessModel.describe('Default business model for startups from this hypothesis'),

  // Targeting
  primaryVerticals: z.array(IndustryVertical).describe('Primary industry verticals to target'),
  primarySegments: z.array(OccupationSegment).describe('Primary occupation segments to target'),

  // Ontology configuration
  dimensions: HypothesisDimensions.describe('Configuration for each ontology dimension'),

  // Constraints
  constraints: z.object({
    minScore: z.number().min(0).max(100).describe('Minimum viability score to generate startup'),
    maxStartups: z.number().optional().describe('Maximum startups to generate from this hypothesis'),
    requireIndustry: z.boolean().describe('Whether industry dimension is required'),
    requireOccupation: z.boolean().describe('Whether occupation dimension is required'),
  }),

  // Metadata
  status: HypothesisStatus,
  createdAt: z.string().datetime().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().datetime().describe('ISO 8601 last update timestamp'),
  tags: z.array(z.string()).describe('Tags for categorization'),
})
export type Hypothesis = z.infer<typeof Hypothesis>

// =============================================================================
// HYPOTHESIS EXAMPLES (for reference/seeding)
// =============================================================================

export const HypothesisExample = z.object({
  hypothesis: Hypothesis,
  rationale: z.string().describe('Why this hypothesis is worth testing'),
  examples: z.array(z.string()).describe('Example startup concepts from this hypothesis'),
  risks: z.array(z.string()).describe('Key risks and assumptions'),
  successCriteria: z.array(z.string()).describe('How we know this hypothesis is validated'),
})
export type HypothesisExample = z.infer<typeof HypothesisExample>

// =============================================================================
// HYPOTHESIS REGISTRY
// =============================================================================

export const HypothesisRegistry = z.object({
  hypotheses: z.array(Hypothesis).describe('All registered hypotheses'),
  defaultHypothesisId: z.string().optional().describe('Default hypothesis to use'),
  version: z.string().describe('Registry version for migrations'),
})
export type HypothesisRegistry = z.infer<typeof HypothesisRegistry>
