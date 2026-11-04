---
name: openspec-archive-with-github
description: Archives the current OpenSpec change and updates the corresponding GitHub Issue.
---

# OpenSpec Archive with GitHub

Use this skill to archive the current OpenSpec change and update the corresponding GitHub Issues.
Always use this GitHub Project: `Gschwendtner_Sonnleitner_Drohnenverwaltung` (number 4, owner `AntonGschwendtner`).

Archive only when all tasks of the change are implemented, tested and merged into `main`. If not, name what is missing and stop.

## Workflow

1. Update the corresponding GitHub Issues for the current OpenSpec change. Set the status to "Done", add a comment with the OpenSpec change reference (if not done before) and close the issue.
2. Archive the current OpenSpec change. `opsx:archive`

## GitHub tools

Prefer the GitHub CLI `gh`.

Check existing issues:

```bash
gh issue list --limit 100
```

Set a status on the board. The status field is `PVTSSF_lAHOCs65es4BoV1rzhm2ZkE`.

```bash
gh project item-list 4 --owner AntonGschwendtner --format json
gh project field-list 4 --owner AntonGschwendtner --format json
gh project item-edit --project-id PVT_kwHOCs65es4BoV1r --id <item-id> --field-id PVTSSF_lAHOCs65es4BoV1rzhm2ZkE --single-select-option-id <option-id>
```
