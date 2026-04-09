---
description: Convert technical plan to tasks.json for Ralph autonomous agent
---

# Plan to Tasks

Converts a technical plan (from /write-plan) to `tasks.json` that Ralph uses for autonomous execution.

## Process

1. Read `docs/<feature_name>/plan.md` (implementation order, technical details)
2. Reference `docs/<feature_name>/specs.md` (user context, acceptance criteria)
3. Explore codebase to populate notes with file paths
4. Write `docs/<feature_name>/tasks.json`

---

## Output Format

```json
{
  "name": "[Project Name]",
  "branchName": "ralph/[feature-name-kebab-case]",
  "description": "[Feature description]",
  "notes": "Figma: https://figma.com/... | Reference: app/src/components/Similar.tsx",
  "userStories": [
    {
      "id": "US-001",
      "title": "[Story title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2", "Typecheck passes"],
      "priority": 1,
      "estimate": "S",
      "dependsOn": [],
      "passes": false,
      "notes": ""
    }
  ]
}
```

### Field Reference

| Field       | Required | Description                                       |
| ----------- | -------- | ------------------------------------------------- |
| `notes`     | Optional | Free-form: figma links, file references, context  |
| `priority`  | Optional | 1=Urgent, 2=High, 3=Normal, 4=Low. Omit if normal |
| `estimate`  | Optional | T-shirt: XS, S, M, L, XL. Omit if unsure          |
| `dependsOn` | Optional | Story IDs this depends on, e.g. `["US-001"]`      |

---

## Story Size: The Number One Rule

**Each story must be completable in ONE Ralph iteration (one context window).**

### Right-sized stories:

- Add a database table and migration
- Add a single API endpoint
- Add a UI component to an existing page
- Update middleware with new permission check

### Too big (split these):

- "Build the entire feature" → Split by layer/phase
- "Add all API endpoints" → One story per endpoint group
- "Create the UI" → Split into components

**Rule of thumb:** If you cannot describe the change in 2-3 sentences, it's too big.

---

## Mapping Plan Phases to Stories

Use the Implementation Order from plan.md to structure stories:

### Phase → Stories Pattern

```
plan.md Phase 1: Foundation
├── US-001: DB tables (from Data Model section)
├── US-002: API endpoints (from REST API section)
└── US-003: Permission layer

plan.md Phase 2: Frontend
├── US-004: Page component
└── US-005: Form component
```

### Layer Checklist

| Layer              | Example Stories            |
| ------------------ | -------------------------- |
| **Schema**         | Create tables, migrations  |
| **Domain**         | Entity structs, repository |
| **API**            | Endpoints, viewmodels      |
| **Middleware**     | Permission checks          |
| **Frontend Hooks** | Data fetching hooks        |
| **UI**             | Pages, forms, components   |

---

## Technical Investigation

Before finalizing, **explore the codebase** to populate notes:

### What to Find

1. **Existing patterns**: How are similar features done?
2. **File locations**: Where should new code live?
3. **Functions to extend**: Exact methods to modify

### Good Notes

```json
"notes": "pkg/rest/links/ | follows existing handler pattern"
"notes": "Extend middleware.go:CheckAccess with new permission check"
"notes": "web/src/pages/ | follow existing page pattern"
```

### Bad Notes

```json
"notes": ""
"notes": "backend stuff"
```

---

## Verification Actions

Each criterion must be **executable** - something Ralph can actually run and check. Think like a human reviewer.

### Testing Requirements

**Every story must include appropriate test criteria.** Tests are part of the story, not separate tasks.

#### Unit Tests

| Change Type                    | Test Requirement                           |
| ------------------------------ | ------------------------------------------ |
| New function/method            | New unit test covering main behavior       |
| New API endpoint               | Endpoint test (covers middleware too)      |
| New component                  | New unit test for rendering + interactions |
| New edge case in existing code | New test case for that edge case           |
| Bug fix                        | Test that reproduces bug (now passes)      |

#### E2E Tests

| Story Type                        | E2E Requirement                       |
| --------------------------------- | ------------------------------------- |
| New UI page/flow                  | New E2E test for the flow             |
| New form                          | E2E test: fill, submit, verify result |
| Touches existing E2E-covered area | Run related E2E tests as criteria     |

#### Code Review (Required)

All code must pass skill-based review before committing:

| Code Type              | Review Skill            |
| ---------------------- | ----------------------- |
| Frontend (SolidJS)     | `/frontend-code-review` |
| Backend (Node/Hono/TS) | `/backend-code-review`  |

**Issue severity handling:**
- **Critical**: Must fix
- **Important**: Must address
- **Nice-to-have/suggestions**: Can discard

**When your story touches code covered by existing E2E tests, add those tests to acceptance criteria:**

```json
"acceptanceCriteria": [
  "... implementation criteria ...",
  "bun test -- links passes"
]
```

### Build/Test Checks by Area

**Backend (Node/Hono/TS):**

```
"bun run typecheck passes"
"bun test passes"
"Unit test: createLink rejects empty shortcode"
"Endpoint test: POST /api/links returns 201 with valid payload"
"Endpoint test: POST /api/links without auth returns 401"
```

Note: Endpoint tests cover the full request lifecycle including middleware (auth, permissions, validation).

**Frontend (web/):**

```
"bun run typecheck passes"
"bun test passes"
"Unit test: LinkCard renders shortcode and destination"
"E2E: create-link flow passes"
```

**Database migrations:**

```
"Migration runs without errors"
```

Include the relevant check for each story - don't add frontend checks to backend stories.

### API Stories - Use CURL

```json
"acceptanceCriteria": [
  "CURL GET /api/links returns 200 with Link[] shape",
  "CURL POST /api/links with valid payload returns 201",
  "CURL POST /api/links without auth returns 401",
  "CURL GET /api/links/:id for non-existent returns 404",
  "Unit test: createLink rejects empty shortcode",
  "Unit test: createLink rejects duplicate shortcode",
  "/backend-code-review passes, critical/important issues fixed",
  "bun run typecheck passes",
  "bun test passes"
]
```

### Permission Stories - Test Both Allow and Deny

```json
"acceptanceCriteria": [
  "CURL as owner returns 200",
  "CURL as unauthenticated user returns 401",
  "CURL as unauthorized user returns 403",
  "Unit test: checkAccess returns true for owner",
  "Unit test: checkAccess returns false for unrelated user",
  "/backend-code-review passes, critical/important issues fixed",
  "bun run typecheck passes",
  "bun test passes"
]
```

### UI Stories - Actually Browse and Interact

**Critical:** UI stories must be verified by actually opening the app in a browser and interacting with it. Ralph should navigate, click, fill forms, and observe results - not just check that code compiles.

```json
"acceptanceCriteria": [
  "Open / in browser - link directory renders without errors",
  "Links table shows shortcode and destination columns",
  "When no links exist, empty state message is displayed",
  "Unit test: LinkList renders all links",
  "Unit test: LinkList shows empty state when no links",
  "E2E test: directory flow (navigate, view links)",
  "/frontend-code-review passes, critical/important issues fixed",
  "bun run typecheck passes",
  "bun test passes"
]
```

### Form Stories - Test Real Interactions

```json
"acceptanceCriteria": [
  "Open /create in browser",
  "Click submit without filling - validation errors appear",
  "Fill shortcode and destination fields",
  "Submit form - redirects to directory, new link visible",
  "Unit test: CreateLinkForm validates required fields",
  "Unit test: CreateLinkForm calls onSubmit with correct payload",
  "E2E test: create-link flow (fill, submit, verify)",
  "/frontend-code-review passes, critical/important issues fixed",
  "bun run typecheck passes",
  "bun test passes"
]
```

### Database Stories - Verify with SQL

```json
"acceptanceCriteria": [
  "Migration runs without errors",
  "SQL: SELECT * FROM links returns expected columns",
  "SQL: links.shortcode has UNIQUE constraint",
  "SQL: Foreign keys reference correct tables",
  "bun run typecheck passes"
]
```

### Verification Action Reference

| Story Type   | Verification Method                                                 |
| ------------ | ------------------------------------------------------------------- |
| API endpoint | CURL with auth headers, check status + response shape               |
| Permissions  | CURL as different users/roles, verify allow/deny                    |
| UI page      | Open in browser, navigate, check elements render, no console errors |
| Form         | Open in browser, fill fields, submit, verify success/error states   |
| Database     | Run migration, SQL queries to verify schema                         |
| Middleware   | CURL through protected endpoints                                    |
| Frontend hooks | Covered by UI verification that uses them                         |

### Bad Criteria (not executable)

```
"Works correctly"           → HOW to verify?
"User can create team"      → WHAT steps exactly?
"API is secure"             → WHICH checks to run?
"Good error handling"       → WHAT errors, WHAT response?
"Tests pass"                → WHICH tests? What do they verify?
"Has unit tests"            → For WHAT behavior specifically?
"E2E works"                 → WHAT flow, WHAT assertions?
```

---

## Dependency Order

Stories execute in order. Earlier stories must not depend on later ones.

**Correct order:**

1. Schema/migrations
2. Backend/API
3. Permission layer
4. Frontend hooks
5. UI components

---

## Example

**From plan.md Implementation Order:**

```
Phase 1: Foundation (sequential)
1. DB: links table
2. API: links CRUD endpoints
3. API: redirect handler
```

**Output tasks.json:**

```json
{
  "name": "GoLinks",
  "branchName": "ralph/links-crud",
  "description": "Core link management — create, list, redirect",
  "notes": "specs.md for UX details",
  "userStories": [
    {
      "id": "US-001",
      "title": "Create links table",
      "description": "As a developer, I need a database table to store go-links.",
      "acceptanceCriteria": [
        "Migration runs without errors",
        "SQL: links table has id, shortcode, destination, created_at columns",
        "SQL: UNIQUE constraint exists on links.shortcode",
        "bun run typecheck passes"
      ],
      "estimate": "S",
      "dependsOn": [],
      "passes": false,
      "notes": "src/db/migrations/ | follow existing migration pattern"
    },
    {
      "id": "US-002",
      "title": "Add links CRUD API endpoints",
      "description": "As a user, I need API endpoints to create, list, and delete links.",
      "acceptanceCriteria": [
        "CURL GET /api/links returns 200 with Link[]",
        "CURL POST /api/links with {shortcode, destination} returns 201",
        "CURL DELETE /api/links/:id returns 204",
        "CURL POST /api/links without auth returns 401",
        "Unit test: createLink rejects empty shortcode",
        "Unit test: createLink rejects duplicate shortcode",
        "/backend-code-review passes, critical/important issues fixed",
        "bun run typecheck passes",
        "bun test passes"
      ],
      "estimate": "M",
      "dependsOn": ["US-001"],
      "passes": false,
      "notes": "src/routes/links.ts | follow existing route pattern"
    },
    {
      "id": "US-003",
      "title": "Add link directory UI page",
      "description": "As a user, I need a page to view and manage my go-links.",
      "acceptanceCriteria": [
        "Navigate to / - directory page loads without console errors",
        "Table shows shortcode and destination columns",
        "When no links exist, empty state message is displayed",
        "Click delete - confirmation prompt, then row removed",
        "Unit test: LinkList renders links correctly",
        "Unit test: LinkList shows empty state when no links",
        "E2E test: directory flow (view, delete link)",
        "/frontend-code-review passes, critical/important issues fixed",
        "bun run typecheck passes",
        "bun test passes"
      ],
      "estimate": "M",
      "dependsOn": ["US-002"],
      "passes": false,
      "notes": "web/src/pages/ | follow existing page pattern"
    }
  ]
}
```

---

## Checklist Before Saving

- [ ] Each story completable in one iteration
- [ ] Stories ordered by dependency (schema → API → UI)
- [ ] **New code has unit test criteria** (functions, components, handlers)
- [ ] **Updated code has unit tests for new edge cases/capabilities**
- [ ] **UI stories have E2E test criteria for the flow**
- [ ] **Stories touching E2E-covered areas run those E2E tests**
- [ ] **Backend stories include `/backend-code-review passes, critical/important issues fixed`**
- [ ] **Frontend stories include `/frontend-code-review passes, critical/important issues fixed`**
- [ ] Backend stories have `bun run typecheck` + `bun test` checks
- [ ] Frontend stories have `bun run typecheck` + `bun test` checks
- [ ] UI stories require actual browser interaction (navigate, click, verify)
- [ ] Criteria are executable, not vague
- [ ] No story depends on a later story
- [ ] Notes populated with file paths
- [ ] All layers covered (no gaps between API and UI)

---

## Final Steps

1. Read `docs/<feature_name>/plan.md`
2. Reference `docs/<feature_name>/specs.md` for user context
3. Explore codebase for file paths
4. Write `docs/<feature_name>/tasks.json`
