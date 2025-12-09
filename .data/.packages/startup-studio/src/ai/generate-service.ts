/**
 * Productized Service Generation AI Functions
 *
 * Generates complete productized service definitions from startup concepts.
 * Follows best practices for service packaging:
 * - Fixed scope, price, timeline
 * - Clear deliverables
 * - Repeatable process
 */

import { AI } from 'ai-functions'
import { ensureConfigured } from './config'
import type { StartupConcept } from '../startup'
import type { ProductizedService, ServicePattern, ServiceTemplate } from '../productized-service'
import type { AIOverlayType, TaskOverlayBundle, OverlayOpportunityAssessment } from '../ai-service-overlay'
import type { Task, Process, Occupation } from '../ontology'

// =============================================================================
// AI FUNCTION DEFINITIONS
// =============================================================================

const serviceAI = AI({
  productizedService: {
    name: 'Service name',
    slug: 'URL-friendly slug',

    positioning: {
      category: 'Service category',
      tagline: 'Short tagline (max 60 chars)',
      headline: 'Attention-grabbing headline',
      subheadline: 'Supporting subheadline',
      valueProposition: 'Clear value proposition statement',
      problem: 'The problem this service solves',
      solution: 'How this service solves it',
      transformation: 'What customer becomes after using service',
      uniqueAngle: 'What makes this different from alternatives',
      competitors: ['Alternative solutions customers might consider'],
      whyUs: ['Reasons to choose us over alternatives'],
    },

    scope: {
      included: ['What is explicitly included'],
      excluded: ['What is explicitly NOT included'],
      limitations: ['Limitations or constraints'],
      prerequisites: ['What customer needs to provide'],
    },

    deliverables: [{
      name: 'Deliverable name',
      description: 'What this deliverable is',
      format: 'Format (PDF, API, dashboard, etc.)',
      example: 'Example or sample description',
    }],

    timeline: {
      turnaround: 'Standard turnaround time',
      rushAvailable: 'true or false',
      rushPremium: 'Rush premium description or null',
      sla: 'SLA details or null',
    },

    process: {
      steps: [{
        order: 'Step number',
        name: 'Step name',
        description: 'What happens',
        duration: 'How long',
        customerAction: 'What customer does or null',
        automated: 'true or false',
      }],
      totalDuration: 'Total process duration',
      customerTouchpoints: 'Number of times customer involved',
      automationPercentage: 'Percentage automated (0-100)',
    },

    pricing: {
      tiers: [{
        name: 'Tier name',
        price: 'Price in USD (number)',
        billingPeriod: 'One of: one-time, monthly, quarterly, annual',
        description: 'One-line description',
        features: ['Features included'],
        limits: 'Object of limits like {reports: 10, users: 5}',
        popular: 'true or false',
        cta: 'Call to action text',
      }],
      addOns: [{
        name: 'Add-on name',
        description: 'What it provides',
        price: 'Price in USD (number)',
        billingPeriod: 'One of: one-time, monthly, per-use',
      }],
      customQuote: 'true or false',
      freeTrialDays: 'Number or null',
      moneyBackDays: 'Number or null',
    },

    proof: {
      caseStudies: [{
        clientType: 'Type of client',
        challenge: 'What challenge they faced',
        solution: 'How we helped',
        results: ['Quantified results'],
        testimonial: 'Client quote or null',
      }],
      metrics: [{
        value: 'The number or statistic',
        label: 'What it represents',
      }],
      guarantees: ['Service guarantees'],
      certifications: ['Relevant certifications'],
      integrations: ['Tools we integrate with'],
    },

    faqs: [{
      question: 'Common question',
      answer: 'Clear answer',
      category: 'One of: pricing, process, scope, results, technical, general',
    }],

    objectionHandlers: [{
      objection: 'Common objection',
      response: 'How to address it',
      proof: 'Evidence to support or null',
    }],

    aiConfig: {
      capabilities: [{
        capability: 'What the AI can do',
        accuracy: 'Accuracy level or null',
        speed: 'How fast or null',
        limitations: ['Known limitations'],
      }],
      humanInLoop: {
        required: 'true or false',
        stage: 'At what stage or null',
        role: 'What the human does or null',
        escalation: 'When to escalate or null',
      },
      dataHandling: {
        inputTypes: ['Types of input accepted'],
        outputTypes: ['Types of output produced'],
        retention: 'How long data is retained',
        privacy: 'Privacy measures',
      },
      models: ['AI models used'],
    },

    idealCustomer: {
      industries: ['Target industries'],
      companySize: ['Target company sizes'],
      roles: ['Target buyer roles'],
      triggers: ['Buying triggers'],
      disqualifiers: ['Who is NOT a fit'],
    },

    seo: {
      primaryKeyword: 'Primary SEO keyword',
      secondaryKeywords: ['Secondary keywords'],
      metaTitle: 'Meta title (max 60 chars)',
      metaDescription: 'Meta description (max 160 chars)',
    },
  },

  aiOverlayBundle: {
    availableOverlays: ['Applicable overlay types'],

    coaching: {
      realTimeGuidance: 'true or false',
      contextualTips: 'true or false',
      mistakePrevention: 'true or false',
      bestPractices: 'true or false',
      adaptiveAdvice: 'true or false',
      interaction: {
        mode: 'One of: push, pull, hybrid',
        channels: ['Communication channels'],
        frequency: 'How often AI reaches out',
      },
      valueProps: {
        headline: 'Headline for coaching service',
        benefits: ['Key benefits'],
        metrics: ['Metrics that improve'],
      },
    },

    training: {
      modules: [{
        name: 'Module name',
        description: 'What is taught',
        duration: 'Time to complete',
        format: 'One of: video, interactive, text, simulation, quiz',
      }],
      totalDuration: 'Total training time',
      certification: 'true or false',
      personalization: {
        skillAssessment: 'true or false',
        adaptivePath: 'true or false',
        practiceExercises: 'true or false',
        progressTracking: 'true or false',
      },
      valueProps: {
        headline: 'Headline for training service',
        benefits: ['Key benefits'],
        outcomes: ['What learner will be able to do'],
      },
    },

    analysis: {
      analysisScope: {
        performance: 'true or false',
        quality: 'true or false',
        efficiency: 'true or false',
        patterns: 'true or false',
        anomalies: 'true or false',
        comparisons: 'true or false',
      },
      deliverables: {
        dashboards: 'true or false',
        reports: 'true or false',
        alerts: 'true or false',
        recommendations: 'true or false',
        forecasts: 'true or false',
      },
      valueProps: {
        headline: 'Headline for analysis service',
        benefits: ['Key benefits'],
        insights: ['Types of insights'],
      },
    },

    pricing: {
      individual: 'Object mapping overlay type to price',
      bundle: 'Bundle price or null',
      subscription: 'Monthly subscription price or null',
    },

    totalValue: {
      timesSaved: 'Total time savings',
      errorReduction: 'Error reduction percentage',
      qualityImprovement: 'Quality improvement',
      roiEstimate: 'Estimated ROI',
    },
  },

  overlayOpportunity: {
    opportunities: [{
      overlayType: 'Overlay type',
      feasibility: 'Score 0-100',
      value: 'Score 0-100',
      competition: 'Score 0-100 (higher = less competition)',
      overall: 'Overall score 0-100',
      rationale: 'Why this score',
    }],
    topOpportunities: [{
      overlayType: 'Overlay type',
      recommendation: 'Why this is a top opportunity',
      nextSteps: ['Steps to pursue'],
    }],
  },
})

// =============================================================================
// PRODUCTIZED SERVICE GENERATION
// =============================================================================

export interface GenerateServiceInput {
  concept: Partial<StartupConcept>
  pattern?: ServicePattern
  pricingTiers?: number
  includeAIConfig?: boolean
}

/**
 * Generate a complete productized service from a startup concept
 */
export async function generateProductizedService(
  input: GenerateServiceInput
): Promise<ProductizedService> {
  ensureConfigured()

  const { concept, pattern = 'done-for-you', pricingTiers = 3, includeAIConfig = true } = input

  const prompt = `
Create a complete productized service definition for this startup concept:

Name: ${concept.name?.name || 'AI Service'}
${concept.oneLiner}
${concept.pitch}

Target: ${concept.ontologyTarget?.occupationName || 'Business professionals'}
Industry: ${concept.ontologyTarget?.industryName || 'Various'}
Service Type: ${concept.serviceType}

Service Pattern: ${pattern}
Pricing Tiers: ${pricingTiers}

Problem Solved: ${concept.problem?.title || 'Various business problems'}
Solution: ${concept.solution}

Create a productized service that:
1. Has clear, fixed scope (what's included and NOT included)
2. Has concrete deliverables with specific formats
3. Has a clear process (3-7 steps)
4. Has ${pricingTiers} pricing tiers from starter to enterprise
5. Includes proof elements (case studies, metrics, guarantees)
6. Has 5-7 FAQs and 3-5 objection handlers
7. Has SEO-optimized metadata

${includeAIConfig ? 'Include detailed AI configuration with capabilities, human-in-loop setup, and data handling.' : ''}
`

  const result = await serviceAI.productizedService(prompt) as any

  // Parse and return
  return {
    id: `${concept.name?.domain?.replace(/\./g, '-') || 'service'}-${Date.now()}`,
    ...result,
    pricing: {
      ...result.pricing,
      tiers: (result.pricing.tiers || []).map((t: any) => ({
        ...t,
        price: parseFloat(t.price) || 0,
        limits: typeof t.limits === 'string' ? JSON.parse(t.limits || '{}') : t.limits,
        popular: t.popular === 'true' || t.popular === true,
      })),
      addOns: (result.pricing.addOns || []).map((a: any) => ({
        ...a,
        price: parseFloat(a.price) || 0,
      })),
      customQuote: result.pricing.customQuote === 'true' || result.pricing.customQuote === true,
      freeTrialDays: result.pricing.freeTrialDays ? parseInt(result.pricing.freeTrialDays) : undefined,
      moneyBackDays: result.pricing.moneyBackDays ? parseInt(result.pricing.moneyBackDays) : undefined,
    },
    process: {
      ...result.process,
      steps: (result.process.steps || []).map((s: any) => ({
        ...s,
        order: parseInt(s.order) || 0,
        automated: s.automated === 'true' || s.automated === true,
      })),
      customerTouchpoints: parseInt(result.process.customerTouchpoints) || 0,
      automationPercentage: parseInt(result.process.automationPercentage) || 0,
    },
    timeline: {
      ...result.timeline,
      rushAvailable: result.timeline?.rushAvailable === 'true' || result.timeline?.rushAvailable === true,
    },
    aiConfig: result.aiConfig ? {
      ...result.aiConfig,
      humanInLoop: {
        ...result.aiConfig.humanInLoop,
        required: result.aiConfig.humanInLoop?.required === 'true' || result.aiConfig.humanInLoop?.required === true,
      },
    } : undefined,
  } as ProductizedService
}

// =============================================================================
// AI OVERLAY GENERATION
// =============================================================================

export interface GenerateOverlayInput {
  entityType: 'task' | 'process' | 'occupation'
  entity: Task | Process | Occupation
  overlayTypes?: AIOverlayType[]
  context?: string
}

/**
 * Generate AI overlay services for a task, process, or occupation
 */
export async function generateAIOverlays(
  input: GenerateOverlayInput
): Promise<Partial<TaskOverlayBundle>> {
  ensureConfigured()

  const { entityType, entity, overlayTypes, context } = input

  const prompt = `
Generate AI overlay services for this ${entityType}:

Name: ${entity.name}
Description: ${entity.description}
${context ? `Context: ${context}` : ''}

${overlayTypes ? `Focus on these overlay types: ${overlayTypes.join(', ')}` : 'Generate all applicable overlay types.'}

For each applicable overlay type (coaching, training, analysis, consulting, planning, review, documentation, monitoring):
1. Determine if it's applicable to this ${entityType}
2. Design the specific capabilities and features
3. Define the value propositions and pricing

Consider:
- What can be coached/guided in real-time?
- What skills need training?
- What can be analyzed for insights?
- What strategic advice could be provided?
- What planning assistance is valuable?
- What needs quality review?
- What documentation should be generated?
- What metrics should be monitored?
`

  const result = await serviceAI.aiOverlayBundle(prompt) as any

  return {
    taskId: entity.id,
    taskName: entity.name,
    availableOverlays: (result.availableOverlays || []) as AIOverlayType[],
    overlays: {
      coaching: result.coaching ? {
        type: 'coaching' as const,
        timing: 'during' as const,
        capabilities: {
          realTimeGuidance: result.coaching.realTimeGuidance === 'true' || result.coaching.realTimeGuidance === true,
          contextualTips: result.coaching.contextualTips === 'true' || result.coaching.contextualTips === true,
          mistakePrevention: result.coaching.mistakePrevention === 'true' || result.coaching.mistakePrevention === true,
          bestPractices: result.coaching.bestPractices === 'true' || result.coaching.bestPractices === true,
          adaptiveAdvice: result.coaching.adaptiveAdvice === 'true' || result.coaching.adaptiveAdvice === true,
        },
        interaction: result.coaching.interaction,
        valueProps: result.coaching.valueProps,
      } as any : undefined,
      training: result.training ? {
        type: 'training' as const,
        timing: 'before' as const,
        curriculum: {
          modules: result.training.modules || [],
          totalDuration: result.training.totalDuration,
          certification: result.training.certification === 'true' || result.training.certification === true,
        },
        personalization: {
          skillAssessment: result.training.personalization?.skillAssessment === 'true' || result.training.personalization?.skillAssessment === true,
          adaptivePath: result.training.personalization?.adaptivePath === 'true' || result.training.personalization?.adaptivePath === true,
          practiceExercises: result.training.personalization?.practiceExercises === 'true' || result.training.personalization?.practiceExercises === true,
          progressTracking: result.training.personalization?.progressTracking === 'true' || result.training.personalization?.progressTracking === true,
        },
        valueProps: result.training.valueProps,
      } as any : undefined,
      analysis: result.analysis ? {
        type: 'analysis' as const,
        timing: 'after' as const,
        analysisScope: {
          performance: result.analysis.analysisScope?.performance === 'true' || result.analysis.analysisScope?.performance === true,
          quality: result.analysis.analysisScope?.quality === 'true' || result.analysis.analysisScope?.quality === true,
          efficiency: result.analysis.analysisScope?.efficiency === 'true' || result.analysis.analysisScope?.efficiency === true,
          patterns: result.analysis.analysisScope?.patterns === 'true' || result.analysis.analysisScope?.patterns === true,
          anomalies: result.analysis.analysisScope?.anomalies === 'true' || result.analysis.analysisScope?.anomalies === true,
          comparisons: result.analysis.analysisScope?.comparisons === 'true' || result.analysis.analysisScope?.comparisons === true,
        },
        deliverables: {
          dashboards: result.analysis.deliverables?.dashboards === 'true' || result.analysis.deliverables?.dashboards === true,
          reports: result.analysis.deliverables?.reports === 'true' || result.analysis.deliverables?.reports === true,
          alerts: result.analysis.deliverables?.alerts === 'true' || result.analysis.deliverables?.alerts === true,
          recommendations: result.analysis.deliverables?.recommendations === 'true' || result.analysis.deliverables?.recommendations === true,
          forecasts: result.analysis.deliverables?.forecasts === 'true' || result.analysis.deliverables?.forecasts === true,
        },
        valueProps: result.analysis.valueProps,
      } as any : undefined,
    },
    pricing: result.pricing as any,
    totalValue: result.totalValue,
  }
}

/**
 * Assess overlay opportunities for an entity
 */
export async function assessOverlayOpportunities(
  entityType: 'task' | 'process' | 'activity' | 'occupation',
  entity: { id: string; name: string; description: string }
): Promise<OverlayOpportunityAssessment> {
  ensureConfigured()

  const prompt = `
Assess AI overlay opportunities for this ${entityType}:

Name: ${entity.name}
Description: ${entity.description}

For each overlay type (coaching, training, analysis, consulting, planning, review, documentation, monitoring):
1. Score feasibility (0-100): How technically feasible is this overlay?
2. Score value (0-100): How much value would it provide?
3. Score competition (0-100): How uncrowded is this space? (higher = less competition)
4. Calculate overall opportunity score
5. Provide rationale

Identify the top 3 opportunities with specific recommendations and next steps.
`

  const result = await serviceAI.overlayOpportunity(prompt) as any

  return {
    entityType,
    entityId: entity.id,
    entityName: entity.name,
    opportunities: (result.opportunities || []).map((o: any) => ({
      overlayType: o.overlayType as AIOverlayType,
      feasibility: parseInt(o.feasibility) || 0,
      value: parseInt(o.value) || 0,
      competition: parseInt(o.competition) || 0,
      overall: parseInt(o.overall) || 0,
      rationale: o.rationale,
    })),
    topOpportunities: (result.topOpportunities || []).map((t: any) => ({
      overlayType: t.overlayType as AIOverlayType,
      recommendation: t.recommendation,
      nextSteps: t.nextSteps,
    })),
  }
}

// =============================================================================
// SERVICE TEMPLATES
// =============================================================================

/**
 * Get a service template for a given pattern
 */
export function getServiceTemplate(pattern: ServicePattern): ServiceTemplate {
  const templates: Record<ServicePattern, ServiceTemplate> = {
    audit: {
      pattern: 'audit',
      nameFormula: '{Industry} {Domain} Audit',
      typicalPricing: { low: 500, mid: 2000, high: 10000 },
      typicalTimeline: '1-2 weeks',
      typicalDeliverables: ['Audit report', 'Findings summary', 'Recommendations', 'Action plan'],
      keyDifferentiators: ['Depth of analysis', 'Industry expertise', 'Actionable recommendations'],
    },
    analysis: {
      pattern: 'analysis',
      nameFormula: '{Domain} Analysis & Insights',
      typicalPricing: { low: 1000, mid: 5000, high: 25000 },
      typicalTimeline: '2-4 weeks',
      typicalDeliverables: ['Analysis report', 'Data visualization', 'Insights deck', 'Recommendations'],
      keyDifferentiators: ['Analytical depth', 'Data sources', 'Predictive capabilities'],
    },
    assessment: {
      pattern: 'assessment',
      nameFormula: '{Domain} Readiness Assessment',
      typicalPricing: { low: 500, mid: 2500, high: 15000 },
      typicalTimeline: '1-2 weeks',
      typicalDeliverables: ['Assessment scorecard', 'Gap analysis', 'Roadmap', 'Benchmarking report'],
      keyDifferentiators: ['Assessment methodology', 'Benchmarking data', 'Roadmap quality'],
    },
    'done-for-you': {
      pattern: 'done-for-you',
      nameFormula: '{Deliverable} Creation Service',
      typicalPricing: { low: 500, mid: 3000, high: 20000 },
      typicalTimeline: '1-4 weeks',
      typicalDeliverables: ['Completed deliverable', 'Source files', 'Documentation'],
      keyDifferentiators: ['Quality', 'Speed', 'Customization level'],
    },
    'done-with-you': {
      pattern: 'done-with-you',
      nameFormula: '{Domain} Strategy Session',
      typicalPricing: { low: 500, mid: 2000, high: 10000 },
      typicalTimeline: '1-2 days',
      typicalDeliverables: ['Session recording', 'Strategy document', 'Action items'],
      keyDifferentiators: ['Facilitator expertise', 'Framework used', 'Follow-up support'],
    },
    'template-plus': {
      pattern: 'template-plus',
      nameFormula: '{Domain} Playbook + Customization',
      typicalPricing: { low: 200, mid: 1000, high: 5000 },
      typicalTimeline: '3-5 days',
      typicalDeliverables: ['Customized template', 'Implementation guide', 'Training'],
      keyDifferentiators: ['Template quality', 'Customization depth', 'Support included'],
    },
    optimization: {
      pattern: 'optimization',
      nameFormula: '{Domain} Optimization',
      typicalPricing: { low: 1000, mid: 5000, high: 25000 },
      typicalTimeline: '2-4 weeks',
      typicalDeliverables: ['Before/after analysis', 'Optimized deliverable', 'Performance report'],
      keyDifferentiators: ['Improvement methodology', 'Results guarantee', 'Ongoing support'],
    },
    transformation: {
      pattern: 'transformation',
      nameFormula: '{Domain} Transformation',
      typicalPricing: { low: 5000, mid: 25000, high: 100000 },
      typicalTimeline: '1-3 months',
      typicalDeliverables: ['Transformation roadmap', 'New system/process', 'Change management plan'],
      keyDifferentiators: ['Transformation methodology', 'Change management', 'Success guarantee'],
    },
    migration: {
      pattern: 'migration',
      nameFormula: '{From} to {To} Migration',
      typicalPricing: { low: 1000, mid: 5000, high: 50000 },
      typicalTimeline: '1-4 weeks',
      typicalDeliverables: ['Migration plan', 'Migrated data/system', 'Validation report'],
      keyDifferentiators: ['Migration expertise', 'Data integrity', 'Downtime minimization'],
    },
    managed: {
      pattern: 'managed',
      nameFormula: 'Managed {Domain}',
      typicalPricing: { low: 500, mid: 2000, high: 10000 },
      typicalTimeline: 'Ongoing monthly',
      typicalDeliverables: ['Monthly reports', 'Continuous optimization', 'Priority support'],
      keyDifferentiators: ['SLA guarantees', 'Proactive management', 'Strategic guidance'],
    },
    monitoring: {
      pattern: 'monitoring',
      nameFormula: '{Domain} Monitoring & Alerts',
      typicalPricing: { low: 100, mid: 500, high: 2000 },
      typicalTimeline: 'Ongoing monthly',
      typicalDeliverables: ['Real-time dashboard', 'Alerts', 'Monthly reports'],
      keyDifferentiators: ['Monitoring depth', 'Alert accuracy', 'Response time'],
    },
    maintenance: {
      pattern: 'maintenance',
      nameFormula: '{Domain} Maintenance',
      typicalPricing: { low: 200, mid: 1000, high: 5000 },
      typicalTimeline: 'Ongoing monthly',
      typicalDeliverables: ['Maintenance log', 'Updates applied', 'Health reports'],
      keyDifferentiators: ['Response time', 'Proactive updates', 'Issue prevention'],
    },
    workshop: {
      pattern: 'workshop',
      nameFormula: '{Domain} Workshop',
      typicalPricing: { low: 500, mid: 2000, high: 10000 },
      typicalTimeline: '1-2 days',
      typicalDeliverables: ['Workshop materials', 'Recording', 'Action plan'],
      keyDifferentiators: ['Facilitator expertise', 'Interactive elements', 'Takeaway materials'],
    },
    course: {
      pattern: 'course',
      nameFormula: '{Domain} Masterclass',
      typicalPricing: { low: 100, mid: 500, high: 2000 },
      typicalTimeline: 'Self-paced',
      typicalDeliverables: ['Video lessons', 'Workbooks', 'Certificate'],
      keyDifferentiators: ['Content quality', 'Production value', 'Community access'],
    },
    coaching: {
      pattern: 'coaching',
      nameFormula: '{Domain} Coaching',
      typicalPricing: { low: 500, mid: 2000, high: 10000 },
      typicalTimeline: 'Monthly retainer',
      typicalDeliverables: ['Coaching sessions', 'Progress tracking', 'Resources'],
      keyDifferentiators: ['Coach expertise', 'Methodology', 'Accountability'],
    },
  }

  return templates[pattern]
}
