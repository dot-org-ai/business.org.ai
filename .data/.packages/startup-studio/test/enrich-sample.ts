/**
 * Sample Enrichment Test
 *
 * Tests the AI enrichment functions with sample ontology data.
 * Run with: npx tsx test/enrich-sample.ts
 */

import 'dotenv/config'
import { configureAI, enrichIndustry, enrichOccupation, enrichProcess, generateStartupConcept, generateStartupIdeas } from '../src/ai'
import type { Industry, Occupation, Process } from '../src/ontology'
import type { Hypothesis } from '../src/hypothesis'

// =============================================================================
// SAMPLE DATA
// =============================================================================

const sampleIndustry: Industry = {
  ns: 'industries.org.ai',
  type: 'Industry',
  id: 'ProfessionalScientificAndTechnicalServices',
  name: 'Professional, Scientific, and Technical Services',
  description: 'This sector comprises establishments that specialize in performing professional, scientific, and technical activities for others. These activities require a high degree of expertise and training.',
  code: '54',
  shortName: 'prstse',
  sourceType: 'NAICS',
  level: 1,
}

const sampleOccupation: Occupation = {
  ns: 'jobs.org.ai',
  type: 'Job',
  id: 'ChiefFinancialOfficerCfo',
  name: 'Chief Financial Officer (CFO)',
  description: 'Plan, direct, or coordinate the financial activities of an organization at the highest level of management. Includes financial vice presidents.',
  code: '11-1011.00',
  shortName: 'chfiofcf',
  sourceType: 'ONETAlternateTitle',
  occupationCode: '11-1011.00',
}

const sampleProcess: Process = {
  ns: 'process.org.ai',
  type: 'Process',
  id: 'ManageFinancialResources',
  name: 'Manage Financial Resources',
  description: 'Managing the acquisition and use of financial resources. This includes processing accounts payable and receivable, managing cash flow, and ensuring compliance with financial regulations.',
  code: '80000',
  shortName: 'mafire',
  sourceType: 'APQC',
  level: 1,
}

const sampleHypothesis: Hypothesis = {
  id: 'headless-saas-for-agents',
  name: 'Headless SaaS for AI Agents',
  thesis: 'Build API-first SaaS products designed for AI agents to consume, not humans. No UI needed - just clean, well-documented APIs that agents can discover and use.',
  description: 'As AI agents become primary users of business software, we need infrastructure designed for them. This means APIs with semantic descriptions, predictable schemas, and agent-friendly authentication.',

  businessModel: {
    type: 'api',
    targetCustomer: 'agent',
    segments: ['enterprise', 'mid-market', 'startup'],
    delivery: 'api',
    pricing: {
      model: 'usage',
      freeTier: true,
      startingPrice: 0,
      enterpriseCustom: true,
    },
    valueProps: [{
      primary: 'automation',
      statement: 'Let AI agents handle your business processes without human intervention',
    }],
    moat: 'Network effects from agent integrations and semantic API discovery',
  },

  primaryVerticals: ['technology', 'finance', 'professional-services'],
  primarySegments: ['c-suite', 'manager', 'specialist'],

  dimensions: {
    occupations: { enabled: true, priority: 8 },
    industries: { enabled: true, priority: 7 },
    processes: { enabled: true, priority: 9 },
    tasks: { enabled: true, priority: 6 },
    services: { enabled: false, priority: 5 },
    technologies: { enabled: true, priority: 7 },
  },

  constraints: {
    minScore: 60,
    requireIndustry: false,
    requireOccupation: false,
  },

  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: ['api', 'agents', 'headless', 'infrastructure'],
}

// =============================================================================
// TEST FUNCTIONS
// =============================================================================

async function testIndustryEnrichment() {
  console.log('\n' + '='.repeat(80))
  console.log('TESTING: Industry Enrichment')
  console.log('='.repeat(80))
  console.log(`\nEnriching: ${sampleIndustry.name}`)

  const enriched = await enrichIndustry(sampleIndustry, {
    depth: 'standard',
    includeCompetitors: true,
    includeTrends: true,
    includeAIAnalysis: true,
  })

  console.log('\n--- Business Types ---')
  for (const bt of enriched.businessTypes.slice(0, 3)) {
    console.log(`- ${bt.name} (${bt.category})`)
    console.log(`  ${bt.description.slice(0, 100)}...`)
  }

  console.log('\n--- Market Size ---')
  console.log(`TAM: ${enriched.marketSize.tam}`)
  console.log(`Growth: ${enriched.marketSize.growth}`)

  console.log('\n--- AI Readiness ---')
  console.log(`Adoption: ${enriched.aiReadiness.aiAdoption}`)
  console.log(`Top Use Cases: ${enriched.aiReadiness.topAIUseCases.slice(0, 3).join(', ')}`)

  console.log('\n--- Trends ---')
  for (const trend of enriched.trends.slice(0, 3)) {
    console.log(`- ${trend.trend} (${trend.impact}, ${trend.timeframe})`)
  }

  return enriched
}

async function testOccupationEnrichment() {
  console.log('\n' + '='.repeat(80))
  console.log('TESTING: Occupation Enrichment')
  console.log('='.repeat(80))
  console.log(`\nEnriching: ${sampleOccupation.name}`)

  const enriched = await enrichOccupation(sampleOccupation, {
    depth: 'standard',
    includeWorkflows: true,
    includeMessaging: true,
  })

  console.log('\n--- Typical Day ---')
  console.log(enriched.typicalDay.slice(0, 200) + '...')

  console.log('\n--- Top Problems (StoryBrand-style) ---')
  for (const problem of enriched.problemStacks.slice(0, 2)) {
    console.log(`\n${problem.title}:`)
    console.log(`  External: ${problem.external.problem}`)
    console.log(`  Internal: ${problem.internal.feeling}`)
    console.log(`  Philosophical: ${problem.philosophical.injustice}`)
    console.log(`  Stakes: ${problem.stakes}`)
  }

  console.log('\n--- AI Opportunity ---')
  console.log(`Readiness: ${enriched.aiOpportunity.aiReadiness}`)
  console.log(`Automation Potential: ${enriched.aiOpportunity.totalAutomationPotential}`)

  console.log('\n--- Messaging Hooks ---')
  console.log(`Headlines: ${enriched.messagingHooks.headlines.slice(0, 2).join(' | ')}`)

  return enriched
}

async function testProcessEnrichment() {
  console.log('\n' + '='.repeat(80))
  console.log('TESTING: Process Enrichment')
  console.log('='.repeat(80))
  console.log(`\nEnriching: ${sampleProcess.name}`)

  const enriched = await enrichProcess(sampleProcess, {
    depth: 'standard',
    includeDiagrams: true,
  })

  console.log('\n--- Characteristics ---')
  console.log(`Maturity: ${enriched.maturityLevel}`)
  console.log(`Cycle Time: ${enriched.cycleTime}`)
  console.log(`Quality Rate: ${enriched.qualityRate}`)

  console.log('\n--- Bottlenecks ---')
  for (const bottleneck of enriched.bottlenecks.slice(0, 2)) {
    console.log(`- ${bottleneck.location}: ${bottleneck.cause}`)
  }

  console.log('\n--- Automation Opportunities ---')
  for (const opp of enriched.automationOpportunities.slice(0, 3)) {
    console.log(`- ${opp.step} (${opp.impact} impact)`)
  }

  console.log('\n--- Flowchart Diagram ---')
  console.log(enriched.diagrams.flowchart.code.slice(0, 300) + '...')

  return enriched
}

async function testStartupGeneration(enrichedIndustry: any, enrichedOccupation: any) {
  console.log('\n' + '='.repeat(80))
  console.log('TESTING: Startup Concept Generation')
  console.log('='.repeat(80))

  // First generate some ideas
  console.log('\n--- Generating Ideas ---')
  const ideas = await generateStartupIdeas({
    hypothesis: sampleHypothesis,
    occupations: [sampleOccupation],
    industries: [sampleIndustry],
    processes: [sampleProcess],
    count: 5,
  })

  for (const idea of ideas) {
    console.log(`- ${idea.title}: ${idea.oneLiner}`)
    console.log(`  Target: ${idea.targetOccupation || 'General'} | ${idea.serviceType} | Viability: ${idea.estimatedViability}`)
  }

  // Generate a full concept
  console.log('\n--- Generating Full Concept ---')
  const concept = await generateStartupConcept({
    hypothesis: sampleHypothesis,
    occupation: sampleOccupation,
    industry: sampleIndustry,
    process: sampleProcess,
    enrichedIndustry,
    enrichedOccupation,
  })

  console.log(`\nName: ${concept.name?.name}`)
  console.log(`Tagline: ${concept.name?.tagline}`)
  console.log(`Domain: ${concept.name?.domain}`)
  console.log(`\nOne-liner: ${concept.oneLiner}`)
  console.log(`\nPitch: ${concept.pitch}`)

  console.log('\n--- Problem ---')
  console.log(`External: ${concept.problem?.external.problem}`)
  console.log(`Internal: ${concept.problem?.internal.feeling}`)

  console.log('\n--- Solution ---')
  console.log(concept.solution)

  console.log('\n--- Viability Score ---')
  console.log(`Overall: ${concept.viability?.overall}/100 (${concept.viability?.tier})`)
  console.log(`Recommendation: ${concept.viability?.recommendation}`)

  return concept
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('Startup Studio - AI Enrichment Test')
  console.log('===================================')
  console.log('Configuring AI with AWS Bedrock...')

  // Configure AI
  configureAI({
    model: 'anthropic.claude-sonnet-4-20250514-v1:0', // Use Sonnet for faster testing
  })

  try {
    // Test enrichments
    const enrichedIndustry = await testIndustryEnrichment()
    const enrichedOccupation = await testOccupationEnrichment()
    await testProcessEnrichment()

    // Test startup generation
    await testStartupGeneration(enrichedIndustry, enrichedOccupation)

    console.log('\n' + '='.repeat(80))
    console.log('ALL TESTS COMPLETED SUCCESSFULLY')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
