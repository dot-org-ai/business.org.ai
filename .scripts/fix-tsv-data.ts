/**
 * Script to fix data quality issues in .data/*.tsv and .data/relationships/*.tsv files
 *
 * Issues to fix:
 * 1. Namespace inconsistencies (concept.org.ai vs concepts.org.ai)
 * 2. Parsing artifacts (IncludingF, mance, rectiveActionPlans, etc.)
 * 3. Grammatical errors (confered -> conferred, refered -> referred)
 * 4. Empty descriptions in Skills.tsv
 * 5. URL format inconsistencies in relationship files
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', '.data')

// ONET Skill descriptions from official ONET database
const SKILL_DESCRIPTIONS: Record<string, string> = {
  'ReadingComprehension': 'Understanding written sentences and paragraphs in work-related documents.',
  'ActiveListening': 'Giving full attention to what other people are saying, taking time to understand the points being made, asking questions as appropriate, and not interrupting at inappropriate times.',
  'Writing': 'Communicating effectively in writing as appropriate for the needs of the audience.',
  'Speaking': 'Talking to others to convey information effectively.',
  'Mathematics': 'Using mathematics to solve problems.',
  'Science': 'Using scientific rules and methods to solve problems.',
  'CriticalThinking': 'Using logic and reasoning to identify the strengths and weaknesses of alternative solutions, conclusions, or approaches to problems.',
  'ActiveLearning': 'Understanding the implications of new information for both current and future problem-solving and decision-making.',
  'LearningStrategies': 'Selecting and using training/instructional methods and procedures appropriate for the situation when learning or teaching new things.',
  'Monitoring': 'Monitoring/assessing performance of yourself, other individuals, or organizations to make improvements or take corrective action.',
  'SocialPerceptiveness': 'Being aware of others\' reactions and understanding why they react as they do.',
  'Coordination': 'Adjusting actions in relation to others\' actions.',
  'Persuasion': 'Persuading others to change their minds or behavior.',
  'Negotiation': 'Bringing others together and trying to reconcile differences.',
  'Instructing': 'Teaching others how to do something.',
  'ServiceOrientation': 'Actively looking for ways to help people.',
  'ComplexProblemSolving': 'Identifying complex problems and reviewing related information to develop and evaluate options and implement solutions.',
  'OperationsAnalysis': 'Analyzing needs and product requirements to create a design.',
  'TechnologyDesign': 'Generating or adapting equipment and technology to serve user needs.',
  'EquipmentSelection': 'Determining the kind of tools and equipment needed to do a job.',
  'Installation': 'Installing equipment, machines, wiring, or programs to meet specifications.',
  'Programming': 'Writing computer programs for various purposes.',
  'OperationsMonitoring': 'Watching gauges, dials, or other indicators to make sure a machine is working properly.',
  'OperationAndControl': 'Controlling operations of equipment or systems.',
  'EquipmentMaintenance': 'Performing routine maintenance on equipment and determining when and what kind of maintenance is needed.',
  'Troubleshooting': 'Determining causes of operating errors and deciding what to do about it.',
  'Repairing': 'Repairing machines or systems using the needed tools.',
  'QualityControlAnalysis': 'Conducting tests and inspections of products, services, or processes to evaluate quality or performance.',
  'JudgmentAndDecisionMaking': 'Considering the relative costs and benefits of potential actions to choose the most appropriate one.',
  'SystemsAnalysis': 'Determining how a system should work and how changes in conditions, operations, and the environment will affect outcomes.',
  'SystemsEvaluation': 'Identifying measures or indicators of system performance and the actions needed to improve or correct performance, relative to the goals of the system.',
  'TimeManagement': 'Managing one\'s own time and the time of others.',
  'ManagementOfFinancialResources': 'Determining how money will be spent to get the work done, and accounting for these expenditures.',
  'ManagementOfMaterialResources': 'Obtaining and seeing to the appropriate use of equipment, facilities, and materials needed to do certain work.',
  'ManagementOfPersonnelResources': 'Motivating, developing, and directing people as they work, identifying the best people for the job.',
}

// Garbage/truncated concepts to remove or fix
const CONCEPT_FIXES: Record<string, { action: 'remove' | 'rename', newId?: string, newName?: string }> = {
  'IncludingF': { action: 'remove' },
  'rectiveActionPlans': { action: 'rename', newId: 'CorrectiveActionPlans', newName: 'Corrective Action Plans' },
  'ganizationalProblems': { action: 'rename', newId: 'OrganizationalProblems', newName: 'Organizational Problems' },
  'mance': { action: 'rename', newId: 'Performance', newName: 'Performance' },
  'tsSubmitted': { action: 'rename', newId: 'ReportsSubmitted', newName: 'Reports Submitted' },
  'dinateFunctions': { action: 'rename', newId: 'CoordinateFunctions', newName: 'Coordinate Functions' },
  'ced': { action: 'remove' },
  'dkeepingSystems': { action: 'rename', newId: 'RecordkeepingSystems', newName: 'Recordkeeping Systems' },
}

// Grammatical fixes for verbs
const VERB_FIXES: Record<string, string> = {
  'confered': 'conferred',
  'refered': 'referred',
  'occured': 'occurred',
  'transfered': 'transferred',
  'prefered': 'preferred',
}

function readTSV(filePath: string): { headers: string[], rows: string[][] } {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  const headers = lines[0].split('\t')
  const rows = lines.slice(1).map(line => line.split('\t'))
  return { headers, rows }
}

function writeTSV(filePath: string, headers: string[], rows: string[][]): void {
  const content = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n')
  fs.writeFileSync(filePath, content + '\n')
}

function fixSkillsDescriptions(): void {
  console.log('Fixing Skills.tsv descriptions...')
  const filePath = path.join(DATA_DIR, 'Skills.tsv')
  const { headers, rows } = readTSV(filePath)

  const descIdx = headers.indexOf('description')
  const idIdx = headers.indexOf('id')

  let fixed = 0
  for (const row of rows) {
    const id = row[idIdx]
    if (SKILL_DESCRIPTIONS[id] && (!row[descIdx] || row[descIdx].trim() === '')) {
      row[descIdx] = SKILL_DESCRIPTIONS[id]
      fixed++
    }
  }

  writeTSV(filePath, headers, rows)
  console.log(`  Fixed ${fixed} skill descriptions`)
}

function fixConceptsNamespace(): void {
  console.log('Fixing Concepts.tsv namespace and garbage data...')
  const filePath = path.join(DATA_DIR, 'Concepts.tsv')
  const { headers, rows } = readTSV(filePath)

  const nsIdx = headers.indexOf('ns')
  const idIdx = headers.indexOf('id')
  const nameIdx = headers.indexOf('name')

  const newRows: string[][] = []
  let nsFixed = 0
  let removed = 0
  let renamed = 0

  for (const row of rows) {
    const id = row[idIdx]
    const fix = CONCEPT_FIXES[id]

    if (fix?.action === 'remove') {
      removed++
      continue
    }

    if (fix?.action === 'rename') {
      row[idIdx] = fix.newId!
      row[nameIdx] = fix.newName!
      renamed++
    }

    // Fix namespace: concept.org.ai -> concepts.org.ai (plural)
    if (row[nsIdx] === 'concept.org.ai') {
      row[nsIdx] = 'concepts.org.ai'
      nsFixed++
    }

    newRows.push(row)
  }

  writeTSV(filePath, headers, newRows)
  console.log(`  Fixed ${nsFixed} namespace issues, removed ${removed} garbage entries, renamed ${renamed} truncated entries`)
}

function fixOccupationConceptsNamespace(): void {
  console.log('Fixing relationships/Occupations.Concepts.tsv namespace...')
  const filePath = path.join(DATA_DIR, 'relationships', 'Occupations.Concepts.tsv')
  const { headers, rows } = readTSV(filePath)

  const toNsIdx = headers.indexOf('toNs')
  let fixed = 0

  for (const row of rows) {
    if (row[toNsIdx] === 'concept.org.ai') {
      row[toNsIdx] = 'concepts.org.ai'
      fixed++
    }
  }

  writeTSV(filePath, headers, rows)
  console.log(`  Fixed ${fixed} namespace references`)
}

function fixProcessConceptsNamespace(): void {
  console.log('Fixing relationships/Process.Concepts.tsv namespace...')
  const filePath = path.join(DATA_DIR, 'relationships', 'Process.Concepts.tsv')
  const { headers, rows } = readTSV(filePath)

  const toNsIdx = headers.indexOf('toNs')
  let fixed = 0

  for (const row of rows) {
    if (row[toNsIdx] === 'concept.org.ai') {
      row[toNsIdx] = 'concepts.org.ai'
      fixed++
    }
  }

  writeTSV(filePath, headers, rows)
  console.log(`  Fixed ${fixed} namespace references`)
}

function fixEventsGrammar(): void {
  console.log('Fixing Events.tsv grammatical errors...')
  const filePath = path.join(DATA_DIR, 'Events.tsv')
  const { headers, rows } = readTSV(filePath)

  const pastTenseIdx = headers.indexOf('pastTense')
  const idIdx = headers.indexOf('id')
  const nameIdx = headers.indexOf('name')
  const descIdx = headers.indexOf('description')

  let fixed = 0

  for (const row of rows) {
    for (const [wrong, correct] of Object.entries(VERB_FIXES)) {
      // Fix pastTense column
      if (row[pastTenseIdx] === wrong) {
        row[pastTenseIdx] = correct
        fixed++
      }

      // Fix in id
      if (row[idIdx]?.includes(`.${wrong}`)) {
        row[idIdx] = row[idIdx].replace(`.${wrong}`, `.${correct}`)
      }

      // Fix in name
      if (row[nameIdx]?.includes(wrong)) {
        row[nameIdx] = row[nameIdx].replace(wrong, correct)
      }

      // Fix in description
      if (row[descIdx]?.includes(`was ${wrong}`)) {
        row[descIdx] = row[descIdx].replace(`was ${wrong}`, `was ${correct}`)
      }
    }
  }

  writeTSV(filePath, headers, rows)
  console.log(`  Fixed ${fixed} grammatical errors`)
}

function fixRelationshipUrlFormats(): void {
  console.log('Standardizing relationship file URL formats...')

  const relationshipFiles = [
    'Tasks.Actions.tsv',
    'Actions.Events.tsv',
  ]

  for (const fileName of relationshipFiles) {
    const filePath = path.join(DATA_DIR, 'relationships', fileName)
    if (!fs.existsSync(filePath)) continue

    const { headers, rows } = readTSV(filePath)
    const fromIdx = headers.indexOf('from')
    const toIdx = headers.indexOf('to')

    let fixed = 0

    for (const row of rows) {
      // Remove https:// prefix, keep domain/path format
      if (row[fromIdx]?.startsWith('https://')) {
        row[fromIdx] = row[fromIdx].replace('https://', '')
        fixed++
      }
      if (row[toIdx]?.startsWith('https://')) {
        row[toIdx] = row[toIdx].replace('https://', '')
        fixed++
      }
    }

    writeTSV(filePath, headers, rows)
    console.log(`  ${fileName}: Fixed ${fixed} URL formats`)
  }
}

function fixOccupationConceptsData(): void {
  console.log('Fixing OccupationConcepts.tsv namespace...')
  const filePath = path.join(DATA_DIR, 'OccupationConcepts.tsv')
  if (!fs.existsSync(filePath)) return

  const { headers, rows } = readTSV(filePath)
  const nsIdx = headers.indexOf('ns')

  let fixed = 0
  for (const row of rows) {
    if (row[nsIdx] === 'concept.org.ai') {
      row[nsIdx] = 'concepts.org.ai'
      fixed++
    }
  }

  writeTSV(filePath, headers, rows)
  console.log(`  Fixed ${fixed} namespace issues`)
}

function fixTasksConceptsNamespace(): void {
  console.log('Fixing relationships/Tasks.Concepts.tsv namespace...')
  const filePath = path.join(DATA_DIR, 'relationships', 'Tasks.Concepts.tsv')
  if (!fs.existsSync(filePath)) return

  const { headers, rows } = readTSV(filePath)
  const toIdx = headers.indexOf('to')

  let fixed = 0
  for (const row of rows) {
    // Fix concept.org.ai -> concepts.org.ai in 'to' column
    if (row[toIdx]?.includes('concept.org.ai/')) {
      row[toIdx] = row[toIdx].replace('concept.org.ai/', 'concepts.org.ai/')
      fixed++
    }
  }

  writeTSV(filePath, headers, rows)
  console.log(`  Fixed ${fixed} namespace references`)
}

function removeGarbageTasksAndActions(): void {
  console.log('Removing garbage entries from Tasks.tsv...')
  const tasksPath = path.join(DATA_DIR, 'Tasks.tsv')
  const { headers: taskHeaders, rows: taskRows } = readTSV(tasksPath)

  const idIdx = taskHeaders.indexOf('id')
  const garbagePatterns = [
    '.for.IncludingF',
    '.to.IncludingF',
  ]

  const newTaskRows = taskRows.filter(row => {
    const id = row[idIdx]
    return !garbagePatterns.some(pattern => id?.includes(pattern))
  })

  const tasksRemoved = taskRows.length - newTaskRows.length
  writeTSV(tasksPath, taskHeaders, newTaskRows)
  console.log(`  Removed ${tasksRemoved} garbage tasks`)

  console.log('Removing garbage entries from Actions.tsv...')
  const actionsPath = path.join(DATA_DIR, 'Actions.tsv')
  const { headers: actionHeaders, rows: actionRows } = readTSV(actionsPath)

  const actionIdIdx = actionHeaders.indexOf('id')
  const newActionRows = actionRows.filter(row => {
    const id = row[actionIdIdx]
    return !garbagePatterns.some(pattern => id?.includes(pattern))
  })

  const actionsRemoved = actionRows.length - newActionRows.length
  writeTSV(actionsPath, actionHeaders, newActionRows)
  console.log(`  Removed ${actionsRemoved} garbage actions`)
}

async function main() {
  console.log('=== TSV Data Quality Fix Script ===\n')

  // 1. Fix Skills descriptions
  fixSkillsDescriptions()

  // 2. Fix Concepts namespace and garbage data
  fixConceptsNamespace()

  // 3. Fix OccupationConcepts namespace
  fixOccupationConceptsData()

  // 4. Fix relationship file namespaces
  fixOccupationConceptsNamespace()
  fixProcessConceptsNamespace()
  fixTasksConceptsNamespace()

  // 5. Fix Events grammatical errors
  fixEventsGrammar()

  // 6. Standardize relationship URL formats
  fixRelationshipUrlFormats()

  // 7. Remove garbage tasks and actions
  removeGarbageTasksAndActions()

  console.log('\n=== All fixes complete ===')
}

main().catch(console.error)
