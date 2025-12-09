#!/usr/bin/env tsx

/**
 * Standards Data Ingestion Script
 *
 * Ingests data from standards.org.ai LFS repository and generates
 * unified abstract interfaces for business.org.ai
 *
 * Data Flow:
 *   standards.org.ai/.data/*.tsv (LFS) → business.org.ai/.standards/*.tsv
 *
 * The standards.org.ai repo contains normalized standards data from:
 * - ONET (Occupations, Skills, Tasks)
 * - NAICS (Industries)
 * - APQC (Business Processes)
 * - GS1 (Supply Chain)
 * - BLS (Employment Statistics)
 * - W3C (Web Standards)
 * - ISO, UN, IANA, etc.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths
// standards.org.ai should be at the same level as business.org.ai in /Users/nathanclevenger/projects/
const STANDARDS_REPO = path.resolve(__dirname, '../../standards.org.ai')
const STANDARDS_DATA_DIR = path.join(STANDARDS_REPO, '.data')
const OUTPUT_DIR = path.resolve(__dirname, '../.standards')

// ============================================================================
// Utility Functions
// ============================================================================

function parseTSV<T = Record<string, string>>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️  File not found: ${filePath}`)
    return []
  }

  let content = fs.readFileSync(filePath, 'utf-8')

  // Remove BOM if present
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.substring(1)
  }

  const lines = content.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return []

  // Handle Windows-style \r\n line endings
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

function writeTSV(filePath: string, data: Record<string, string>[]): void {
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
  console.log(
    `  ✅ ${path.relative(OUTPUT_DIR, filePath)} (${data.length} rows)`
  )
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Convert text to PascalCase ID
 */
function toPascalCase(text: string): string {
  if (!text) return ''

  const cleaned = text
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const words = cleaned.split(/[\s_-]+/).filter((w) => w.length > 0)
  if (words.length === 0) return ''

  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
}

// ============================================================================
// Standard Categories Configuration
// ============================================================================

interface StandardConfig {
  prefix: string // File prefix in standards.org.ai/.data/
  outputDir: string // Subdirectory in .standards/
  namespace: string // Canonical namespace
  description: string
  files: FileConfig[]
}

interface FileConfig {
  source: string // Source filename (without prefix)
  output: string // Output filename
  type: string // Entity type
  transform?: (row: Record<string, string>) => Record<string, string> | null
}

const STANDARD_CONFIGS: StandardConfig[] = [
  // ONET - Occupational Data
  {
    prefix: 'ONET',
    outputDir: 'ONET',
    namespace: 'onet.org.ai',
    description: 'O*NET Occupational Information Network',
    files: [
      { source: 'Occupations', output: 'Occupations.tsv', type: 'Occupation' },
      { source: 'Skills', output: 'Skills.tsv', type: 'Skill' },
      { source: 'Abilities', output: 'Abilities.tsv', type: 'Ability' },
      { source: 'Knowledge', output: 'Knowledge.tsv', type: 'Knowledge' },
      { source: 'Tasks', output: 'Tasks.tsv', type: 'Task' },
      {
        source: 'WorkActivities',
        output: 'WorkActivities.tsv',
        type: 'WorkActivity',
      },
      {
        source: 'DetailedWorkActivities',
        output: 'DetailedWorkActivities.tsv',
        type: 'DetailedWorkActivity',
      },
      {
        source: 'IntermediateWorkActivities',
        output: 'IntermediateWorkActivities.tsv',
        type: 'IntermediateWorkActivity',
      },
      { source: 'WorkContexts', output: 'WorkContexts.tsv', type: 'WorkContext' },
      { source: 'WorkStyles', output: 'WorkStyles.tsv', type: 'WorkStyle' },
      { source: 'WorkValues', output: 'WorkValues.tsv', type: 'WorkValue' },
      { source: 'Interests', output: 'Interests.tsv', type: 'Interest' },
      { source: 'JobZones', output: 'JobZones.tsv', type: 'JobZone' },
      { source: 'Technologies', output: 'Technologies.tsv', type: 'Technology' },
      {
        source: 'AlternateTitles',
        output: 'AlternateTitles.tsv',
        type: 'AlternateTitle',
      },
      {
        source: 'TechnologySkills',
        output: 'TechnologySkills.tsv',
        type: 'TechnologySkill',
      },
      { source: 'ToolsUsed', output: 'ToolsUsed.tsv', type: 'Tool' },
      {
        source: 'EmergingTasks',
        output: 'EmergingTasks.tsv',
        type: 'EmergingTask',
      },
    ],
  },
  // NAICS - Industry Classification
  {
    prefix: 'NAICS',
    outputDir: 'NAICS',
    namespace: 'naics.org.ai',
    description: 'North American Industry Classification System',
    files: [
      { source: 'Sectors', output: 'Sectors.tsv', type: 'Sector' },
      { source: 'Subsectors', output: 'Subsectors.tsv', type: 'Subsector' },
      {
        source: 'IndustryGroups',
        output: 'IndustryGroups.tsv',
        type: 'IndustryGroup',
      },
      { source: 'Industries', output: 'Industries.tsv', type: 'Industry' },
      {
        source: 'NationalIndustries',
        output: 'NationalIndustries.tsv',
        type: 'NationalIndustry',
      },
    ],
  },
  // APQC - Process Classification Framework
  {
    prefix: 'APQC',
    outputDir: 'APQC',
    namespace: 'apqc.org.ai',
    description: 'APQC Process Classification Framework',
    files: [
      { source: 'Processes', output: 'Processes.tsv', type: 'Process' },
      { source: 'Industries', output: 'Industries.tsv', type: 'Industry' },
      { source: 'Metrics', output: 'Metrics.tsv', type: 'Metric' },
      { source: 'Glossary', output: 'Glossary.tsv', type: 'Term' },
    ],
  },
  // BLS - Bureau of Labor Statistics
  {
    prefix: 'BLS',
    outputDir: 'BLS',
    namespace: 'bls.org.ai',
    description: 'Bureau of Labor Statistics',
    files: [
      { source: 'Occupations', output: 'Occupations.tsv', type: 'Occupation' },
      {
        source: 'OESOccupations',
        output: 'OESOccupations.tsv',
        type: 'OESOccupation',
      },
      { source: 'Industries', output: 'Industries.tsv', type: 'Industry' },
      {
        source: 'EmploymentStats',
        output: 'EmploymentStats.tsv',
        type: 'EmploymentStat',
      },
      { source: 'Education', output: 'Education.tsv', type: 'EducationLevel' },
      { source: 'STEM', output: 'STEM.tsv', type: 'STEMOccupation' },
    ],
  },
  // GS1 - Supply Chain Standards
  {
    prefix: 'GS1',
    outputDir: 'GS1',
    namespace: 'gs1.org.ai',
    description: 'GS1 Supply Chain Standards',
    files: [
      { source: 'Classes', output: 'Classes.tsv', type: 'Class' },
      { source: 'Attributes', output: 'Attributes.tsv', type: 'Attribute' },
      {
        source: 'BusinessSteps',
        output: 'BusinessSteps.tsv',
        type: 'BusinessStep',
      },
      { source: 'Dispositions', output: 'Dispositions.tsv', type: 'Disposition' },
      {
        source: 'LocationTypes',
        output: 'LocationTypes.tsv',
        type: 'LocationType',
      },
      {
        source: 'CBVLinkTypes',
        output: 'CBVLinkTypes.tsv',
        type: 'CBVLinkType',
      },
      {
        source: 'CBVSourceDestTypes',
        output: 'CBVSourceDestTypes.tsv',
        type: 'CBVSourceDestType',
      },
    ],
  },
  // NAPCS - Product/Service Classification
  {
    prefix: 'NAPCS',
    outputDir: 'NAPCS',
    namespace: 'napcs.org.ai',
    description: 'North American Product Classification System',
    files: [
      { source: 'Sections', output: 'Sections.tsv', type: 'Section' },
      { source: 'Divisions', output: 'Divisions.tsv', type: 'Division' },
      { source: 'Groups', output: 'Groups.tsv', type: 'Group' },
      { source: 'Classes', output: 'Classes.tsv', type: 'Class' },
      { source: 'Subclasses', output: 'Subclasses.tsv', type: 'Subclass' },
    ],
  },
  // ISO - International Standards
  {
    prefix: 'ISO',
    outputDir: 'ISO',
    namespace: 'iso.org.ai',
    description: 'ISO International Standards',
    files: [
      { source: 'Countries', output: 'Countries.tsv', type: 'Country' },
      { source: 'Currencies', output: 'Currencies.tsv', type: 'Currency' },
      { source: 'Languages', output: 'Languages.tsv', type: 'Language' },
      {
        source: 'CountryCurrencies',
        output: 'CountryCurrencies.tsv',
        type: 'CountryCurrency',
      },
    ],
  },
  // UN Standards
  {
    prefix: 'UN',
    outputDir: 'UN',
    namespace: 'un.org.ai',
    description: 'United Nations Standards',
    files: [
      { source: 'EDIFACT.Messages', output: 'EDIFACTMessages.tsv', type: 'Message' },
      { source: 'Locations', output: 'Locations.tsv', type: 'Location' },
      { source: 'Regions', output: 'Regions.tsv', type: 'Region' },
    ],
  },
  // IANA - Internet Standards
  {
    prefix: 'IANA',
    outputDir: 'IANA',
    namespace: 'iana.org.ai',
    description: 'IANA Internet Standards',
    files: [
      { source: 'Timezones', output: 'Timezones.tsv', type: 'Timezone' },
      { source: 'Zones', output: 'Zones.tsv', type: 'Zone' },
    ],
  },
  // Census - Geographic Data
  {
    prefix: 'Census',
    outputDir: 'Census',
    namespace: 'census.org.ai',
    description: 'US Census Geographic Data',
    files: [
      { source: 'States', output: 'States.tsv', type: 'State' },
      { source: 'Regions', output: 'Regions.tsv', type: 'Region' },
      { source: 'Divisions', output: 'Divisions.tsv', type: 'Division' },
      { source: 'CBSAs', output: 'CBSAs.tsv', type: 'CBSA' },
      { source: 'Counties', output: 'Counties.tsv', type: 'County' },
    ],
  },
  // W3C - Web Standards
  {
    prefix: 'W3C',
    outputDir: 'W3C',
    namespace: 'w3c.org.ai',
    description: 'W3C Web Standards',
    files: [
      { source: 'HTML.Elements', output: 'HTMLElements.tsv', type: 'HTMLElement' },
      {
        source: 'HTML.GlobalAttributes',
        output: 'HTMLGlobalAttributes.tsv',
        type: 'HTMLAttribute',
      },
      { source: 'CSS.Properties', output: 'CSSProperties.tsv', type: 'CSSProperty' },
      { source: 'CSS.Selectors', output: 'CSSSelectors.tsv', type: 'CSSSelector' },
      { source: 'ARIA.Roles', output: 'ARIARoles.tsv', type: 'ARIARole' },
      { source: 'ARIA.States', output: 'ARIAStates.tsv', type: 'ARIAState' },
      { source: 'SVG.Elements', output: 'SVGElements.tsv', type: 'SVGElement' },
      { source: 'WCAG.Guidelines', output: 'WCAGGuidelines.tsv', type: 'WCAGGuideline' },
      { source: 'DID.Methods', output: 'DIDMethods.tsv', type: 'DIDMethod' },
    ],
  },
  // AdvanceCTE - Career Education
  {
    prefix: 'AdvanceCTE',
    outputDir: 'AdvanceCTE',
    namespace: 'cte.org.ai',
    description: 'Career and Technical Education',
    files: [
      {
        source: 'CareerClusters',
        output: 'CareerClusters.tsv',
        type: 'CareerCluster',
      },
      { source: 'SubClusters', output: 'SubClusters.tsv', type: 'SubCluster' },
      { source: 'CIP', output: 'CIP.tsv', type: 'CIPCode' },
      { source: 'CIPPrograms', output: 'CIPPrograms.tsv', type: 'CIPProgram' },
    ],
  },
  // EDI - Electronic Data Interchange
  {
    prefix: 'EDI',
    outputDir: 'EDI',
    namespace: 'edi.org.ai',
    description: 'Electronic Data Interchange Standards',
    files: [
      {
        source: 'EANCOM.Messages',
        output: 'EANCOMMessages.tsv',
        type: 'EANCOMMessage',
      },
      {
        source: 'EANCOM.Segments',
        output: 'EANCOMSegments.tsv',
        type: 'EANCOMSegment',
      },
      {
        source: 'EANCOM.DataElements',
        output: 'EANCOMDataElements.tsv',
        type: 'EANCOMDataElement',
      },
      {
        source: 'Peppol.Documents',
        output: 'PeppolDocuments.tsv',
        type: 'PeppolDocument',
      },
      {
        source: 'Peppol.BusinessProcesses',
        output: 'PeppolProcesses.tsv',
        type: 'PeppolProcess',
      },
      { source: 'X12.Elements', output: 'X12Elements.tsv', type: 'X12Element' },
      { source: 'X12.Messages', output: 'X12Messages.tsv', type: 'X12Message' },
      { source: 'X12.Segments', output: 'X12Segments.tsv', type: 'X12Segment' },
    ],
  },
  // Ecommerce Standards
  {
    prefix: 'Ecommerce',
    outputDir: 'Ecommerce',
    namespace: 'ecommerce.org.ai',
    description: 'Ecommerce Standards (Schema.org, ECLASS, ETIM)',
    files: [
      { source: 'SchemaOrg.Types', output: 'SchemaTypes.tsv', type: 'SchemaType' },
      {
        source: 'SchemaOrg.Properties',
        output: 'SchemaProperties.tsv',
        type: 'SchemaProperty',
      },
      {
        source: 'SchemaOrg.Enumerations',
        output: 'SchemaEnumerations.tsv',
        type: 'SchemaEnumeration',
      },
      {
        source: 'ECLASS.Segments',
        output: 'ECLASSSegments.tsv',
        type: 'ECLASSSegment',
      },
      { source: 'ETIM.Classes', output: 'ETIMClasses.tsv', type: 'ETIMClass' },
      { source: 'ETIM.Groups', output: 'ETIMGroups.tsv', type: 'ETIMGroup' },
    ],
  },
  // Finance Standards
  {
    prefix: 'Finance',
    outputDir: 'Finance',
    namespace: 'finance.org.ai',
    description: 'Financial Standards (ISO 20022, SEC, etc.)',
    files: [
      {
        source: 'ISO20022.MessageDomains',
        output: 'ISO20022Domains.tsv',
        type: 'MessageDomain',
      },
      {
        source: 'ISO20022.MessageTypes',
        output: 'ISO20022Types.tsv',
        type: 'MessageType',
      },
      { source: 'MCC', output: 'MCC.tsv', type: 'MCC' },
    ],
  },
  // Healthcare Standards
  {
    prefix: 'Healthcare',
    outputDir: 'Healthcare',
    namespace: 'healthcare.org.ai',
    description: 'Healthcare Standards (FHIR, ICD, etc.)',
    files: [
      { source: 'FHIR.Resources', output: 'FHIRResources.tsv', type: 'FHIRResource' },
      {
        source: 'FHIR.DataTypes',
        output: 'FHIRDataTypes.tsv',
        type: 'FHIRDataType',
      },
      { source: 'ICD10.Categories', output: 'ICD10Categories.tsv', type: 'ICD10Category' },
      { source: 'ICD10.Chapters', output: 'ICD10Chapters.tsv', type: 'ICD10Chapter' },
      { source: 'SNOMED.Concepts', output: 'SNOMEDConcepts.tsv', type: 'SNOMEDConcept' },
      { source: 'NDC.Products', output: 'NDCProducts.tsv', type: 'NDCProduct' },
    ],
  },
  // US Government Standards
  {
    prefix: 'US',
    outputDir: 'US',
    namespace: 'us.org.ai',
    description: 'US Government Standards',
    files: [
      { source: 'SBA.SizeStandards', output: 'SBASizeStandards.tsv', type: 'SBASizeStandard' },
      { source: 'SBA.BusinessTypes', output: 'SBABusinessTypes.tsv', type: 'SBABusinessType' },
      { source: 'SBA.ContractTypes', output: 'SBAContractTypes.tsv', type: 'SBAContractType' },
      { source: 'SEC.FilingTypes', output: 'SECFilingTypes.tsv', type: 'SECFilingType' },
      { source: 'SEC.SICCodes', output: 'SECSICCodes.tsv', type: 'SECSICCode' },
      { source: 'SEC.FilerCategories', output: 'SECFilerCategories.tsv', type: 'SECFilerCategory' },
      { source: 'USPTO.PatentClasses', output: 'USPTOPatentClasses.tsv', type: 'PatentClass' },
      { source: 'USPTO.TrademarkClasses', output: 'USPTOTrademarkClasses.tsv', type: 'TrademarkClass' },
      { source: 'GSA.Categories', output: 'GSACategories.tsv', type: 'GSACategory' },
      { source: 'GSA.PSCCodes', output: 'GSAPSCCodes.tsv', type: 'PSCCode' },
    ],
  },
  // Education Standards
  {
    prefix: 'Education',
    outputDir: 'Education',
    namespace: 'education.org.ai',
    description: 'Education Standards (CEDS, ISCED)',
    files: [
      {
        source: 'CEDS.Elements',
        output: 'CEDSElements.tsv',
        type: 'CEDSElement',
      },
      {
        source: 'CEDS.OptionSets',
        output: 'CEDSOptionSets.tsv',
        type: 'CEDSOptionSet',
      },
      { source: 'ISCED.Levels', output: 'ISCEDLevels.tsv', type: 'ISCEDLevel' },
      { source: 'ISCED.Fields', output: 'ISCEDFields.tsv', type: 'ISCEDField' },
    ],
  },
]

// ============================================================================
// Ingestion Functions
// ============================================================================

/**
 * Ingest a single standard category
 */
function ingestStandard(config: StandardConfig): void {
  console.log(`\n📚 Ingesting ${config.prefix} (${config.description})...`)

  const outDir = path.join(OUTPUT_DIR, config.outputDir)
  ensureDir(outDir)

  for (const file of config.files) {
    const sourceFile = path.join(
      STANDARDS_DATA_DIR,
      `${config.prefix}.${file.source}.tsv`
    )

    if (!fs.existsSync(sourceFile)) {
      // console.warn(`  ⚠️  Source not found: ${config.prefix}.${file.source}.tsv`)
      continue
    }

    const sourceData = parseTSV(sourceFile)
    if (sourceData.length === 0) continue

    // Transform data - add standard columns if not present
    const transformed = sourceData
      .map((row) => {
        // Apply custom transform if provided
        if (file.transform) {
          const result = file.transform(row)
          if (!result) return null
          row = result
        }

        return {
          ns: row.ns || config.namespace,
          type: row.type || file.type,
          id: row.id || toPascalCase(row.name || ''),
          name: row.name || '',
          description: row.description || '',
          code: row.code || '',
          // Preserve all original columns
          ...row,
        }
      })
      .filter((row): row is Record<string, string> => row !== null)

    // Dedupe by ID
    const seen = new Set<string>()
    const deduped = transformed.filter((row) => {
      if (!row.id || seen.has(row.id)) return false
      seen.add(row.id)
      return true
    })

    if (deduped.length > 0) {
      writeTSV(path.join(outDir, file.output), deduped)
    }
  }
}

/**
 * Ingest relationship files
 */
function ingestRelationships(): void {
  console.log('\n🔗 Ingesting Relationships...')

  // Find all relationship files in standards.org.ai/.data/
  const dataFiles = fs.readdirSync(STANDARDS_DATA_DIR)
  const relationshipPatterns = [
    /\.Relationships\.tsv$/,
    /\.Hierarchy\.tsv$/,
    /\.Mappings\.tsv$/,
  ]

  const relDir = path.join(OUTPUT_DIR, 'relationships')
  ensureDir(relDir)

  for (const file of dataFiles) {
    // Check if this looks like a relationship file
    if (!relationshipPatterns.some((p) => p.test(file))) continue

    const sourceFile = path.join(STANDARDS_DATA_DIR, file)
    const sourceData = parseTSV(sourceFile)

    if (sourceData.length === 0) continue

    // Copy to relationships directory
    const outputFile = path.join(relDir, file)
    writeTSV(outputFile, sourceData)
  }
}

/**
 * Create index file listing all ingested standards
 */
function createIndex(): void {
  console.log('\n📋 Creating index...')

  const index: Record<string, string>[] = []

  for (const config of STANDARD_CONFIGS) {
    const outDir = path.join(OUTPUT_DIR, config.outputDir)
    if (!fs.existsSync(outDir)) continue

    const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.tsv'))

    for (const file of files) {
      const filePath = path.join(outDir, file)
      const data = parseTSV(filePath)

      index.push({
        source: config.prefix,
        namespace: config.namespace,
        file: `${config.outputDir}/${file}`,
        type: file.replace('.tsv', ''),
        count: data.length.toString(),
        description: config.description,
      })
    }
  }

  writeTSV(path.join(OUTPUT_DIR, '_index.tsv'), index)
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  console.log('🚀 Standards Data Ingestion')
  console.log('===========================')
  console.log(`Source: ${STANDARDS_DATA_DIR}`)
  console.log(`Output: ${OUTPUT_DIR}`)

  // Check if standards repo exists
  if (!fs.existsSync(STANDARDS_DATA_DIR)) {
    console.error('\n❌ Standards repository not found!')
    console.error(`   Expected: ${STANDARDS_DATA_DIR}`)
    console.error('')
    console.error('To fix this, clone the standards.org.ai repo:')
    console.error(
      '   git clone https://github.com/dot-org-ai/standards.org.ai.git ../../../standards.org.ai'
    )
    console.error('')
    console.error("Make sure you have Git LFS installed and run 'git lfs pull' to fetch data files.")
    process.exit(1)
  }

  ensureDir(OUTPUT_DIR)

  // Ingest each standard category
  for (const config of STANDARD_CONFIGS) {
    ingestStandard(config)
  }

  // Ingest relationships
  ingestRelationships()

  // Create index
  createIndex()

  console.log('\n✨ Standards ingestion complete!')
}

main()
