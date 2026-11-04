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
6. Make sure the created issue is on the GitHub Project and set its status to "Backlog". The board adds new issues by itself, but without a status they may not appear in a column.
7. Write the issue number back into `tasks.md` next to the task.

## GitHub tools

Prefer the GitHub CLI `gh`.

Check existing issues:

```bash
gh issue list --state all --limit 100
```

Create an issue:

```bash
gh issue create --title "Implement Loan API" --body "OpenSpec change: initial-drone-lending-system, task 2.1, REQ-004"
```

Find its board item. The board adds the issue by itself, which can take a few seconds:

```bash
gh project item-list 4 --owner AntonGschwendtner --format json --limit 500 --jq '.items[] | select(.content.number == <issue-number>) | .id'
```

Only if the lookup still returns nothing after a few seconds, add the issue. On an issue that is already on the board this command fails with "Content already exists in this project", so repeat the lookup in that case:

```bash
gh project item-add 4 --owner AntonGschwendtner --url <issue-url> --format json --jq '.id'
```

Set the status to "Backlog":

```bash
gh project item-edit --project-id PVT_kwHOCs65es4BoV1r --id <item-id> --field-id PVTSSF_lAHOCs65es4BoV1rzhm2ZkE --single-select-option-id f75ad846
```
