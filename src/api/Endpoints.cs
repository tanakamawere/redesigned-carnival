using Scheduler.API.Entities;

namespace Scheduler.API;

public static class Endpoints
{
    public static IEndpointRouteBuilder MapEndpoints(this IEndpointRouteBuilder app)
    {
        // API endpoint for submitting a new leave request
        app.MapPost("/api/leaverequests", async (LeaveRequest leaveRequest, DataContext context) =>
        {
            // Validate the leave request
            if (leaveRequest.StartDate > leaveRequest.EndDate)
            {
                return Results.BadRequest("Start date cannot be after end date.");
            }

            // Check for overlapping leave requests for the same employee
            var overlappingLeaveRequests = await context.LeaveRequests
                .Where(lr => lr.EmployeeId == leaveRequest.EmployeeId &&
                             lr.StartDate <= leaveRequest.EndDate &&
                             lr.EndDate >= leaveRequest.StartDate)
                .ToListAsync();

            if (overlappingLeaveRequests.Any())
            {
                return Results.BadRequest("The leave request overlaps with an existing leave request.");
            }

            // Add the new leave request to the database
            context.LeaveRequests.Add(leaveRequest);
            await context.SaveChangesAsync();

            return Results.Created($"/api/leaverequests/{leaveRequest.Id}", leaveRequest);
        });

        // Endpoint to list all leave requests
        app.MapGet("/api/leaverequests", async (DataContext context) =>
        {
            var leaveRequests = await context.LeaveRequests.ToListAsync();
            return Results.Ok(leaveRequests);
        });

        // Endpoint to approve a leave request
        app.MapPatch("/api/leaverequests/{id}/approve", async (int id, DataContext context) =>
        {
            var leaveRequest = await context.LeaveRequests.FindAsync(id);
            if (leaveRequest == null)
            {
                return Results.NotFound();
            }

            leaveRequest.Status = Status.Approved;
            await context.SaveChangesAsync();

            return Results.Ok(leaveRequest);
        });

        // Endpoint to reject a leave request
        app.MapPatch("/api/leaverequests/{id}/reject", async (int id, DataContext context) =>
        {
            var leaveRequest = await context.LeaveRequests.FindAsync(id);
            if (leaveRequest == null)
            {
                return Results.NotFound();
            }

            leaveRequest.Status = Status.Rejected;
            await context.SaveChangesAsync();

            return Results.Ok(leaveRequest);
        });

        return app;
    }
}