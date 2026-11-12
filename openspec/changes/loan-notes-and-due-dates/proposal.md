# Proposal

## Why

Today a loan does not say what the drone is used for or when it should come back. The teacher wants a short note ("for project survey") and an agreed return date, so overdue drones stand out.

## What Changes

- A loan can get an optional note of up to 500 characters (REQ-021).
- A loan can get an optional planned return date, which must not lie before the loan date (REQ-022).
- An active loan whose planned return date has passed is marked as overdue in the active loans list.
- Note and planned return date are shown in the active loans and in the history. The planned return date stays stored after the return.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `loan`: loan note, planned return date and overdue mark.

## Impact

- Backend: two new nullable columns on `Loan` (`Note`, `DueDate`), one migration. The create request and the loan response get `note`, `dueDate` and `isOverdue`. Existing clients keep working because both fields are optional.
- Frontend: two new fields in the loan form, new columns or card rows in the loan lists, English and German texts.
- Docs: REQ-021 and REQ-022, domain model (`Loan` gets two attributes), README.

## Out of Scope

- Changing note or planned return date after the loan is created.
- Reminders by e-mail.

## Open Point for the Team

`improve-lending-overview` marks loans after 7 days as long-running (REQ-012). With a planned return date the team decides: does the overdue mark replace the 7-day mark for loans that have a planned return date (this proposal's suggestion), or are both shown?
