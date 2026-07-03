# DECISIONS.md

## The 30% Rule
Team capacity is calculated as `floor(teamSize * 0.3)`. For a team of 4, this
yields 1 (max 1 person on leave at a time), ensuring strict coverage rather
than rounding up and risking under-coverage.

**Edge case — small teams:** for teams of size 1–3, `floor(size * 0.3)` is 0,
which means no member of that team could ever have an approved leave request.
This was left as-is rather than silently overridden with a minimum of 1,
since enforcing a hidden minimum would contradict the "strict team coverage"
requirement without an explicit instruction to do so. Flagged here as a
known behavior, not a bug.

## Multi-day Requests
The 30% rule is evaluated **per calendar day** across the requested date
range, not once against the whole block. A request is rejected (or blocked
from approval) as soon as a single day in its range would breach capacity.
This matches the proposal's explicit instruction to evaluate per-day rather
than blocking the entire range upfront on an aggregate basis.

## Weekends & Public Holidays
Saturdays, Sundays, and any date present in `PublicHolidays` are skipped
entirely when evaluating the 30% capacity rule. These days do not count
towards a leave request breaching team capacity.

## Overlapping Requests
- On **submission**, a new request is blocked only if it overlaps an
  existing request with `Status == Approved`. Overlapping `Pending` requests
  do not block submission.
- On **approval**, capacity (the 30% rule) is re-validated at that moment,
  since other requests may have been approved in the meantime. If approval
  would breach capacity on any day in the range, the approval is rejected
  with a 409 Conflict, and the request remains Pending.

## Request State Machine
Approve/reject endpoints only act on requests currently in `Pending` status.
Attempting to approve/reject an already-Approved or already-Rejected request
returns a 400 Bad Request. This wasn't explicitly listed in the proposal's
ambiguities but follows directly from having Pending as a distinct status —
without this guard, a Rejected request could later be silently re-approved.

## Employee Validation
Leave requests are rejected with 400 Bad Request if `EmployeeId` does not
correspond to an existing employee, preventing orphaned leave requests.

## Future-Date Validation
Leave requests with a `StartDate` earlier than the current date (UTC) are
rejected with 400 Bad Request. Same-day requests are permitted; only
requests where the start date has already passed are blocked.

## Testability
Validation logic (30% rule and overlap checks) was extracted into a
standalone `LeaveRequestValidator` class, separate from the endpoint/HTTP
layer, so it can be unit tested directly against an EF Core InMemory
context without spinning up the API.

## Seeding
Employees and public holidays are seeded from `SeedData/employees.csv` and
`SeedData/public_holidays.json` at startup, only when their respective
tables are empty (idempotent — safe to restart without duplicating data).
Employee IDs are generated as new GUIDs at seed time rather than stored in
the CSV, so the seed file only needs Name and Team columns. To test against
different seed data, replace these two files (same shape) and start against
a fresh database.

## Authentication
No auth system is implemented, as the brief does not request one. The
submission form includes an employee selector; the selected employee is
used as the requester. This is a stand-in for a real auth/session layer,
which would be the natural next step outside this brief's scope.

## Team Scoping
GET /api/employees returns all employees across all teams, not scoped to a
"manager." No manager entity or manager-to-team mapping exists in the
schema, consistent with the no-auth decision above.