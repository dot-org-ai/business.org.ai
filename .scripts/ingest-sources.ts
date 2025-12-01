#!/usr/bin/env tsx

/**
 * Source Data Ingestion Script
 *
 * ARCHITECTURE:
 *   .standards/ = Faithful 1:1 translation of each external source file
 *              with standard schema: url, ns, type, id, name, description, code + original columns
 *
 *   .data/   = Normalized/unified view (handled by generate-data.ts)
 *              - DWA + IWA + WorkActivities → unified Activities hierarchy
 *              - UNSPSC + NAPCS + GS1 → unified Products/Services
 *
 * URL Pattern:
 *   url: https://standards.org.ai/[Source]/[Type]/[Identifier]
 *   canonical: https://[source].org.ai/[Type]/[Identifier]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths
const ROOT_DATA_DIR = path.resolve(__dirname, '../../../.data')
const ROOT_SOURCE_DIR = path.resolve(__dirname, '../../../.standards')
const SOURCE_DIR = path.resolve(__dirname, '../.standards')

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

  // Handle Windows-style \r\n line endings
  const headers = lines[0].replace(/\r$/, '').split('\t').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.replace(/\r$/, '').split('\t')
    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header] = (values[i] || '').trim()
    })
    return row
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
  const rows = data.map(row => headers.map(h => (row[h] ?? '').toString()).join('\t'))
  const content = [headers.join('\t'), ...rows].join('\n')

  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`  ✅ ${path.relative(SOURCE_DIR, filePath)} (${data.length} rows)`)
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Convert text to readable Wikipedia_style ID (with underscores)
 */
function toReadableId(text: string | undefined): string {
  if (!text) return ''
  return text
    .replace(/\//g, '_or_') // Convert / to implied "or"
    .replace(/[^\w\s-]/g, '') // Remove special chars except hyphen
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores
}

// ============================================================================
// ONET Ingestion - Faithful 1:1 Translation (41 files)
// ============================================================================

function ingestONET(): void {
  console.log('\n👷 Ingesting ONET (41 files)...')

  const onetDir = path.join(ROOT_SOURCE_DIR, 'ONET')
  if (!fs.existsSync(onetDir)) {
    console.warn('  ⚠️  ONET source directory not found')
    return
  }

  const outDir = path.join(SOURCE_DIR, 'ONET')
  const relDir = path.join(outDir, 'relationships')
  ensureDir(outDir)
  ensureDir(relDir)

  // ===== ENTITY FILES =====

  // 1. Occupations (from OccupationData)
  const occupations = parseTSV(path.join(onetDir, 'ONET.OccupationData.tsv'))
  const occEntities = occupations.map(row => ({
    url: `https://standards.org.ai/ONET/Occupations/${toReadableId(row.title)}`,
    canonical: `https://onet.org.ai/Occupations/${toReadableId(row.title)}`,
    ns: 'standards.org.ai',
    type: 'Occupation',
    id: toReadableId(row.title),
    code: row.oNETSOCCode || '',
    name: row.title || '',
    description: row.description || '',
  }))
  writeTSV(path.join(outDir, 'Occupations.tsv'), occEntities)

  // 2. Elements (Content Model - taxonomy of abilities, skills, knowledge)
  const contentModel = parseTSV(path.join(onetDir, 'ONET.ContentModelReference.tsv'))
  const elements = contentModel.map(row => ({
    url: `https://standards.org.ai/ONET/Elements/${toReadableId(row.elementName)}`,
    canonical: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    ns: 'standards.org.ai',
    type: 'Element',
    id: toReadableId(row.elementName),
    code: row.elementID || '',
    name: row.elementName || '',
    description: row.description || '',
  }))
  writeTSV(path.join(outDir, 'Elements.tsv'), elements)

  // 3. Detailed Work Activities (DWA)
  const dwaRef = parseTSV(path.join(onetDir, 'ONET.DWAReference.tsv'))
  const dwas = dwaRef.map(row => ({
    url: `https://standards.org.ai/ONET/DetailedWorkActivities/${toReadableId(row.dWATitle)}`,
    canonical: `https://onet.org.ai/DetailedWorkActivities/${toReadableId(row.dWATitle)}`,
    ns: 'standards.org.ai',
    type: 'DetailedWorkActivity',
    id: toReadableId(row.dWATitle),
    code: row.dWAID || '',
    name: row.dWATitle || '',
    description: row.dWATitle || '',
  }))
  writeTSV(path.join(outDir, 'DetailedWorkActivities.tsv'), dwas)

  // 4. Intermediate Work Activities (IWA)
  const iwaRef = parseTSV(path.join(onetDir, 'ONET.IWAReference.tsv'))
  const iwas = iwaRef.map(row => ({
    url: `https://standards.org.ai/ONET/IntermediateWorkActivities/${toReadableId(row.iWATitle)}`,
    canonical: `https://onet.org.ai/IntermediateWorkActivities/${toReadableId(row.iWATitle)}`,
    ns: 'standards.org.ai',
    type: 'IntermediateWorkActivity',
    id: toReadableId(row.iWATitle),
    code: row.iWAID || '',
    name: row.iWATitle || '',
    description: row.iWATitle || '',
  }))
  writeTSV(path.join(outDir, 'IntermediateWorkActivities.tsv'), iwas)

  // 5. Tasks (TaskStatements)
  const tasks = parseTSV(path.join(onetDir, 'ONET.TaskStatements.tsv'))
  const taskEntities = tasks.map(row => {
    // Create readable ID from first 50 chars of task description
    const shortTask = (row.task || '').slice(0, 60).replace(/[^\w\s]/g, '').trim()
    return {
      url: `https://standards.org.ai/ONET/Tasks/${toReadableId(shortTask)}`,
      canonical: `https://onet.org.ai/Tasks/${toReadableId(shortTask)}`,
      ns: 'standards.org.ai',
      type: 'Task',
      id: toReadableId(shortTask),
      code: row.taskID || '',
      name: row.task || '',
      description: row.task || '',
      occupationCode: row.oNETSOCCode || '',
      taskType: row.taskType || '',
    }
  })
  // Dedupe by code (taskID)
  const seenTaskCodes = new Set<string>()
  const dedupedTasks = taskEntities.filter(t => {
    if (!t.code || seenTaskCodes.has(t.code)) return false
    seenTaskCodes.add(t.code)
    return true
  })
  writeTSV(path.join(outDir, 'Tasks.tsv'), dedupedTasks)

  // 6. Emerging Tasks
  const emergingTasks = parseTSV(path.join(onetDir, 'ONET.EmergingTasks.tsv'))
  const emergingTaskEntities = emergingTasks.map(row => ({
    url: `https://standards.org.ai/ONET/EmergingTasks/${toReadableId((row.task || '').slice(0, 60))}`,
    canonical: `https://onet.org.ai/EmergingTasks/${toReadableId((row.task || '').slice(0, 60))}`,
    ns: 'standards.org.ai',
    type: 'EmergingTask',
    id: toReadableId((row.task || '').slice(0, 60)),
    code: `${row.oNETSOCCode}_${row.incumbentResponse}` || '',
    name: row.task || '',
    description: row.task || '',
    occupationCode: row.oNETSOCCode || '',
    category: row.category || '',
  }))
  writeTSV(path.join(outDir, 'EmergingTasks.tsv'), emergingTaskEntities)

  // 7. Job Zones (Reference)
  const jobZoneRef = parseTSV(path.join(onetDir, 'ONET.JobZoneReference.tsv'))
  const jobZones = jobZoneRef.map(row => ({
    url: `https://standards.org.ai/ONET/JobZones/${row.jobZone}`,
    canonical: `https://onet.org.ai/JobZones/${row.jobZone}`,
    ns: 'standards.org.ai',
    type: 'JobZone',
    id: row.jobZone || '',
    code: row.jobZone || '',
    name: row.name || row.jobZone || '',
    description: row.experience || '',
    education: row.education || '',
    training: row.jobTraining || '',
    examples: row.examples || '',
    svpRange: row.sVPRange || '',
  }))
  writeTSV(path.join(outDir, 'JobZones.tsv'), jobZones)

  // 8. Scales Reference
  const scales = parseTSV(path.join(onetDir, 'ONET.ScalesReference.tsv'))
  const scaleEntities = scales.map(row => ({
    url: `https://standards.org.ai/ONET/Scales/${row.scaleID}`,
    canonical: `https://onet.org.ai/Scales/${row.scaleID}`,
    ns: 'standards.org.ai',
    type: 'Scale',
    id: row.scaleID || '',
    code: row.scaleID || '',
    name: row.scaleName || '',
    description: row.scaleName || '',
    minimum: row.minimum || '',
    maximum: row.maximum || '',
  }))
  writeTSV(path.join(outDir, 'Scales.tsv'), scaleEntities)

  // 9. Work Context Categories
  const workContextCats = parseTSV(path.join(onetDir, 'ONET.WorkContextCategories.tsv'))
  const workContextCatEntities = workContextCats.map(row => ({
    url: `https://standards.org.ai/ONET/WorkContextCategories/${toReadableId(row.categoryDescription)}`,
    canonical: `https://onet.org.ai/WorkContextCategories/${toReadableId(row.categoryDescription)}`,
    ns: 'standards.org.ai',
    type: 'WorkContextCategory',
    id: toReadableId(row.categoryDescription),
    code: row.category || '',
    name: row.categoryDescription || '',
    description: row.categoryDescription || '',
    elementId: row.elementID || '',
    scaleId: row.scaleID || '',
  }))
  writeTSV(path.join(outDir, 'WorkContextCategories.tsv'), workContextCatEntities)

  // 10. Education Categories
  const eduCats = parseTSV(path.join(onetDir, 'ONET.EducationTrainingAndExperienceCategories.tsv'))
  const eduCatEntities = eduCats.map(row => ({
    url: `https://standards.org.ai/ONET/EducationCategories/${toReadableId(row.categoryDescription)}`,
    canonical: `https://onet.org.ai/EducationCategories/${toReadableId(row.categoryDescription)}`,
    ns: 'standards.org.ai',
    type: 'EducationCategory',
    id: toReadableId(row.categoryDescription),
    code: row.category || '',
    name: row.categoryDescription || '',
    description: row.categoryDescription || '',
    scaleId: row.scaleID || '',
  }))
  writeTSV(path.join(outDir, 'EducationCategories.tsv'), eduCatEntities)

  // 11. Task Categories
  const taskCats = parseTSV(path.join(onetDir, 'ONET.TaskCategories.tsv'))
  const taskCatEntities = taskCats.map(row => ({
    url: `https://standards.org.ai/ONET/TaskCategories/${toReadableId(row.categoryDescription)}`,
    canonical: `https://onet.org.ai/TaskCategories/${toReadableId(row.categoryDescription)}`,
    ns: 'standards.org.ai',
    type: 'TaskCategory',
    id: toReadableId(row.categoryDescription),
    code: `${row.scaleID}_${row.category}`,
    name: row.categoryDescription || '',
    description: row.categoryDescription || '',
    scaleId: row.scaleID || '',
    category: row.category || '',
  }))
  writeTSV(path.join(outDir, 'TaskCategories.tsv'), taskCatEntities)

  // 12. UNSPSC Reference (tools/technology)
  const unspscRef = parseTSV(path.join(onetDir, 'ONET.UNSPSCReference.tsv'))
  const unspscEntities = unspscRef.map(row => ({
    url: `https://standards.org.ai/ONET/UNSPSCCommodities/${toReadableId(row.commodityTitle)}`,
    canonical: `https://onet.org.ai/UNSPSCCommodities/${toReadableId(row.commodityTitle)}`,
    ns: 'standards.org.ai',
    type: 'UNSPSCCommodity',
    id: toReadableId(row.commodityTitle),
    code: row.commodityCode || '',
    name: row.commodityTitle || '',
    description: row.commodityTitle || '',
  }))
  writeTSV(path.join(outDir, 'UNSPSCCommodities.tsv'), unspscEntities)

  // 13. Alternate Titles (no code - these are just job title variations)
  const altTitles = parseTSV(path.join(onetDir, 'ONET.AlternateTitles.tsv'))
  const altTitleEntities = altTitles.map(row => ({
    url: `https://standards.org.ai/ONET/AlternateTitles/${toReadableId(row.alternateTitle)}`,
    canonical: `https://onet.org.ai/AlternateTitles/${toReadableId(row.alternateTitle)}`,
    ns: 'standards.org.ai',
    type: 'AlternateTitle',
    id: toReadableId(row.alternateTitle),
    name: row.alternateTitle || '',
    description: row.alternateTitle || '',
    occupationCode: row.oNETSOCCode || '',
    shortTitle: row.shortTitle || '',
  }))
  // Dedupe
  const seenAltTitles = new Set<string>()
  const dedupedAltTitles = altTitleEntities.filter(t => {
    if (!t.id || seenAltTitles.has(t.id)) return false
    seenAltTitles.add(t.id)
    return true
  })
  writeTSV(path.join(outDir, 'AlternateTitles.tsv'), dedupedAltTitles)

  // 14. RIASEC Keywords
  const riasec = parseTSV(path.join(onetDir, 'ONET.RIASECKeywords.tsv'))
  const riasecEntities = riasec.map(row => ({
    url: `https://standards.org.ai/ONET/RIASECKeywords/${toReadableId(row.keyword)}`,
    canonical: `https://onet.org.ai/RIASECKeywords/${toReadableId(row.keyword)}`,
    ns: 'standards.org.ai',
    type: 'RIASECKeyword',
    id: toReadableId(row.keyword),
    code: row.elementID || '',
    name: row.keyword || '',
    description: `${row.elementName} ${row.keywordType}: ${row.keyword}`,
    riasecArea: row.elementName || '',
    keywordType: row.keywordType || '',
  }))
  writeTSV(path.join(outDir, 'RIASECKeywords.tsv'), riasecEntities)

  // 15. Level Scale Anchors
  const anchors = parseTSV(path.join(onetDir, 'ONET.LevelScaleAnchors.tsv'))
  const anchorEntities = anchors.map(row => ({
    url: `https://standards.org.ai/ONET/ScaleAnchors/${row.elementID}_${row.scaleID}_${row.anchorValue}`,
    canonical: `https://onet.org.ai/ScaleAnchors/${row.elementID}_${row.scaleID}_${row.anchorValue}`,
    ns: 'standards.org.ai',
    type: 'ScaleAnchor',
    id: `${row.elementID}_${row.scaleID}_${row.anchorValue}`,
    code: row.elementID || '',
    name: row.anchorDescription || `Level ${row.anchorValue}`,
    description: row.anchorDescription || '',
    elementId: row.elementID || '',
    elementName: row.elementName || '',
    scaleId: row.scaleID || '',
    anchorValue: row.anchorValue || '',
  }))
  writeTSV(path.join(outDir, 'ScaleAnchors.tsv'), anchorEntities)

  // ===== RELATIONSHIP FILES =====

  // 16. Abilities (Occupation → Element ratings)
  const abilities = parseTSV(path.join(onetDir, 'ONET.Abilities.tsv'))
  const abilityRels = abilities.map(row => ({
    from: `https://onet.org.ai/Occupations/${toReadableId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    predicate: 'requiresAbility',
    reverse: 'requiredByOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
    n: row.n || '',
    standardError: row.standardError || '',
    lowerCIBound: row.lowerCIBound || '',
    upperCIBound: row.upperCIBound || '',
    recommendSuppress: row.recommendSuppress || '',
    notRelevant: row.notRelevant || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Abilities.tsv'), abilityRels)

  // 17. Skills (Occupation → Element ratings)
  const skills = parseTSV(path.join(onetDir, 'ONET.Skills.tsv'))
  const skillRels = skills.map(row => ({
    from: `https://onet.org.ai/Occupations/${toReadableId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    predicate: 'requiresSkill',
    reverse: 'requiredByOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
    n: row.n || '',
    standardError: row.standardError || '',
    lowerCIBound: row.lowerCIBound || '',
    upperCIBound: row.upperCIBound || '',
    recommendSuppress: row.recommendSuppress || '',
    notRelevant: row.notRelevant || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Skills.tsv'), skillRels)

  // 18. Knowledge (Occupation → Element ratings)
  const knowledge = parseTSV(path.join(onetDir, 'ONET.Knowledge.tsv'))
  const knowledgeRels = knowledge.map(row => ({
    from: `https://onet.org.ai/Occupations/${toReadableId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    predicate: 'requiresKnowledge',
    reverse: 'requiredByOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
    n: row.n || '',
    standardError: row.standardError || '',
    lowerCIBound: row.lowerCIBound || '',
    upperCIBound: row.upperCIBound || '',
    recommendSuppress: row.recommendSuppress || '',
    notRelevant: row.notRelevant || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Knowledge.tsv'), knowledgeRels)

  // 19. Work Activities (Occupation → Element ratings)
  const workActivities = parseTSV(path.join(onetDir, 'ONET.WorkActivities.tsv'))
  const workActivityRels = workActivities.map(row => ({
    from: `https://onet.org.ai/Occupations/${toReadableId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    predicate: 'performsWorkActivity',
    reverse: 'performedByOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
    n: row.n || '',
    standardError: row.standardError || '',
    lowerCIBound: row.lowerCIBound || '',
    upperCIBound: row.upperCIBound || '',
    recommendSuppress: row.recommendSuppress || '',
    notRelevant: row.notRelevant || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.WorkActivities.tsv'), workActivityRels)

  // 20. Work Context (Occupation → Element ratings)
  const workContext = parseTSV(path.join(onetDir, 'ONET.WorkContext.tsv'))
  const workContextRels = workContext.map(row => ({
    from: `https://onet.org.ai/Occupations/${toReadableId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    predicate: 'hasWorkContext',
    reverse: 'contextOfOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
    n: row.n || '',
    standardError: row.standardError || '',
    lowerCIBound: row.lowerCIBound || '',
    upperCIBound: row.upperCIBound || '',
    recommendSuppress: row.recommendSuppress || '',
    notRelevant: row.notRelevant || '',
    category: row.category || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.WorkContexts.tsv'), workContextRels)

  // 21. Work Styles (Occupation → Element ratings)
  const workStyles = parseTSV(path.join(onetDir, 'ONET.WorkStyles.tsv'))
  const workStyleRels = workStyles.map(row => ({
    from: `https://onet.org.ai/Occupations/${toReadableId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    predicate: 'hasWorkStyle',
    reverse: 'styleOfOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
    n: row.n || '',
    standardError: row.standardError || '',
    lowerCIBound: row.lowerCIBound || '',
    upperCIBound: row.upperCIBound || '',
    recommendSuppress: row.recommendSuppress || '',
    notRelevant: row.notRelevant || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.WorkStyles.tsv'), workStyleRels)

  // 22. Work Values (Occupation → Element ratings)
  const workValues = parseTSV(path.join(onetDir, 'ONET.WorkValues.tsv'))
  const workValueRels = workValues.map(row => ({
    from: `https://onet.org.ai/Occupations/${toReadableId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    predicate: 'hasWorkValue',
    reverse: 'valueOfOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.WorkValues.tsv'), workValueRels)

  // 23. Interests (Occupation → Element ratings)
  const interests = parseTSV(path.join(onetDir, 'ONET.Interests.tsv'))
  const interestRels = interests.map(row => ({
    from: `https://onet.org.ai/Occupations/${toReadableId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    predicate: 'hasInterest',
    reverse: 'interestOfOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Interests.tsv'), interestRels)

  // 24. Job Zones (Occupation → JobZone)
  const jobZoneRatings = parseTSV(path.join(onetDir, 'ONET.JobZones.tsv'))
  const jobZoneRels = jobZoneRatings.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: `https://onet.org.ai/JobZones/${row.jobZone}`,
    predicate: 'inJobZone',
    reverse: 'hasOccupation',
  }))
  writeTSV(path.join(relDir, 'Occupations.JobZones.tsv'), jobZoneRels)

  // 25. Task Ratings (Occupation → Task)
  const taskRatings = parseTSV(path.join(onetDir, 'ONET.TaskRatings.tsv'))
  const taskRatingRels = taskRatings.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: `https://onet.org.ai/Tasks/${row.taskID}`,
    predicate: 'performsTask',
    reverse: 'performedByOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
    n: row.n || '',
    standardError: row.standardError || '',
    lowerCIBound: row.lowerCIBound || '',
    upperCIBound: row.upperCIBound || '',
    recommendSuppress: row.recommendSuppress || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Tasks.tsv'), taskRatingRels)

  // 26. Related Occupations
  const relatedOccs = parseTSV(path.join(onetDir, 'ONET.RelatedOccupations.tsv'))
  const relatedOccRels = relatedOccs.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: `https://onet.org.ai/Occupations/${row.relatedONETSOCCode}`,
    predicate: 'relatedTo',
    reverse: 'relatedTo',
    tier: row.relatednessTier || '',
    index: row.index || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.RelatedOccupations.tsv'), relatedOccRels)

  // 27. Alternate Titles (Occupation → AlternateTitle)
  const altTitleRels = altTitles.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: `https://onet.org.ai/AlternateTitles/${toReadableId(row.alternateTitle)}`,
    predicate: 'hasAlternateTitle',
    reverse: 'alternateTitleOf',
    shortTitle: row.shortTitle || '',
    source: row.source || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.AlternateTitles.tsv'), altTitleRels)

  // 28. Reported Titles
  const reportedTitles = parseTSV(path.join(onetDir, 'ONET.SampleOfReportedTitles.tsv'))
  const reportedTitleRels = reportedTitles.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: `https://onet.org.ai/ReportedTitles/${toReadableId(row.reportedJobTitle)}`,
    predicate: 'hasReportedTitle',
    reverse: 'reportedTitleOf',
    reportedTitle: row.reportedJobTitle || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.ReportedTitles.tsv'), reportedTitleRels)

  // 29. Education/Training/Experience (Occupation → EducationCategory)
  const eduExp = parseTSV(path.join(onetDir, 'ONET.EducationTrainingAndExperience.tsv'))
  const eduExpRels = eduExp.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: `https://onet.org.ai/EducationCategories/${toReadableId(row.categoryDescription) || row.category}`,
    predicate: 'hasEducationRequirement',
    reverse: 'educationRequirementOf',
    scaleId: row.scaleID || '',
    category: row.category || '',
    dataValue: row.dataValue || '',
    n: row.n || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Education.tsv'), eduExpRels)

  // 30. Technology Skills (Occupation → UNSPSCCommodity)
  const techSkills = parseTSV(path.join(onetDir, 'ONET.TechnologySkills.tsv'))
  const techSkillRels = techSkills.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: `https://onet.org.ai/UNSPSCCommodities/${toReadableId(row.commodityTitle)}`,
    predicate: 'usesTechnology',
    reverse: 'usedByOccupation',
    example: row.example || '',
    commodityCode: row.commodityCode || '',
    hotTechnology: row.hotTechnology || '',
    inDemand: row.inDemand || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.TechnologySkills.tsv'), techSkillRels)

  // 31. Tools Used (Occupation → UNSPSCCommodity)
  const toolsUsed = parseTSV(path.join(onetDir, 'ONET.ToolsUsed.tsv'))
  const toolUsedRels = toolsUsed.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: `https://onet.org.ai/UNSPSCCommodities/${toReadableId(row.commodityTitle)}`,
    predicate: 'usesTool',
    reverse: 'usedByOccupation',
    example: row.example || '',
    commodityCode: row.commodityCode || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.ToolsUsed.tsv'), toolUsedRels)

  // 32. Tasks to DWAs
  const tasksToDwas = parseTSV(path.join(onetDir, 'ONET.TasksToDWAs.tsv'))
  const taskDwaRels = tasksToDwas.map(row => ({
    from: `https://onet.org.ai/Tasks/${row.taskID}`,
    to: `https://onet.org.ai/DetailedWorkActivities/${row.dWAID}`,
    predicate: 'mappedToDWA',
    reverse: 'dwaOfTask',
  }))
  writeTSV(path.join(relDir, 'Tasks.DetailedWorkActivities.tsv'), taskDwaRels)

  // 33. Abilities to Work Activities
  const abilitiesToWA = parseTSV(path.join(onetDir, 'ONET.AbilitiesToWorkActivities.tsv'))
  const abilityWaRels = abilitiesToWA.map(row => ({
    from: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    to: `https://onet.org.ai/Elements/${toReadableId(row.gWATitle)}`,
    predicate: 'relatedToWorkActivity',
    reverse: 'relatedToAbility',
    elementId: row.elementID || '',
    gwaId: row.gWAID || '',
  }))
  writeTSV(path.join(relDir, 'Abilities.WorkActivities.tsv'), abilityWaRels)

  // 34. Abilities to Work Context
  const abilitiesToWC = parseTSV(path.join(onetDir, 'ONET.AbilitiesToWorkContext.tsv'))
  const abilityWcRels = abilitiesToWC.map(row => ({
    from: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    to: `https://onet.org.ai/Elements/${toReadableId(row.workContext)}`,
    predicate: 'relatedToWorkContext',
    reverse: 'relatedToAbility',
    elementId: row.elementID || '',
    workContextId: row.workContextID || '',
  }))
  writeTSV(path.join(relDir, 'Abilities.WorkContexts.tsv'), abilityWcRels)

  // 35. Skills to Work Activities
  const skillsToWA = parseTSV(path.join(onetDir, 'ONET.SkillsToWorkActivities.tsv'))
  const skillWaRels = skillsToWA.map(row => ({
    from: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    to: `https://onet.org.ai/Elements/${toReadableId(row.gWATitle)}`,
    predicate: 'relatedToWorkActivity',
    reverse: 'relatedToSkill',
    elementId: row.elementID || '',
    gwaId: row.gWAID || '',
  }))
  writeTSV(path.join(relDir, 'Skills.WorkActivities.tsv'), skillWaRels)

  // 36. Skills to Work Context
  const skillsToWC = parseTSV(path.join(onetDir, 'ONET.SkillsToWorkContext.tsv'))
  const skillWcRels = skillsToWC.map(row => ({
    from: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    to: `https://onet.org.ai/Elements/${toReadableId(row.workContext)}`,
    predicate: 'relatedToWorkContext',
    reverse: 'relatedToSkill',
    elementId: row.elementID || '',
    workContextId: row.workContextID || '',
  }))
  writeTSV(path.join(relDir, 'Skills.WorkContexts.tsv'), skillWcRels)

  // 37. Interests Illustrative Activities
  const interestActivities = parseTSV(path.join(onetDir, 'ONET.InterestsIllustrativeActivities.tsv'))
  const interestActivityRels = interestActivities.map(row => ({
    from: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    to: `https://onet.org.ai/IllustrativeActivities/${toReadableId(row.activityDescription)}`,
    predicate: 'hasIllustrativeActivity',
    reverse: 'illustratesInterest',
    elementId: row.elementID || '',
  }))
  writeTSV(path.join(relDir, 'Interests.Activities.tsv'), interestActivityRels)

  // 38. Interests Illustrative Occupations
  const interestOccs = parseTSV(path.join(onetDir, 'ONET.InterestsIllustrativeOccupations.tsv'))
  const interestOccRels = interestOccs.map(row => ({
    from: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    to: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    predicate: 'hasIllustrativeOccupation',
    reverse: 'illustratesInterest',
    elementId: row.elementID || '',
  }))
  writeTSV(path.join(relDir, 'Interests.Occupations.tsv'), interestOccRels)

  // 39. Basic Interests to RIASEC
  const basicInterests = parseTSV(path.join(onetDir, 'ONET.BasicInterestsToRIASEC.tsv'))
  const basicInterestRels = basicInterests.map(row => ({
    from: `https://onet.org.ai/Elements/${toReadableId(row.elementName)}`,
    to: `https://onet.org.ai/RIASEC/${row.rIASECAreaID}`,
    predicate: 'belongsToRIASEC',
    reverse: 'hasBasicInterest',
    elementId: row.elementID || '',
    riasecId: row.rIASECAreaID || '',
  }))
  writeTSV(path.join(relDir, 'BasicInterests.RIASEC.tsv'), basicInterestRels)

  // 40. Occupation Level Metadata
  const occMetadata = parseTSV(path.join(onetDir, 'ONET.OccupationLevelMetadata.tsv'))
  const occMetaRels = occMetadata.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: `https://onet.org.ai/MetadataItems/${toReadableId(row.item)}`,
    predicate: 'hasMetadata',
    reverse: 'metadataOf',
    item: row.item || '',
    response: row.response || '',
    n: row.n || '',
    percent: row.percent || '',
    date: row.date || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Metadata.tsv'), occMetaRels)
}

// ============================================================================
// NAICS Ingestion
// ============================================================================

function ingestNAICS(): void {
  console.log('\n📊 Ingesting NAICS...')

  const naicsDir = path.join(ROOT_DATA_DIR, 'NAICS')
  if (!fs.existsSync(naicsDir)) {
    console.warn('  ⚠️  NAICS source directory not found')
    return
  }

  const outDir = path.join(SOURCE_DIR, 'NAICS')
  const relDir = path.join(outDir, 'relationships')
  ensureDir(outDir)
  ensureDir(relDir)

  // Read NAICS codes
  const naicsData = parseTSV(path.join(naicsDir, 'NAICS.Codes.tsv'))

  // Categorize by hierarchy level
  const sectors: Record<string, string>[] = []
  const subsectors: Record<string, string>[] = []
  const industryGroups: Record<string, string>[] = []
  const industries: Record<string, string>[] = []
  const nationalIndustries: Record<string, string>[] = []
  const hierarchy: Record<string, string>[] = []

  for (const row of naicsData) {
    const code = row.code || ''
    const cleanCode = code.replace(/[^0-9]/g, '')
    const entity = {
      url: `https://standards.org.ai/NAICS/${toReadableId(row.title)}`,
      canonical: `https://naics.org.ai/${toReadableId(row.title)}`,
      ns: 'standards.org.ai',
      type: '',
      id: toReadableId(row.title),
      code: code,
      name: row.title || '',
      description: row.description || '',
    }

    if (cleanCode.length === 2) {
      entity.type = 'Sector'
      sectors.push(entity)
    } else if (cleanCode.length === 3) {
      entity.type = 'Subsector'
      subsectors.push(entity)
      hierarchy.push({
        from: `https://naics.org.ai/${toReadableId(row.title)}`,
        to: `https://naics.org.ai/Sector/${cleanCode.slice(0, 2)}`,
        predicate: 'partOf',
        reverse: 'hasPart',
      })
    } else if (cleanCode.length === 4) {
      entity.type = 'IndustryGroup'
      industryGroups.push(entity)
      hierarchy.push({
        from: `https://naics.org.ai/${toReadableId(row.title)}`,
        to: `https://naics.org.ai/Subsector/${cleanCode.slice(0, 3)}`,
        predicate: 'partOf',
        reverse: 'hasPart',
      })
    } else if (cleanCode.length === 5) {
      entity.type = 'Industry'
      industries.push(entity)
      hierarchy.push({
        from: `https://naics.org.ai/${toReadableId(row.title)}`,
        to: `https://naics.org.ai/IndustryGroup/${cleanCode.slice(0, 4)}`,
        predicate: 'partOf',
        reverse: 'hasPart',
      })
    } else if (cleanCode.length === 6) {
      entity.type = 'NationalIndustry'
      nationalIndustries.push(entity)
      hierarchy.push({
        from: `https://naics.org.ai/${toReadableId(row.title)}`,
        to: `https://naics.org.ai/Industry/${cleanCode.slice(0, 5)}`,
        predicate: 'partOf',
        reverse: 'hasPart',
      })
    }
  }

  writeTSV(path.join(outDir, 'Sectors.tsv'), sectors)
  writeTSV(path.join(outDir, 'Subsectors.tsv'), subsectors)
  writeTSV(path.join(outDir, 'IndustryGroups.tsv'), industryGroups)
  writeTSV(path.join(outDir, 'Industries.tsv'), industries)
  writeTSV(path.join(outDir, 'NationalIndustries.tsv'), nationalIndustries)
  writeTSV(path.join(relDir, 'Hierarchy.tsv'), hierarchy)
}

// ============================================================================
// APQC Ingestion
// ============================================================================

function ingestAPQC(): void {
  console.log('\n📋 Ingesting APQC...')

  const apqcDir = path.join(ROOT_DATA_DIR, 'APQC')
  if (!fs.existsSync(apqcDir)) {
    console.warn('  ⚠️  APQC source directory not found')
    return
  }

  const outDir = path.join(SOURCE_DIR, 'APQC')
  const relDir = path.join(outDir, 'relationships')
  ensureDir(outDir)
  ensureDir(relDir)

  // Read hierarchy files
  const hierarchyTypes = ['Categories', 'ProcessGroups', 'Processes', 'Activities']
  const allHierarchy: Record<string, string>[] = []

  for (const typeName of hierarchyTypes) {
    const sourceFile = path.join(apqcDir, `APQC.${typeName}.tsv`)
    if (!fs.existsSync(sourceFile)) continue

    const data = parseTSV(sourceFile)
    const entities = data.map(row => ({
      url: `https://standards.org.ai/APQC/${typeName}/${toReadableId(row.name)}`,
      canonical: `https://apqc.org.ai/${typeName}/${toReadableId(row.name)}`,
      ns: 'standards.org.ai',
      type: typeName.replace(/s$/, '').replace(/ies$/, 'y'),
      id: toReadableId(row.name),
      code: row.code || '',
      name: row.name || '',
      description: row.description || row.name || '',
    }))

    writeTSV(path.join(outDir, `${typeName}.tsv`), entities)

    // Build hierarchy relationships
    for (const row of data) {
      if (row.parentCode) {
        allHierarchy.push({
          from: `https://apqc.org.ai/${typeName}/${toReadableId(row.name)}`,
          to: `https://apqc.org.ai/${row.parentCode}`,
          predicate: 'partOf',
          reverse: 'hasPart',
        })
      }
    }
  }

  writeTSV(path.join(relDir, 'Hierarchy.tsv'), allHierarchy)
}

// ============================================================================
// UNSPSC Ingestion
// ============================================================================

function ingestUNSPSC(): void {
  console.log('\n📦 Ingesting UNSPSC...')

  const sourceFile = path.join(ROOT_SOURCE_DIR, 'UNSPSC', 'UNSPSC.Codes.tsv')
  if (!fs.existsSync(sourceFile)) {
    console.warn('  ⚠️  UNSPSC source file not found')
    return
  }

  const outDir = path.join(SOURCE_DIR, 'UNSPSC')
  const relDir = path.join(outDir, 'relationships')
  ensureDir(outDir)
  ensureDir(relDir)

  const data = parseTSV(sourceFile)

  // Group by hierarchy level
  const segments = new Map<string, Record<string, string>>()
  const families = new Map<string, Record<string, string>>()
  const classes = new Map<string, Record<string, string>>()
  const commodities: Record<string, string>[] = []
  const hierarchy: Record<string, string>[] = []

  for (const row of data) {
    const segmentCode = row.segmentCode || ''
    const familyCode = row.familyCode || ''
    const classCode = row.classCode || ''
    const commodityCode = row.commodityCode || ''

    // Segment
    if (segmentCode && row.segmentTitle && !segments.has(segmentCode)) {
      segments.set(segmentCode, {
        url: `https://standards.org.ai/UNSPSC/Segments/${toReadableId(row.segmentTitle)}`,
        canonical: `https://unspsc.org.ai/Segments/${toReadableId(row.segmentTitle)}`,
        ns: 'standards.org.ai',
        type: 'Segment',
        id: toReadableId(row.segmentTitle),
        code: segmentCode,
        name: row.segmentTitle,
        description: row.segmentTitle,
      })
    }

    // Family
    if (familyCode && row.familyTitle && !families.has(familyCode)) {
      families.set(familyCode, {
        url: `https://standards.org.ai/UNSPSC/Families/${toReadableId(row.familyTitle)}`,
        canonical: `https://unspsc.org.ai/Families/${toReadableId(row.familyTitle)}`,
        ns: 'standards.org.ai',
        type: 'Family',
        id: toReadableId(row.familyTitle),
        code: familyCode,
        name: row.familyTitle,
        description: row.familyTitle,
        segmentCode: segmentCode,
      })
      hierarchy.push({
        from: `https://unspsc.org.ai/Families/${toReadableId(row.familyTitle)}`,
        to: `https://unspsc.org.ai/Segments/${toReadableId(row.segmentTitle)}`,
        predicate: 'partOf',
        reverse: 'hasPart',
      })
    }

    // Class
    if (classCode && row.classTitle && !classes.has(classCode)) {
      classes.set(classCode, {
        url: `https://standards.org.ai/UNSPSC/Classes/${toReadableId(row.classTitle)}`,
        canonical: `https://unspsc.org.ai/Classes/${toReadableId(row.classTitle)}`,
        ns: 'standards.org.ai',
        type: 'Class',
        id: toReadableId(row.classTitle),
        code: classCode,
        name: row.classTitle,
        description: row.classTitle,
        familyCode: familyCode,
      })
      hierarchy.push({
        from: `https://unspsc.org.ai/Classes/${toReadableId(row.classTitle)}`,
        to: `https://unspsc.org.ai/Families/${toReadableId(row.familyTitle)}`,
        predicate: 'partOf',
        reverse: 'hasPart',
      })
    }

    // Commodity
    if (commodityCode && row.commodityTitle) {
      commodities.push({
        url: `https://standards.org.ai/UNSPSC/Commodities/${toReadableId(row.commodityTitle)}`,
        canonical: `https://unspsc.org.ai/Commodities/${toReadableId(row.commodityTitle)}`,
        ns: 'standards.org.ai',
        type: 'Commodity',
        id: toReadableId(row.commodityTitle),
        code: commodityCode,
        name: row.commodityTitle,
        description: row.commodityTitle,
        classCode: classCode,
      })
      hierarchy.push({
        from: `https://unspsc.org.ai/Commodities/${toReadableId(row.commodityTitle)}`,
        to: `https://unspsc.org.ai/Classes/${toReadableId(row.classTitle)}`,
        predicate: 'partOf',
        reverse: 'hasPart',
      })
    }
  }

  writeTSV(path.join(outDir, 'Segments.tsv'), Array.from(segments.values()))
  writeTSV(path.join(outDir, 'Families.tsv'), Array.from(families.values()))
  writeTSV(path.join(outDir, 'Classes.tsv'), Array.from(classes.values()))
  writeTSV(path.join(outDir, 'Commodities.tsv'), commodities)
  writeTSV(path.join(relDir, 'Hierarchy.tsv'), hierarchy)
}

// ============================================================================
// NAPCS Ingestion
// ============================================================================

function ingestNAPCS(): void {
  console.log('\n🛎️ Ingesting NAPCS...')

  const napcsDir = path.join(ROOT_DATA_DIR, 'NAPCS')
  if (!fs.existsSync(napcsDir)) {
    console.warn('  ⚠️  NAPCS source directory not found')
    return
  }

  const outDir = path.join(SOURCE_DIR, 'NAPCS')
  const relDir = path.join(outDir, 'relationships')
  ensureDir(outDir)
  ensureDir(relDir)

  const hierarchyTypes = ['Sections', 'Groups', 'Classes', 'Subclasses']
  const allRels: Record<string, string>[] = []

  for (const typeName of hierarchyTypes) {
    const sourceFile = path.join(napcsDir, `NAPCS.${typeName}.tsv`)
    if (!fs.existsSync(sourceFile)) continue

    const data = parseTSV(sourceFile)
    const entities = data.map(row => ({
      url: `https://standards.org.ai/NAPCS/${typeName}/${toReadableId(row.name)}`,
      canonical: `https://napcs.org.ai/${typeName}/${toReadableId(row.name)}`,
      ns: 'standards.org.ai',
      type: typeName.replace(/s$/, '').replace(/es$/, ''),
      id: toReadableId(row.name),
      code: row.code || '',
      name: row.name || '',
      description: row.description || row.name || '',
    }))

    writeTSV(path.join(outDir, `${typeName}.tsv`), entities)

    // Build relationships
    for (const row of data) {
      if (row.parentCode) {
        allRels.push({
          from: `https://napcs.org.ai/${typeName}/${toReadableId(row.name)}`,
          to: `https://napcs.org.ai/${row.parentCode}`,
          predicate: 'partOf',
          reverse: 'hasPart',
        })
      }
    }
  }

  writeTSV(path.join(relDir, 'Relationships.tsv'), allRels)
}

// ============================================================================
// GS1 Ingestion
// ============================================================================

function ingestGS1(): void {
  console.log('\n🏷️ Ingesting GS1...')

  const gs1SourceDir = path.join(ROOT_SOURCE_DIR, 'GS1')
  if (!fs.existsSync(gs1SourceDir)) {
    console.warn('  ⚠️  GS1 source directory not found')
    return
  }

  const outDir = path.join(SOURCE_DIR, 'GS1')
  const relDir = path.join(outDir, 'relationships')
  ensureDir(outDir)
  ensureDir(relDir)

  // Classes (from Web Vocabulary)
  const classData = [
    { id: 'Product', name: 'Product', description: 'Any item upon which there is a need to retrieve pre-defined information' },
    { id: 'TradeItem', name: 'Trade Item', description: 'A product or service that is sold, delivered, or invoiced' },
    { id: 'Organization', name: 'Organization', description: 'A business, government body, department, charity, or institution' },
    { id: 'Place', name: 'Place', description: 'A physical location' },
    { id: 'Location', name: 'Location', description: 'A specific place or position' },
    { id: 'LogisticUnit', name: 'Logistic Unit', description: 'A unit of packaging used for shipping and handling' },
    { id: 'Asset', name: 'Asset', description: 'A physical or digital resource of value' },
    { id: 'Document', name: 'Document', description: 'A written, drawn, or recorded matter' },
  ]
  const classEntities = classData.map(row => ({
    url: `https://standards.org.ai/GS1/Classes/${row.id}`,
    canonical: `https://gs1.org.ai/Classes/${row.id}`,
    ns: 'standards.org.ai',
    type: 'Class',
    id: row.id,
    code: '',
    name: row.name,
    description: row.description,
  }))
  writeTSV(path.join(outDir, 'Classes.tsv'), classEntities)

  // Identifiers
  const identifiers = parseTSV(path.join(gs1SourceDir, 'GS1.Identifiers.tsv'))
  const identifierEntities = identifiers.map(row => ({
    url: `https://standards.org.ai/GS1/Identifiers/${row.identifier}`,
    canonical: `https://gs1.org.ai/Identifiers/${row.identifier}`,
    ns: 'standards.org.ai',
    type: 'Identifier',
    id: row.identifier || '',
    code: row.identifier || '',
    name: row.name || '',
    description: row.description || '',
    identifies: row.identifies || '',
  }))
  writeTSV(path.join(outDir, 'Identifiers.tsv'), identifierEntities)

  // Business Steps
  const businessSteps = parseTSV(path.join(gs1SourceDir, 'GS1.BusinessSteps.tsv'))
  const businessStepEntities = businessSteps.map(row => ({
    url: `https://standards.org.ai/GS1/BusinessSteps/${row.id || toReadableId(row.name)}`,
    canonical: `https://gs1.org.ai/BusinessSteps/${row.id || toReadableId(row.name)}`,
    ns: 'standards.org.ai',
    type: 'BusinessStep',
    id: row.id || toReadableId(row.name),
    code: '',
    name: row.name || '',
    description: row.description || '',
  }))
  writeTSV(path.join(outDir, 'BusinessSteps.tsv'), businessStepEntities)

  // Dispositions
  const dispositions = parseTSV(path.join(gs1SourceDir, 'GS1.Dispositions.tsv'))
  const dispositionEntities = dispositions.map(row => ({
    url: `https://standards.org.ai/GS1/Dispositions/${row.id || toReadableId(row.name)}`,
    canonical: `https://gs1.org.ai/Dispositions/${row.id || toReadableId(row.name)}`,
    ns: 'standards.org.ai',
    type: 'Disposition',
    id: row.id || toReadableId(row.name),
    code: '',
    name: row.name || '',
    description: row.description || '',
  }))
  writeTSV(path.join(outDir, 'Dispositions.tsv'), dispositionEntities)

  // Location Types
  const locTypes = parseTSV(path.join(gs1SourceDir, 'GS1.LocationTypes.tsv'))
  const locTypeEntities = locTypes.map(row => ({
    url: `https://standards.org.ai/GS1/LocationTypes/${row.id || toReadableId(row.name)}`,
    canonical: `https://gs1.org.ai/LocationTypes/${row.id || toReadableId(row.name)}`,
    ns: 'standards.org.ai',
    type: 'LocationType',
    id: row.id || toReadableId(row.name),
    code: '',
    name: row.name || '',
    description: row.description || '',
    parent: row.parent || '',
  }))
  writeTSV(path.join(outDir, 'LocationTypes.tsv'), locTypeEntities)

  // Location Type Hierarchy
  const locTypeHierarchy = locTypes
    .filter(row => row.parent)
    .map(row => ({
      from: `https://gs1.org.ai/LocationTypes/${row.id || toReadableId(row.name)}`,
      to: `https://gs1.org.ai/LocationTypes/${row.parent}`,
      predicate: 'partOf',
      reverse: 'hasPart',
    }))
  writeTSV(path.join(relDir, 'LocationTypes.Hierarchy.tsv'), locTypeHierarchy)

  // Identifier to Class relationships
  const identifierClassRels = identifiers.map(row => ({
    from: `https://gs1.org.ai/Identifiers/${row.identifier}`,
    to: `https://gs1.org.ai/Classes/${row.identifies}`,
    predicate: 'identifies',
    reverse: 'identifiedBy',
  }))
  writeTSV(path.join(relDir, 'Identifiers.Classes.tsv'), identifierClassRels)

  // Business Step to Verb mappings
  const bizStepVerbs = parseTSV(path.join(gs1SourceDir, 'GS1.BusinessStep.VerbMapping.tsv'))
  const bizStepVerbRels = bizStepVerbs.map(row => ({
    from: `https://gs1.org.ai/BusinessSteps/${row.businessStep}`,
    to: `https://verbs.org.ai/${row.verb}`,
    predicate: 'hasVerb',
    reverse: 'verbOfBusinessStep',
    noun: row.noun || '',
  }))
  writeTSV(path.join(relDir, 'BusinessSteps.Verbs.tsv'), bizStepVerbRels)

  // Disposition to Verb mappings
  const dispVerbs = parseTSV(path.join(gs1SourceDir, 'GS1.Disposition.VerbMapping.tsv'))
  const dispVerbRels = dispVerbs.map(row => ({
    from: `https://gs1.org.ai/Dispositions/${row.disposition}`,
    to: `https://verbs.org.ai/${row.verb}`,
    predicate: 'hasVerb',
    reverse: 'verbOfDisposition',
  }))
  writeTSV(path.join(relDir, 'Dispositions.Verbs.tsv'), dispVerbRels)

  console.log('  ✅ GS1 ingestion complete')
}

// ============================================================================
// Verbs Ingestion
// ============================================================================

function ingestVerbs(): void {
  console.log('\n📝 Ingesting Verbs...')

  const sourceFile = path.join(ROOT_DATA_DIR, 'Verbs.tsv')
  if (!fs.existsSync(sourceFile)) return

  const data = parseTSV(sourceFile)
  const seen = new Set<string>()

  const entities = data
    .filter(row => {
      const id = row.id || row.verb || ''
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map(row => {
      const id = row.id || row.verb || ''
      return {
        url: `https://verbs.org.ai/${id}`,
        ns: 'verbs.org.ai',
        type: 'Verb',
        id,
        name: row.verb || id,
        description: row.verb || id,
        tense3s: row.tense3s || '',
        pastTense: row.pastTense || '',
        gerund: row.gerund || '',
        noun: row.noun || '',
        inverse: row.inverse || '',
      }
    })

  writeTSV(path.join(SOURCE_DIR, 'Verbs.tsv'), entities)
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  console.log('🚀 Starting source ingestion...')
  console.log(`   ROOT_SOURCE_DIR: ${ROOT_SOURCE_DIR}`)
  console.log(`   ROOT_DATA_DIR: ${ROOT_DATA_DIR}`)
  console.log(`   OUTPUT: ${SOURCE_DIR}`)

  ensureDir(SOURCE_DIR)

  ingestONET()
  ingestNAICS()
  ingestAPQC()
  ingestUNSPSC()
  ingestNAPCS()
  ingestGS1()
  ingestVerbs()

  console.log('\n✨ Source ingestion complete!')
}

main()
