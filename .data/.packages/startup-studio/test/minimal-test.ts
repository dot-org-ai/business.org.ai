/**
 * Minimal Workflow Test
 *
 * Tests individual AI functions with minimal data to verify the pipeline.
 * Run with: pnpm tsx test/minimal-test.ts
 */

import 'dotenv/config'
import { configureAI, MODELS } from '../src/ai/config'
import type { Industry, Occupation, Process } from '../src/ontology'

// =============================================================================
// MINIMAL SAMPLE DATA
// =============================================================================

const testIndustry: Industry = {
  ns: 'industries.org.ai',
  type: 'Industry',
  id: 'SoftwarePublishing',
  name: 'Software Publishing',
  description: 'Establishments engaged in computer software publishing or publishing and reproduction.',
  code: '5112',
  shortName: 'sofpub',
  sourceType: 'NAICS',
  level: 2,
}

const testOccupation: Occupation = {
  ns: 'jobs.org.ai',
  type: 'Job',
  id: 'AccountantsCpa',
  name: 'Accountants (CPA)',
  description: 'Examine, analyze, and interpret accounting records to prepare financial statements and advise on tax and financial matters.',
  code: '13-2011.00',
  shortName: 'acccpa',
  sourceType: 'ONETAlternateTitle',
  occupationCode: '13-2011.00',
}

const testProcess: Process = {
  ns: 'process.org.ai',
  type: 'Process',
  id: 'ProcessAccountsPayable',
  name: 'Process Accounts Payable',
  description: 'Process and pay vendor invoices. Includes invoice receipt, approval, and payment execution.',
  code: '80100',
  shortName: 'proacpa',
  sourceType: 'APQC',
  level: 2,
}

// =============================================================================
// TEST RUNNER
// =============================================================================

type TestResult = {
  name: string
  success: boolean
  duration: number
  result?: any
  error?: string
}

async function runTest(name: string, fn: () => Promise<any>): Promise<TestResult> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`TEST: ${name}`)
  console.log('='.repeat(60))

  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start
    console.log(`✅ PASSED (${duration}ms)`)
    return { name, success: true, duration, result }
  } catch (error) {
    const duration = Date.now() - start
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ FAILED: ${errorMsg}`)
    return { name, success: false, duration, error: errorMsg }
  }
}

// =============================================================================
// INDIVIDUAL TESTS
// =============================================================================

async function testIndustryEnrichment() {
  const { enrichIndustry } = await import('../src/ai/enrich-industry')

  console.log(`Enriching industry: ${testIndustry.name}`)

  const result = await enrichIndustry(testIndustry, {
    depth: 'minimal',
    includeCompetitors: false,
    includeTrends: true,
    includeAIAnalysis: true,
  })

  console.log('\nResult summary:')
  console.log(`- Business Types: ${result.businessTypes.length}`)
  console.log(`- Trends: ${result.trends.length}`)
  console.log(`- Market Size TAM: ${result.marketSize.tam}`)
  console.log(`- AI Readiness: ${result.aiReadiness.aiAdoption}`)

  return result
}

async function testOccupationEnrichment() {
  const { enrichOccupation } = await import('../src/ai/enrich-occupation')

  console.log(`Enriching occupation: ${testOccupation.name}`)

  const result = await enrichOccupation(testOccupation, {
    depth: 'minimal',
    includeWorkflows: false,
    includeMessaging: false,
  })

  console.log('\nResult summary:')
  console.log(`- Problem Stacks: ${result.problemStacks.length}`)
  console.log(`- Pain Points: ${result.painPoints.length}`)
  console.log(`- Budget Authority: ${result.budgetAuthority}`)
  console.log(`- AI Readiness: ${result.aiOpportunity.aiReadiness}`)

  if (result.problemStacks.length > 0) {
    const topProblem = result.problemStacks[0]
    console.log('\nTop Problem:')
    console.log(`  Title: ${topProblem.title}`)
    console.log(`  External: ${topProblem.external.problem}`)
    console.log(`  Internal: ${topProblem.internal.feeling}`)
  }

  return result
}

async function testProcessEnrichment() {
  const { enrichProcess } = await import('../src/ai/enrich-process')

  console.log(`Enriching process: ${testProcess.name}`)

  const result = await enrichProcess(testProcess, {
    depth: 'minimal',
    includeDiagrams: true,
  })

  console.log('\nResult summary:')
  console.log(`- Maturity Level: ${result.maturityLevel}`)
  console.log(`- Bottlenecks: ${result.bottlenecks.length}`)
  console.log(`- Automation Opportunities: ${result.automationOpportunities.length}`)
  console.log(`- Has Flowchart: ${!!result.diagrams.flowchart.code}`)

  if (result.diagrams.flowchart.code) {
    console.log('\nFlowchart (first 200 chars):')
    console.log(result.diagrams.flowchart.code.slice(0, 200) + '...')
  }

  return result
}

async function testStartupIdeaGeneration() {
  const { generateStartupIdeas } = await import('../src/ai/generate-startup')

  const hypothesis = {
    id: 'ai-services',
    name: 'AI-Delivered Services',
    thesis: 'Transform traditional consulting services into AI-delivered on-demand services.',
    description: 'Use AI to productize expert knowledge and deliver it at scale.',
    businessModel: {
      type: 'saas' as const,
      targetCustomer: 'business' as const,
      segments: ['mid-market' as const],
      delivery: 'platform' as const,
      pricing: {
        model: 'subscription' as const,
        freeTier: true,
        startingPrice: 99,
        enterpriseCustom: false,
      },
      valueProps: [{
        primary: 'efficiency' as const,
        statement: 'Get expert-level analysis instantly',
      }],
      moat: 'Proprietary training data',
    },
    primaryVerticals: ['finance'],
    primarySegments: ['specialist' as const],
    dimensions: {
      occupations: { enabled: true, priority: 9 },
      industries: { enabled: true, priority: 7 },
      processes: { enabled: true, priority: 8 },
      tasks: { enabled: false, priority: 5 },
      services: { enabled: false, priority: 4 },
      technologies: { enabled: false, priority: 3 },
    },
    constraints: { minScore: 50, requireIndustry: false, requireOccupation: true },
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['ai', 'services'],
  }

  console.log(`Generating ideas for hypothesis: ${hypothesis.name}`)

  const ideas = await generateStartupIdeas({
    hypothesis,
    occupations: [testOccupation],
    industries: [testIndustry],
    processes: [testProcess],
    count: 3,
  })

  console.log(`\nGenerated ${ideas.length} ideas:`)
  for (const idea of ideas) {
    console.log(`\n- ${idea.title}`)
    console.log(`  ${idea.oneLiner}`)
    console.log(`  Target: ${idea.targetOccupation || 'General'}`)
    console.log(`  Viability: ${idea.estimatedViability}`)
  }

  return ideas
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('Startup Studio - Minimal Workflow Test')
  console.log('======================================')
  console.log(`Using model: ${MODELS.sonnet} (faster for testing)`)

  // Configure AI with Sonnet for faster testing
  await configureAI({
    model: MODELS.sonnet,
  })

  const results: TestResult[] = []

  // Parse command line args to run specific tests
  const args = process.argv.slice(2)
  const testMap: Record<string, () => Promise<any>> = {
    industry: testIndustryEnrichment,
    occupation: testOccupationEnrichment,
    process: testProcessEnrichment,
    ideas: testStartupIdeaGeneration,
  }

  const testsToRun = args.length > 0
    ? args.filter(arg => arg in testMap)
    : Object.keys(testMap)

  if (testsToRun.length === 0) {
    console.log('\nAvailable tests: industry, occupation, process, ideas')
    console.log('Usage: pnpm tsx test/minimal-test.ts [test1] [test2] ...')
    process.exit(0)
  }

  console.log(`\nRunning tests: ${testsToRun.join(', ')}`)

  for (const testName of testsToRun) {
    results.push(await runTest(testName, testMap[testName]))
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0)

  for (const r of results) {
    const status = r.success ? '✅' : '❌'
    console.log(`${status} ${r.name} (${r.duration}ms)`)
    if (!r.success && r.error) {
      console.log(`   Error: ${r.error}`)
    }
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed (${totalTime}ms)`)

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(console.error)
