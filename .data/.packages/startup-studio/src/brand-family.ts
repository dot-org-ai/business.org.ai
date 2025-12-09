/**
 * Brand Family & Subdomain Strategy Schemas
 *
 * Brand families allow us to create cohesive collections of startups
 * under unified domain strategies:
 *
 * - *.headless.ly      → API/Agent-first SaaS
 * - *.management.studio → Management tools
 * - *.agentic.services → AI agent services
 * - *.associates.st    → Professional services
 * - *.do               → Action-oriented APIs
 *
 * Each brand family can have tens of thousands of niche sub-variants
 * through strategic subdomain allocation.
 */

import { z } from 'zod'
import { BrandTone } from './startup'

// =============================================================================
// DOMAIN TLD STRATEGY
// =============================================================================

export const TLDCategory = z.enum([
  'generic',          // .com, .net, .org
  'new-generic',      // .io, .co, .ly, .ai
  'country-code',     // .uk, .de, .fr
  'industry',         // .tech, .finance, .health
  'action',           // .do, .run, .build
  'descriptive',      // .studio, .services, .agency
]).describe('Category of top-level domain')
export type TLDCategory = z.infer<typeof TLDCategory>

export const DomainTLD = z.object({
  tld: z.string().describe('The TLD (e.g., ".ly", ".do", ".services")'),
  category: TLDCategory,
  connotation: z.string().describe('What this TLD implies'),
  suitableFor: z.array(z.string()).describe('Types of businesses suited for this TLD'),
  avoidFor: z.array(z.string()).describe('Types of businesses that should avoid'),
  trustLevel: z.enum(['high', 'medium', 'low']).describe('General trust level'),
  memorability: z.enum(['high', 'medium', 'low']).describe('How memorable'),
  cost: z.enum(['cheap', 'moderate', 'expensive', 'premium']).describe('Typical cost'),
})
export type DomainTLD = z.infer<typeof DomainTLD>

// =============================================================================
// SUBDOMAIN STRATEGY
// =============================================================================

export const SubdomainPattern = z.enum([
  // By ontology dimension
  'occupation',         // cfo.domain.com, nurse.domain.com
  'industry',           // healthcare.domain.com, finance.domain.com
  'industry-occupation', // healthcare-cfo.domain.com
  'process',            // invoicing.domain.com, scheduling.domain.com
  'task',               // analyze.domain.com, report.domain.com
  'service',            // consulting.domain.com, coaching.domain.com

  // By geography
  'country',            // us.domain.com, uk.domain.com
  'region',             // eu.domain.com, apac.domain.com
  'city',               // nyc.domain.com, london.domain.com

  // By product
  'tier',               // pro.domain.com, enterprise.domain.com
  'version',            // v2.domain.com, beta.domain.com
  'feature',            // analytics.domain.com, reports.domain.com

  // By brand
  'product-name',       // specific product names
  'acronym',            // abbreviated forms
]).describe('Pattern for generating subdomains')
export type SubdomainPattern = z.infer<typeof SubdomainPattern>

export const SubdomainNamingRule = z.object({
  pattern: SubdomainPattern,
  format: z.enum([
    'lowercase',        // cfo
    'kebab-case',       // chief-financial-officer
    'abbreviated',      // cfo (shortened form)
    'code',             // using ontology codes
  ]).describe('How to format the subdomain'),
  maxLength: z.number().describe('Maximum subdomain length'),
  allowNumbers: z.boolean().describe('Whether numbers are allowed'),
  allowHyphens: z.boolean().describe('Whether hyphens are allowed'),
})
export type SubdomainNamingRule = z.infer<typeof SubdomainNamingRule>

// =============================================================================
// BRAND FAMILY DEFINITION
// =============================================================================

export const BrandFamilyType = z.enum([
  'product',            // Product-focused (e.g., Headless.ly for APIs)
  'service',            // Service-focused (e.g., agentic.services)
  'audience',           // Audience-focused (e.g., founders.studio)
  'industry',           // Industry-focused (e.g., healthcare.ai)
  'action',             // Action-focused (e.g., *.do)
  'methodology',        // Method-focused (e.g., agile.management)
]).describe('What the brand family is organized around')
export type BrandFamilyType = z.infer<typeof BrandFamilyType>

export const BrandFamilyPositioning = z.object({
  tagline: z.string().max(60).describe('Brand family tagline'),
  headline: z.string().describe('Main headline'),
  subheadline: z.string().describe('Supporting subheadline'),
  manifesto: z.string().describe('Brand manifesto/belief statement'),

  // Value hierarchy
  primaryValue: z.string().describe('Primary value proposition'),
  secondaryValues: z.array(z.string()).describe('Supporting value props'),

  // Target
  targetAudience: z.string().describe('Who this brand family serves'),
  antiTarget: z.string().describe('Who this is NOT for'),

  // Differentiation
  uniqueness: z.string().describe('What makes this brand family unique'),
  competitors: z.array(z.string()).describe('Competing brand families/platforms'),
})
export type BrandFamilyPositioning = z.infer<typeof BrandFamilyPositioning>

export const BrandFamilyVisual = z.object({
  // Colors
  primaryColor: z.string().describe('Primary brand color (hex)'),
  secondaryColor: z.string().describe('Secondary color (hex)'),
  accentColor: z.string().describe('Accent color (hex)'),
  neutrals: z.array(z.string()).describe('Neutral palette (hex values)'),

  // Typography
  headingFont: z.string().describe('Font for headings'),
  bodyFont: z.string().describe('Font for body text'),
  monoFont: z.string().describe('Monospace font'),

  // Logo/Icon
  logoStyle: z.enum(['wordmark', 'lettermark', 'icon', 'combination']).describe('Logo type'),
  iconStyle: z.enum(['geometric', 'organic', 'abstract', 'literal']).describe('Icon style'),

  // Overall aesthetic
  aesthetic: z.enum([
    'minimal',
    'bold',
    'playful',
    'corporate',
    'technical',
    'premium',
    'friendly',
  ]).describe('Overall visual aesthetic'),
})
export type BrandFamilyVisual = z.infer<typeof BrandFamilyVisual>

export const BrandFamily = z.object({
  // Identity
  id: z.string().describe('Unique identifier (kebab-case)'),
  name: z.string().describe('Brand family name'),
  type: BrandFamilyType,

  // Domain strategy
  rootDomain: z.string().describe('Root domain (e.g., "headless.ly")'),
  tld: DomainTLD.describe('TLD information'),
  subdomainStrategy: z.object({
    primary: SubdomainPattern.describe('Primary subdomain pattern'),
    secondary: SubdomainPattern.optional().describe('Secondary pattern for variants'),
    namingRules: SubdomainNamingRule,
  }),

  // Positioning
  positioning: BrandFamilyPositioning,

  // Visual identity
  visual: BrandFamilyVisual,
  tone: BrandTone,

  // Voice
  voice: z.object({
    personality: z.array(z.string()).min(3).max(5).describe('Brand personality traits'),
    principles: z.array(z.string()).describe('Communication principles'),
    vocabulary: z.object({
      preferred: z.array(z.string()).describe('Words we use'),
      avoided: z.array(z.string()).describe('Words we avoid'),
    }),
  }),

  // Capacity
  capacity: z.object({
    maxSubdomains: z.number().optional().describe('Maximum subdomains (if limited)'),
    reservedSubdomains: z.array(z.string()).describe('Reserved subdomain names'),
    namingPriority: z.array(SubdomainPattern).describe('Priority order for subdomain assignment'),
  }),

  // Metadata
  status: z.enum(['active', 'planned', 'retired']).describe('Brand family status'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type BrandFamily = z.infer<typeof BrandFamily>

// =============================================================================
// SUBDOMAIN ALLOCATION
// =============================================================================

export const SubdomainAllocation = z.object({
  subdomain: z.string().describe('The subdomain (without root domain)'),
  fullDomain: z.string().describe('Full domain (e.g., "cfo.headless.ly")'),
  brandFamilyId: z.string().describe('Parent brand family'),

  // What it represents
  pattern: SubdomainPattern.describe('What pattern this follows'),
  ontologyRef: z.object({
    type: z.enum(['occupation', 'industry', 'process', 'task', 'service', 'geography', 'custom']),
    id: z.string().optional().describe('Ontology entity ID if applicable'),
    name: z.string().describe('Human-readable reference'),
  }).describe('What ontology entity this maps to'),

  // Assignment
  assignedTo: z.string().optional().describe('Startup concept ID if assigned'),
  status: z.enum([
    'available',        // Not yet assigned
    'reserved',         // Reserved for specific use
    'assigned',         // Assigned to a startup
    'active',           // Startup is live on this domain
    'parked',           // Domain parked/redirecting
  ]).describe('Subdomain status'),

  // SEO/Traffic
  seo: z.object({
    primaryKeyword: z.string().optional().describe('Primary target keyword'),
    searchVolume: z.number().optional().describe('Monthly search volume'),
    difficulty: z.number().optional().describe('Keyword difficulty 0-100'),
  }).optional(),

  // Metadata
  createdAt: z.string().datetime(),
  assignedAt: z.string().datetime().optional(),
})
export type SubdomainAllocation = z.infer<typeof SubdomainAllocation>

// =============================================================================
// BRAND FAMILY REGISTRY
// =============================================================================

export const BrandFamilyRegistry = z.object({
  families: z.array(BrandFamily).describe('All brand families'),
  subdomains: z.array(SubdomainAllocation).describe('All subdomain allocations'),

  // Cross-family rules
  crossFamilyRules: z.object({
    allowCrossFamilyVariants: z.boolean().describe('Can a concept exist in multiple families'),
    redirectStrategy: z.enum(['none', 'primary-to-variants', 'variants-to-primary']),
  }),

  // Stats
  stats: z.object({
    totalFamilies: z.number(),
    totalSubdomains: z.number(),
    subdomainsByStatus: z.record(z.string(), z.number()),
    subdomainsByFamily: z.record(z.string(), z.number()),
  }),
})
export type BrandFamilyRegistry = z.infer<typeof BrandFamilyRegistry>

// =============================================================================
// BRAND FAMILY TEMPLATES (Pre-defined families)
// =============================================================================

export const BrandFamilyTemplate = z.object({
  id: z.string().describe('Template ID'),
  name: z.string().describe('Template name'),
  description: z.string().describe('What this template is for'),

  // Suggested domains
  suggestedDomains: z.array(z.string()).describe('Suggested root domains'),

  // Pre-filled config
  type: BrandFamilyType,
  tone: BrandTone,
  subdomainPatterns: z.array(SubdomainPattern).describe('Recommended patterns'),

  // Example instantiations
  examples: z.array(z.object({
    rootDomain: z.string(),
    exampleSubdomains: z.array(z.string()),
  })),

  // Best for
  bestFor: z.array(z.string()).describe('Hypothesis types this works well with'),
})
export type BrandFamilyTemplate = z.infer<typeof BrandFamilyTemplate>

// =============================================================================
// PREDEFINED BRAND FAMILY TEMPLATES
// =============================================================================

export const BRAND_FAMILY_TEMPLATES = {
  headlessSaas: {
    id: 'headless-saas',
    name: 'Headless SaaS',
    description: 'API-first SaaS for AI agents, not humans',
    suggestedDomains: ['headless.ly', 'api.studio', 'backends.io'],
    type: 'product' as const,
    tone: 'technical' as const,
    subdomainPatterns: ['occupation', 'process', 'industry'] as const,
    examples: [
      {
        rootDomain: 'headless.ly',
        exampleSubdomains: ['payroll.headless.ly', 'invoicing.headless.ly', 'crm.headless.ly'],
      },
    ],
    bestFor: ['headless-saas-for-agents', 'api-first-infrastructure'],
  },

  agenticServices: {
    id: 'agentic-services',
    name: 'Agentic Services',
    description: 'AI agents delivering professional services',
    suggestedDomains: ['agentic.services', 'agent.services', 'ai.services'],
    type: 'service' as const,
    tone: 'professional' as const,
    subdomainPatterns: ['occupation', 'service', 'industry'] as const,
    examples: [
      {
        rootDomain: 'agentic.services',
        exampleSubdomains: ['cfo.agentic.services', 'legal.agentic.services', 'recruiting.agentic.services'],
      },
    ],
    bestFor: ['ai-delivered-services', 'vertical-agents'],
  },

  managementStudio: {
    id: 'management-studio',
    name: 'Management Studio',
    description: 'Management and operations tools',
    suggestedDomains: ['management.studio', 'ops.studio', 'manage.tools'],
    type: 'product' as const,
    tone: 'professional' as const,
    subdomainPatterns: ['process', 'industry', 'occupation'] as const,
    examples: [
      {
        rootDomain: 'management.studio',
        exampleSubdomains: ['inventory.management.studio', 'project.management.studio', 'team.management.studio'],
      },
    ],
    bestFor: ['process-automation', 'micro-saas'],
  },

  professionalAssociates: {
    id: 'professional-associates',
    name: 'Professional Associates',
    description: 'AI associates for professional services firms',
    suggestedDomains: ['associates.st', 'partner.ai', 'firm.services'],
    type: 'service' as const,
    tone: 'premium' as const,
    subdomainPatterns: ['occupation', 'industry'] as const,
    examples: [
      {
        rootDomain: 'associates.st',
        exampleSubdomains: ['legal.associates.st', 'tax.associates.st', 'consulting.associates.st'],
      },
    ],
    bestFor: ['knowledge-worker-agents', 'professional-services'],
  },

  actionDomains: {
    id: 'action-domains',
    name: 'Action Domains',
    description: 'Action-oriented APIs and services',
    suggestedDomains: ['invoice.do', 'schedule.do', 'analyze.do'],
    type: 'action' as const,
    tone: 'minimal' as const,
    subdomainPatterns: ['task', 'process'] as const,
    examples: [
      {
        rootDomain: '*.do',
        exampleSubdomains: ['invoice.do', 'schedule.do', 'report.do', 'analyze.do'],
      },
    ],
    bestFor: ['api-services', 'single-purpose-tools'],
  },
} as const
