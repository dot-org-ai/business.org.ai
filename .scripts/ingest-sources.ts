#!/usr/bin/env tsx

/**
 * Source Data Ingestion Script
 *
 * Transforms raw source data into standardized .source/ format.
 *
 * For ONET, reads directly from .source/onet/ONET.*.tsv files (41 files)
 * For other standards, reads from processed .data/ files
 *
 * URL Pattern:
 *   url: https://standards.org.ai/[Source]/[Type]/[Name]
 *   canonical: https://[source].org.ai/[Type]/[Name] (only for sources we own)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths
const ROOT_DATA_DIR = path.resolve(__dirname, '../../../.data')
const ROOT_SOURCE_DIR = path.resolve(__dirname, '../../../.source')
const SOURCE_DIR = path.resolve(__dirname, '../.source')

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

  const headers = lines[0].split('\t')
  return lines.slice(1).map(line => {
    const values = line.split('\t')
    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header] = values[i] || ''
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

function toId(text: string | undefined): string {
  if (!text) return ''
  return text.replace(/[^\w\s-]/g, '').replace(/\s+/g, '')
}

/**
 * Convert text to readable Wikipedia_style ID (with underscores)
 */
function toReadableId(text: string | undefined): string {
  if (!text) return ''
  return text
    .replace(/[^\w\s-]/g, '') // Remove special chars except hyphen
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores
}

// ============================================================================
// ONET Ingestion (41 files)
// ============================================================================

function ingestONET(): void {
  console.log('\n👷 Ingesting ONET (41 files)...')

  const onetDir = path.join(ROOT_SOURCE_DIR, 'onet')
  if (!fs.existsSync(onetDir)) {
    console.warn('  ⚠️  ONET source directory not found')
    return
  }

  const outDir = path.join(SOURCE_DIR, 'ONET')
  const relDir = path.join(outDir, 'relationships')
  ensureDir(outDir)
  ensureDir(relDir)

  // ===== ENTITY TYPES =====

  // 1. Occupations (from OccupationData)
  const occupations = parseTSV(path.join(onetDir, 'ONET.OccupationData.tsv'))
  const occEntities = occupations.map(row => ({
    url: `https://standards.org.ai/ONET/Occupations/${toId(row.title)}`,
    canonical: `https://onet.org.ai/Occupations/${toId(row.title)}`,
    ns: 'standards.org.ai',
    type: 'Occupation',
    id: toId(row.title),
    code: row.oNETSOCCode || '',
    name: row.title || '',
    description: row.description || '',
  }))
  writeTSV(path.join(outDir, 'Occupations.tsv'), occEntities)

  // 2. Content Model Reference (taxonomy of all ONET elements)
  const contentModel = parseTSV(path.join(onetDir, 'ONET.ContentModelReference.tsv'))
  const elements = contentModel.map(row => ({
    url: `https://standards.org.ai/ONET/Elements/${toId(row.elementName)}`,
    canonical: `https://onet.org.ai/Elements/${toId(row.elementName)}`,
    ns: 'standards.org.ai',
    type: 'Element',
    id: toId(row.elementName),
    code: row.elementID || '',
    name: row.elementName || '',
    description: row.description || '',
  }))
  writeTSV(path.join(outDir, 'Elements.tsv'), elements)

  // 3. DWA Reference (Detailed Work Activities)
  const dwaRef = parseTSV(path.join(onetDir, 'ONET.DWAReference.tsv'))
  const dwas = dwaRef.map(row => ({
    url: `https://standards.org.ai/ONET/DetailedWorkActivities/${toId(row.dWATitle)}`,
    canonical: `https://onet.org.ai/DetailedWorkActivities/${toId(row.dWATitle)}`,
    ns: 'standards.org.ai',
    type: 'DetailedWorkActivity',
    id: toId(row.dWATitle),
    code: row.dWAID || '',
    iwaId: row.iWAID || '',
    name: row.dWATitle || '',
    description: row.dWATitle || '',
  }))
  writeTSV(path.join(outDir, 'DetailedWorkActivities.tsv'), dwas)

  // 4. IWA Reference (Intermediate Work Activities)
  const iwaRef = parseTSV(path.join(onetDir, 'ONET.IWAReference.tsv'))
  const iwas = iwaRef.map(row => ({
    url: `https://standards.org.ai/ONET/IntermediateWorkActivities/${toId(row.iWATitle)}`,
    canonical: `https://onet.org.ai/IntermediateWorkActivities/${toId(row.iWATitle)}`,
    ns: 'standards.org.ai',
    type: 'IntermediateWorkActivity',
    id: toId(row.iWATitle),
    code: row.iWAID || '',
    elementId: row.elementID || '',
    name: row.iWATitle || '',
    description: row.iWATitle || '',
  }))
  writeTSV(path.join(outDir, 'IntermediateWorkActivities.tsv'), iwas)

  // 5. Task Statements
  const tasks = parseTSV(path.join(onetDir, 'ONET.TaskStatements.tsv'))
  const taskEntities = tasks.map(row => ({
    url: `https://standards.org.ai/ONET/Tasks/${row.taskID}`,
    canonical: `https://onet.org.ai/Tasks/${row.taskID}`,
    ns: 'standards.org.ai',
    type: 'Task',
    id: row.taskID || '',
    code: row.oNETSOCCode || '',
    name: row.task || '',
    description: row.task || '',
    taskType: row.taskType || '',
  }))
  writeTSV(path.join(outDir, 'Tasks.tsv'), taskEntities)

  // 6. Emerging Tasks
  const emergingTasks = parseTSV(path.join(onetDir, 'ONET.EmergingTasks.tsv'))
  const emergingEntities = emergingTasks.map(row => ({
    url: `https://standards.org.ai/ONET/EmergingTasks/${row.taskID || toId(row.task)}`,
    canonical: `https://onet.org.ai/EmergingTasks/${row.taskID || toId(row.task)}`,
    ns: 'standards.org.ai',
    type: 'EmergingTask',
    id: row.taskID || toId(row.task),
    code: row.oNETSOCCode || '',
    name: row.task || '',
    description: row.task || '',
    category: row.category || '',
  }))
  writeTSV(path.join(outDir, 'EmergingTasks.tsv'), emergingEntities)

  // 7. Job Zones
  const jobZones = parseTSV(path.join(onetDir, 'ONET.JobZoneReference.tsv'))
  const jobZoneEntities = jobZones.map(row => ({
    url: `https://standards.org.ai/ONET/JobZones/${row.jobZone}`,
    canonical: `https://onet.org.ai/JobZones/${row.jobZone}`,
    ns: 'standards.org.ai',
    type: 'JobZone',
    id: row.jobZone || '',
    code: row.jobZone || '',
    name: row.name || `Job Zone ${row.jobZone}`,
    description: row.experience || '',
    education: row.education || '',
    training: row.jobTraining || '',
    examples: row.examples || '',
    svpRange: row.sVPRangeLow && row.sVPRangeHigh ? `${row.sVPRangeLow}-${row.sVPRangeHigh}` : '',
  }))
  writeTSV(path.join(outDir, 'JobZones.tsv'), jobZoneEntities)

  // 8. Work Context Categories
  const workContextCats = parseTSV(path.join(onetDir, 'ONET.WorkContextCategories.tsv'))
  const workContextEntities = workContextCats.map(row => ({
    url: `https://standards.org.ai/ONET/WorkContexts/${toId(row.elementName)}`,
    canonical: `https://onet.org.ai/WorkContexts/${toId(row.elementName)}`,
    ns: 'standards.org.ai',
    type: 'WorkContext',
    id: toId(row.elementName),
    code: row.elementID || '',
    name: row.elementName || '',
    description: row.description || '',
    categoryId: row.categoryID || '',
    category: row.category || '',
  }))
  writeTSV(path.join(outDir, 'WorkContexts.tsv'), workContextEntities)

  // 9. Education Training Categories
  const eduCats = parseTSV(path.join(onetDir, 'ONET.EducationTrainingAndExperienceCategories.tsv'))
  const eduCatEntities = eduCats.map(row => ({
    url: `https://standards.org.ai/ONET/EducationLevels/${toId(row.categoryDescription)}`,
    canonical: `https://onet.org.ai/EducationLevels/${toId(row.categoryDescription)}`,
    ns: 'standards.org.ai',
    type: 'EducationLevel',
    id: toId(row.categoryDescription),
    code: row.category || '',
    scaleId: row.scaleID || '',
    name: row.categoryDescription || '',
    description: row.categoryDescription || '',
  }))
  writeTSV(path.join(outDir, 'EducationLevels.tsv'), eduCatEntities)

  // 10. Scales Reference
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

  // 11. Level Scale Anchors
  const anchors = parseTSV(path.join(onetDir, 'ONET.LevelScaleAnchors.tsv'))
  const anchorEntities = anchors.map(row => ({
    url: `https://standards.org.ai/ONET/ScaleAnchors/${row.elementID}_${row.scaleID}_${row.anchorValue}`,
    canonical: `https://onet.org.ai/ScaleAnchors/${row.elementID}_${row.scaleID}_${row.anchorValue}`,
    ns: 'standards.org.ai',
    type: 'ScaleAnchor',
    id: `${row.elementID}_${row.scaleID}_${row.anchorValue}`,
    elementId: row.elementID || '',
    elementName: row.elementName || '',
    scaleId: row.scaleID || '',
    anchorValue: row.anchorValue || '',
    anchorDescription: row.anchorDescription || '',
  }))
  writeTSV(path.join(outDir, 'ScaleAnchors.tsv'), anchorEntities)

  // 12. RIASEC Keywords
  const riasec = parseTSV(path.join(onetDir, 'ONET.RIASECKeywords.tsv'))
  const riasecEntities = riasec.map(row => ({
    url: `https://standards.org.ai/ONET/RIASECKeywords/${toId(row.keyword)}`,
    canonical: `https://onet.org.ai/RIASECKeywords/${toId(row.keyword)}`,
    ns: 'standards.org.ai',
    type: 'RIASECKeyword',
    id: toId(row.keyword),
    riasecAreaId: row.rIASECAreaID || '',
    keyword: row.keyword || '',
  }))
  writeTSV(path.join(outDir, 'RIASECKeywords.tsv'), riasecEntities)

  // 13. Task Categories
  const taskCats = parseTSV(path.join(onetDir, 'ONET.TaskCategories.tsv'))
  if (taskCats.length > 0) {
    const taskCatEntities = taskCats.map(row => ({
      url: `https://standards.org.ai/ONET/TaskCategories/${row.taskType || toId(row.taskTypeDescription || '')}`,
      canonical: `https://onet.org.ai/TaskCategories/${row.taskType || toId(row.taskTypeDescription || '')}`,
      ns: 'standards.org.ai',
      type: 'TaskCategory',
      id: row.taskType || toId(row.taskTypeDescription || ''),
      code: row.taskType || '',
      name: row.taskTypeDescription || '',
      description: row.taskTypeDescription || '',
    }))
    writeTSV(path.join(outDir, 'TaskCategories.tsv'), taskCatEntities)
  }

  // 14. UNSPSC Reference (for tools/technology)
  const unspscRef = parseTSV(path.join(onetDir, 'ONET.UNSPSCReference.tsv'))
  const unspscEntities = unspscRef.map(row => ({
    url: `https://standards.org.ai/ONET/UNSPSCCommodities/${row.commodityCode}`,
    canonical: `https://onet.org.ai/UNSPSCCommodities/${row.commodityCode}`,
    ns: 'standards.org.ai',
    type: 'UNSPSCCommodity',
    id: row.commodityCode || '',
    code: row.commodityCode || '',
    name: row.commodityTitle || '',
    description: row.commodityTitle || '',
    classCode: row.classCode || '',
    classTitle: row.classTitle || '',
    familyCode: row.familyCode || '',
    familyTitle: row.familyTitle || '',
    segmentCode: row.segmentCode || '',
    segmentTitle: row.segmentTitle || '',
  }))
  writeTSV(path.join(outDir, 'UNSPSCCommodities.tsv'), unspscEntities)

  // ===== RELATIONSHIP/RATING FILES =====

  // 15. Abilities (Occupation → Ability ratings)
  const abilities = parseTSV(path.join(onetDir, 'ONET.Abilities.tsv'))
  const abilityRels = abilities.map(row => ({
    from: `https://onet.org.ai/Occupations/${toId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toId(row.elementName)}`,
    predicate: 'requiresAbility',
    reverse: 'requiredByOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
    standardError: row.standardError || '',
    n: row.n || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Abilities.tsv'), abilityRels)

  // 16. Skills (Occupation → Skill ratings)
  const skills = parseTSV(path.join(onetDir, 'ONET.Skills.tsv'))
  const skillRels = skills.map(row => ({
    from: `https://onet.org.ai/Occupations/${toId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toId(row.elementName)}`,
    predicate: 'requiresSkill',
    reverse: 'requiredByOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
    standardError: row.standardError || '',
    n: row.n || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Skills.tsv'), skillRels)

  // 17. Knowledge (Occupation → Knowledge ratings)
  const knowledge = parseTSV(path.join(onetDir, 'ONET.Knowledge.tsv'))
  const knowledgeRels = knowledge.map(row => ({
    from: `https://onet.org.ai/Occupations/${toId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toId(row.elementName)}`,
    predicate: 'requiresKnowledge',
    reverse: 'requiredByOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
    standardError: row.standardError || '',
    n: row.n || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Knowledge.tsv'), knowledgeRels)

  // 18. Work Activities (Occupation → WorkActivity ratings)
  const workActivities = parseTSV(path.join(onetDir, 'ONET.WorkActivities.tsv'))
  const workActivityRels = workActivities.map(row => ({
    from: `https://onet.org.ai/Occupations/${toId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toId(row.elementName)}`,
    predicate: 'performsActivity',
    reverse: 'performedByOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
    standardError: row.standardError || '',
    n: row.n || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.WorkActivities.tsv'), workActivityRels)

  // 19. Work Context (Occupation → WorkContext ratings)
  const workContext = parseTSV(path.join(onetDir, 'ONET.WorkContext.tsv'))
  const workContextRels = workContext.map(row => ({
    from: `https://onet.org.ai/Occupations/${toId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/WorkContexts/${toId(row.elementName)}`,
    predicate: 'hasWorkContext',
    reverse: 'workContextOfOccupation',
    scaleId: row.scaleID || '',
    category: row.category || '',
    dataValue: row.dataValue || '',
    standardError: row.standardError || '',
    n: row.n || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.WorkContexts.tsv'), workContextRels)

  // 20. Work Styles (Occupation → WorkStyle ratings)
  const workStyles = parseTSV(path.join(onetDir, 'ONET.WorkStyles.tsv'))
  const workStyleRels = workStyles.map(row => ({
    from: `https://onet.org.ai/Occupations/${toId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toId(row.elementName)}`,
    predicate: 'requiresWorkStyle',
    reverse: 'requiredByOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
    standardError: row.standardError || '',
    n: row.n || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.WorkStyles.tsv'), workStyleRels)

  // 21. Work Values (Occupation → WorkValue ratings)
  const workValues = parseTSV(path.join(onetDir, 'ONET.WorkValues.tsv'))
  const workValueRels = workValues.map(row => ({
    from: `https://onet.org.ai/Occupations/${toId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toId(row.elementName)}`,
    predicate: 'hasWorkValue',
    reverse: 'workValueOfOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.WorkValues.tsv'), workValueRels)

  // 22. Interests (Occupation → Interest ratings)
  const interests = parseTSV(path.join(onetDir, 'ONET.Interests.tsv'))
  const interestRels = interests.map(row => ({
    from: `https://onet.org.ai/Occupations/${toId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Elements/${toId(row.elementName)}`,
    predicate: 'hasInterest',
    reverse: 'interestOfOccupation',
    scaleId: row.scaleID || '',
    dataValue: row.dataValue || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Interests.tsv'), interestRels)

  // 23. Job Zones (Occupation → JobZone)
  const jobZoneData = parseTSV(path.join(onetDir, 'ONET.JobZones.tsv'))
  const jobZoneRels = jobZoneData.map(row => ({
    from: `https://onet.org.ai/Occupations/${toId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/JobZones/${row.jobZone}`,
    predicate: 'hasJobZone',
    reverse: 'jobZoneOfOccupation',
  }))
  writeTSV(path.join(relDir, 'Occupations.JobZones.tsv'), jobZoneRels)

  // 24. Task Ratings (Occupation → Task ratings)
  const taskRatings = parseTSV(path.join(onetDir, 'ONET.TaskRatings.tsv'))
  const taskRatingRels = taskRatings.map(row => ({
    from: `https://onet.org.ai/Occupations/${toId(row.title || row.oNETSOCCode)}`,
    to: `https://onet.org.ai/Tasks/${row.taskID}`,
    predicate: 'performsTask',
    reverse: 'performedByOccupation',
    scaleId: row.scaleID || '',
    category: row.category || '',
    dataValue: row.dataValue || '',
    standardError: row.standardError || '',
    n: row.n || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Tasks.tsv'), taskRatingRels)

  // 25. Related Occupations
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

  // 26. Alternate Titles
  const altTitles = parseTSV(path.join(onetDir, 'ONET.AlternateTitles.tsv'))
  const altTitleRels = altTitles.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: toId(row.alternateTitle),
    predicate: 'hasAlternateTitle',
    reverse: 'alternateTitleOf',
    alternateTitle: row.alternateTitle || '',
    shortTitle: row.shortTitle || '',
    source: row.source || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.AlternateTitles.tsv'), altTitleRels)

  // 27. Sample Reported Titles
  const reportedTitles = parseTSV(path.join(onetDir, 'ONET.SampleOfReportedTitles.tsv'))
  const reportedTitleRels = reportedTitles.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: toId(row.reportedJobTitle),
    predicate: 'hasReportedTitle',
    reverse: 'reportedTitleOf',
    reportedTitle: row.reportedJobTitle || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.ReportedTitles.tsv'), reportedTitleRels)

  // 28. Education Training Experience
  const eduExp = parseTSV(path.join(onetDir, 'ONET.EducationTrainingAndExperience.tsv'))
  const eduExpRels = eduExp.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: `https://onet.org.ai/EducationLevels/${row.category}`,
    predicate: 'hasEducationRequirement',
    reverse: 'educationRequirementOf',
    scaleId: row.scaleID || '',
    category: row.category || '',
    dataValue: row.dataValue || '',
    n: row.n || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Education.tsv'), eduExpRels)

  // 29. Technology Skills (Occupation → Technology)
  const techSkills = parseTSV(path.join(onetDir, 'ONET.TechnologySkills.tsv'))
  const techRels = techSkills.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: `https://onet.org.ai/UNSPSCCommodities/${row.commodityCode}`,
    predicate: 'usesTechnology',
    reverse: 'usedByOccupation',
    example: row.example || '',
    hotTechnology: row.hotTechnology || '',
    inDemand: row.inDemand || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.TechnologySkills.tsv'), techRels)

  // 30. Tools Used (Occupation → Tool)
  const toolsUsed = parseTSV(path.join(onetDir, 'ONET.ToolsUsed.tsv'))
  const toolRels = toolsUsed.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: `https://onet.org.ai/UNSPSCCommodities/${row.commodityCode}`,
    predicate: 'usesTool',
    reverse: 'usedByOccupation',
    example: row.example || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.ToolsUsed.tsv'), toolRels)

  // 31. Tasks to DWAs
  const tasksToDwas = parseTSV(path.join(onetDir, 'ONET.TasksToDWAs.tsv'))
  const taskDwaRels = tasksToDwas.map(row => ({
    from: `https://onet.org.ai/Tasks/${row.taskID}`,
    to: `https://onet.org.ai/DetailedWorkActivities/${row.dWAID}`,
    predicate: 'implementsActivity',
    reverse: 'implementedByTask',
    occupationCode: row.oNETSOCCode || '',
  }))
  writeTSV(path.join(relDir, 'Tasks.DetailedWorkActivities.tsv'), taskDwaRels)

  // 32. Abilities to Work Activities
  const abilitiesToWA = parseTSV(path.join(onetDir, 'ONET.AbilitiesToWorkActivities.tsv'))
  const abilityWaRels = abilitiesToWA.map(row => ({
    from: `https://onet.org.ai/Elements/${toId(row.abilitiesElementName)}`,
    to: `https://onet.org.ai/Elements/${toId(row.workActivitiesElementName)}`,
    predicate: 'enablesActivity',
    reverse: 'requiresAbility',
    abilityId: row.abilitiesElementID || '',
    activityId: row.workActivitiesElementID || '',
  }))
  writeTSV(path.join(relDir, 'Abilities.WorkActivities.tsv'), abilityWaRels)

  // 33. Abilities to Work Context
  const abilitiesToWC = parseTSV(path.join(onetDir, 'ONET.AbilitiesToWorkContext.tsv'))
  const abilityWcRels = abilitiesToWC.map(row => ({
    from: `https://onet.org.ai/Elements/${toId(row.abilitiesElementName)}`,
    to: `https://onet.org.ai/WorkContexts/${toId(row.workContextElementName)}`,
    predicate: 'relevantToContext',
    reverse: 'requiresAbility',
    abilityId: row.abilitiesElementID || '',
    contextId: row.workContextElementID || '',
  }))
  writeTSV(path.join(relDir, 'Abilities.WorkContexts.tsv'), abilityWcRels)

  // 34. Skills to Work Activities
  const skillsToWA = parseTSV(path.join(onetDir, 'ONET.SkillsToWorkActivities.tsv'))
  const skillWaRels = skillsToWA.map(row => ({
    from: `https://onet.org.ai/Elements/${toId(row.skillsElementName)}`,
    to: `https://onet.org.ai/Elements/${toId(row.workActivitiesElementName)}`,
    predicate: 'enablesActivity',
    reverse: 'requiresSkill',
    skillId: row.skillsElementID || '',
    activityId: row.workActivitiesElementID || '',
  }))
  writeTSV(path.join(relDir, 'Skills.WorkActivities.tsv'), skillWaRels)

  // 35. Skills to Work Context
  const skillsToWC = parseTSV(path.join(onetDir, 'ONET.SkillsToWorkContext.tsv'))
  const skillWcRels = skillsToWC.map(row => ({
    from: `https://onet.org.ai/Elements/${toId(row.skillsElementName)}`,
    to: `https://onet.org.ai/WorkContexts/${toId(row.workContextElementName)}`,
    predicate: 'relevantToContext',
    reverse: 'requiresSkill',
    skillId: row.skillsElementID || '',
    contextId: row.workContextElementID || '',
  }))
  writeTSV(path.join(relDir, 'Skills.WorkContexts.tsv'), skillWcRels)

  // 36. Interests Illustrative Activities
  const interestActivities = parseTSV(path.join(onetDir, 'ONET.InterestsIllustrativeActivities.tsv'))
  const interestActRels = interestActivities.map(row => ({
    from: `https://onet.org.ai/Elements/${toId(row.elementName)}`,
    to: toId(row.illustrativeActivity),
    predicate: 'hasIllustrativeActivity',
    reverse: 'illustrativeActivityOf',
    elementId: row.elementID || '',
    activity: row.illustrativeActivity || '',
  }))
  writeTSV(path.join(relDir, 'Interests.Activities.tsv'), interestActRels)

  // 37. Interests Illustrative Occupations
  const interestOccs = parseTSV(path.join(onetDir, 'ONET.InterestsIllustrativeOccupations.tsv'))
  const interestOccRels = interestOccs.map(row => ({
    from: `https://onet.org.ai/Elements/${toId(row.elementName)}`,
    to: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    predicate: 'hasIllustrativeOccupation',
    reverse: 'illustrativeOccupationOf',
    elementId: row.elementID || '',
  }))
  writeTSV(path.join(relDir, 'Interests.Occupations.tsv'), interestOccRels)

  // 38. Basic Interests to RIASEC
  const basicInterests = parseTSV(path.join(onetDir, 'ONET.BasicInterestsToRIASEC.tsv'))
  const basicInterestRels = basicInterests.map(row => ({
    from: `https://onet.org.ai/Elements/${toId(row.elementName)}`,
    to: `https://onet.org.ai/RIASEC/${row.rIASECAreaID}`,
    predicate: 'belongsToRIASEC',
    reverse: 'hasBasicInterest',
    elementId: row.elementID || '',
    riasecId: row.rIASECAreaID || '',
  }))
  writeTSV(path.join(relDir, 'BasicInterests.RIASEC.tsv'), basicInterestRels)

  // 39. Occupation Level Metadata
  const occMetadata = parseTSV(path.join(onetDir, 'ONET.OccupationLevelMetadata.tsv'))
  const occMetaRels = occMetadata.map(row => ({
    from: `https://onet.org.ai/Occupations/${row.oNETSOCCode}`,
    to: row.item || '',
    predicate: 'hasMetadata',
    reverse: 'metadataOf',
    item: row.item || '',
    response: row.response || '',
    n: row.n || '',
    percent: row.percent || '',
  }))
  writeTSV(path.join(relDir, 'Occupations.Metadata.tsv'), occMetaRels)
}

// ============================================================================
// NAICS Hierarchy
// ============================================================================

function getNAICSType(code: string): string {
  const cleanCode = code.replace(/[^0-9]/g, '')
  switch (cleanCode.length) {
    case 2: return 'Sectors'
    case 3: return 'Subsectors'
    case 4: return 'IndustryGroups'
    case 5: return 'Industries'
    case 6: return 'NationalIndustries'
    default: return 'Industries'
  }
}

function ingestNAICS(): void {
  console.log('\n📊 Ingesting NAICS...')

  const sourceFile = path.join(ROOT_DATA_DIR, 'Industries.tsv')
  const data = parseTSV(sourceFile)

  const byType: Record<string, Record<string, string>[]> = {
    Sectors: [], Subsectors: [], IndustryGroups: [], Industries: [], NationalIndustries: [],
  }
  const seenByType: Record<string, Set<string>> = {
    Sectors: new Set(), Subsectors: new Set(), IndustryGroups: new Set(), Industries: new Set(), NationalIndustries: new Set(),
  }

  // Build ID mapping for relationships
  const oldIdToNewId = new Map<string, { id: string, type: string }>()

  for (const row of data) {
    const code = row.code || ''
    const type = getNAICSType(code)
    // Use readable ID from name
    const id = toReadableId(row.name) || row.id || ''
    if (!id || seenByType[type].has(id)) continue
    seenByType[type].add(id)

    // Map old short ID to new ID and type
    if (row.id) {
      oldIdToNewId.set(row.id, { id, type })
    }

    byType[type].push({
      url: `https://standards.org.ai/NAICS/${type}/${id}`,
      canonical: `https://naics.org.ai/${type}/${id}`,
      ns: 'standards.org.ai',
      type: type.replace(/s$/, ''),
      id, code,
      name: row.name || '',
      description: row.description || '',
    })
  }

  for (const [type, entities] of Object.entries(byType)) {
    if (entities.length > 0) {
      writeTSV(path.join(SOURCE_DIR, 'NAICS', `${type}.tsv`), entities)
    }
  }

  // Industries.Relationships.tsv has columns: ns, from, to, predicate, reverse
  // from/to are short IDs like "Agriculture"
  const relFile = path.join(ROOT_DATA_DIR, 'Industries.Relationships.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)
    const relationships = relData.map(row => {
      const fromOldId = row.from || ''
      const toOldId = row.to || ''

      // Look up new ID and type
      const fromInfo = oldIdToNewId.get(fromOldId) || { id: toReadableId(fromOldId), type: 'Industries' }
      const toInfo = oldIdToNewId.get(toOldId) || { id: toReadableId(toOldId), type: 'Industries' }

      return {
        from: `https://standards.org.ai/NAICS/${fromInfo.type}/${fromInfo.id}`,
        to: `https://standards.org.ai/NAICS/${toInfo.type}/${toInfo.id}`,
        predicate: row.predicate || '',
        reverse: row.reverse || '',
      }
    })
    writeTSV(path.join(SOURCE_DIR, 'NAICS', 'relationships', 'Hierarchy.tsv'), relationships)
  }
}

// ============================================================================
// APQC Hierarchy
// ============================================================================

function getAPQCType(code: string): string {
  const parts = code.split('.')
  if (parts.length === 2 && parts[1] === '0') return 'Categories'
  if (parts.length === 2) return 'ProcessGroups'
  if (parts.length === 3) return 'Processes'
  return 'Activities'
}

function ingestAPQC(): void {
  console.log('\n📋 Ingesting APQC...')

  const sourceFile = path.join(ROOT_DATA_DIR, 'Processes.tsv')
  const data = parseTSV(sourceFile)

  const byType: Record<string, Record<string, string>[]> = {
    Categories: [], ProcessGroups: [], Processes: [], Activities: [],
  }
  const seenByType: Record<string, Set<string>> = {
    Categories: new Set(), ProcessGroups: new Set(), Processes: new Set(), Activities: new Set(),
  }

  // Build ID mapping for relationships
  const oldIdToNewId = new Map<string, { id: string, type: string }>()

  for (const row of data) {
    const code = row.code || row.hierarchyId || ''
    const type = getAPQCType(code)
    // Use readable ID from name (APQC names are like "Develop Vision and Strategy")
    const id = toReadableId(row.name) || row.id || ''
    if (!id || seenByType[type].has(id)) continue
    seenByType[type].add(id)

    // Map old ID to new
    if (row.id) {
      oldIdToNewId.set(row.id, { id, type })
    }

    byType[type].push({
      url: `https://standards.org.ai/APQC/${type}/${id}`,
      canonical: `https://apqc.org.ai/${type}/${id}`,
      ns: 'standards.org.ai',
      type: type.replace(/s$/, ''),
      id, code,
      pcfId: row.pcfId || '',
      name: row.name || '',
      description: row.description || '',
      industry: row.industry || '',
    })
  }

  for (const [type, entities] of Object.entries(byType)) {
    if (entities.length > 0) {
      writeTSV(path.join(SOURCE_DIR, 'APQC', `${type}.tsv`), entities)
    }
  }

  // Processes.Relationships.tsv has columns: ns, from, to, predicate, reverse
  // from/to are GraphDL IDs like "Companies.define.BusinessConceptVision"
  const relFile = path.join(ROOT_DATA_DIR, 'Processes.Relationships.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)
    const relationships = relData.map(row => {
      const fromId = row.from || ''
      const toId = row.to || ''

      // Build full URLs - these are Activity-level IDs (GraphDL format)
      return {
        from: `https://standards.org.ai/APQC/Activities/${fromId}`,
        to: `https://standards.org.ai/APQC/Activities/${toId}`,
        predicate: row.predicate || '',
        reverse: row.reverse || '',
      }
    })
    writeTSV(path.join(SOURCE_DIR, 'APQC', 'relationships', 'Hierarchy.tsv'), relationships)
  }
}

// ============================================================================
// UNSPSC Hierarchy
// ============================================================================

function ingestUNSPSC(): void {
  console.log('\n📦 Ingesting UNSPSC...')

  const sourceFile = path.join(ROOT_DATA_DIR, 'Products.tsv')
  const data = parseTSV(sourceFile)

  const byType: Record<string, Record<string, string>[]> = {
    Segments: [], Families: [], Classes: [], Commodities: [],
  }
  const segmentSeen = new Set<string>()
  const familySeen = new Set<string>()
  const classSeen = new Set<string>()
  const commoditySeen = new Set<string>()

  // Note: The source Products.tsv has column misalignment (napcs column missing in data)
  // So we extract name from the URL which contains the correct short identifier
  for (const row of data) {
    // Extract short name from URL: https://unspsc.org.ai/Product/{shortName}
    const urlMatch = row.url?.match(/\/Product\/(.+)$/)
    const shortId = urlMatch ? urlMatch[1] : row.id || ''
    // Convert to readable format with underscores (add _ where camelCase boundaries exist)
    const commodityId = shortId.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')

    // Extract the actual name from the URL path - convert to readable
    const shortName = shortId.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')

    if (row.segment && row.segmentCode && !segmentSeen.has(row.segmentCode)) {
      segmentSeen.add(row.segmentCode)
      const segmentId = toReadableId(row.segment)
      byType.Segments.push({
        url: `https://standards.org.ai/UNSPSC/Segments/${segmentId}`,
        ns: 'standards.org.ai',
        type: 'Segment',
        id: segmentId,
        code: row.segmentCode,
        name: row.segment,
        description: '',
      })
    }

    if (row.family && row.familyCode && !familySeen.has(row.familyCode)) {
      familySeen.add(row.familyCode)
      const familyId = toReadableId(row.family)
      byType.Families.push({
        url: `https://standards.org.ai/UNSPSC/Families/${familyId}`,
        ns: 'standards.org.ai',
        type: 'Family',
        id: familyId,
        code: row.familyCode,
        name: row.family,
        description: '',
        segmentCode: row.segmentCode || '',
      })
    }

    if (row.class && row.classCode && !classSeen.has(row.classCode)) {
      classSeen.add(row.classCode)
      const classId = toReadableId(row.class)
      byType.Classes.push({
        url: `https://standards.org.ai/UNSPSC/Classes/${classId}`,
        ns: 'standards.org.ai',
        type: 'Class',
        id: classId,
        code: row.classCode,
        name: row.class,
        description: '',
        familyCode: row.familyCode || '',
      })
    }

    if (commodityId && !commoditySeen.has(commodityId)) {
      commoditySeen.add(commodityId)
      byType.Commodities.push({
        url: `https://standards.org.ai/UNSPSC/Commodities/${commodityId}`,
        ns: 'standards.org.ai',
        type: 'Commodity',
        id: commodityId,
        code: row.code || '',
        name: shortName,
        description: row.description || '',
        classCode: row.classCode || '',
        digital: row.digital || '',
      })
    }
  }

  for (const [type, entities] of Object.entries(byType)) {
    if (entities.length > 0) {
      writeTSV(path.join(SOURCE_DIR, 'UNSPSC', `${type}.tsv`), entities)
    }
  }

  // Build mappings for relationships:
  // 1. classCode → class readable ID
  // 2. normalized lowercase ID → entity ID
  const classCodeToId = new Map<string, string>()
  const oldIdToNewId = new Map<string, string>()

  for (const row of data) {
    if (row.classCode && row.class) {
      classCodeToId.set(row.classCode, toReadableId(row.class))
    }
    // Map normalized (lowercase, no underscores) ID to entity ID
    const urlMatch = row.url?.match(/\/Product\/(.+)$/)
    const shortId = urlMatch ? urlMatch[1] : row.id || ''
    // Create mapping key: lowercase without underscores
    const normalizedKey = shortId.toLowerCase().replace(/_/g, '')
    if (normalizedKey) {
      // Map to the actual entity ID (which is already lowercase)
      oldIdToNewId.set(normalizedKey, shortId)
    }
  }

  const relFile = path.join(ROOT_DATA_DIR, 'Products.Relationships.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)
    const relationships = relData.map(row => {
      // from: Normalize to lowercase without underscores to match entity IDs
      const fromOldId = row.from || ''
      // Normalize: lowercase and remove underscores to match entity IDs
      const fromIdNormalized = fromOldId.toLowerCase().replace(/_/g, '')
      const fromId = oldIdToNewId.get(fromIdNormalized) || fromIdNormalized
      const fromUrl = `https://standards.org.ai/UNSPSC/Commodities/${fromId}`

      // to: unspsc-class-{code} → lookup class readable ID
      const toRaw = row.to || ''
      const classCode = toRaw.replace('unspsc-class-', '')
      const classId = classCodeToId.get(classCode) || classCode
      const toUrl = `https://standards.org.ai/UNSPSC/Classes/${classId}`

      return {
        from: fromUrl,
        to: toUrl,
        predicate: row.predicate || '',
        reverse: row.reverse || '',
      }
    })
    writeTSV(path.join(SOURCE_DIR, 'UNSPSC', 'relationships', 'Hierarchy.tsv'), relationships)
  }
}

// ============================================================================
// NAPCS Hierarchy
// ============================================================================

function getNAPCSType(code: string): string {
  const cleanCode = code.replace(/[^0-9]/g, '')
  if (cleanCode.length <= 3) return 'Sections'
  if (cleanCode.length === 4) return 'Subsections'
  if (cleanCode.length === 5) return 'Groups'
  if (cleanCode.length === 6) return 'Classes'
  return 'Subclasses'
}

function ingestNAPCS(): void {
  console.log('\n🛎️ Ingesting NAPCS...')

  const sourceFile = path.join(ROOT_DATA_DIR, 'Services.tsv')
  const data = parseTSV(sourceFile)

  const byType: Record<string, Record<string, string>[]> = {
    Sections: [], Subsections: [], Groups: [], Classes: [], Subclasses: [],
  }
  const seenByType: Record<string, Set<string>> = {
    Sections: new Set(), Subsections: new Set(), Groups: new Set(), Classes: new Set(), Subclasses: new Set(),
  }

  for (const row of data) {
    const code = row.code || row.napcs || ''
    const type = getNAPCSType(code)
    // Use readable ID from name
    const id = toReadableId(row.name) || row.id || ''
    if (!id || seenByType[type].has(id)) continue
    seenByType[type].add(id)

    byType[type].push({
      url: `https://standards.org.ai/NAPCS/${type}/${id}`,
      ns: 'standards.org.ai',
      type: type.replace(/s$/, ''),
      id, code,
      name: row.name || '',
      description: row.description || '',
      digital: row.digital || '',
    })
  }

  for (const [type, entities] of Object.entries(byType)) {
    if (entities.length > 0) {
      writeTSV(path.join(SOURCE_DIR, 'NAPCS', `${type}.tsv`), entities)
    }
  }

  // Services.Relationships.tsv has different columns: sourceUrl, relationshipType, targetUrl, targetType, confidence
  const relFile = path.join(ROOT_DATA_DIR, 'Services.Relationships.tsv')
  if (fs.existsSync(relFile)) {
    const relData = parseTSV(relFile)
    const relationships = relData.map(row => {
      // sourceUrl and targetUrl are full URLs like https://napcs.org.ai/Service/...
      const sourceUrl = row.sourceUrl || ''
      const targetUrl = row.targetUrl || ''

      // Transform to standards.org.ai URLs
      const fromMatch = sourceUrl.match(/https:\/\/napcs\.org\.ai\/Service\/(.+)$/)
      const fromId = fromMatch ? fromMatch[1] : toReadableId(sourceUrl)
      const fromUrl = `https://standards.org.ai/NAPCS/Subclasses/${fromId}`

      return {
        from: fromUrl,
        to: targetUrl, // Keep target URL as-is (points to nouns.org.ai, verbs.org.ai)
        predicate: row.relationshipType || '',
        reverse: '',
      }
    })
    writeTSV(path.join(SOURCE_DIR, 'NAPCS', 'relationships', 'Relationships.tsv'), relationships)
  }
}

// ============================================================================
// Verbs
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
        verb: row.verb || id,
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

async function main() {
  console.log('📦 Source Data Ingestion')
  console.log('========================')
  console.log(`Root Data: ${ROOT_DATA_DIR}`)
  console.log(`Root Source: ${ROOT_SOURCE_DIR}`)
  console.log(`Output: ${SOURCE_DIR}`)

  for (const dir of ['ONET', 'NAICS', 'APQC', 'UNSPSC', 'NAPCS', 'GS1']) {
    ensureDir(path.join(SOURCE_DIR, dir))
    ensureDir(path.join(SOURCE_DIR, dir, 'relationships'))
  }

  ingestONET()
  ingestNAICS()
  ingestAPQC()
  ingestUNSPSC()
  ingestNAPCS()
  ingestVerbs()

  console.log('\n✨ Source ingestion complete!')
}

main().catch(console.error)
