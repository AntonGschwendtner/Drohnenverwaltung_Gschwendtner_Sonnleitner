# Design

## Context

Language (`I18nService`) and theme (`ThemeService`) are toggled by two buttons in the header and stored in `localStorage`. The trash already deletes loans on purpose (REQ-033, REQ-034) with `ExecuteUpdate`/`ExecuteDelete` in a transaction. The database is one SQLite file; tests use an in-memory database.

## Decisions

1. **Dialog, not a route.** `SettingsDialog` is rendered by `App` when a signal is set; no router change, so the address stays. Same look as the other dialogs (`.dialog`), X button top right, focus trap, Escape closes like X. It works on copies of language and theme and writes them on "Apply" through new `I18nService.use()` and `ThemeService.use()`.
2. **Reset as one request.** `POST /api/admin/reset` with four booleans; 400 when none is chosen. Order in one transaction: return all active loans (returned quantities = loaned), delete returned loans, then drones, then groups. Drones and groups keep their returned loans by copying the name into `FormerDroneName`/`FormerStudentGroupName` and clearing the foreign key, like "keep the history" (REQ-033, REQ-034); their active loans are deleted. Trash entries are included, so the trash is empty afterwards.
3. **Backup with the SQLite backup API.** `GET /api/admin/backup` copies the live database with `SqliteConnection.BackupDatabase` into a temporary file and sends it as `drohnenverwaltung-backup-<date>.db`. A consistent copy also while the app is used, no stop needed.
4. **Restore.** `POST /api/admin/restore` with a multipart file (at most 50 MB). Accepted only with the SQLite header, an `__EFMigrationsHistory` table and no migration unknown to this version (400 "made by a newer version"). The file is copied over the live database with the backup API, then `Migrate` brings older backups up to date.
5. **History delete.** `DELETE /api/loans/history` deletes all returned loans (items by cascade) and answers `{ deletedLoans }`.
6. **After a reset or restore** the dialog reloads the page, so every list shows the new state without special code per page.

## Risks / Trade-offs

- [Reset and restore cannot be undone] → Extra confirmation listing what happens; the dialog suggests downloading a backup first.
- [No login protects the reset] → Out of scope like all roles; documented.
