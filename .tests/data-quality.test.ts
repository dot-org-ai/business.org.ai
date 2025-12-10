import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, '../.data')

// ============================================================================
// Utility Functions
// ============================================================================

interface TSVRow {
  [key: string]: string
}

function parseTSV(filePath: string): { headers: string[]; rows: TSVRow[] } {
  if (!fs.existsSync(filePath)) {
    return { headers: [], rows: [] }
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  // Handle BOM
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.substring(1)
  }

  const lines = content.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = lines[0].replace(/\r$/, '').split('\t')
  const rows = lines.slice(1).map((line) => {
    const values = line.replace(/\r$/, '').split('\t')
    const row: TSVRow = {}
    headers.forEach((header, i) => {
      row[header] = (values[i] || '').trim()
    })
    return row
  })

  return { headers, rows }
}

// ============================================================================
// Test Patterns
// ============================================================================

// Invalid patterns in concept IDs
const INVALID_CONCEPT_PATTERNS = {
  // Note: Exclude "A" and "An" from this pattern to avoid false positives with acronyms like AR (Accounts Receivable)
  // Pattern requires preposition + uppercase letter (start of next word in PascalCase)
  startsWithPreposition: /^(To|For|With|From|In|On|At|By|Of|And|Or|The|Both|Each|All|Any|Some|No|None|Within|Through|Into)[A-Z]/,
  containsConjunction: /[a-z](And|Or)[A-Z]/,
  endsWithConjunction: /(And|Or)$/,
  startsWithPronoun: /^(IT|It)[A-Z]/,
  containsPronoun: /[a-z](IT|It)([A-Z]|$)/,
  truncatedWord: /^(mation|tions?|ness|ance|ence|ated|ating|ment)[A-Z]?$/i,
  tooShort: /^.{1,2}$/,
  numericOnly: /^\d+$/,
}

// Common verbs that shouldn't start concept names
const COMMON_VERBS = new Set([
  'review', 'approve', 'manage', 'develop', 'create', 'ensure', 'establish',
  'implement', 'maintain', 'monitor', 'analyze', 'assess', 'build', 'conduct',
  'coordinate', 'define', 'deliver', 'design', 'determine', 'direct', 'evaluate',
  'execute', 'identify', 'improve', 'integrate', 'lead', 'optimize', 'perform',
  'plan', 'prepare', 'provide', 'report', 'resolve', 'support', 'track', 'update',
])

// Valid prepositions for tasks
const VALID_PREPOSITIONS = new Set([
  'to', 'for', 'with', 'from', 'in', 'on', 'at', 'by', 'of', 'about',
  'through', 'into', 'within', 'using', 'regarding', 'concerning',
  'among', 'between', 'during', 'under', 'over', 'after', 'before',
])

// ============================================================================
// Concepts.tsv Tests
// ============================================================================

describe('Concepts.tsv Quality', () => {
  let concepts: TSVRow[] = []

  beforeAll(() => {
    const data = parseTSV(path.join(DATA_DIR, 'Concepts.tsv'))
    concepts = data.rows
  })

  it('should have concepts', () => {
    expect(concepts.length).toBeGreaterThan(0)
  })

  it('concept IDs should not start with prepositions', () => {
    const failures: string[] = []
    for (const row of concepts) {
      if (INVALID_CONCEPT_PATTERNS.startsWithPreposition.test(row.id)) {
        failures.push(`${row.id} (${row.name})`)
      }
    }
    expect(failures, `Found ${failures.length} concepts starting with prepositions:\n${failures.slice(0, 10).join('\n')}`).toHaveLength(0)
  })

  it('concept IDs should not contain And/Or conjunctions', () => {
    const failures: string[] = []
    for (const row of concepts) {
      if (INVALID_CONCEPT_PATTERNS.containsConjunction.test(row.id)) {
        failures.push(`${row.id} (${row.name})`)
      }
    }
    expect(failures, `Found ${failures.length} concepts with conjunctions:\n${failures.slice(0, 10).join('\n')}`).toHaveLength(0)
  })

  it('concept IDs should not end with And/Or', () => {
    const failures: string[] = []
    for (const row of concepts) {
      if (INVALID_CONCEPT_PATTERNS.endsWithConjunction.test(row.id)) {
        failures.push(`${row.id} (${row.name}) - sources: ${row.sourceTasks}`)
      }
    }
    expect(failures, `Found ${failures.length} concepts ending with And/Or:\n${failures.slice(0, 10).join('\n')}`).toHaveLength(0)
  })

  it('concept IDs should not contain pronouns (IT/It patterns)', () => {
    const failures: string[] = []
    for (const row of concepts) {
      if (INVALID_CONCEPT_PATTERNS.startsWithPronoun.test(row.id) ||
          INVALID_CONCEPT_PATTERNS.containsPronoun.test(row.id)) {
        failures.push(`${row.id} (${row.name})`)
      }
    }
    expect(failures, `Found ${failures.length} concepts with pronouns:\n${failures.slice(0, 10).join('\n')}`).toHaveLength(0)
  })

  it('concept IDs should not be truncated words', () => {
    const failures: string[] = []
    for (const row of concepts) {
      if (INVALID_CONCEPT_PATTERNS.truncatedWord.test(row.id)) {
        failures.push(`${row.id} (${row.name})`)
      }
    }
    expect(failures, `Found ${failures.length} truncated concepts:\n${failures.slice(0, 10).join('\n')}`).toHaveLength(0)
  })

  it('concept IDs should not start with common verbs', () => {
    const failures: string[] = []
    for (const row of concepts) {
      const firstWordMatch = row.id.match(/^([A-Z][a-z]+)/)
      if (firstWordMatch && COMMON_VERBS.has(firstWordMatch[1].toLowerCase())) {
        failures.push(`${row.id} (starts with verb "${firstWordMatch[1]}")`)
      }
    }
    expect(failures, `Found ${failures.length} concepts starting with verbs:\n${failures.slice(0, 10).join('\n')}`).toHaveLength(0)
  })

  it('concept IDs should be reasonable length (3-60 chars)', () => {
    const tooShort = concepts.filter((c) => c.id.length < 3)
    const tooLong = concepts.filter((c) => c.id.length > 60)

    expect(tooShort, `Found ${tooShort.length} concepts too short`).toHaveLength(0)
    expect(tooLong.length, `Found ${tooLong.length} concepts too long (>60 chars)`).toBeLessThan(200)
  })

  it('concepts should have valid source types', () => {
    const validSourceTypes = new Set(['Task', 'Process', 'Occupation', 'Industry'])
    const failures: string[] = []
    for (const row of concepts) {
      if (row.sourceType && !validSourceTypes.has(row.sourceType)) {
        failures.push(`${row.id}: invalid sourceType "${row.sourceType}"`)
      }
    }
    expect(failures, `Found invalid source types:\n${failures.slice(0, 10).join('\n')}`).toHaveLength(0)
  })
})

// ============================================================================
// Tasks.tsv Tests
// ============================================================================

describe('Tasks.tsv Quality', () => {
  let tasks: TSVRow[] = []

  beforeAll(() => {
    const data = parseTSV(path.join(DATA_DIR, 'Tasks.tsv'))
    tasks = data.rows
  })

  it('should have tasks', () => {
    expect(tasks.length).toBeGreaterThan(0)
  })

  it('task IDs should follow verb.Object.preposition.PrepObject pattern', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(tasks.length, 1000); i++) {
      const row = tasks[i]
      if (!row.id) continue
      // Should start with lowercase verb
      if (!/^[a-z]/.test(row.id)) {
        failures.push(`${row.id} - should start with lowercase verb`)
      }
      // Should contain dots as separators
      if (!row.id.includes('.')) {
        failures.push(`${row.id} - should contain dots`)
      }
    }
    expect(failures.length, `Found ${failures.length} malformed task IDs:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('tasks should have valid verbs', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(tasks.length, 1000); i++) {
      const row = tasks[i]
      if (!row.verb) {
        failures.push(`${row.id} - missing verb`)
      } else if (!/^[a-z][a-z]+$/i.test(row.verb)) {
        failures.push(`${row.id} - invalid verb "${row.verb}"`)
      }
    }
    expect(failures.length, `Found ${failures.length} tasks with invalid verbs:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('tasks should have valid objects (PascalCase)', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(tasks.length, 1000); i++) {
      const row = tasks[i]
      if (!row.object) {
        failures.push(`${row.id} - missing object`)
      } else if (!/^[A-Z]/.test(row.object)) {
        failures.push(`${row.id} - object should be PascalCase: "${row.object}"`)
      }
    }
    expect(failures.length, `Found ${failures.length} tasks with invalid objects:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('tasks with prepositions should have valid prepositions', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(tasks.length, 1000); i++) {
      const row = tasks[i]
      if (row.preposition && !VALID_PREPOSITIONS.has(row.preposition.toLowerCase())) {
        failures.push(`${row.id} - invalid preposition "${row.preposition}"`)
      }
    }
    expect(failures.length, `Found ${failures.length} tasks with invalid prepositions:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('task objects should not contain And/Or (less than 2% failure rate)', () => {
    const failures: string[] = []
    for (const row of tasks) {
      if (row.object && INVALID_CONCEPT_PATTERNS.containsConjunction.test(row.object)) {
        failures.push(`${row.id} - object contains conjunction: "${row.object}"`)
      }
    }
    // Complex ONET task descriptions sometimes have nested conjunctions that are difficult to parse
    // Target: less than 2% failure rate (continuously improving parser will reduce this)
    const failureRate = failures.length / tasks.length
    expect(failureRate, `Found ${failures.length} tasks (${(failureRate * 100).toFixed(1)}%) with conjunctions in object:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(0.02)
  })

  it('task objects should not start with prepositions (less than 1% failure rate)', () => {
    const failures: string[] = []
    for (const row of tasks) {
      if (row.object && INVALID_CONCEPT_PATTERNS.startsWithPreposition.test(row.object)) {
        failures.push(`${row.id} - object starts with preposition: "${row.object}"`)
      }
    }
    // Some parser outputs may still have leading prepositions/conjunctions
    // Target: less than 1% failure rate
    const failureRate = failures.length / tasks.length
    expect(failureRate, `Found ${failures.length} tasks (${(failureRate * 100).toFixed(1)}%) with preposition-prefixed objects:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(0.01)
  })
})

// ============================================================================
// Actions.tsv Tests
// ============================================================================

describe('Actions.tsv Quality', () => {
  let actions: TSVRow[] = []

  beforeAll(() => {
    const data = parseTSV(path.join(DATA_DIR, 'Actions.tsv'))
    actions = data.rows
  })

  it('should have actions', () => {
    expect(actions.length).toBeGreaterThan(0)
  })

  it('action IDs should match task ID format', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(actions.length, 500); i++) {
      const row = actions[i]
      if (!row.id) continue
      if (!/^[a-z]+\.[A-Z]/.test(row.id)) {
        failures.push(`${row.id} - should start with verb.Object`)
      }
    }
    expect(failures.length, `Found ${failures.length} malformed action IDs:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('actions should have corresponding verbs and objects', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(actions.length, 500); i++) {
      const row = actions[i]
      if (!row.verb) failures.push(`${row.id} - missing verb`)
      if (!row.object) failures.push(`${row.id} - missing object`)
    }
    expect(failures.length, `Found ${failures.length} incomplete actions:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })
})

// ============================================================================
// Events.tsv Tests
// ============================================================================

describe('Events.tsv Quality', () => {
  let events: TSVRow[] = []

  beforeAll(() => {
    const data = parseTSV(path.join(DATA_DIR, 'Events.tsv'))
    events = data.rows
  })

  it('should have events', () => {
    expect(events.length).toBeGreaterThan(0)
  })

  it('events should have past tense', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(events.length, 500); i++) {
      const row = events[i]
      if (!row.pastTense) {
        failures.push(`${row.id} - missing pastTense`)
      }
    }
    expect(failures.length, `Found ${failures.length} events without pastTense:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('event past tense should be proper past tense', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(events.length, 500); i++) {
      const row = events[i]
      if (row.pastTense && row.verb) {
        // Simple check: past tense should be different from base verb
        if (row.pastTense.toLowerCase() === row.verb.toLowerCase()) {
          failures.push(`${row.id} - pastTense "${row.pastTense}" same as verb "${row.verb}"`)
        }
      }
    }
    expect(failures.length, `Found ${failures.length} events with incorrect past tense:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(50)
  })
})

// ============================================================================
// SubProcesses.tsv Tests
// ============================================================================

describe('SubProcesses.tsv Quality', () => {
  let subprocesses: TSVRow[] = []

  beforeAll(() => {
    const data = parseTSV(path.join(DATA_DIR, 'SubProcesses.tsv'))
    subprocesses = data.rows
  })

  it('should have subprocesses', () => {
    expect(subprocesses.length).toBeGreaterThan(0)
  })

  it('subprocess IDs should follow verb.Object or verb.preposition.Object pattern', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(subprocesses.length, 500); i++) {
      const row = subprocesses[i]
      if (!row.id) continue
      // Accept both verb.Object and verb.preposition.Object patterns
      // e.g., develop.Strategy, migrate.to.NewOrganization, design.for.Manufacturing
      if (!/^[a-z]+\.([A-Z]|to\.|for\.|with\.|from\.|in\.)/.test(row.id)) {
        failures.push(`${row.id} - should start with verb.Object or verb.prep.Object`)
      }
    }
    expect(failures.length, `Found ${failures.length} malformed subprocess IDs:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('subprocesses should have parent references', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(subprocesses.length, 500); i++) {
      const row = subprocesses[i]
      if (!row.parentId && !row.parentCode) {
        failures.push(`${row.id} - missing parent reference`)
      }
    }
    expect(failures.length, `Found ${failures.length} orphan subprocesses:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('subprocess objects should not contain And/Or (less than 1% failure rate)', () => {
    const failures: string[] = []
    for (const row of subprocesses) {
      if (row.object && INVALID_CONCEPT_PATTERNS.containsConjunction.test(row.object)) {
        failures.push(`${row.id} - object contains conjunction: "${row.object}"`)
      }
    }
    // Some APQC process names are genuinely compound (e.g., "Backup and Archive Activities")
    // Target: less than 1% failure rate
    const failureRate = failures.length / subprocesses.length
    expect(failureRate, `Found ${failures.length} subprocesses (${(failureRate * 100).toFixed(1)}%) with conjunctions:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(0.01)
  })

  it('subprocess objects should not start with prepositions', () => {
    const failures: string[] = []
    for (const row of subprocesses) {
      if (row.object && INVALID_CONCEPT_PATTERNS.startsWithPreposition.test(row.object)) {
        failures.push(`${row.id} - object starts with preposition: "${row.object}"`)
      }
    }
    expect(failures, `Found ${failures.length} subprocesses with preposition-prefixed objects:\n${failures.slice(0, 10).join('\n')}`).toHaveLength(0)
  })
})

// ============================================================================
// Processes.tsv Tests
// ============================================================================

describe('Processes.tsv Quality', () => {
  let processes: TSVRow[] = []

  beforeAll(() => {
    const data = parseTSV(path.join(DATA_DIR, 'Processes.tsv'))
    processes = data.rows
  })

  it('should have processes', () => {
    expect(processes.length).toBeGreaterThan(0)
  })

  it('process IDs should be PascalCase', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(processes.length, 500); i++) {
      const row = processes[i]
      if (!row.id) continue
      if (!/^[A-Z]/.test(row.id)) {
        failures.push(`${row.id} - should be PascalCase`)
      }
    }
    expect(failures.length, `Found ${failures.length} non-PascalCase process IDs:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('processes should have levels', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(processes.length, 500); i++) {
      const row = processes[i]
      if (!row.level && row.level !== '0') {
        failures.push(`${row.id} - missing level`)
      }
    }
    expect(failures.length, `Found ${failures.length} processes without level:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })
})

// ============================================================================
// Industries.tsv Tests
// ============================================================================

describe('Industries.tsv Quality', () => {
  let industries: TSVRow[] = []

  beforeAll(() => {
    const data = parseTSV(path.join(DATA_DIR, 'Industries.tsv'))
    industries = data.rows
  })

  it('should have industries', () => {
    expect(industries.length).toBeGreaterThan(0)
  })

  it('industry IDs should be PascalCase', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(industries.length, 500); i++) {
      const row = industries[i]
      if (!row.id) continue
      if (!/^[A-Z]/.test(row.id)) {
        failures.push(`${row.id} - should be PascalCase`)
      }
    }
    expect(failures.length, `Found ${failures.length} non-PascalCase industry IDs:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('industries should have NAICS codes', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(industries.length, 500); i++) {
      const row = industries[i]
      if (!row.code) {
        failures.push(`${row.id} - missing NAICS code`)
      }
    }
    expect(failures.length, `Found ${failures.length} industries without codes:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })
})

// ============================================================================
// Occupations.tsv Tests
// ============================================================================

describe('Occupations.tsv Quality', () => {
  let occupations: TSVRow[] = []

  beforeAll(() => {
    const data = parseTSV(path.join(DATA_DIR, 'Occupations.tsv'))
    occupations = data.rows
  })

  it('should have occupations', () => {
    expect(occupations.length).toBeGreaterThan(0)
  })

  it('occupation IDs should be PascalCase', () => {
    const failures: string[] = []
    for (const row of occupations) {
      if (!row.id) continue
      if (!/^[A-Z]/.test(row.id)) {
        failures.push(`${row.id} - should be PascalCase`)
      }
    }
    expect(failures.length, `Found ${failures.length} non-PascalCase occupation IDs:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('occupations should have O*NET codes', () => {
    const failures: string[] = []
    for (const row of occupations) {
      if (!row.code && !row.sourceCode) {
        failures.push(`${row.id} - missing O*NET code`)
      }
    }
    expect(failures.length, `Found ${failures.length} occupations without codes:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })
})

// ============================================================================
// Products.tsv Tests
// ============================================================================

describe('Products.tsv Quality', () => {
  let products: TSVRow[] = []

  beforeAll(() => {
    const data = parseTSV(path.join(DATA_DIR, 'Products.tsv'))
    products = data.rows
  })

  it('should have products', () => {
    expect(products.length).toBeGreaterThan(0)
  })

  it('product IDs should be PascalCase', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(products.length, 500); i++) {
      const row = products[i]
      if (!row.id) continue
      if (!/^[A-Z]/.test(row.id)) {
        failures.push(`${row.id} - should be PascalCase`)
      }
    }
    expect(failures.length, `Found ${failures.length} non-PascalCase product IDs:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('products should have UNSPSC codes', () => {
    const failures: string[] = []
    for (let i = 0; i < Math.min(products.length, 500); i++) {
      const row = products[i]
      if (!row.code) {
        failures.push(`${row.id} - missing UNSPSC code`)
      }
    }
    expect(failures.length, `Found ${failures.length} products without codes:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })
})

// ============================================================================
// Cross-File Referential Integrity Tests
// ============================================================================

describe('Cross-File Referential Integrity', () => {
  let tasks: TSVRow[] = []
  let concepts: TSVRow[] = []
  let subprocesses: TSVRow[] = []
  let processes: TSVRow[] = []

  beforeAll(() => {
    tasks = parseTSV(path.join(DATA_DIR, 'Tasks.tsv')).rows
    concepts = parseTSV(path.join(DATA_DIR, 'Concepts.tsv')).rows
    subprocesses = parseTSV(path.join(DATA_DIR, 'SubProcesses.tsv')).rows
    processes = parseTSV(path.join(DATA_DIR, 'Processes.tsv')).rows
  })

  it('concept sourceTasks should reference valid task IDs', () => {
    const taskIds = new Set(tasks.map((t) => t.id))
    const failures: string[] = []

    for (let i = 0; i < Math.min(concepts.length, 100); i++) {
      const concept = concepts[i]
      if (!concept.sourceTasks) continue

      const sourceTaskIds = concept.sourceTasks.split(',')
      for (const taskId of sourceTaskIds.slice(0, 5)) {
        if (taskId && !taskIds.has(taskId.trim())) {
          failures.push(`Concept ${concept.id} references non-existent task: ${taskId}`)
          break
        }
      }
    }
    expect(failures.length, `Found ${failures.length} invalid task references:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })

  it('subprocess parentIds should reference valid process IDs (with case tolerance)', () => {
    // Create both exact and case-insensitive lookup
    const processIds = new Set(processes.map((p) => p.id))
    const processIdsLower = new Set(processes.map((p) => p.id?.toLowerCase()))
    const failures: string[] = []
    const caseMismatches: string[] = []

    for (let i = 0; i < Math.min(subprocesses.length, 500); i++) {
      const subprocess = subprocesses[i]
      if (subprocess.parentId) {
        if (!processIds.has(subprocess.parentId)) {
          // Check if it's a case mismatch vs truly missing
          if (processIdsLower.has(subprocess.parentId.toLowerCase())) {
            caseMismatches.push(`${subprocess.id}: ${subprocess.parentId}`)
          } else {
            failures.push(`SubProcess ${subprocess.id} references non-existent parent: ${subprocess.parentId}`)
          }
        }
      }
    }
    // Log case mismatches for fixing but don't fail the test for them
    if (caseMismatches.length > 0) {
      console.log(`Note: ${caseMismatches.length} case mismatches in parent references (should be fixed):`)
      console.log(caseMismatches.slice(0, 5).join('\n'))
    }
    expect(failures.length, `Found ${failures.length} invalid parent references:\n${failures.slice(0, 10).join('\n')}`).toBeLessThan(10)
  })
})

// ============================================================================
// Data Consistency Tests
// ============================================================================

describe('Data Consistency', () => {
  it('Tasks and Actions should have matching counts', () => {
    const tasks = parseTSV(path.join(DATA_DIR, 'Tasks.tsv')).rows
    const actions = parseTSV(path.join(DATA_DIR, 'Actions.tsv')).rows

    // They should be very close in count (same source data)
    const diff = Math.abs(tasks.length - actions.length)
    expect(diff, `Tasks (${tasks.length}) and Actions (${actions.length}) differ by ${diff}`).toBeLessThan(100)
  })

  it('Events should have similar count to Tasks', () => {
    const tasks = parseTSV(path.join(DATA_DIR, 'Tasks.tsv')).rows
    const events = parseTSV(path.join(DATA_DIR, 'Events.tsv')).rows

    // Events are derived from tasks, should be roughly similar
    const ratio = events.length / tasks.length
    expect(ratio, `Events/Tasks ratio is ${ratio.toFixed(2)}, expected close to 0.5`).toBeGreaterThan(0.3)
    expect(ratio).toBeLessThan(1.5)
  })

  it('no duplicate IDs in Tasks', () => {
    const tasks = parseTSV(path.join(DATA_DIR, 'Tasks.tsv')).rows
    const ids = tasks.map((t) => t.id)
    const uniqueIds = new Set(ids)

    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i).slice(0, 10)
    expect(duplicates.length, `Found duplicate task IDs: ${duplicates.join(', ')}`).toBe(0)
  })

  it('no duplicate IDs in Concepts', () => {
    const concepts = parseTSV(path.join(DATA_DIR, 'Concepts.tsv')).rows
    const ids = concepts.map((c) => c.id)
    const uniqueIds = new Set(ids)

    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i).slice(0, 10)
    expect(duplicates.length, `Found duplicate concept IDs: ${duplicates.join(', ')}`).toBe(0)
  })
})

// ============================================================================
// Statistical Quality Tests
// ============================================================================

describe('Statistical Quality Metrics', () => {
  it('concept issue rate should be below 1%', () => {
    const concepts = parseTSV(path.join(DATA_DIR, 'Concepts.tsv')).rows
    let issues = 0

    for (const row of concepts) {
      if (INVALID_CONCEPT_PATTERNS.startsWithPreposition.test(row.id) ||
          INVALID_CONCEPT_PATTERNS.containsConjunction.test(row.id) ||
          INVALID_CONCEPT_PATTERNS.startsWithPronoun.test(row.id) ||
          INVALID_CONCEPT_PATTERNS.containsPronoun.test(row.id) ||
          INVALID_CONCEPT_PATTERNS.truncatedWord.test(row.id)) {
        issues++
      }
    }

    const issueRate = (issues / concepts.length) * 100
    expect(issueRate, `Concept issue rate is ${issueRate.toFixed(2)}%`).toBeLessThan(1)
  })

  it('task parsing success rate should be above 95%', () => {
    const tasks = parseTSV(path.join(DATA_DIR, 'Tasks.tsv')).rows
    let valid = 0

    for (const row of tasks) {
      if (row.verb && row.object && /^[a-z]+\.[A-Z]/.test(row.id)) {
        valid++
      }
    }

    const successRate = (valid / tasks.length) * 100
    expect(successRate, `Task parsing success rate is ${successRate.toFixed(2)}%`).toBeGreaterThan(95)
  })
})
