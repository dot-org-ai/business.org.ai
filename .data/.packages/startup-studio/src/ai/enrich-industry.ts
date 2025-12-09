/**
 * Industry Enrichment AI Functions
 *
 * Enriches industry entities with:
 * - Business types common in the industry
 * - Business model canvas
 * - Competitive landscape
 * - Industry trends
 * - AI opportunities
 */

import { AI } from 'ai-functions'
import { ensureConfigured } from './config'
import type { Industry } from '../ontology'
import type { EnrichedIndustry, BusinessType, BusinessModelCanvas, IndustryTrend, CompetitiveLandscape } from '../enrichments'

// =============================================================================
// AI FUNCTION DEFINITIONS
// =============================================================================

const industryAI = AI({
  businessTypes: {
    types: [{
      id: 'Unique kebab-case identifier',
      name: 'Business type name',
      category: 'One of: b2b-saas, b2b-services, b2b-marketplace, b2c-saas, b2c-services, b2c-marketplace, b2b2c, d2c-ecommerce, platform, infrastructure, data-provider, agency, consultancy',
      description: 'What this type of business does',
      marketDynamics: {
        competitiveness: 'One of: blue-ocean, emerging, growing, mature, declining',
        consolidation: 'One of: fragmented, consolidating, oligopoly, monopoly',
        barriers: 'One of: low, medium, high',
        regulation: 'One of: none, light, moderate, heavy',
      },
      economics: {
        typicalMargins: 'One of: low, medium, high',
        capitalIntensity: 'One of: low, medium, high',
        timeToRevenue: 'One of: immediate, short, medium, long',
        scalability: 'One of: linear, sublinear, superlinear',
      },
      typicalGTM: {
        salesCycle: 'One of: days, weeks, months, quarters, years',
        aov: 'One of: micro, low, medium, high, enterprise',
        channels: ['Most effective go-to-market channels'],
        buyerPersonas: ['Typical buyer personas'],
      },
      aiOpportunity: {
        automationPotential: 'One of: low, medium, high',
        disruptionRisk: 'One of: low, medium, high',
        aiUseCases: ['Key AI use cases in this business type'],
      },
    }],
  },

  businessModelCanvas: {
    customerSegments: [{
      segment: 'Customer segment name',
      description: 'Who these customers are',
      size: 'One of: small, medium, large',
      willingness: 'One of: low, medium, high - willingness to pay',
      accessibility: 'One of: easy, medium, hard - how easy to reach',
    }],
    valuePropositions: [{
      proposition: 'The core value proposition',
      customerJobs: ['Jobs customers are trying to get done'],
      pains: ['Customer pains this addresses'],
      gains: ['Gains customers receive'],
    }],
    channels: [{
      type: 'Channel type (direct-sales, inside-sales, partner-reseller, marketplace, self-service, content-marketing, paid-advertising, referral, events-conferences, cold-outreach)',
      effectiveness: 'One of: low, medium, high',
      cost: 'One of: low, medium, high',
    }],
    customerRelationships: [{
      type: 'One of: self-service, automated, personal, dedicated, community, co-creation',
      description: 'How we maintain the relationship',
    }],
    revenueStreams: [{
      type: 'One of: subscription, transaction-fee, usage-based, licensing, professional-services, advertising, data-monetization, commission, one-time-purchase',
      description: 'How this revenue stream works',
      percentage: 'Percentage of total revenue (number 0-100)',
    }],
    keyResources: ['What resources are required'],
    keyActivities: ['What activities are critical'],
    keyPartners: ['Who are key partners/suppliers'],
    costStructure: {
      type: 'One of: cost-driven, value-driven',
      fixedCosts: ['Major fixed costs'],
      variableCosts: ['Major variable costs'],
    },
  },

  competitiveLandscape: {
    marketLeaders: ['Names of market-leading companies'],
    emergingPlayers: ['Notable emerging/startup players'],
    disruptors: ['Companies disrupting the industry'],
    consolidationTrends: 'Description of M&A and consolidation activity',
  },

  industryTrends: {
    trends: [{
      trend: 'Name of the trend',
      description: 'What is happening',
      impact: 'One of: low, medium, high, transformative',
      timeframe: 'One of: now, 1-2-years, 3-5-years, 5-plus-years',
      opportunity: 'Startup opportunity this creates',
    }],
  },

  aiReadiness: {
    dataAvailability: 'One of: scarce, limited, moderate, abundant',
    processStandardization: 'One of: chaotic, ad-hoc, defined, managed, optimized',
    aiAdoption: 'One of: none, experimenting, piloting, scaling, embedded',
    topAIUseCases: ['Most promising AI use cases for this industry'],
  },

  marketSize: {
    tam: 'Total addressable market estimate (e.g., "$50B globally")',
    sam: 'Serviceable addressable market estimate',
    growth: 'Annual growth rate (e.g., "15% CAGR")',
  },
})

// =============================================================================
// ENRICHMENT FUNCTIONS
// =============================================================================

export interface EnrichIndustryOptions {
  depth?: 'basic' | 'standard' | 'comprehensive'
  includeCompetitors?: boolean
  includeTrends?: boolean
  includeAIAnalysis?: boolean
}

/**
 * Enrich an industry with comprehensive business intelligence
 */
export async function enrichIndustry(
  industry: Industry,
  options: EnrichIndustryOptions = {}
): Promise<EnrichedIndustry> {
  ensureConfigured()

  const {
    depth = 'standard',
    includeCompetitors = true,
    includeTrends = true,
    includeAIAnalysis = true,
  } = options

  const industryContext = `
Industry: ${industry.name}
Description: ${industry.description}
NAICS Code: ${industry.code}
Level: ${industry.level} (1=sector, 2=subsector, 3=industry group, 4=industry, 5=national industry)
`

  // Generate business types
  const businessTypesPrompt = `
Analyze the ${industry.name} industry and identify the ${depth === 'basic' ? '3-5' : depth === 'standard' ? '5-8' : '8-12'} most common business types operating in this space.

${industryContext}

For each business type, provide detailed analysis of market dynamics, economics, go-to-market approach, and AI opportunity.
Focus on business types that would be relevant for a startup to consider entering.
`

  const businessTypes = await industryAI.businessTypes(businessTypesPrompt)

  // Generate business model canvas
  const canvasPrompt = `
Create a comprehensive Business Model Canvas for a typical successful business in the ${industry.name} industry.

${industryContext}

This should represent the most common/successful business model pattern in this industry.
Be specific with real examples where possible.
`

  const businessModelCanvas = await industryAI.businessModelCanvas(canvasPrompt)

  // Generate competitive landscape (if requested)
  let competitiveLandscape: CompetitiveLandscape | undefined
  if (includeCompetitors) {
    const competitorsPrompt = `
Analyze the competitive landscape of the ${industry.name} industry.

${industryContext}

Identify market leaders, emerging players, and disruptors. Describe consolidation trends.
Focus on companies that are relevant benchmarks for a new entrant.
`
    competitiveLandscape = await industryAI.competitiveLandscape(competitorsPrompt)
  }

  // Generate industry trends (if requested)
  let trends: IndustryTrend[] = []
  if (includeTrends) {
    const trendsPrompt = `
Identify the ${depth === 'basic' ? '3-5' : depth === 'standard' ? '5-8' : '8-12'} most important trends shaping the ${industry.name} industry.

${industryContext}

For each trend, explain the impact, timeline, and startup opportunities it creates.
Focus on trends that create opportunities for new entrants.
`
    const trendsResult = await industryAI.industryTrends(trendsPrompt)
    trends = trendsResult.trends as IndustryTrend[]
  }

  // Generate AI readiness analysis (if requested)
  let aiReadiness: EnrichedIndustry['aiReadiness'] | undefined
  if (includeAIAnalysis) {
    const aiPrompt = `
Assess the AI readiness and opportunity in the ${industry.name} industry.

${industryContext}

Evaluate data availability, process standardization, current AI adoption, and the most promising AI use cases.
Be specific about where AI can create the most value.
`
    aiReadiness = await industryAI.aiReadiness(aiPrompt) as EnrichedIndustry['aiReadiness']
  }

  // Generate market size
  const marketSizePrompt = `
Estimate the market size for the ${industry.name} industry.

${industryContext}

Provide TAM (total addressable market), SAM (serviceable addressable market for a typical startup), and growth rate.
Base estimates on publicly available data and industry reports.
`
  const marketSize = await industryAI.marketSize(marketSizePrompt)

  // Extract typed arrays from AI responses
  const businessTypesArray = (businessTypes as { types: BusinessType[] }).types

  // Compile enriched industry
  const enriched: EnrichedIndustry = {
    industryId: industry.id,
    businessTypes: businessTypesArray,
    businessModelCanvas: businessModelCanvas as BusinessModelCanvas,
    competitiveLandscape: competitiveLandscape || {
      marketLeaders: [],
      emergingPlayers: [],
      disruptors: [],
      consolidationTrends: 'Not analyzed',
    },
    trends,
    painPoints: extractPainPoints(businessModelCanvas),
    regulations: extractRegulations(businessTypesArray),
    technologyAdoption: determineTechAdoption(aiReadiness),
    marketSize: marketSize as EnrichedIndustry['marketSize'],
    aiReadiness: aiReadiness || {
      dataAvailability: 'moderate',
      processStandardization: 'defined',
      aiAdoption: 'experimenting',
      topAIUseCases: [],
    },
  }

  return enriched
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractPainPoints(canvas: any): string[] {
  const painPoints: string[] = []

  // Extract from value propositions
  if (canvas.valuePropositions) {
    for (const vp of canvas.valuePropositions) {
      if (vp.pains) {
        painPoints.push(...vp.pains)
      }
    }
  }

  return [...new Set(painPoints)]
}

function extractRegulations(businessTypes: any[]): string[] {
  const regulations: string[] = []

  for (const bt of businessTypes) {
    if (bt.marketDynamics?.regulation === 'heavy' || bt.marketDynamics?.regulation === 'moderate') {
      regulations.push(`${bt.name}: Significant regulatory requirements`)
    }
  }

  return regulations
}

function determineTechAdoption(aiReadiness: any): 'laggard' | 'early-majority' | 'late-majority' | 'innovator' {
  if (!aiReadiness) return 'early-majority'

  const adoption = aiReadiness.aiAdoption
  switch (adoption) {
    case 'embedded':
    case 'scaling':
      return 'innovator'
    case 'piloting':
      return 'early-majority'
    case 'experimenting':
      return 'late-majority'
    default:
      return 'laggard'
  }
}

// =============================================================================
// BATCH ENRICHMENT
// =============================================================================

/**
 * Enrich multiple industries in batch
 */
export async function enrichIndustriesBatch(
  industries: Industry[],
  options: EnrichIndustryOptions = {}
): Promise<Map<string, EnrichedIndustry>> {
  ensureConfigured()

  const results = new Map<string, EnrichedIndustry>()

  // Process in parallel with concurrency limit
  const concurrency = 5
  for (let i = 0; i < industries.length; i += concurrency) {
    const batch = industries.slice(i, i + concurrency)
    const enriched = await Promise.all(
      batch.map(industry => enrichIndustry(industry, options))
    )

    for (let j = 0; j < batch.length; j++) {
      results.set(batch[j].id, enriched[j])
    }
  }

  return results
}
