#!/usr/bin/env tsx

/**
 * Source Data Ingestion Script
 *
 * Transforms data from root .data/ folder into standardized .source/ format
 * with proper hierarchical types for each standard.
 *
 * URL Pattern:
 *   url: https://standards.org.ai/[Source]/[Type]/[Name]
 *   canonical: https://[source].org.ai/[Type]/[Name] (only for sources we own)
 *
 * Standard Hierarchies:
 *
 * NAICS (by code length):
 *   - 2 digits = Sectors (e.g., 11)
 *   - 3 digits = Subsectors (e.g., 111)
 *   - 4 digits = IndustryGroups (e.g., 1111)
 *   - 5 digits = Industries (e.g., 11111)
 *   - 6 digits = NationalIndustries (e.g., 111110)
 *
 * APQC (by hierarchy depth):
 *   - X.0 = Categories (e.g., 1.0)
 *   - X.X = ProcessGroups (e.g., 1.1)
 *   - X.X.X = Processes (e.g., 1.1.1)
 *   - X.X.X.X+ = Activities (e.g., 1.1.1.1)
 *
 * UNSPSC (by code length):
 *   - 2 digits = Segments (e.g., 11)
 *   - 4 digits = Families (e.g., 1111)
 *   - 6 digits = Classes (e.g., 111111)
 *   - 8 digits = Commodities (e.g., 11111111)
 *
 * NAPCS (by code length):
 *   - 2-3 digits = Sections
 *   - 4 digits = Subsections
 *   - 5 digits = Groups
 *   - 6 digits = Classes
 *   - 7 digits = Subclasses
 *
 * ONET:
 *   - Occupations, Skills, Knowledge, Abilities, Tasks, WorkActivities
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths
const ROOT_DATA_DIR = path.resolve(__dirname, '../../../.data')
const SOURCE_DIR = path.resolve(__dirname, '../.source')

// Canonical domains for sources we own
const CANONICAL_DOMAINS: Record<string, string> = {
  ONET: 'onet.org.ai',
  NAICS: 'naics.org.ai',
  GS1: 'gs1.org.ai',
  APQC: 'apqc.org.ai',
}

// ============================================================================
// Utility Functions
// ============================================================================

function parseTSV(filePath: string): Record<string, string>[] {
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
    return row
  })
}

function writeTSV(filePath: string, data: Record<string, string>[]): void {
  if (data.length === 0) {
    console.warn(`  ⚠️  No data to write for ${path.basename(filePath)}`)
    return
  }

  // Ensure directory exists
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => (row[h] ?? '').toString()).join('\t'))
  const content = [headers.join('\t'), ...rows].join('\n')

  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`  ✅ ${path.relative(SOURCE_DIR, filePath)} (${data.length} rows)`)
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

// ============================================================================
// NAICS Hierarchy
// ============================================================================

function getNAICSType(code: string): string {
  const cleanCode = code.replace(/[^0-9]/g, '')
  switch (cleanCode.length) {
    case 2: return 'Sectors'
    case 3: return 'Subsectors'
    case 4: return 'IndustryGroups'
    case 5: return 'Industries'
    case 6: return 'NationalIndustries'
    default: return 'Industries'
  }
}

function ingestNAICS(): void {
  console.log('\n📊 Ingesting NAICS...')

  const sourceFile = path.join(ROOT_DATA_DIR, 'Industries.tsv')
  const data = parseTSV(sourceFile)

  // Group by hierarchy type
  const byType: Record<string, Record<string, string>[]> = {
    Sectors: [],
    Subsectors: [],
    IndustryGroups: [],
    Industries: [],
    NationalIndustries: [],
  }

  const seenByType: Record<string, Set<string>> = {
    Sectors: new Set(),
    Subsectors: new Set(),
    IndustryGroups: new Set(),
    Industries: new Set(),
    NationalIndustries: new Set(),
  }

  for (const row of data) {
    const code = row.code || ''
    const type = getNAICSType(code)
    const id = row.id || ''

    // Skip duplicates within type
    if (seenByType[type].has(id)) continue
    seenByType[type].add(id)

    byType[type].push({
      url: `https://standards.org.ai/NAICS/${type}/${id}`,
      canonical: `https://naics.org.ai/${type}/${id}`,
      ns: 'standards.org.ai',
      type: type.replace(/s$/, ''),
      id,
      code,
      name: row.name || '',
      description: row.description || '',
    })
  }

  // Write each type file
  for (const [type, entities] of Object.entries(byType)) {
    if (entities.length > 0) {
      writeTSV(path.join(SOURCE_DIR, 'NAICS', `${type}.tsv`), entities)
    }
  }

  // Ingest relationships
  const relFile = path.join(ROOT_DATA_DIR, 'Industries.Relationships.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)
    const relationships = relData.map(row => ({
      from: row.from?.startsWith('https://') ? row.from : `https://${row.from}`,
      to: row.to?.startsWith('https://') ? row.to : `https://${row.to}`,
      predicate: row.predicate || '',
      reverse: row.reverse || '',
    }))
    writeTSV(path.join(SOURCE_DIR, 'NAICS', 'relationships', 'Hierarchy.tsv'), relationships)
  }
}

// ============================================================================
// APQC Hierarchy
// ============================================================================

function getAPQCType(code: string): string {
  const parts = code.split('.')
  if (parts.length === 2 && parts[1] === '0') return 'Categories'
  if (parts.length === 2) return 'ProcessGroups'
  if (parts.length === 3) return 'Processes'
  return 'Activities'
}

function ingestAPQC(): void {
  console.log('\n📋 Ingesting APQC...')

  const sourceFile = path.join(ROOT_DATA_DIR, 'Processes.tsv')
  const data = parseTSV(sourceFile)

  // Group by hierarchy type
  const byType: Record<string, Record<string, string>[]> = {
    Categories: [],
    ProcessGroups: [],
    Processes: [],
    Activities: [],
  }

  const seenByType: Record<string, Set<string>> = {
    Categories: new Set(),
    ProcessGroups: new Set(),
    Processes: new Set(),
    Activities: new Set(),
  }

  for (const row of data) {
    const code = row.code || row.hierarchyId || ''
    const type = getAPQCType(code)
    const id = row.id || ''

    // Skip duplicates within type
    if (seenByType[type].has(id)) continue
    seenByType[type].add(id)

    byType[type].push({
      url: `https://standards.org.ai/APQC/${type}/${id}`,
      canonical: `https://apqc.org.ai/${type}/${id}`,
      ns: 'standards.org.ai',
      type: type.replace(/s$/, ''),
      id,
      code,
      pcfId: row.pcfId || '',
      name: row.name || '',
      description: row.description || '',
      industry: row.industry || '',
    })
  }

  // Write each type file
  for (const [type, entities] of Object.entries(byType)) {
    if (entities.length > 0) {
      writeTSV(path.join(SOURCE_DIR, 'APQC', `${type}.tsv`), entities)
    }
  }

  // Ingest relationships
  const relFile = path.join(ROOT_DATA_DIR, 'Processes.Relationships.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)
    const relationships = relData.map(row => ({
      from: row.from?.startsWith('https://') ? row.from : `https://${row.from}`,
      to: row.to?.startsWith('https://') ? row.to : `https://${row.to}`,
      predicate: row.predicate || '',
      reverse: row.reverse || '',
    }))
    writeTSV(path.join(SOURCE_DIR, 'APQC', 'relationships', 'Hierarchy.tsv'), relationships)
  }
}

// ============================================================================
// UNSPSC Hierarchy
// ============================================================================

function getUNSPSCType(code: string): string {
  const cleanCode = code.replace(/[^0-9]/g, '')
  if (cleanCode.length <= 2) return 'Segments'
  if (cleanCode.length <= 4) return 'Families'
  if (cleanCode.length <= 6) return 'Classes'
  return 'Commodities'
}

function ingestUNSPSC(): void {
  console.log('\n📦 Ingesting UNSPSC...')

  const sourceFile = path.join(ROOT_DATA_DIR, 'Products.tsv')
  const data = parseTSV(sourceFile)

  // Group by hierarchy type
  const byType: Record<string, Record<string, string>[]> = {
    Segments: [],
    Families: [],
    Classes: [],
    Commodities: [],
  }

  const seenByType: Record<string, Set<string>> = {
    Segments: new Set(),
    Families: new Set(),
    Classes: new Set(),
    Commodities: new Set(),
  }

  // Also extract hierarchy from segment/family/class columns
  const segmentSeen = new Set<string>()
  const familySeen = new Set<string>()
  const classSeen = new Set<string>()

  for (const row of data) {
    const code = row.code || row.unspsc || ''
    const type = getUNSPSCType(code)
    const id = row.id || ''

    // Extract hierarchy entities
    if (row.segment && row.segmentCode && !segmentSeen.has(row.segmentCode)) {
      segmentSeen.add(row.segmentCode)
      byType.Segments.push({
        url: `https://standards.org.ai/UNSPSC/Segments/${row.segment.replace(/\s+/g, '')}`,
        ns: 'standards.org.ai',
        type: 'Segment',
        id: row.segment.replace(/\s+/g, ''),
        code: row.segmentCode,
        name: row.segment,
        description: '',
      })
    }

    if (row.family && row.familyCode && !familySeen.has(row.familyCode)) {
      familySeen.add(row.familyCode)
      byType.Families.push({
        url: `https://standards.org.ai/UNSPSC/Families/${row.family.replace(/\s+/g, '')}`,
        ns: 'standards.org.ai',
        type: 'Family',
        id: row.family.replace(/\s+/g, ''),
        code: row.familyCode,
        name: row.family,
        description: '',
        segmentCode: row.segmentCode || '',
      })
    }

    if (row.class && row.classCode && !classSeen.has(row.classCode)) {
      classSeen.add(row.classCode)
      byType.Classes.push({
        url: `https://standards.org.ai/UNSPSC/Classes/${row.class.replace(/\s+/g, '')}`,
        ns: 'standards.org.ai',
        type: 'Class',
        id: row.class.replace(/\s+/g, ''),
        code: row.classCode,
        name: row.class,
        description: '',
        familyCode: row.familyCode || '',
      })
    }

    // Skip duplicates for commodities
    if (seenByType.Commodities.has(id)) continue
    seenByType.Commodities.add(id)

    byType.Commodities.push({
      url: `https://standards.org.ai/UNSPSC/Commodities/${id}`,
      ns: 'standards.org.ai',
      type: 'Commodity',
      id,
      code,
      name: row.name || '',
      description: row.description || '',
      classCode: row.classCode || '',
      digital: row.digital || '',
    })
  }

  // Write each type file
  for (const [type, entities] of Object.entries(byType)) {
    if (entities.length > 0) {
      writeTSV(path.join(SOURCE_DIR, 'UNSPSC', `${type}.tsv`), entities)
    }
  }

  // Ingest relationships
  const relFile = path.join(ROOT_DATA_DIR, 'Products.Relationships.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)
    const relationships = relData.map(row => ({
      from: row.from?.startsWith('https://') ? row.from : `https://${row.from}`,
      to: row.to?.startsWith('https://') ? row.to : `https://${row.to}`,
      predicate: row.predicate || '',
      reverse: row.reverse || '',
    }))
    writeTSV(path.join(SOURCE_DIR, 'UNSPSC', 'relationships', 'Hierarchy.tsv'), relationships)
  }
}

// ============================================================================
// NAPCS Hierarchy
// ============================================================================

function getNAPCSType(code: string): string {
  const cleanCode = code.replace(/[^0-9]/g, '')
  if (cleanCode.length <= 3) return 'Sections'
  if (cleanCode.length === 4) return 'Subsections'
  if (cleanCode.length === 5) return 'Groups'
  if (cleanCode.length === 6) return 'Classes'
  return 'Subclasses'
}

function ingestNAPCS(): void {
  console.log('\n🛎️ Ingesting NAPCS...')

  const sourceFile = path.join(ROOT_DATA_DIR, 'Services.tsv')
  const data = parseTSV(sourceFile)

  // Group by hierarchy type
  const byType: Record<string, Record<string, string>[]> = {
    Sections: [],
    Subsections: [],
    Groups: [],
    Classes: [],
    Subclasses: [],
  }

  const seenByType: Record<string, Set<string>> = {
    Sections: new Set(),
    Subsections: new Set(),
    Groups: new Set(),
    Classes: new Set(),
    Subclasses: new Set(),
  }

  for (const row of data) {
    const code = row.code || row.napcs || ''
    const type = getNAPCSType(code)
    const id = row.id || ''

    // Skip duplicates within type
    if (seenByType[type].has(id)) continue
    seenByType[type].add(id)

    byType[type].push({
      url: `https://standards.org.ai/NAPCS/${type}/${id}`,
      ns: 'standards.org.ai',
      type: type.replace(/s$/, ''),
      id,
      code,
      name: row.name || '',
      description: row.description || '',
      digital: row.digital || '',
    })
  }

  // Write each type file
  for (const [type, entities] of Object.entries(byType)) {
    if (entities.length > 0) {
      writeTSV(path.join(SOURCE_DIR, 'NAPCS', `${type}.tsv`), entities)
    }
  }

  // Ingest relationships
  const relFile = path.join(ROOT_DATA_DIR, 'Services.Relationships.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)
    const relationships = relData.map(row => ({
      from: row.from?.startsWith('https://') ? row.from : `https://${row.from}`,
      to: row.to?.startsWith('https://') ? row.to : `https://${row.to}`,
      predicate: row.predicate || '',
      reverse: row.reverse || '',
    }))
    writeTSV(path.join(SOURCE_DIR, 'NAPCS', 'relationships', 'Hierarchy.tsv'), relationships)
  }
}

// ============================================================================
// ONET (flat hierarchy - already properly typed)
// ============================================================================

const ONET_MAPPINGS: Record<string, string> = {
  'Occupations.tsv': 'Occupations',
  'Skills.tsv': 'Skills',
  'Knowledge.tsv': 'Knowledge',
  'Abilities.tsv': 'Abilities',
  'Tasks.tsv': 'Tasks',
  'Activities.tsv': 'WorkActivities',
}

function ingestONET(): void {
  console.log('\n👷 Ingesting ONET...')

  for (const [filename, type] of Object.entries(ONET_MAPPINGS)) {
    const sourceFile = path.join(ROOT_DATA_DIR, filename)
    if (!fs.existsSync(sourceFile)) continue

    const data = parseTSV(sourceFile)
    const seen = new Set<string>()

    const entities = data
      .filter(row => {
        const id = row.id || ''
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
      .map(row => {
        const id = row.id || ''
        const result: Record<string, string> = {
          url: `https://standards.org.ai/ONET/${type}/${id}`,
          canonical: `https://onet.org.ai/${type}/${id}`,
          ns: 'standards.org.ai',
          type: type.replace(/s$/, ''),
          id,
          code: row.code || '',
          name: row.name || '',
          description: row.description || '',
        }

        // Preserve additional columns
        for (const [key, value] of Object.entries(row)) {
          if (!result[key] && value) {
            result[key] = value
          }
        }

        return result
      })

    writeTSV(path.join(SOURCE_DIR, 'ONET', `${type}.tsv`), entities)
  }

  // Ingest relationships
  const relFile = path.join(ROOT_DATA_DIR, 'Occupations.Relationships.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)

    // Group relationships by predicate type
    const byPredicate: Record<string, Record<string, string>[]> = {}

    for (const row of relData) {
      const predicate = row.predicate || 'related'
      if (!byPredicate[predicate]) {
        byPredicate[predicate] = []
      }
      byPredicate[predicate].push({
        from: row.from?.startsWith('https://') ? row.from : `https://${row.from}`,
        to: row.to?.startsWith('https://') ? row.to : `https://${row.to}`,
        predicate: row.predicate || '',
        reverse: row.reverse || '',
        level: row.level || '',
        importance: row.importance || '',
      })
    }

    // Write separate relationship files by type
    const relDir = path.join(SOURCE_DIR, 'ONET', 'relationships')
    ensureDir(relDir)

    // Group by to-type for cleaner organization
    const occupationRels = relData.filter(r =>
      r.from?.includes('Occupation') || r.to?.includes('Occupation')
    ).map(row => ({
      from: row.from?.startsWith('https://') ? row.from : `https://${row.from}`,
      to: row.to?.startsWith('https://') ? row.to : `https://${row.to}`,
      predicate: row.predicate || '',
      reverse: row.reverse || '',
      level: row.level || '',
      importance: row.importance || '',
    }))

    if (occupationRels.length > 0) {
      writeTSV(path.join(relDir, 'Occupations.tsv'), occupationRels)
    }
  }
}

// ============================================================================
// Verbs
// ============================================================================

function ingestVerbs(): void {
  console.log('\n📝 Ingesting Verbs...')

  const sourceFile = path.join(ROOT_DATA_DIR, 'Verbs.tsv')
  if (!fs.existsSync(sourceFile)) return

  const data = parseTSV(sourceFile)
  const seen = new Set<string>()

  const entities = data
    .filter(row => {
      const id = row.id || row.verb || ''
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map(row => {
      const id = row.id || row.verb || ''
      return {
        url: `https://verbs.org.ai/${id}`,
        ns: 'verbs.org.ai',
        type: 'Verb',
        id,
        verb: row.verb || id,
        tense3s: row.tense3s || '',
        pastTense: row.pastTense || '',
        gerund: row.gerund || '',
        noun: row.noun || '',
        inverse: row.inverse || '',
      }
    })

  writeTSV(path.join(SOURCE_DIR, 'Verbs.tsv'), entities)
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('📦 Source Data Ingestion')
  console.log('========================')
  console.log(`Source: ${ROOT_DATA_DIR}`)
  console.log(`Output: ${SOURCE_DIR}`)

  // Ensure source directories exist
  for (const dir of ['ONET', 'NAICS', 'APQC', 'UNSPSC', 'NAPCS', 'GS1']) {
    ensureDir(path.join(SOURCE_DIR, dir))
    ensureDir(path.join(SOURCE_DIR, dir, 'relationships'))
  }

  ingestNAICS()
  ingestAPQC()
  ingestUNSPSC()
  ingestNAPCS()
  ingestONET()
  ingestVerbs()

  console.log('\n✨ Source ingestion complete!')
}

main().catch(console.error)
