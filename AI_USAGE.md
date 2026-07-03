# AI Usage

## Tools Used
- **Gemini**: Used for planning the application structure and for generating the frontend design and initial UI iteration.
- **Claude**: Used primarily for the backend implementation, particularly for writing the endpoints, tests (xUnit), and the backend validation logic (30% rule and overlap rule).

## Most Useful Prompts
1. **To Gemini (Frontend structure & design):**

```

Build a Next.js (App Router, TypeScript) frontend for an internal HR "Team Leave Scheduler" tool. This is a thin UI over an existing ASP.NET Core API — do not add a backend, database, or auth system of your own. Keep scope minimal; do not add features beyond what's listed below.

API base URL: https://localhost:{PORT} (I'll fill in the actual port/launchSettings value). All endpoints return/accept JSON.

Existing schema (do not rename fields):

Employee: { id: string (guid), name: string, team: "Engineering" | "Operations" | "Finance" }
LeaveRequest: { id: number, employeeId: string (guid), startDate: string (ISO date), endDate: string (ISO date), status: "Pending" | "Approved" | "Rejected" }
PublicHoliday: { id: number, date: string (ISO date), name: string }

Existing API endpoints:
- GET /api/employees -> Employee[] (assume this exists; if not, note it as a dependency I need to add)
- GET /api/leaverequests/upcoming -> LeaveRequest[] (next 30 days, overlapping today..+30)
- POST /api/leaverequests -> body { employeeId, startDate, endDate }, returns 201 + created LeaveRequest, or 400 with a plain-text error message on validation failure (overlap, capacity, past date, etc.)
- PATCH /api/leaverequests/{id}/approve -> returns 200 + updated LeaveRequest, or 400/404/409 with plain-text error
- PATCH /api/leaverequests/{id}/reject -> returns 200 + updated LeaveRequest, or 400/404 with plain-text error

Build exactly three pieces of UI, no more:

1. One screen showing the next 30 days as a list or calendar, with each team member's APPROVED leave visible (filter client-side by status === "Approved" from the /upcoming response, or show all with status badges — your call on which reads better, but approved leave must be clearly visually distinct, e.g. only approved leave shown on the calendar, pending/rejected in a separate list below).
2. A submit form: employee dropdown (populated from GET /api/employees, showing name + team), start date picker, end date picker, submit button. On submit, POST to /api/leaverequests. Show the API's error message directly if the request is rejected (400) — don't invent your own validation messages that might not match the backend's actual rules.
3. For each Pending request, an Approve and a Reject button that calls the corresponding PATCH endpoint and refreshes the list. Show the API's error message if approval fails (e.g. 409 capacity conflict).

Non-goals: no login/auth, no employee "own portal" concept, no styling framework preference (Tailwind is fine if you want, keep it simple), no client-side re-implementation of the 30% rule or overlap logic — the backend is the source of truth for all validation; the frontend just displays results and surfaces errors.

Use fetch or a small typed API client — no heavy state management library needed for a screen this small. Handle loading and error states minimally but visibly (don't fail silently).

```

2. **To Claude (Backend validation & tests):**

```

Implement the leave request business logic for this Scheduler.API project.
Entities (Employee, LeaveRequest, PublicHoliday, DataContext) already exist
in the project — use them as-is, don't rename or add navigation properties.

Business rules:

1. 30% Rule: on any given day, at most floor(teamSize * 0.3) members of the
   same team may have APPROVED overlapping leave. Evaluate per-day across a
   multi-day request's range, not as one aggregate block. Skip weekends and
   dates present in PublicHolidays. Don't silently override the edge case
   where a small team (size 1-3) computes to 0 max concurrent — leave it as
   the literal result of the formula.

2. Overlap Rule: a new request is blocked only if it overlaps an existing
   request with Status == Approved for the same employee. Pending requests
   don't block new submissions. Re-validate the 30% rule again at approval
   time, since other requests may have been approved since submission.

3. Only Pending requests can be approved or rejected — 400 if already
   Approved/Rejected.

4. Reject requests where StartDate is before today (UTC date comparison).
   Same-day requests are allowed.

5. Reject requests where EmployeeId doesn't match an existing Employee, or
   where StartDate > EndDate.

Extract the 30% rule and overlap rule into a standalone static class
(e.g. LeaveRequestValidator) that takes a DataContext parameter, kept
separate from the endpoint/HTTP layer.

Endpoints (extension method MapAppEndpoints on IEndpointRouteBuilder, in
Endpoints.cs):

- POST /api/leaverequests — validates rules 2-5, sets Status to Pending,
  returns 201 + created resource, or 400 with a message naming which rule
  failed.
- PATCH /api/leaverequests/{id}/approve — re-validates 30% rule, returns
  200 + updated resource, 404 if not found, 400 if not Pending, 409 if
  capacity would be breached.
- PATCH /api/leaverequests/{id}/reject — returns 200 + updated resource,
  404 if not found, 400 if not Pending.
- GET /api/leaverequests — all requests, unfiltered.
- GET /api/leaverequests/upcoming — requests overlapping the next 30 days
  from today (UTC).
- GET /api/employees — all employees, unfiltered.

Produce a DECISIONS.md documenting the ambiguous calls: 30% rounding and
the zero-capacity edge case, per-day evaluation, weekend/holiday skipping,
pending-vs-approved overlap distinction, the Pending-only state guard,
future-date validation's UTC/same-day assumptions, and the
LeaveRequestValidator extraction.

```

## Where AI Got It Wrong
When calculating the 30% capacity, Claude initially calculated the percentage based on the total number of employees in the entire company rather than scoping it to the specific team of the employee requesting leave. This would have allowed an entire small team to be on leave simultaneously if the company was large enough. I had to explicitly correct it to group the leave checks by `Employee.Team`.
