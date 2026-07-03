# AI Usage

## Tools Used
- **Gemini**: Used for planning the application structure and for generating the frontend design and initial UI iteration.
- **Claude**: Used primarily for the backend implementation, particularly for writing the endpoints, tests (xUnit), and the backend validation logic (30% rule and overlap rule).

## Most Useful Prompts
1. **To Gemini (Frontend structure & design):**
   > "Design a single-page frontend application for a Team Leave Scheduler using my provided HTML/JS stack. It needs to display a 30-day calendar of approved leaves and include a simple form to submit new requests. Keep the design strictly functional and ignore advanced styling, as per the requirements."

2. **To Claude (Backend validation & tests):**
   > "Write an xUnit test and the EF Core validation logic for a business rule stating no more than 30% of a team can be on leave at a time. The test should use an InMemory database. The capacity should be evaluated per calendar day, rounding down, skipping weekends and public holidays."

## Where AI Got It Wrong
When calculating the 30% capacity, Claude initially calculated the percentage based on the total number of employees in the entire company rather than scoping it to the specific team of the employee requesting leave. This would have allowed an entire small team to be on leave simultaneously if the company was large enough. I had to explicitly correct it to group the leave checks by `Employee.Team`.
