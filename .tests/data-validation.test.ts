import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SOURCE_DIR = path.resolve(__dirname, '../.standards')
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

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = lines[0].split('\t')
  const rows = lines.slice(1).map(line => {
    const values = line.split('\t')
    const row: TSVRow = {}
    headers.forEach((header, i) => {
      row[header] = values[i] || ''
    })
    return row
  })

  return { headers, rows }
}

function getAllTSVFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []

  const files: string[] = []
  const items = fs.readdirSync(dir, { withFileTypes: true })

  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      files.push(...getAllTSVFiles(fullPath))
    } else if (item.name.endsWith('.tsv')) {
      files.push(fullPath)
    }
  }

  return files
}

// Regex to detect if a string looks like a numeric code
const NUMERIC_CODE_PATTERN = /^\d{5,}$/ // 5+ consecutive digits
const ONET_CODE_PATTERN = /^\d{2}-\d{4}\.\d{2}$/ // O*NET SOC code pattern like 11-1011.00
const UNSPSC_CODE_PATTERN = /^\d{8}$/ // 8-digit UNSPSC code

function looksLikeCode(value: string): boolean {
  if (!value) return false
  // Check for pure numeric codes (5+ digits)
  if (NUMERIC_CODE_PATTERN.test(value)) return true
  // Check for O*NET codes
  if (ONET_CODE_PATTERN.test(value)) return true
  // Check for UNSPSC codes
  if (UNSPSC_CODE_PATTERN.test(value)) return true
  return false
}

// ============================================================================
// Test Data Collection
// ============================================================================

let sourceFiles: string[] = []
let dataFiles: string[] = []

beforeAll(() => {
  sourceFiles = getAllTSVFiles(SOURCE_DIR)
  dataFiles = getAllTSVFiles(DATA_DIR)
})

// ============================================================================
// Source File Tests (.standards/)
// ============================================================================

describe('.standards/ files validation', () => {
  describe('Entity files', () => {
    it('should have entity files in .standards/', () => {
      expect(sourceFiles.length).toBeGreaterThan(0)
    })

    it('all entity files should have required headers', () => {
      const entityFiles = sourceFiles.filter(f => !f.includes('/relationships/'))
      const requiredHeaders = ['url', 'ns', 'type', 'id', 'name']

      for (const file of entityFiles) {
        const { headers } = parseTSV(file)
        if (headers.length === 0) continue

        const relPath = path.relative(SOURCE_DIR, file)
        for (const required of requiredHeaders) {
          expect(headers, `${relPath} missing '${required}' header`).toContain(required)
        }
      }
    })

    it('all URLs should start with https://', () => {
      const entityFiles = sourceFiles.filter(f => !f.includes('/relationships/'))

      for (const file of entityFiles) {
        const { rows } = parseTSV(file)
        const relPath = path.relative(SOURCE_DIR, file)

        for (let i = 0; i < Math.min(rows.length, 100); i++) {
          const row = rows[i]
          if (row.url) {
            expect(row.url, `${relPath} row ${i + 1}: URL should start with https://`).toMatch(
              /^https:\/\//
            )
          }
          if (row.canonical) {
            expect(
              row.canonical,
              `${relPath} row ${i + 1}: canonical should start with https://`
            ).toMatch(/^https:\/\//)
          }
        }
      }
    })

    it('IDs should not be pure numeric codes', () => {
      const entityFiles = sourceFiles.filter(f => !f.includes('/relationships/'))

      for (const file of entityFiles) {
        const { rows } = parseTSV(file)
        const relPath = path.relative(SOURCE_DIR, file)

        // Skip files that legitimately use numeric IDs (like JobZones)
        if (relPath.includes('JobZones') || relPath.includes('Scales')) continue

        for (let i = 0; i < Math.min(rows.length, 100); i++) {
          const row = rows[i]
          if (row.id && looksLikeCode(row.id)) {
            // Check if there's a code field that should contain this
            if (row.code) {
              expect(
                looksLikeCode(row.id),
                `${relPath} row ${i + 1}: ID '${row.id}' looks like a code - should be human-readable`
              ).toBe(false)
            }
          }
        }
      }
    })

    it('URLs should contain human-readable IDs, not codes', () => {
      const entityFiles = sourceFiles.filter(f => !f.includes('/relationships/'))

      for (const file of entityFiles) {
        const { rows } = parseTSV(file)
        const relPath = path.relative(SOURCE_DIR, file)

        // Skip files that legitimately use numeric IDs
        if (relPath.includes('JobZones') || relPath.includes('Scales')) continue

        for (let i = 0; i < Math.min(rows.length, 50); i++) {
          const row = rows[i]
          if (row.url) {
            // Extract the last path segment from URL
            const urlParts = row.url.split('/')
            const lastSegment = urlParts[urlParts.length - 1]

            // Check if the last segment is a pure numeric code
            if (NUMERIC_CODE_PATTERN.test(lastSegment) || UNSPSC_CODE_PATTERN.test(lastSegment)) {
              expect(
                false,
                `${relPath} row ${i + 1}: URL '${row.url}' ends with numeric code '${lastSegment}' - should be human-readable`
              ).toBe(true)
            }
          }
        }
      }
    })

    it('code column should contain codes when present', () => {
      const entityFiles = sourceFiles.filter(f => !f.includes('/relationships/'))

      for (const file of entityFiles) {
        const { headers, rows } = parseTSV(file)
        const relPath = path.relative(SOURCE_DIR, file)

        if (!headers.includes('code')) continue

        let hasValidCodes = false
        for (let i = 0; i < Math.min(rows.length, 50); i++) {
          const row = rows[i]
          if (row.code && row.code.trim()) {
            hasValidCodes = true
            break
          }
        }

        // If file has code column, it should have some codes
        // (unless it's a file type that doesn't always have codes)
        if (rows.length > 0 && !relPath.includes('GS1')) {
          expect(hasValidCodes, `${relPath}: code column exists but has no valid codes`).toBe(true)
        }
      }
    })
  })

  describe('Relationship files', () => {
    it('relationship files should have required headers', () => {
      const relFiles = sourceFiles.filter(f => f.includes('/relationships/'))
      const requiredHeaders = ['from', 'to', 'predicate']

      for (const file of relFiles) {
        const { headers } = parseTSV(file)
        if (headers.length === 0) continue

        const relPath = path.relative(SOURCE_DIR, file)
        for (const required of requiredHeaders) {
          expect(headers, `${relPath} missing '${required}' header`).toContain(required)
        }
      }
    })

    it('relationship from/to should be fully qualified URLs', () => {
      const relFiles = sourceFiles.filter(f => f.includes('/relationships/'))

      for (const file of relFiles) {
        const { rows } = parseTSV(file)
        const relPath = path.relative(SOURCE_DIR, file)

        for (let i = 0; i < Math.min(rows.length, 100); i++) {
          const row = rows[i]
          if (row.from) {
            expect(row.from, `${relPath} row ${i + 1}: 'from' should be a full URL`).toMatch(
              /^https:\/\//
            )
          }
          if (row.to) {
            expect(row.to, `${relPath} row ${i + 1}: 'to' should be a full URL`).toMatch(
              /^https:\/\//
            )
          }
        }
      }
    })

    it('relationship from/to should not contain numeric codes in path', () => {
      const relFiles = sourceFiles.filter(f => f.includes('/relationships/'))

      for (const file of relFiles) {
        const { rows } = parseTSV(file)
        const relPath = path.relative(SOURCE_DIR, file)

        // Skip certain relationship files that might legitimately use codes
        if (relPath.includes('JobZones') || relPath.includes('Scales')) continue

        for (let i = 0; i < Math.min(rows.length, 50); i++) {
          const row = rows[i]
          for (const field of ['from', 'to']) {
            const url = row[field]
            if (!url) continue

            const lastSegment = url.split('/').pop() || ''

            // Check for pure 8-digit UNSPSC codes
            if (UNSPSC_CODE_PATTERN.test(lastSegment)) {
              expect(
                false,
                `${relPath} row ${i + 1}: ${field} URL ends with numeric code '${lastSegment}'`
              ).toBe(true)
            }
          }
        }
      }
    })
  })
})

// ============================================================================
// Data File Tests (.data/)
// ============================================================================

describe('.data/ files validation', () => {
  it('should have data files in .data/', () => {
    expect(dataFiles.length).toBeGreaterThan(0)
  })

  it('all entity files should have required headers', () => {
    const entityFiles = dataFiles.filter(f => !f.includes('/relationships/'))
    const requiredHeaders = ['url', 'canonical', 'ns', 'type', 'id', 'name']

    for (const file of entityFiles) {
      const { headers } = parseTSV(file)
      if (headers.length === 0) continue

      const relPath = path.relative(DATA_DIR, file)
      for (const required of requiredHeaders) {
        expect(headers, `${relPath} missing '${required}' header`).toContain(required)
      }
    }
  })

  it('all URLs should be fully qualified with https://', () => {
    const entityFiles = dataFiles.filter(f => !f.includes('/relationships/'))

    for (const file of entityFiles) {
      const { rows } = parseTSV(file)
      const relPath = path.relative(DATA_DIR, file)

      for (let i = 0; i < Math.min(rows.length, 100); i++) {
        const row = rows[i]
        if (row.url) {
          expect(row.url, `${relPath} row ${i + 1}: URL should start with https://`).toMatch(
            /^https:\/\//
          )
        }
        if (row.canonical) {
          expect(
            row.canonical,
            `${relPath} row ${i + 1}: canonical should start with https://`
          ).toMatch(/^https:\/\//)
        }
      }
    }
  })

  it('IDs should be human-readable (not pure numeric codes)', () => {
    const entityFiles = dataFiles.filter(f => !f.includes('/relationships/'))

    for (const file of entityFiles) {
      const { rows } = parseTSV(file)
      const relPath = path.relative(DATA_DIR, file)

      // Skip files that legitimately use numeric IDs
      if (relPath.includes('JobZones') || relPath.includes('Scales')) continue

      for (let i = 0; i < Math.min(rows.length, 100); i++) {
        const row = rows[i]
        if (row.id && UNSPSC_CODE_PATTERN.test(row.id)) {
          expect(
            false,
            `${relPath} row ${i + 1}: ID '${row.id}' is a numeric code - should be human-readable`
          ).toBe(true)
        }
      }
    }
  })
})

// ============================================================================
// Standard-Specific Tests
// ============================================================================

describe('NAICS Industries', () => {
  it('should have all hierarchy levels', () => {
    const naicsDir = path.join(SOURCE_DIR, 'NAICS')
    const expectedFiles = [
      'Sectors.tsv',
      'Subsectors.tsv',
      'IndustryGroups.tsv',
      'Industries.tsv',
      'NationalIndustries.tsv',
    ]

    for (const file of expectedFiles) {
      expect(
        fs.existsSync(path.join(naicsDir, file)),
        `Missing NAICS file: ${file}`
      ).toBe(true)
    }
  })

  it('should have hierarchy relationships', () => {
    const relFile = path.join(SOURCE_DIR, 'NAICS', 'relationships', 'Hierarchy.tsv')
    expect(fs.existsSync(relFile), 'Missing NAICS hierarchy relationships').toBe(true)

    const { rows } = parseTSV(relFile)
    expect(rows.length).toBeGreaterThan(0)
  })
})

describe('UNSPSC Products', () => {
  it('should have all hierarchy levels', () => {
    const unspscDir = path.join(SOURCE_DIR, 'UNSPSC')
    const expectedFiles = ['Segments.tsv', 'Families.tsv', 'Commodities.tsv']

    for (const file of expectedFiles) {
      expect(
        fs.existsSync(path.join(unspscDir, file)),
        `Missing UNSPSC file: ${file}`
      ).toBe(true)
    }
  })

  it('commodity IDs should be human-readable names', () => {
    const file = path.join(SOURCE_DIR, 'UNSPSC', 'Commodities.tsv')
    const { rows } = parseTSV(file)

    // Sample check - first 50 rows
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const row = rows[i]
      // ID should contain underscores or hyphens (indicating it's a readable name)
      // and should NOT be a pure 8-digit code
      expect(
        UNSPSC_CODE_PATTERN.test(row.id),
        `UNSPSC Commodity row ${i + 1}: ID '${row.id}' should not be an 8-digit code`
      ).toBe(false)
    }
  })
})

describe('APQC Processes', () => {
  it('should have all hierarchy levels', () => {
    const apqcDir = path.join(SOURCE_DIR, 'APQC')
    const expectedFiles = ['Categories.tsv', 'ProcessGroups.tsv', 'Processes.tsv', 'Activities.tsv']

    for (const file of expectedFiles) {
      expect(
        fs.existsSync(path.join(apqcDir, file)),
        `Missing APQC file: ${file}`
      ).toBe(true)
    }
  })
})

describe('GS1 Standards', () => {
  it('should have all entity types', () => {
    const gs1Dir = path.join(SOURCE_DIR, 'GS1')
    const expectedFiles = [
      'Identifiers.tsv',
      'BusinessSteps.tsv',
      'Dispositions.tsv',
      'SupplyChainEvents.tsv',
      'Classes.tsv',
      'LocationTypes.tsv',
    ]

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(gs1Dir, file)), `Missing GS1 file: ${file}`).toBe(true)
    }
  })

  it('should have relationship files', () => {
    const relDir = path.join(SOURCE_DIR, 'GS1', 'relationships')
    const expectedFiles = [
      'LocationTypes.Hierarchy.tsv',
      'Identifiers.Classes.tsv',
      'BusinessSteps.Verbs.tsv',
      'Dispositions.Verbs.tsv',
    ]

    for (const file of expectedFiles) {
      expect(
        fs.existsSync(path.join(relDir, file)),
        `Missing GS1 relationship file: ${file}`
      ).toBe(true)
    }
  })
})

describe('ONET Work Data', () => {
  it('should have core entity files', () => {
    const onetDir = path.join(SOURCE_DIR, 'ONET')
    const expectedFiles = [
      'Occupations.tsv',
      'Elements.tsv',
      'Tasks.tsv',
      'WorkContexts.tsv',
      'DetailedWorkActivities.tsv',
    ]

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(onetDir, file)), `Missing ONET file: ${file}`).toBe(true)
    }
  })

  it('Task IDs should be human-readable descriptions', () => {
    const file = path.join(SOURCE_DIR, 'ONET', 'Tasks.tsv')
    const { rows } = parseTSV(file)

    // Sample check
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i]
      // Task IDs should contain underscores (word separators)
      expect(
        row.id.includes('_'),
        `ONET Task row ${i + 1}: ID '${row.id}' should be a human-readable description with underscores`
      ).toBe(true)
    }
  })
})
