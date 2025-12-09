/**
 * Productized Service Schemas
 *
 * Defines how to package AI services as productized offerings.
 * Following best practices from productized service businesses:
 *
 * 1. Fixed scope - Clear boundaries on what's included
 * 2. Fixed price - No hourly billing, predictable cost
 * 3. Fixed timeline - Clear delivery expectations
 * 4. Repeatable process - Standardized delivery
 * 5. Clear outcome - Tangible deliverable
 *
 * This is the bridge between abstract "AI agent capabilities" and
 * concrete products customers can understand and buy.
 */

import { z } from 'zod'

// =============================================================================
// SERVICE PACKAGING FUNDAMENTALS
// =============================================================================

export const ServiceScope = z.object({
  included: z.array(z.string()).describe('What is explicitly included in this service'),
  excluded: z.array(z.string()).describe('What is explicitly NOT included (to manage expectations)'),
  limitations: z.array(z.string()).describe('Limitations or constraints of the service'),
  prerequisites: z.array(z.string()).describe('What customer needs to provide or have ready'),
})
export type ServiceScope = z.infer<typeof ServiceScope>

export const ServiceDeliverable = z.object({
  name: z.string().describe('Name of the deliverable'),
  description: z.string().describe('What this deliverable is'),
  format: z.string().describe('Format of deliverable (PDF, API response, dashboard, etc.)'),
  example: z.string().optional().describe('Example or sample of the deliverable'),
})
export type ServiceDeliverable = z.infer<typeof ServiceDeliverable>

export const ServiceTimeline = z.object({
  turnaround: z.string().describe('Standard turnaround time (e.g., "24 hours", "5 business days")'),
  rushAvailable: z.boolean().describe('Whether rush delivery is available'),
  rushPremium: z.string().optional().describe('Premium for rush delivery'),
  sla: z.string().optional().describe('Service level agreement details'),
})
export type ServiceTimeline = z.infer<typeof ServiceTimeline>

// =============================================================================
// PRICING STRUCTURES FOR PRODUCTIZED SERVICES
// =============================================================================

export const PricingTier = z.object({
  name: z.string().describe('Tier name (e.g., "Starter", "Pro", "Enterprise")'),
  price: z.number().describe('Price in USD'),
  billingPeriod: z.enum(['one-time', 'monthly', 'quarterly', 'annual']).describe('Billing frequency'),
  description: z.string().describe('One-line description of this tier'),
  features: z.array(z.string()).describe('Features included in this tier'),
  limits: z.record(z.string(), z.union([z.number(), z.string()])).describe('Usage limits (e.g., { "reports": 10, "users": 5 })'),
  popular: z.boolean().optional().describe('Whether to highlight as most popular'),
  cta: z.string().describe('Call to action text for this tier'),
})
export type PricingTier = z.infer<typeof PricingTier>

export const AddOn = z.object({
  name: z.string().describe('Add-on name'),
  description: z.string().describe('What this add-on provides'),
  price: z.number().describe('Price in USD'),
  billingPeriod: z.enum(['one-time', 'monthly', 'per-use']).describe('How add-on is billed'),
})
export type AddOn = z.infer<typeof AddOn>

export const ServicePricing = z.object({
  tiers: z.array(PricingTier).min(1).max(4).describe('Pricing tiers (1-4)'),
  addOns: z.array(AddOn).optional().describe('Optional add-ons'),
  customQuote: z.boolean().describe('Whether custom/enterprise quotes are available'),
  freeTrialDays: z.number().optional().describe('Free trial period in days'),
  moneyBackDays: z.number().optional().describe('Money-back guarantee period'),
})
export type ServicePricing = z.infer<typeof ServicePricing>

// =============================================================================
// SERVICE PROCESS
// =============================================================================

export const ProcessStep = z.object({
  order: z.number().describe('Step number'),
  name: z.string().describe('Short name for this step'),
  description: z.string().describe('What happens in this step'),
  duration: z.string().optional().describe('How long this step takes'),
  customerAction: z.string().optional().describe('What customer needs to do'),
  automated: z.boolean().describe('Whether this step is fully automated'),
})
export type ProcessStep = z.infer<typeof ProcessStep>

export const ServiceProcess = z.object({
  steps: z.array(ProcessStep).min(3).max(7).describe('Process steps (3-7 for clarity)'),
  totalDuration: z.string().describe('Total process duration'),
  customerTouchpoints: z.number().describe('Number of times customer is involved'),
  automationPercentage: z.number().min(0).max(100).describe('Percentage of process that is automated'),
})
export type ServiceProcess = z.infer<typeof ServiceProcess>

// =============================================================================
// SERVICE POSITIONING
// =============================================================================

export const ServiceCategory = z.enum([
  // Research & Analysis
  'market-research',
  'competitive-analysis',
  'customer-research',
  'data-analysis',
  'financial-analysis',

  // Content & Creative
  'content-creation',
  'copywriting',
  'design',
  'video-production',
  'brand-development',

  // Marketing & Growth
  'seo-audit',
  'paid-ads-management',
  'email-marketing',
  'social-media',
  'lead-generation',

  // Operations & Admin
  'bookkeeping',
  'data-entry',
  'document-processing',
  'scheduling',
  'customer-support',

  // Technical
  'code-review',
  'security-audit',
  'api-integration',
  'database-optimization',
  'infrastructure-setup',

  // Strategy & Consulting
  'strategy-session',
  'roadmap-planning',
  'process-optimization',
  'training-workshop',
]).describe('Service category for organization')
export type ServiceCategory = z.infer<typeof ServiceCategory>

export const ServicePositioning = z.object({
  category: ServiceCategory,
  tagline: z.string().max(60).describe('Short tagline (max 60 chars)'),
  headline: z.string().describe('Attention-grabbing headline'),
  subheadline: z.string().describe('Supporting subheadline'),
  valueProposition: z.string().describe('Clear value proposition statement'),

  // Problem/Solution framing
  problem: z.string().describe('The problem this service solves'),
  solution: z.string().describe('How this service solves it'),
  transformation: z.string().describe('What customer becomes after using service'),

  // Differentiation
  uniqueAngle: z.string().describe('What makes this different from alternatives'),
  competitors: z.array(z.string()).describe('Alternative solutions customers might consider'),
  whyUs: z.array(z.string()).describe('Reasons to choose us over alternatives'),
})
export type ServicePositioning = z.infer<typeof ServicePositioning>

// =============================================================================
// SERVICE PROOF & TRUST
// =============================================================================

export const CaseStudy = z.object({
  clientType: z.string().describe('Type of client (anonymized if needed)'),
  challenge: z.string().describe('What challenge they faced'),
  solution: z.string().describe('How we helped'),
  results: z.array(z.string()).describe('Quantified results achieved'),
  testimonial: z.string().optional().describe('Client quote'),
})
export type CaseStudy = z.infer<typeof CaseStudy>

export const ServiceProof = z.object({
  caseStudies: z.array(CaseStudy).describe('Case studies demonstrating results'),
  metrics: z.array(z.object({
    value: z.string().describe('The number or statistic'),
    label: z.string().describe('What it represents'),
  })).describe('Key metrics to display'),
  guarantees: z.array(z.string()).describe('Service guarantees offered'),
  certifications: z.array(z.string()).optional().describe('Relevant certifications'),
  integrations: z.array(z.string()).optional().describe('Tools/platforms we integrate with'),
})
export type ServiceProof = z.infer<typeof ServiceProof>

// =============================================================================
// SERVICE FAQ & OBJECTION HANDLING
// =============================================================================

export const FAQ = z.object({
  question: z.string().describe('Common question'),
  answer: z.string().describe('Clear, helpful answer'),
  category: z.enum(['pricing', 'process', 'scope', 'results', 'technical', 'general']).describe('Question category'),
})
export type FAQ = z.infer<typeof FAQ>

export const ObjectionHandler = z.object({
  objection: z.string().describe('Common objection or concern'),
  response: z.string().describe('How to address the objection'),
  proof: z.string().optional().describe('Evidence to support the response'),
})
export type ObjectionHandler = z.infer<typeof ObjectionHandler>

// =============================================================================
// AI SERVICE SPECIFICS
// =============================================================================

export const AICapability = z.object({
  capability: z.string().describe('What the AI can do'),
  accuracy: z.string().optional().describe('Accuracy or quality level'),
  speed: z.string().optional().describe('How fast it performs'),
  limitations: z.array(z.string()).describe('Known limitations'),
})
export type AICapability = z.infer<typeof AICapability>

export const HumanInLoop = z.object({
  required: z.boolean().describe('Whether human review is required'),
  stage: z.string().optional().describe('At what stage human is involved'),
  role: z.string().optional().describe('What the human does'),
  escalation: z.string().optional().describe('When/how to escalate to human'),
})
export type HumanInLoop = z.infer<typeof HumanInLoop>

export const AIServiceConfig = z.object({
  capabilities: z.array(AICapability).describe('AI capabilities used in this service'),
  humanInLoop: HumanInLoop.describe('Human involvement configuration'),
  dataHandling: z.object({
    inputTypes: z.array(z.string()).describe('Types of input data accepted'),
    outputTypes: z.array(z.string()).describe('Types of output produced'),
    retention: z.string().describe('How long data is retained'),
    privacy: z.string().describe('Privacy/security measures'),
  }),
  models: z.array(z.string()).optional().describe('AI models used (if relevant to customers)'),
})
export type AIServiceConfig = z.infer<typeof AIServiceConfig>

// =============================================================================
// COMPLETE PRODUCTIZED SERVICE
// =============================================================================

export const ProductizedService = z.object({
  // Identity
  id: z.string().describe('Unique service identifier (kebab-case)'),
  name: z.string().describe('Service name'),
  slug: z.string().describe('URL-friendly slug'),

  // Positioning
  positioning: ServicePositioning,

  // What's included
  scope: ServiceScope,
  deliverables: z.array(ServiceDeliverable).min(1).describe('What customer receives'),

  // Timeline
  timeline: ServiceTimeline,

  // How it works
  process: ServiceProcess,

  // Pricing
  pricing: ServicePricing,

  // Trust signals
  proof: ServiceProof,

  // Support content
  faqs: z.array(FAQ).describe('Frequently asked questions'),
  objectionHandlers: z.array(ObjectionHandler).describe('Common objections and responses'),

  // AI specifics
  aiConfig: AIServiceConfig,

  // Target
  idealCustomer: z.object({
    industries: z.array(z.string()).describe('Target industries'),
    companySize: z.array(z.string()).describe('Target company sizes'),
    roles: z.array(z.string()).describe('Target buyer roles'),
    triggers: z.array(z.string()).describe('Buying triggers'),
    disqualifiers: z.array(z.string()).describe('Who is NOT a fit'),
  }),

  // SEO/Marketing
  seo: z.object({
    primaryKeyword: z.string().describe('Primary SEO keyword'),
    secondaryKeywords: z.array(z.string()).describe('Secondary keywords'),
    metaTitle: z.string().max(60).describe('Meta title (max 60 chars)'),
    metaDescription: z.string().max(160).describe('Meta description (max 160 chars)'),
  }),
})
export type ProductizedService = z.infer<typeof ProductizedService>

// =============================================================================
// SERVICE PACKAGE (Bundle of Services)
// =============================================================================

export const ServicePackage = z.object({
  id: z.string().describe('Package identifier'),
  name: z.string().describe('Package name'),
  description: z.string().describe('What this package includes'),
  services: z.array(z.string()).describe('Service IDs included in this package'),
  discount: z.number().optional().describe('Percentage discount vs buying separately'),
  positioning: z.string().describe('Why buy the package vs individual services'),
  idealFor: z.string().describe('Who this package is ideal for'),
})
export type ServicePackage = z.infer<typeof ServicePackage>

// =============================================================================
// SERVICE CATALOG
// =============================================================================

export const ServiceCatalog = z.object({
  brandName: z.string().describe('Brand name for this catalog'),
  tagline: z.string().describe('Overall brand tagline'),
  services: z.array(ProductizedService).describe('All services offered'),
  packages: z.array(ServicePackage).optional().describe('Service bundles'),
  categories: z.array(z.object({
    name: z.string().describe('Category name'),
    description: z.string().describe('Category description'),
    serviceIds: z.array(z.string()).describe('Services in this category'),
  })).describe('Service categories for organization'),
})
export type ServiceCatalog = z.infer<typeof ServiceCatalog>

// =============================================================================
// SERVICE TEMPLATES BY PATTERN
// =============================================================================

export const ServicePattern = z.enum([
  // Audit/Analysis patterns
  'audit',              // Review and assess (SEO Audit, Security Audit)
  'analysis',           // Analyze and report (Competitive Analysis)
  'assessment',         // Evaluate and score (Readiness Assessment)

  // Creation patterns
  'done-for-you',       // We create it for you (Content Creation)
  'done-with-you',      // Collaborative creation (Strategy Session)
  'template-plus',      // Template + customization (Playbook Creation)

  // Optimization patterns
  'optimization',       // Improve existing (Landing Page Optimization)
  'transformation',     // Major overhaul (Website Redesign)
  'migration',          // Move from A to B (Data Migration)

  // Ongoing patterns
  'managed',            // Ongoing management (Managed Ads)
  'monitoring',         // Ongoing monitoring (Uptime Monitoring)
  'maintenance',        // Ongoing maintenance (Content Updates)

  // Training patterns
  'workshop',           // Interactive training (AI Workshop)
  'course',             // Self-paced learning (Video Course)
  'coaching',           // 1:1 guidance (Executive Coaching)
]).describe('Common productized service patterns')
export type ServicePattern = z.infer<typeof ServicePattern>

export const ServiceTemplate = z.object({
  pattern: ServicePattern,
  nameFormula: z.string().describe('Formula for naming (e.g., "{Industry} {Deliverable} {Pattern}")'),
  typicalPricing: z.object({
    low: z.number().describe('Low end of typical pricing'),
    mid: z.number().describe('Mid range pricing'),
    high: z.number().describe('High end pricing'),
  }),
  typicalTimeline: z.string().describe('Typical turnaround time'),
  typicalDeliverables: z.array(z.string()).describe('Common deliverables'),
  keyDifferentiators: z.array(z.string()).describe('How to differentiate in this pattern'),
})
export type ServiceTemplate = z.infer<typeof ServiceTemplate>
