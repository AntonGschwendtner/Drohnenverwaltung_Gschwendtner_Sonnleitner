# Proposal

## Why

Language and theme switches take space in the header, and there is no way to start a new school year with a clean state, to save the data before an update or to bring it back. The history can only shrink through the trash.

## What Changes

- **Settings dialog (REQ-037).** A gear button in the header opens the settings as a pop-up in the middle of the screen; the address does not change. An X at the top right closes it without changes, "Apply" applies the choices. Language and light/dark mode move from the header into the dialog and take effect with "Apply".
- **General reset (REQ-038)** in the dialog: tick boxes "Return all drones", "Delete all drones", "Delete all student groups" and "Delete the whole history"; only what is ticked happens, after one more confirmation that lists it. Deleting drones or groups keeps their returned loans in the history under their names, like "keep the history" in the trash; ticking "Delete the whole history" removes them.
- **Backup and restore (REQ-039)** in the dialog: "Download backup" saves the whole database as a file at once; choosing a backup file and "Apply" replaces all data after a confirmation. Only backups of this application are accepted; an older backup is brought up to date.
- **Delete the history (REQ-040):** a button "Delete history" on the history page removes all returned loans after a confirmation. Active loans stay.
- **BREAKING (domain rule 5):** returned loans are also deleted by "Delete history" and by the general reset.

## Capabilities

### New Capabilities

- `settings`: the settings dialog with language, theme, general reset, backup and restore.

### Modified Capabilities

- `loan`: the history can be deleted as a whole.

## Impact

- Backend: `AdminService` with `POST /api/admin/reset`, `GET /api/admin/backup`, `POST /api/admin/restore` (multipart file); `DELETE /api/loans/history`.
- Frontend: `SettingsDialog` opened from the header, header without language and theme buttons; history page button; English and German.
- Docs: REQ-037 to REQ-040, domain rule 5, README.

## Out of Scope

- Login or a password for the reset, backups on a schedule, backups of single tables.

## Decision (2026-11-25)

Wished by the user: settings only as a centred pop-up without a different address, X to close, "Apply" to apply; general reset with tick boxes; backup and restore; "Delete history" on the history page. Assumptions announced to the user: language and theme apply with "Apply"; a ticked reset asks once more.
