---
name: openspec-to-github
description: Create and synchronize GitHub Issues from OpenSpec requirements and tasks.
---

# OpenSpec to GitHub

Use this skill to synchronize the current OpenSpec change with GitHub Issues and the GitHub Project.
Always use this GitHub Project: `Gschwendtner_Sonnleitner_Drohnenverwaltung` (number 4, owner `AntonGschwendtner`).

## Workflow

1. Determine the current OpenSpec change.
2. Read `proposal.md`, `specs/**/*.md` and `tasks.md` of that change.
3. Extract the relevant implementation tasks.
4. Check existing GitHub Issues before creating new issues. Never create duplicate issues, so running this skill twice must not change the result.
5. Create one GitHub Issue for each meaningful implementation task. Name the OpenSpec change, the task number and the matching requirement in the body.
6. Add the created issue to the GitHub Project and set its status to "Backlog". Otherwise it has no status and may not appear in a board column.
7. Write the issue number back into `tasks.md` next to the task.

## GitHub tools

Prefer the GitHub CLI `gh`.

Check existing issues:

```bash
gh issue list --state all --limit 100
```

Create an issue and add it to the project:

```bash
gh issue create --title "Implement Loan API" --body "OpenSpec change: initial-drone-lending-system, task 2.1, REQ-004"
gh project item-add 4 --owner AntonGschwendtner --url <issue-url>
```
