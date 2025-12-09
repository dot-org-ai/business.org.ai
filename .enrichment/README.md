# Enrichment Data

This folder contains B2B data enrichment taxonomies for business segmentation. These represent industry-standard classifications used across the B2B data ecosystem.

## Files

### Core Taxonomies

| File | Records | Description |
|------|---------|-------------|
| `JobFunctions.tsv` | 45 | Business departments and job functions |
| `Seniority.tsv` | 10 | Seniority levels (Owner → Entry Level) |
| `CompanySize.Employees.tsv` | 9 | Employee count ranges (1-10 to 10001+) |
| `CompanySize.Revenue.tsv` | 10 | Revenue tiers (<$1M to >$10B) |
| `CompanySize.Segments.tsv` | 7 | Market segments (Micro → Global Enterprise) |
| `FundingStages.tsv` | 11 | Funding stages (Bootstrapped → IPO) |

### Relationships

| File | Description |
|------|-------------|
| `relationships/JobFunction.Occupation.tsv` | Mapping to O*NET SOC occupation codes |
| `relationships/JobFunction.Sector.tsv` | Mapping to NAICS industry sectors |

## Job Functions

The 45 job functions use industry-standard codes:

| Code | Function | Code | Function |
|------|----------|------|----------|
| acct | Accounting | it | Information Technology |
| adm | Administrative | lgl | Legal |
| advr | Advertising | mgmt | Management |
| anls | Analytics | mnfc | Manufacturing |
| art | Art / Creative | mrkt | Marketing |
| bd | Business Development | ops | Operations |
| cnsl | Consulting | pr | Public Relations |
| cust | Customer Service | prch | Procurement |
| csm | Customer Success | prdm | Product Management |
| data | Data Science | prjm | Project Management |
| dsgn | Design | prod | Production |
| dist | Distribution | qa | Quality Assurance |
| edu | Education | re | Real Estate |
| eng | Engineering | recr | Recruiting |
| exec | Leadership | rsch | Research |
| fac | Facilities | sale | Sales |
| fin | Finance | sci | Science |
| genb | General Business | sec | Information Security |
| hcpr | Healthcare Provider | stra | Strategy |
| hr | Human Resources | supl | Supply Chain |
| supp | Support | trng | Training |
| wrt | Writing / Editing | othr | Other |

## Company Size

### By Employees (from B2B data standards)

| Range | Segment |
|-------|---------|
| 1-10 | Micro |
| 11-50 | Small |
| 51-200 | Small |
| 201-500 | Medium |
| 501-1000 | Medium |
| 1001-5000 | Large |
| 5001-10000 | Large |
| 10001+ | Enterprise |

### By Revenue

| Range | Segment |
|-------|---------|
| <$1M | Micro |
| $1M-$50M | Small/SMB |
| $50M-$1B | Mid-Market |
| >$1B | Enterprise |

## Usage

These files enable:

1. **Segmentation** - Classify businesses by function, size, and funding stage
2. **Enrichment** - Enhance business records with standardized attributes
3. **Analysis** - Compare and analyze data across different segments
4. **Mapping** - Connect job functions to occupations (O*NET) and industries (NAICS)

## Schema

All files follow the standard `ns`, `type`, `id`, `code`, `name` pattern used throughout business.org.ai.

## Extending

To add new job functions or company size ranges, add rows following the existing pattern. The `code` field should be a short identifier (2-4 characters) and the `id` should be PascalCase.
