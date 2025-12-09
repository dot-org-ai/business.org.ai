/**
 * Occupation Enrichment AI Functions
 *
 * Enriches occupation entities with:
 * - Problem stacks (external/internal/philosophical)
 * - Pain points and workflows
 * - Buying triggers and behaviors
 * - AI automation opportunities
 * - Messaging hooks for marketing
 */

import { AI } from 'ai-functions'
import { ensureConfigured } from './config'
import type { Occupation } from '../ontology'
import type {
  EnrichedOccupation,
  ProblemStack,
  PainPoint,
  Workflow,
  BuyingTrigger,
} from '../enrichments'

// =============================================================================
// AI FUNCTION DEFINITIONS
// =============================================================================

const occupationAI = AI({
  problemStacks: {
    stacks: [{
      id: 'Unique kebab-case identifier for this problem',
      title: 'Short title summarizing the problem',
      context: 'Situation or trigger where this problem arises',

      external: {
        problem: 'The tangible, visible problem (what they can point to)',
        manifestations: ['How this problem shows up day-to-day'],
        metrics: ['Measurable symptoms of this problem'],
        villains: ['External forces/entities causing this problem'],
        cost: 'Quantified cost of this problem (time, money, opportunity)',
      },

      internal: {
        feeling: 'How this makes them feel (frustrated, overwhelmed, incompetent)',
        fear: 'What they are afraid of happening',
        doubt: 'What they doubt about themselves',
        desire: 'What they secretly want (but may not admit)',
        identity: 'How this affects their professional identity',
      },

      philosophical: {
        injustice: 'Why this situation is simply wrong/unfair',
        shouldBe: 'How things ought to be in a just world',
        higherPurpose: 'The larger mission or principle at stake',
        villain: 'The philosophical villain (inefficiency, bureaucracy, greed)',
      },

      stakes: 'What happens if this problem is not solved',
      transformation: 'Who they become when the problem is solved',
      successLooksLike: 'Concrete picture of success',

      guideEmpathy: 'How we show we understand their struggle',
      guideAuthority: 'Why we are qualified to help',
      plan: ['3-5 step plan to solve the problem'],
      cta: 'Clear call to action',
    }],
  },

  painPoints: {
    points: [{
      id: 'Unique kebab-case identifier',
      title: 'Short title for the pain point',
      description: 'Detailed description of the pain and its impact',
      severity: 'One of: annoyance, frustration, blocker, crisis',
      frequency: 'One of: rare, occasional, regular, daily, constant',
      triggers: ['What triggers this pain point'],
      consequences: ['What happens if not addressed'],
      workarounds: ['Current workarounds used'],
      existingSolutions: ['Current solutions in market'],
      solutionGaps: ['What existing solutions miss'],
      idealSolution: 'What the ideal solution would look like',
      timeWasted: 'Time wasted per week due to this pain',
      costImpact: 'Financial impact of this pain',
      willingnessToPay: 'One of: low, medium, high',
    }],
  },

  workflows: {
    workflows: [{
      id: 'Unique kebab-case identifier',
      name: 'Name of the workflow',
      description: 'What this workflow accomplishes',
      frequency: 'One of: rare, occasional, regular, daily, constant',
      steps: [{
        order: 'Step number (number)',
        name: 'Name of this step',
        description: 'What happens in this step',
        tools: ['Tools used in this step'],
        inputs: ['What this step needs as input'],
        outputs: ['What this step produces'],
        painPoints: ['Pain point IDs related to this step'],
        automationPotential: 'One of: none, partial, full',
        timeSpent: 'Typical time spent on this step',
      }],
      totalTime: 'Total time to complete workflow',
      bottlenecks: ['Where the workflow gets stuck'],
    }],
  },

  buyingTriggers: {
    triggers: [{
      trigger: 'What event triggers a buying decision',
      urgency: 'One of: low, medium, high, critical',
      budget: 'One of: no-budget, discretionary, allocated, strategic',
      decisionMakers: ['Who is involved in decision'],
      evaluationCriteria: ['What they evaluate solutions on'],
    }],
  },

  aiOpportunity: {
    tasks: [{
      task: 'Task description',
      automationLevel: 'One of: augment, partial, full',
      timeFreed: 'Time freed up if automated',
      resistance: 'One of: welcome, cautious, resistant, hostile',
    }],
    totalAutomationPotential: 'Percentage of role that could be automated (e.g., "40%")',
    aiReadiness: 'One of: resistant, curious, experimenting, adopting, championing',
  },

  dayInLife: {
    typicalDay: 'Description of a typical work day',
    responsibilities: ['Core responsibilities'],
    kpis: ['Key performance indicators they are measured on'],
    stressors: ['Main sources of work stress'],
    timeAllocation: 'Object mapping activity types to percentage of time',
  },

  toolsAndTechnology: {
    currentTools: [{
      name: 'Tool name',
      category: 'Tool category',
      satisfaction: 'One of: hates, dislikes, neutral, likes, loves',
      switching: 'One of: locked-in, reluctant, open, actively-looking',
    }],
    toolGaps: ['Tool categories with unmet needs'],
  },

  messagingHooks: {
    headlines: ['Attention-grabbing headlines for this persona'],
    emailSubjects: ['Email subject lines that would get opened'],
    adCopy: ['Short ad copy variations'],
    socialPosts: ['Social media post ideas'],
    objections: [{
      objection: 'Common objection',
      response: 'How to overcome it',
    }],
  },
})

// =============================================================================
// ENRICHMENT FUNCTIONS
// =============================================================================

export interface EnrichOccupationOptions {
  depth?: 'basic' | 'standard' | 'comprehensive'
  industryContext?: string
  includeWorkflows?: boolean
  includeMessaging?: boolean
}

/**
 * Enrich an occupation with deep problem analysis and business intelligence
 */
export async function enrichOccupation(
  occupation: Occupation,
  options: EnrichOccupationOptions = {}
): Promise<EnrichedOccupation> {
  ensureConfigured()

  const {
    depth = 'standard',
    industryContext,
    includeWorkflows = true,
    includeMessaging = true,
  } = options

  const occupationContext = `
Occupation: ${occupation.name}
O*NET Code: ${occupation.occupationCode}
Description: ${occupation.description}
${industryContext ? `Industry Context: ${industryContext}` : ''}
`

  // Generate problem stacks (StoryBrand-style deep analysis)
  const problemStacksPrompt = `
Analyze the ${occupation.name} role and identify the ${depth === 'basic' ? '3' : depth === 'standard' ? '5' : '7'} most significant problems they face that a software/AI solution could address.

${occupationContext}

For each problem, provide a complete StoryBrand-style analysis:
- External problem: The tangible, visible manifestation
- Internal problem: How it makes them feel, their fears and desires
- Philosophical problem: Why this situation is unjust, what should be

Also provide the story elements: stakes, transformation, and a clear plan + CTA.
Focus on problems where AI/software could genuinely help.
`

  const problemStacks = await occupationAI.problemStacks(problemStacksPrompt)

  // Generate tactical pain points
  const painPointsPrompt = `
Identify ${depth === 'basic' ? '5-7' : depth === 'standard' ? '8-12' : '12-15'} specific pain points for the ${occupation.name} role.

${occupationContext}

For each pain point, analyze severity, frequency, current workarounds, and willingness to pay for a solution.
Focus on pain points that represent real opportunities for software/AI products.
`

  const painPoints = await occupationAI.painPoints(painPointsPrompt)

  // Generate workflows (if requested)
  let workflows: Workflow[] = []
  if (includeWorkflows) {
    const workflowsPrompt = `
Map the ${depth === 'basic' ? '2-3' : depth === 'standard' ? '3-5' : '5-7'} most important workflows performed by a ${occupation.name}.

${occupationContext}

For each workflow, break down the steps, tools used, time spent, and automation potential.
Focus on workflows where AI could provide significant value.
`
    const workflowsResult = await occupationAI.workflows(workflowsPrompt)
    workflows = workflowsResult.workflows as Workflow[]
  }

  // Generate buying triggers
  const buyingTriggersPrompt = `
Identify ${depth === 'basic' ? '3-4' : '5-7'} key buying triggers for the ${occupation.name} role.

${occupationContext}

What events or situations trigger them to look for new software tools?
What's their budget authority and decision-making role?
`

  const buyingTriggers = await occupationAI.buyingTriggers(buyingTriggersPrompt)

  // Generate AI opportunity analysis
  const aiOpportunityPrompt = `
Analyze the AI automation opportunity for the ${occupation.name} role.

${occupationContext}

Which tasks could be augmented, partially automated, or fully automated by AI?
What's the overall automation potential and how ready is this persona to adopt AI?
`

  const aiOpportunity = await occupationAI.aiOpportunity(aiOpportunityPrompt)

  // Generate day in life
  const dayInLifePrompt = `
Describe a typical day in the life of a ${occupation.name}.

${occupationContext}

Include responsibilities, KPIs they're measured on, main stressors, and time allocation.
`

  const dayInLife = await occupationAI.dayInLife(dayInLifePrompt)

  // Generate tools and technology
  const toolsPrompt = `
Analyze the tools and technology used by a typical ${occupation.name}.

${occupationContext}

What tools do they currently use? How satisfied are they? Where are the gaps?
`

  const toolsAndTech = await occupationAI.toolsAndTechnology(toolsPrompt)

  // Generate messaging hooks (if requested)
  let messagingHooks: EnrichedOccupation['messagingHooks'] | undefined
  if (includeMessaging) {
    const messagingPrompt = `
Create marketing messaging hooks for software targeting ${occupation.name} professionals.

${occupationContext}

Generate attention-grabbing headlines, email subjects, ad copy, social posts, and common objections with responses.
Make the copy specific to their pain points and aspirations.
`
    messagingHooks = await occupationAI.messagingHooks(messagingPrompt) as EnrichedOccupation['messagingHooks']
  }

  // Extract typed arrays from AI responses
  const problemStacksArray = (problemStacks as { stacks: ProblemStack[] }).stacks
  const painPointsArray = (painPoints as { points: PainPoint[] }).points
  const buyingTriggersArray = (buyingTriggers as { triggers: BuyingTrigger[] }).triggers
  const aiOpportunityData = aiOpportunity as {
    tasks: { task: string; automationLevel: string; timeFreed: string; resistance: string }[]
    totalAutomationPotential: string
    aiReadiness: string
  }
  const toolsData = toolsAndTech as {
    currentTools: { name: string; category: string; satisfaction: string; switching: string }[]
    toolGaps: string[]
  }
  const dayInLifeData = dayInLife as unknown as {
    typicalDay: string
    responsibilities: string[]
    kpis: string[]
    stressors: string[]
    timeAllocation: Record<string, number>
  }

  // Compile enriched occupation
  const enriched: EnrichedOccupation = {
    occupationId: occupation.id,

    // Day in life
    typicalDay: dayInLifeData.typicalDay,
    responsibilities: dayInLifeData.responsibilities,
    kpis: dayInLifeData.kpis,
    stressors: dayInLifeData.stressors,

    // Problem analysis
    problemStacks: problemStacksArray as ProblemStack[],
    topProblemIds: problemStacksArray.slice(0, 3).map((s) => s.id),

    // Pain points
    painPoints: painPointsArray as PainPoint[],
    topPainPointIds: painPointsArray.slice(0, 3).map((p) => p.id),

    // Workflows
    workflows,
    timeAllocation: dayInLifeData.timeAllocation || {},

    // Tools
    currentTools: toolsData.currentTools as EnrichedOccupation['currentTools'],
    toolGaps: toolsData.toolGaps,

    // Buying behavior
    buyingTriggers: buyingTriggersArray as BuyingTrigger[],
    budgetAuthority: determineBudgetAuthority(occupation),
    decisionRole: determineDecisionRole(occupation),

    // AI opportunity
    aiOpportunity: {
      tasks: aiOpportunityData.tasks as EnrichedOccupation['aiOpportunity']['tasks'],
      totalAutomationPotential: aiOpportunityData.totalAutomationPotential,
      aiReadiness: aiOpportunityData.aiReadiness as EnrichedOccupation['aiOpportunity']['aiReadiness'],
    },

    // Messaging
    messagingHooks: messagingHooks || {
      headlines: [],
      emailSubjects: [],
      adCopy: [],
      socialPosts: [],
      objections: [],
    },
  }

  return enriched
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function determineBudgetAuthority(occupation: Occupation): 'none' | 'small' | 'moderate' | 'large' | 'unlimited' {
  const name = occupation.name.toLowerCase()

  if (name.includes('chief') || name.includes('ceo') || name.includes('president')) {
    return 'unlimited'
  }
  if (name.includes('director') || name.includes('vp') || name.includes('vice president')) {
    return 'large'
  }
  if (name.includes('manager') || name.includes('head')) {
    return 'moderate'
  }
  if (name.includes('lead') || name.includes('senior')) {
    return 'small'
  }
  return 'none'
}

function determineDecisionRole(occupation: Occupation): 'user' | 'influencer' | 'decision-maker' | 'economic-buyer' | 'blocker' {
  const name = occupation.name.toLowerCase()

  if (name.includes('chief') || name.includes('ceo') || name.includes('cfo')) {
    return 'economic-buyer'
  }
  if (name.includes('director') || name.includes('vp') || name.includes('head')) {
    return 'decision-maker'
  }
  if (name.includes('manager') || name.includes('lead')) {
    return 'influencer'
  }
  return 'user'
}

// =============================================================================
// BATCH ENRICHMENT
// =============================================================================

/**
 * Enrich multiple occupations in batch
 */
export async function enrichOccupationsBatch(
  occupations: Occupation[],
  options: EnrichOccupationOptions = {}
): Promise<Map<string, EnrichedOccupation>> {
  ensureConfigured()

  const results = new Map<string, EnrichedOccupation>()

  // Process in parallel with concurrency limit
  const concurrency = 3 // Lower concurrency for heavier occupation enrichment
  for (let i = 0; i < occupations.length; i += concurrency) {
    const batch = occupations.slice(i, i + concurrency)
    const enriched = await Promise.all(
      batch.map(occupation => enrichOccupation(occupation, options))
    )

    for (let j = 0; j < batch.length; j++) {
      results.set(batch[j].id, enriched[j])
    }
  }

  return results
}

// =============================================================================
// SPECIALIZED FUNCTIONS
// =============================================================================

/**
 * Generate just the problem stacks for an occupation
 */
export async function generateProblemStacks(
  occupation: Occupation,
  count: number = 5
): Promise<ProblemStack[]> {
  ensureConfigured()

  const prompt = `
Analyze the ${occupation.name} role and identify ${count} significant problems they face that a software/AI solution could address.

Occupation: ${occupation.name}
O*NET Code: ${occupation.occupationCode}
Description: ${occupation.description}

For each problem, provide a complete StoryBrand-style analysis with external, internal, and philosophical dimensions.
`

  const result = await occupationAI.problemStacks(prompt)
  return result.stacks as ProblemStack[]
}

/**
 * Generate messaging hooks for an occupation
 */
export async function generateMessagingHooks(
  occupation: Occupation,
  problemContext?: string
): Promise<EnrichedOccupation['messagingHooks']> {
  ensureConfigured()

  const prompt = `
Create marketing messaging hooks for software targeting ${occupation.name} professionals.

Occupation: ${occupation.name}
${problemContext ? `Problem context: ${problemContext}` : ''}

Generate attention-grabbing headlines, email subjects, ad copy, social posts, and objection handlers.
`

  return occupationAI.messagingHooks(prompt) as Promise<EnrichedOccupation['messagingHooks']>
}
