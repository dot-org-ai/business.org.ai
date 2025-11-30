#!/usr/bin/env tsx

/**
 * Business.org.ai Data Generation Script (Standalone)
 *
 * Generates business-related data files from local .source/ folder with:
 * - Fully qualified https:// URLs
 * - canonical column mapping business.org.ai URLs to their canonical domains
 * - relationships in .data/relationships/ folder by from/to type
 *
 * This script is standalone and does not depend on the parent repo.
 * Source data structure:
 *   .source/[Standard]/[Type].tsv
 *   .source/[Standard]/relationships/[Name].tsv
 *
 * Standard hierarchies:
 *   NAICS: Sectors, Subsectors, IndustryGroups, Industries, NationalIndustries
 *   APQC: Categories, ProcessGroups, Processes, Activities
 *   UNSPSC: Segments, Families, Classes, Commodities
 *   NAPCS: Sections, Subsections, Groups, Classes, Subclasses
 *   ONET: Occupations, Skills, Knowledge, Abilities, Tasks, WorkActivities
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
 * Normalize kebab-case ID to PascalCase
 */
function normalizeToPascalCase(id: string): string {
  return id
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
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

// ============================================================================
// NAICS Industry Hierarchy Generation
// ============================================================================

function generateIndustryHierarchy(): void {
  console.log('\n📊 Generating Industry Hierarchy...')

  // Read all NAICS hierarchy levels
  const naicsTypes = ['Sectors', 'Subsectors', 'IndustryGroups', 'Industries', 'NationalIndustries']

  for (const naicsType of naicsTypes) {
    const sourceFile = path.join(SOURCE_DIR, 'NAICS', `${naicsType}.tsv`)
    if (!fs.existsSync(sourceFile)) continue

    const sourceData = parseTSV(sourceFile)
    const singularType = naicsType.replace(/s$/, '').replace(/ie$/, 'y')

    const entities = sourceData.map(row => ({
      url: `https://business.org.ai/${naicsType}/${row.id}`,
      canonical: `https://industries.org.ai/${naicsType}/${row.id}`,
      ns: 'business.org.ai',
      type: singularType,
      id: row.id || '',
      code: row.code || '',
      name: row.name || '',
      description: row.description || '',
    }))

    // Dedupe by ID
    const seen = new Set<string>()
    const deduped = entities.filter(e => {
      if (!e.id || seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })

    if (deduped.length > 0) {
      writeTSV(path.join(OUTPUT_DATA_DIR, `${naicsType}.tsv`), deduped)
    }
  }

  // Generate hierarchy relationships
  const relFile = path.join(SOURCE_DIR, 'NAICS', 'relationships', 'Hierarchy.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)
    const relationships = relData.map(row => ({
      from: row.from || '',
      to: row.to || '',
      predicate: row.predicate || 'hasSubIndustry',
      reverse: row.reverse || 'partOfIndustry',
    }))

    if (relationships.length > 0) {
      writeTSV(path.join(OUTPUT_REL_DIR, 'Industries.Hierarchy.tsv'), relationships)
    }
  }
}

// ============================================================================
// APQC Process Hierarchy Generation
// ============================================================================

function generateProcessHierarchy(): void {
  console.log('\n⚙️ Generating Process Hierarchy...')

  const apqcTypes = ['Categories', 'ProcessGroups', 'Processes', 'Activities']

  for (const apqcType of apqcTypes) {
    const sourceFile = path.join(SOURCE_DIR, 'APQC', `${apqcType}.tsv`)
    if (!fs.existsSync(sourceFile)) continue

    const sourceData = parseTSV(sourceFile)
    const singularType = apqcType.replace(/ies$/, 'y').replace(/s$/, '')

    const entities = sourceData.map(row => {
      // Convert to Wikipedia_style ID
      const wikiId = toWikipediaStyle(row.name || row.id || '')

      return {
        url: `https://business.org.ai/${apqcType}/${wikiId}`,
        canonical: `https://process.org.ai/${apqcType}/${wikiId}`,
        ns: 'business.org.ai',
        type: singularType,
        id: wikiId,
        code: row.code || row.pcfId || '',
        name: row.name || '',
        description: row.description || '',
        industry: row.industry || '',
      }
    })

    // Dedupe by ID
    const seen = new Set<string>()
    const deduped = entities.filter(e => {
      if (!e.id || seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })

    if (deduped.length > 0) {
      writeTSV(path.join(OUTPUT_DATA_DIR, `${apqcType}.tsv`), deduped)
    }
  }

  // Generate hierarchy relationships
  const relFile = path.join(SOURCE_DIR, 'APQC', 'relationships', 'Hierarchy.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)
    const relationships = relData.map(row => ({
      from: row.from || '',
      to: row.to || '',
      predicate: row.predicate || 'hasSubProcess',
      reverse: row.reverse || 'partOfProcess',
    }))

    if (relationships.length > 0) {
      writeTSV(path.join(OUTPUT_REL_DIR, 'Processes.Hierarchy.tsv'), relationships)
    }
  }
}

// ============================================================================
// UNSPSC Product Hierarchy Generation
// ============================================================================

function generateProductHierarchy(): void {
  console.log('\n📦 Generating Product Hierarchy...')

  const unspscTypes = ['Segments', 'Families', 'Classes', 'Commodities']

  for (const unspscType of unspscTypes) {
    const sourceFile = path.join(SOURCE_DIR, 'UNSPSC', `${unspscType}.tsv`)
    if (!fs.existsSync(sourceFile)) continue

    const sourceData = parseTSV(sourceFile)
    const singularType = unspscType.replace(/ies$/, 'y').replace(/s$/, '')

    const entities = sourceData.map(row => ({
      url: `https://business.org.ai/Products/${unspscType}/${row.id}`,
      canonical: `https://products.org.ai/${unspscType}/${row.id}`,
      ns: 'business.org.ai',
      type: singularType,
      id: row.id || '',
      code: row.code || '',
      name: row.name || '',
      description: row.description || '',
      digital: row.digital || '',
    }))

    // Dedupe by ID
    const seen = new Set<string>()
    const deduped = entities.filter(e => {
      if (!e.id || seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })

    if (deduped.length > 0) {
      writeTSV(path.join(OUTPUT_DATA_DIR, `Products.${unspscType}.tsv`), deduped)
    }
  }

  // Generate hierarchy relationships
  const relFile = path.join(SOURCE_DIR, 'UNSPSC', 'relationships', 'Hierarchy.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)
    const relationships = relData.map(row => ({
      from: row.from || '',
      to: row.to || '',
      predicate: row.predicate || 'hasSubProduct',
      reverse: row.reverse || 'partOfProduct',
    }))

    if (relationships.length > 0) {
      writeTSV(path.join(OUTPUT_REL_DIR, 'Products.Hierarchy.tsv'), relationships)
    }
  }
}

// ============================================================================
// NAPCS Service Hierarchy Generation
// ============================================================================

function generateServiceHierarchy(): void {
  console.log('\n🛎️ Generating Service Hierarchy...')

  const napcsTypes = ['Sections', 'Subsections', 'Groups', 'Classes', 'Subclasses']

  for (const napcsType of napcsTypes) {
    const sourceFile = path.join(SOURCE_DIR, 'NAPCS', `${napcsType}.tsv`)
    if (!fs.existsSync(sourceFile)) continue

    const sourceData = parseTSV(sourceFile)
    const singularType = napcsType.replace(/es$/, '').replace(/s$/, '')

    const entities = sourceData.map(row => ({
      url: `https://business.org.ai/Services/${napcsType}/${row.id}`,
      canonical: `https://services.org.ai/${napcsType}/${row.id}`,
      ns: 'business.org.ai',
      type: singularType,
      id: row.id || '',
      code: row.code || '',
      name: row.name || '',
      description: row.description || '',
      digital: row.digital || '',
    }))

    // Dedupe by ID
    const seen = new Set<string>()
    const deduped = entities.filter(e => {
      if (!e.id || seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })

    if (deduped.length > 0) {
      writeTSV(path.join(OUTPUT_DATA_DIR, `Services.${napcsType}.tsv`), deduped)
    }
  }

  // Generate hierarchy relationships
  const relFile = path.join(SOURCE_DIR, 'NAPCS', 'relationships', 'Hierarchy.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)
    const relationships = relData.map(row => ({
      from: row.from || '',
      to: row.to || '',
      predicate: row.predicate || 'hasSubService',
      reverse: row.reverse || 'partOfService',
    }))

    if (relationships.length > 0) {
      writeTSV(path.join(OUTPUT_REL_DIR, 'Services.Hierarchy.tsv'), relationships)
    }
  }
}

// ============================================================================
// ONET Occupations and Related Types
// ============================================================================

function generateOccupations(): void {
  console.log('\n👤 Generating Occupations...')

  const sourceFile = path.join(SOURCE_DIR, 'ONET', 'Occupations.tsv')
  const sourceData = parseTSV(sourceFile)

  const entities = sourceData.map(row => ({
    url: `https://business.org.ai/Occupations/${row.id}`,
    canonical: `https://occupations.org.ai/${row.id}`,
    ns: 'business.org.ai',
    type: 'Occupation',
    id: row.id || '',
    code: row.code || '',
    name: row.name || '',
    description: row.description || '',
  }))

  // Dedupe by ID
  const seen = new Set<string>()
  const deduped = entities.filter(e => {
    if (!e.id || seen.has(e.id)) return false
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
    { source: 'WorkActivities.tsv', output: 'WorkActivities.tsv', type: 'WorkActivity', domain: 'activities.org.ai' },
  ]

  for (const t of types) {
    const sourceFile = path.join(SOURCE_DIR, 'ONET', t.source)
    if (!fs.existsSync(sourceFile)) continue

    const sourceData = parseTSV(sourceFile)

    const entities = sourceData.map(row => ({
      url: `https://business.org.ai/${t.type}s/${row.id}`,
      canonical: `https://${t.domain}/${row.id}`,
      ns: 'business.org.ai',
      type: t.type,
      id: row.id || '',
      code: row.code || '',
      name: row.name || '',
      description: row.description || '',
    }))

    // Dedupe by ID
    const seen = new Set<string>()
    const deduped = entities.filter(e => {
      if (!e.id || seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })

    writeTSV(path.join(OUTPUT_DATA_DIR, t.output), deduped)
  }
}

function generateONETRelationships(): void {
  console.log('\n🔗 Generating O*NET relationships...')

  const sourceFile = path.join(SOURCE_DIR, 'ONET', 'relationships', 'Occupations.tsv')
  if (!fs.existsSync(sourceFile)) {
    console.warn('  ⚠️  No ONET relationships found')
    return
  }

  const sourceData = parseTSV(sourceFile)

  // Load entity lookups to determine target types
  const skills = new Set(parseTSV(path.join(SOURCE_DIR, 'ONET', 'Skills.tsv')).map(r => normalizeToPascalCase(r.id || '')))
  const knowledge = new Set(parseTSV(path.join(SOURCE_DIR, 'ONET', 'Knowledge.tsv')).map(r => normalizeToPascalCase(r.id || '')))
  const abilities = new Set(parseTSV(path.join(SOURCE_DIR, 'ONET', 'Abilities.tsv')).map(r => normalizeToPascalCase(r.id || '')))

  // Group relationships by to-type
  const occToSkills: RelationshipRow[] = []
  const occToKnowledge: RelationshipRow[] = []
  const occToAbilities: RelationshipRow[] = []
  const occToOccupations: RelationshipRow[] = []

  sourceData.forEach(row => {
    const from = row.from || ''
    const to = row.to || ''
    const toNormalized = normalizeToPascalCase(to.split('/').pop() || '')
    const predicate = row.predicate || ''
    const reverse = row.reverse || ''

    const rel = { from, to, predicate, reverse }

    if (skills.has(toNormalized)) {
      occToSkills.push(rel)
    } else if (knowledge.has(toNormalized)) {
      occToKnowledge.push(rel)
    } else if (abilities.has(toNormalized)) {
      occToAbilities.push(rel)
    } else {
      occToOccupations.push(rel)
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
  noun: string // result noun
}

/**
 * Load verb conjugation data
 */
function loadVerbs(): Map<string, VerbData> {
  const verbFile = path.join(SOURCE_DIR, 'Verbs.tsv')
  const verbs = parseTSV(verbFile)
  const verbMap = new Map<string, VerbData>()

  verbs.forEach(v => {
    const id = v.id || v.verb || ''
    verbMap.set(id.toLowerCase(), {
      id,
      event: v.pastTense || v.event || id + 'ed',
      activity: v.gerund || v.activity || id + 'ing',
      noun: v.noun || '',
    })
  })

  return verbMap
}

/**
 * Parse a GraphDL semantic ID into components
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
    const graphdlId = row.id || ''
    const occupationId = row.occupationTitle?.replace(/\s+/g, '') || ''
    const taskCode = row.taskId || row.code || ''

    // 1. Create Wikipedia_style Task (from description)
    const wikiTaskId = toWikipediaStyle(taskDescription)
    if (wikiTaskId && !taskMap.has(wikiTaskId)) {
      taskMap.set(wikiTaskId, {
        url: `https://business.org.ai/Tasks/${wikiTaskId}`,
        canonical: `https://tasks.org.ai/${wikiTaskId}`,
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
          url: `https://business.org.ai/Tasks/${occTaskId}`,
          canonical: `https://tasks.org.ai/${occTaskId}`,
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
        from: `https://business.org.ai/Occupations/${occupationId}`,
        to: `https://business.org.ai/Tasks/${wikiTaskId}`,
        predicate: 'performs',
        reverse: 'performedBy',
      })
    }

    // 2. Create Action (GraphDL semantic statement)
    const parsed = parseGraphDLId(graphdlId)
    if (parsed && !actionMap.has(graphdlId)) {
      actionMap.set(graphdlId, {
        url: `https://business.org.ai/Actions/${graphdlId}`,
        canonical: `https://actions.org.ai/${graphdlId}`,
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
          from: `https://business.org.ai/Tasks/${wikiTaskId}`,
          to: `https://business.org.ai/Actions/${graphdlId}`,
          predicate: 'hasAction',
          reverse: 'actionOf',
        })
      }

      // Link occupation to action
      if (occupationId) {
        occupationToAction.push({
          from: `https://business.org.ai/Occupations/${occupationId}`,
          to: `https://business.org.ai/Actions/${graphdlId}`,
          predicate: 'performs',
          reverse: 'performedBy',
        })
      }

      // Also create generic action (without subject)
      const genericActionId = `${parsed.verb}.${parsed.object}${parsed.preposition ? '.' + parsed.preposition + '.' + parsed.prepObject : ''}`
      if (!actionMap.has(genericActionId)) {
        actionMap.set(genericActionId, {
          url: `https://business.org.ai/Actions/${genericActionId}`,
          canonical: `https://actions.org.ai/${genericActionId}`,
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
          url: `https://business.org.ai/Events/${eventId}`,
          canonical: `https://events.org.ai/${eventId}`,
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
        from: `https://business.org.ai/Actions/${graphdlId}`,
        to: `https://business.org.ai/Events/${eventId}`,
        predicate: 'produces',
        reverse: 'producedBy',
      })

      // Also create events for prepositional objects
      if (parsed.prepObject) {
        const prepEventId = `${parsed.prepObject}.${pastTense}`
        if (!eventMap.has(prepEventId)) {
          eventMap.set(prepEventId, {
            url: `https://business.org.ai/Events/${prepEventId}`,
            canonical: `https://events.org.ai/${prepEventId}`,
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

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🏢 Business.org.ai Data Generation')
  console.log('===================================')
  console.log(`Source: ${SOURCE_DIR}`)
  console.log(`Output: ${OUTPUT_DATA_DIR}`)

  // 1. Industry hierarchy (NAICS)
  generateIndustryHierarchy()

  // 2. Process hierarchy (APQC)
  generateProcessHierarchy()

  // 3. Product hierarchy (UNSPSC)
  generateProductHierarchy()

  // 4. Service hierarchy (NAPCS)
  generateServiceHierarchy()

  // 5. Occupations and O*NET types
  generateOccupations()
  generateONETTypes()
  generateONETRelationships()

  // 6. Tasks, Actions, Events
  generateTasksActionsEvents()

  console.log('\n✨ Done!')
}

main().catch(console.error)
