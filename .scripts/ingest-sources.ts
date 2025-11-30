#!/usr/bin/env tsx

/**
 * Source Data Ingestion Script
 *
 * Transforms data from root .data/ folder into standardized .source/ format
 *
 * URL Pattern:
 *   url: standards.org.ai/[Source]/[Type]/[Name]
 *   canonical: [source].org.ai/[Type]/[Name] (only for sources we own)
 *
 * Sources we own (have canonical domains):
 *   - ONET -> onet.org.ai
 *   - NAICS -> naics.org.ai
 *   - GS1 -> gs1.org.ai
 *   - APQC -> apqc.org.ai
 *
 * Sources we don't own (stay on standards.org.ai):
 *   - UNSPSC
 *   - NAPCS
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

// Mapping of root data files to source standards
const SOURCE_MAPPINGS: Record<string, { source: string; type: string }> = {
  // ONET sources
  'Occupations.tsv': { source: 'ONET', type: 'Occupations' },
  'Skills.tsv': { source: 'ONET', type: 'Skills' },
  'Knowledge.tsv': { source: 'ONET', type: 'Knowledge' },
  'Abilities.tsv': { source: 'ONET', type: 'Abilities' },
  'Tasks.tsv': { source: 'ONET', type: 'Tasks' },
  'Activities.tsv': { source: 'ONET', type: 'WorkActivities' },

  // NAICS sources
  'Industries.tsv': { source: 'NAICS', type: 'Industries' },

  // APQC sources
  'Processes.tsv': { source: 'APQC', type: 'Processes' },

  // UNSPSC sources (no canonical - stays on standards.org.ai)
  'Products.tsv': { source: 'UNSPSC', type: 'Products' },

  // NAPCS sources (no canonical - stays on standards.org.ai)
  'Services.tsv': { source: 'NAPCS', type: 'Services' },
}

// Relationship mappings
const RELATIONSHIP_MAPPINGS: Record<string, { source: string; fromType: string; toType: string }> = {
  'Industries.Relationships.tsv': { source: 'NAICS', fromType: 'Industries', toType: 'Industries' },
  'Occupations.Relationships.tsv': { source: 'ONET', fromType: 'Occupations', toType: 'Mixed' },
  'Processes.Relationships.tsv': { source: 'APQC', fromType: 'Processes', toType: 'Processes' },
  'Products.Relationships.tsv': { source: 'UNSPSC', fromType: 'Products', toType: 'Products' },
  'Services.Relationships.tsv': { source: 'NAPCS', fromType: 'Services', toType: 'Services' },
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

/**
 * Transform entity to standardized source format
 */
function transformToSourceFormat(
  row: Record<string, string>,
  source: string,
  type: string
): Record<string, string> {
  const id = row.id || ''
  const canonicalDomain = CANONICAL_DOMAINS[source]

  const result: Record<string, string> = {
    url: `standards.org.ai/${source}/${type}/${id}`,
    ns: 'standards.org.ai',
    type: type.replace(/s$/, ''), // Singular type
    id,
    code: row.code || '',
    name: row.name || '',
    description: row.description || '',
  }

  // Add canonical only for sources we own
  if (canonicalDomain) {
    result.canonical = `${canonicalDomain}/${type}/${id}`
  }

  // Preserve additional columns
  for (const [key, value] of Object.entries(row)) {
    if (!result[key] && value) {
      result[key] = value
    }
  }

  return result
}

// ============================================================================
// Ingestion Functions
// ============================================================================

function ingestEntities(): void {
  console.log('\n📥 Ingesting entity sources...')

  for (const [filename, mapping] of Object.entries(SOURCE_MAPPINGS)) {
    const sourceFile = path.join(ROOT_DATA_DIR, filename)
    if (!fs.existsSync(sourceFile)) {
      console.warn(`  ⚠️  Skipping ${filename} (not found)`)
      continue
    }

    const sourceData = parseTSV(sourceFile)
    const transformed = sourceData.map(row =>
      transformToSourceFormat(row, mapping.source, mapping.type)
    )

    // Dedupe by ID
    const seen = new Set<string>()
    const deduped = transformed.filter(e => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })

    const outputFile = path.join(SOURCE_DIR, mapping.source, `${mapping.type}.tsv`)
    writeTSV(outputFile, deduped)
  }
}

function ingestRelationships(): void {
  console.log('\n🔗 Ingesting relationship sources...')

  for (const [filename, mapping] of Object.entries(RELATIONSHIP_MAPPINGS)) {
    const sourceFile = path.join(ROOT_DATA_DIR, filename)
    if (!fs.existsSync(sourceFile)) {
      console.warn(`  ⚠️  Skipping ${filename} (not found)`)
      continue
    }

    const sourceData = parseTSV(sourceFile)

    // Transform relationships with standards.org.ai namespace
    const transformed = sourceData.map(row => ({
      ns: 'standards.org.ai',
      from: row.from || '',
      to: row.to || '',
      predicate: row.predicate || '',
      reverse: row.reverse || '',
    }))

    const outputFile = path.join(
      SOURCE_DIR,
      mapping.source,
      `${mapping.fromType}.Relationships.tsv`
    )
    writeTSV(outputFile, transformed)
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('📦 Source Data Ingestion')
  console.log('========================')

  // Ensure source directories exist
  for (const source of Object.keys(CANONICAL_DOMAINS)) {
    const dir = path.join(SOURCE_DIR, source)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
  // Also create dirs for sources without canonical
  for (const dir of ['UNSPSC', 'NAPCS']) {
    const fullDir = path.join(SOURCE_DIR, dir)
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true })
    }
  }

  ingestEntities()
  ingestRelationships()

  console.log('\n✨ Source ingestion complete!')
}

main().catch(console.error)
