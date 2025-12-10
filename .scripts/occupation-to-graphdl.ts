/**
 * Occupation to GraphDL Statement Transformer
 *
 * Uses the GraphDL semantic parser to convert O*NET occupation titles into
 * GraphDL Statement syntax with proper cartesian expansion.
 *
 * Handles special patterns:
 * - ", All Other" suffix → removed, creates generic category
 * - ", Including X" → removed, X noted in description
 * - "X and Y Managers" → expands to XManagers, YManagers
 * - "X, Y, and Z" → cartesian expansion
 *
 * Output:
 * - Occupations.tsv: Root occupations with O*NET code as the canonical identifier
 * - OccupationExpansions.tsv: Expanded semantic variations
 * - OccupationConcepts.tsv: Unique concepts extracted from occupation titles
 * - relationships/Occupations.Concepts.tsv: Occupation → Concept relationships
 */

import { join, dirname } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Try to load GraphDL parser, fall back to basic parsing if not available
let GraphDLParser: any = null
try {
  const graphdlModule = await import(join(__dirname, '../graphdl/dist/index.js'))
  GraphDLParser = graphdlModule.GraphDLParser
} catch (e) {
  console.log('GraphDL parser not available, using basic parsing')
}

// Common acronyms that should stay uppercase
const ACRONYMS = new Set([
  'IT', 'HR', 'ERP', 'CRM', 'API', 'CEO', 'CFO', 'CIO', 'COO', 'CTO',
  'EHS', 'EPA', 'FDA', 'EMT', 'HVAC', 'CAD', 'CAM', 'CNC', 'PLC',
  'MRI', 'CT', 'EKG', 'ICU', 'ER', 'OR', 'RN', 'LPN', 'MD', 'DO',
  'DDS', 'DMD', 'OD', 'DC', 'DVM', 'PharmD', 'PA', 'NP', 'PhD',
  'JD', 'MBA', 'CPA', 'CFP', 'CFA', 'STEM', 'ESL', 'GED', 'SAT', 'ACT',
  'OSHA', 'ISO', 'QA', 'QC', 'R&D', 'PR', 'HR', 'B2B', 'B2C',
])

// Common occupation type suffixes (singular forms)
const OCCUPATION_SUFFIXES = [
  'Manager', 'Director', 'Supervisor', 'Administrator', 'Coordinator',
  'Specialist', 'Analyst', 'Engineer', 'Technician', 'Operator',
  'Worker', 'Assistant', 'Aide', 'Clerk', 'Representative',
  'Agent', 'Officer', 'Inspector', 'Examiner', 'Auditor',
  'Counselor', 'Advisor', 'Consultant', 'Trainer', 'Instructor',
  'Teacher', 'Professor', 'Scientist', 'Researcher', 'Developer',
  'Designer', 'Architect', 'Planner', 'Estimator', 'Appraiser',
  'Therapist', 'Nurse', 'Physician', 'Surgeon', 'Dentist',
  'Technologist', 'Hygienist', 'Pharmacist', 'Veterinarian',
  'Attorney', 'Lawyer', 'Paralegal', 'Judge', 'Arbitrator',
  'Accountant', 'Bookkeeper', 'Teller', 'Broker', 'Underwriter',
  'Mechanic', 'Electrician', 'Plumber', 'Carpenter', 'Welder',
  'Driver', 'Pilot', 'Captain', 'Dispatcher', 'Controller',
  'Chef', 'Cook', 'Baker', 'Bartender', 'Server', 'Host',
  'Guard', 'Detective', 'Firefighter', 'Paramedic',
]

interface OccupationSource {
  code: string
  title: string
  description: string
}

interface OccupationRecord {
  ns: string
  type: string
  id: string
  name: string
  description: string
  code: string
  shortName: string
  sourceType: string
  sourceCode: string
  jobZone: string
  category: string
}

interface ExpansionRecord {
  ns: string
  type: string
  id: string
  name: string
  parentCode: string
  parentId: string
  expansionType: string
}

interface ConceptRecord {
  ns: string
  type: string
  id: string
  name: string
}

interface ConceptRelationshipRecord {
  fromNs: string
  fromType: string
  fromId: string
  toNs: string
  toType: string
  toId: string
  relationshipType: string
}

/**
 * Parse TSV file
 */
function parseTSV<T = Record<string, string>>(filePath: string): T[] {
  let content = readFileSync(filePath, 'utf-8')
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.substring(1)
  }

  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split('\t').map(h => h.trim())
  const records: T[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t')
    const record: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = (values[j] || '').trim()
    }
    records.push(record as T)
  }

  return records
}

/**
 * Write TSV file
 */
function writeTSV(filePath: string, records: Record<string, any>[], headers: string[]): void {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'))
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const lines = [
    headers.join('\t'),
    ...records.map(record =>
      headers.map(col => {
        const val = record[col]
        if (val === undefined || val === null) return ''
        return String(val).replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '')
      }).join('\t')
    )
  ]

  writeFileSync(filePath, lines.join('\n'), 'utf-8')
  console.log(`Wrote ${records.length} records to ${filePath}`)
}

/**
 * Convert a word to PascalCase while preserving acronym casing
 */
function toPascalCaseWord(word: string): string {
  const upper = word.toUpperCase()
  if (ACRONYMS.has(upper)) {
    return upper
  }
  // Handle hyphenated words
  if (word.includes('-')) {
    return word.split('-').map(part => {
      const partUpper = part.toUpperCase()
      if (ACRONYMS.has(partUpper)) return partUpper
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    }).join('')
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * Convert text to PascalCase ID
 */
function toPascalCase(text: string): string {
  if (!text) return ''

  // Remove parenthetical content first
  const cleaned = text
    .replace(/\([^)]+\)/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const words = cleaned.split(/[\s]+/).filter(w => w.length > 0)
  if (words.length === 0) return ''

  return words.map(w => toPascalCaseWord(w)).join('')
}

/**
 * Generate short name from occupation title
 */
function generateShortName(name: string): string {
  const words = name.toLowerCase().split(/\s+/)
  if (words.length === 1) return words[0].substring(0, 8)

  const stopWords = ['the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with', 'all', 'other', 'including']
  const significant = words.filter(w => !stopWords.includes(w))
  if (significant.length <= 4) {
    return significant.map(w => w.substring(0, 2)).join('')
  }
  return significant.map(w => w[0]).join('')
}

/**
 * Remove ", All Other" suffix and return cleaned title + flag
 */
function handleAllOther(title: string): { cleaned: string; isAllOther: boolean } {
  const match = title.match(/^(.+),\s*All Other$/i)
  if (match) {
    return { cleaned: match[1].trim(), isAllOther: true }
  }
  return { cleaned: title, isAllOther: false }
}

/**
 * Remove ", Including X" suffix and extract the inclusion
 */
function handleIncluding(title: string): { cleaned: string; including: string | null } {
  const match = title.match(/^(.+),\s*Including\s+(.+)$/i)
  if (match) {
    return { cleaned: match[1].trim(), including: match[2].trim() }
  }
  return { cleaned: title, including: null }
}

/**
 * Find the common suffix in occupation titles (e.g., "Managers", "Technicians")
 */
function findOccupationSuffix(title: string): { prefix: string; suffix: string } | null {
  // Check for plural suffixes
  for (const singular of OCCUPATION_SUFFIXES) {
    const plural = singular.endsWith('y')
      ? singular.slice(0, -1) + 'ies'
      : singular + 's'

    if (title.endsWith(plural)) {
      const prefix = title.slice(0, -plural.length).trim()
      return { prefix, suffix: plural }
    }
    if (title.endsWith(singular)) {
      const prefix = title.slice(0, -singular.length).trim()
      return { prefix, suffix: singular }
    }
  }
  return null
}

/**
 * Check if a word is a role suffix (singular or plural)
 */
function isRoleSuffix(word: string): boolean {
  const normalized = word.toLowerCase()
  for (const singular of OCCUPATION_SUFFIXES) {
    const singLower = singular.toLowerCase()
    const pluralLower = singular.endsWith('y')
      ? singLower.slice(0, -1) + 'ies'
      : singLower + 's'
    if (normalized === singLower || normalized === pluralLower) {
      return true
    }
  }
  return false
}

/**
 * Expand conjunctions in occupation titles using cartesian expansion
 *
 * Pattern 1: "X and Y Suffix" where both X and Y are modifiers
 *   "Career Counselors and Advisors" → ["CareerCounselors", "CareerAdvisors"]
 *   "Computer and Information Systems Managers" → ["ComputerSystemsManagers", "InformationSystemsManagers"]
 *
 * Pattern 2: "X and Y" where both are standalone roles
 *   "Treasurers and Controllers" → ["Treasurers", "Controllers"]
 *
 * Pattern 3: "X, Y, and Z Suffix" where all are modifiers
 *   "Transportation, Storage, and Distribution Managers" → ["TransportationManagers", "StorageManagers", "DistributionManagers"]
 */
function expandOccupationTitle(title: string): string[] {
  // First, clean up the title
  let { cleaned } = handleAllOther(title)
  const { cleaned: cleanedIncl } = handleIncluding(cleaned)
  cleaned = cleanedIncl

  // Find suffix pattern
  const suffixMatch = findOccupationSuffix(cleaned)

  if (!suffixMatch) {
    // No recognizable suffix - check if the whole thing is a conjunction of roles
    // e.g., "Treasurers and Controllers"
    const parts = cleaned
      .split(/(?:,\s*(?:and\s+|or\s+)?|\s+and\s+|\s+or\s+)/i)
      .map(p => p.trim())
      .filter(p => p.length > 0)

    // Check if all parts are standalone roles (have their own suffix)
    const allHaveSuffix = parts.every(p => findOccupationSuffix(p) !== null)
    if (allHaveSuffix && parts.length > 1) {
      return parts.map(p => toPascalCase(p))
    }

    return [toPascalCase(cleaned)]
  }

  const { prefix, suffix } = suffixMatch

  // Check for conjunctions in the prefix
  if (!/(?:,|\s+and\s+|\s+or\s+)/i.test(prefix)) {
    // No conjunctions, return single occupation
    return [toPascalCase(cleaned)]
  }

  // Split on conjunctions - but be careful with compound terms like "Information Systems"
  // Strategy: Find conjunctions and analyze the structure

  // First, check if this is a simple "X and Y Suffix" pattern
  // where both X and Y should get the suffix
  const simpleAndMatch = prefix.match(/^(.+?)\s+and\s+(.+)$/i)
  if (simpleAndMatch) {
    const [, firstPart, secondPart] = simpleAndMatch

    // Check if secondPart already ends with a role
    const secondHasRole = findOccupationSuffix(secondPart + ' ' + suffix)
    const firstHasRole = findOccupationSuffix(firstPart)

    if (firstHasRole) {
      // First part has its own role, e.g., "Treasurers and Controllers"
      // In this case, each is standalone
      return [toPascalCase(firstPart), toPascalCase(secondPart + ' ' + suffix)]
    }

    // Both need the suffix
    // But check for shared modifier in secondPart
    // e.g., "Computer and Information Systems" → "Computer Systems" + "Information Systems"
    const secondWords = secondPart.split(/\s+/)
    if (secondWords.length > 1) {
      // Find which words are likely shared (the last noun phrase)
      // e.g., "Information Systems" - "Systems" might be shared
      const lastWord = secondWords[secondWords.length - 1]

      // Simple heuristic: if first part is a single word and second part ends with
      // a word that makes sense as a shared context, use it
      const firstWords = firstPart.split(/\s+/)
      if (firstWords.length === 1 && !isRoleSuffix(lastWord)) {
        // "Computer" + "Information Systems" → "Computer Systems" + "Information Systems"
        return [
          toPascalCase(firstPart + ' ' + lastWord + ' ' + suffix),
          toPascalCase(secondPart + ' ' + suffix)
        ]
      }
    }

    // Default: just apply suffix to both parts
    return [
      toPascalCase(firstPart + ' ' + suffix),
      toPascalCase(secondPart + ' ' + suffix)
    ]
  }

  // Handle comma-separated list: "X, Y, and Z Suffix"
  const parts = prefix
    .split(/(?:,\s*(?:and\s+|or\s+)?|\s+and\s+|\s+or\s+)/i)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  if (parts.length <= 1) {
    return [toPascalCase(cleaned)]
  }

  // Expand each part with the suffix
  const expansions: string[] = []

  for (const part of parts) {
    // Check if this part already has a role suffix
    if (findOccupationSuffix(part)) {
      expansions.push(toPascalCase(part))
    } else {
      expansions.push(toPascalCase(part + ' ' + suffix))
    }
  }

  return expansions
}

/**
 * Extract concepts from occupation title
 */
function extractConcepts(title: string): string[] {
  const concepts: string[] = []

  // Clean title
  let { cleaned } = handleAllOther(title)
  const { cleaned: cleanedIncl } = handleIncluding(cleaned)
  cleaned = cleanedIncl

  // Find the suffix to separate domain from role
  const suffixMatch = findOccupationSuffix(cleaned)

  if (suffixMatch) {
    const { prefix, suffix } = suffixMatch

    // The prefix contains domain concepts
    const parts = prefix
      .split(/(?:,\s*(?:and\s+|or\s+)?|\s+and\s+|\s+or\s+)/i)
      .map(p => p.trim())
      .filter(p => p.length > 0)

    for (const part of parts) {
      const concept = toPascalCase(part)
      if (concept && concept.length > 2) {
        concepts.push(concept)
      }
    }

    // The suffix is also a concept (the role type)
    const roleConcept = toPascalCase(suffix)
    if (roleConcept) {
      concepts.push(roleConcept)
    }
  }

  return [...new Set(concepts)]
}

/**
 * Main transformation function
 */
async function transformOccupations(): Promise<void> {
  const sourceFile = join(process.cwd(), '.standards/.source/ONET/ONET.OccupationData.tsv')
  const jobZonesFile = join(process.cwd(), '.standards/.source/ONET/ONET.JobZoneReference.tsv')
  const occupationsOutput = join(process.cwd(), '.data/Occupations.tsv')
  const expansionsOutput = join(process.cwd(), '.data/OccupationExpansions.tsv')
  const conceptsOutput = join(process.cwd(), '.data/OccupationConcepts.tsv')
  const conceptRelationshipsOutput = join(process.cwd(), '.data/relationships/Occupations.Concepts.tsv')

  console.log('=== Occupation to GraphDL Statement Transformer ===')
  console.log(`Reading from: ${sourceFile}`)

  if (!existsSync(sourceFile)) {
    console.error(`Source file not found: ${sourceFile}`)
    process.exit(1)
  }

  // Load job zones for reference
  const jobZoneMap = new Map<string, string>()
  if (existsSync(jobZonesFile)) {
    const jobZones = parseTSV(jobZonesFile)
    jobZones.forEach(jz => {
      if (jz['O*NET-SOC Code'] && jz['Job Zone']) {
        jobZoneMap.set(jz['O*NET-SOC Code'], jz['Job Zone'])
      }
    })
    console.log(`Loaded ${jobZoneMap.size} job zone mappings`)
  }

  // Initialize GraphDL parser if available
  let parser: any = null
  if (GraphDLParser) {
    parser = new GraphDLParser()
    await parser.initialize()
    console.log('GraphDL parser initialized')
  }

  const sourceData = parseTSV<{ oNETSOCCode: string; title: string; description: string }>(sourceFile)
  console.log(`Found ${sourceData.length} O*NET occupations`)

  const occupationRecords: OccupationRecord[] = []
  const expansionRecords: ExpansionRecord[] = []
  const conceptSources = new Map<string, Set<string>>()
  const conceptRelationships: ConceptRelationshipRecord[] = []

  for (const row of sourceData) {
    const code = row.oNETSOCCode || ''
    const title = row.title || ''
    const description = row.description || ''

    if (!code || !title) continue

    // Handle special patterns
    const { cleaned: cleanedAllOther, isAllOther } = handleAllOther(title)
    const { cleaned: cleanedTitle, including } = handleIncluding(cleanedAllOther)

    // Generate base occupation ID
    const occupationId = toPascalCase(cleanedTitle)

    // Create category based on patterns
    let category = 'Occupation'
    if (isAllOther) category = 'OccupationCategory'
    if (including) category = 'Occupation'

    const jobZone = jobZoneMap.get(code) || ''

    // Create occupation record
    const occupationRecord: OccupationRecord = {
      ns: 'occupations.org.ai',
      type: 'Occupation',
      id: occupationId,
      name: title,
      description: description,
      code: code,
      shortName: generateShortName(cleanedTitle),
      sourceType: 'ONETOccupation',
      sourceCode: code,
      jobZone: jobZone,
      category: category,
    }
    occupationRecords.push(occupationRecord)

    // Generate expansions
    const expansions = expandOccupationTitle(title)

    for (const expansionId of expansions) {
      if (expansionId === occupationId) continue // Skip if same as parent

      const expansionRecord: ExpansionRecord = {
        ns: 'occupations.org.ai',
        type: 'OccupationExpansion',
        id: expansionId,
        name: expansionId.replace(/([a-z])([A-Z])/g, '$1 $2'),
        parentCode: code,
        parentId: occupationId,
        expansionType: 'conjunction',
      }
      expansionRecords.push(expansionRecord)
    }

    // Extract concepts
    const concepts = extractConcepts(title)

    for (const concept of concepts) {
      if (!conceptSources.has(concept)) {
        conceptSources.set(concept, new Set())
      }
      conceptSources.get(concept)!.add(code)

      conceptRelationships.push({
        fromNs: 'occupations.org.ai',
        fromType: 'Occupation',
        fromId: occupationId,
        toNs: 'concept.org.ai',
        toType: 'Concept',
        toId: concept,
        relationshipType: 'relatedTo',
      })
    }
  }

  // Dedupe occupation records by ID
  const seenOccupations = new Set<string>()
  const dedupedOccupations = occupationRecords.filter(o => {
    if (seenOccupations.has(o.id)) return false
    seenOccupations.add(o.id)
    return true
  })

  // Dedupe expansion records by ID
  const seenExpansions = new Set<string>()
  const dedupedExpansions = expansionRecords.filter(e => {
    if (seenExpansions.has(e.id)) return false
    seenExpansions.add(e.id)
    return true
  })

  // Write output files
  writeTSV(occupationsOutput, dedupedOccupations, [
    'ns', 'type', 'id', 'name', 'description', 'code', 'shortName', 'sourceType', 'sourceCode', 'jobZone', 'category'
  ])

  if (dedupedExpansions.length > 0) {
    writeTSV(expansionsOutput, dedupedExpansions, [
      'ns', 'type', 'id', 'name', 'parentCode', 'parentId', 'expansionType'
    ])
  }

  // Build concept records
  const conceptRecords: ConceptRecord[] = []
  for (const [concept] of conceptSources.entries()) {
    conceptRecords.push({
      ns: 'concept.org.ai',
      type: 'Concept',
      id: concept,
      name: concept.replace(/([a-z])([A-Z])/g, '$1 $2'),
    })
  }
  conceptRecords.sort((a, b) => a.id.localeCompare(b.id))

  if (conceptRecords.length > 0) {
    writeTSV(conceptsOutput, conceptRecords, [
      'ns', 'type', 'id', 'name'
    ])
  }

  // Dedupe concept relationships
  const seenRelationships = new Set<string>()
  const dedupedRelationships = conceptRelationships.filter(r => {
    const key = `${r.fromId}|${r.toId}`
    if (seenRelationships.has(key)) return false
    seenRelationships.add(key)
    return true
  })

  if (dedupedRelationships.length > 0) {
    writeTSV(conceptRelationshipsOutput, dedupedRelationships, [
      'fromNs', 'fromType', 'fromId', 'toNs', 'toType', 'toId', 'relationshipType'
    ])
  }

  console.log('\n=== Summary ===')
  console.log(`Occupations: ${dedupedOccupations.length}`)
  console.log(`Expansions: ${dedupedExpansions.length}`)
  console.log(`Concepts: ${conceptRecords.length}`)
  console.log(`Concept Relationships: ${dedupedRelationships.length}`)

  // Show examples
  console.log('\n=== Examples ===')
  const exampleTitles = [
    'Career Counselors and Advisors',
    'Treasurers and Controllers',
    'Environmental Science and Protection Technicians, Including Health',
    'Life, Physical, and Social Science Technicians, All Other',
    'Transportation, Storage, and Distribution Managers',
    'Computer and Information Systems Managers',
  ]

  for (const title of exampleTitles) {
    const found = sourceData.find(r => r.title === title || r.title?.includes(title.split(',')[0]))
    if (found) {
      console.log(`\n"${found.title}"`)
      console.log(`  ID: ${toPascalCase(handleIncluding(handleAllOther(found.title).cleaned).cleaned)}`)
      console.log(`  Expansions: ${expandOccupationTitle(found.title).join(', ')}`)
      console.log(`  Concepts: ${extractConcepts(found.title).join(', ')}`)
    }
  }
}

// Run
transformOccupations().catch(console.error)
