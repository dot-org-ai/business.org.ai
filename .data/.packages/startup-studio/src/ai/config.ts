/**
 * AI Configuration for Startup Studio
 *
 * Uses ai-functions for AI generation capabilities.
 */

// Re-export from ai-functions for convenience
export {
  AI,
  ai,
  generateObject,
  generateText,
  configure,
} from 'ai-functions'

export { model } from 'ai-providers'

export interface AIConfig {
  provider?: 'bedrock' | 'openai' | 'anthropic'
  model?: string
  region?: string
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'bedrock',
  model: 'anthropic.claude-opus-4-20250514-v1:0',
  region: 'us-east-1',
}

let isConfigured = false

/**
 * Configure AI for Startup Studio
 */
export async function configureAI(options: AIConfig = {}): Promise<void> {
  const { configure } = await import('ai-functions')

  const config = { ...DEFAULT_CONFIG, ...options }

  // Configure ai-functions with model
  configure({
    provider: config.provider!,
    model: config.model!,
  })

  // Set AWS region via environment if using Bedrock
  if (config.provider === 'bedrock' && config.region) {
    process.env.AWS_REGION = config.region
  }

  isConfigured = true
}

/**
 * Ensure AI is configured before use
 */
export async function ensureConfigured(): Promise<void> {
  if (!isConfigured) {
    await configureAI()
  }
}

/**
 * Model presets for different use cases
 */
export const MODELS = {
  // High quality, comprehensive generation
  opus: 'anthropic.claude-opus-4-20250514-v1:0',

  // Fast, good quality for most tasks
  sonnet: 'anthropic.claude-sonnet-4-20250514-v1:0',

  // Quick iterations, drafts
  haiku: 'anthropic.claude-3-5-haiku-20241022-v1:0',
} as const

export type ModelPreset = keyof typeof MODELS
