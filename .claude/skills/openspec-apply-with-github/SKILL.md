---
name: openspec-apply-with-github
description: Updates the Github Issue and execute opsx:apply
---

# OpenSpec Apply with GitHub

Use this skill to apply one task of the current OpenSpec change to the local repository and synchronize with GitHub Issues and the GitHub Project.
Always use this GitHub Project: `Gschwendtner_Sonnleitner_Drohnenverwaltung` (number 4, owner `AntonGschwendtner`).

Only implement the task of the named issue. Do not implement other OpenSpec tasks.

## Workflow

1. Update the corresponding GitHub Issue. Set the status to "In progress" and add a comment with the OpenSpec change reference.
2. Run `git switch main` and `git pull`, then create a branch named after the feature, such as `feature/16-loan-api`.
3. Execute `opsx:apply` for this task only.
4. Run the tests. Every Given/When/Then scenario of the task needs a test.
5. Read `git diff`, then commit.
6. Once the task is finished and the tests pass: push the branch, create a pull request that references the issue and the requirement, and merge it into `main` with `gh pr merge --merge`. Keep the branch. Never merge unfinished or failing work.
7. Set the issue status to "In review".
8. Do not set the status to "Done" or archive the OpenSpec change.

## GitHub tools

Prefer the GitHub CLI `gh`.

Check existing issues:

```bash
gh issue list --limit 100
```

Set a status on the board. The status field is `PVTSSF_lAHOCs65es4BoV1rzhm2ZkE`, the columns are Backlog, Ready, In progress, In review and Done.

```bash
gh project item-list 4 --owner AntonGschwendtner --format json
gh project field-list 4 --owner AntonGschwendtner --format json
gh project item-edit --project-id PVT_kwHOCs65es4BoV1r --id <item-id> --field-id PVTSSF_lAHOCs65es4BoV1rzhm2ZkE --single-select-option-id <option-id>
```
