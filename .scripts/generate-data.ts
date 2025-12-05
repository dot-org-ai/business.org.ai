#!/usr/bin/env tsx

/**
 * Business.org.ai Data Generation Script (Standalone)
 *
 * Generates business-related data files from local .standards/ folder with:
 * - Fully qualified https:// URLs
 * - canonical column mapping business.org.ai URLs to their canonical domains
 * - relationships in .data/relationships/ folder by from/to type
 *
 * This script is standalone and does not depend on the parent repo.
 * Source data structure:
 *   .standards/[Standard]/[Type].tsv
 *   .standards/[Standard]/relationships/[Name].tsv
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

// Paths (standalone - reads from local .standards/)
const SOURCE_DIR = path.resolve(__dirname, '../.standards')
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

/**
 * Simplified entity schema
 * URLs computed at runtime: https://{ns}/{id}
 */
interface EntityRow {
  ns: string      // Canonical namespace (e.g., products.org.ai)
  type: string    // Entity type
  id: string      // Wikipedia_Style_Names ID
  code: string    // Numeric code if applicable
  name: string    // Display name
  description: string
  [key: string]: string
}

interface RelationshipRow {
  from: string
  to: string
  predicate: string
  reverse: string
  [key: string]: string // For additional properties like scaleId, dataValue, etc.
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
 * Convert text to PascalCase ID (always joins without underscores)
 * Used for: Occupations, Industries, Products, Services, Activities, etc.
 */
function toPascalCase(text: string): string {
  if (!text) return ''

  const cleaned = text
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const words = cleaned.split(/[\s_-]+/).filter(w => w.length > 0)
  if (words.length === 0) return ''

  return words.map(w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join('')
}

/**
 * Convert text to Wikipedia_Style_Names ID (uses underscores for long names)
 * Used for: Tasks (which are full sentence descriptions)
 */
function toWikipediaStyle(text: string): string {
  if (!text) return ''

  const cleaned = text
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const words = cleaned.split(/[\s_-]+/).filter(w => w.length > 0)
  if (words.length === 0) return ''

  const capitalizedWords = words.map(w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  )

  // PascalCase for 1-3 words, Wikipedia_Style for 4+
  if (words.length <= 3) {
    return capitalizedWords.join('')
  } else {
    return capitalizedWords.join('_')
  }
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
      ns: 'industries.org.ai',
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
      // Convert to PascalCase ID
      const id = toPascalCase(row.name || row.id || '')

      return {
        ns: 'process.org.ai',
        type: singularType,
        id,
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
      ns: 'products.org.ai',
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
      ns: 'services.org.ai',
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
// Activities Hierarchy Generation (GWA + IWA + DWA → unified Activities)
// ============================================================================

/**
 * Generate unified Activities hierarchy from:
 * - GWA (General Work Activities) - Elements with code 4.A.*
 * - IWA (Intermediate Work Activities) - code pattern 4.A.x.y.z.I##
 * - DWA (Detailed Work Activities) - code pattern 4.A.x.y.z.I##.D##
 */
function generateActivitiesHierarchy(): void {
  console.log('\n🎯 Generating Unified Activities Hierarchy...')

  const activities: EntityRow[] = []
  const hierarchyRels: RelationshipRow[] = []

  // 1. Load GWA from Elements (codes starting with 4.A)
  const elementsFile = path.join(SOURCE_DIR, 'ONET', 'Elements.tsv')
  if (fs.existsSync(elementsFile)) {
    const elements = parseTSV(elementsFile)
    const gwaElements = elements.filter(row => row.code?.startsWith('4.A.'))

    gwaElements.forEach(row => {
      activities.push({
        ns: 'activities.org.ai',
        type: 'Activity',
        id: row.id || '',
        code: row.code || '',
        name: row.name || '',
        description: row.description || '',
        level: 'GWA',
        sourceType: 'GeneralWorkActivity',
      })
    })

    // Create GWA hierarchy (parent codes based on dot-separated levels)
    gwaElements.forEach(row => {
      const code = row.code
      if (!code) return

      // Find parent code (remove last segment)
      const parts = code.split('.')
      if (parts.length > 2) {
        const parentCode = parts.slice(0, -1).join('.')
        const parent = gwaElements.find(e => e.code === parentCode)
        if (parent && parent.id) {
          hierarchyRels.push({
            from: `https://business.org.ai/Activities/${parent.id}`,
            to: `https://business.org.ai/Activities/${row.id}`,
            predicate: 'hasSubActivity',
            reverse: 'partOfActivity',
          })
        }
      }
    })

    console.log(`  📊 Loaded ${gwaElements.length} GWA elements`)
  }

  // 2. Load IWA
  const iwaFile = path.join(SOURCE_DIR, 'ONET', 'IntermediateWorkActivities.tsv')
  if (fs.existsSync(iwaFile)) {
    const iwas = parseTSV(iwaFile)

    iwas.forEach(row => {
      activities.push({
        ns: 'activities.org.ai',
        type: 'Activity',
        id: row.id || '',
        code: row.code || '',
        name: row.name || '',
        description: row.description || '',
        level: 'IWA',
        sourceType: 'IntermediateWorkActivity',
      })

      // Link IWA to parent GWA (extract GWA code from IWA code)
      // IWA code format: 4.A.x.y.z.I## → GWA code: 4.A.x.y.z
      const iwaCode = row.code
      if (iwaCode && iwaCode.includes('.I')) {
        const gwaCode = iwaCode.split('.I')[0]
        // Find the GWA element with this code
        const elementsData = parseTSV(elementsFile)
        const parentGWA = elementsData.find(e => e.code === gwaCode)
        if (parentGWA && parentGWA.id) {
          hierarchyRels.push({
            from: `https://business.org.ai/Activities/${parentGWA.id}`,
            to: `https://business.org.ai/Activities/${row.id}`,
            predicate: 'hasSubActivity',
            reverse: 'partOfActivity',
          })
        }
      }
    })

    console.log(`  📊 Loaded ${iwas.length} IWA elements`)
  }

  // 3. Load DWA
  const dwaFile = path.join(SOURCE_DIR, 'ONET', 'DetailedWorkActivities.tsv')
  if (fs.existsSync(dwaFile)) {
    const dwas = parseTSV(dwaFile)

    dwas.forEach(row => {
      activities.push({
        ns: 'activities.org.ai',
        type: 'Activity',
        id: row.id || '',
        code: row.code || '',
        name: row.name || '',
        description: row.description || '',
        level: 'DWA',
        sourceType: 'DetailedWorkActivity',
      })

      // Link DWA to parent IWA (extract IWA code from DWA code)
      // DWA code format: 4.A.x.y.z.I##.D## → IWA code: 4.A.x.y.z.I##
      const dwaCode = row.code
      if (dwaCode && dwaCode.includes('.D')) {
        const iwaCode = dwaCode.split('.D')[0]
        // Find the IWA element with this code
        const iwaData = parseTSV(iwaFile)
        const parentIWA = iwaData.find(e => e.code === iwaCode)
        if (parentIWA && parentIWA.id) {
          hierarchyRels.push({
            from: `https://business.org.ai/Activities/${parentIWA.id}`,
            to: `https://business.org.ai/Activities/${row.id}`,
            predicate: 'hasSubActivity',
            reverse: 'partOfActivity',
          })
        }
      }
    })

    console.log(`  📊 Loaded ${dwas.length} DWA elements`)
  }

  // Dedupe activities by ID
  const seen = new Set<string>()
  const dedupedActivities = activities.filter(a => {
    if (!a.id || seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })

  // Write unified Activities.tsv
  if (dedupedActivities.length > 0) {
    writeTSV(path.join(OUTPUT_DATA_DIR, 'Activities.tsv'), dedupedActivities)
  }

  // Dedupe hierarchy relationships
  const seenRels = new Set<string>()
  const dedupedRels = hierarchyRels.filter(r => {
    const key = `${r.from}|${r.to}`
    if (seenRels.has(key)) return false
    seenRels.add(key)
    return true
  })

  // Write Activities.Hierarchy.tsv
  if (dedupedRels.length > 0) {
    writeTSV(path.join(OUTPUT_REL_DIR, 'Activities.Hierarchy.tsv'), dedupedRels)
  }

  console.log(`  ✅ Unified ${dedupedActivities.length} activities with ${dedupedRels.length} hierarchy relationships`)
}

// ============================================================================
// ONET Entity and Relationship Generation (All 41 files)
// ============================================================================

/**
 * ONET entity type configurations
 */
const ONET_ENTITY_TYPES = [
  { source: 'Occupations.tsv', output: 'Occupations.tsv', type: 'Occupation', domain: 'occupations.org.ai', urlType: 'Occupations' },
  { source: 'Elements.tsv', output: 'Elements.tsv', type: 'Element', domain: 'onet.org.ai/Elements', urlType: 'Elements' },
  { source: 'DetailedWorkActivities.tsv', output: 'DetailedWorkActivities.tsv', type: 'DetailedWorkActivity', domain: 'activities.org.ai/DWA', urlType: 'DetailedWorkActivities' },
  { source: 'IntermediateWorkActivities.tsv', output: 'IntermediateWorkActivities.tsv', type: 'IntermediateWorkActivity', domain: 'activities.org.ai/IWA', urlType: 'IntermediateWorkActivities' },
  { source: 'Tasks.tsv', output: 'OccupationTasks.tsv', type: 'Task', domain: 'tasks.org.ai', urlType: 'Tasks' },
  { source: 'EmergingTasks.tsv', output: 'EmergingTasks.tsv', type: 'EmergingTask', domain: 'tasks.org.ai/Emerging', urlType: 'EmergingTasks' },
  { source: 'JobZones.tsv', output: 'JobZones.tsv', type: 'JobZone', domain: 'onet.org.ai/JobZones', urlType: 'JobZones' },
  { source: 'WorkContexts.tsv', output: 'WorkContexts.tsv', type: 'WorkContext', domain: 'context.org.ai', urlType: 'WorkContexts' },
  { source: 'EducationLevels.tsv', output: 'EducationLevels.tsv', type: 'EducationLevel', domain: 'education.org.ai/Levels', urlType: 'EducationLevels' },
  { source: 'Scales.tsv', output: 'Scales.tsv', type: 'Scale', domain: 'onet.org.ai/Scales', urlType: 'Scales' },
  { source: 'ScaleAnchors.tsv', output: 'ScaleAnchors.tsv', type: 'ScaleAnchor', domain: 'onet.org.ai/ScaleAnchors', urlType: 'ScaleAnchors' },
  { source: 'RIASECKeywords.tsv', output: 'RIASECKeywords.tsv', type: 'RIASECKeyword', domain: 'onet.org.ai/RIASEC', urlType: 'RIASECKeywords' },
  { source: 'TaskCategories.tsv', output: 'TaskCategories.tsv', type: 'TaskCategory', domain: 'tasks.org.ai/Categories', urlType: 'TaskCategories' },
  { source: 'UNSPSCCommodities.tsv', output: 'OccupationCommodities.tsv', type: 'Commodity', domain: 'products.org.ai', urlType: 'Commodities' },
]

/**
 * ONET relationship file configurations
 */
const ONET_RELATIONSHIP_FILES = [
  'Occupations.Abilities',
  'Occupations.Skills',
  'Occupations.Knowledge',
  'Occupations.WorkActivities',
  'Occupations.WorkContexts',
  'Occupations.WorkStyles',
  'Occupations.WorkValues',
  'Occupations.Interests',
  'Occupations.JobZones',
  'Occupations.Tasks',
  'Occupations.RelatedOccupations',
  'Occupations.AlternateTitles',
  'Occupations.ReportedTitles',
  'Occupations.Education',
  'Occupations.TechnologySkills',
  'Occupations.ToolsUsed',
  'Tasks.DetailedWorkActivities',
  'Abilities.WorkActivities',
  'Abilities.WorkContexts',
  'Skills.WorkActivities',
  'Skills.WorkContexts',
  'Interests.Activities',
  'Interests.Occupations',
  'BasicInterests.RIASEC',
  'Occupations.Metadata',
]

/**
 * Build a lookup map from ONET code (like "11-1011.00") to entity ID (like "ChiefExecutives")
 */
function buildONETCodeToIdMap(): Map<string, string> {
  const codeToId = new Map<string, string>()

  // Load occupations to get code → id mappings
  const occFile = path.join(SOURCE_DIR, 'ONET', 'Occupations.tsv')
  if (fs.existsSync(occFile)) {
    const occs = parseTSV(occFile)
    occs.forEach(row => {
      if (row.code && row.id) {
        // Map both with and without dots: "11-1011.00" → "ChiefExecutives"
        codeToId.set(row.code, row.id)
        // Also without dots: "11-101100" → "ChiefExecutives"
        codeToId.set(row.code.replace(/\./g, ''), row.id)
      }
    })
  }

  // Load elements to get code → id mappings
  const elemFile = path.join(SOURCE_DIR, 'ONET', 'Elements.tsv')
  if (fs.existsSync(elemFile)) {
    const elems = parseTSV(elemFile)
    elems.forEach(row => {
      if (row.code && row.id) {
        codeToId.set(row.code, row.id)
      }
    })
  }

  return codeToId
}

/**
 * Transform source URL to business.org.ai URL
 */
function transformONETUrl(sourceUrl: string, codeToId: Map<string, string>): string {
  // Parse the source URL
  // Example: https://onet.org.ai/Occupations/11-101100 → https://business.org.ai/Occupations/ChiefExecutives
  const match = sourceUrl.match(/https:\/\/onet\.org\.ai\/(\w+)\/(.+)$/)
  if (!match) return sourceUrl

  const [, type, identifier] = match
  const resolvedId = codeToId.get(identifier) || identifier

  return `https://business.org.ai/${type}/${resolvedId}`
}

/**
 * Generate all ONET entity types
 */
function generateONETEntities(): void {
  console.log('\n👤 Generating ONET Entities...')

  for (const config of ONET_ENTITY_TYPES) {
    const sourceFile = path.join(SOURCE_DIR, 'ONET', config.source)
    if (!fs.existsSync(sourceFile)) {
      console.warn(`  ⚠️  Missing source: ${config.source}`)
      continue
    }

    const sourceData = parseTSV(sourceFile)

    const entities = sourceData.map(row => ({
      ns: config.domain,
      type: config.type,
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
      writeTSV(path.join(OUTPUT_DATA_DIR, config.output), deduped)
    }
  }
}

/**
 * Generate all ONET relationships (with score data as edge properties)
 */
function generateONETRelationships(): void {
  console.log('\n🔗 Generating ONET Relationships...')

  const codeToId = buildONETCodeToIdMap()

  for (const relName of ONET_RELATIONSHIP_FILES) {
    const sourceFile = path.join(SOURCE_DIR, 'ONET', 'relationships', `${relName}.tsv`)
    if (!fs.existsSync(sourceFile)) {
      console.warn(`  ⚠️  Missing relationship: ${relName}.tsv`)
      continue
    }

    const sourceData = parseTSV(sourceFile)
    if (sourceData.length === 0) continue

    // Get all headers from the first row to preserve additional columns (scaleId, dataValue, etc.)
    const firstRow = sourceData[0]
    const additionalCols = Object.keys(firstRow).filter(k => !['from', 'to', 'predicate', 'reverse'].includes(k))

    const relationships = sourceData.map(row => {
      const rel: RelationshipRow = {
        from: transformONETUrl(row.from || '', codeToId),
        to: transformONETUrl(row.to || '', codeToId),
        predicate: row.predicate || '',
        reverse: row.reverse || '',
      }

      // Preserve additional columns (scores, etc.)
      additionalCols.forEach(col => {
        rel[col] = row[col] || ''
      })

      return rel
    })

    writeTSV(path.join(OUTPUT_REL_DIR, `${relName}.tsv`), relationships)
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

interface ParsedAction {
  verb: string
  object: string
  preposition?: string
  prepObject?: string
}

/**
 * Generate past tense form of a verb
 */
function toPastTense(verb: string): string {
  if (!verb) return ''
  const v = verb.toLowerCase()
  // Handle irregular verbs (add more as needed)
  const irregulars: Record<string, string> = {
    be: 'was', have: 'had', do: 'did', go: 'went', make: 'made',
    say: 'said', get: 'got', take: 'took', see: 'saw', come: 'came',
    know: 'knew', think: 'thought', give: 'gave', find: 'found',
    tell: 'told', become: 'became', leave: 'left', put: 'put',
    keep: 'kept', let: 'let', begin: 'began', show: 'showed',
    hear: 'heard', run: 'ran', bring: 'brought', write: 'wrote',
    sit: 'sat', stand: 'stood', lose: 'lost', pay: 'paid',
    meet: 'met', set: 'set', learn: 'learned', lead: 'led',
    understand: 'understood', hold: 'held', catch: 'caught',
    choose: 'chose', draw: 'drew', drive: 'drove', eat: 'ate',
    fall: 'fell', feel: 'felt', fly: 'flew', grow: 'grew',
    read: 'read', rise: 'rose', sell: 'sold', send: 'sent',
    spend: 'spent', teach: 'taught', throw: 'threw', wear: 'wore',
    win: 'won', build: 'built', buy: 'bought', cut: 'cut',
  }
  if (irregulars[v]) return irregulars[v]
  // Verbs ending in 'e' - just add 'd'
  if (v.endsWith('e')) return v + 'd'
  // Verbs ending in consonant + 'y' - change to 'ied'
  if (v.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(v[v.length - 2])) {
    return v.slice(0, -1) + 'ied'
  }
  // CVC pattern for short verbs: double final consonant
  // But NOT if ending in w, x, y, or if second-to-last is also consonant
  const vowels = ['a', 'e', 'i', 'o', 'u']
  if (v.length >= 3) {
    const last = v[v.length - 1]
    const secondLast = v[v.length - 2]
    const thirdLast = v[v.length - 3]
    // If CVC pattern (consonant-vowel-consonant) and short word
    if (!vowels.includes(last) && vowels.includes(secondLast) && !vowels.includes(thirdLast)) {
      // Don't double w, x, y
      if (!['w', 'x', 'y'].includes(last)) {
        // Only double for short verbs (1 syllable typically)
        if (v.length <= 4) {
          return v + last + 'ed'
        }
        // For longer verbs ending in stressed syllable (like confer, prefer, occur)
        if (['er', 'ur', 'it', 'et', 'ot', 'ut', 'at'].some(s => v.endsWith(s))) {
          return v + last + 'ed'
        }
      }
    }
  }
  // Default: add 'ed'
  return v + 'ed'
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
    const pastTense = v.pastTense || v.event || toPastTense(id)
    verbMap.set(id.toLowerCase(), {
      id,
      event: pastTense,
      activity: v.gerund || v.activity || id + 'ing',
      noun: v.noun || '',
    })
  })

  return verbMap
}

/**
 * Split text on "and", "or", "," while respecting phrase boundaries
 */
function splitCompound(text: string): string[] {
  if (!text) return []
  // Remove parenthetical content
  const cleaned = text.replace(/\([^)]+\)/g, '').trim()
  // Split on conjunctions
  const parts = cleaned.split(/\s*(?:,\s*(?:and|or)?|(?:\band\b|\bor\b))\s*/i)
  return parts.map(p => p.trim()).filter(p => p.length > 0)
}

/**
 * Parse a task description into verb-object pairs
 * Example: "Direct or coordinate financial activities to fund operations"
 * Returns: [{verb: "direct", object: "FinancialActivities"}, {verb: "coordinate", object: "FinancialActivities"}, ...]
 */
function parseTaskDescription(description: string, verbSet: Set<string>): ParsedAction[] {
  const actions: ParsedAction[] = []
  if (!description) return actions

  // Normalize the description - remove possessives and special chars
  const text = description
    .toLowerCase()
    .replace(/['']/g, '') // Remove apostrophes
    .replace(/[^\w\s,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const words = text.split(' ')

  // Find verb positions
  const verbPositions: { verb: string; index: number }[] = []
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    if (verbSet.has(word)) {
      verbPositions.push({ verb: word, index: i })
    }
  }

  if (verbPositions.length === 0) return actions

  // Extract objects for each verb (text between this verb and next verb or end)
  for (let i = 0; i < verbPositions.length; i++) {
    const { verb, index } = verbPositions[i]
    const nextIndex = i + 1 < verbPositions.length ? verbPositions[i + 1].index : words.length

    // Get words between verb and next verb (the object phrase)
    const objectWords = words.slice(index + 1, nextIndex)
    if (objectWords.length === 0) continue

    // Filter out articles and stop words from beginning
    const stopWords = ['a', 'an', 'the', 'or', 'and', 'of', 'in', 'on', 'at', 's']
    const filteredWords = objectWords.filter(w => !stopWords.includes(w) && w.length > 1)
    if (filteredWords.length === 0) continue

    // Check for preposition patterns (to, for, with, etc.)
    const preps = ['to', 'for', 'with', 'in', 'on', 'by', 'from', 'using']
    const prepIndex = filteredWords.findIndex(w => preps.includes(w))

    let mainObject: string
    let preposition: string | undefined
    let prepObject: string | undefined

    if (prepIndex > 0) {
      // Split at preposition
      const beforePrep = filteredWords.slice(0, prepIndex)
      const afterPrep = filteredWords.slice(prepIndex + 1)

      mainObject = beforePrep.join(' ')
      preposition = filteredWords[prepIndex]
      prepObject = afterPrep.length > 0 ? afterPrep.join(' ') : undefined
    } else {
      mainObject = filteredWords.join(' ')
    }

    // Handle compound objects (split on "and/or")
    const mainObjects = splitCompound(mainObject)

    // Create actions for each object
    for (const obj of mainObjects) {
      if (!obj || obj.length < 2) continue
      const objId = toPascalCase(obj)
      if (!objId) continue

      // Only add preposition/prepObject if prepObject is defined and non-empty
      if (prepObject && prepObject.trim().length > 0) {
        const prepObjId = toPascalCase(prepObject)
        if (prepObjId) {
          actions.push({
            verb,
            object: objId,
            preposition,
            prepObject: prepObjId,
          })
        }
      } else {
        actions.push({
          verb,
          object: objId,
        })
      }
    }
  }

  return actions
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
 * Also generates Actions and Events by parsing task descriptions
 */
function generateTasksActionsEvents(): void {
  console.log('\n📋 Generating Tasks, Actions, and Events...')

  const sourceFile = path.join(SOURCE_DIR, 'ONET', 'Tasks.tsv')
  const sourceData = parseTSV(sourceFile)
  const verbMap = loadVerbs()

  // Create verb set for fast lookup
  const verbSet = new Set(verbMap.keys())

  // Load occupations to create code-to-ID lookup
  const occupationsFile = path.join(SOURCE_DIR, 'ONET', 'Occupations.tsv')
  const occupationsData = parseTSV(occupationsFile)
  const occupationCodeToId = new Map<string, string>()
  occupationsData.forEach(occ => {
    if (occ.code && occ.id) {
      occupationCodeToId.set(occ.code, occ.id)
    }
  })

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
    const occupationCode = row.occupationCode || ''
    const taskCode = row.taskId || row.code || ''

    // Get occupation ID from code lookup
    const occupationId = occupationCodeToId.get(occupationCode) || ''

    // 1. Create Wikipedia_style Task (from description)
    const wikiTaskId = toWikipediaStyle(taskDescription)
    if (wikiTaskId && !taskMap.has(wikiTaskId)) {
      taskMap.set(wikiTaskId, {
        ns: 'tasks.org.ai',
        type: 'Task',
        id: wikiTaskId,
        code: taskCode,
        name: taskDescription,
        description: taskDescription,
      })
    }

    // Link occupation to task
    if (occupationId && wikiTaskId) {
      occupationToTask.push({
        from: `https://occupations.org.ai/${occupationId}`,
        to: `https://tasks.org.ai/${wikiTaskId}`,
        predicate: 'performs',
        reverse: 'performedBy',
      })
    }

    // 2. Parse task description into semantic verb-object pairs
    const parsedActions = parseTaskDescription(taskDescription, verbSet)

    for (const parsed of parsedActions) {
      // Create generic action ID: verb.Object or verb.Object.prep.PrepObject
      const actionId = parsed.preposition && parsed.prepObject
        ? `${parsed.verb}.${parsed.object}.${parsed.preposition}.${parsed.prepObject}`
        : `${parsed.verb}.${parsed.object}`

      if (!actionMap.has(actionId)) {
        const prepPhrase = parsed.preposition && parsed.prepObject
          ? ` ${parsed.preposition} ${parsed.prepObject}`
          : ''
        actionMap.set(actionId, {
          ns: 'actions.org.ai',
          type: 'Action',
          id: actionId,
          verb: parsed.verb,
          object: parsed.object,
          preposition: parsed.preposition || '',
          prepObject: parsed.prepObject || '',
          name: `${parsed.verb} ${parsed.object}${prepPhrase}`,
          description: taskDescription,
        })
      }

      // Link task to action
      if (wikiTaskId) {
        taskToAction.push({
          from: `https://tasks.org.ai/${wikiTaskId}`,
          to: `https://actions.org.ai/${actionId}`,
          predicate: 'hasAction',
          reverse: 'actionOf',
        })
      }

      // Link occupation to action (with subject)
      if (occupationId) {
        const subjectActionId = `${occupationId}.${actionId}`
        if (!actionMap.has(subjectActionId)) {
          actionMap.set(subjectActionId, {
            ns: 'actions.org.ai',
            type: 'Action',
            id: subjectActionId,
            subject: occupationId,
            verb: parsed.verb,
            object: parsed.object,
            preposition: parsed.preposition || '',
            prepObject: parsed.prepObject || '',
            name: `${occupationId} ${parsed.verb} ${parsed.object}`,
            description: taskDescription,
          })
        }

        occupationToAction.push({
          from: `https://occupations.org.ai/${occupationId}`,
          to: `https://actions.org.ai/${actionId}`,
          predicate: 'performs',
          reverse: 'performedBy',
        })
      }

      // 3. Create Event (Object.pastTense)
      const verbData = verbMap.get(parsed.verb.toLowerCase())
      const pastTense = verbData?.event || parsed.verb + 'ed'
      const eventId = `${parsed.object}.${pastTense}`

      if (!eventMap.has(eventId)) {
        eventMap.set(eventId, {
          ns: 'events.org.ai',
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
        from: `https://actions.org.ai/${actionId}`,
        to: `https://events.org.ai/${eventId}`,
        predicate: 'produces',
        reverse: 'producedBy',
      })

      // Also create events for prepositional objects
      if (parsed.prepObject) {
        const prepEventId = `${parsed.prepObject}.${pastTense}`
        if (!eventMap.has(prepEventId)) {
          eventMap.set(prepEventId, {
            ns: 'events.org.ai',
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

  // 5. Unified Activities hierarchy (GWA + IWA + DWA)
  generateActivitiesHierarchy()

  // 6. All ONET entities and relationships (14 entity types, 25 relationship files)
  generateONETEntities()
  generateONETRelationships()

  // 6. Tasks, Actions, Events
  generateTasksActionsEvents()

  console.log('\n✨ Done!')
}

main().catch(console.error)
