/**
 * Unified Abstract Interface Types
 *
 * These types define the abstract interfaces that unify various standards
 * into a common business ontology for business.org.ai
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base entity with standard columns
 */
export interface Entity {
  ns: string // Namespace (e.g., "occupations.org.ai")
  type: string // Entity type (e.g., "Occupation")
  id: string // Unique identifier (PascalCase)
  name: string // Display name
  description: string // Full description
  code?: string // Standard code (e.g., "11-1011.00")
}

/**
 * Relationship between two entities
 */
export interface Relationship {
  from: string // Source entity URL
  to: string // Target entity URL
  predicate: string // Relationship type (e.g., "requires")
  reverse: string // Reverse predicate (e.g., "requiredBy")
  [key: string]: string // Additional properties (scores, etc.)
}

/**
 * Hierarchical entity with parent reference
 */
export interface HierarchicalEntity extends Entity {
  parentId?: string
  level?: number
}

// ============================================================================
// Abstract Interfaces - People & Work
// ============================================================================

/**
 * Abstract Role - unifies Occupations, Job Titles, Positions
 */
export interface AbstractRole extends Entity {
  type: 'Role'
  category: 'Occupation' | 'JobTitle' | 'Position' | 'Function'
  sourceType: string // Original type (e.g., "ONETOccupation", "BLSOccupation")
  sourceCode?: string // Original code
  // Unified attributes
  seniorityLevel?: string
  jobFunction?: string
  department?: string
}

/**
 * Abstract Competency - unifies Skills, Abilities, Knowledge
 */
export interface AbstractCompetency extends Entity {
  type: 'Competency'
  category: 'Skill' | 'Ability' | 'Knowledge' | 'Trait'
  sourceType: string
  // Unified attributes
  domain?: string // Technical, Soft, etc.
  proficiencyScale?: string
}

/**
 * Abstract Task - unifies Tasks, Work Activities, Responsibilities
 */
export interface AbstractTask extends Entity {
  type: 'Task'
  category: 'Task' | 'Activity' | 'Responsibility' | 'Duty'
  sourceType: string
  // Unified attributes
  frequency?: string
  importance?: string
  complexity?: string
}

/**
 * Abstract Action - semantic verb-object patterns
 */
export interface AbstractAction extends Entity {
  type: 'Action'
  verb: string
  object: string
  preposition?: string
  prepObject?: string
  // Derived from tasks
  sourceTaskIds?: string[]
}

/**
 * Abstract Event - past-tense business events
 */
export interface AbstractEvent extends Entity {
  type: 'Event'
  pastTense: string
  verb: string
  object: string
  // Links to actions
  sourceActionId?: string
}

// ============================================================================
// Abstract Interfaces - Organizations & Industries
// ============================================================================

/**
 * Abstract Industry - unifies NAICS, SIC, GICS sectors
 */
export interface AbstractIndustry extends HierarchicalEntity {
  type: 'Industry'
  category: 'Sector' | 'Subsector' | 'Group' | 'Industry' | 'SubIndustry'
  sourceType: string // NAICS, SIC, GICS, etc.
  sourceCode?: string
  // Unified attributes
  economicActivity?: string
}

/**
 * Abstract Process - unifies APQC processes, business capabilities
 */
export interface AbstractProcess extends HierarchicalEntity {
  type: 'Process'
  category: 'Category' | 'Group' | 'Process' | 'Activity'
  sourceType: string
  // Unified attributes
  processArea?: string
  industry?: string
}

// ============================================================================
// Abstract Interfaces - Products & Services
// ============================================================================

/**
 * Abstract Product - unifies UNSPSC, GS1, SKU hierarchies
 */
export interface AbstractProduct extends HierarchicalEntity {
  type: 'Product'
  category: 'Segment' | 'Family' | 'Class' | 'Commodity' | 'Item'
  sourceType: string
  // Unified attributes
  isDigital?: boolean
  productType?: string
}

/**
 * Abstract Service - unifies NAPCS, service taxonomies
 */
export interface AbstractService extends HierarchicalEntity {
  type: 'Service'
  category: 'Section' | 'Division' | 'Group' | 'Class' | 'Subclass'
  sourceType: string
  // Unified attributes
  isDigital?: boolean
  serviceType?: string
}

// ============================================================================
// Abstract Interfaces - Geography & Organizations
// ============================================================================

/**
 * Abstract Location - unifies geographic hierarchies
 */
export interface AbstractLocation extends HierarchicalEntity {
  type: 'Location'
  category: 'Country' | 'Region' | 'State' | 'City' | 'CBSA' | 'County'
  sourceType: string
  // Unified attributes
  isoCode?: string
  fipsCode?: string
  timezone?: string
}

/**
 * Abstract Organization Type - legal/business entity types
 */
export interface AbstractOrgType extends Entity {
  type: 'OrgType'
  category: 'Legal' | 'Business' | 'Nonprofit' | 'Government'
  sourceType: string
  // Unified attributes
  jurisdiction?: string
}

// ============================================================================
// Abstract Interfaces - Standards & Classifications
// ============================================================================

/**
 * Abstract Standard - metadata about standard sources
 */
export interface AbstractStandard extends Entity {
  type: 'Standard'
  category: 'Classification' | 'Vocabulary' | 'Framework' | 'Specification'
  publisher: string
  version?: string
  url?: string
}

/**
 * Abstract Metric - business metrics and KPIs
 */
export interface AbstractMetric extends Entity {
  type: 'Metric'
  category: 'KPI' | 'Measure' | 'Indicator' | 'Ratio'
  sourceType: string
  // Unified attributes
  unit?: string
  formula?: string
  benchmark?: string
}

// ============================================================================
// Unified Domain Types
// ============================================================================

/**
 * Unified work domain combining occupations, skills, tasks
 */
export interface WorkDomain {
  roles: AbstractRole[]
  competencies: AbstractCompetency[]
  tasks: AbstractTask[]
  actions: AbstractAction[]
  events: AbstractEvent[]
  relationships: {
    roleCompetencies: Relationship[] // Role → Competency
    roleTasks: Relationship[] // Role → Task
    taskActions: Relationship[] // Task → Action
    actionEvents: Relationship[] // Action → Event
  }
}

/**
 * Unified business domain combining industries, processes, products
 */
export interface BusinessDomain {
  industries: AbstractIndustry[]
  processes: AbstractProcess[]
  products: AbstractProduct[]
  services: AbstractService[]
  metrics: AbstractMetric[]
  relationships: {
    industryProcesses: Relationship[] // Industry → Process
    processProducts: Relationship[] // Process → Product
    processServices: Relationship[] // Process → Service
    industryMetrics: Relationship[] // Industry → Metric
  }
}

/**
 * Unified geography domain
 */
export interface GeographyDomain {
  locations: AbstractLocation[]
  relationships: {
    hierarchy: Relationship[] // Location → Parent Location
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isEntity(obj: unknown): obj is Entity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'ns' in obj &&
    'type' in obj &&
    'id' in obj &&
    'name' in obj
  )
}

export function isRelationship(obj: unknown): obj is Relationship {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'from' in obj &&
    'to' in obj &&
    'predicate' in obj
  )
}

// ============================================================================
// Namespace Constants
// ============================================================================

export const NAMESPACES = {
  // Work Domain
  roles: 'roles.org.ai',
  occupations: 'occupations.org.ai',
  competencies: 'competencies.org.ai',
  skills: 'skills.org.ai',
  tasks: 'tasks.org.ai',
  actions: 'actions.org.ai',
  events: 'events.org.ai',
  activities: 'activities.org.ai',

  // Business Domain
  industries: 'industries.org.ai',
  process: 'process.org.ai',
  products: 'products.org.ai',
  services: 'services.org.ai',
  metrics: 'metrics.org.ai',

  // Geography Domain
  locations: 'locations.org.ai',
  places: 'places.org.ai',

  // Organization Domain
  organizations: 'organizations.org.ai',
  companies: 'companies.org.ai',
  departments: 'departments.org.ai',

  // Standards Sources
  onet: 'onet.org.ai',
  naics: 'naics.org.ai',
  apqc: 'apqc.org.ai',
  gs1: 'gs1.org.ai',
  bls: 'bls.org.ai',
  iso: 'iso.org.ai',
  un: 'un.org.ai',
  w3c: 'w3c.org.ai',

  // Meta
  standards: 'standards.org.ai',
  business: 'business.org.ai',
} as const

export type Namespace = (typeof NAMESPACES)[keyof typeof NAMESPACES]
