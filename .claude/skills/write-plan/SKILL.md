---
description: Create technical architecture plan from product spec with data models, APIs, and implementation order
---

# Write Plan

Create a technical architecture plan based on an existing product spec.

## Process

1. Read the product spec (default: `docs/<feature_name>/specs.md`)
2. Explore codebase to understand existing patterns
3. Use AskUserQuestion to clarify technical decisions
4. Ask 2-4 questions at a time on implementation choices
5. Write plan to `docs/<feature_name>/plan.md`

## Interview Rules

- Assume product decisions are made (reference spec)
- Focus on HOW to build, not WHAT to build
- Ask about constraints and existing patterns
- Surface technical tradeoffs
- Prefer extending existing code over new abstractions

## Dimensions to Cover

### Data Model
- New tables/entities needed?
- Relationships (1:1, 1:N, N:N)?
- Constraints (unique, foreign keys)?
- Indexes needed?
- Soft delete vs hard delete?
- Existing tables to extend?

### Permission Layer
- New permission checks needed?
- Extend existing middleware or new?
- Single query vs multiple checks?
- Access levels (read/write/none)?

### REST API
- New endpoints vs extend existing?
- Request/response shapes?
- Error codes per endpoint?
- Pagination/filtering approach?
- Batch operations?

### Frontend Architecture
- New components vs reuse?
- State management approach?
- URL/routing changes?
- Shared component patterns?

### Technical Constraints
- Performance requirements?
- Caching strategy?
- Real-time vs polling?
- Offline support?

### Security
- Auth mechanism?
- Input validation?
- Data exposure concerns?
- Audit logging?

### Implementation Order
- What depends on what?
- What can be parallelized?
- Incremental delivery possible?

### Migration
- Data migrations needed?
- Backwards compatibility?
- Feature flags?

### Analytics & Tracking
- Event naming pattern?
- Backend vs frontend tracking?
- User properties to track?
- Event properties to include?
- Privacy/PII considerations?

## Output Format

```markdown
# [Feature] - Technical Plan

## Architecture Overview

```
[ASCII diagram showing system components]
```

---

## Data Model

### [Entity Name]

```
[ASCII ER diagram]
```

**SQL**:
```sql
CREATE TABLE ...
```

---

## Permission Layer

### Current State
```go
// current implementation
```

### Target State
```go
// new implementation
```

### SQL Query
```sql
-- single query returning access level
SELECT ...
```

---

## REST API

### [Endpoint Group]

| Method | Route | Request | Response |
|--------|-------|---------|----------|
| GET | /path | - | `{...}` |

**Request/Response Examples**:
```json
{}
```

---

## Frontend Architecture

### [Pattern Name]
[Description of approach]

```tsx
// example code
```

**Affected components**:
- ComponentA
- ComponentB

---

## Technical Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| [name] | [value] | [why] |

---

## Security

- **Auth**: [mechanism]
- **Validation**: [approach]
- **Audit**: [logging strategy]

---

## Analytics & Tracking

### Event Naming
[Pattern: action_object or object_action]

### Backend vs Frontend
| Event | Location | Rationale |
|-------|----------|-----------|
| [event] | Backend/Frontend | [why] |

### Properties
**User Properties**:
- [property]: [description]

**Event Properties**:
- [property]: [description]

---

## Implementation Order

### Phase N: [Name] (sequential/parallel)

```
[ASCII flow diagram]
1. Step one
         │
         ▼
2. Step two
```

---

## References

- Product spec: [specs.md](./specs.md)
- Existing patterns: [relevant code paths]
```

## Final Steps

1. Read spec from `docs/<feature_name>/specs.md`
2. Write plan to `docs/<feature_name>/plan.md`
3. Include ASCII diagrams where helpful
