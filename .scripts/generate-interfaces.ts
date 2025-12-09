#!/usr/bin/env tsx

/**
 * Unified Abstract Interface Generator
 *
 * Generates unified abstract interfaces from the ingested standards data.
 * This script transforms source-specific data into domain-unified views:
 *
 * Work Domain:
 *   - ONET Occupations + BLS Occupations → AbstractRole
 *   - ONET Skills/Abilities/Knowledge → AbstractCompetency
 *   - ONET Tasks + Work Activities → AbstractTask
 *   - Task descriptions → AbstractAction (semantic parsing)
 *   - Actions → AbstractEvent (past tense)
 *
 * Business Domain:
 *   - NAICS → AbstractIndustry
 *   - APQC → AbstractProcess
 *   - UNSPSC → AbstractProduct
 *   - NAPCS → AbstractService
 *
 * Geography Domain:
 *   - Census + ISO → AbstractLocation
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  Entity,
  Relationship,
  AbstractRole,
  AbstractCompetency,
  AbstractTask,
  AbstractAction,
  AbstractEvent,
  AbstractIndustry,
  AbstractProcess,
  AbstractProduct,
  AbstractService,
  AbstractLocation,
  NAMESPACES,
} from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths
const STANDARDS_DIR = path.resolve(__dirname, '../.standards')
const OUTPUT_DIR = path.resolve(__dirname, '../.data')
const OUTPUT_REL_DIR = path.join(OUTPUT_DIR, 'relationships')

// ============================================================================
// Utility Functions
// ============================================================================

function parseTSV<T = Record<string, string>>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    return []
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.substring(1)
  }

  const lines = content.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0]
    .replace(/\r$/, '')
    .split('\t')
    .map((h) => h.trim())

  return lines.slice(1).map((line) => {
    const values = line.replace(/\r$/, '').split('\t')
    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header] = (values[i] || '').trim()
    })
    return row as T
  })
}

function writeTSV(
  filePath: string,
  data: Record<string, string | undefined>[]
): void {
  if (data.length === 0) {
    console.warn(`  ⚠️  No data to write for ${path.basename(filePath)}`)
    return
  }

  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers.map((h) => (row[h] ?? '').toString()).join('\t')
  )
  const content = [headers.join('\t'), ...rows].join('\n')

  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`  ✅ ${path.basename(filePath)} (${data.length} rows)`)
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function toPascalCase(text: string): string {
  if (!text) return ''
  return text
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[\s_-]+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
}

function toWikipediaStyle(text: string): string {
  if (!text) return ''
  const words = text
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[\s_-]+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

  return words.length <= 3 ? words.join('') : words.join('_')
}

// ============================================================================
// Work Domain Generation
// ============================================================================

/**
 * Generate unified Roles from ONET and BLS occupations
 */
function generateRoles(): AbstractRole[] {
  console.log('\n👔 Generating Unified Roles...')

  const roles: AbstractRole[] = []
  const seen = new Set<string>()

  // Load ONET Occupations
  const onetOccupations = parseTSV(
    path.join(STANDARDS_DIR, 'ONET', 'Occupations.tsv')
  )
  for (const occ of onetOccupations) {
    const id = occ.id || toPascalCase(occ.name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    roles.push({
      ns: NAMESPACES.roles,
      type: 'Role',
      id,
      name: occ.name || '',
      description: occ.description || '',
      code: occ.code,
      category: 'Occupation',
      sourceType: 'ONETOccupation',
      sourceCode: occ.code,
    })
  }

  // Load BLS Occupations (merge with ONET where possible)
  const blsOccupations = parseTSV(
    path.join(STANDARDS_DIR, 'BLS', 'Occupations.tsv')
  )
  for (const occ of blsOccupations) {
    const id = occ.id || toPascalCase(occ.name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    roles.push({
      ns: NAMESPACES.roles,
      type: 'Role',
      id,
      name: occ.name || '',
      description: occ.description || '',
      code: occ.code,
      category: 'Occupation',
      sourceType: 'BLSOccupation',
      sourceCode: occ.code,
    })
  }

  console.log(`  📊 Generated ${roles.length} unified roles`)
  return roles
}

/**
 * Generate unified Competencies from ONET skills, abilities, knowledge
 */
function generateCompetencies(): AbstractCompetency[] {
  console.log('\n💪 Generating Unified Competencies...')

  const competencies: AbstractCompetency[] = []
  const seen = new Set<string>()

  const sources: Array<{
    file: string
    category: 'Skill' | 'Ability' | 'Knowledge'
    sourceType: string
  }> = [
    { file: 'Skills.tsv', category: 'Skill', sourceType: 'ONETSkill' },
    { file: 'Abilities.tsv', category: 'Ability', sourceType: 'ONETAbility' },
    { file: 'Knowledge.tsv', category: 'Knowledge', sourceType: 'ONETKnowledge' },
  ]

  for (const source of sources) {
    const data = parseTSV(path.join(STANDARDS_DIR, 'ONET', source.file))

    for (const item of data) {
      const id = item.id || toPascalCase(item.name)
      if (!id || seen.has(id)) continue
      seen.add(id)

      competencies.push({
        ns: NAMESPACES.competencies,
        type: 'Competency',
        id,
        name: item.name || '',
        description: item.description || '',
        code: item.code,
        category: source.category,
        sourceType: source.sourceType,
      })
    }
  }

  console.log(`  📊 Generated ${competencies.length} unified competencies`)
  return competencies
}

/**
 * Generate unified Tasks from ONET tasks and work activities
 */
function generateTasks(): AbstractTask[] {
  console.log('\n📋 Generating Unified Tasks...')

  const tasks: AbstractTask[] = []
  const seen = new Set<string>()

  // Load ONET Tasks
  const onetTasks = parseTSV(path.join(STANDARDS_DIR, 'ONET', 'Tasks.tsv'))
  for (const task of onetTasks) {
    const id = task.id || toWikipediaStyle(task.name?.slice(0, 60) || '')
    if (!id || seen.has(id)) continue
    seen.add(id)

    tasks.push({
      ns: NAMESPACES.tasks,
      type: 'Task',
      id,
      name: task.name || '',
      description: task.description || task.name || '',
      code: task.code,
      category: 'Task',
      sourceType: 'ONETTask',
    })
  }

  // Load Work Activities
  const workActivities = parseTSV(
    path.join(STANDARDS_DIR, 'ONET', 'WorkActivities.tsv')
  )
  for (const activity of workActivities) {
    const id = activity.id || toPascalCase(activity.name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    tasks.push({
      ns: NAMESPACES.tasks,
      type: 'Task',
      id,
      name: activity.name || '',
      description: activity.description || activity.name || '',
      code: activity.code,
      category: 'Activity',
      sourceType: 'ONETWorkActivity',
    })
  }

  // Load Detailed Work Activities
  const dwas = parseTSV(
    path.join(STANDARDS_DIR, 'ONET', 'DetailedWorkActivities.tsv')
  )
  for (const dwa of dwas) {
    const id = dwa.id || toPascalCase(dwa.name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    tasks.push({
      ns: NAMESPACES.tasks,
      type: 'Task',
      id,
      name: dwa.name || '',
      description: dwa.description || dwa.name || '',
      code: dwa.code,
      category: 'Activity',
      sourceType: 'ONETDWA',
    })
  }

  console.log(`  📊 Generated ${tasks.length} unified tasks`)
  return tasks
}

/**
 * Load verb conjugation data
 */
interface VerbData {
  pastTense: string
  gerund: string
}

function loadVerbs(): Map<string, VerbData> {
  const verbMap = new Map<string, VerbData>()

  // Common irregular verbs
  const irregulars: Record<string, { past: string; gerund: string }> = {
    be: { past: 'was', gerund: 'being' },
    have: { past: 'had', gerund: 'having' },
    do: { past: 'did', gerund: 'doing' },
    go: { past: 'went', gerund: 'going' },
    make: { past: 'made', gerund: 'making' },
    take: { past: 'took', gerund: 'taking' },
    see: { past: 'saw', gerund: 'seeing' },
    get: { past: 'got', gerund: 'getting' },
    give: { past: 'gave', gerund: 'giving' },
    find: { past: 'found', gerund: 'finding' },
    know: { past: 'knew', gerund: 'knowing' },
    think: { past: 'thought', gerund: 'thinking' },
    tell: { past: 'told', gerund: 'telling' },
    leave: { past: 'left', gerund: 'leaving' },
    keep: { past: 'kept', gerund: 'keeping' },
    begin: { past: 'began', gerund: 'beginning' },
    write: { past: 'wrote', gerund: 'writing' },
    run: { past: 'ran', gerund: 'running' },
    read: { past: 'read', gerund: 'reading' },
    lead: { past: 'led', gerund: 'leading' },
    build: { past: 'built', gerund: 'building' },
    buy: { past: 'bought', gerund: 'buying' },
    bring: { past: 'brought', gerund: 'bringing' },
    hold: { past: 'held', gerund: 'holding' },
    set: { past: 'set', gerund: 'setting' },
    put: { past: 'put', gerund: 'putting' },
    cut: { past: 'cut', gerund: 'cutting' },
    send: { past: 'sent', gerund: 'sending' },
    spend: { past: 'spent', gerund: 'spending' },
    meet: { past: 'met', gerund: 'meeting' },
    pay: { past: 'paid', gerund: 'paying' },
    sell: { past: 'sold', gerund: 'selling' },
    choose: { past: 'chose', gerund: 'choosing' },
    drive: { past: 'drove', gerund: 'driving' },
    win: { past: 'won', gerund: 'winning' },
  }

  for (const [verb, forms] of Object.entries(irregulars)) {
    verbMap.set(verb, { pastTense: forms.past, gerund: forms.gerund })
  }

  return verbMap
}

function toPastTense(verb: string, verbMap: Map<string, VerbData>): string {
  const v = verb.toLowerCase()
  if (verbMap.has(v)) {
    return verbMap.get(v)!.pastTense
  }
  // Regular conjugation
  if (v.endsWith('e')) return v + 'd'
  if (v.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(v[v.length - 2])) {
    return v.slice(0, -1) + 'ied'
  }
  return v + 'ed'
}

/**
 * Parse task descriptions into semantic actions
 */
function parseTaskToActions(
  task: AbstractTask,
  verbSet: Set<string>
): Array<{ verb: string; object: string; preposition?: string; prepObject?: string }> {
  const actions: Array<{
    verb: string
    object: string
    preposition?: string
    prepObject?: string
  }> = []

  const text = task.name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^\w\s,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const words = text.split(' ')
  const verbPositions: Array<{ verb: string; index: number }> = []

  for (let i = 0; i < words.length; i++) {
    if (verbSet.has(words[i])) {
      verbPositions.push({ verb: words[i], index: i })
    }
  }

  if (verbPositions.length === 0) return actions

  for (let i = 0; i < verbPositions.length; i++) {
    const { verb, index } = verbPositions[i]
    const nextIndex =
      i + 1 < verbPositions.length ? verbPositions[i + 1].index : words.length

    const objectWords = words.slice(index + 1, nextIndex)
    if (objectWords.length === 0) continue

    const stopWords = ['a', 'an', 'the', 'or', 'and', 'of', 'in', 'on', 'at', 's']
    const filtered = objectWords.filter(
      (w) => !stopWords.includes(w) && w.length > 1
    )
    if (filtered.length === 0) continue

    const preps = ['to', 'for', 'with', 'in', 'on', 'by', 'from', 'using']
    const prepIndex = filtered.findIndex((w) => preps.includes(w))

    if (prepIndex > 0) {
      const beforePrep = filtered.slice(0, prepIndex)
      const afterPrep = filtered.slice(prepIndex + 1)

      actions.push({
        verb,
        object: toPascalCase(beforePrep.join(' ')),
        preposition: filtered[prepIndex],
        prepObject: afterPrep.length > 0 ? toPascalCase(afterPrep.join(' ')) : undefined,
      })
    } else {
      actions.push({
        verb,
        object: toPascalCase(filtered.join(' ')),
      })
    }
  }

  return actions
}

/**
 * Generate Actions and Events from Tasks
 */
function generateActionsAndEvents(tasks: AbstractTask[]): {
  actions: AbstractAction[]
  events: AbstractEvent[]
  taskActionRels: Relationship[]
  actionEventRels: Relationship[]
} {
  console.log('\n⚡ Generating Actions and Events...')

  const verbMap = loadVerbs()
  const commonVerbs = [
    'manage',
    'develop',
    'create',
    'design',
    'implement',
    'analyze',
    'evaluate',
    'monitor',
    'coordinate',
    'direct',
    'supervise',
    'plan',
    'organize',
    'conduct',
    'prepare',
    'maintain',
    'review',
    'assess',
    'provide',
    'support',
    'ensure',
    'establish',
    'perform',
    'operate',
    'process',
    'communicate',
    'collaborate',
    'lead',
    'train',
    'report',
    'investigate',
    'research',
    'determine',
    'identify',
    'recommend',
    'resolve',
    'negotiate',
    'administer',
    'schedule',
    'document',
    'verify',
    'inspect',
    'test',
    'diagnose',
    'repair',
    'install',
    'configure',
    'troubleshoot',
    'optimize',
  ]
  const verbSet = new Set(commonVerbs)

  const actionMap = new Map<string, AbstractAction>()
  const eventMap = new Map<string, AbstractEvent>()
  const taskActionRels: Relationship[] = []
  const actionEventRels: Relationship[] = []

  for (const task of tasks) {
    const parsedActions = parseTaskToActions(task, verbSet)

    for (const parsed of parsedActions) {
      if (!parsed.object) continue

      // Create action ID
      const actionId = parsed.preposition && parsed.prepObject
        ? `${parsed.verb}.${parsed.object}.${parsed.preposition}.${parsed.prepObject}`
        : `${parsed.verb}.${parsed.object}`

      if (!actionMap.has(actionId)) {
        const prepPhrase =
          parsed.preposition && parsed.prepObject
            ? ` ${parsed.preposition} ${parsed.prepObject}`
            : ''

        actionMap.set(actionId, {
          ns: NAMESPACES.actions,
          type: 'Action',
          id: actionId,
          name: `${parsed.verb} ${parsed.object}${prepPhrase}`,
          description: task.name,
          verb: parsed.verb,
          object: parsed.object,
          preposition: parsed.preposition,
          prepObject: parsed.prepObject,
        })
      }

      // Create task → action relationship
      taskActionRels.push({
        from: `https://${NAMESPACES.tasks}/${task.id}`,
        to: `https://${NAMESPACES.actions}/${actionId}`,
        predicate: 'hasAction',
        reverse: 'actionOf',
      })

      // Create event
      const pastTense = toPastTense(parsed.verb, verbMap)
      const eventId = `${parsed.object}.${pastTense}`

      if (!eventMap.has(eventId)) {
        eventMap.set(eventId, {
          ns: NAMESPACES.events,
          type: 'Event',
          id: eventId,
          name: `${parsed.object} ${pastTense}`,
          description: `${parsed.object} was ${pastTense}`,
          pastTense,
          verb: parsed.verb,
          object: parsed.object,
        })
      }

      // Create action → event relationship
      actionEventRels.push({
        from: `https://${NAMESPACES.actions}/${actionId}`,
        to: `https://${NAMESPACES.events}/${eventId}`,
        predicate: 'produces',
        reverse: 'producedBy',
      })
    }
  }

  const actions = Array.from(actionMap.values())
  const events = Array.from(eventMap.values())

  console.log(`  📊 Generated ${actions.length} actions, ${events.length} events`)

  return { actions, events, taskActionRels, actionEventRels }
}

// ============================================================================
// Business Domain Generation
// ============================================================================

/**
 * Generate unified Industries from NAICS
 */
function generateIndustries(): AbstractIndustry[] {
  console.log('\n🏭 Generating Unified Industries...')

  const industries: AbstractIndustry[] = []
  const seen = new Set<string>()

  const levels: Array<{
    file: string
    category: 'Sector' | 'Subsector' | 'Group' | 'Industry' | 'SubIndustry'
    level: number
  }> = [
    { file: 'Sectors.tsv', category: 'Sector', level: 1 },
    { file: 'Subsectors.tsv', category: 'Subsector', level: 2 },
    { file: 'IndustryGroups.tsv', category: 'Group', level: 3 },
    { file: 'Industries.tsv', category: 'Industry', level: 4 },
    { file: 'NationalIndustries.tsv', category: 'SubIndustry', level: 5 },
  ]

  for (const level of levels) {
    const data = parseTSV(path.join(STANDARDS_DIR, 'NAICS', level.file))

    for (const item of data) {
      const id = item.id || toPascalCase(item.name)
      if (!id || seen.has(id)) continue
      seen.add(id)

      industries.push({
        ns: NAMESPACES.industries,
        type: 'Industry',
        id,
        name: item.name || '',
        description: item.description || '',
        code: item.code,
        category: level.category,
        sourceType: 'NAICS',
        level: level.level,
      })
    }
  }

  console.log(`  📊 Generated ${industries.length} unified industries`)
  return industries
}

/**
 * Generate unified Processes from APQC
 */
function generateProcesses(): AbstractProcess[] {
  console.log('\n⚙️ Generating Unified Processes...')

  const processes: AbstractProcess[] = []
  const seen = new Set<string>()

  const data = parseTSV(path.join(STANDARDS_DIR, 'APQC', 'Processes.tsv'))

  for (const item of data) {
    const id = item.id || toPascalCase(item.name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    // Determine category from code structure
    const code = item.code || ''
    let category: 'Category' | 'Group' | 'Process' | 'Activity' = 'Process'
    if (code.match(/^\d+$/)) category = 'Category'
    else if (code.match(/^\d+\.\d+$/)) category = 'Group'
    else if (code.match(/^\d+\.\d+\.\d+$/)) category = 'Process'
    else if (code.match(/^\d+\.\d+\.\d+\.\d+/)) category = 'Activity'

    processes.push({
      ns: NAMESPACES.process,
      type: 'Process',
      id,
      name: item.name || '',
      description: item.description || '',
      code: item.code,
      category,
      sourceType: 'APQC',
      industry: item.industry,
    })
  }

  console.log(`  📊 Generated ${processes.length} unified processes`)
  return processes
}

/**
 * Generate unified Products from various sources
 */
function generateProducts(): AbstractProduct[] {
  console.log('\n📦 Generating Unified Products...')

  const products: AbstractProduct[] = []
  const seen = new Set<string>()

  // Load from GS1
  const gs1Classes = parseTSV(path.join(STANDARDS_DIR, 'GS1', 'Classes.tsv'))
  for (const item of gs1Classes) {
    const id = item.id || toPascalCase(item.name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    products.push({
      ns: NAMESPACES.products,
      type: 'Product',
      id,
      name: item.name || '',
      description: item.description || '',
      code: item.code,
      category: 'Class',
      sourceType: 'GS1',
    })
  }

  console.log(`  📊 Generated ${products.length} unified products`)
  return products
}

/**
 * Generate unified Services from NAPCS
 */
function generateServices(): AbstractService[] {
  console.log('\n🛎️ Generating Unified Services...')

  const services: AbstractService[] = []
  const seen = new Set<string>()

  const levels: Array<{
    file: string
    category: 'Section' | 'Division' | 'Group' | 'Class' | 'Subclass'
  }> = [
    { file: 'Sections.tsv', category: 'Section' },
    { file: 'Divisions.tsv', category: 'Division' },
    { file: 'Groups.tsv', category: 'Group' },
    { file: 'Classes.tsv', category: 'Class' },
    { file: 'Subclasses.tsv', category: 'Subclass' },
  ]

  for (const level of levels) {
    const data = parseTSV(path.join(STANDARDS_DIR, 'NAPCS', level.file))

    for (const item of data) {
      const id = item.id || toPascalCase(item.name)
      if (!id || seen.has(id)) continue
      seen.add(id)

      services.push({
        ns: NAMESPACES.services,
        type: 'Service',
        id,
        name: item.name || '',
        description: item.description || '',
        code: item.code,
        category: level.category,
        sourceType: 'NAPCS',
      })
    }
  }

  console.log(`  📊 Generated ${services.length} unified services`)
  return services
}

// ============================================================================
// Geography Domain Generation
// ============================================================================

/**
 * Generate unified Locations
 */
function generateLocations(): AbstractLocation[] {
  console.log('\n🌍 Generating Unified Locations...')

  const locations: AbstractLocation[] = []
  const seen = new Set<string>()

  // Load ISO Countries
  const countries = parseTSV(path.join(STANDARDS_DIR, 'ISO', 'Countries.tsv'))
  for (const item of countries) {
    const id = item.id || toPascalCase(item.name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    locations.push({
      ns: NAMESPACES.locations,
      type: 'Location',
      id,
      name: item.name || '',
      description: item.description || item.name || '',
      code: item.code,
      category: 'Country',
      sourceType: 'ISO',
      isoCode: item.code,
    })
  }

  // Load Census States
  const states = parseTSV(path.join(STANDARDS_DIR, 'Census', 'States.tsv'))
  for (const item of states) {
    const id = item.id || toPascalCase(item.name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    locations.push({
      ns: NAMESPACES.locations,
      type: 'Location',
      id,
      name: item.name || '',
      description: item.description || item.name || '',
      code: item.code,
      category: 'State',
      sourceType: 'Census',
      fipsCode: item.code,
    })
  }

  // Load CBSAs
  const cbsas = parseTSV(path.join(STANDARDS_DIR, 'Census', 'CBSAs.tsv'))
  for (const item of cbsas) {
    const id = item.id || toPascalCase(item.name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    locations.push({
      ns: NAMESPACES.locations,
      type: 'Location',
      id,
      name: item.name || '',
      description: item.description || item.name || '',
      code: item.code,
      category: 'CBSA',
      sourceType: 'Census',
    })
  }

  console.log(`  📊 Generated ${locations.length} unified locations`)
  return locations
}

// ============================================================================
// Output Functions
// ============================================================================

function entityToRecord(entity: Entity): Record<string, string> {
  const record: Record<string, string> = {}
  for (const [key, value] of Object.entries(entity)) {
    if (value !== undefined && value !== null) {
      record[key] = String(value)
    }
  }
  return record
}

function dedupeRelationships(rels: Relationship[]): Relationship[] {
  const seen = new Set<string>()
  return rels.filter((r) => {
    const key = `${r.from}|${r.to}|${r.predicate}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('🏢 Unified Abstract Interface Generation')
  console.log('========================================')
  console.log(`Source: ${STANDARDS_DIR}`)
  console.log(`Output: ${OUTPUT_DIR}`)

  // Check if standards directory exists
  if (!fs.existsSync(STANDARDS_DIR)) {
    console.error('\n❌ Standards directory not found!')
    console.error(`   Expected: ${STANDARDS_DIR}`)
    console.error('')
    console.error('Run ingest-standards.ts first:')
    console.error('   npx tsx .scripts/ingest-standards.ts')
    process.exit(1)
  }

  ensureDir(OUTPUT_DIR)
  ensureDir(OUTPUT_REL_DIR)

  // ========== Work Domain ==========
  console.log('\n📊 Work Domain')
  console.log('─'.repeat(40))

  const roles = generateRoles()
  const competencies = generateCompetencies()
  const tasks = generateTasks()
  const { actions, events, taskActionRels, actionEventRels } =
    generateActionsAndEvents(tasks)

  writeTSV(
    path.join(OUTPUT_DIR, 'Roles.tsv'),
    roles.map(entityToRecord)
  )
  writeTSV(
    path.join(OUTPUT_DIR, 'Competencies.tsv'),
    competencies.map(entityToRecord)
  )
  writeTSV(
    path.join(OUTPUT_DIR, 'Tasks.tsv'),
    tasks.map(entityToRecord)
  )
  writeTSV(
    path.join(OUTPUT_DIR, 'Actions.tsv'),
    actions.map(entityToRecord)
  )
  writeTSV(
    path.join(OUTPUT_DIR, 'Events.tsv'),
    events.map(entityToRecord)
  )

  writeTSV(
    path.join(OUTPUT_REL_DIR, 'Tasks.Actions.tsv'),
    dedupeRelationships(taskActionRels)
  )
  writeTSV(
    path.join(OUTPUT_REL_DIR, 'Actions.Events.tsv'),
    dedupeRelationships(actionEventRels)
  )

  // ========== Business Domain ==========
  console.log('\n📊 Business Domain')
  console.log('─'.repeat(40))

  const industries = generateIndustries()
  const processes = generateProcesses()
  const products = generateProducts()
  const services = generateServices()

  writeTSV(
    path.join(OUTPUT_DIR, 'Industries.tsv'),
    industries.map(entityToRecord)
  )
  writeTSV(
    path.join(OUTPUT_DIR, 'Processes.tsv'),
    processes.map(entityToRecord)
  )
  writeTSV(
    path.join(OUTPUT_DIR, 'Products.tsv'),
    products.map(entityToRecord)
  )
  writeTSV(
    path.join(OUTPUT_DIR, 'Services.tsv'),
    services.map(entityToRecord)
  )

  // ========== Geography Domain ==========
  console.log('\n📊 Geography Domain')
  console.log('─'.repeat(40))

  const locations = generateLocations()
  writeTSV(
    path.join(OUTPUT_DIR, 'Locations.tsv'),
    locations.map(entityToRecord)
  )

  // ========== Summary ==========
  console.log('\n📈 Summary')
  console.log('─'.repeat(40))
  console.log(`  Roles:        ${roles.length}`)
  console.log(`  Competencies: ${competencies.length}`)
  console.log(`  Tasks:        ${tasks.length}`)
  console.log(`  Actions:      ${actions.length}`)
  console.log(`  Events:       ${events.length}`)
  console.log(`  Industries:   ${industries.length}`)
  console.log(`  Processes:    ${processes.length}`)
  console.log(`  Products:     ${products.length}`)
  console.log(`  Services:     ${services.length}`)
  console.log(`  Locations:    ${locations.length}`)

  console.log('\n✨ Interface generation complete!')
}

main().catch(console.error)
