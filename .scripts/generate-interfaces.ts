#!/usr/bin/env tsx

/**
 * Unified Abstract Interface Generator
 *
 * Generates unified abstract interfaces from the standards.org.ai submodule.
 * Reads from .standards/.data/ and outputs to .data/
 *
 * Key features:
 * - Uses @graphdl/semantics for proper semantic parsing
 * - AND/OR cartesian product expansion via GraphDL
 * - Proper ID formats: PascalCase, action.Object, Subject.action.Object, Object.event
 * - Source data included for debugging
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
import { GraphDLParser, ParsedStatement } from '../graphdl/dist/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths - read from submodule, write to local .data
const STANDARDS_DIR = path.resolve(__dirname, '../.standards/.data')
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

/**
 * Convert text to PascalCase ID (no underscores, no dots)
 */
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

/**
 * Normalize entity names by removing common filler words
 * E.g., "All Other Miscellaneous Wood Product Manufacturing" -> "Wood Product Manufacturing"
 */
function normalizeName(name: string): string {
  if (!name) return ''

  // Patterns to strip from the beginning
  const prefixPatterns = [
    /^all\s+other\s+/i,
    /^other\s+/i,
    /^miscellaneous\s+/i,
    /^various\s+/i,
    /^unclassified\s+/i,
    /^general\s+/i,
  ]

  // Patterns to strip from the end
  const suffixPatterns = [
    /\s*,?\s*n\.?e\.?c\.?\s*$/i,  // n.e.c. = not elsewhere classified
    /\s*,?\s*nec\s*$/i,
    /\s*\(except[^)]*\)\s*$/i,
    /\s*,?\s*except[^,]*$/i,
  ]

  let normalized = name

  // Apply prefix patterns
  for (const pattern of prefixPatterns) {
    normalized = normalized.replace(pattern, '')
  }

  // Apply suffix patterns
  for (const pattern of suffixPatterns) {
    normalized = normalized.replace(pattern, '')
  }

  // Also strip "Miscellaneous" and "Other" from the middle
  normalized = normalized
    .replace(/\s+miscellaneous\s+/gi, ' ')
    .replace(/\s+other\s+/gi, ' ')

  return normalized.trim()
}

/**
 * Generate a short name (4-8 char abbreviation) for an entity
 */
function toShortName(text: string): string {
  if (!text) return ''

  const words = text
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[\s_-]+/)
    .filter((w) => w.length > 0)

  if (words.length === 0) return ''

  // Single word: first 4-6 chars
  if (words.length === 1) {
    return words[0].slice(0, 6).toLowerCase()
  }

  // Multiple words: take first letters or first 2 chars
  if (words.length <= 4) {
    return words.map(w => w.slice(0, 2)).join('').toLowerCase().slice(0, 8)
  }

  // Many words: take first letter of each
  return words.map(w => w[0]).join('').toLowerCase().slice(0, 8)
}

// ============================================================================
// GraphDL Parser Instance (initialized once)
// ============================================================================

let graphdlParser: GraphDLParser | null = null

async function getGraphDLParser(): Promise<GraphDLParser> {
  if (!graphdlParser) {
    graphdlParser = new GraphDLParser()
    await graphdlParser.initialize()
  }
  return graphdlParser
}

/**
 * Irregular verb past tense mappings (still needed for event generation)
 */
const IRREGULAR_PAST_TENSE: Record<string, string> = {
  be: 'was', have: 'had', do: 'did', go: 'went', make: 'made',
  take: 'took', see: 'saw', get: 'got', give: 'gave', find: 'found',
  know: 'knew', think: 'thought', tell: 'told', leave: 'left',
  keep: 'kept', begin: 'began', write: 'wrote', run: 'ran',
  read: 'read', lead: 'led', build: 'built', buy: 'bought',
  bring: 'brought', hold: 'held', set: 'set', put: 'put',
  cut: 'cut', send: 'sent', spend: 'spent', meet: 'met',
  pay: 'paid', sell: 'sold', choose: 'chose', drive: 'drove',
  win: 'won', draw: 'drew', grow: 'grew', throw: 'threw',
  teach: 'taught', catch: 'caught', understand: 'understood',
}

function toPastTense(verb: string): string {
  const v = verb.toLowerCase()
  if (IRREGULAR_PAST_TENSE[v]) return IRREGULAR_PAST_TENSE[v]
  if (v.endsWith('e')) return v + 'd'
  if (v.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(v[v.length - 2])) {
    return v.slice(0, -1) + 'ied'
  }
  // Double consonant for short verbs ending in CVC
  const vowels = ['a', 'e', 'i', 'o', 'u']
  if (v.length >= 3 && v.length <= 4) {
    const last = v[v.length - 1]
    const secondLast = v[v.length - 2]
    const thirdLast = v[v.length - 3]
    if (!vowels.includes(last) && vowels.includes(secondLast) && !vowels.includes(thirdLast)) {
      if (!['w', 'x', 'y'].includes(last)) {
        return v + last + 'ed'
      }
    }
  }
  return v + 'ed'
}

// ============================================================================
// Work Domain Generation
// ============================================================================

async function generateRoles(parser: GraphDLParser): Promise<AbstractRole[]> {
  console.log('\n👔 Generating Unified Roles...')

  const roles: AbstractRole[] = []
  const seen = new Set<string>()

  // Helper to expand AND/OR in occupation names
  function expandName(name: string): string[] {
    const commonSuffixes = ['Supervisors', 'Specialists', 'Technicians', 'Workers', 'Operators', 'Managers', 'Assistants', 'Clerks', 'Instructors', 'Representatives', 'Attendants', 'Aides', 'Therapists']

    // Find the common suffix
    const words = name.split(/\s+/)
    const lastWord = words[words.length - 1]
    let suffix = ''
    if (commonSuffixes.some(s => s.toLowerCase() === lastWord.toLowerCase())) {
      suffix = lastWord
    }

    // First try comma-separated (with optional "and" before last item)
    if (name.includes(',')) {
      let parts = name.split(/\s*,\s*(?:and\s+)?/i)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      // Distribute suffix if we have one
      if (suffix && parts.length > 1) {
        const lastPart = parts[parts.length - 1]
        if (lastPart.toLowerCase().endsWith(suffix.toLowerCase())) {
          parts[parts.length - 1] = lastPart.slice(0, -suffix.length).trim()
        }

        parts = parts.map(p => {
          if (p.toLowerCase().endsWith(suffix.toLowerCase())) return p
          return `${p} ${suffix}`
        }).filter(p => p.length > suffix.length + 1)

        return parts
      }

      const allShort = parts.every(p => p.split(/\s+/).length <= 4)
      if (allShort && parts.length > 1) return parts
    }

    // Try slash-separated
    if (name.includes('/')) {
      const parts = name.split(/\s*\/\s*/)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      const allShort = parts.every(p => p.split(/\s+/).length <= 3)
      if (allShort && parts.length > 1) return parts
    }

    // Try "A and B" pattern with common suffix
    if (name.includes(' and ') && suffix) {
      const parts = name.split(/\s+and\s+/i)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      if (parts.length >= 2) {
        let lastPart = parts[parts.length - 1]
        if (lastPart.toLowerCase().endsWith(suffix.toLowerCase())) {
          lastPart = lastPart.slice(0, -suffix.length).trim()
          parts[parts.length - 1] = lastPart
        }

        const expanded = parts.map(p => {
          if (p.toLowerCase().endsWith(suffix.toLowerCase())) return p
          return `${p} ${suffix}`
        }).filter(p => p.length > suffix.length + 1)

        if (expanded.every(p => p.split(/\s+/).length <= 5)) {
          return expanded
        }
      }
    }

    return [name]
  }

  // Helper to add role
  function addRole(
    occ: Record<string, string>,
    sourceType: string
  ): void {
    const rawName = occ.name || occ.id || ''
    if (!rawName) return

    // First normalize, then expand
    const normalizedName = normalizeName(rawName)
    const expandedNames = expandName(normalizedName)

    for (const expandedName of expandedNames) {
      // Apply normalization again
      const finalName = normalizeName(expandedName)
      const id = toPascalCase(finalName)
      if (!id || seen.has(id)) continue
      seen.add(id)

      roles.push({
        ns: NAMESPACES.roles,
        type: 'Role',
        id,
        name: finalName,
        description: occ.description || '',
        code: occ.code,
        shortName: toShortName(finalName),
        category: 'Occupation',
        sourceType,
        sourceCode: occ.code,
      })
    }
  }

  // Load ONET Occupations from standards submodule
  const onetOccupations = parseTSV(path.join(STANDARDS_DIR, 'ONET.Occupations.tsv'))
  for (const occ of onetOccupations) {
    addRole(occ, 'ONETOccupation')
  }

  // Load BLS Occupations
  const blsOccupations = parseTSV(path.join(STANDARDS_DIR, 'BLS.Occupations.tsv'))
  for (const occ of blsOccupations) {
    addRole(occ, 'BLSOccupation')
  }

  console.log(`  📊 Generated ${roles.length} unified roles`)
  return roles
}

function generateCompetencies(): AbstractCompetency[] {
  console.log('\n💪 Generating Unified Competencies...')

  const competencies: AbstractCompetency[] = []
  const seen = new Set<string>()

  const sources: Array<{
    file: string
    category: 'Skill' | 'Ability' | 'Knowledge'
    sourceType: string
  }> = [
    { file: 'ONET.Skills.tsv', category: 'Skill', sourceType: 'ONETSkill' },
    { file: 'ONET.Abilities.tsv', category: 'Ability', sourceType: 'ONETAbility' },
    { file: 'ONET.Knowledge.tsv', category: 'Knowledge', sourceType: 'ONETKnowledge' },
  ]

  for (const source of sources) {
    const data = parseTSV(path.join(STANDARDS_DIR, source.file))

    for (const item of data) {
      const id = toPascalCase(item.name || item.id || '')
      if (!id || seen.has(id)) continue
      seen.add(id)

      competencies.push({
        ns: NAMESPACES.competencies,
        type: 'Competency',
        id,
        name: item.name || '',
        description: item.description || '',
        code: item.code,
        shortName: toShortName(item.name || ''),
        category: source.category,
        sourceType: source.sourceType,
      })
    }
  }

  console.log(`  📊 Generated ${competencies.length} unified competencies`)
  return competencies
}

/**
 * Generate Tasks using GraphDL semantic parsing
 * Tasks are parsed into action.Object format like Actions
 */
async function generateTasks(parser: GraphDLParser): Promise<AbstractTask[]> {
  console.log('\n📋 Generating Unified Tasks (GraphDL parsing)...')

  const tasks: AbstractTask[] = []
  const seen = new Set<string>()

  // Helper to add a parsed task
  function addTask(
    stmt: ParsedStatement,
    sourceText: string,
    code: string,
    sourceType: string
  ): void {
    if (!stmt.predicate || !stmt.object) return

    // Generate GraphDL ID
    const graphdlId = parser.toGraphDL(stmt)
    if (!graphdlId || seen.has(graphdlId)) return
    seen.add(graphdlId)

    const objectPascal = toPascalCase(stmt.object)

    tasks.push({
      ns: NAMESPACES.tasks,
      type: 'Task',
      id: graphdlId,
      name: `${stmt.predicate} ${stmt.object}`,
      description: sourceText,
      code,
      shortName: toShortName(`${stmt.predicate} ${stmt.object}`),
      verb: stmt.predicate.toLowerCase(),
      object: objectPascal,
      preposition: stmt.preposition,
      prepObject: stmt.complement ? toPascalCase(stmt.complement) : undefined,
      source: sourceText,
      sourceType,
    })
  }

  // Load ONET Tasks
  // NOTE: Use description (full text) instead of name (truncated) for parsing
  const onetTasks = parseTSV(path.join(STANDARDS_DIR, 'ONET.Tasks.tsv'))
  for (const task of onetTasks) {
    const sourceText = task.description || task.name || ''
    if (!sourceText) continue

    const parsed = parser.parse(sourceText)

    // Process all expansions (AND/OR cartesian products)
    if (parsed.expansions && parsed.expansions.length > 0) {
      for (const expansion of parsed.expansions) {
        addTask(expansion, sourceText, task.code || '', 'ONETTask')
      }
    } else {
      addTask(parsed, sourceText, task.code || '', 'ONETTask')
    }
  }

  // Load Work Activities
  // NOTE: Use description (full text) instead of name (truncated) for parsing
  const workActivities = parseTSV(path.join(STANDARDS_DIR, 'ONET.WorkActivities.tsv'))
  for (const activity of workActivities) {
    const sourceText = activity.description || activity.name || ''
    if (!sourceText) continue

    const parsed = parser.parse(sourceText)

    if (parsed.expansions && parsed.expansions.length > 0) {
      for (const expansion of parsed.expansions) {
        addTask(expansion, sourceText, activity.code || '', 'ONETWorkActivity')
      }
    } else {
      addTask(parsed, sourceText, activity.code || '', 'ONETWorkActivity')
    }
  }

  console.log(`  📊 Generated ${tasks.length} unified tasks`)
  return tasks
}

/**
 * Generate Actions and Events using @graphdl/semantics parser
 * Includes source task references for debugging
 */
async function generateActionsAndEvents(
  tasks: AbstractTask[],
  parser: GraphDLParser
): Promise<{
  actions: AbstractAction[]
  events: AbstractEvent[]
  taskActionRels: Relationship[]
  actionEventRels: Relationship[]
}> {
  console.log('\n⚡ Generating Actions and Events (GraphDL semantic parsing)...')

  const actionMap = new Map<string, AbstractAction>()
  const eventMap = new Map<string, AbstractEvent>()
  const taskActionRels: Relationship[] = []
  const actionEventRels: Relationship[] = []

  /**
   * Process a single parsed statement into action and event
   */
  function processStatement(
    stmt: ParsedStatement,
    task: AbstractTask,
    sourceText: string
  ): void {
    if (!stmt.predicate || !stmt.object) return

    // Generate GraphDL ID using the parser
    const graphdlId = parser.toGraphDL(stmt)

    // Convert object to PascalCase for proper IDs
    const objectPascal = toPascalCase(stmt.object)
    const complementPascal = stmt.complement ? toPascalCase(stmt.complement) : undefined

    // Create action
    if (!actionMap.has(graphdlId)) {
      const prepPhrase = stmt.preposition && stmt.complement
        ? ` ${stmt.preposition} ${stmt.complement}`
        : ''

      actionMap.set(graphdlId, {
        ns: NAMESPACES.actions,
        type: 'Action',
        id: graphdlId,
        name: `${stmt.predicate} ${stmt.object}${prepPhrase}`,
        description: stmt.original,
        shortName: toShortName(`${stmt.predicate} ${stmt.object}`),
        verb: stmt.predicate.toLowerCase(),
        object: objectPascal,
        preposition: stmt.preposition,
        prepObject: complementPascal,
        source: sourceText, // Original source text for debugging
      })
    }

    // Task → Action relationship
    taskActionRels.push({
      from: `https://${NAMESPACES.tasks}/${task.id}`,
      to: `https://${NAMESPACES.actions}/${graphdlId}`,
      predicate: 'hasAction',
      reverse: 'actionOf',
    })

    // Create Event in GraphDL format: Object.pastTense
    const pastTense = toPastTense(stmt.predicate.toLowerCase())
    const eventId = `${objectPascal}.${pastTense}`

    if (!eventMap.has(eventId)) {
      eventMap.set(eventId, {
        ns: NAMESPACES.events,
        type: 'Event',
        id: eventId,
        name: `${objectPascal} ${pastTense}`,
        description: `${objectPascal} was ${pastTense}`,
        shortName: toShortName(`${objectPascal} ${pastTense}`),
        pastTense,
        verb: stmt.predicate.toLowerCase(),
        object: objectPascal,
        source: sourceText, // Original source text for debugging
        sourceActionId: graphdlId,
      })
    }

    // Action → Event relationship
    actionEventRels.push({
      from: `https://${NAMESPACES.actions}/${graphdlId}`,
      to: `https://${NAMESPACES.events}/${eventId}`,
      predicate: 'produces',
      reverse: 'producedBy',
    })
  }

  for (const task of tasks) {
    // Parse task source using GraphDL parser
    // Use task.source (full text) instead of task.name (which is formatted)
    const sourceText = task.source || task.description || task.name || ''
    const parsed = parser.parse(sourceText)

    // If there are expansions (from AND/OR), process each one
    if (parsed.expansions && parsed.expansions.length > 0) {
      for (const expansion of parsed.expansions) {
        processStatement(expansion, task, sourceText)
      }
    } else {
      // No expansions, process the single parsed statement
      processStatement(parsed, task, sourceText)
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

async function generateIndustries(parser: GraphDLParser): Promise<AbstractIndustry[]> {
  console.log('\n🏭 Generating Unified Industries...')

  const industries: AbstractIndustry[] = []
  const seen = new Set<string>()

  // Helper to expand AND/OR in industry names
  function expandName(name: string): string[] {
    const commonSuffixes = ['Manufacturing', 'Services', 'Products', 'Trade', 'Wholesalers', 'Retailers', 'Production', 'Construction', 'Repair', 'Equipment', 'Supplies', 'Facilities']

    // Find the common suffix (usually "Manufacturing", "Services", etc.)
    const words = name.split(/\s+/)
    const lastWord = words[words.length - 1]
    let suffix = ''
    if (commonSuffixes.some(s => s.toLowerCase() === lastWord.toLowerCase())) {
      suffix = lastWord
    }

    // First try comma-separated (with optional "and" before last item)
    if (name.includes(',')) {
      // Split by comma and optional "and"
      let parts = name.split(/\s*,\s*(?:and\s+)?/i)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      // If we have a suffix and multiple parts, distribute the suffix
      if (suffix && parts.length > 1) {
        // Remove the suffix from the last part if it has it
        const lastPart = parts[parts.length - 1]
        if (lastPart.toLowerCase().endsWith(suffix.toLowerCase())) {
          parts[parts.length - 1] = lastPart.slice(0, -suffix.length).trim()
        }

        // Add suffix to parts that don't have it
        parts = parts.map(p => {
          if (p.toLowerCase().endsWith(suffix.toLowerCase())) {
            return p
          }
          return `${p} ${suffix}`
        }).filter(p => p.length > suffix.length + 1)

        return parts
      }

      // Only expand if parts are reasonably short (3 words max per part)
      const allShort = parts.every(p => p.split(/\s+/).length <= 3)
      if (allShort && parts.length > 1) return parts
    }

    // Try slash-separated (e.g., "Audio/Visual" -> ["Audio", "Visual"])
    if (name.includes('/')) {
      const parts = name.split(/\s*\/\s*/)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      const allShort = parts.every(p => p.split(/\s+/).length <= 3)
      if (allShort && parts.length > 1) return parts
    }

    // Try splitting on multiple "and"s with common suffix
    // E.g., "Air Conditioning and Warm Air Heating Equipment and Commercial Refrigeration Equipment Manufacturing"
    if (name.includes(' and ') && suffix) {
      // Split on " and " boundaries
      const parts = name.split(/\s+and\s+/i)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      if (parts.length >= 2) {
        // Remove suffix from last part
        let lastPart = parts[parts.length - 1]
        if (lastPart.toLowerCase().endsWith(suffix.toLowerCase())) {
          lastPart = lastPart.slice(0, -suffix.length).trim()
          parts[parts.length - 1] = lastPart
        }

        // Distribute suffix to all parts
        const expanded = parts.map(p => {
          if (p.toLowerCase().endsWith(suffix.toLowerCase())) {
            return p
          }
          return `${p} ${suffix}`
        }).filter(p => p.length > suffix.length + 1)

        // Only use if each part is reasonable length
        if (expanded.every(p => p.split(/\s+/).length <= 5)) {
          return expanded
        }
      }
    }

    // Try "A and B" pattern without commas (for shorter cases)
    const andMatch = name.match(/^(.+?)\s+and\s+(.+)$/i)
    if (andMatch) {
      const [, before, after] = andMatch

      // Check if there's a common suffix (last word of 'after')
      const afterWords = after.trim().split(/\s+/)
      if (afterWords.length >= 2 && suffix) {
        // If "before" doesn't already end with the suffix, create expanded versions
        if (!before.toLowerCase().endsWith(suffix.toLowerCase())) {
          const part1 = `${before} ${suffix}`
          const part2 = after

          // Only expand if both parts are reasonably short
          if (part1.split(/\s+/).length <= 5 && part2.split(/\s+/).length <= 5) {
            return [part1, part2]
          }
        }
      }

      // Simple "A and B" split if both parts are short
      const beforeShort = before.split(/\s+/).length <= 3
      const afterShort = after.split(/\s+/).length <= 3
      if (beforeShort && afterShort) {
        return [before, after]
      }
    }

    return [name]
  }

  // Helper to add industry from any NAICS level
  function addIndustry(item: Record<string, string>, level: number): void {
    const name = item.name || item.id || ''
    if (!name) return

    // First normalize, then expand
    const normalizedName = normalizeName(name)
    const expandedNames = expandName(normalizedName)

    for (const expandedName of expandedNames) {
      // Apply normalization again to each expanded name
      const finalName = normalizeName(expandedName)
      const id = toPascalCase(finalName)
      if (!id || seen.has(id)) continue
      seen.add(id)

      industries.push({
        ns: NAMESPACES.industries,
        type: 'Industry',
        id,
        name: finalName,
        description: item.description || '',
        code: item.code,
        shortName: toShortName(finalName),
        sourceType: 'NAICS',
        level,
      })
    }
  }

  // Load all NAICS levels - each is still just an "Industry"
  const sectors = parseTSV(path.join(STANDARDS_DIR, 'NAICS.Sectors.tsv'))
  sectors.forEach(item => addIndustry(item, 1))

  const subsectors = parseTSV(path.join(STANDARDS_DIR, 'NAICS.Subsectors.tsv'))
  subsectors.forEach(item => addIndustry(item, 2))

  const groups = parseTSV(path.join(STANDARDS_DIR, 'NAICS.IndustryGroups.tsv'))
  groups.forEach(item => addIndustry(item, 3))

  const naicsIndustries = parseTSV(path.join(STANDARDS_DIR, 'NAICS.Industries.tsv'))
  naicsIndustries.forEach(item => addIndustry(item, 4))

  const national = parseTSV(path.join(STANDARDS_DIR, 'NAICS.NationalIndustries.tsv'))
  national.forEach(item => addIndustry(item, 5))

  console.log(`  📊 Generated ${industries.length} unified industries`)
  return industries
}

function generateProcesses(): AbstractProcess[] {
  console.log('\n⚙️ Generating Unified Processes...')

  const processes: AbstractProcess[] = []
  const seen = new Set<string>()

  // Helper to add process
  function addProcess(item: Record<string, string>, level: number): void {
    const id = toPascalCase(item.name || item.id || '')
    if (!id || seen.has(id)) return
    seen.add(id)

    processes.push({
      ns: NAMESPACES.process,
      type: 'Process',
      id,
      name: item.name || '',
      description: item.description || '',
      code: item.code,
      shortName: toShortName(item.name || ''),
      sourceType: 'APQC',
      level,
      industry: item.industry,
    })
  }

  // APQC Processes - determine level from code structure
  const data = parseTSV(path.join(STANDARDS_DIR, 'APQC.Processes.tsv'))
  for (const item of data) {
    const code = item.code || ''
    let level = 3 // default
    if (code.match(/^\d+$/)) level = 1
    else if (code.match(/^\d+\.\d+$/)) level = 2
    else if (code.match(/^\d+\.\d+\.\d+$/)) level = 3
    else if (code.match(/^\d+\.\d+\.\d+\.\d+/)) level = 4

    addProcess(item, level)
  }

  console.log(`  📊 Generated ${processes.length} unified processes`)
  return processes
}

async function generateProducts(parser: GraphDLParser): Promise<AbstractProduct[]> {
  console.log('\n📦 Generating Unified Products...')

  const products: AbstractProduct[] = []
  const seen = new Set<string>()

  // Helper to expand AND/OR in product names
  function expandName(name: string): string[] {
    // First, clean up the name by simplifying parenthetical content
    // "Vegetables (Non Leaf) - Unprepared/Unprocessed (Fresh)"
    // → "Vegetables Non Leaf - Unprepared/Unprocessed Fresh"
    let cleanName = name
      .replace(/\s*\(([^)]+)\)\s*/g, ' $1 ')  // Remove parens but keep content
      .replace(/\s+/g, ' ')
      .trim()

    // Handle hyphen-separated sections: "X - Y/Z" → expand Y/Z
    if (cleanName.includes(' - ')) {
      const parts = cleanName.split(/\s+-\s+/)
      if (parts.length >= 2) {
        // Get the base (before hyphen) and modifiers (after hyphen)
        const base = parts[0].trim()
        const modifierSection = parts.slice(1).join(' ').trim()

        // Expand slashes in the modifier section
        if (modifierSection.includes('/')) {
          const modifiers = modifierSection.split(/\s*\/\s*/)
            .map(m => m.trim())
            .filter(m => m.length > 0)

          if (modifiers.length > 1) {
            // Create combinations: base + each modifier
            return modifiers.map(m => `${base} ${m}`)
          }
        }

        // If no slash expansion, just combine
        return [`${base} ${modifierSection}`]
      }
    }

    // Try comma-separated (with optional "and" before last item)
    if (cleanName.includes(',')) {
      const parts = cleanName.split(/\s*,\s*(?:and\s+)?/i)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      const allShort = parts.every(p => p.split(/\s+/).length <= 4)
      if (allShort && parts.length > 1) return parts
    }

    // Try slash-separated (for simple cases without hyphen)
    if (cleanName.includes('/')) {
      const parts = cleanName.split(/\s*\/\s*/)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      const allShort = parts.every(p => p.split(/\s+/).length <= 4)
      if (allShort && parts.length > 1) return parts
    }

    return [cleanName]
  }

  // Helper to add product from any source
  function addProduct(item: Record<string, string>, source: string, level: number): void {
    let name = item.name || item.id || ''
    if (!name) return

    // Skip items where name appears to be a description (too long)
    // This handles GS1 data quality issues where descriptions are in the name field
    if (name.length > 100) {
      // Try using the sameAs field as the actual name (GS1 has short names there)
      if (item.sameAs && item.sameAs.length > 0 && item.sameAs.length < 100) {
        name = item.sameAs
      } else {
        // Skip entirely - this is bad data
        return
      }
    }

    // Expand AND/OR in names
    const expandedNames = expandName(name)

    for (const expandedName of expandedNames) {
      const id = toPascalCase(expandedName)
      if (!id || seen.has(id)) continue
      seen.add(id)

      products.push({
        ns: NAMESPACES.products,
        type: 'Product',
        id,
        name: expandedName,
        description: item.description || '',
        code: item.code,
        shortName: toShortName(expandedName),
        sourceType: source,
        level,
      })
    }
  }

  // GS1 GPC hierarchy (focused on retail/consumer products)
  const gs1Segments = parseTSV(path.join(STANDARDS_DIR, 'GS1.Segments.tsv'))
  gs1Segments.forEach(item => addProduct(item, 'GS1', 1))

  const gs1Families = parseTSV(path.join(STANDARDS_DIR, 'GS1.Families.tsv'))
  gs1Families.forEach(item => addProduct(item, 'GS1', 2))

  const gs1Classes = parseTSV(path.join(STANDARDS_DIR, 'GS1.Classes.tsv'))
  gs1Classes.forEach(item => addProduct(item, 'GS1', 3))

  const gs1Bricks = parseTSV(path.join(STANDARDS_DIR, 'GS1.Bricks.tsv'))
  gs1Bricks.forEach(item => addProduct(item, 'GS1', 4))

  // UNSPSC hierarchy (broader B2B product classification)
  const unspscSegments = parseTSV(path.join(STANDARDS_DIR, 'UNSPSC.Segments.tsv'))
  unspscSegments.forEach(item => addProduct(item, 'UNSPSC', 1))

  const unspscFamilies = parseTSV(path.join(STANDARDS_DIR, 'UNSPSC.Families.tsv'))
  unspscFamilies.forEach(item => addProduct(item, 'UNSPSC', 2))

  const unspscClasses = parseTSV(path.join(STANDARDS_DIR, 'UNSPSC.Classes.tsv'))
  unspscClasses.forEach(item => addProduct(item, 'UNSPSC', 3))

  // Note: UNSPSC.Commodities has 150K+ items - consider if needed
  // const unspscCommodities = parseTSV(path.join(STANDARDS_DIR, 'UNSPSC.Commodities.tsv'))
  // unspscCommodities.forEach(item => addProduct(item, 'UNSPSC', 4))

  console.log(`  📊 Generated ${products.length} unified products`)
  return products
}

async function generateServices(parser: GraphDLParser): Promise<AbstractService[]> {
  console.log('\n🛎️ Generating Unified Services...')

  const services: AbstractService[] = []
  const seen = new Set<string>()

  // Helper to check if NAPCS code is a service (codes 500+ are services)
  function isServiceCode(code: string): boolean {
    const numCode = parseInt(code, 10)
    return numCode >= 500
  }

  // Helper to expand AND/OR in service names
  function expandName(name: string): string[] {
    // First try comma-separated (with optional "and" before last item)
    if (name.includes(',')) {
      const parts = name.split(/\s*,\s*(?:and\s+)?/i)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      const allShort = parts.every(p => p.split(/\s+/).length <= 3)
      if (allShort && parts.length > 1) return parts
    }

    // Try slash-separated
    if (name.includes('/')) {
      const parts = name.split(/\s*\/\s*/)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      const allShort = parts.every(p => p.split(/\s+/).length <= 3)
      if (allShort && parts.length > 1) return parts
    }

    return [name]
  }

  // Helper to add service
  function addService(item: Record<string, string>, source: string, level: number): void {
    const name = item.name || item.id || ''
    if (!name) return

    const expandedNames = expandName(name)

    for (const expandedName of expandedNames) {
      const id = toPascalCase(expandedName)
      if (!id || seen.has(id)) continue
      seen.add(id)

      services.push({
        ns: NAMESPACES.services,
        type: 'Service',
        id,
        name: expandedName,
        description: item.description || '',
        code: item.code,
        shortName: toShortName(expandedName),
        sourceType: source,
        level,
      })
    }
  }

  // NAPCS Groups - only service categories (code >= 500)
  const napcsGroups = parseTSV(path.join(STANDARDS_DIR, 'NAPCS.Groups.tsv'))
  napcsGroups
    .filter(item => isServiceCode(item.code || ''))
    .forEach(item => addService(item, 'NAPCS', 1))

  // NAPCS Products - only services (code starting with 5+)
  const napcsProducts = parseTSV(path.join(STANDARDS_DIR, 'NAPCS.Products.tsv'))
  napcsProducts
    .filter(item => isServiceCode((item.code || '').slice(0, 3)))
    .forEach(item => addService(item, 'NAPCS', 2))

  console.log(`  📊 Generated ${services.length} unified services`)
  return services
}

// ============================================================================
// Geography Domain Generation
// ============================================================================

function generateLocations(): AbstractLocation[] {
  console.log('\n🌍 Generating Unified Locations...')

  const locations: AbstractLocation[] = []
  const seen = new Set<string>()

  // Load ISO Countries
  const countries = parseTSV(path.join(STANDARDS_DIR, 'ISO.Countries.tsv'))
  for (const item of countries) {
    const id = toPascalCase(item.name || item.id || '')
    if (!id || seen.has(id)) continue
    seen.add(id)

    locations.push({
      ns: NAMESPACES.locations,
      type: 'Location',
      id,
      name: item.name || '',
      description: item.description || item.name || '',
      code: item.code,
      shortName: item.code || toShortName(item.name || ''),
      category: 'Country',
      sourceType: 'ISO',
      isoCode: item.code,
    })
  }

  // Load Census States
  const states = parseTSV(path.join(STANDARDS_DIR, 'Census.States.tsv'))
  for (const item of states) {
    const id = toPascalCase(item.name || item.id || '')
    if (!id || seen.has(id)) continue
    seen.add(id)

    locations.push({
      ns: NAMESPACES.locations,
      type: 'Location',
      id,
      name: item.name || '',
      description: item.description || item.name || '',
      code: item.code,
      shortName: item.code || toShortName(item.name || ''),
      category: 'State',
      sourceType: 'Census',
      fipsCode: item.code,
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
  console.log('🏢 Unified Abstract Interface Generation (GraphDL)')
  console.log('==================================================')
  console.log(`Source: ${STANDARDS_DIR}`)
  console.log(`Output: ${OUTPUT_DIR}`)

  // Check if standards submodule exists
  if (!fs.existsSync(STANDARDS_DIR)) {
    console.error('\n❌ Standards submodule not found!')
    console.error(`   Expected: ${STANDARDS_DIR}`)
    console.error('')
    console.error('Initialize the submodule:')
    console.error('   git submodule update --init --recursive')
    console.error('   cd .standards && git lfs pull')
    process.exit(1)
  }

  ensureDir(OUTPUT_DIR)
  ensureDir(OUTPUT_REL_DIR)

  // Initialize GraphDL parser
  console.log('\n🔧 Initializing GraphDL parser...')
  const parser = await getGraphDLParser()
  console.log('  ✅ Parser initialized')

  // ========== Work Domain ==========
  console.log('\n📊 Work Domain')
  console.log('─'.repeat(50))

  const roles = await generateRoles(parser)
  const competencies = generateCompetencies()
  const tasks = await generateTasks(parser)
  const { actions, events, taskActionRels, actionEventRels } =
    await generateActionsAndEvents(tasks, parser)

  writeTSV(path.join(OUTPUT_DIR, 'Roles.tsv'), roles.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Competencies.tsv'), competencies.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Tasks.tsv'), tasks.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Actions.tsv'), actions.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Events.tsv'), events.map(entityToRecord))

  writeTSV(path.join(OUTPUT_REL_DIR, 'Tasks.Actions.tsv'), dedupeRelationships(taskActionRels))
  writeTSV(path.join(OUTPUT_REL_DIR, 'Actions.Events.tsv'), dedupeRelationships(actionEventRels))

  // ========== Business Domain ==========
  console.log('\n📊 Business Domain')
  console.log('─'.repeat(50))

  const industries = await generateIndustries(parser)
  const processes = generateProcesses()
  const products = await generateProducts(parser)
  const services = await generateServices(parser)

  writeTSV(path.join(OUTPUT_DIR, 'Industries.tsv'), industries.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Processes.tsv'), processes.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Products.tsv'), products.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Services.tsv'), services.map(entityToRecord))

  // ========== Geography Domain ==========
  console.log('\n📊 Geography Domain')
  console.log('─'.repeat(50))

  const locations = generateLocations()
  writeTSV(path.join(OUTPUT_DIR, 'Locations.tsv'), locations.map(entityToRecord))

  // ========== Summary ==========
  console.log('\n📈 Summary')
  console.log('─'.repeat(50))
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
