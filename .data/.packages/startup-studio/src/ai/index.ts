/**
 * AI Functions for Startup Studio
 *
 * Provides AI-powered generation and enrichment:
 * - Industry enrichment (business types, canvas, trends)
 * - Occupation enrichment (problems, pain points, workflows)
 * - Process/Task enrichment (characteristics, diagrams)
 * - Startup concept generation
 * - Productized service generation
 * - AI overlay bundle generation
 */

// Configuration
export {
  configureAI,
  ensureConfigured,
  MODELS,
  type AIConfig,
  type ModelPreset,
} from './config'

// Industry Enrichment
export {
  enrichIndustry,
  enrichIndustriesBatch,
  type EnrichIndustryOptions,
} from './enrich-industry'

// Occupation Enrichment
export {
  enrichOccupation,
  enrichOccupationsBatch,
  generateProblemStacks,
  generateMessagingHooks,
  type EnrichOccupationOptions,
} from './enrich-occupation'

// Process & Task Enrichment
export {
  enrichProcess,
  enrichProcessesBatch,
  enrichTask,
  enrichTasksBatch,
  type EnrichProcessOptions,
  type EnrichTaskOptions,
} from './enrich-process'

// Startup Generation
export {
  generateStartupConcept,
  generateStartupIdeas,
  scoreStartupConcept,
  generateConceptId,
  type GenerateConceptInput,
  type GenerateIdeasInput,
} from './generate-startup'

// Service Generation
export {
  generateProductizedService,
  generateAIOverlays,
  assessOverlayOpportunities,
  getServiceTemplate,
  type GenerateServiceInput,
  type GenerateOverlayInput,
} from './generate-service'
