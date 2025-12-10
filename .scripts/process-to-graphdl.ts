/**
 * Process to GraphDL Statement Transformer
 *
 * Uses the GraphDL semantic parser to convert APQC process names into
 * GraphDL Statement syntax with proper cartesian expansion.
 *
 * Output:
 * - Processes.tsv: Root statements with PCF code as the canonical identifier
 * - SubProcesses.tsv: Expanded atomic statements linked to parent process
 * - IndustryProcesses.tsv: Industry-specific processes with Subject.verb.Object
 * - IndustrySubProcesses.tsv: Industry-specific expanded statements
 * - Concepts.tsv: Unique concepts extracted from objects
 * - relationships/Process.Concepts.tsv: Process → Concept relationships
 */

import { join, dirname } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { GraphDLParser } = await import(join(__dirname, '../graphdl/dist/index.js'))
type ParsedStatement = Awaited<ReturnType<typeof GraphDLParser.prototype.parse>>

// Industry to plural subject noun mapping (arrays for semantic expansion)
const INDUSTRY_SUBJECTS: Record<string, string[]> = {
  'cross-industry': ['Companies'],
  'aerospace-and-defense': ['AerospaceCompanies', 'DefenseCompanies'],
  'airline': ['Airlines'],
  'automotive': ['Automakers', 'AutomotiveCompanies'],
  'banking': ['Banks'],
  'broadcasting': ['Broadcasters', 'BroadcastingCompanies'],
  'city-government': ['CityGovernments', 'Municipalities'],
  'consumer-electronics': ['ConsumerElectronicsCompanies'],
  'consumer-products': ['ConsumerProductsCompanies'],
  'education': ['EducationalInstitutions', 'Schools', 'Universities'],
  'health-insurance': ['HealthInsurers', 'HealthInsuranceCompanies'],
  'healthcare-provider': ['HealthcareProviders', 'Hospitals', 'Clinics'],
  'life-sciences': ['LifeSciencesCompanies', 'PharmaceuticalCompanies', 'BiotechCompanies'],
  'petroleum-downstream': ['PetroleumDownstreamCompanies', 'Refineries'],
  'petroleum-upstream': ['PetroleumUpstreamCompanies', 'OilExplorationCompanies'],
  'property-and-casualty-insurance': ['PropertyInsurers', 'CasualtyInsurers'],
  'retail': ['Retailers'],
  'utilities': ['Utilities', 'UtilityCompanies'],
}

// Common acronyms that should stay uppercase
const ACRONYMS = new Set([
  'IT', 'HR', 'ERP', 'CRM', 'API', 'B2B', 'B2C', 'CEO', 'CFO', 'CIO', 'COO',
  'EHS', 'EPA', 'FDA', 'GAAP', 'GDP', 'GHG', 'HIPAA', 'HQ', 'HSE', 'IoT',
  'IP', 'IPO', 'ISO', 'KPI', 'M&A', 'MRP', 'OSHA', 'PCI', 'PM', 'PO', 'PR',
  'QA', 'QC', 'R&D', 'RFI', 'RFP', 'RFQ', 'ROI', 'SaaS', 'SCM', 'SLA',
  'SME', 'SOX', 'SQL', 'SRM', 'UI', 'UX', 'VAT', 'VPN', 'WIP', 'XML',
  'AP', 'AR', 'GL', 'POS', 'SKU', 'UPC', 'EQMS', 'EMS', 'QMS',
])

interface APQCProcess {
  pcfId: string
  hierarchyId: string
  name: string
  elementDescription: string
  industry: string
  metricsAvailable: string
  differenceIndex: string
  changeDetails: string
}

interface ProcessRecord {
  ns: string
  type: string
  id: string
  name: string
  description: string
  code: string
  pcfId: string
  statement: string
  shortName: string
  sourceType: string
  level: number
}

interface SubprocessRecord {
  ns: string
  type: string
  id: string
  name: string
  parentCode: string
  parentId: string
  verb: string
  object: string
  preposition: string
  prepositionalObject: string
  statement: string
}

interface IndustryProcessRecord {
  ns: string
  type: string
  id: string
  name: string
  description: string
  code: string
  pcfId: string
  industry: string
  subject: string
  statement: string
  canonicalProcessId: string
}

interface IndustrySubprocessRecord {
  ns: string
  type: string
  id: string
  name: string
  parentCode: string
  parentId: string
  industry: string
  subject: string
  verb: string
  object: string
  preposition: string
  prepositionalObject: string
  statement: string
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
  context: string
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
 * Calculate hierarchy level from code
 */
function getLevel(code: string): number {
  return code.split('.').length
}

/**
 * Generate short name from process ID
 */
function generateShortName(name: string): string {
  const words = name.toLowerCase().split(/\s+/)
  if (words.length === 1) return words[0].substring(0, 8)

  const significant = words.filter(w => !['the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with'].includes(w))
  if (significant.length <= 4) {
    return significant.map(w => w.substring(0, 2)).join('')
  }
  return significant.map(w => w[0]).join('')
}

/**
 * Convert name to PascalCase ID
 */
function toProcessId(name: string): string {
  return name
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '')
}

/**
 * Clean object text by removing conjunction words (and/or) before converting to PascalCase
 * This handles cases where parser expansions still contain conjunctions
 */
function cleanObjectText(text: string): string {
  if (!text) return ''
  // Split on spaces, filter out conjunction words, rejoin
  const words = text.split(/\s+/)
  const cleaned = words.filter(w => {
    const lower = w.toLowerCase()
    return lower !== 'and' && lower !== 'or' && lower !== 'and/or'
  })
  return cleaned.join(' ')
}

/**
 * Convert a word to PascalCase while preserving acronym casing and already-PascalCase words
 */
function toPascalCaseWord(word: string): string {
  // Check if word is already PascalCase (starts with uppercase and contains lowercase)
  // This preserves concept IDs like "BusinessConcept", "LongTermVision"
  if (/^[A-Z][a-zA-Z0-9]*[a-z]+[a-zA-Z0-9]*$/.test(word)) {
    return word
  }

  const upper = word.toUpperCase()
  if (ACRONYMS.has(upper)) {
    return upper
  }
  // Check for hyphenated words with acronyms like "IT-related"
  if (word.includes('-')) {
    return word.split('-').map(part => {
      const partUpper = part.toUpperCase()
      if (ACRONYMS.has(partUpper)) return partUpper
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    }).join('')  // Remove hyphens in PascalCase
  }
  // Standard PascalCase
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * Extract acronym variants from text containing parenthetical abbreviations.
 * For "engineering change notices (ECNs)" returns:
 * - ["EngineeringChangeNotices", "ECNs"]
 * For text without parenthetical abbreviations, returns a single-element array.
 */
function extractAcronymVariants(text: string): string[] {
  // Match pattern: "some text (ACRONYM)" where ACRONYM is in parens
  const match = text.match(/^(.+?)\s*\(([A-Za-z0-9]+s?)\)$/)
  if (match) {
    const [, fullText, acronym] = match
    // Convert full text to PascalCase
    const fullPascal = fullText.trim().split(/\s+/).map(w => toPascalCaseWord(w)).join('')
    // Keep the acronym as-is (usually uppercase)
    const acronymClean = acronym.toUpperCase()
    return [fullPascal, acronymClean]
  }

  // Also handle mid-text parenthetical: "manage engineering change notices (ECNs) data"
  // This extracts just the part with the parenthetical
  const midMatch = text.match(/\(([A-Za-z0-9]+s?)\)/)
  if (midMatch) {
    // Remove the parenthetical and convert to PascalCase
    const withoutParens = text.replace(/\s*\([A-Za-z0-9]+s?\)/g, '').trim()
    const fullPascal = withoutParens.split(/\s+/).map(w => toPascalCaseWord(w)).join('')
    // Also create a variant with just the acronym replacing the related words
    // For simplicity, we just return the full form and the acronym as separate variants
    const acronymClean = midMatch[1].toUpperCase()
    return [fullPascal, acronymClean]
  }

  // No parenthetical abbreviation found - return standard PascalCase
  const pascal = text.split(/\s+/).map(w => toPascalCaseWord(w)).join('')
  return [pascal]
}

/**
 * Convert parsed statement to dot notation
 */
function toStatementNotation(parsed: ParsedStatement): string {
  const parts: string[] = []

  if (parsed.predicate) {
    parts.push(parsed.predicate.toLowerCase())
  }

  if (parsed.object) {
    // Convert object to PascalCase while preserving acronyms
    const objWords = parsed.object.split(/\s+/)
    const objPascal = objWords.map(w => toPascalCaseWord(w)).join('')
    parts.push(objPascal)
  }

  if (parsed.preposition) {
    parts.push(parsed.preposition.toLowerCase())
  }

  if (parsed.complement) {
    const compWords = parsed.complement.split(/\s+/)
    const compPascal = compWords.map(w => toPascalCaseWord(w)).join('')
    parts.push(compPascal)
  }

  return parts.join('.')
}

/**
 * Convert statement notation to human-readable title
 */
function statementToTitle(statement: string): string {
  return statement
    .split('.')
    .map(part => {
      // Add spaces before capitals in PascalCase
      return part.replace(/([a-z])([A-Z])/g, '$1 $2')
    })
    .join(' ')
}

/**
 * Main transformation function
 */
async function transformProcesses(): Promise<void> {
  const sourceFile = join(process.cwd(), '.standards/.source/APQC/APQC.Processes.tsv')
  const processesOutput = join(process.cwd(), '.data/Processes.tsv')
  const subprocessesOutput = join(process.cwd(), '.data/SubProcesses.tsv')
  const industryProcessesOutput = join(process.cwd(), '.data/IndustryProcesses.tsv')
  const industrySubprocessesOutput = join(process.cwd(), '.data/IndustrySubProcesses.tsv')
  const conceptsOutput = join(process.cwd(), '.data/Concepts.tsv')
  const conceptRelationshipsOutput = join(process.cwd(), '.data/relationships/Process.Concepts.tsv')

  console.log('=== Process to GraphDL Statement Transformer ===')
  console.log('Using GraphDL semantic parser')
  console.log(`Reading from: ${sourceFile}`)

  if (!existsSync(sourceFile)) {
    console.error(`Source file not found: ${sourceFile}`)
    process.exit(1)
  }

  // Initialize the GraphDL parser
  const parser = new GraphDLParser()
  await parser.initialize()
  console.log('GraphDL parser initialized')

  const apqcProcesses = parseTSV<APQCProcess>(sourceFile)
  console.log(`Found ${apqcProcesses.length} total APQC process records`)

  // Filter to cross-industry only to get canonical processes
  const seenPcfIds = new Set<string>()
  const canonicalProcesses = apqcProcesses.filter(proc => {
    if (proc.industry !== 'cross-industry') return false
    if (seenPcfIds.has(proc.pcfId)) return false
    seenPcfIds.add(proc.pcfId)
    return true
  })
  console.log(`Filtered to ${canonicalProcesses.length} cross-industry canonical processes`)

  const pcfIdToProcessId = new Map<string, string>()
  const conceptSources = new Map<string, Set<string>>()
  const conceptRelationships: ConceptRelationshipRecord[] = []

  const processRecords: ProcessRecord[] = []
  const subprocessRecords: SubprocessRecord[] = []

  for (const proc of canonicalProcesses) {
    if (!proc.name || !proc.hierarchyId) continue

    const processId = toProcessId(proc.name)
    const level = getLevel(proc.hierarchyId)
    pcfIdToProcessId.set(proc.pcfId, processId)

    // Parse with GraphDL parser
    const parsed = parser.parse(proc.name)

    // Build root statement
    const root = toStatementNotation(parsed)

    // Create process record
    const processRecord: ProcessRecord = {
      ns: 'process.org.ai',
      type: 'Process',
      id: processId,
      name: proc.name,
      description: proc.elementDescription || '',
      code: proc.hierarchyId,
      pcfId: proc.pcfId,
      statement: root,
      shortName: generateShortName(proc.name),
      sourceType: 'APQC',
      level: level
    }
    processRecords.push(processRecord)

    // Get expansions from parser
    const expansions = parsed.expansions && parsed.expansions.length > 0
      ? parsed.expansions
      : [parsed]

    // Create subprocess records for each expansion
    for (const exp of expansions) {
      const expStatement = toStatementNotation(exp)
      if (!expStatement || !exp.predicate) continue

      // Extract object from the statement (the part after the verb)
      // Clean conjunctions from object/complement before converting to PascalCase
      const cleanedObj = cleanObjectText(exp.object || '')
      const objPascal = cleanedObj
        ? cleanedObj.split(/\s+/).map(w => toPascalCaseWord(w)).join('')
        : ''
      const cleanedComp = cleanObjectText(exp.complement || '')
      const prepObjPascal = cleanedComp
        ? cleanedComp.split(/\s+/).map(w => toPascalCaseWord(w)).join('')
        : ''

      const subprocessRecord: SubprocessRecord = {
        ns: 'process.org.ai',
        type: 'SubProcess',
        id: expStatement,
        name: statementToTitle(expStatement),
        parentCode: proc.hierarchyId,
        parentId: processId,
        verb: exp.predicate?.toLowerCase() || '',
        object: objPascal,
        preposition: exp.preposition?.toLowerCase() || '',
        prepositionalObject: prepObjPascal,
        statement: expStatement
      }
      subprocessRecords.push(subprocessRecord)

      // Track concepts
      if (objPascal) {
        if (!conceptSources.has(objPascal)) {
          conceptSources.set(objPascal, new Set())
        }
        conceptSources.get(objPascal)!.add(proc.hierarchyId)

        conceptRelationships.push({
          fromNs: 'process.org.ai',
          fromType: 'Process',
          fromId: processId,
          toNs: 'concept.org.ai',
          toType: 'Concept',
          toId: objPascal,
          relationshipType: exp.predicate?.toLowerCase() || '',
          context: proc.hierarchyId
        })
      }

      if (prepObjPascal) {
        if (!conceptSources.has(prepObjPascal)) {
          conceptSources.set(prepObjPascal, new Set())
        }
        conceptSources.get(prepObjPascal)!.add(proc.hierarchyId)

        conceptRelationships.push({
          fromNs: 'process.org.ai',
          fromType: 'Process',
          fromId: processId,
          toNs: 'concept.org.ai',
          toType: 'Concept',
          toId: prepObjPascal,
          relationshipType: `${exp.predicate?.toLowerCase() || ''}.${exp.preposition?.toLowerCase() || ''}`,
          context: proc.hierarchyId
        })
      }
    }
  }

  // Process industry-specific processes
  const industryProcessRecords: IndustryProcessRecord[] = []
  const industrySubprocessRecords: IndustrySubprocessRecord[] = []
  const industrySeenKeys = new Set<string>()

  for (const proc of apqcProcesses) {
    if (!proc.name || !proc.hierarchyId) continue
    if (proc.industry === 'cross-industry') continue
    if (!INDUSTRY_SUBJECTS[proc.industry]) continue

    const uniqueKey = `${proc.industry}:${proc.pcfId}`
    if (industrySeenKeys.has(uniqueKey)) continue
    industrySeenKeys.add(uniqueKey)

    const subjects = INDUSTRY_SUBJECTS[proc.industry]
    const processId = toProcessId(proc.name)
    const canonicalProcessId = pcfIdToProcessId.get(proc.pcfId) || processId

    // Parse with GraphDL parser
    const parsed = parser.parse(proc.name)
    const root = toStatementNotation(parsed)

    for (const subject of subjects) {
      const subjectRoot = `${subject}.${root}`

      const industryProcessRecord: IndustryProcessRecord = {
        ns: 'process.org.ai',
        type: 'IndustryProcess',
        id: `${proc.industry}_${subject}_${processId}`,
        name: proc.name,
        description: proc.elementDescription || '',
        code: proc.hierarchyId,
        pcfId: proc.pcfId,
        industry: proc.industry,
        subject: subject,
        statement: subjectRoot,
        canonicalProcessId: canonicalProcessId
      }
      industryProcessRecords.push(industryProcessRecord)

      const expansions = parsed.expansions && parsed.expansions.length > 0
        ? parsed.expansions
        : [parsed]

      for (const exp of expansions) {
        const expStatement = toStatementNotation(exp)
        if (!expStatement || !exp.predicate) continue

        const subjectExpStr = `${subject}.${expStatement}`
        // Clean conjunctions from object/complement before converting to PascalCase
        const cleanedObj = cleanObjectText(exp.object || '')
        const objPascal = cleanedObj
          ? cleanedObj.split(/\s+/).map(w => toPascalCaseWord(w)).join('')
          : ''
        const cleanedComp = cleanObjectText(exp.complement || '')
        const prepObjPascal = cleanedComp
          ? cleanedComp.split(/\s+/).map(w => toPascalCaseWord(w)).join('')
          : ''

        const industrySubprocessRecord: IndustrySubprocessRecord = {
          ns: 'process.org.ai',
          type: 'IndustrySubProcess',
          id: subjectExpStr,
          name: statementToTitle(subjectExpStr),
          parentCode: proc.hierarchyId,
          parentId: `${proc.industry}_${subject}_${processId}`,
          industry: proc.industry,
          subject: subject,
          verb: exp.predicate?.toLowerCase() || '',
          object: objPascal,
          preposition: exp.preposition?.toLowerCase() || '',
          prepositionalObject: prepObjPascal,
          statement: subjectExpStr
        }
        industrySubprocessRecords.push(industrySubprocessRecord)
      }
    }
  }

  // Write output files
  writeTSV(processesOutput, processRecords, [
    'ns', 'type', 'id', 'name', 'description', 'code', 'pcfId', 'statement', 'shortName', 'sourceType', 'level'
  ])

  writeTSV(subprocessesOutput, subprocessRecords, [
    'ns', 'type', 'id', 'name', 'parentCode', 'parentId', 'verb', 'object', 'preposition', 'prepositionalObject', 'statement'
  ])

  writeTSV(industryProcessesOutput, industryProcessRecords, [
    'ns', 'type', 'id', 'name', 'description', 'code', 'pcfId', 'industry', 'subject', 'statement', 'canonicalProcessId'
  ])

  writeTSV(industrySubprocessesOutput, industrySubprocessRecords, [
    'ns', 'type', 'id', 'name', 'parentCode', 'parentId', 'industry', 'subject', 'verb', 'object', 'preposition', 'prepositionalObject', 'statement'
  ])

  // Build concept records
  const conceptRecords: ConceptRecord[] = []
  for (const [concept] of conceptSources.entries()) {
    conceptRecords.push({
      ns: 'concept.org.ai',
      type: 'Concept',
      id: concept,
      name: statementToTitle(concept),
    })
  }
  conceptRecords.sort((a, b) => a.id.localeCompare(b.id))

  writeTSV(conceptsOutput, conceptRecords, [
    'ns', 'type', 'id', 'name'
  ])

  writeTSV(conceptRelationshipsOutput, conceptRelationships, [
    'fromNs', 'fromType', 'fromId', 'toNs', 'toType', 'toId', 'relationshipType', 'context'
  ])

  console.log('\n=== Summary ===')
  console.log(`Processes: ${processRecords.length}`)
  console.log(`Subprocesses (expansions): ${subprocessRecords.length}`)
  console.log(`Average expansions per process: ${(subprocessRecords.length / processRecords.length).toFixed(2)}`)
  console.log(`\nIndustry Processes: ${industryProcessRecords.length}`)
  console.log(`Industry Subprocesses: ${industrySubprocessRecords.length}`)
  console.log(`\nConcepts: ${conceptRecords.length}`)
  console.log(`Concept Relationships: ${conceptRelationships.length}`)

  // Show examples
  console.log('\n=== Cross-Industry Examples ===')
  const interestingExamples = processRecords.filter(p =>
    p.name.toLowerCase().includes(' and ') ||
    p.name.includes('/')
  ).slice(0, 5)

  for (const ex of interestingExamples) {
    console.log(`\n${ex.code} ${ex.name}`)
    console.log(`  Root: ${ex.statement}`)
    const subs = subprocessRecords.filter(s => s.parentCode === ex.code)
    console.log(`  Expansions (${subs.length}): ${subs.map(s => s.statement).join(', ')}`)
  }

  console.log('\n=== Industry Examples ===')
  const retailExamples = industryProcessRecords.filter(p => p.industry === 'retail').slice(0, 3)
  for (const ex of retailExamples) {
    console.log(`\n[${ex.industry}] ${ex.code} ${ex.name}`)
    console.log(`  Statement: ${ex.statement}`)
    const subs = industrySubprocessRecords.filter(s => s.parentId === ex.id)
    console.log(`  Expansions (${subs.length}): ${subs.map(s => s.statement).join(', ')}`)
  }
}

// Run
transformProcesses().catch(console.error)
