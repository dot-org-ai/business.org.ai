# Business.org.ai Data Generation Plan

## Overview

This document outlines the plan for generating all business-related data in `.org.ai/business.org.ai/.data/`.

## Directory Structure

```
.org.ai/business.org.ai/
├── .data/
│   ├── Industries.tsv
│   ├── Occupations.tsv
│   ├── Processes.tsv                              # Wikipedia_style: Develop_Vision_And_Strategy
│   ├── Tasks.tsv                                  # Wikipedia_style: Direct_Financial_Activities
│   ├── Actions.tsv                                # GraphDL semantic: Subject.verb.Object
│   ├── Events.tsv                                 # Past tense: Object.verbed
│   ├── Skills.tsv
│   ├── Knowledge.tsv
│   ├── Abilities.tsv
│   ├── Jobs.tsv
│   ├── Departments.tsv
│   ├── BusinessTypes.tsv
│   ├── Careers.tsv
│   ├── CareerClusters.tsv
│   ├── Education.tsv
│   ├── Employment.tsv
│   ├── Wages.tsv
│   └── relationships/
│       ├── Industries.Industries.tsv              # Industry → Industry (hasSubIndustry)
│       ├── Industries.Occupations.tsv             # Industry → Occupation
│       ├── Industries.Processes.tsv               # Industry → Process
│       ├── Occupations.Skills.tsv                 # Occupation → Skill (requires)
│       ├── Occupations.Knowledge.tsv              # Occupation → Knowledge (requires)
│       ├── Occupations.Abilities.tsv              # Occupation → Ability (requires)
│       ├── Occupations.Occupations.tsv            # Occupation → Occupation (relatedTo)
│       ├── Occupations.Tasks.tsv                  # Occupation → Task
│       ├── Occupations.Actions.tsv                # Occupation → Action (performs)
│       ├── Industries.Actions.tsv                 # Industry → Action (involves)
│       ├── Actions.Events.tsv                     # Action → Event (produces)
│       ├── Actions.Objects.tsv                    # Action → Object (targets)
│       ├── Processes.Processes.tsv                # Process → Process (hasSubProcess)
│       ├── Processes.Tasks.tsv                    # Process → Task
│       ├── Processes.Actions.tsv                  # Process → Action
│       ├── Tasks.Actions.tsv                      # Task → Action
│       └── Tasks.Occupations.tsv                  # Task → Occupation (performedBy)
```

## Canonical URL Column

Each entity TSV file will have a `canonical` column after `url` that maps business.org.ai URLs to their canonical domain:

### Entity URL Schema

| Entity | business.org.ai URL | canonical URL |
|--------|---------------------|---------------|
| Industry | `business.org.ai/Industries/Manufacturing` | `industries.org.ai/Manufacturing` |
| Occupation | `business.org.ai/Occupations/SoftwareDeveloper` | `occupations.org.ai/SoftwareDeveloper` |
| Process | `business.org.ai/Processes/Develop_Vision_And_Strategy` | `process.org.ai/Develop_Vision_And_Strategy` |
| Task | `business.org.ai/Tasks/Direct_Financial_Activities` | `tasks.org.ai/Direct_Financial_Activities` |
| Action | `business.org.ai/Actions/ChiefExecutives.direct.FinancialActivities` | `actions.org.ai/ChiefExecutives.direct.FinancialActivities` |
| Event | `business.org.ai/Events/FinancialActivities.directed` | `events.org.ai/FinancialActivities.directed` |
| Skill | `business.org.ai/Skills/ActiveListening` | `skills.org.ai/ActiveListening` |
| Knowledge | `business.org.ai/Knowledge/Administration` | `knowledge.org.ai/Administration` |
| Ability | `business.org.ai/Abilities/OralComprehension` | `abilities.org.ai/OralComprehension` |
| Job | `business.org.ai/Jobs/SoftwareEngineer` | `jobs.org.ai/SoftwareEngineer` |
| Department | `business.org.ai/Departments/Engineering` | `departments.org.ai/Engineering` |
| BusinessType | `business.org.ai/Types/LLC` | `types.org.ai/LLC` |
| Career | `business.org.ai/Careers/Engineer` | `careers.org.ai/Engineer` |
| CareerCluster | `business.org.ai/CareerClusters/STEM` | `careers.org.ai/Clusters/STEM` |

### TSV Column Order

```
url	canonical	ns	type	id	code	name	description	[additional columns...]
```

Example for Industries.tsv:
```
url	canonical	ns	type	id	code	name	description
business.org.ai/Industries/Manufacturing	industries.org.ai/Manufacturing	business.org.ai	Industry	Manufacturing	31	Manufacturing	Manufacturing sector
```

## Relationship Files

Each relationship file is named `{FromType}.{ToType}.tsv` - the file name itself indicates the types, so no type columns needed.

### Columns

```
ns	from	to	predicate	reverse
```

- `ns`: namespace (e.g., `business.org.ai`)
- `from`: source entity ID (PascalCase normalized)
- `to`: target entity ID (PascalCase normalized)
- `predicate`: relationship verb (e.g., `requires`, `relatedTo`, `hasSubIndustry`)
- `reverse`: inverse predicate

### Relationship File List

| File | Predicate | Description |
|------|-----------|-------------|
| `Industries.Industries.tsv` | hasSubIndustry | Industry hierarchy |
| `Industries.Occupations.tsv` | employs | Occupations within industry |
| `Industries.Processes.tsv` | uses | Processes used by industry |
| `Occupations.Skills.tsv` | requires | Skills required by occupation |
| `Occupations.Knowledge.tsv` | requires | Knowledge required by occupation |
| `Occupations.Abilities.tsv` | requires | Abilities required by occupation |
| `Occupations.Occupations.tsv` | relatedTo | Related occupations |
| `Occupations.Tasks.tsv` | performs | Tasks performed by occupation |
| `Occupations.WorkActivities.tsv` | involves | Work activities for occupation |
| `Occupations.WorkContext.tsv` | hasContext | Work context for occupation |
| `Processes.Processes.tsv` | hasSubProcess | Process hierarchy |
| `Processes.Tasks.tsv` | includes | Tasks within process |
| `Tasks.Occupations.tsv` | performedBy | Occupations that perform task |

## Tasks, Processes, Actions, and Events

This section defines the semantic model for work-related entities.

### Entity Type Definitions

| Type | Naming Style | Description | Example ID |
|------|--------------|-------------|------------|
| **Process** | Wikipedia_style | High-level business process (APQC) | `Develop_Vision_And_Strategy` |
| **Task** | Wikipedia_style | Specific work task (O*NET) | `Direct_Financial_Activities` |
| **Action** | GraphDL semantic | Subject.verb.Object statement | `ChiefExecutives.direct.FinancialActivities` |
| **Event** | Past tense | Object.verbed result | `FinancialActivities.directed` |

### Wikipedia_style Naming Convention

Tasks and Processes use Wikipedia-style naming with underscores:

```
Original: "Direct or coordinate an organization's financial or budget activities"
Task ID:  Direct_Or_Coordinate_Financial_Or_Budget_Activities
```

Rules:
- Replace spaces with underscores
- Remove special characters (apostrophes, etc.)
- Capitalize first letter of each word (Title_Case)
- Keep conjunctions (And, Or, To) capitalized

### GraphDL Semantic Actions

Actions use the GraphDL semantic notation `Subject.verb.Object[.preposition.Object]`:

```
Source Task: "Direct or coordinate an organization's financial activities to fund operations"

Actions generated:
  ChiefExecutives.direct.FinancialActivities
  ChiefExecutives.direct.FinancialActivities.to.FundOperations
  ChiefExecutives.coordinate.FinancialActivities
  ChiefExecutives.coordinate.BudgetActivities
```

### Action to Event Transformation

Each Action produces a corresponding Event in past tense:

| Action | Event |
|--------|-------|
| `ChiefExecutives.direct.FinancialActivities` | `FinancialActivities.directed` |
| `Companies.develop.Vision` | `Vision.developed` |
| `Managers.create.Budget` | `Budget.created` |
| `Engineers.build.System` | `System.built` |

Verb conjugation rules:
- Regular verbs: add `-ed` (direct → directed, develop → developed)
- Irregular verbs: use past participle (build → built, write → written)

### Permutation Expansion

Tasks, Processes, and Actions are expanded with and without Occupation/Industry context:

#### Without Context (Generic)
```
Process: Develop_Vision_And_Strategy
Task:    Direct_Financial_Activities
Action:  direct.FinancialActivities
Event:   FinancialActivities.directed
```

#### With Occupation Context
```
Process: ChiefExecutives/Develop_Vision_And_Strategy
Task:    ChiefExecutives/Direct_Financial_Activities
Action:  ChiefExecutives.direct.FinancialActivities
Event:   FinancialActivities.directed.by.ChiefExecutives
```

#### With Industry Context
```
Process: Manufacturing/Develop_Vision_And_Strategy
Task:    Manufacturing/Direct_Financial_Activities
Action:  Manufacturing.direct.FinancialActivities
Event:   FinancialActivities.directed.in.Manufacturing
```

#### With Both Occupation and Industry
```
Process: Manufacturing/ChiefExecutives/Develop_Vision_And_Strategy
Task:    Manufacturing/ChiefExecutives/Direct_Financial_Activities
Action:  Manufacturing.ChiefExecutives.direct.FinancialActivities
Event:   FinancialActivities.directed.by.ChiefExecutives.in.Manufacturing
```

### Relationship Mapping

```
Process (1) ─────┬───── (n) Task
                 │
                 └───── (n) Action ────── (1) Event
                              │
                              ├───── (1) Occupation (performer)
                              ├───── (1) Industry (context)
                              └───── (n) Object (target)
```

### Example Data Flow

Source O*NET Task for Chief Executives (11-1011.00):
```
"Direct or coordinate an organization's financial or budget activities to fund operations, maximize investments, or increase efficiency."
```

Generated entities:

**Tasks.tsv:**
```
tasks.org.ai/Direct_Or_Coordinate_Financial_Or_Budget_Activities
tasks.org.ai/ChiefExecutives/Direct_Or_Coordinate_Financial_Or_Budget_Activities
```

**Actions.tsv:**
```
actions.org.ai/direct.FinancialActivities
actions.org.ai/direct.FinancialActivities.to.FundOperations
actions.org.ai/ChiefExecutives.direct.FinancialActivities
actions.org.ai/ChiefExecutives.direct.FinancialActivities.to.FundOperations
actions.org.ai/ChiefExecutives.coordinate.BudgetActivities
actions.org.ai/ChiefExecutives.coordinate.BudgetActivities.to.MaximizeInvestments
```

**Events.tsv:**
```
events.org.ai/FinancialActivities.directed
events.org.ai/FinancialActivities.coordinated
events.org.ai/Operations.funded
events.org.ai/Investments.maximized
events.org.ai/Efficiency.increased
```

## ID Normalization

All IDs should be normalized to PascalCase for consistency:

| Current (kebab-case) | Normalized (PascalCase) |
|---------------------|------------------------|
| `active-listening` | `ActiveListening` |
| `administration-and-management` | `AdministrationAndManagement` |
| `chief-executives` | `ChiefExecutives` |

## Generation Steps

1. **Read source data** from `.data/` in graph.org.ai root
2. **Transform URLs** to business.org.ai namespace with canonical column
3. **Normalize IDs** to PascalCase
4. **Generate Tasks** with Wikipedia_style names (with/without Occupation/Industry permutations)
5. **Generate Processes** with Wikipedia_style names (with/without Occupation/Industry permutations)
6. **Parse semantic statements** using GraphDL parser to extract Actions
7. **Generate Actions** with all permutation variants (generic, +Occupation, +Industry, +both)
8. **Transform Actions to Events** using verb past-tense conjugation
9. **Write entity files** to `.org.ai/business.org.ai/.data/`
10. **Generate relationships** linking Actions ↔ Events ↔ Tasks ↔ Processes ↔ Occupations ↔ Industries
11. **Write type-specific relationship files** to `.data/relationships/`

## Business Entity Types

The following entities are considered "business-related" and should be included:

### Core Business Entities
- Industries
- Occupations
- Processes (Wikipedia_style, canonical: process.org.ai)
- Tasks (Wikipedia_style, canonical: tasks.org.ai)
- Actions (GraphDL semantic, canonical: actions.org.ai)
- Events (past tense, canonical: events.org.ai)

### Workforce Entities
- Skills
- Knowledge
- Abilities
- Jobs
- Careers
- CareerClusters
- Education
- Employment
- Wages

### Organizational Entities
- Departments
- BusinessTypes

## Script Location

The generation script should be placed at:
```
.org.ai/business.org.ai/.scripts/generate-data.ts
```

This script will:
1. Import from graph.org.ai root `.data/`
2. Transform and write to `.org.ai/business.org.ai/.data/`
3. Support incremental updates
