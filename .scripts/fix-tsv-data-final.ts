/**
 * Final comprehensive fix script for all remaining TSV data issues
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', '.data')

// Verb grammatical fixes
const VERB_FIXES: Record<string, string> = {
  'confered': 'conferred',
  'refered': 'referred',
  'occured': 'occurred',
  'transfered': 'transferred',
  'prefered': 'preferred',
}

// Garbage ID patterns to filter out
const GARBAGE_ID_PATTERNS = [
  /\.for\.IncludingF$/,
  /\.to\.IncludingF$/,
  /\.for\.IncludingF\b/,
  /\.to\.IncludingF\b/,
  /prepare\.Budgets\.for\.IncludingF/,
  /operate\.TelephoneSwitchboards\.to\.IncludingF/,
  /operate\.Systems\.to\.IncludingF/,
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

function isGarbageId(id: string): boolean {
  return GARBAGE_ID_PATTERNS.some(pattern => pattern.test(id))
}

function fixGrammarInText(text: string): string {
  if (!text) return text
  let result = text
  for (const [wrong, correct] of Object.entries(VERB_FIXES)) {
    // Fix as whole word or at word boundary
    result = result.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), correct)
  }
  return result
}

function removeHttpsPrefix(url: string): string {
  if (!url) return url
  return url.replace(/^https:\/\//, '')
}

function cleanSourceTasks(sourceTasks: string): string {
  if (!sourceTasks) return sourceTasks
  const tasks = sourceTasks.split(',')
  const cleanTasks = tasks.filter(task => !isGarbageId(task.trim()))
  return cleanTasks.join(',')
}

// Fix Events.tsv - grammar in all text fields
function fixEventsFile(): number {
  console.log('Fixing Events.tsv grammar...')
  const filePath = path.join(DATA_DIR, 'Events.tsv')
  const { headers, rows } = readTSV(filePath)

  let fixed = 0
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const original = row[i]
      const fixed_val = fixGrammarInText(original)
      if (fixed_val !== original) {
        row[i] = fixed_val
        fixed++
      }
    }
  }

  writeTSV(filePath, headers, rows)
  return fixed
}

// Fix Actions.Events.tsv - grammar and URL prefixes
function fixActionsEventsFile(): { grammar: number, urls: number, garbage: number } {
  console.log('Fixing Actions.Events.tsv...')
  const filePath = path.join(DATA_DIR, 'relationships', 'Actions.Events.tsv')
  const { headers, rows } = readTSV(filePath)

  const fromIdx = headers.indexOf('from')
  const toIdx = headers.indexOf('to')

  let grammarFixed = 0
  let urlsFixed = 0

  // First pass: fix grammar and URLs
  for (const row of rows) {
    // Fix URLs
    if (row[fromIdx]?.startsWith('https://')) {
      row[fromIdx] = removeHttpsPrefix(row[fromIdx])
      urlsFixed++
    }
    if (row[toIdx]?.startsWith('https://')) {
      row[toIdx] = removeHttpsPrefix(row[toIdx])
      urlsFixed++
    }

    // Fix grammar in all fields
    for (let i = 0; i < row.length; i++) {
      const original = row[i]
      const fixed = fixGrammarInText(original)
      if (fixed !== original) {
        row[i] = fixed
        grammarFixed++
      }
    }
  }

  // Second pass: remove garbage rows
  const originalCount = rows.length
  const cleanRows = rows.filter(row => {
    const from = row[fromIdx] || ''
    const to = row[toIdx] || ''
    return !isGarbageId(from) && !isGarbageId(to)
  })

  writeTSV(filePath, headers, cleanRows)
  return { grammar: grammarFixed, urls: urlsFixed, garbage: originalCount - cleanRows.length }
}

// Fix Tasks.Actions.tsv - URLs and garbage
function fixTasksActionsFile(): { urls: number, garbage: number } {
  console.log('Fixing Tasks.Actions.tsv...')
  const filePath = path.join(DATA_DIR, 'relationships', 'Tasks.Actions.tsv')
  const { headers, rows } = readTSV(filePath)

  const fromIdx = headers.indexOf('from')
  const toIdx = headers.indexOf('to')

  let urlsFixed = 0

  for (const row of rows) {
    if (row[fromIdx]?.startsWith('https://')) {
      row[fromIdx] = removeHttpsPrefix(row[fromIdx])
      urlsFixed++
    }
    if (row[toIdx]?.startsWith('https://')) {
      row[toIdx] = removeHttpsPrefix(row[toIdx])
      urlsFixed++
    }
  }

  const originalCount = rows.length
  const cleanRows = rows.filter(row => {
    const from = row[fromIdx] || ''
    const to = row[toIdx] || ''
    return !isGarbageId(from) && !isGarbageId(to)
  })

  writeTSV(filePath, headers, cleanRows)
  return { urls: urlsFixed, garbage: originalCount - cleanRows.length }
}

// Fix Tasks.tsv - remove garbage rows
function fixTasksFile(): number {
  console.log('Fixing Tasks.tsv...')
  const filePath = path.join(DATA_DIR, 'Tasks.tsv')
  const { headers, rows } = readTSV(filePath)

  const idIdx = headers.indexOf('id')
  const originalCount = rows.length
  const cleanRows = rows.filter(row => !isGarbageId(row[idIdx] || ''))

  writeTSV(filePath, headers, cleanRows)
  return originalCount - cleanRows.length
}

// Fix Actions.tsv - remove garbage rows
function fixActionsFile(): number {
  console.log('Fixing Actions.tsv...')
  const filePath = path.join(DATA_DIR, 'Actions.tsv')
  const { headers, rows } = readTSV(filePath)

  const idIdx = headers.indexOf('id')
  const originalCount = rows.length
  const cleanRows = rows.filter(row => !isGarbageId(row[idIdx] || ''))

  writeTSV(filePath, headers, cleanRows)
  return originalCount - cleanRows.length
}

// Fix OccupationTasks.tsv - remove garbage rows
function fixOccupationTasksFile(): number {
  console.log('Fixing OccupationTasks.tsv...')
  const filePath = path.join(DATA_DIR, 'OccupationTasks.tsv')
  const { headers, rows } = readTSV(filePath)

  const taskIdIdx = headers.indexOf('taskId')
  const idIdx = headers.indexOf('id')

  const originalCount = rows.length
  const cleanRows = rows.filter(row => {
    const taskId = row[taskIdIdx] || ''
    const id = row[idIdx] || ''
    return !isGarbageId(taskId) && !isGarbageId(id)
  })

  writeTSV(filePath, headers, cleanRows)
  return originalCount - cleanRows.length
}

// Fix Concepts.tsv sourceTasks column
function fixConceptsFile(): number {
  console.log('Fixing Concepts.tsv sourceTasks...')
  const filePath = path.join(DATA_DIR, 'Concepts.tsv')
  const { headers, rows } = readTSV(filePath)

  const sourceTasksIdx = headers.indexOf('sourceTasks')
  let fixed = 0

  for (const row of rows) {
    const original = row[sourceTasksIdx]
    const cleaned = cleanSourceTasks(original)
    if (cleaned !== original) {
      row[sourceTasksIdx] = cleaned
      fixed++
    }
  }

  writeTSV(filePath, headers, rows)
  return fixed
}

// Fix Tasks.Concepts.tsv
function fixTasksConceptsFile(): number {
  console.log('Fixing Tasks.Concepts.tsv...')
  const filePath = path.join(DATA_DIR, 'relationships', 'Tasks.Concepts.tsv')
  const { headers, rows } = readTSV(filePath)

  const fromIdx = headers.indexOf('from')
  const originalCount = rows.length
  const cleanRows = rows.filter(row => !isGarbageId(row[fromIdx] || ''))

  writeTSV(filePath, headers, cleanRows)
  return originalCount - cleanRows.length
}

// Fix Occupations.Tasks.tsv
function fixOccupationsTasksFile(): number {
  console.log('Fixing Occupations.Tasks.tsv...')
  const filePath = path.join(DATA_DIR, 'relationships', 'Occupations.Tasks.tsv')
  const { headers, rows } = readTSV(filePath)

  const toIdx = headers.indexOf('to')
  const originalCount = rows.length
  const cleanRows = rows.filter(row => !isGarbageId(row[toIdx] || ''))

  writeTSV(filePath, headers, cleanRows)
  return originalCount - cleanRows.length
}

async function main() {
  console.log('=== Final TSV Data Quality Fix Script ===\n')

  // Fix grammar issues
  const eventsGrammar = fixEventsFile()
  console.log(`  Fixed ${eventsGrammar} grammar issues in Events.tsv`)

  const actionsEventsResult = fixActionsEventsFile()
  console.log(`  Fixed ${actionsEventsResult.grammar} grammar, ${actionsEventsResult.urls} URLs, removed ${actionsEventsResult.garbage} garbage in Actions.Events.tsv`)

  // Fix URL issues
  const tasksActionsResult = fixTasksActionsFile()
  console.log(`  Fixed ${tasksActionsResult.urls} URLs, removed ${tasksActionsResult.garbage} garbage in Tasks.Actions.tsv`)

  // Fix garbage in entity files
  let tasksRemoved = fixTasksFile()
  console.log(`  Removed ${tasksRemoved} garbage rows from Tasks.tsv`)

  let actionsRemoved = fixActionsFile()
  console.log(`  Removed ${actionsRemoved} garbage rows from Actions.tsv`)

  let occTasksRemoved = fixOccupationTasksFile()
  console.log(`  Removed ${occTasksRemoved} garbage rows from OccupationTasks.tsv`)

  let conceptsFixed = fixConceptsFile()
  console.log(`  Fixed ${conceptsFixed} sourceTasks in Concepts.tsv`)

  // Fix garbage in relationship files
  let tasksConceptsRemoved = fixTasksConceptsFile()
  console.log(`  Removed ${tasksConceptsRemoved} garbage rows from Tasks.Concepts.tsv`)

  let occTasksRelRemoved = fixOccupationsTasksFile()
  console.log(`  Removed ${occTasksRelRemoved} garbage rows from Occupations.Tasks.tsv`)

  console.log('\n=== All fixes complete ===')
}

main().catch(console.error)
