---
description: Interview user in-depth about a feature/project to create a product specification document
---

# Write Spec

Interview the user thoroughly to create a product spec document focused on user experience and behavior.

## Process

1. Ask what feature/project to spec (this determines `<feature_name>`)
2. Use AskUserQuestion repeatedly to explore ALL dimensions below
3. Ask 2-4 questions at a time, continue until exhausted
4. Write spec to `docs/<feature_name>/specs.md`

## Interview Rules

- NEVER ask obvious questions
- Ask questions that reveal hidden complexity and tradeoffs
- Each question should make user think deeply
- Probe deeper on vague answers
- Surface contradictions
- Skip technical implementation details (that's for /write-plan)

## Dimensions to Cover

### Core Problem
- What problem does this solve that isn't solved today?
- Cost of NOT building this?
- Success metrics?
- Minimum viable version?
- What would make this a failure even if "working"?

### Users & Context
- Primary vs secondary users?
- Existing mental models/workflows?
- What mistakes to prevent?
- Accessibility requirements?

### Screens & Navigation
- What screens/pages are needed?
- URL structure for each? Query params?
- Entry points (how does user reach each screen)?
- Exit points (where can user navigate from here)?
- Deep linking requirements?
- Browser back/forward expected behavior?
- Page title for each screen?

### Forms & User Input
- What fields on each form? Required vs optional?
- Validation rules (from user perspective)?
- Multi-step wizard or single form?
- Inline editing vs modal vs dedicated page?
- Autosave/draft support?
- What action triggers submission?
- Confirmation step before destructive actions?
- What happens after successful submit? Redirect? Toast?
- Error display: inline per-field vs summary?

### UI/UX
- Information hierarchy?
- Feedback at each step?
- Mobile vs desktop?
- Loading states?
- Destructive action confirmation?
- Navigation/layout integration?
- Empty/first-time states?

### Permissions per UI
- Which roles see which screens?
- Which actions visible per role?
- Disabled vs hidden for unauthorized?
- Per-row/per-item permission variations?
- Permission error UX (redirect vs message)?

### Notifications & Emails
- What events trigger notifications?
- Which channels (in-app, email, push)?
- Who receives each notification?
- Email content (minimal vs detailed)?
- Notification preferences/opt-out?
- Delivery timing (immediate vs batched)?

### Edge Cases
- Concurrent access behavior?
- Limits (max items)?
- User navigates away mid-action?
- Undo/recovery?
- Stale data scenarios?

### Error Handling
- What errors can user encounter?
- Error messages (user-friendly)?
- Recovery actions?

### Rollout
- Feature flag strategy?
- Pilot users?
- Gradual rollout?

### Future
- Evolution path?
- What NOT to commit to yet?

## Output Format

```markdown
# [Feature] - Product Specification

## Overview
[2-3 sentences]

## Goals
- [goals]

## Non-Goals
- [explicitly out of scope]

## Users
- Primary: [who]
- Secondary: [who]

## User Stories
- As [user], I want [action] so that [benefit]

## Screens & Navigation

| Screen | URL | Entry From | Opens In |
|--------|-----|------------|----------|
| [name] | /path/:id | [source] | same tab / new tab |

**Notes**:
- [URL conventions, navigation patterns]

## UI/UX

### [Screen Name]
[Description, layout, key elements]

**Empty States**:
- [condition]: "[message]"

## Forms

### [Form Name]
- **Location**: [inline/modal/page]
- **Fields**:
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
- **Submit**: [button label]
- **On Success**: [redirect/toast/etc]
- **On Error**: [how errors display]

## Permissions per UI

| Screen/Action | Roles Allowed | If Unauthorized |
|---------------|---------------|-----------------|
| [screen] | [roles] | [behavior] |

## Notifications

| Event | Channel | Recipients | Content |
|-------|---------|------------|---------|
| [trigger] | email | [who] | [brief description] |

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| [case] | [what happens] |

## Error Handling

| Error | Message | Recovery |
|-------|---------|----------|
| [error] | "[user message]" | [action] |

## Rollout
[how to ship safely]

## Open Questions
- [unresolved items]

## Future Considerations
- [later enhancements]

## References
- Figma: [link]
- Technical plan: [plan.md](./plan.md)
```

## Final Steps

1. Confirm feature name with user (for folder: `docs/<feature_name>/`)
2. Write spec to `docs/<feature_name>/specs.md`
3. Suggest running `/write-plan` for technical architecture
