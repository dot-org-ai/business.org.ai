#!/usr/bin/env tsx

/**
 * Unified Abstract Interface Generator
 *
 * Generates unified abstract interfaces from the standards.org.ai submodule.
 * Reads from .standards/.data/ and outputs to .data/
 *
 * Key features:
 * - Uses @graphdl/semantics for proper semantic parsing
 * - AND/OR cartesian product expansion via GraphDL
 * - Proper ID formats: PascalCase, action.Object, Subject.action.Object, Object.event
 * - Source data included for debugging
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  Entity,
  Relationship,
  AbstractRole,
  AbstractJob,
  AbstractCompetency,
  AbstractTask,
  AbstractAction,
  AbstractEvent,
  AbstractActivity,
  AbstractContext,
  AbstractIndustry,
  AbstractProcess,
  AbstractProduct,
  AbstractService,
  AbstractLocation,
  AbstractTech,
  AbstractTool,
  AbstractBusinessStep,
  AbstractDisposition,
  AbstractIdentifierType,
  AbstractLocationType,
  AbstractProductAttribute,
  AbstractWorkStyle,
  AbstractWorkValue,
  AbstractInterest,
  AbstractMerchantCategory,
  AbstractConcept,
  NAMESPACES,
} from './types.js'
import { GraphDLParser, ParsedStatement, NounPhraseExpander } from '../graphdl/dist/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths - read from submodule, write to local .data
const STANDARDS_DIR = path.resolve(__dirname, '../.standards/.data')
const OUTPUT_DIR = path.resolve(__dirname, '../.data')
const OUTPUT_REL_DIR = path.join(OUTPUT_DIR, 'relationships')

// ============================================================================
// Utility Functions
// ============================================================================

function parseTSV<T = Record<string, string>>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
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
    return row as T
  })
}

function writeTSV(
  filePath: string,
  data: Record<string, string | undefined>[]
): void {
  if (data.length === 0) {
    console.warn(`  ⚠️  No data to write for ${path.basename(filePath)}`)
    return
  }

  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers.map((h) => (row[h] ?? '').toString()).join('\t')
  )
  const content = [headers.join('\t'), ...rows].join('\n')

  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`  ✅ ${path.basename(filePath)} (${data.length} rows)`)
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Convert text to PascalCase ID (no underscores, no dots)
 */
function toPascalCase(text: string): string {
  if (!text) return ''
  return text
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[\s_-]+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
}

// Common acronyms that should stay uppercase
const ACRONYMS = new Set([
  'IT', 'HR', 'ERP', 'CRM', 'API', 'B2B', 'B2C', 'CEO', 'CFO', 'CIO', 'COO',
  'EHS', 'EPA', 'FDA', 'GAAP', 'GDP', 'GHG', 'HIPAA', 'HQ', 'HSE', 'IoT',
  'IP', 'IPO', 'ISO', 'KPI', 'MRP', 'OSHA', 'PCI', 'PM', 'PO', 'PR',
  'QA', 'QC', 'RFI', 'RFP', 'RFQ', 'ROI', 'SaaS', 'SCM', 'SLA',
  'SME', 'SOX', 'SQL', 'SRM', 'UI', 'UX', 'VAT', 'VPN', 'WIP', 'XML',
  'AP', 'AR', 'GL', 'POS', 'SKU', 'UPC', 'EQMS', 'EMS', 'QMS',
])

/**
 * Extract acronym from technology/software names
 * Patterns supported:
 * 1. "Enterprise resource planning ERP software" -> { fullName: "Enterprise resource planning software", acronym: "ERP" }
 * 2. "Human resource information system (HRIS)" -> { fullName: "Human resource information system", acronym: "HRIS" }
 * 3. "Amazon Web Services AWS software" -> { fullName: "Amazon Web Services software", acronym: "AWS" }
 * 4. "Cascading style sheets CSS" -> { fullName: "Cascading style sheets", acronym: "CSS" }
 */
function extractAcronym(name: string): { fullName: string; acronym: string | null } {
  if (!name) return { fullName: name, acronym: null }

  // Pattern 1: Acronym in parentheses - e.g., "Human resource information system (HRIS)"
  const parenMatch = name.match(/^(.+?)\s*\(([A-Z]{2,10})\)\s*(.*)$/)
  if (parenMatch) {
    const fullName = (parenMatch[1] + ' ' + parenMatch[3]).trim()
    return { fullName, acronym: parenMatch[2] }
  }

  // Pattern 2: Acronym embedded before "software/system/systems"
  // e.g., "Enterprise resource planning ERP software"
  const embeddedMatch = name.match(/^(.+?)\s+([A-Z]{2,10})\s+(software|system|systems|application|applications)$/i)
  if (embeddedMatch) {
    const fullName = `${embeddedMatch[1]} ${embeddedMatch[3]}`
    return { fullName, acronym: embeddedMatch[2] }
  }

  // Pattern 3: Acronym at end - e.g., "Cascading style sheets CSS" or "Management information systems MIS"
  const endMatch = name.match(/^(.+?)\s+([A-Z]{2,10})$/)
  if (endMatch) {
    // Make sure it's not a normal word (check if all uppercase)
    const potentialAcronym = endMatch[2]
    if (potentialAcronym === potentialAcronym.toUpperCase() && potentialAcronym.length >= 2) {
      return { fullName: endMatch[1], acronym: potentialAcronym }
    }
  }

  // Pattern 4: Acronym in the middle - e.g., "Computer aided design CAD software"
  const middleMatch = name.match(/^(.+?)\s+([A-Z]{2,10})\s+(\w+.*)$/i)
  if (middleMatch) {
    const potentialAcronym = middleMatch[2]
    // Verify it's an acronym (all uppercase, 2-10 chars)
    if (potentialAcronym === potentialAcronym.toUpperCase() && potentialAcronym.length >= 2) {
      const fullName = `${middleMatch[1]} ${middleMatch[3]}`
      return { fullName, acronym: potentialAcronym }
    }
  }

  return { fullName: name, acronym: null }
}

// Words that should NOT be part of concept IDs
const SKIP_CONCEPT_WORDS = new Set([
  'to', 'for', 'with', 'from', 'in', 'on', 'at', 'by', 'of',
  'the', 'a', 'an', 'this', 'that', 'these', 'those',
  'and', 'or', 'but', 'nor',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'has', 'have', 'had', 'having',
  'do', 'does', 'did', 'doing', 'done',
  'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could',
  'if', 'then', 'else', 'when', 'where', 'which', 'who', 'whom', 'whose',
  'all', 'any', 'both', 'each', 'every', 'few', 'many', 'most', 'no', 'none',
  'other', 'some', 'such',
])

/**
 * Clean a concept ID by removing conjunctions and verbs
 * Used for task objects that might contain unexpanded conjunctions
 * e.g., "ReviewOrApproveProjectDesignChanges" -> "ProjectDesignChanges"
 */
function cleanConceptId(conceptId: string): string | undefined {
  if (!conceptId || conceptId.length < 3) return undefined

  // Check if it contains conjunctions in the middle
  const conjMatch = conceptId.match(/^(.+?)(And|Or)([A-Z].+)$/i)
  if (conjMatch) {
    // Take the part after the conjunction as it's likely the actual object
    // e.g., "ReviewOrApproveProjectDesignChanges" -> take "ProjectDesignChanges"
    const afterConj = conjMatch[3]

    // But we might have nested conjunctions, so recurse
    const cleaned = cleanConceptId(afterConj)
    return cleaned || afterConj
  }

  // Remove leading verb patterns
  // e.g., "DetermineNeeds" -> should check if "Determine" is a verb
  const words = conceptId.match(/[A-Z][a-z]*/g) || []
  if (words.length >= 2) {
    const firstWord = words[0].toLowerCase()
    const isLikelyVerb = COMMON_VERBS.has(firstWord)
    if (isLikelyVerb) {
      // Skip the verb and return the rest
      const rest = words.slice(1).join('')
      if (rest.length >= 3) {
        return cleanConceptId(rest) || rest
      }
    }
  }

  // Skip if still contains conjunctions
  if (/[a-z](And|Or)[A-Z]/.test(conceptId)) return undefined

  // Skip if too short or too long
  if (conceptId.length < 3 || conceptId.length > 60) return undefined

  return conceptId
}

// Common verbs that shouldn't be in concept names
const COMMON_VERBS = new Set([
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
  'administer', 'restart', 'foster',
])

/**
 * Extract a clean concept ID from a complement string
 * Handles complex patterns like:
 * - "ExpectedOperations to identify DevelopmentOpportunities" -> "ExpectedOperations"
 * - "to raise capital" -> "Capital"
 * - "or investment activities" -> "InvestmentActivities"
 * - "organizations to maximize returns" -> "Organizations"
 */
function extractConceptFromComplement(complement: string): string | undefined {
  if (!complement) return undefined

  // Clean up the text
  let text = complement.trim()

  // Skip if too short
  if (text.length < 2) return undefined

  // Remove leading prepositions and conjunctions
  text = text.replace(/^(to|for|with|from|in|on|at|by|of|and|or)\s+/gi, '')

  // Check if remaining text starts with an infinitive verb pattern
  // e.g., "identify development opportunities" - skip the verb part
  const infinitiveMatch = text.match(/^(\w+)\s+(.+)$/i)
  if (infinitiveMatch) {
    const [, firstWord, rest] = infinitiveMatch
    const firstLower = firstWord.toLowerCase()
    // Check if first word looks like a verb (common verb endings)
    const isLikelyVerb = firstLower.endsWith('ize') || firstLower.endsWith('ate') ||
                         firstLower.endsWith('ify') || firstLower.endsWith('ect') ||
                         firstLower.endsWith('uce') || firstLower.endsWith('ase') ||
                         firstLower.endsWith('ure') || firstLower.endsWith('ess') ||
                         ['identify', 'find', 'create', 'develop', 'manage', 'ensure',
                          'maximize', 'minimize', 'increase', 'decrease', 'improve',
                          'maintain', 'build', 'raise', 'fund', 'address', 'achieve'].includes(firstLower)

    if (isLikelyVerb) {
      // Use the object of the infinitive verb
      text = rest
    }
  }

  // Split on "to + verb" patterns in the middle
  // e.g., "organizations to maximize returns" -> "organizations"
  const toVerbMatch = text.match(/^(.+?)\s+to\s+\w+/i)
  if (toVerbMatch) {
    const beforeTo = toVerbMatch[1].trim()
    // Use the part before "to" if it's a noun phrase
    if (beforeTo.length > 2 && !/^(and|or|the|a|an)$/i.test(beforeTo)) {
      text = beforeTo
    }
  }

  // Remove any remaining clause patterns
  text = text.replace(/\s+(to|for|with|from|in|on|at|by|of|where|which|that)\s+.*/gi, '')

  // Clean and convert to PascalCase
  const words = text
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[\s_-]+/)
    .filter((w) => w.length > 0 && !SKIP_CONCEPT_WORDS.has(w.toLowerCase()))

  if (words.length === 0) return undefined

  // Convert to PascalCase while preserving acronyms
  const conceptId = words
    .map((w) => {
      const upper = w.toUpperCase()
      if (ACRONYMS.has(upper)) return upper
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join('')

  // Skip if result is too short or too long
  if (conceptId.length < 3 || conceptId.length > 60) return undefined

  return conceptId
}

/**
 * Normalize entity names by removing common filler words
 * E.g., "All Other Miscellaneous Wood Product Manufacturing" -> "Wood Product Manufacturing"
 */
function normalizeName(name: string): string {
  if (!name) return ''

  // Patterns to strip from the beginning
  const prefixPatterns = [
    /^all\s+other\s+/i,
    /^other\s+/i,
    /^miscellaneous\s+/i,
    /^various\s+/i,
    /^unclassified\s+/i,
  ]

  // Patterns to strip from the end
  const suffixPatterns = [
    /\s*,?\s*n\.?e\.?c\.?\s*$/i,  // n.e.c. = not elsewhere classified
    /\s*,?\s*nec\s*$/i,
    /\s*\(except[^)]*\)\s*$/i,
    /\s*,?\s*except[^,]*$/i,
  ]

  let normalized = name

  // Apply prefix patterns
  for (const pattern of prefixPatterns) {
    normalized = normalized.replace(pattern, '')
  }

  // Apply suffix patterns
  for (const pattern of suffixPatterns) {
    normalized = normalized.replace(pattern, '')
  }

  // Also strip "Miscellaneous" and "Other" from the middle
  normalized = normalized
    .replace(/\s+miscellaneous\s+/gi, ' ')
    .replace(/\s+other\s+/gi, ' ')

  return normalized.trim()
}

/**
 * Generate a short name (4-8 char abbreviation) for an entity
 */
function toShortName(text: string): string {
  if (!text) return ''

  const words = text
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[\s_-]+/)
    .filter((w) => w.length > 0)

  if (words.length === 0) return ''

  // Single word: first 4-6 chars
  if (words.length === 1) {
    return words[0].slice(0, 6).toLowerCase()
  }

  // Multiple words: take first letters or first 2 chars
  if (words.length <= 4) {
    return words.map(w => w.slice(0, 2)).join('').toLowerCase().slice(0, 8)
  }

  // Many words: take first letter of each
  return words.map(w => w[0]).join('').toLowerCase().slice(0, 8)
}

// ============================================================================
// GraphDL Parser Instance (initialized once)
// ============================================================================

let graphdlParser: GraphDLParser | null = null

async function getGraphDLParser(): Promise<GraphDLParser> {
  if (!graphdlParser) {
    graphdlParser = new GraphDLParser()
    await graphdlParser.initialize()
  }
  return graphdlParser
}

/**
 * Irregular verb past tense mappings (still needed for event generation)
 */
const IRREGULAR_PAST_TENSE: Record<string, string> = {
  be: 'was', have: 'had', do: 'did', go: 'went', make: 'made',
  take: 'took', see: 'saw', get: 'got', give: 'gave', find: 'found',
  know: 'knew', think: 'thought', tell: 'told', leave: 'left',
  keep: 'kept', begin: 'began', write: 'wrote', run: 'ran',
  read: 'read', lead: 'led', build: 'built', buy: 'bought',
  bring: 'brought', hold: 'held', set: 'set', put: 'put',
  cut: 'cut', send: 'sent', spend: 'spent', meet: 'met',
  pay: 'paid', sell: 'sold', choose: 'chose', drive: 'drove',
  win: 'won', draw: 'drew', grow: 'grew', throw: 'threw',
  teach: 'taught', catch: 'caught', understand: 'understood',
}

function toPastTense(verb: string): string {
  const v = verb.toLowerCase()
  if (IRREGULAR_PAST_TENSE[v]) return IRREGULAR_PAST_TENSE[v]
  if (v.endsWith('e')) return v + 'd'
  if (v.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(v[v.length - 2])) {
    return v.slice(0, -1) + 'ied'
  }
  // Double consonant for short verbs ending in CVC
  const vowels = ['a', 'e', 'i', 'o', 'u']
  if (v.length >= 3 && v.length <= 4) {
    const last = v[v.length - 1]
    const secondLast = v[v.length - 2]
    const thirdLast = v[v.length - 3]
    if (!vowels.includes(last) && vowels.includes(secondLast) && !vowels.includes(thirdLast)) {
      if (!['w', 'x', 'y'].includes(last)) {
        return v + last + 'ed'
      }
    }
  }
  return v + 'ed'
}

// ============================================================================
// Work Domain Generation
// ============================================================================

async function generateRoles(parser: GraphDLParser): Promise<AbstractRole[]> {
  console.log('\n👔 Generating Unified Roles...')

  const roles: AbstractRole[] = []
  const seen = new Set<string>()

  // Use GraphDL NounPhraseExpander for intelligent compound name expansion
  const nounPhraseExpander = new NounPhraseExpander()

  // Helper to expand AND/OR in occupation names using GraphDL
  function expandName(name: string): string[] {
    const result = nounPhraseExpander.expand(name)
    return result.expansions
  }

  // Load JobZone relationships to enrich occupations
  const jobZoneRels = parseTSV(path.join(STANDARDS_DIR, 'relationships/ONET.Occupation.JobZone.tsv'))
  const jobZoneByCode = new Map<string, string>()
  for (const rel of jobZoneRels) {
    jobZoneByCode.set(rel.fromCode, rel.toCode)
  }

  // Helper to add role
  function addRole(
    occ: Record<string, string>,
    sourceType: string
  ): void {
    const rawName = occ.name || occ.id || ''
    if (!rawName) return

    // First normalize, then expand
    const normalizedName = normalizeName(rawName)
    const expandedNames = expandName(normalizedName)

    // Get jobZone for this occupation
    const jobZone = jobZoneByCode.get(occ.code)

    for (const expandedName of expandedNames) {
      // Apply normalization again
      const finalName = normalizeName(expandedName)
      const id = toPascalCase(finalName)
      if (!id || seen.has(id)) continue
      seen.add(id)

      roles.push({
        ns: NAMESPACES.roles,
        type: 'Role',
        id,
        name: finalName,
        description: occ.description || '',
        code: occ.code,
        shortName: toShortName(finalName),
        category: 'Occupation',
        sourceType,
        sourceCode: occ.code,
        jobZone,
      })
    }
  }

  // Load ONET Occupations from standards submodule
  const onetOccupations = parseTSV(path.join(STANDARDS_DIR, 'ONET.Occupations.tsv'))
  for (const occ of onetOccupations) {
    addRole(occ, 'ONETOccupation')
  }

  // Load BLS Occupations
  const blsOccupations = parseTSV(path.join(STANDARDS_DIR, 'BLS.Occupations.tsv'))
  for (const occ of blsOccupations) {
    addRole(occ, 'BLSOccupation')
  }

  console.log(`  📊 Generated ${roles.length} unified roles`)
  return roles
}

function generateJobs(): AbstractJob[] {
  console.log('\n💼 Generating Unified Jobs...')

  const jobs: AbstractJob[] = []
  const seen = new Set<string>()

  // Helper to add a single job entry
  function addJobEntry(
    id: string,
    name: string,
    description: string,
    code: string | undefined,
    sourceType: string,
    acronym?: string
  ): void {
    if (!id || seen.has(id)) return
    seen.add(id)

    jobs.push({
      ns: NAMESPACES.jobs,
      type: 'Job',
      id,
      name,
      description,
      code,
      shortName: acronym || toShortName(name),
      sourceType,
      occupationCode: code, // Link to parent occupation
    })
  }

  // Helper to add job with acronym expansion
  // "Chief Financial Officer (CFO)" -> ChiefFinancialOfficer + CFO
  function addJob(item: Record<string, string>, sourceType: string): void {
    const name = item.name || item.id || ''
    if (!name) return

    // Check for acronym pattern: "Full Name (ACRONYM)"
    const acronymMatch = name.match(/^(.+?)\s*\(([A-Z]{2,})\)$/)

    if (acronymMatch) {
      const fullName = acronymMatch[1].trim()
      const acronym = acronymMatch[2]

      // Add the full name version
      const fullId = toPascalCase(fullName)
      addJobEntry(fullId, name, item.description || '', item.code, sourceType, acronym)

      // Add the acronym version
      addJobEntry(acronym, name, item.description || '', item.code, sourceType, acronym)
    } else {
      // No acronym - add as-is
      const id = toPascalCase(name)
      addJobEntry(id, name, item.description || '', item.code, sourceType)
    }
  }

  // Load ONET Alternate Titles
  const alternateTitles = parseTSV(path.join(STANDARDS_DIR, 'ONET.AlternateTitles.tsv'))
  for (const title of alternateTitles) {
    addJob(title, 'ONETAlternateTitle')
  }

  // Load ONET Reported Titles
  const reportedTitles = parseTSV(path.join(STANDARDS_DIR, 'ONET.ReportedTitles.tsv'))
  for (const title of reportedTitles) {
    addJob(title, 'ONETReportedTitle')
  }

  console.log(`  📊 Generated ${jobs.length} unified jobs`)
  return jobs
}

function generateCompetencies(): AbstractCompetency[] {
  console.log('\n💪 Generating Unified Competencies...')

  const competencies: AbstractCompetency[] = []
  const seen = new Set<string>()

  const sources: Array<{
    file: string
    category: 'Skill' | 'Ability' | 'Knowledge'
    sourceType: string
  }> = [
    { file: 'ONET.Skills.tsv', category: 'Skill', sourceType: 'ONETSkill' },
    { file: 'ONET.Abilities.tsv', category: 'Ability', sourceType: 'ONETAbility' },
    { file: 'ONET.Knowledge.tsv', category: 'Knowledge', sourceType: 'ONETKnowledge' },
  ]

  for (const source of sources) {
    const data = parseTSV(path.join(STANDARDS_DIR, source.file))

    for (const item of data) {
      const id = toPascalCase(item.name || item.id || '')
      if (!id || seen.has(id)) continue
      seen.add(id)

      competencies.push({
        ns: NAMESPACES.competencies,
        type: 'Competency',
        id,
        name: item.name || '',
        description: item.description || '',
        code: item.code,
        shortName: toShortName(item.name || ''),
        category: source.category,
        sourceType: source.sourceType,
      })
    }
  }

  console.log(`  📊 Generated ${competencies.length} unified competencies`)
  return competencies
}

/**
 * Convert gerund verb to base form
 * "Getting" -> "get", "Monitoring" -> "monitor", "Identifying" -> "identify"
 */
function gerundToBase(gerund: string): string {
  const lower = gerund.toLowerCase()

  // Common verbs that appear in activities - direct mapping
  const verbMap: Record<string, string> = {
    // Irregular/special verbs
    being: 'be',
    having: 'have',
    making: 'make',
    taking: 'take',
    giving: 'give',
    coming: 'come',
    running: 'run',
    getting: 'get',
    setting: 'set',
    putting: 'put',
    cutting: 'cut',
    sitting: 'sit',
    beginning: 'begin',
    swimming: 'swim',
    winning: 'win',
    // Common activity verbs
    monitoring: 'monitor',
    processing: 'process',
    analyzing: 'analyze',
    evaluating: 'evaluate',
    developing: 'develop',
    judging: 'judge',
    using: 'use',
    managing: 'manage',
    organizing: 'organize',
    scheduling: 'schedule',
    providing: 'provide',
    communicating: 'communicate',
    coordinating: 'coordinate',
    training: 'train',
    coaching: 'coach',
    guiding: 'guide',
    assisting: 'assist',
    performing: 'perform',
    operating: 'operate',
    controlling: 'control',
    handling: 'handle',
    repairing: 'repair',
    maintaining: 'maintain',
    inspecting: 'inspect',
    documenting: 'document',
    updating: 'update',
    resolving: 'resolve',
    staffing: 'staff',
    establishing: 'establish',
    interpreting: 'interpret',
    estimating: 'estimate',
    selling: 'sell',
    thinking: 'think',
    identifying: 'identify',
    drafting: 'draft',
    working: 'work',
  }

  if (verbMap[lower]) {
    return verbMap[lower]
  }

  // Pattern: consonant + "ying" -> consonant + "y" (e.g., studying -> study)
  if (lower.endsWith('ying')) {
    return lower.slice(0, -4) + 'y'
  }

  // Pattern: doubled consonant + "ing" -> single consonant (e.g., planning -> plan)
  const doubled = lower.match(/(.)\1ing$/)
  if (doubled) {
    return lower.slice(0, -4)
  }

  // Pattern: "ating" -> "ate" (e.g., communicating -> communicate)
  if (lower.endsWith('ating')) {
    return lower.slice(0, -3) + 'e'
  }

  // Pattern: "izing" -> "ize" (e.g., organizing -> organize)
  if (lower.endsWith('izing')) {
    return lower.slice(0, -3) + 'e'
  }

  // Pattern: "ting" after vowel (not doubled) -> "te" (e.g., updating -> update)
  if (lower.endsWith('ting') && lower.length > 4) {
    const beforeT = lower.charAt(lower.length - 5)
    if ('aeiou'.includes(beforeT)) {
      return lower.slice(0, -3) + 'e'
    }
  }

  // Pattern: "sing" after vowel -> "se" (e.g., using -> use)
  if (lower.endsWith('sing') && lower.length > 4) {
    const beforeS = lower.charAt(lower.length - 5)
    if ('aeiou'.includes(beforeS)) {
      return lower.slice(0, -3) + 'e'
    }
  }

  // Pattern: "ving" -> "ve" (e.g., resolving -> resolve)
  if (lower.endsWith('ving')) {
    return lower.slice(0, -3) + 'e'
  }

  // Pattern: "ging" after vowel -> "ge" (e.g., judging -> judge)
  if (lower.endsWith('ging') && lower.length > 4) {
    const beforeG = lower.charAt(lower.length - 5)
    if ('aeiou'.includes(beforeG)) {
      return lower.slice(0, -3) + 'e'
    }
  }

  // Pattern: "cing" -> "ce" (e.g., producing -> produce)
  if (lower.endsWith('cing')) {
    return lower.slice(0, -3) + 'e'
  }

  // Default: just remove "ing"
  if (lower.endsWith('ing')) {
    return lower.slice(0, -3)
  }

  return lower
}

async function generateActivities(parser: GraphDLParser): Promise<AbstractActivity[]> {
  console.log('\n🎯 Generating Unified Activities...')

  const activities: AbstractActivity[] = []
  const seen = new Set<string>()

  // Helper to add a single activity entry
  function addActivityEntry(
    id: string,
    name: string,
    description: string,
    code: string,
    category: 'WorkActivity' | 'IWA' | 'DWA',
    level: number,
    verb: string,
    object?: string
  ): void {
    if (!id || seen.has(id)) return
    seen.add(id)

    activities.push({
      ns: NAMESPACES.activities,
      type: 'Activity',
      id,
      name,
      description,
      code,
      shortName: toShortName(name),
      category,
      sourceType: 'ONET',
      level,
      verb,
      object,
    })
  }

  // Parse activity names and expand compound patterns
  // Returns array of {verb, object} pairs
  function parseActivityName(name: string): Array<{ verb: string; object: string }> {
    const results: Array<{ verb: string; object: string }> = []

    // Handle slash-separated verbs first (e.g., "Documenting/Recording Information")
    // Split into separate activities for each verb
    const slashMatch = name.match(/^(\w+)\/(\w+)\s+(.+)$/)
    if (slashMatch) {
      const [, verb1, verb2, obj] = slashMatch
      const objPascal = toPascalCase(obj)
      results.push({ verb: gerundToBase(verb1), object: objPascal })
      results.push({ verb: gerundToBase(verb2), object: objPascal })
      return results
    }

    // Pattern 1: "Verb1, Verb2, and Verb3 Object" (multiple verbs, same object)
    // e.g., "Organizing, Planning, and Prioritizing Work"
    const multiVerbMatch = name.match(/^(\w+),\s*(\w+),?\s*and\s+(\w+)\s+(.+)$/i)
    if (multiVerbMatch) {
      const [, v1, v2, v3, obj] = multiVerbMatch
      const objPascal = toPascalCase(obj)
      results.push({ verb: gerundToBase(v1), object: objPascal })
      results.push({ verb: gerundToBase(v2), object: objPascal })
      results.push({ verb: gerundToBase(v3), object: objPascal })
      return results
    }

    // Pattern 2: "Verb1 and Verb2 Object" (two verbs with AND)
    // e.g., "Repairing and Maintaining Mechanical Equipment"
    const twoVerbMatch = name.match(/^(\w+)\s+and\s+(\w+)\s+(.+)$/i)
    if (twoVerbMatch) {
      const [, v1, v2, obj] = twoVerbMatch
      const objPascal = toPascalCase(obj)
      results.push({ verb: gerundToBase(v1), object: objPascal })
      results.push({ verb: gerundToBase(v2), object: objPascal })
      return results
    }

    // Pattern 3: "Verb Object1, Object2, or Object3" (single verb, multiple objects with OR)
    // e.g., "Monitoring Processes, Materials, or Surroundings"
    const multiObjOrMatch = name.match(/^(\w+)\s+(.+?),\s*(.+?),?\s*or\s+(.+)$/i)
    if (multiObjOrMatch) {
      const [, verb, obj1, obj2, obj3] = multiObjOrMatch
      const baseVerb = gerundToBase(verb)
      results.push({ verb: baseVerb, object: toPascalCase(obj1) })
      results.push({ verb: baseVerb, object: toPascalCase(obj2) })
      results.push({ verb: baseVerb, object: toPascalCase(obj3) })
      return results
    }

    // Pattern 4: "Verb Object1, Object2, and Object3" (single verb, multiple objects with AND)
    // e.g., "Identifying Objects, Actions, and Events"
    const multiObjAndMatch = name.match(/^(\w+)\s+(.+?),\s*(.+?),?\s*and\s+(.+)$/i)
    if (multiObjAndMatch) {
      const [, verb, obj1, obj2, obj3] = multiObjAndMatch
      const baseVerb = gerundToBase(verb)
      results.push({ verb: baseVerb, object: toPascalCase(obj1) })
      results.push({ verb: baseVerb, object: toPascalCase(obj2) })
      results.push({ verb: baseVerb, object: toPascalCase(obj3) })
      return results
    }

    // Pattern 5: "Verb Object1 or Object2" (single verb, two objects with OR)
    // e.g., "Analyzing Data or Information"
    const twoObjOrMatch = name.match(/^(\w+)\s+(.+?)\s+or\s+(.+)$/i)
    if (twoObjOrMatch) {
      const [, verb, obj1, obj2] = twoObjOrMatch
      const baseVerb = gerundToBase(verb)
      results.push({ verb: baseVerb, object: toPascalCase(obj1) })
      results.push({ verb: baseVerb, object: toPascalCase(obj2) })
      return results
    }

    // Pattern 6: "Verb Object1 and Object2" (single verb, two objects with AND)
    // e.g., "Making Decisions and Solving Problems" - but this is actually two verbs!
    // Need to be careful here - check if second part starts with a gerund
    const andMatch = name.match(/^(\w+)\s+(.+?)\s+and\s+(.+)$/i)
    if (andMatch) {
      const [, verb, obj1, rest] = andMatch
      // Check if "rest" starts with a gerund (another verb)
      const restWords = rest.split(/\s+/)
      if (restWords[0] && restWords[0].match(/ing$/i)) {
        // Two verb phrases: "Making Decisions" and "Solving Problems"
        const baseVerb1 = gerundToBase(verb)
        const baseVerb2 = gerundToBase(restWords[0])
        const obj2 = restWords.slice(1).join(' ')
        results.push({ verb: baseVerb1, object: toPascalCase(obj1) })
        results.push({ verb: baseVerb2, object: toPascalCase(obj2) })
        return results
      } else {
        // Single verb with two objects
        const baseVerb = gerundToBase(verb)
        results.push({ verb: baseVerb, object: toPascalCase(obj1) })
        results.push({ verb: baseVerb, object: toPascalCase(rest) })
        return results
      }
    }

    // Default: simple "Verb Object" pattern
    const words = name.split(/\s+/)
    if (words.length === 0) return results

    const gerundVerb = words[0].replace(/,/g, '')
    const baseVerb = gerundToBase(gerundVerb)
    const objectPart = words.slice(1).join(' ')
    const objectPascal = toPascalCase(objectPart)

    results.push({ verb: baseVerb, object: objectPascal })
    return results
  }

  // Helper to add activity with expansion
  function addActivity(
    item: Record<string, string>,
    category: 'WorkActivity' | 'IWA' | 'DWA',
    level: number
  ): void {
    const name = item.name || item.id || ''
    if (!name) return

    const code = item.code || ''
    const description = item.description || ''

    // Parse and expand the activity name
    const parsed = parseActivityName(name)

    for (const { verb, object } of parsed) {
      const id = object ? `${verb}.${object}` : verb
      addActivityEntry(id, name, description, code, category, level, verb, object || undefined)
    }
  }

  // Load WorkActivities (level 1 - top level)
  const workActivities = parseTSV(path.join(STANDARDS_DIR, 'ONET.WorkActivities.tsv'))
  for (const item of workActivities) {
    addActivity(item, 'WorkActivity', 1)
  }

  // Load IWA - Intermediate Work Activities (level 2)
  const iwaPath = path.join(STANDARDS_DIR, 'ONET.IntermediateWorkActivities.tsv')
  if (fs.existsSync(iwaPath)) {
    const iwaActivities = parseTSV(iwaPath)
    for (const item of iwaActivities) {
      addActivity(item, 'IWA', 2)
    }
  }

  // Load DWA - Detailed Work Activities (level 3)
  const dwaPath = path.join(STANDARDS_DIR, 'ONET.DetailedWorkActivities.tsv')
  if (fs.existsSync(dwaPath)) {
    const dwaActivities = parseTSV(dwaPath)
    for (const item of dwaActivities) {
      addActivity(item, 'DWA', 3)
    }
  }

  console.log(`  📊 Generated ${activities.length} unified activities`)
  return activities
}

function generateContexts(): AbstractContext[] {
  console.log('\n🌐 Generating Unified Contexts...')

  const contexts: AbstractContext[] = []
  const seen = new Set<string>()

  // Helper to expand comma/or separated names
  // "Dealing With Unpleasant, Angry, or Discourteous People" ->
  // ["Dealing With Unpleasant People", "Dealing With Angry People", "Dealing With Discourteous People"]
  function expandContextName(name: string): string[] {
    // Pattern: "Verb X, Y, or Z Suffix" - need to distribute the suffix
    // Look for patterns like "Dealing With X, Y, or Z People"
    const withPattern = /^(.+?)\s+(with|to)\s+(.+?),\s+(.+?),?\s+or\s+(.+?)\s+(\w+)$/i
    const match = name.match(withPattern)
    if (match) {
      const [, prefix, prep, first, second, third, suffix] = match
      return [
        `${prefix} ${prep} ${first} ${suffix}`,
        `${prefix} ${prep} ${second} ${suffix}`,
        `${prefix} ${prep} ${third} ${suffix}`,
      ]
    }

    // Simpler pattern: "X, Y, or Z Suffix" without prefix
    const simplePattern = /^(.+?),\s+(.+?),?\s+or\s+(.+?)\s+(\w+)$/i
    const simpleMatch = name.match(simplePattern)
    if (simpleMatch) {
      const [, first, second, third, suffix] = simpleMatch
      return [
        `${first} ${suffix}`,
        `${second} ${suffix}`,
        `${third} ${suffix}`,
      ]
    }

    // Two-item pattern: "X or Y Suffix"
    const twoPattern = /^(.+?)\s+(with|to)\s+(.+?)\s+or\s+(.+?)\s+(\w+)$/i
    const twoMatch = name.match(twoPattern)
    if (twoMatch) {
      const [, prefix, prep, first, second, suffix] = twoMatch
      return [
        `${prefix} ${prep} ${first} ${suffix}`,
        `${prefix} ${prep} ${second} ${suffix}`,
      ]
    }

    return [name]
  }

  // Helper to add context
  function addContext(item: Record<string, string>): void {
    const rawName = item.name || item.id || ''
    if (!rawName) return

    // Extract category from description if available
    let category: string | undefined
    const desc = item.description || ''
    const categoryMatch = desc.match(/Category:\s*([^|,]+)/i)
    if (categoryMatch) {
      category = categoryMatch[1].trim()
      if (category === 'n/a') category = undefined
    }

    const expandedNames = expandContextName(rawName)
    for (const name of expandedNames) {
      const id = toPascalCase(name)
      if (!id || seen.has(id)) continue
      seen.add(id)

      contexts.push({
        ns: NAMESPACES.contexts,
        type: 'Context',
        id,
        name,
        description: desc.replace(/Category:\s*[^|,]+/i, '').trim(),
        code: item.code,
        shortName: toShortName(name),
        category,
        sourceType: 'ONET',
      })
    }
  }

  // Load Work Contexts
  const workContexts = parseTSV(path.join(STANDARDS_DIR, 'ONET.WorkContext.tsv'))
  for (const item of workContexts) {
    addContext(item)
  }

  console.log(`  📊 Generated ${contexts.length} unified contexts`)
  return contexts
}

/**
 * Generate Tasks using GraphDL semantic parsing
 * Tasks are parsed into action.Object format like Actions
 */
async function generateTasks(parser: GraphDLParser): Promise<AbstractTask[]> {
  console.log('\n📋 Generating Unified Tasks (GraphDL parsing)...')

  const tasks: AbstractTask[] = []
  const seen = new Set<string>()

  // Helper to add a parsed task
  function addTask(
    stmt: ParsedStatement,
    sourceText: string,
    code: string,
    sourceType: string
  ): void {
    if (!stmt.predicate || !stmt.object) return

    // Generate Task ID using GraphDL parser (camelCase verb, PascalCase objects)
    const taskId = parser.toGraphDL(stmt)
    if (!taskId || seen.has(taskId)) return
    seen.add(taskId)

    const objectPascal = toPascalCase(stmt.object)
    // Extract clean concept ID from complement (handles infinitives, prepositions, etc.)
    const prepObjectConcept = stmt.complement ? extractConceptFromComplement(stmt.complement) : undefined

    tasks.push({
      ns: NAMESPACES.tasks,
      type: 'Task',
      id: taskId,
      name: `${stmt.predicate} ${stmt.object}`,
      description: sourceText,
      code,
      shortName: toShortName(`${stmt.predicate} ${stmt.object}`),
      verb: stmt.predicate.toLowerCase(),
      object: objectPascal,
      preposition: stmt.preposition,
      prepObject: prepObjectConcept,
      source: sourceText,
      sourceType,
    })
  }

  // Load ONET Tasks
  // NOTE: Use description (full text) instead of name (truncated) for parsing
  const onetTasks = parseTSV(path.join(STANDARDS_DIR, 'ONET.Tasks.tsv'))
  for (const task of onetTasks) {
    const sourceText = task.description || task.name || ''
    if (!sourceText) continue

    const parsed = parser.parse(sourceText)

    // Process all expansions (AND/OR cartesian products)
    if (parsed.expansions && parsed.expansions.length > 0) {
      for (const expansion of parsed.expansions) {
        addTask(expansion, sourceText, task.code || '', 'ONETTask')
      }
    } else {
      addTask(parsed, sourceText, task.code || '', 'ONETTask')
    }
  }

  // Load Work Activities
  // NOTE: Use description (full text) instead of name (truncated) for parsing
  const workActivities = parseTSV(path.join(STANDARDS_DIR, 'ONET.WorkActivities.tsv'))
  for (const activity of workActivities) {
    const sourceText = activity.description || activity.name || ''
    if (!sourceText) continue

    const parsed = parser.parse(sourceText)

    if (parsed.expansions && parsed.expansions.length > 0) {
      for (const expansion of parsed.expansions) {
        addTask(expansion, sourceText, activity.code || '', 'ONETWorkActivity')
      }
    } else {
      addTask(parsed, sourceText, activity.code || '', 'ONETWorkActivity')
    }
  }

  console.log(`  📊 Generated ${tasks.length} unified tasks`)
  return tasks
}

/**
 * Generate Actions and Events using @graphdl/semantics parser
 * Includes source task references for debugging
 */
async function generateActionsAndEvents(
  tasks: AbstractTask[],
  parser: GraphDLParser
): Promise<{
  actions: AbstractAction[]
  events: AbstractEvent[]
  taskActionRels: Relationship[]
  actionEventRels: Relationship[]
}> {
  console.log('\n⚡ Generating Actions and Events (GraphDL semantic parsing)...')

  const actionMap = new Map<string, AbstractAction>()
  const eventMap = new Map<string, AbstractEvent>()
  const taskActionRels: Relationship[] = []
  const actionEventRels: Relationship[] = []

  /**
   * Process a single parsed statement into action and event
   */
  function processStatement(
    stmt: ParsedStatement,
    task: AbstractTask,
    sourceText: string
  ): void {
    if (!stmt.predicate || !stmt.object) return

    // Generate GraphDL ID using the parser
    const graphdlId = parser.toGraphDL(stmt)

    // Convert object to PascalCase for proper IDs
    const objectPascal = toPascalCase(stmt.object)
    const complementPascal = stmt.complement ? toPascalCase(stmt.complement) : undefined

    // Create action
    if (!actionMap.has(graphdlId)) {
      const prepPhrase = stmt.preposition && stmt.complement
        ? ` ${stmt.preposition} ${stmt.complement}`
        : ''

      actionMap.set(graphdlId, {
        ns: NAMESPACES.actions,
        type: 'Action',
        id: graphdlId,
        name: `${stmt.predicate} ${stmt.object}${prepPhrase}`,
        description: stmt.original,
        shortName: toShortName(`${stmt.predicate} ${stmt.object}`),
        verb: stmt.predicate.toLowerCase(),
        object: objectPascal,
        preposition: stmt.preposition,
        prepObject: complementPascal,
        source: sourceText, // Original source text for debugging
      })
    }

    // Task → Action relationship
    taskActionRels.push({
      from: `https://${NAMESPACES.tasks}/${task.id}`,
      to: `https://${NAMESPACES.actions}/${graphdlId}`,
      predicate: 'hasAction',
      reverse: 'actionOf',
    })

    // Create Event in GraphDL format: Object.pastTense
    const pastTense = toPastTense(stmt.predicate.toLowerCase())
    const eventId = `${objectPascal}.${pastTense}`

    if (!eventMap.has(eventId)) {
      eventMap.set(eventId, {
        ns: NAMESPACES.events,
        type: 'Event',
        id: eventId,
        name: `${objectPascal} ${pastTense}`,
        description: `${objectPascal} was ${pastTense}`,
        shortName: toShortName(`${objectPascal} ${pastTense}`),
        pastTense,
        verb: stmt.predicate.toLowerCase(),
        object: objectPascal,
        source: sourceText, // Original source text for debugging
        sourceActionId: graphdlId,
      })
    }

    // Action → Event relationship
    actionEventRels.push({
      from: `https://${NAMESPACES.actions}/${graphdlId}`,
      to: `https://${NAMESPACES.events}/${eventId}`,
      predicate: 'produces',
      reverse: 'producedBy',
    })
  }

  for (const task of tasks) {
    // Parse task source using GraphDL parser
    // Use task.source (full text) instead of task.name (which is formatted)
    const sourceText = task.source || task.description || task.name || ''
    const parsed = parser.parse(sourceText)

    // If there are expansions (from AND/OR), process each one
    if (parsed.expansions && parsed.expansions.length > 0) {
      for (const expansion of parsed.expansions) {
        processStatement(expansion, task, sourceText)
      }
    } else {
      // No expansions, process the single parsed statement
      processStatement(parsed, task, sourceText)
    }
  }

  const actions = Array.from(actionMap.values())
  const events = Array.from(eventMap.values())

  console.log(`  📊 Generated ${actions.length} actions, ${events.length} events`)

  return { actions, events, taskActionRels, actionEventRels }
}

// ============================================================================
// Business Domain Generation
// ============================================================================

async function generateIndustries(parser: GraphDLParser): Promise<AbstractIndustry[]> {
  console.log('\n🏭 Generating Unified Industries...')

  const industries: AbstractIndustry[] = []
  const seen = new Set<string>()

  // Use GraphDL NounPhraseExpander for intelligent compound name expansion
  const nounPhraseExpander = new NounPhraseExpander()

  // Helper to expand AND/OR in industry names using GraphDL
  function expandName(name: string): string[] {
    const result = nounPhraseExpander.expand(name)
    return result.expansions
  }

  // Helper to add industry from any source
  function addIndustry(item: Record<string, string>, level: number, sourceType: string): void {
    const name = item.name || item.id || ''
    if (!name) return

    // First normalize, then expand
    const normalizedName = normalizeName(name)
    const expandedNames = expandName(normalizedName)

    for (const expandedName of expandedNames) {
      // Apply normalization again to each expanded name
      const finalName = normalizeName(expandedName)
      const id = toPascalCase(finalName)
      if (!id || seen.has(id)) continue
      seen.add(id)

      industries.push({
        ns: NAMESPACES.industries,
        type: 'Industry',
        id,
        name: finalName,
        description: item.description || '',
        code: item.code,
        shortName: toShortName(finalName),
        sourceType,
        level,
      })
    }
  }

  // Load all NAICS levels from unified Industries file
  // The type column indicates level: Sector, Subsector, IndustryGroup, NAICSIndustry, NationalIndustry
  const naicsData = parseTSV(path.join(STANDARDS_DIR, 'NAICS.Industries.tsv'))

  // Map type to level
  const typeToLevel: Record<string, number> = {
    'Sector': 1,
    'Subsector': 2,
    'IndustryGroup': 3,
    'NAICSIndustry': 4,
    'NationalIndustry': 5,
  }

  for (const item of naicsData) {
    const level = typeToLevel[item.type] || 4
    addIndustry(item, level, 'NAICS')
  }

  // Load SIC codes (SEC Standard Industrial Classification)
  const sicData = parseTSV(path.join(STANDARDS_DIR, 'SEC.SICCodes.tsv'))
  for (const item of sicData) {
    // SIC codes are 4-digit, determine level from code length
    const code = item.code || ''
    let level = 4
    if (code.length === 2) level = 1 // Division
    else if (code.length === 3) level = 2 // Major Group
    else level = 4 // Industry

    addIndustry(item, level, 'SIC')
  }

  console.log(`  📊 Generated ${industries.length} unified industries`)
  return industries
}

function generateProcesses(): AbstractProcess[] {
  console.log('\n⚙️ Generating Unified Processes...')

  const processes: AbstractProcess[] = []
  const seen = new Set<string>()

  // Helper to add process
  function addProcess(item: Record<string, string>, level: number): void {
    const id = toPascalCase(item.name || item.id || '')
    if (!id || seen.has(id)) return
    seen.add(id)

    processes.push({
      ns: NAMESPACES.process,
      type: 'Process',
      id,
      name: item.name || '',
      description: item.description || '',
      code: item.code,
      shortName: toShortName(item.name || ''),
      sourceType: 'APQC',
      level,
      industry: item.industry,
    })
  }

  // APQC Processes - determine level from code structure
  const data = parseTSV(path.join(STANDARDS_DIR, 'APQC.Processes.tsv'))
  for (const item of data) {
    const code = item.code || ''
    let level = 3 // default
    if (code.match(/^\d+$/)) level = 1
    else if (code.match(/^\d+\.\d+$/)) level = 2
    else if (code.match(/^\d+\.\d+\.\d+$/)) level = 3
    else if (code.match(/^\d+\.\d+\.\d+\.\d+/)) level = 4

    addProcess(item, level)
  }

  console.log(`  📊 Generated ${processes.length} unified processes`)
  return processes
}

async function generateProducts(parser: GraphDLParser): Promise<AbstractProduct[]> {
  console.log('\n📦 Generating Unified Products...')

  const products: AbstractProduct[] = []
  const seen = new Set<string>()

  // Helper to expand AND/OR in product names
  function expandName(name: string): string[] {
    // First, clean up the name by simplifying parenthetical content
    // "Vegetables (Non Leaf) - Unprepared/Unprocessed (Fresh)"
    // → "Vegetables Non Leaf - Unprepared/Unprocessed Fresh"
    let cleanName = name
      .replace(/\s*\(([^)]+)\)\s*/g, ' $1 ')  // Remove parens but keep content
      .replace(/\s+/g, ' ')
      .trim()

    // Handle hyphen-separated sections: "X - Y/Z" → expand Y/Z
    if (cleanName.includes(' - ')) {
      const parts = cleanName.split(/\s+-\s+/)
      if (parts.length >= 2) {
        // Get the base (before hyphen) and modifiers (after hyphen)
        const base = parts[0].trim()
        const modifierSection = parts.slice(1).join(' ').trim()

        // Expand slashes in the modifier section
        if (modifierSection.includes('/')) {
          const modifiers = modifierSection.split(/\s*\/\s*/)
            .map(m => m.trim())
            .filter(m => m.length > 0)

          if (modifiers.length > 1) {
            // Create combinations: base + each modifier
            return modifiers.map(m => `${base} ${m}`)
          }
        }

        // If no slash expansion, just combine
        return [`${base} ${modifierSection}`]
      }
    }

    // Try comma-separated (with optional "and" before last item)
    if (cleanName.includes(',')) {
      const parts = cleanName.split(/\s*,\s*(?:and\s+)?/i)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      const allShort = parts.every(p => p.split(/\s+/).length <= 4)
      if (allShort && parts.length > 1) return parts
    }

    // Try slash-separated with shared suffix: "X/Y/Z Suffix" → ["X Suffix", "Y Suffix", "Z Suffix"]
    // Example: "Meat/Poultry/Other Animals Unprocessed" → ["Meat Unprocessed", "Poultry Unprocessed", "Other Animals Unprocessed"]
    if (cleanName.includes('/')) {
      // Check for pattern: "A/B/C Suffix" where Suffix is the last word(s)
      const slashMatch = cleanName.match(/^(.+?\/[^\/]+)\s+(\w+(?:\s+\w+)?)$/)
      if (slashMatch) {
        const [, slashPart, suffix] = slashMatch
        const parts = slashPart.split(/\s*\/\s*/)
          .map(p => p.trim())
          .filter(p => p.length > 0)

        if (parts.length > 1) {
          return parts.map(p => `${p} ${suffix}`)
        }
      }

      // Simple slash-separated (no shared suffix)
      const parts = cleanName.split(/\s*\/\s*/)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      const allShort = parts.every(p => p.split(/\s+/).length <= 4)
      if (allShort && parts.length > 1) return parts
    }

    // Try "X and Y Suffix" pattern: "Drink and Accommodation Services" → ["Drink Services", "Accommodation Services"]
    const andMatch = cleanName.match(/^(.+?)\s+and\s+(.+?)\s+(\w+)$/i)
    if (andMatch) {
      const [, first, second, suffix] = andMatch
      // Only expand if the suffix is a common word like "Services", "Products", "Equipment", etc.
      const commonSuffixes = ['services', 'products', 'equipment', 'supplies', 'materials', 'systems', 'devices', 'tools']
      if (commonSuffixes.includes(suffix.toLowerCase())) {
        return [`${first} ${suffix}`, `${second} ${suffix}`]
      }
    }

    return [cleanName]
  }

  // Helper to add product from any source
  function addProduct(item: Record<string, string>, source: string, level: number): void {
    let name = item.name || item.id || ''
    if (!name) return

    // Skip items where name appears to be a description (too long)
    // This handles GS1 data quality issues where descriptions are in the name field
    if (name.length > 100) {
      // Try using the sameAs field as the actual name (GS1 has short names there)
      if (item.sameAs && item.sameAs.length > 0 && item.sameAs.length < 100) {
        name = item.sameAs
      } else {
        // Skip entirely - this is bad data
        return
      }
    }

    // Expand AND/OR in names
    const expandedNames = expandName(name)

    for (const expandedName of expandedNames) {
      const id = toPascalCase(expandedName)
      if (!id || seen.has(id)) continue
      seen.add(id)

      products.push({
        ns: NAMESPACES.products,
        type: 'Product',
        id,
        name: expandedName,
        description: item.description || '',
        code: item.code,
        shortName: toShortName(expandedName),
        sourceType: source,
        level,
      })
    }
  }

  // GS1 GPC hierarchy (focused on retail/consumer products)
  const gs1Segments = parseTSV(path.join(STANDARDS_DIR, 'GS1.Segments.tsv'))
  gs1Segments.forEach(item => addProduct(item, 'GS1', 1))

  const gs1Families = parseTSV(path.join(STANDARDS_DIR, 'GS1.Families.tsv'))
  gs1Families.forEach(item => addProduct(item, 'GS1', 2))

  const gs1Classes = parseTSV(path.join(STANDARDS_DIR, 'GS1.Classes.tsv'))
  gs1Classes.forEach(item => addProduct(item, 'GS1', 3))

  const gs1Bricks = parseTSV(path.join(STANDARDS_DIR, 'GS1.Bricks.tsv'))
  gs1Bricks.forEach(item => addProduct(item, 'GS1', 4))

  // UNSPSC hierarchy (broader B2B product classification)
  const unspscSegments = parseTSV(path.join(STANDARDS_DIR, 'UNSPSC.Segments.tsv'))
  unspscSegments.forEach(item => addProduct(item, 'UNSPSC', 1))

  const unspscFamilies = parseTSV(path.join(STANDARDS_DIR, 'UNSPSC.Families.tsv'))
  unspscFamilies.forEach(item => addProduct(item, 'UNSPSC', 2))

  const unspscClasses = parseTSV(path.join(STANDARDS_DIR, 'UNSPSC.Classes.tsv'))
  unspscClasses.forEach(item => addProduct(item, 'UNSPSC', 3))

  // Note: UNSPSC.Commodities has 150K+ items - consider if needed
  // const unspscCommodities = parseTSV(path.join(STANDARDS_DIR, 'UNSPSC.Commodities.tsv'))
  // unspscCommodities.forEach(item => addProduct(item, 'UNSPSC', 4))

  console.log(`  📊 Generated ${products.length} unified products`)
  return products
}

async function generateServices(parser: GraphDLParser): Promise<AbstractService[]> {
  console.log('\n🛎️ Generating Unified Services...')

  const services: AbstractService[] = []
  const seen = new Set<string>()

  // Helper to check if NAPCS code is a service (codes 500+ are services)
  function isServiceCode(code: string): boolean {
    const numCode = parseInt(code, 10)
    return numCode >= 500
  }

  // Helper to expand AND/OR in service names
  function expandName(name: string): string[] {
    // First try comma-separated (with optional "and" before last item)
    if (name.includes(',')) {
      const parts = name.split(/\s*,\s*(?:and\s+)?/i)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      const allShort = parts.every(p => p.split(/\s+/).length <= 3)
      if (allShort && parts.length > 1) return parts
    }

    // Try slash-separated
    if (name.includes('/')) {
      const parts = name.split(/\s*\/\s*/)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      const allShort = parts.every(p => p.split(/\s+/).length <= 3)
      if (allShort && parts.length > 1) return parts
    }

    return [name]
  }

  // Helper to add service
  function addService(item: Record<string, string>, source: string, level: number): void {
    const name = item.name || item.id || ''
    if (!name) return

    const expandedNames = expandName(name)

    for (const expandedName of expandedNames) {
      const id = toPascalCase(expandedName)
      if (!id || seen.has(id)) continue
      seen.add(id)

      services.push({
        ns: NAMESPACES.services,
        type: 'Service',
        id,
        name: expandedName,
        description: item.description || '',
        code: item.code,
        shortName: toShortName(expandedName),
        sourceType: source,
        level,
      })
    }
  }

  // NAPCS Groups - only service categories (code >= 500)
  const napcsGroups = parseTSV(path.join(STANDARDS_DIR, 'NAPCS.Groups.tsv'))
  napcsGroups
    .filter(item => isServiceCode(item.code || ''))
    .forEach(item => addService(item, 'NAPCS', 1))

  // NAPCS Products - only services (code starting with 5+)
  const napcsProducts = parseTSV(path.join(STANDARDS_DIR, 'NAPCS.Products.tsv'))
  napcsProducts
    .filter(item => isServiceCode((item.code || '').slice(0, 3)))
    .forEach(item => addService(item, 'NAPCS', 2))

  console.log(`  📊 Generated ${services.length} unified services`)
  return services
}

// ============================================================================
// Technology Domain Generation
// ============================================================================

function generateTech(): AbstractTech[] {
  console.log('\n💻 Generating Unified Tech...')

  const tech: AbstractTech[] = []
  const seen = new Set<string>()
  let acronymCount = 0

  // Load ONET Technologies
  const technologies = parseTSV(path.join(STANDARDS_DIR, 'ONET.Technologies.tsv'))
  for (const item of technologies) {
    const name = item.name || item.id || ''
    if (!name) continue

    // Extract acronym from name
    const { fullName, acronym } = extractAcronym(name)

    // Create the primary entry with the full name (with acronym removed)
    const primaryId = toPascalCase(fullName)
    if (!primaryId || seen.has(primaryId)) continue
    seen.add(primaryId)

    const primaryEntry: AbstractTech = {
      ns: NAMESPACES.tech,
      type: 'Tech',
      id: primaryId,
      name: fullName,
      description: item.description || '',
      code: item.code,
      shortName: toShortName(fullName),
      sourceType: 'ONET',
      unspscCode: item.code,
      acronym: acronym || '', // Always include the field
      sameAs: '', // Always include the field
    }
    tech.push(primaryEntry)

    // If there's an acronym, create an alias entry
    if (acronym) {
      const acronymId = acronym // Keep acronym as-is for the ID
      if (!seen.has(acronymId)) {
        seen.add(acronymId)
        acronymCount++

        tech.push({
          ns: NAMESPACES.tech,
          type: 'Tech',
          id: acronymId,
          name: acronym,
          description: `Alias for ${fullName}`,
          code: item.code,
          shortName: acronym.toLowerCase(),
          sourceType: 'ONET',
          unspscCode: item.code,
          acronym: '', // Empty for alias entries
          sameAs: primaryId, // Link back to the full name entry
        })
      }
    }
  }

  console.log(`  📊 Generated ${tech.length} unified tech (${acronymCount} acronym aliases)`)
  return tech
}

function generateTools(): AbstractTool[] {
  console.log('\n🔧 Generating Unified Tools...')

  const tools: AbstractTool[] = []
  const seen = new Set<string>()

  // Load ONET Tools
  const onetTools = parseTSV(path.join(STANDARDS_DIR, 'ONET.Tools.tsv'))
  for (const item of onetTools) {
    const name = item.name || item.id || ''
    if (!name) continue

    const id = toPascalCase(name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    tools.push({
      ns: NAMESPACES.tools,
      type: 'Tool',
      id,
      name,
      description: item.description || '',
      code: item.code,
      shortName: toShortName(name),
      sourceType: 'ONET',
      unspscCode: item.code,
    })
  }

  console.log(`  📊 Generated ${tools.length} unified tools`)
  return tools
}

// ============================================================================
// Supply Chain Domain Generation (GS1)
// ============================================================================

function generateBusinessSteps(): AbstractBusinessStep[] {
  console.log('\n📦 Generating Business Steps (GS1)...')

  const steps: AbstractBusinessStep[] = []
  const seen = new Set<string>()

  const data = parseTSV(path.join(STANDARDS_DIR, 'GS1.BusinessSteps.tsv'))
  for (const item of data) {
    const name = item.name || item.id || ''
    if (!name) continue

    const id = toPascalCase(name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    // Extract verb from description if available (e.g., "accept Goods. Accepting")
    let verb: string | undefined
    const desc = item.description || ''
    const verbMatch = desc.match(/^(\w+)\s/)
    if (verbMatch) {
      verb = verbMatch[1].toLowerCase()
    }

    steps.push({
      ns: NAMESPACES.businessSteps,
      type: 'BusinessStep',
      id,
      name,
      description: desc,
      code: item.code,
      shortName: toShortName(name),
      sourceType: 'GS1',
      verb,
    })
  }

  console.log(`  📊 Generated ${steps.length} business steps`)
  return steps
}

function generateDispositions(): AbstractDisposition[] {
  console.log('\n📋 Generating Dispositions (GS1)...')

  const dispositions: AbstractDisposition[] = []
  const seen = new Set<string>()

  const data = parseTSV(path.join(STANDARDS_DIR, 'GS1.Dispositions.tsv'))
  for (const item of data) {
    const name = item.name || item.id || ''
    if (!name) continue

    const id = toPascalCase(name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    dispositions.push({
      ns: NAMESPACES.dispositions,
      type: 'Disposition',
      id,
      name,
      description: item.description || name,
      code: item.code,
      shortName: toShortName(name),
      sourceType: 'GS1',
    })
  }

  console.log(`  📊 Generated ${dispositions.length} dispositions`)
  return dispositions
}

function generateIdentifierTypes(): AbstractIdentifierType[] {
  console.log('\n🔖 Generating Identifier Types (GS1)...')

  const identifiers: AbstractIdentifierType[] = []
  const seen = new Set<string>()

  const data = parseTSV(path.join(STANDARDS_DIR, 'GS1.IdentifierTypes.tsv'))
  for (const item of data) {
    const name = item.name || item.id || ''
    if (!name) continue

    const id = toPascalCase(name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    identifiers.push({
      ns: NAMESPACES.identifierTypes,
      type: 'IdentifierType',
      id,
      name,
      description: item.description || name,
      code: item.code,
      shortName: item.code || toShortName(name),
      sourceType: 'GS1',
    })
  }

  console.log(`  📊 Generated ${identifiers.length} identifier types`)
  return identifiers
}

function generateLocationTypes(): AbstractLocationType[] {
  console.log('\n🏢 Generating Location Types (GS1)...')

  const locationTypes: AbstractLocationType[] = []
  const seen = new Set<string>()

  const data = parseTSV(path.join(STANDARDS_DIR, 'GS1.LocationTypes.tsv'))
  for (const item of data) {
    const name = item.name || item.id || ''
    if (!name) continue

    const id = toPascalCase(name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    locationTypes.push({
      ns: NAMESPACES.locationTypes,
      type: 'LocationType',
      id,
      name,
      description: item.description || name,
      code: item.code,
      shortName: toShortName(name),
      sourceType: 'GS1',
    })
  }

  console.log(`  📊 Generated ${locationTypes.length} location types`)
  return locationTypes
}

/**
 * Convert text to camelCase ID (for attributes/properties)
 * Handles slashes, spaces, and other separators properly
 */
function toCamelCase(text: string): string {
  if (!text) return ''
  // Split on common separators: space, slash, hyphen, underscore
  const words = text
    .replace(/[^\w\s\-\/]/g, '')
    .split(/[\s\-\_\/]+/)
    .filter((w) => w.length > 0)

  if (words.length === 0) return ''

  // First word lowercase, rest title case
  return words
    .map((w, i) => {
      if (i === 0) {
        return w.toLowerCase()
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join('')
}

function generateProductAttributes(): AbstractProductAttribute[] {
  console.log('\n🏷️ Generating Product Attributes (GS1)...')

  const attributes: AbstractProductAttribute[] = []
  const seen = new Set<string>()

  const data = parseTSV(path.join(STANDARDS_DIR, 'GS1.Attributes.tsv'))
  for (const item of data) {
    const name = item.name || item.id || ''
    if (!name) continue

    // Use camelCase for attribute IDs
    const id = toCamelCase(name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    attributes.push({
      ns: NAMESPACES.productAttributes,
      type: 'ProductAttribute',
      id,
      name,
      description: item.description || name,
      code: item.code,
      shortName: toShortName(name),
      sourceType: 'GS1',
    })
  }

  console.log(`  📊 Generated ${attributes.length} product attributes`)
  return attributes
}

// ============================================================================
// Work Preferences Domain Generation (ONET)
// ============================================================================

function generateWorkStyles(): AbstractWorkStyle[] {
  console.log('\n🎨 Generating Work Styles (ONET)...')

  const styles: AbstractWorkStyle[] = []
  const seen = new Set<string>()

  const data = parseTSV(path.join(STANDARDS_DIR, 'ONET.WorkStyles.tsv'))
  for (const item of data) {
    const name = item.name || item.id || ''
    if (!name) continue

    const id = toPascalCase(name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    styles.push({
      ns: NAMESPACES.workStyles,
      type: 'WorkStyle',
      id,
      name,
      description: item.description || name,
      code: item.code,
      shortName: toShortName(name),
      sourceType: 'ONET',
    })
  }

  console.log(`  📊 Generated ${styles.length} work styles`)
  return styles
}

function generateWorkValues(): AbstractWorkValue[] {
  console.log('\n💎 Generating Work Values (ONET)...')

  const values: AbstractWorkValue[] = []
  const seen = new Set<string>()

  const data = parseTSV(path.join(STANDARDS_DIR, 'ONET.WorkValues.tsv'))
  for (const item of data) {
    const name = item.name || item.id || ''
    if (!name) continue

    // Skip "High-Point" entries which are just placeholders
    if (name.includes('High-Point')) continue

    const id = toPascalCase(name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    values.push({
      ns: NAMESPACES.workValues,
      type: 'WorkValue',
      id,
      name,
      description: item.description || name,
      code: item.code,
      shortName: toShortName(name),
      sourceType: 'ONET',
    })
  }

  console.log(`  📊 Generated ${values.length} work values`)
  return values
}

function generateInterests(): AbstractInterest[] {
  console.log('\n🎯 Generating Interests/RIASEC (ONET)...')

  const interests: AbstractInterest[] = []
  const seen = new Set<string>()

  // Use RIASEC file which has better descriptions
  const data = parseTSV(path.join(STANDARDS_DIR, 'ONET.RIASEC.tsv'))
  for (const item of data) {
    const name = item.name || item.id || ''
    if (!name) continue

    const id = toPascalCase(name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    interests.push({
      ns: NAMESPACES.interests,
      type: 'Interest',
      id,
      name,
      description: item.description || name,
      code: item.code,
      shortName: item.code || toShortName(name),
      sourceType: 'ONET',
      riasecCode: item.code,
    })
  }

  console.log(`  📊 Generated ${interests.length} interests`)
  return interests
}

// ============================================================================
// Financial Classifications Domain Generation
// ============================================================================

function generateMerchantCategories(): AbstractMerchantCategory[] {
  console.log('\n💳 Generating Merchant Categories (MCC)...')

  const categories: AbstractMerchantCategory[] = []
  const seen = new Set<string>()

  const data = parseTSV(path.join(STANDARDS_DIR, 'Finance.MCC.Codes.tsv'))
  for (const item of data) {
    const name = item.name || item.id || ''
    if (!name) continue

    const id = toPascalCase(name)
    if (!id || seen.has(id)) continue
    seen.add(id)

    categories.push({
      ns: NAMESPACES.merchantCategories,
      type: 'MerchantCategory',
      id,
      name,
      description: item.description || name,
      code: item.code,
      shortName: item.code || toShortName(name),
      sourceType: 'Finance',
      mccCode: item.code,
    })
  }

  console.log(`  📊 Generated ${categories.length} merchant categories`)
  return categories
}


// ============================================================================
// Geography Domain Generation
// ============================================================================

function generateLocations(): AbstractLocation[] {
  console.log('\n🌍 Generating Unified Locations...')

  const locations: AbstractLocation[] = []
  const seen = new Set<string>()

  // Load ISO Countries
  const countries = parseTSV(path.join(STANDARDS_DIR, 'ISO.Countries.tsv'))
  for (const item of countries) {
    const id = toPascalCase(item.name || item.id || '')
    if (!id || seen.has(id)) continue
    seen.add(id)

    locations.push({
      ns: NAMESPACES.locations,
      type: 'Location',
      id,
      name: item.name || '',
      description: item.description || item.name || '',
      code: item.code,
      shortName: item.code || toShortName(item.name || ''),
      category: 'Country',
      sourceType: 'ISO',
      isoCode: item.code,
    })
  }

  // Load Census States
  const states = parseTSV(path.join(STANDARDS_DIR, 'Census.States.tsv'))
  for (const item of states) {
    const id = toPascalCase(item.name || item.id || '')
    if (!id || seen.has(id)) continue
    seen.add(id)

    locations.push({
      ns: NAMESPACES.locations,
      type: 'Location',
      id,
      name: item.name || '',
      description: item.description || item.name || '',
      code: item.code,
      shortName: item.code || toShortName(item.name || ''),
      category: 'State',
      sourceType: 'Census',
      fipsCode: item.code,
    })
  }

  console.log(`  📊 Generated ${locations.length} unified locations`)
  return locations
}

// ============================================================================
// Output Functions
// ============================================================================

function entityToRecord(entity: Entity): Record<string, string> {
  const record: Record<string, string> = {}
  for (const [key, value] of Object.entries(entity)) {
    if (value !== undefined && value !== null) {
      record[key] = String(value)
    }
  }
  return record
}

function dedupeRelationships(rels: Relationship[]): Relationship[] {
  const seen = new Set<string>()
  return rels.filter((r) => {
    const key = `${r.from}|${r.to}|${r.predicate}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ============================================================================
// Concepts Generator
// ============================================================================

/**
 * Generate Concepts from Task objects
 * Concepts are the noun phrases (Objects) that appear in Tasks
 * Format: [Occupation].[verb].[Object].[prep].[Object]
 */
function generateConcepts(
  tasks: AbstractTask[],
  processes: AbstractProcess[]
): {
  concepts: AbstractConcept[]
  conceptTaskRels: Relationship[]
} {
  console.log('\n💡 Generating Concepts from Tasks and Processes...')

  const conceptMap = new Map<
    string,
    { name: string; sourceType: string; taskIds: string[]; processIds: string[] }
  >()

  // Helper to validate concept IDs
  const isValidConcept = (conceptId: string): boolean => {
    if (!conceptId || conceptId.length < 3 || conceptId.length > 60) return false
    // Skip concepts starting with prepositions, conjunctions, or articles
    if (/^(To|For|With|From|In|On|At|By|Of|And|Or|The|A|An|Both|Each|All|Any|Some|No|None|Within|Through|Into)[A-Z]/.test(conceptId)) return false
    // Skip concepts that contain conjunctions in the middle (sign of failed expansion)
    // e.g., ReviewOrApproveProjectDesignChanges, ManageAndCoordinate
    if (/[a-z](And|Or)[A-Z]/.test(conceptId)) return false
    // Skip concepts ending with And/Or (sign of truncated conjunction)
    // e.g., StudentsIndividuallyAnd, ClientsIndividuallyOr
    if (/(And|Or)$/.test(conceptId)) return false
    // Skip concepts that are just And/Or
    if (conceptId === 'And' || conceptId === 'Or') return false
    // Skip concepts that are just verbs
    if (/^(Is|Are|Was|Were|Be|Been|Being|Has|Have|Had|Do|Does|Did|Will|Would|Shall|Should|May|Might|Must|Can|Could)[A-Z]?$/.test(conceptId)) return false
    // Skip numeric-only concepts
    if (/^\d+$/.test(conceptId)) return false
    // Skip concepts containing pronouns (often parsed incorrectly as IT)
    // e.g., ITRemainsSafe, ITValid, TastingIT (these are "it remains safe", "tasting it" not Information Technology)
    if (/^(IT|It)[A-Z]/.test(conceptId) || /[a-z](IT|It)([A-Z]|$)/.test(conceptId)) return false
    // Skip truncated/malformed concepts (fragments from improper parsing)
    if (/^(mation|mations?|ing|tion|tions?|ating|ness|ment|ance|ence)$/i.test(conceptId)) return false
    // Also skip concepts that START with these truncated patterns
    if (/^(mation|mations?)[A-Z]/.test(conceptId)) return false
    // Skip concepts starting with common verbs (likely infinitive phrases)
    const firstWordMatch = conceptId.match(/^([A-Z][a-z]+)/)
    if (firstWordMatch && COMMON_VERBS.has(firstWordMatch[1].toLowerCase())) {
      return false
    }
    return true
  }

  // Extract concepts from tasks
  for (const task of tasks) {
    // Extract the main object - clean it first to remove conjunctions/verbs
    if (task.object) {
      let conceptId = cleanConceptId(task.object)
      if (!conceptId || !isValidConcept(conceptId)) {
        // Try using the raw object if cleaning failed
        conceptId = task.object
      }
      if (!isValidConcept(conceptId)) continue
      conceptId = conceptId!
      if (!conceptMap.has(conceptId)) {
        conceptMap.set(conceptId, {
          name: conceptId.replace(/([A-Z])/g, ' $1').trim(), // PascalCase to words
          sourceType: 'Task',
          taskIds: [],
          processIds: [],
        })
      }
      conceptMap.get(conceptId)!.taskIds.push(task.id)
    }

    // Extract the prepositional object (if exists) - clean it first
    if (task.prepObject) {
      let prepConceptId = cleanConceptId(task.prepObject)
      if (!prepConceptId || !isValidConcept(prepConceptId)) {
        prepConceptId = task.prepObject
      }
      if (isValidConcept(prepConceptId)) {
        if (!conceptMap.has(prepConceptId)) {
          conceptMap.set(prepConceptId, {
            name: prepConceptId.replace(/([A-Z])/g, ' $1').trim(),
            sourceType: 'Task',
            taskIds: [],
            processIds: [],
          })
        }
        conceptMap.get(prepConceptId)!.taskIds.push(task.id)
      }
    }
  }

  // Extract concepts from processes
  for (const proc of processes) {
    // Process names are often noun phrases
    const words = proc.name.split(/\s+/)
    if (words.length >= 2) {
      // Use PascalCase version of the full name
      let conceptId = toPascalCase(proc.name)
      // Clean the concept ID to remove conjunctions/verbs
      const cleaned = cleanConceptId(conceptId)
      if (cleaned && isValidConcept(cleaned)) {
        conceptId = cleaned
      }
      if (!isValidConcept(conceptId)) continue
      if (!conceptMap.has(conceptId)) {
        conceptMap.set(conceptId, {
          name: proc.name,
          sourceType: 'Process',
          taskIds: [],
          processIds: [],
        })
      }
      conceptMap.get(conceptId)!.processIds.push(proc.id)
    }
  }

  // Build concepts array
  const concepts: AbstractConcept[] = []
  for (const [id, data] of conceptMap) {
    concepts.push({
      ns: NAMESPACES.concepts,
      type: 'Concept',
      id,
      name: data.name,
      description: `Concept extracted from ${data.sourceType}`,
      sourceType: data.sourceType,
      sourceTasks: data.taskIds.length > 0 ? data.taskIds.slice(0, 10) : undefined,
      sourceProcesses: data.processIds.length > 0 ? data.processIds.slice(0, 10) : undefined,
    })
  }

  // Build concept-task relationships (only for valid concepts)
  const conceptTaskRels: Relationship[] = []
  for (const task of tasks) {
    if (task.object && isValidConcept(task.object) && conceptMap.has(task.object)) {
      conceptTaskRels.push({
        from: `${NAMESPACES.tasks}/${task.id}`,
        to: `${NAMESPACES.concepts}/${task.object}`,
        predicate: 'hasObject',
        reverse: 'objectOf',
      })
    }
    if (task.prepObject && isValidConcept(task.prepObject) && conceptMap.has(task.prepObject)) {
      conceptTaskRels.push({
        from: `${NAMESPACES.tasks}/${task.id}`,
        to: `${NAMESPACES.concepts}/${task.prepObject}`,
        predicate: 'hasPrepObject',
        reverse: 'prepObjectOf',
      })
    }
  }

  console.log(`  📊 Generated ${concepts.length} concepts`)
  return { concepts, conceptTaskRels }
}

// ============================================================================
// Occupation-Task Relationships
// ============================================================================

/**
 * Generate OccupationTasks relationship file
 * Links Occupations to their Tasks with the format:
 * [Occupation].[action].[Object].[preposition].[Object]
 */
function generateOccupationTasks(
  tasks: AbstractTask[]
): {
  relationships: Relationship[]
  occupationTasks: Array<{ occupationTaskId: string; occupationId: string; taskId: string; taskType: string; description: string }>
} {
  console.log('\n🔗 Generating Occupation-Task relationships...')

  // Load the ONET Occupation.Task relationship
  const onetOccTaskPath = path.join(
    STANDARDS_DIR,
    'relationships/ONET.Occupation.Task.tsv'
  )
  if (!fs.existsSync(onetOccTaskPath)) {
    console.log('  ⚠️  ONET.Occupation.Task.tsv not found')
    return { relationships: [], occupationTasks: [] }
  }

  const onetRels = parseTSV(onetOccTaskPath)

  // Load occupations to get their IDs
  const occupationsPath = path.join(STANDARDS_DIR, 'ONET.Occupations.tsv')
  const occupations = parseTSV(occupationsPath)
  const codeToOccId = new Map<string, string>()
  for (const occ of occupations) {
    const code = occ.code || ''
    const id = occ.id || ''
    if (code && id) {
      codeToOccId.set(code, id.replace(/_/g, '')) // Remove underscores: Chief_Executives -> ChiefExecutives
    }
  }

  // Build a map from ONET task code to our tasks
  const codeToTasks = new Map<string, AbstractTask[]>()
  for (const task of tasks) {
    if (task.code) {
      if (!codeToTasks.has(task.code)) {
        codeToTasks.set(task.code, [])
      }
      codeToTasks.get(task.code)!.push(task)
    }
  }

  // Build relationships and OccupationTasks records
  const relationships: Relationship[] = []
  const occupationTasks: Array<{ occupationTaskId: string; occupationId: string; taskId: string; taskType: string; description: string }> = []
  const seenOccTasks = new Set<string>()

  for (const rel of onetRels) {
    const occCode = rel.fromCode || ''
    const taskCode = rel.toCode || ''
    const taskType = rel.taskType || ''

    const occId = codeToOccId.get(occCode) || ''
    const tasksForCode = codeToTasks.get(taskCode) || []

    for (const task of tasksForCode) {
      // Create standard relationship
      relationships.push({
        from: `${NAMESPACES.onet}/${occCode}`,
        to: `${NAMESPACES.tasks}/${task.id}`,
        predicate: 'performsTask',
        reverse: 'performedBy',
        taskType,
      })

      // Create OccupationTask record with format: Occupation.taskId
      // This gives us: ChiefExecutives.direct.OrganizationsFinancialActivities.to.fund.Operations
      if (occId && task.id) {
        const occupationTaskId = `${occId}.${task.id}`

        if (!seenOccTasks.has(occupationTaskId)) {
          seenOccTasks.add(occupationTaskId)
          occupationTasks.push({
            occupationTaskId,
            occupationId: occId,
            taskId: task.id,
            taskType,
            description: task.source || task.name || '', // Include original task text
          })
        }
      }
    }
  }

  console.log(`  📊 Generated ${relationships.length} occupation-task relationships`)
  console.log(`  📊 Generated ${occupationTasks.length} unique occupation-tasks`)
  return { relationships, occupationTasks }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('🏢 Unified Abstract Interface Generation (GraphDL)')
  console.log('==================================================')
  console.log(`Source: ${STANDARDS_DIR}`)
  console.log(`Output: ${OUTPUT_DIR}`)

  // Check if standards submodule exists
  if (!fs.existsSync(STANDARDS_DIR)) {
    console.error('\n❌ Standards submodule not found!')
    console.error(`   Expected: ${STANDARDS_DIR}`)
    console.error('')
    console.error('Initialize the submodule:')
    console.error('   git submodule update --init --recursive')
    console.error('   cd .standards && git lfs pull')
    process.exit(1)
  }

  ensureDir(OUTPUT_DIR)
  ensureDir(OUTPUT_REL_DIR)

  // Initialize GraphDL parser
  console.log('\n🔧 Initializing GraphDL parser...')
  const parser = await getGraphDLParser()
  console.log('  ✅ Parser initialized')

  // ========== Work Domain ==========
  console.log('\n📊 Work Domain')
  console.log('─'.repeat(50))

  const roles = await generateRoles(parser)
  const jobs = generateJobs()
  const competencies = generateCompetencies()
  const activities = await generateActivities(parser)
  const contexts = generateContexts()
  const tasks = await generateTasks(parser)
  const { actions, events, taskActionRels, actionEventRels } =
    await generateActionsAndEvents(tasks, parser)

  writeTSV(path.join(OUTPUT_DIR, 'Roles.tsv'), roles.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Jobs.tsv'), jobs.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Competencies.tsv'), competencies.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Activities.tsv'), activities.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Contexts.tsv'), contexts.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Tasks.tsv'), tasks.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Actions.tsv'), actions.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Events.tsv'), events.map(entityToRecord))

  writeTSV(path.join(OUTPUT_REL_DIR, 'Tasks.Actions.tsv'), dedupeRelationships(taskActionRels))
  writeTSV(path.join(OUTPUT_REL_DIR, 'Actions.Events.tsv'), dedupeRelationships(actionEventRels))

  // ========== Business Domain ==========
  console.log('\n📊 Business Domain')
  console.log('─'.repeat(50))

  const industries = await generateIndustries(parser)
  const processes = generateProcesses()
  const products = await generateProducts(parser)
  const services = await generateServices(parser)

  writeTSV(path.join(OUTPUT_DIR, 'Industries.tsv'), industries.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Processes.tsv'), processes.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Products.tsv'), products.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Services.tsv'), services.map(entityToRecord))

  // ========== Technology Domain ==========
  console.log('\n📊 Technology Domain')
  console.log('─'.repeat(50))

  const tech = generateTech()
  const tools = generateTools()

  writeTSV(path.join(OUTPUT_DIR, 'Tech.tsv'), tech.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Tools.tsv'), tools.map(entityToRecord))

  // ========== Supply Chain Domain (GS1) ==========
  console.log('\n📊 Supply Chain Domain (GS1)')
  console.log('─'.repeat(50))

  const businessSteps = generateBusinessSteps()
  const dispositions = generateDispositions()
  const identifierTypes = generateIdentifierTypes()
  const locationTypes = generateLocationTypes()
  const productAttributes = generateProductAttributes()

  writeTSV(path.join(OUTPUT_DIR, 'BusinessSteps.tsv'), businessSteps.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Dispositions.tsv'), dispositions.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'IdentifierTypes.tsv'), identifierTypes.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'LocationTypes.tsv'), locationTypes.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'ProductAttributes.tsv'), productAttributes.map(entityToRecord))

  // ========== Work Preferences Domain (ONET) ==========
  console.log('\n📊 Work Preferences Domain (ONET)')
  console.log('─'.repeat(50))

  const workStyles = generateWorkStyles()
  const workValues = generateWorkValues()
  const interests = generateInterests()

  writeTSV(path.join(OUTPUT_DIR, 'WorkStyles.tsv'), workStyles.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'WorkValues.tsv'), workValues.map(entityToRecord))
  writeTSV(path.join(OUTPUT_DIR, 'Interests.tsv'), interests.map(entityToRecord))

  // ========== Financial Classifications Domain ==========
  console.log('\n📊 Financial Classifications Domain')
  console.log('─'.repeat(50))

  const merchantCategories = generateMerchantCategories()

  writeTSV(path.join(OUTPUT_DIR, 'MerchantCategories.tsv'), merchantCategories.map(entityToRecord))

  // ========== Geography Domain ==========
  console.log('\n📊 Geography Domain')
  console.log('─'.repeat(50))

  const locations = generateLocations()
  writeTSV(path.join(OUTPUT_DIR, 'Locations.tsv'), locations.map(entityToRecord))

  // ========== Semantic Domain ==========
  console.log('\n📊 Semantic Domain')
  console.log('─'.repeat(50))

  const { concepts, conceptTaskRels } = generateConcepts(tasks, processes)
  const { relationships: occTaskRels, occupationTasks } = generateOccupationTasks(tasks)

  writeTSV(path.join(OUTPUT_DIR, 'Concepts.tsv'), concepts.map(entityToRecord))
  writeTSV(
    path.join(OUTPUT_DIR, 'OccupationTasks.tsv'),
    occupationTasks.map((ot) => ({
      id: ot.occupationTaskId,
      occupationId: ot.occupationId,
      taskId: ot.taskId,
      taskType: ot.taskType,
      description: ot.description, // Source task text
    }))
  )
  writeTSV(path.join(OUTPUT_REL_DIR, 'Tasks.Concepts.tsv'), dedupeRelationships(conceptTaskRels))
  writeTSV(path.join(OUTPUT_REL_DIR, 'Occupations.Tasks.tsv'), dedupeRelationships(occTaskRels))

  // ========== Summary ==========
  console.log('\n📈 Summary')
  console.log('─'.repeat(50))
  console.log(`  Roles:              ${roles.length}`)
  console.log(`  Jobs:               ${jobs.length}`)
  console.log(`  Competencies:       ${competencies.length}`)
  console.log(`  Activities:         ${activities.length}`)
  console.log(`  Contexts:           ${contexts.length}`)
  console.log(`  Tasks:              ${tasks.length}`)
  console.log(`  Actions:            ${actions.length}`)
  console.log(`  Events:             ${events.length}`)
  console.log(`  WorkStyles:         ${workStyles.length}`)
  console.log(`  WorkValues:         ${workValues.length}`)
  console.log(`  Interests:          ${interests.length}`)
  console.log(`  Industries:         ${industries.length} (NAICS + SIC)`)
  console.log(`  Processes:          ${processes.length}`)
  console.log(`  Products:           ${products.length}`)
  console.log(`  ProductAttributes:  ${productAttributes.length}`)
  console.log(`  Services:           ${services.length}`)
  console.log(`  Tech:               ${tech.length}`)
  console.log(`  Tools:              ${tools.length}`)
  console.log(`  BusinessSteps:      ${businessSteps.length}`)
  console.log(`  Dispositions:       ${dispositions.length}`)
  console.log(`  IdentifierTypes:    ${identifierTypes.length}`)
  console.log(`  LocationTypes:      ${locationTypes.length}`)
  console.log(`  MerchantCategories: ${merchantCategories.length}`)
  console.log(`  Locations:          ${locations.length}`)
  console.log(`  Concepts:           ${concepts.length}`)
  console.log(`  OccupationTasks:    ${occupationTasks.length}`)

  console.log('\n✨ Interface generation complete!')
}

main().catch(console.error)
