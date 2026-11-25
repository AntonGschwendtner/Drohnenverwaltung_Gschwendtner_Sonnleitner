# Proposal

## Why

At the end of a semester the teacher wants to know which drones are used a lot, which are hardly used and which groups loan most often, for example to decide what to buy or repair. The data is already in the history but nobody can read it at a glance.

## What Changes

- New statistics page (Bay 06) for a chosen period: this school year, the last 30 days or all time (REQ-030).
- Totals: number of loans, currently active loans, average loan duration in days.
- Per drone: number of loans and total loan days, most used first, shown as bars.
- Per student group: number of loans and total loan days, shown as bars.
- All numbers are computed by the backend from the existing loans; nothing new is stored.

## Capabilities

### New Capabilities

- `lending-statistics`: figures about loans over a period, per drone and per student group.

### Modified Capabilities

_None._

## Impact

- Backend: `GET /api/statistics?from=&to=`. No database change.
- Frontend: new route `/statistics`, period switch, bar charts drawn with HTML and CSS (no chart library), English and German texts.
- Docs: REQ-030, README, Out of Scope list.

## Out of Scope

- Charts over time (loans per week or month).
- Export of the statistics.
- Statistics about accessories.

## Decisions (2026-11-12)

The user approved the change with the suggestions below on 2026-11-12 and asked on 2026-11-25 to finish it ("mach jetzt alles fix fertig").

- Statistics move into scope (they were out of scope in `docs/requirements.md`).
- The school year starts on 1 September.
- Since the trash (REQ-033, REQ-034): drones and groups in the trash are not listed per drone or group; loans of drones or groups deleted for good still count in the totals.
