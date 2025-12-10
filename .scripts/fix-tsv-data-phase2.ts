/**
 * Phase 2: Clean up remaining IncludingF references across all files
 * and other remaining garbage data patterns
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', '.data')

// Patterns to clean from IDs and references
const GARBAGE_PATTERNS = [
  /\.for\.IncludingF/g,
  /\.to\.IncludingF/g,
  /prepare\.Budgets\.for\.IncludingF/g,
  /operate\.TelephoneSwitchboards\.to\.IncludingF/g,
  /operate\.Systems\.to\.IncludingF/g,
]

function readTSV(filePath: string): { headers: string[], rows: string[][] } {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split('\t')
  const rows = lines.slice(1).map(line => line.split('\t'))
  return { headers, rows }
}

function writeTSV(filePath: string, headers: string[], rows: string[][]): void {
  const content = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n')
  fs.writeFileSync(filePath, content + '\n')
}

function containsGarbage(text: string): boolean {
  return GARBAGE_PATTERNS.some(pattern => pattern.test(text))
}

function cleanGarbageFromField(text: string): string {
  if (!text) return text

  // Remove garbage task references from comma-separated lists
  if (text.includes(',')) {
    const parts = text.split(',')
    const cleanParts = parts.filter(part => !containsGarbage(part))
    return cleanParts.join(',')
  }

  return text
}

function removeRowsWithGarbageId(filePath: string, idColumn: string): number {
  const { headers, rows } = readTSV(filePath)
  const idIdx = headers.indexOf(idColumn)
  if (idIdx === -1) return 0

  const originalCount = rows.length
  const newRows = rows.filter(row => {
    const id = row[idIdx] || ''
    return !containsGarbage(id)
  })

  if (newRows.length < originalCount) {
    writeTSV(filePath, headers, newRows)
  }

  return originalCount - newRows.length
}

function cleanSourceTasksColumn(filePath: string): number {
  const { headers, rows } = readTSV(filePath)
  const sourceTasksIdx = headers.indexOf('sourceTasks')
  if (sourceTasksIdx === -1) return 0

  let cleaned = 0
  for (const row of rows) {
    const original = row[sourceTasksIdx]
    const cleaned_value = cleanGarbageFromField(original)
    if (cleaned_value !== original) {
      row[sourceTasksIdx] = cleaned_value
      cleaned++
    }
  }

  if (cleaned > 0) {
    writeTSV(filePath, headers, rows)
  }

  return cleaned
}

function cleanRelationshipFile(filePath: string, fromCol: string, toCol: string): number {
  const { headers, rows } = readTSV(filePath)
  const fromIdx = headers.indexOf(fromCol)
  const toIdx = headers.indexOf(toCol)

  const originalCount = rows.length
  const newRows = rows.filter(row => {
    const from = row[fromIdx] || ''
    const to = row[toIdx] || ''
    return !containsGarbage(from) && !containsGarbage(to)
  })

  if (newRows.length < originalCount) {
    writeTSV(filePath, headers, newRows)
  }

  return originalCount - newRows.length
}

async function main() {
  console.log('=== TSV Data Quality Fix Script - Phase 2 ===\n')

  // Clean main entity files
  console.log('Cleaning Tasks.tsv...')
  let removed = removeRowsWithGarbageId(path.join(DATA_DIR, 'Tasks.tsv'), 'id')
  console.log(`  Removed ${removed} garbage rows`)

  console.log('Cleaning Actions.tsv...')
  removed = removeRowsWithGarbageId(path.join(DATA_DIR, 'Actions.tsv'), 'id')
  console.log(`  Removed ${removed} garbage rows`)

  console.log('Cleaning Events.tsv...')
  removed = removeRowsWithGarbageId(path.join(DATA_DIR, 'Events.tsv'), 'sourceActionId')
  console.log(`  Removed ${removed} garbage rows`)

  console.log('Cleaning OccupationTasks.tsv...')
  removed = removeRowsWithGarbageId(path.join(DATA_DIR, 'OccupationTasks.tsv'), 'taskId')
  console.log(`  Removed ${removed} garbage rows`)

  // Clean sourceTasks column in Concepts.tsv
  console.log('Cleaning sourceTasks in Concepts.tsv...')
  let cleaned = cleanSourceTasksColumn(path.join(DATA_DIR, 'Concepts.tsv'))
  console.log(`  Cleaned ${cleaned} sourceTasks fields`)

  // Clean relationship files
  console.log('\nCleaning relationship files...')

  console.log('Cleaning Tasks.Actions.tsv...')
  removed = cleanRelationshipFile(
    path.join(DATA_DIR, 'relationships', 'Tasks.Actions.tsv'),
    'from', 'to'
  )
  console.log(`  Removed ${removed} garbage relationships`)

  console.log('Cleaning Actions.Events.tsv...')
  removed = cleanRelationshipFile(
    path.join(DATA_DIR, 'relationships', 'Actions.Events.tsv'),
    'from', 'to'
  )
  console.log(`  Removed ${removed} garbage relationships`)

  console.log('Cleaning Tasks.Concepts.tsv...')
  removed = cleanRelationshipFile(
    path.join(DATA_DIR, 'relationships', 'Tasks.Concepts.tsv'),
    'from', 'to'
  )
  console.log(`  Removed ${removed} garbage relationships`)

  console.log('Cleaning Occupations.Tasks.tsv...')
  removed = cleanRelationshipFile(
    path.join(DATA_DIR, 'relationships', 'Occupations.Tasks.tsv'),
    'from', 'to'
  )
  console.log(`  Removed ${removed} garbage relationships`)

  console.log('\n=== Phase 2 fixes complete ===')
}

main().catch(console.error)
