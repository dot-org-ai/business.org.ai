#!/usr/bin/env tsx

/**
 * Analyze Concepts for Parsing Issues
 *
 * This script scans the generated Concepts TSV file and identifies
 * concepts that indicate parsing problems:
 * - Concepts containing "And" or "Or" (sign of unexpanded conjunctions)
 * - Concepts starting with prepositions (To, For, With, etc.)
 * - Concepts containing verbs (sign of unexpanded infinitives)
 * - Very long concepts (sign of unparsed complex phrases)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONCEPTS_FILE = path.resolve(__dirname, '../.data/Concepts.tsv')

// Common verbs that shouldn't be in concept names
const VERBS = new Set([
  'review', 'approve', 'manage', 'develop', 'create', 'ensure', 'establish',
  'implement', 'maintain', 'monitor', 'analyze', 'assess', 'build', 'conduct',
  'coordinate', 'define', 'deliver', 'design', 'determine', 'direct', 'evaluate',
  'execute', 'identify', 'improve', 'integrate', 'lead', 'optimize', 'perform',
  'plan', 'prepare', 'provide', 'report', 'resolve', 'support', 'track', 'update',
  'align', 'allocate', 'communicate', 'configure', 'control', 'document', 'enforce',
  'facilitate', 'generate', 'govern', 'guide', 'handle', 'initiate', 'inspect',
  'install', 'investigate', 'measure', 'negotiate', 'obtain', 'organize', 'oversee',
  'process', 'produce', 'promote', 'protect', 'recommend', 'record', 'reduce',
  'refine', 'register', 'regulate', 'remediate', 'remove', 'repair', 'replace',
  'request', 'research', 'respond', 'restore', 'retrieve', 'revise', 'schedule',
  'secure', 'select', 'set', 'share', 'specify', 'standardize', 'store', 'submit',
  'supervise', 'test', 'train', 'transfer', 'transform', 'validate', 'verify',
])

// Prepositions that shouldn't start concept names
const PREPOSITIONS = ['To', 'For', 'With', 'From', 'In', 'On', 'At', 'By', 'Of', 'Through', 'Into', 'Within']

// Conjunctions that indicate failed expansion
const CONJUNCTIONS = ['And', 'Or']

// Articles and determiners
const ARTICLES = ['The', 'A', 'An', 'This', 'That', 'These', 'Those', 'All', 'Any', 'Both', 'Each', 'Every', 'Some', 'No', 'None']

interface Issue {
  id: string
  name: string
  issue: string
  severity: 'high' | 'medium' | 'low'
}

function parseTSV(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
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
    return row
  })
}

function analyzeConcepts(): void {
  console.log('🔍 Analyzing Concepts for Parsing Issues...\n')

  const concepts = parseTSV(CONCEPTS_FILE)
  console.log(`Total concepts: ${concepts.length}\n`)

  const issues: Issue[] = []

  for (const concept of concepts) {
    const id = concept.id || ''
    const name = concept.name || ''

    // Check for conjunctions in the middle (high severity - failed expansion)
    const conjMatch = id.match(/[a-z](And|Or)[A-Z]/)
    if (conjMatch) {
      issues.push({
        id,
        name,
        issue: `Contains "${conjMatch[1]}" conjunction (failed expansion)`,
        severity: 'high',
      })
      continue // Only report most severe issue per concept
    }

    // Check for prepositions at the start (high severity)
    for (const prep of PREPOSITIONS) {
      if (id.startsWith(prep) && id.length > prep.length && /[A-Z]/.test(id[prep.length])) {
        issues.push({
          id,
          name,
          issue: `Starts with preposition "${prep}"`,
          severity: 'high',
        })
        break
      }
    }
    if (issues.length > 0 && issues[issues.length - 1].id === id) continue

    // Check for articles at the start (medium severity)
    for (const article of ARTICLES) {
      if (id.startsWith(article) && id.length > article.length && /[A-Z]/.test(id[article.length])) {
        issues.push({
          id,
          name,
          issue: `Starts with article/determiner "${article}"`,
          severity: 'medium',
        })
        break
      }
    }
    if (issues.length > 0 && issues[issues.length - 1].id === id) continue

    // Check for verbs in PascalCase (medium severity - likely infinitive phrase)
    // Look for patterns like "IdentifyDevelopmentOpportunities" where first word is a verb
    const firstWordMatch = id.match(/^([A-Z][a-z]+)/)
    if (firstWordMatch) {
      const firstWord = firstWordMatch[1].toLowerCase()
      if (VERBS.has(firstWord)) {
        issues.push({
          id,
          name,
          issue: `Starts with verb "${firstWordMatch[1]}" (likely infinitive phrase)`,
          severity: 'medium',
        })
        continue
      }
    }

    // Check for very long concept IDs (low severity - might be valid but suspicious)
    if (id.length > 50) {
      issues.push({
        id,
        name,
        issue: `Very long ID (${id.length} chars)`,
        severity: 'low',
      })
    }
  }

  // Group by severity
  const highIssues = issues.filter(i => i.severity === 'high')
  const mediumIssues = issues.filter(i => i.severity === 'medium')
  const lowIssues = issues.filter(i => i.severity === 'low')

  console.log('=' .repeat(80))
  console.log(`🔴 HIGH SEVERITY ISSUES (${highIssues.length})`)
  console.log('=' .repeat(80))
  for (const issue of highIssues.slice(0, 50)) {
    console.log(`  ${issue.id}`)
    console.log(`    Name: ${issue.name}`)
    console.log(`    Issue: ${issue.issue}`)
    console.log('')
  }
  if (highIssues.length > 50) {
    console.log(`  ... and ${highIssues.length - 50} more\n`)
  }

  console.log('=' .repeat(80))
  console.log(`🟡 MEDIUM SEVERITY ISSUES (${mediumIssues.length})`)
  console.log('=' .repeat(80))
  for (const issue of mediumIssues.slice(0, 30)) {
    console.log(`  ${issue.id}`)
    console.log(`    Name: ${issue.name}`)
    console.log(`    Issue: ${issue.issue}`)
    console.log('')
  }
  if (mediumIssues.length > 30) {
    console.log(`  ... and ${mediumIssues.length - 30} more\n`)
  }

  console.log('=' .repeat(80))
  console.log(`🟢 LOW SEVERITY ISSUES (${lowIssues.length})`)
  console.log('=' .repeat(80))
  for (const issue of lowIssues.slice(0, 20)) {
    console.log(`  ${issue.id}`)
    console.log(`    Name: ${issue.name}`)
    console.log(`    Issue: ${issue.issue}`)
    console.log('')
  }
  if (lowIssues.length > 20) {
    console.log(`  ... and ${lowIssues.length - 20} more\n`)
  }

  // Summary
  console.log('=' .repeat(80))
  console.log('📊 SUMMARY')
  console.log('=' .repeat(80))
  console.log(`  Total concepts: ${concepts.length}`)
  console.log(`  High severity issues: ${highIssues.length}`)
  console.log(`  Medium severity issues: ${mediumIssues.length}`)
  console.log(`  Low severity issues: ${lowIssues.length}`)
  console.log(`  Clean concepts: ${concepts.length - issues.length}`)
  console.log(`  Issue rate: ${((issues.length / concepts.length) * 100).toFixed(1)}%`)

  // Output unique patterns for investigation
  console.log('\n')
  console.log('=' .repeat(80))
  console.log('🔎 UNIQUE PATTERNS TO FIX')
  console.log('=' .repeat(80))

  // Group conjunction issues
  const andIssues = highIssues.filter(i => i.issue.includes('"And"'))
  const orIssues = highIssues.filter(i => i.issue.includes('"Or"'))

  console.log(`\n  Concepts with "And" in middle: ${andIssues.length}`)
  for (const issue of andIssues.slice(0, 10)) {
    console.log(`    - ${issue.id}`)
  }

  console.log(`\n  Concepts with "Or" in middle: ${orIssues.length}`)
  for (const issue of orIssues.slice(0, 10)) {
    console.log(`    - ${issue.id}`)
  }

  // Group preposition issues
  const prepIssues: Record<string, Issue[]> = {}
  for (const issue of highIssues.filter(i => i.issue.startsWith('Starts with preposition'))) {
    const prepMatch = issue.issue.match(/"(\w+)"/)
    if (prepMatch) {
      const prep = prepMatch[1]
      if (!prepIssues[prep]) prepIssues[prep] = []
      prepIssues[prep].push(issue)
    }
  }

  console.log('\n  Preposition prefix counts:')
  for (const [prep, pIssues] of Object.entries(prepIssues).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`    "${prep}": ${pIssues.length} concepts`)
  }

  // Group verb issues
  const verbCounts: Record<string, number> = {}
  for (const issue of mediumIssues.filter(i => i.issue.includes('Starts with verb'))) {
    const verbMatch = issue.issue.match(/"(\w+)"/)
    if (verbMatch) {
      const verb = verbMatch[1]
      verbCounts[verb] = (verbCounts[verb] || 0) + 1
    }
  }

  console.log('\n  Top verb-starting concepts:')
  for (const [verb, count] of Object.entries(verbCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    "${verb}": ${count} concepts`)
  }
}

analyzeConcepts()
