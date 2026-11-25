# Proposal

## Why

An overdue loan is only marked "Overdue" today; the teacher cannot see whether it is one day or two weeks late, and a loan that is due today looks like any other. The app also opens on the drone list, although the first question in the morning is "what is due or late today?".

## What Changes

- **Due marks (REQ-035).** An active loan whose planned return date is today is marked "Due today". An overdue loan says since how many days it is overdue ("Overdue for 3 days"). Both are marked in colour in the list of active loans: due today in the signal colour, overdue in the alarm colour.
- **Today page (REQ-036).** A new start page "Today" opens at the address of the app. It shows the number of active loans, loans due today, overdue loans and available drones, and lists the overdue loans (most overdue first), the loans due today and the long-running loans, each linking to the loan page. Without anything due it says so. The navigation gets the entry "Today" in front of the others.

## Capabilities

### New Capabilities

- `today`: the start page with what is due or late today.

### Modified Capabilities

- `loan`: due today and days overdue for active loans.

## Impact

- Backend: `LoanResponse` gets `isDueToday` and `daysOverdue`, computed when read like `isOverdue`.
- Frontend: marks and colours in the active loan list; new `TodayPage` at `/today`, the empty address and unknown addresses lead there; navigation entry; English and German.
- Docs: REQ-035, REQ-036, README.

## Out of Scope

- Reminders by e-mail or push notification.
- Reservations on the today page (the reservations change is not built yet).

## Decision (2026-11-25)

Wished by the user ("how long it is overdue", "mark in colour when due today or overdue", start page "Today" from the suggestions); built without a further question.
