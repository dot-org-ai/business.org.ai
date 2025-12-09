/**
 * Startup Concept Generation AI Functions
 *
 * Generates startup concepts by crossing:
 * - Hypotheses (meta-strategies)
 * - Ontology dimensions (occupation, industry, process, task)
 * - Enrichment data (problems, pain points, opportunities)
 *
 * Then scores and ranks for viability.
 */

import { AI } from 'ai-functions'
import { ensureConfigured } from './config'
import type { Hypothesis } from '../hypothesis'
import type { Industry, Occupation, Process, Task } from '../ontology'
import type { EnrichedIndustry, EnrichedOccupation, ProblemStack } from '../enrichments'
import type {
  StartupConcept,
  StartupName,
  BrandIdentity,
  ViabilityScore,
  OntologyTarget,
} from '../startup'

// =============================================================================
// AI FUNCTION DEFINITIONS
// =============================================================================

const startupAI = AI({
  startupConcept: {
    oneLiner: 'One line description (max 100 chars)',
    pitch: 'Elevator pitch (max 500 chars)',

    problem: {
      id: 'Problem ID (kebab-case)',
      title: 'Problem title',
      context: 'When/where this problem occurs',

      external: {
        problem: 'The tangible, visible problem',
        manifestations: ['How it shows up'],
        metrics: ['Measurable symptoms'],
        villains: ['External causes'],
        cost: 'Quantified cost',
      },

      internal: {
        feeling: 'How it makes them feel',
        fear: 'What they fear',
        doubt: 'What they doubt',
        desire: 'What they want',
        identity: 'Identity impact',
      },

      philosophical: {
        injustice: 'Why it is wrong',
        shouldBe: 'How it should be',
        higherPurpose: 'The larger mission',
        villain: 'Philosophical villain',
      },

      stakes: 'What happens if not solved',
      transformation: 'Who they become',
      successLooksLike: 'Picture of success',
      guideEmpathy: 'How we understand them',
      guideAuthority: 'Why we can help',
      plan: ['3-5 step plan'],
      cta: 'Call to action',
    },

    solution: 'How we solve the problem',

    serviceType: 'One of: full-automation, augmentation, overlay, platform, api',
    aiOverlays: ['Applicable overlay types: coaching, training, analysis, consulting, planning, review, documentation, monitoring'],

    businessModel: {
      type: 'One of: saas, paas, api, marketplace, agency, productized, data, infrastructure',
      targetCustomer: 'One of: agent, human, hybrid',
      segments: ['Customer segments in priority order'],
      delivery: 'One of: api, chat, scheduled, streaming, embedded, managed, self-service',
      pricing: {
        model: 'One of: usage, seat, flat, tiered, freemium, outcome, hybrid, marketplace, credits',
        freeTrialDays: 'Number or null',
        freeTier: 'true or false',
        startingPrice: 'Starting price in USD/month or null',
        enterpriseCustom: 'true or false',
      },
      valueProps: [{
        primary: 'Primary value angle',
        secondary: 'Secondary value angle or null',
        statement: 'Value proposition statement',
        quantified: 'Quantified benefit or null',
      }],
      moat: 'Competitive moat or unfair advantage',
    },

    tags: ['Relevant tags for filtering'],
  },

  startupName: {
    name: 'The startup name',
    tagline: 'Short tagline (max 10 words)',
    domain: 'Primary domain name suggestion',
    alternativeDomains: ['Alternative domain options'],
    naming: {
      pattern: 'One of: compound, portmanteau, misspelling, suffix, prefix, acronym, real-word, abstract, descriptive, metaphor',
      pronunciation: 'Phonetic pronunciation',
      memorability: 'One of: low, medium, high',
      spellability: 'One of: easy, medium, hard',
    },
  },

  brandIdentity: {
    tone: 'One of: professional, technical, friendly, playful, bold, minimal, premium',
    visual: {
      primaryColor: 'Primary brand color (hex)',
      secondaryColor: 'Secondary brand color (hex)',
      iconStyle: 'One of: geometric, organic, abstract, lettermark, mascot',
      typography: 'One of: sans-serif, serif, mono, display',
    },
    voice: {
      personality: ['3-5 personality traits'],
      doSay: ['Phrases we would say'],
      dontSay: ['Phrases we avoid'],
    },
  },

  viabilityScore: {
    overall: 'Overall score 0-100',
    tier: 'One of: S, A, B, C, D',
    recommendation: 'One of: pursue-aggressively, test-hypothesis, explore-further, deprioritize, skip',

    dimensions: {
      marketSize: {
        dimension: 'Market Size',
        score: 'Score 0-100',
        weight: 'Weight 0-1',
        rationale: 'Why this score',
        signals: ['Supporting signals'],
      },
      problemSeverity: {
        dimension: 'Problem Severity',
        score: 'Score 0-100',
        weight: 'Weight 0-1',
        rationale: 'Why this score',
        signals: ['Supporting signals'],
      },
      solutionFit: {
        dimension: 'Solution Fit',
        score: 'Score 0-100',
        weight: 'Weight 0-1',
        rationale: 'Why this score',
        signals: ['Supporting signals'],
      },
      competition: {
        dimension: 'Competition',
        score: 'Score 0-100 (higher = less competition)',
        weight: 'Weight 0-1',
        rationale: 'Why this score',
        signals: ['Supporting signals'],
      },
      gtmEase: {
        dimension: 'GTM Ease',
        score: 'Score 0-100',
        weight: 'Weight 0-1',
        rationale: 'Why this score',
        signals: ['Supporting signals'],
      },
      monetization: {
        dimension: 'Monetization',
        score: 'Score 0-100',
        weight: 'Weight 0-1',
        rationale: 'Why this score',
        signals: ['Supporting signals'],
      },
      defensibility: {
        dimension: 'Defensibility',
        score: 'Score 0-100',
        weight: 'Weight 0-1',
        rationale: 'Why this score',
        signals: ['Supporting signals'],
      },
      timing: {
        dimension: 'Timing',
        score: 'Score 0-100',
        weight: 'Weight 0-1',
        rationale: 'Why this score',
        signals: ['Supporting signals'],
      },
    },
  },

  startupIdeas: {
    ideas: [{
      title: 'Short title for the startup idea',
      oneLiner: 'One line description',
      targetOccupation: 'Target occupation if any',
      targetIndustry: 'Target industry if any',
      targetProcess: 'Target process if any',
      serviceType: 'Type of AI service',
      uniqueAngle: 'What makes this unique',
      estimatedViability: 'Estimated viability: low, medium, high, very-high',
    }],
  },
})

// =============================================================================
// CONCEPT GENERATION
// =============================================================================

export interface GenerateConceptInput {
  hypothesis: Hypothesis
  occupation?: Occupation
  industry?: Industry
  process?: Process
  task?: Task
  enrichedOccupation?: EnrichedOccupation
  enrichedIndustry?: EnrichedIndustry
  problemStack?: ProblemStack
}

/**
 * Generate a complete startup concept from inputs
 */
export async function generateStartupConcept(
  input: GenerateConceptInput
): Promise<Partial<StartupConcept>> {
  ensureConfigured()

  const { hypothesis, occupation, industry, process, task, enrichedOccupation, enrichedIndustry, problemStack } = input

  const context = buildContext(input)

  // Generate core concept
  const conceptPrompt = `
Generate a startup concept based on the following inputs:

Hypothesis: ${hypothesis.name}
${hypothesis.thesis}

${context}

Create a startup that:
1. Addresses a real problem for the target audience
2. Leverages AI/automation appropriately
3. Has a clear value proposition
4. Has a viable business model

Be specific and practical. This should be a startup someone could actually build.
`

  const concept = await startupAI.startupConcept(conceptPrompt)

  // Generate name
  const namePrompt = `
Generate a name for this startup:

${concept.oneLiner}

Target: ${occupation?.name || industry?.name || 'General'}
Service Type: ${concept.serviceType}

The name should be:
- Memorable and easy to spell
- Appropriate for the target audience
- Available as a domain (suggest options)
`

  const name = await startupAI.startupName(namePrompt)

  // Generate brand identity
  const brandPrompt = `
Create a brand identity for "${name.name}":

${concept.oneLiner}
Target audience: ${occupation?.name || 'Business professionals'}

Define the tone, visual style, and voice.
`

  const brand = await startupAI.brandIdentity(brandPrompt)

  // Score viability
  const scorePrompt = `
Score the viability of this startup concept:

Name: ${name.name}
${concept.oneLiner}
${concept.pitch}

Target: ${occupation?.name || 'General'} in ${industry?.name || 'Various industries'}
Business Model: ${concept.businessModel.type}
Service Type: ${concept.serviceType}

${enrichedIndustry ? `Industry Trends: ${enrichedIndustry.trends.map(t => t.trend).join(', ')}` : ''}
${enrichedOccupation ? `Top Pain Points: ${enrichedOccupation.topPainPointIds.join(', ')}` : ''}

Score across all dimensions: market size, problem severity, solution fit, competition, GTM ease, monetization, defensibility, timing.
`

  const viability = await startupAI.viabilityScore(scorePrompt)

  // Build ontology target
  const ontologyTarget: OntologyTarget = {
    occupationId: occupation?.id,
    occupationName: occupation?.name,
    industryId: industry?.id,
    industryName: industry?.name,
    processId: process?.id,
    processName: process?.name,
    taskId: task?.id,
    taskName: task?.name,
  }

  // Compile partial concept
  return {
    hypothesisId: hypothesis.id,
    ontologyTarget,
    name: name as StartupName,
    brand: {
      name: name as StartupName,
      tone: brand.tone as any,
      visual: brand.visual as any,
      voice: brand.voice as any,
    },
    oneLiner: concept.oneLiner,
    pitch: concept.pitch,
    problem: concept.problem as ProblemStack,
    solution: concept.solution,
    serviceType: concept.serviceType as any,
    aiOverlays: concept.aiOverlays as any[],
    businessModel: concept.businessModel as any,
    valueProps: concept.businessModel.valueProps as any[],
    pricing: concept.businessModel.pricing as any,
    viability: viability as unknown as ViabilityScore,
    tags: concept.tags,
    status: 'generated',
    createdBy: 'system',
  }
}

// =============================================================================
// BATCH IDEA GENERATION
// =============================================================================

export interface GenerateIdeasInput {
  hypothesis: Hypothesis
  occupations?: Occupation[]
  industries?: Industry[]
  processes?: Process[]
  count?: number
}

/**
 * Generate multiple startup ideas at once
 */
export async function generateStartupIdeas(
  input: GenerateIdeasInput
): Promise<Array<{
  title: string
  oneLiner: string
  targetOccupation?: string
  targetIndustry?: string
  targetProcess?: string
  serviceType: string
  uniqueAngle: string
  estimatedViability: string
}>> {
  ensureConfigured()

  const { hypothesis, occupations = [], industries = [], processes = [], count = 10 } = input

  const prompt = `
Generate ${count} unique startup ideas based on this hypothesis:

Hypothesis: ${hypothesis.name}
${hypothesis.thesis}

Available dimensions to combine:
${occupations.length > 0 ? `Occupations: ${occupations.slice(0, 20).map(o => o.name).join(', ')}` : ''}
${industries.length > 0 ? `Industries: ${industries.slice(0, 20).map(i => i.name).join(', ')}` : ''}
${processes.length > 0 ? `Processes: ${processes.slice(0, 20).map(p => p.name).join(', ')}` : ''}

Generate diverse ideas that:
1. Target different combinations of occupation × industry × process
2. Use different AI service types (full-automation, augmentation, overlay, platform, api)
3. Have different unique angles
4. Range from safe bets to moonshots

Each idea should be distinct and viable.
`

  const result = await startupAI.startupIdeas(prompt) as any
  return (result.ideas || []) as Array<{
    title: string
    oneLiner: string
    targetOccupation?: string
    targetIndustry?: string
    targetProcess?: string
    serviceType: string
    uniqueAngle: string
    estimatedViability: string
  }>
}

// =============================================================================
// CONCEPT SCORING
// =============================================================================

/**
 * Score an existing concept for viability
 */
export async function scoreStartupConcept(
  concept: Partial<StartupConcept>,
  enrichedIndustry?: EnrichedIndustry,
  enrichedOccupation?: EnrichedOccupation
): Promise<ViabilityScore> {
  ensureConfigured()

  const prompt = `
Score the viability of this startup concept:

Name: ${concept.name?.name || 'Unnamed'}
${concept.oneLiner}
${concept.pitch}

Target Occupation: ${concept.ontologyTarget?.occupationName || 'General'}
Target Industry: ${concept.ontologyTarget?.industryName || 'Various'}
Business Model: ${concept.businessModel?.type}
Service Type: ${concept.serviceType}

${enrichedIndustry ? `
Industry Intelligence:
- Market Size: ${enrichedIndustry.marketSize.tam}
- Growth: ${enrichedIndustry.marketSize.growth}
- AI Readiness: ${enrichedIndustry.aiReadiness.aiAdoption}
- Top Trends: ${enrichedIndustry.trends.slice(0, 3).map(t => t.trend).join(', ')}
` : ''}

${enrichedOccupation ? `
Occupation Intelligence:
- Budget Authority: ${enrichedOccupation.budgetAuthority}
- Decision Role: ${enrichedOccupation.decisionRole}
- AI Readiness: ${enrichedOccupation.aiOpportunity.aiReadiness}
- Top Problems: ${enrichedOccupation.topProblemIds.slice(0, 3).join(', ')}
` : ''}

Score across all 8 dimensions with specific rationale and signals.
`

  const result = await startupAI.viabilityScore(prompt)
  return result as unknown as ViabilityScore
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildContext(input: GenerateConceptInput): string {
  const parts: string[] = []

  if (input.occupation) {
    parts.push(`Target Occupation: ${input.occupation.name}`)
    parts.push(`Description: ${input.occupation.description}`)
  }

  if (input.industry) {
    parts.push(`Target Industry: ${input.industry.name}`)
    parts.push(`Description: ${input.industry.description}`)
  }

  if (input.process) {
    parts.push(`Target Process: ${input.process.name}`)
    parts.push(`Description: ${input.process.description}`)
  }

  if (input.task) {
    parts.push(`Target Task: ${input.task.name}`)
    parts.push(`Description: ${input.task.description}`)
  }

  if (input.enrichedOccupation) {
    const eo = input.enrichedOccupation
    parts.push(`\nOccupation Intelligence:`)
    parts.push(`- Typical Day: ${eo.typicalDay}`)
    parts.push(`- Top Stressors: ${eo.stressors.slice(0, 3).join(', ')}`)
    parts.push(`- AI Readiness: ${eo.aiOpportunity.aiReadiness}`)
  }

  if (input.enrichedIndustry) {
    const ei = input.enrichedIndustry
    parts.push(`\nIndustry Intelligence:`)
    parts.push(`- Market Size: ${ei.marketSize.tam}`)
    parts.push(`- AI Adoption: ${ei.aiReadiness.aiAdoption}`)
    parts.push(`- Top Trends: ${ei.trends.slice(0, 3).map(t => t.trend).join(', ')}`)
  }

  if (input.problemStack) {
    const ps = input.problemStack
    parts.push(`\nProblem to Solve:`)
    parts.push(`- ${ps.title}: ${ps.external.problem}`)
    parts.push(`- Internal: ${ps.internal.feeling}`)
    parts.push(`- Stakes: ${ps.stakes}`)
  }

  return parts.join('\n')
}

/**
 * Generate a unique ID for a startup concept
 */
export function generateConceptId(input: GenerateConceptInput): string {
  const parts = [
    input.hypothesis.id,
    input.occupation?.id || 'gen',
    input.industry?.id || 'gen',
    input.process?.id || 'gen',
    Date.now().toString(36),
  ]
  return parts.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '')
}
