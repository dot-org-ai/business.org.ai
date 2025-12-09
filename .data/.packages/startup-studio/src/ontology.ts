/**
 * Ontology Schemas
 *
 * These Zod schemas represent the foundational business ontology data
 * sourced from O*NET, NAICS, NAPCS, APQC, and other taxonomies.
 *
 * The ontology provides the "dimensions" we cross-product to generate
 * hundreds of thousands of startup concepts.
 *
 * Each .describe() serves as the AI prompt for generating that field.
 */

import { z } from 'zod'

// =============================================================================
// BASE ONTOLOGY ENTITY
// =============================================================================

export const OntologyEntity = z.object({
  ns: z.string().describe('Namespace identifier (e.g., "jobs.org.ai", "industries.org.ai")'),
  type: z.string().describe('Entity type within the namespace'),
  id: z.string().describe('Unique PascalCase identifier'),
  name: z.string().describe('Human-readable display name'),
  description: z.string().describe('Detailed description of what this entity represents'),
  code: z.string().describe('Source taxonomy code (e.g., NAICS code, O*NET SOC code)'),
  shortName: z.string().describe('Abbreviated identifier for compact display'),
  sourceType: z.string().describe('Origin taxonomy (e.g., "NAICS", "ONETTask", "APQC", "NAPCS")'),
})
export type OntologyEntity = z.infer<typeof OntologyEntity>

// =============================================================================
// OCCUPATIONS & JOBS
// =============================================================================

export const Occupation = OntologyEntity.extend({
  ns: z.literal('jobs.org.ai'),
  type: z.literal('Job'),
  occupationCode: z.string().describe('O*NET SOC code (e.g., "11-1011.00" for Chief Executives)'),
})
export type Occupation = z.infer<typeof Occupation>

export const OccupationCategory = z.object({
  majorGroup: z.string().describe('2-digit SOC major group (e.g., "11" = Management Occupations)'),
  minorGroup: z.string().describe('3-digit SOC minor group (e.g., "11-1" = Top Executives)'),
  broadOccupation: z.string().describe('5-digit SOC broad occupation (e.g., "11-101" = Chief Executives)'),
  detailed: z.string().describe('6-digit SOC detailed occupation (e.g., "11-1011" = Chief Executives)'),
})
export type OccupationCategory = z.infer<typeof OccupationCategory>

export const OccupationSegment = z.enum([
  'c-suite',
  'director',
  'manager',
  'specialist',
  'analyst',
  'coordinator',
  'professional',
  'technician',
  'operator',
  'service',
]).describe('High-value occupation segment for targeting startup solutions')
export type OccupationSegment = z.infer<typeof OccupationSegment>

// =============================================================================
// INDUSTRIES
// =============================================================================

export const Industry = OntologyEntity.extend({
  ns: z.literal('industries.org.ai'),
  type: z.literal('Industry'),
  level: z.number().describe('NAICS hierarchy depth (1=sector, 2=subsector, 3=industry group, 4=industry, 5=national industry)'),
})
export type Industry = z.infer<typeof Industry>

export const IndustryVertical = z.enum([
  'healthcare',
  'finance',
  'legal',
  'real-estate',
  'manufacturing',
  'retail',
  'hospitality',
  'construction',
  'transportation',
  'education',
  'government',
  'technology',
  'media',
  'agriculture',
  'energy',
  'professional-services',
]).describe('Industry vertical category for startup targeting')
export type IndustryVertical = z.infer<typeof IndustryVertical>

// =============================================================================
// TASKS & ACTIVITIES
// =============================================================================

export const Task = OntologyEntity.extend({
  ns: z.literal('tasks.org.ai'),
  type: z.literal('Task'),
  verb: z.string().describe('Action verb (e.g., "direct", "coordinate", "prepare", "analyze")'),
  object: z.string().describe('What the action is performed on (e.g., "budgets", "staff", "reports")'),
  preposition: z.string().optional().describe('Connecting word (e.g., "to", "for", "of", "with")'),
  prepObject: z.string().optional().describe('Object of preposition (e.g., "approval", "compliance")'),
  source: z.string().describe('Original full task description from O*NET'),
})
export type Task = z.infer<typeof Task>

export const Activity = OntologyEntity.extend({
  ns: z.literal('activities.org.ai'),
  type: z.literal('Activity'),
})
export type Activity = z.infer<typeof Activity>

export const TaskCategory = z.enum([
  'planning',
  'executing',
  'monitoring',
  'analyzing',
  'communicating',
  'coordinating',
  'directing',
  'creating',
  'maintaining',
  'evaluating',
]).describe('Functional category of work task')
export type TaskCategory = z.infer<typeof TaskCategory>

// =============================================================================
// PROCESSES
// =============================================================================

export const Process = OntologyEntity.extend({
  ns: z.literal('process.org.ai'),
  type: z.literal('Process'),
  level: z.number().describe('APQC PCF hierarchy level (1-5, where 1 is category and 5 is task)'),
})
export type Process = z.infer<typeof Process>

export const ProcessCategory = z.enum([
  'develop-vision-strategy',
  'develop-products-services',
  'market-sell',
  'deliver-products-services',
  'manage-customer-service',
  'develop-manage-human-capital',
  'manage-information-technology',
  'manage-financial-resources',
  'acquire-construct-manage-assets',
  'manage-enterprise-risk',
  'manage-external-relationships',
  'develop-manage-capabilities',
]).describe('APQC Process Classification Framework top-level category')
export type ProcessCategory = z.infer<typeof ProcessCategory>

// =============================================================================
// SERVICES
// =============================================================================

export const Service = OntologyEntity.extend({
  ns: z.literal('services.org.ai'),
  type: z.literal('Service'),
  level: z.number().describe('NAPCS hierarchy level'),
})
export type Service = z.infer<typeof Service>

export const ServiceDeliveryModel = z.enum([
  'api',
  'chat',
  'scheduled',
  'streaming',
  'embedded',
  'managed',
  'self-service',
]).describe('How the AI service is delivered to customers')
export type ServiceDeliveryModel = z.infer<typeof ServiceDeliveryModel>

// =============================================================================
// PRODUCTS
// =============================================================================

export const Product = OntologyEntity.extend({
  ns: z.literal('products.org.ai'),
  type: z.literal('Product'),
  level: z.number().describe('UNSPSC hierarchy level (segment, family, class, commodity)'),
})
export type Product = z.infer<typeof Product>

// =============================================================================
// TECHNOLOGY & TOOLS
// =============================================================================

export const Technology = OntologyEntity.extend({
  ns: z.literal('tech.org.ai'),
  type: z.literal('Tech'),
})
export type Technology = z.infer<typeof Technology>

export const Tool = OntologyEntity.extend({
  ns: z.literal('tools.org.ai'),
  type: z.literal('Tool'),
})
export type Tool = z.infer<typeof Tool>

export const TechCategory = z.enum([
  'crm',
  'erp',
  'hris',
  'accounting',
  'marketing-automation',
  'project-management',
  'communication',
  'analytics',
  'e-commerce',
  'database',
  'cloud-infrastructure',
  'security',
  'ai-ml',
  'iot',
  'blockchain',
]).describe('Technology category for integration targeting')
export type TechCategory = z.infer<typeof TechCategory>

// =============================================================================
// LOCATIONS & MARKETS
// =============================================================================

export const Location = OntologyEntity.extend({
  ns: z.literal('locations.org.ai'),
  type: z.literal('Location'),
})
export type Location = z.infer<typeof Location>

export const MarketRegion = z.enum([
  'north-america',
  'latin-america',
  'europe',
  'middle-east',
  'africa',
  'asia-pacific',
  'oceania',
]).describe('Geographic market region')
export type MarketRegion = z.infer<typeof MarketRegion>

export const MarketSize = z.enum([
  'tier-1',
  'tier-2',
  'tier-3',
]).describe('Market size tier based on GDP and tech adoption')
export type MarketSize = z.infer<typeof MarketSize>

export const Market = z.object({
  id: z.string().describe('Unique market identifier'),
  name: z.string().describe('Market display name'),
  region: MarketRegion,
  country: z.string().describe('Country name'),
  countryCode: z.string().length(2).describe('ISO 3166-1 alpha-2 country code'),
  languages: z.array(z.string()).describe('ISO 639-1 language codes spoken in market'),
  currency: z.string().length(3).describe('ISO 4217 currency code'),
  timezone: z.string().describe('Primary IANA timezone identifier'),
  marketSize: MarketSize,
})
export type Market = z.infer<typeof Market>

// =============================================================================
// ONTOLOGY COLLECTIONS
// =============================================================================

export const Ontology = z.object({
  occupations: z.map(z.string(), Occupation).describe('All occupations indexed by ID'),
  industries: z.map(z.string(), Industry).describe('All industries indexed by ID'),
  tasks: z.map(z.string(), Task).describe('All tasks indexed by ID'),
  activities: z.map(z.string(), Activity).describe('All activities indexed by ID'),
  processes: z.map(z.string(), Process).describe('All processes indexed by ID'),
  services: z.map(z.string(), Service).describe('All services indexed by ID'),
  products: z.map(z.string(), Product).describe('All products indexed by ID'),
  technologies: z.map(z.string(), Technology).describe('All technologies indexed by ID'),
  tools: z.map(z.string(), Tool).describe('All tools indexed by ID'),
  locations: z.map(z.string(), Location).describe('All locations indexed by ID'),
  markets: z.map(z.string(), Market).describe('All markets indexed by ID'),
})
export type Ontology = z.infer<typeof Ontology>

// =============================================================================
// ONTOLOGY RELATIONSHIPS
// =============================================================================

export const RelationshipType = z.enum([
  'has-task',
  'uses-tool',
  'in-industry',
  'requires-skill',
  'part-of',
  'related-to',
  'alternative-to',
  'depends-on',
]).describe('Type of relationship between ontology entities')
export type RelationshipType = z.infer<typeof RelationshipType>

export const OntologyRelationship = z.object({
  fromType: z.string().describe('Source entity type'),
  fromId: z.string().describe('Source entity ID'),
  toType: z.string().describe('Target entity type'),
  toId: z.string().describe('Target entity ID'),
  relationshipType: RelationshipType,
  weight: z.number().min(0).max(1).optional().describe('Strength of relationship (0-1)'),
})
export type OntologyRelationship = z.infer<typeof OntologyRelationship>
