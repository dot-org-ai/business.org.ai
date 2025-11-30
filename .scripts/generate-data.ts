#!/usr/bin/env tsx

/**
 * Business.org.ai Data Generation Script (Standalone)
 *
 * Generates business-related data files from local .source/ folder with:
 * - canonical column mapping business.org.ai URLs to their canonical domains
 * - relationships in .data/relationships/ folder by from/to type
 *
 * This script is standalone and does not depend on the parent repo.
 * All source data should be in .source/[Standard]/[Type].tsv
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths (standalone - reads from local .source/)
const SOURCE_DIR = path.resolve(__dirname, '../.source')
const OUTPUT_DATA_DIR = path.resolve(__dirname, '../.data')
const OUTPUT_REL_DIR = path.resolve(__dirname, '../.data/relationships')

// Canonical domain mappings for sources we own
const CANONICAL_DOMAINS: Record<string, string> = {
  ONET: 'onet.org.ai',
  NAICS: 'naics.org.ai',
  GS1: 'gs1.org.ai',
  APQC: 'apqc.org.ai',
}

// Business.org.ai canonical mappings
const BUSINESS_CANONICAL: Record<string, string> = {
  Industries: 'industries.org.ai',
  Occupations: 'occupations.org.ai',
  Skills: 'skills.org.ai',
  Knowledge: 'knowledge.org.ai',
  Abilities: 'abilities.org.ai',
  Tasks: 'tasks.org.ai',
  Actions: 'actions.org.ai',
  Events: 'events.org.ai',
  Processes: 'process.org.ai',
  Products: 'products.org.ai',
  Services: 'services.org.ai',
}

// Ensure directories exist
;[OUTPUT_DATA_DIR, OUTPUT_REL_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

// ============================================================================
// Types
// ============================================================================

interface EntityRow {
  url: string
  canonical: string
  ns: string
  type: string
  id: string
  code: string
  name: string
  description: string
  [key: string]: string
}

interface RelationshipRow {
  ns: string
  from: string
  to: string
  predicate: string
  reverse: string
}

// ============================================================================
// Utility Functions
// ============================================================================

function parseTSV<T = Record<string, string>>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️  File not found: ${filePath}`)
    return []
  }
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split('\t')
  return lines.slice(1).map(line => {
    const values = line.split('\t')
    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header] = values[i] || ''
    })
    return row as T
  })
}

function writeTSV(filePath: string, data: Record<string, string>[]): void {
  if (data.length === 0) {
    console.warn(`  ⚠️  No data to write for ${path.basename(filePath)}`)
    return
  }

  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => (row[h] ?? '').toString()).join('\t'))
  const content = [headers.join('\t'), ...rows].join('\n')

  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`  ✅ ${path.basename(filePath)} (${data.length} rows)`)
}

/**
 * Transform source URL to business.org.ai URL with canonical
 */
function transformEntity(
  row: Record<string, string>,
  businessType: string,
  canonicalDomain: string
): EntityRow {
  const id = row.id || row.url?.split('/').pop() || ''
  const canonical = `${canonicalDomain}/${id}`
  const businessUrl = `business.org.ai/${businessType}/${id}`

  return {
    url: businessUrl,
    canonical,
    ns: 'business.org.ai',
    type: row.type || businessType.replace(/s$/, ''), // Remove plural for type
    id,
    code: row.code || '',
    name: row.name || '',
    description: row.description || '',
  }
}

/**
 * Normalize kebab-case ID to PascalCase
 */
function normalizeToPascalCase(id: string): string {
  return id
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}

/**
 * Transform relationship with normalized IDs
 */
function transformRelationship(
  row: Record<string, string>,
  fromType: string,
  toType: string
): RelationshipRow {
  return {
    ns: 'business.org.ai',
    from: normalizeToPascalCase(row.from || ''),
    to: normalizeToPascalCase(row.to || ''),
    predicate: row.predicate || '',
    reverse: row.reverse || '',
  }
}

// ============================================================================
// Entity Generation Functions
// ============================================================================

function generateIndustries(): void {
  console.log('\n📦 Generating Industries...')

  const sourceFile = path.join(SOURCE_DIR, 'NAICS', 'Industries.tsv')
  const sourceData = parseTSV(sourceFile)

  // Transform to business.org.ai format
  const entities = sourceData.map(row => ({
    url: `business.org.ai/Industries/${row.id}`,
    canonical: `industries.org.ai/${row.id}`,
    ns: 'business.org.ai',
    type: 'Industry',
    id: row.id,
    code: row.code || '',
    name: row.name || '',
    description: row.description || '',
  }))

  // Dedupe by ID (keep first occurrence)
  const seen = new Set<string>()
  const deduped = entities.filter(e => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  writeTSV(path.join(OUTPUT_DATA_DIR, 'Industries.tsv'), deduped)
}

function generateIndustryRelationships(): void {
  console.log('\n🔗 Generating Industry relationships...')

  const sourceFile = path.join(SOURCE_DIR, 'NAICS', 'Industries.Relationships.tsv')
  const sourceData = parseTSV(sourceFile)

  // Group by predicate to determine to-type
  const industryToIndustry: RelationshipRow[] = []

  sourceData.forEach(row => {
    if (row.predicate === 'hasSubIndustry') {
      industryToIndustry.push({
        ns: 'business.org.ai',
        from: row.from,
        to: row.to,
        predicate: row.predicate,
        reverse: row.reverse || 'partOfIndustry',
      })
    }
  })

  if (industryToIndustry.length > 0) {
    writeTSV(path.join(OUTPUT_REL_DIR, 'Industries.Industries.tsv'), industryToIndustry)
  }
}

function generateOccupations(): void {
  console.log('\n👤 Generating Occupations...')

  const sourceFile = path.join(SOURCE_DIR, 'ONET', 'Occupations.tsv')
  const sourceData = parseTSV(sourceFile)

  const entities = sourceData.map(row => ({
    url: `business.org.ai/Occupations/${row.id}`,
    canonical: `occupations.org.ai/${row.id}`,
    ns: 'business.org.ai',
    type: 'Occupation',
    id: row.id,
    code: row.code || '',
    name: row.name || '',
    description: row.description || '',
  }))

  // Dedupe by ID
  const seen = new Set<string>()
  const deduped = entities.filter(e => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  writeTSV(path.join(OUTPUT_DATA_DIR, 'Occupations.tsv'), deduped)
}

function generateONETTypes(): void {
  console.log('\n🎯 Generating O*NET types...')

  const types = [
    { source: 'Skills.tsv', output: 'Skills.tsv', type: 'Skill', domain: 'skills.org.ai' },
    { source: 'Knowledge.tsv', output: 'Knowledge.tsv', type: 'Knowledge', domain: 'knowledge.org.ai' },
    { source: 'Abilities.tsv', output: 'Abilities.tsv', type: 'Ability', domain: 'abilities.org.ai' },
  ]

  for (const t of types) {
    const sourceFile = path.join(SOURCE_DIR, 'ONET', t.source)
    const sourceData = parseTSV(sourceFile)

    const entities = sourceData.map(row => ({
      url: `business.org.ai/${t.type}s/${row.id}`,
      canonical: `${t.domain}/${row.id}`,
      ns: 'business.org.ai',
      type: t.type,
      id: row.id,
      code: row.code || '',
      name: row.name || '',
      description: row.description || '',
      digital: row.digital || '',
    }))

    // Dedupe by ID
    const seen = new Set<string>()
    const deduped = entities.filter(e => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })

    writeTSV(path.join(OUTPUT_DATA_DIR, t.output), deduped)
  }
}

function generateONETRelationships(): void {
  console.log('\n🔗 Generating O*NET relationships...')

  const sourceFile = path.join(SOURCE_DIR, 'ONET', 'Occupations.Relationships.tsv')
  const sourceData = parseTSV(sourceFile)

  // Load entity lookups to determine target types
  const skills = new Set(parseTSV(path.join(SOURCE_DIR, 'ONET', 'Skills.tsv')).map(r => normalizeToPascalCase(r.id)))
  const knowledge = new Set(parseTSV(path.join(SOURCE_DIR, 'ONET', 'Knowledge.tsv')).map(r => normalizeToPascalCase(r.id)))
  const abilities = new Set(parseTSV(path.join(SOURCE_DIR, 'ONET', 'Abilities.tsv')).map(r => normalizeToPascalCase(r.id)))
  const occupations = new Set(parseTSV(path.join(SOURCE_DIR, 'ONET', 'Occupations.tsv')).map(r => r.id))

  // Group relationships by to-type
  const occToSkills: RelationshipRow[] = []
  const occToKnowledge: RelationshipRow[] = []
  const occToAbilities: RelationshipRow[] = []
  const occToOccupations: RelationshipRow[] = []

  sourceData.forEach(row => {
    const from = normalizeToPascalCase(row.from || '')
    const to = normalizeToPascalCase(row.to || '')
    const predicate = row.predicate || ''
    const reverse = row.reverse || ''

    if (skills.has(to)) {
      occToSkills.push({ ns: 'business.org.ai', from, to, predicate, reverse })
    } else if (knowledge.has(to)) {
      occToKnowledge.push({ ns: 'business.org.ai', from, to, predicate, reverse })
    } else if (abilities.has(to)) {
      occToAbilities.push({ ns: 'business.org.ai', from, to, predicate, reverse })
    } else if (occupations.has(to) || predicate === 'relatedTo') {
      occToOccupations.push({ ns: 'business.org.ai', from, to, predicate, reverse })
    }
  })

  if (occToSkills.length > 0) {
    writeTSV(path.join(OUTPUT_REL_DIR, 'Occupations.Skills.tsv'), occToSkills)
  }
  if (occToKnowledge.length > 0) {
    writeTSV(path.join(OUTPUT_REL_DIR, 'Occupations.Knowledge.tsv'), occToKnowledge)
  }
  if (occToAbilities.length > 0) {
    writeTSV(path.join(OUTPUT_REL_DIR, 'Occupations.Abilities.tsv'), occToAbilities)
  }
  if (occToOccupations.length > 0) {
    writeTSV(path.join(OUTPUT_REL_DIR, 'Occupations.Occupations.tsv'), occToOccupations)
  }
}

// ============================================================================
// Task, Action, Event Generation
// ============================================================================

interface VerbData {
  id: string
  event: string // past tense
  activity: string // -ing form
  object: string // result noun
}

/**
 * Load verb conjugation data
 */
function loadVerbs(): Map<string, VerbData> {
  const verbFile = path.join(SOURCE_DIR, 'Verbs.tsv')
  const verbs = parseTSV(verbFile)
  const verbMap = new Map<string, VerbData>()

  verbs.forEach(v => {
    verbMap.set(v.id.toLowerCase(), {
      id: v.id,
      event: v.event || v.id + 'ed',
      activity: v.activity || v.id + 'ing',
      object: v.object || '',
    })
  })

  return verbMap
}

/**
 * Convert text to Wikipedia_style ID
 */
function toWikipediaStyle(text: string): string {
  return text
    .replace(/[^\w\s]/g, '') // Remove special chars
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('_')
}

/**
 * Parse a GraphDL semantic ID into components
 * e.g., "ChiefExecutives.direct.FinancialActivities.to.FundOperations"
 */
function parseGraphDLId(id: string): { subject: string; verb: string; object: string; preposition?: string; prepObject?: string } | null {
  const parts = id.split('.')
  if (parts.length < 3) return null

  const subject = parts[0]
  const verb = parts[1]
  const object = parts[2]

  let preposition: string | undefined
  let prepObject: string | undefined

  if (parts.length >= 5) {
    preposition = parts[3]
    prepObject = parts[4]
  }

  return { subject, verb, object, preposition, prepObject }
}

/**
 * Generate Tasks with Wikipedia_style IDs
 * Also generates Actions and Events
 */
function generateTasksActionsEvents(): void {
  console.log('\n📋 Generating Tasks, Actions, and Events...')

  const sourceFile = path.join(SOURCE_DIR, 'ONET', 'Tasks.tsv')
  const sourceData = parseTSV(sourceFile)
  const verbMap = loadVerbs()

  // Track unique entities
  const taskMap = new Map<string, any>()
  const actionMap = new Map<string, any>()
  const eventMap = new Map<string, any>()

  // Track relationships
  const taskToAction: RelationshipRow[] = []
  const actionToEvent: RelationshipRow[] = []
  const occupationToTask: RelationshipRow[] = []
  const occupationToAction: RelationshipRow[] = []

  // Process each source task
  sourceData.forEach(row => {
    const taskDescription = row.name || row.description || ''
    const graphdlId = row.id
    const occupationId = row.occupationTitle?.replace(/\s+/g, '') || ''
    const taskCode = row.taskId || row.code || ''

    // 1. Create Wikipedia_style Task (from description)
    const wikiTaskId = toWikipediaStyle(taskDescription)
    if (wikiTaskId && !taskMap.has(wikiTaskId)) {
      taskMap.set(wikiTaskId, {
        url: `business.org.ai/Tasks/${wikiTaskId}`,
        canonical: `tasks.org.ai/${wikiTaskId}`,
        ns: 'business.org.ai',
        type: 'Task',
        id: wikiTaskId,
        code: taskCode,
        name: taskDescription,
        description: taskDescription,
      })
    }

    // Also create occupation-specific task variant
    if (occupationId && wikiTaskId) {
      const occTaskId = `${occupationId}/${wikiTaskId}`
      if (!taskMap.has(occTaskId)) {
        taskMap.set(occTaskId, {
          url: `business.org.ai/Tasks/${occTaskId}`,
          canonical: `tasks.org.ai/${occTaskId}`,
          ns: 'business.org.ai',
          type: 'Task',
          id: occTaskId,
          code: taskCode,
          name: taskDescription,
          description: taskDescription,
          occupation: occupationId,
        })
      }

      // Link occupation to task
      occupationToTask.push({
        ns: 'business.org.ai',
        from: occupationId,
        to: wikiTaskId,
        predicate: 'performs',
        reverse: 'performedBy',
      })
    }

    // 2. Create Action (GraphDL semantic statement)
    const parsed = parseGraphDLId(graphdlId)
    if (parsed && !actionMap.has(graphdlId)) {
      actionMap.set(graphdlId, {
        url: `business.org.ai/Actions/${graphdlId}`,
        canonical: `actions.org.ai/${graphdlId}`,
        ns: 'business.org.ai',
        type: 'Action',
        id: graphdlId,
        subject: parsed.subject,
        verb: parsed.verb,
        object: parsed.object,
        preposition: parsed.preposition || '',
        prepObject: parsed.prepObject || '',
        name: taskDescription,
        description: taskDescription,
      })

      // Link task to action
      if (wikiTaskId) {
        taskToAction.push({
          ns: 'business.org.ai',
          from: wikiTaskId,
          to: graphdlId,
          predicate: 'hasAction',
          reverse: 'actionOf',
        })
      }

      // Link occupation to action
      if (occupationId) {
        occupationToAction.push({
          ns: 'business.org.ai',
          from: occupationId,
          to: graphdlId,
          predicate: 'performs',
          reverse: 'performedBy',
        })
      }

      // Also create generic action (without subject)
      const genericActionId = `${parsed.verb}.${parsed.object}${parsed.preposition ? '.' + parsed.preposition + '.' + parsed.prepObject : ''}`
      if (!actionMap.has(genericActionId)) {
        actionMap.set(genericActionId, {
          url: `business.org.ai/Actions/${genericActionId}`,
          canonical: `actions.org.ai/${genericActionId}`,
          ns: 'business.org.ai',
          type: 'Action',
          id: genericActionId,
          subject: '',
          verb: parsed.verb,
          object: parsed.object,
          preposition: parsed.preposition || '',
          prepObject: parsed.prepObject || '',
          name: taskDescription,
          description: taskDescription,
        })
      }

      // 3. Create Event (Object.verbed)
      const verbData = verbMap.get(parsed.verb.toLowerCase())
      const pastTense = verbData?.event || parsed.verb + 'ed'
      const eventId = `${parsed.object}.${pastTense}`

      if (!eventMap.has(eventId)) {
        eventMap.set(eventId, {
          url: `business.org.ai/Events/${eventId}`,
          canonical: `events.org.ai/${eventId}`,
          ns: 'business.org.ai',
          type: 'Event',
          id: eventId,
          object: parsed.object,
          pastTense: pastTense,
          verb: parsed.verb,
          name: `${parsed.object} ${pastTense}`,
          description: `${parsed.object} was ${pastTense}`,
        })
      }

      // Link action to event
      actionToEvent.push({
        ns: 'business.org.ai',
        from: graphdlId,
        to: eventId,
        predicate: 'produces',
        reverse: 'producedBy',
      })

      // Also create events for prepositional objects
      if (parsed.prepObject) {
        const prepEventId = `${parsed.prepObject}.${pastTense}`
        if (!eventMap.has(prepEventId)) {
          eventMap.set(prepEventId, {
            url: `business.org.ai/Events/${prepEventId}`,
            canonical: `events.org.ai/${prepEventId}`,
            ns: 'business.org.ai',
            type: 'Event',
            id: prepEventId,
            object: parsed.prepObject,
            pastTense: pastTense,
            verb: parsed.verb,
            name: `${parsed.prepObject} ${pastTense}`,
            description: `${parsed.prepObject} was ${pastTense}`,
          })
        }
      }
    }
  })

  // Write entity files
  const tasks = Array.from(taskMap.values())
  const actions = Array.from(actionMap.values())
  const events = Array.from(eventMap.values())

  writeTSV(path.join(OUTPUT_DATA_DIR, 'Tasks.tsv'), tasks)
  writeTSV(path.join(OUTPUT_DATA_DIR, 'Actions.tsv'), actions)
  writeTSV(path.join(OUTPUT_DATA_DIR, 'Events.tsv'), events)

  // Write relationship files (dedupe)
  const dedupeRelationships = (rels: RelationshipRow[]) => {
    const seen = new Set<string>()
    return rels.filter(r => {
      const key = `${r.from}|${r.to}|${r.predicate}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  if (taskToAction.length > 0) {
    writeTSV(path.join(OUTPUT_REL_DIR, 'Tasks.Actions.tsv'), dedupeRelationships(taskToAction))
  }
  if (actionToEvent.length > 0) {
    writeTSV(path.join(OUTPUT_REL_DIR, 'Actions.Events.tsv'), dedupeRelationships(actionToEvent))
  }
  if (occupationToTask.length > 0) {
    writeTSV(path.join(OUTPUT_REL_DIR, 'Occupations.Tasks.tsv'), dedupeRelationships(occupationToTask))
  }
  if (occupationToAction.length > 0) {
    writeTSV(path.join(OUTPUT_REL_DIR, 'Occupations.Actions.tsv'), dedupeRelationships(occupationToAction))
  }
}

function generateProcesses(): void {
  console.log('\n⚙️ Generating Processes...')

  const sourceFile = path.join(SOURCE_DIR, 'APQC', 'Processes.tsv')
  const sourceData = parseTSV(sourceFile)

  // Transform to Wikipedia_style IDs
  const entities = sourceData.map(row => {
    // Convert name to Wikipedia_style: "Develop Vision and Strategy" -> "Develop_Vision_And_Strategy"
    const wikiId = (row.name || row.id)
      .replace(/[^\w\s]/g, '') // Remove special chars
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('_')

    return {
      url: `business.org.ai/Processes/${wikiId}`,
      canonical: `process.org.ai/${wikiId}`,
      ns: 'business.org.ai',
      type: 'Process',
      id: wikiId,
      code: row.code || row.pcfId || '',
      name: row.name || '',
      description: row.description || '',
      hierarchyId: row.hierarchyId || '',
      industry: row.industry || '',
    }
  })

  // Dedupe by ID
  const seen = new Set<string>()
  const deduped = entities.filter(e => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  writeTSV(path.join(OUTPUT_DATA_DIR, 'Processes.tsv'), deduped)
}

function generateProcessRelationships(): void {
  console.log('\n🔗 Generating Process relationships...')

  const sourceFile = path.join(SOURCE_DIR, 'APQC', 'Processes.Relationships.tsv')
  if (!fs.existsSync(sourceFile)) {
    console.warn('  ⚠️  No Processes.Relationships.tsv found')
    return
  }

  const sourceData = parseTSV(sourceFile)

  const processToProcess: RelationshipRow[] = sourceData
    .filter(row => row.predicate === 'hasSubProcess' || row.predicate === 'partOfProcess')
    .map(row => ({
      ns: 'business.org.ai',
      from: row.from,
      to: row.to,
      predicate: row.predicate,
      reverse: row.reverse || '',
    }))

  if (processToProcess.length > 0) {
    writeTSV(path.join(OUTPUT_REL_DIR, 'Processes.Processes.tsv'), processToProcess)
  }
}

function generateProducts(): void {
  console.log('\n📦 Generating Products...')

  const sourceFile = path.join(SOURCE_DIR, 'UNSPSC', 'Products.tsv')
  if (!fs.existsSync(sourceFile)) {
    console.warn('  ⚠️  No Products.tsv found')
    return
  }

  const sourceData = parseTSV(sourceFile)

  const entities = sourceData.map(row => ({
    url: `business.org.ai/Products/${row.id}`,
    canonical: `products.org.ai/${row.id}`,
    ns: 'business.org.ai',
    type: 'Product',
    id: row.id,
    code: row.code || '',
    name: row.name || '',
    description: row.description || '',
  }))

  // Dedupe by ID
  const seen = new Set<string>()
  const deduped = entities.filter(e => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  writeTSV(path.join(OUTPUT_DATA_DIR, 'Products.tsv'), deduped)
}

function generateServices(): void {
  console.log('\n🛎️ Generating Services...')

  const sourceFile = path.join(SOURCE_DIR, 'NAPCS', 'Services.tsv')
  if (!fs.existsSync(sourceFile)) {
    console.warn('  ⚠️  No Services.tsv found')
    return
  }

  const sourceData = parseTSV(sourceFile)

  const entities = sourceData.map(row => ({
    url: `business.org.ai/Services/${row.id}`,
    canonical: `services.org.ai/${row.id}`,
    ns: 'business.org.ai',
    type: 'Service',
    id: row.id,
    code: row.code || '',
    name: row.name || '',
    description: row.description || '',
  }))

  // Dedupe by ID
  const seen = new Set<string>()
  const deduped = entities.filter(e => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  writeTSV(path.join(OUTPUT_DATA_DIR, 'Services.tsv'), deduped)
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🏢 Business.org.ai Data Generation')
  console.log('===================================')

  // 1. Foundational types
  generateIndustries()
  generateIndustryRelationships()

  generateOccupations()

  // 2. O*NET types
  generateONETTypes()
  generateONETRelationships()

  // 3. Tasks, Actions, Events
  generateTasksActionsEvents()

  // 4. Processes
  generateProcesses()
  generateProcessRelationships()

  // 5. Products & Services
  generateProducts()
  generateServices()

  console.log('\n✨ Done!')
}

main().catch(console.error)
