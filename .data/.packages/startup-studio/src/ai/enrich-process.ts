/**
 * Process & Task Enrichment AI Functions
 *
 * Enriches process and task entities with:
 * - Performance characteristics
 * - Bottlenecks and handoff points
 * - Automation opportunities
 * - Mermaid diagrams (flowchart, sequence, state, ER)
 */

import { AI } from 'ai-functions'
import { ensureConfigured } from './config'
import type { Process, Task } from '../ontology'
import type {
  EnrichedProcess,
  EnrichedTask,
  ProcessDiagrams,
  TaskDiagrams,
  MermaidDiagram,
  ProcessBottleneck,
} from '../enrichments'

// =============================================================================
// AI FUNCTION DEFINITIONS
// =============================================================================

const processAI = AI({
  processCharacteristics: {
    maturityLevel: 'One of: initial, managed, defined, quantified, optimizing (CMMI)',
    variability: 'One of: standard, some-variation, high-variation, chaotic',
    documentation: 'One of: none, partial, complete, automated',
    cycleTime: 'Typical cycle time (e.g., "2-3 days", "4 hours")',
    throughput: 'Typical throughput (e.g., "50 per day", "200 per month")',
    qualityRate: 'First-pass quality rate (e.g., "95%", "80%")',
    costPerExecution: 'Cost per process execution if applicable',
  },

  bottlenecks: {
    bottlenecks: [{
      location: 'Where in the process the bottleneck occurs',
      cause: 'Root cause of the bottleneck',
      impact: 'Impact on overall process',
      solutionApproaches: ['Potential solutions'],
    }],
    handoffPoints: [{
      from: 'Who hands off',
      to: 'Who receives',
      friction: 'One of: smooth, some-friction, problematic, broken',
    }],
  },

  automationOpportunities: {
    opportunities: [{
      step: 'Which step to automate',
      approach: 'How to automate (AI approach)',
      effort: 'One of: low, medium, high',
      impact: 'One of: low, medium, high',
    }],
    systemsTouched: ['Systems involved in this process'],
    dataFlows: [{
      from: 'Data source',
      to: 'Data destination',
      format: 'Data format',
      frequency: 'How often data flows',
    }],
  },

  flowchartDiagram: {
    title: 'Diagram title',
    description: 'What this diagram illustrates',
    code: 'Complete Mermaid flowchart code starting with "flowchart TD" or "flowchart LR"',
  },

  sequenceDiagram: {
    title: 'Diagram title',
    description: 'What this diagram illustrates',
    code: 'Complete Mermaid sequence diagram code starting with "sequenceDiagram"',
  },

  stateDiagram: {
    title: 'Diagram title',
    description: 'What this diagram illustrates',
    code: 'Complete Mermaid state diagram code starting with "stateDiagram-v2"',
  },

  erDiagram: {
    title: 'Diagram title',
    description: 'What this diagram illustrates',
    code: 'Complete Mermaid ER diagram code starting with "erDiagram"',
  },

  journeyDiagram: {
    title: 'Diagram title',
    description: 'What this diagram illustrates',
    code: 'Complete Mermaid journey diagram code starting with "journey"',
  },
})

const taskAI = AI({
  taskCharacteristics: {
    averageTime: 'Average time to complete this task (e.g., "30 minutes", "2 hours")',
    frequency: 'One of: rare, occasional, regular, daily, constant',
    complexity: 'One of: trivial, simple, moderate, complex, expert',
    errorRate: 'One of: rare, occasional, common, frequent',
    businessImpact: 'One of: low, medium, high, critical',
    skillRequired: 'One of: entry, intermediate, advanced, expert',
  },

  taskDependencies: {
    prerequisites: ['What must be done before this task'],
    blockedBy: ['Common blockers for this task'],
    enables: ['What this task enables'],
  },

  taskAutomation: {
    level: 'One of: none, assist, partial, full',
    currentState: 'One of: manual, tool-assisted, semi-automated, automated',
    barriers: ['Barriers to automation'],
    aiApproach: 'How AI could address this task',
  },

  taskFlowchart: {
    title: 'Diagram title',
    description: 'What this diagram illustrates',
    code: 'Complete Mermaid flowchart code for this task',
  },

  taskSequence: {
    title: 'Diagram title',
    description: 'What this diagram illustrates',
    code: 'Complete Mermaid sequence diagram code if task involves multiple actors',
  },
})

// =============================================================================
// PROCESS ENRICHMENT
// =============================================================================

export interface EnrichProcessOptions {
  depth?: 'basic' | 'standard' | 'comprehensive'
  industryContext?: string
  occupationContext?: string
  includeDiagrams?: boolean
}

/**
 * Enrich a process with analysis and diagrams
 */
export async function enrichProcess(
  process: Process,
  options: EnrichProcessOptions = {}
): Promise<EnrichedProcess> {
  ensureConfigured()

  const {
    depth = 'standard',
    industryContext,
    occupationContext,
    includeDiagrams = true,
  } = options

  const processContext = `
Process: ${process.name}
Description: ${process.description}
APQC Code: ${process.code}
Level: ${process.level}
${industryContext ? `Industry: ${industryContext}` : ''}
${occupationContext ? `Occupation: ${occupationContext}` : ''}
`

  // Generate process characteristics
  const characteristicsPrompt = `
Analyze the "${process.name}" business process and provide its typical characteristics.

${processContext}

Assess maturity level, variability, documentation, cycle time, throughput, and quality.
Base your assessment on typical implementations of this process in organizations.
`

  const characteristics = await processAI.processCharacteristics(characteristicsPrompt)

  // Generate bottlenecks and handoff analysis
  const bottlenecksPrompt = `
Identify bottlenecks and handoff points in the "${process.name}" process.

${processContext}

Where does this process typically get stuck? What are the friction points in handoffs?
Provide specific, actionable insights.
`

  const bottlenecksResult = await processAI.bottlenecks(bottlenecksPrompt)

  // Generate automation opportunities
  const automationPrompt = `
Analyze automation opportunities for the "${process.name}" process.

${processContext}

Which steps can be automated with AI? What systems are typically involved?
Map the data flows between systems.
`

  const automation = await processAI.automationOpportunities(automationPrompt)

  // Generate diagrams (if requested)
  let diagrams: ProcessDiagrams | undefined
  if (includeDiagrams) {
    diagrams = await generateProcessDiagrams(process, processContext)
  }

  // Extract typed data from AI responses
  const bottlenecksData = bottlenecksResult as {
    bottlenecks: ProcessBottleneck[]
    handoffPoints: EnrichedProcess['handoffPoints']
  }
  const automationData = automation as {
    opportunities: EnrichedProcess['automationOpportunities']
    systemsTouched: string[]
    dataFlows: EnrichedProcess['dataFlows']
  }

  // Compile enriched process
  const enriched: EnrichedProcess = {
    processId: process.id,

    // Characteristics
    maturityLevel: characteristics.maturityLevel as EnrichedProcess['maturityLevel'],
    variability: characteristics.variability as EnrichedProcess['variability'],
    documentation: characteristics.documentation as EnrichedProcess['documentation'],
    cycleTime: characteristics.cycleTime as string,
    throughput: characteristics.throughput as string,
    qualityRate: characteristics.qualityRate as string,
    costPerExecution: characteristics.costPerExecution as string,

    // Bottlenecks
    bottlenecks: bottlenecksData.bottlenecks,
    handoffPoints: bottlenecksData.handoffPoints,

    // Automation
    automationOpportunities: automationData.opportunities,
    systemsTouched: automationData.systemsTouched,
    dataFlows: automationData.dataFlows,

    // Diagrams
    diagrams: diagrams || {
      flowchart: createEmptyDiagram('flowchart'),
      sequence: createEmptyDiagram('sequence'),
      stateDiagram: createEmptyDiagram('stateDiagram'),
      erDiagram: createEmptyDiagram('erDiagram'),
      journey: createEmptyDiagram('journey'),
    },
  }

  return enriched
}

/**
 * Generate all Mermaid diagrams for a process
 */
async function generateProcessDiagrams(
  process: Process,
  context: string
): Promise<ProcessDiagrams> {
  const [flowchart, sequence, stateDiagram, erDiagram, journey] = await Promise.all([
    // Flowchart
    processAI.flowchartDiagram(`
Create a Mermaid flowchart diagram for the "${process.name}" process.

${context}

Show the main steps, decision points, and flow of the process.
Use clear, descriptive labels. Include start and end nodes.
`),

    // Sequence diagram
    processAI.sequenceDiagram(`
Create a Mermaid sequence diagram showing actor interactions in the "${process.name}" process.

${context}

Show the key actors/systems and their interactions over time.
Include the main messages/actions passed between actors.
`),

    // State diagram
    processAI.stateDiagram(`
Create a Mermaid state diagram for the "${process.name}" process.

${context}

Show the key states a work item goes through and the transitions between them.
Include initial and final states.
`),

    // ER diagram
    processAI.erDiagram(`
Create a Mermaid entity-relationship diagram for the "${process.name}" process.

${context}

Show the key data entities involved and their relationships.
Include relevant attributes for each entity.
`),

    // Journey diagram
    processAI.journeyDiagram(`
Create a Mermaid user journey diagram for the "${process.name}" process.

${context}

Show the experience of the primary actor going through this process.
Include satisfaction scores for each step.
`),
  ])

  return {
    flowchart: { ...flowchart, type: 'flowchart' as const },
    sequence: { ...sequence, type: 'sequence' as const },
    stateDiagram: { ...stateDiagram, type: 'stateDiagram' as const },
    erDiagram: { ...erDiagram, type: 'erDiagram' as const },
    journey: { ...journey, type: 'journey' as const },
  }
}

// =============================================================================
// TASK ENRICHMENT
// =============================================================================

export interface EnrichTaskOptions {
  depth?: 'basic' | 'standard' | 'comprehensive'
  processContext?: string
  occupationContext?: string
  includeDiagrams?: boolean
}

/**
 * Enrich a task with analysis and diagrams
 */
export async function enrichTask(
  task: Task,
  options: EnrichTaskOptions = {}
): Promise<EnrichedTask> {
  ensureConfigured()

  const {
    depth = 'standard',
    processContext,
    occupationContext,
    includeDiagrams = true,
  } = options

  const taskContext = `
Task: ${task.name}
Description: ${task.description}
Verb: ${task.verb}
Object: ${task.object}
${task.preposition ? `Preposition: ${task.preposition}` : ''}
${task.prepObject ? `Prep Object: ${task.prepObject}` : ''}
${processContext ? `Process: ${processContext}` : ''}
${occupationContext ? `Occupation: ${occupationContext}` : ''}
`

  // Generate task characteristics
  const characteristicsPrompt = `
Analyze the "${task.name}" task and provide its typical characteristics.

${taskContext}

Assess time required, frequency, complexity, error rate, business impact, and skill level.
`

  const characteristics = await taskAI.taskCharacteristics(characteristicsPrompt)

  // Generate dependencies
  const dependenciesPrompt = `
Identify dependencies for the "${task.name}" task.

${taskContext}

What must happen before this task? What commonly blocks it? What does it enable?
`

  const dependencies = await taskAI.taskDependencies(dependenciesPrompt)

  // Generate automation analysis
  const automationPrompt = `
Analyze automation potential for the "${task.name}" task.

${taskContext}

What's the current automation state? What barriers exist? How could AI help?
`

  const automation = await taskAI.taskAutomation(automationPrompt)

  // Generate diagrams (if requested)
  let diagrams: TaskDiagrams | undefined
  if (includeDiagrams) {
    diagrams = await generateTaskDiagrams(task, taskContext)
  }

  // Compile enriched task
  const enriched: EnrichedTask = {
    taskId: task.id,

    // Characteristics
    averageTime: characteristics.averageTime,
    frequency: characteristics.frequency as any,
    complexity: characteristics.complexity as any,
    errorRate: characteristics.errorRate as any,
    businessImpact: characteristics.businessImpact as any,
    skillRequired: characteristics.skillRequired as any,

    // Dependencies
    prerequisites: dependencies.prerequisites,
    blockedBy: dependencies.blockedBy,
    enables: dependencies.enables,

    // Automation
    automationPotential: {
      level: automation.level as any,
      currentState: automation.currentState as any,
      barriers: automation.barriers,
      aiApproach: automation.aiApproach,
    },

    // Diagrams
    diagrams: diagrams || {
      flowchart: createEmptyDiagram('flowchart'),
    },
  }

  return enriched
}

/**
 * Generate Mermaid diagrams for a task
 */
async function generateTaskDiagrams(
  task: Task,
  context: string
): Promise<TaskDiagrams> {
  const flowchart = await taskAI.taskFlowchart(`
Create a Mermaid flowchart diagram for the "${task.name}" task.

${context}

Show the steps to complete this task, including any decision points.
Keep it focused and clear.
`)

  // Only generate sequence diagram if task involves multiple actors
  let sequence: MermaidDiagram | undefined
  if (task.description.toLowerCase().includes('coordinate') ||
      task.description.toLowerCase().includes('collaborate') ||
      task.description.toLowerCase().includes('communicate')) {
    const seqResult = await taskAI.taskSequence(`
Create a Mermaid sequence diagram for the "${task.name}" task.

${context}

Show interactions between actors/systems involved in this task.
`)
    sequence = { ...seqResult, type: 'sequence' as const }
  }

  return {
    flowchart: { ...flowchart, type: 'flowchart' as const },
    sequence,
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createEmptyDiagram(type: MermaidDiagram['type']): MermaidDiagram {
  return {
    type,
    title: 'Not generated',
    description: 'Diagram was not generated',
    code: '',
  }
}

// =============================================================================
// BATCH ENRICHMENT
// =============================================================================

/**
 * Enrich multiple processes in batch
 */
export async function enrichProcessesBatch(
  processes: Process[],
  options: EnrichProcessOptions = {}
): Promise<Map<string, EnrichedProcess>> {
  ensureConfigured()

  const results = new Map<string, EnrichedProcess>()

  const concurrency = 3
  for (let i = 0; i < processes.length; i += concurrency) {
    const batch = processes.slice(i, i + concurrency)
    const enriched = await Promise.all(
      batch.map(process => enrichProcess(process, options))
    )

    for (let j = 0; j < batch.length; j++) {
      results.set(batch[j].id, enriched[j])
    }
  }

  return results
}

/**
 * Enrich multiple tasks in batch
 */
export async function enrichTasksBatch(
  tasks: Task[],
  options: EnrichTaskOptions = {}
): Promise<Map<string, EnrichedTask>> {
  ensureConfigured()

  const results = new Map<string, EnrichedTask>()

  const concurrency = 5
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency)
    const enriched = await Promise.all(
      batch.map(task => enrichTask(task, options))
    )

    for (let j = 0; j < batch.length; j++) {
      results.set(batch[j].id, enriched[j])
    }
  }

  return results
}
