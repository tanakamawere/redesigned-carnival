using Microsoft.EntityFrameworkCore;
using Scheduler.API.Entities;
using Scheduler.API.Validation;

namespace Scheduler.API;

public static class Endpoints
{
    // Ambiguity: "30% Rule" -> floor(teamSize * 0.3), e.g. team of 4 -> max 1 concurrent leave.
    private const double LeaveCapacityRatio = 0.3;

    public static IEndpointRouteBuilder MapAppEndpoints(this IEndpointRouteBuilder app)
    {
        // API endpoint for submitting a new leave request
        app.MapPost("/api/leaverequests", async (LeaveRequest leaveRequest, DataContext context) =>
        {
            if (leaveRequest.StartDate > leaveRequest.EndDate)
                return Results.BadRequest("Start date cannot be after end date.");

            if (leaveRequest.StartDate.Date < DateTime.UtcNow.Date)
                return Results.BadRequest("Leave requests cannot be submitted for past dates.");

            var employee = await context.Employees.FindAsync(leaveRequest.EmployeeId);
            if (employee is null)
                return Results.BadRequest("Employee does not exist.");

            if (await LeaveRequestValidator.HasApprovedOverlapAsync(
                    context, leaveRequest.EmployeeId, leaveRequest.StartDate, leaveRequest.EndDate))
                return Results.BadRequest("The leave request overlaps with an approved leave request.");

            var conflictDate = await LeaveRequestValidator.FindCapacityConflictAsync(
                context, employee.Team, leaveRequest.StartDate, leaveRequest.EndDate);

            if (conflictDate is not null)
                return Results.BadRequest($"Team capacity exceeded on {conflictDate:yyyy-MM-dd}.");

            leaveRequest.Status = Status.Pending;
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
            if (leaveRequest is null)
            {
                return Results.NotFound();
            }

            if (leaveRequest.Status != Status.Pending)
            {
                return Results.BadRequest("Only pending requests can be approved.");
            }

            var employee = await context.Employees.FindAsync(leaveRequest.EmployeeId);
            if (employee is null)
            {
                return Results.BadRequest("Employee does not exist.");
            }

            // Re-validate capacity at the moment of approval, since other requests
            // may have been approved since this one was submitted.
            var conflictDate = await FindCapacityConflictAsync(
                context, employee.Team, leaveRequest.StartDate, leaveRequest.EndDate, excludeRequestId: leaveRequest.Id);

            if (conflictDate is not null)
            {
                return Results.Conflict(
                    $"Team capacity exceeded on {conflictDate:yyyy-MM-dd}; cannot approve.");
            }

            leaveRequest.Status = Status.Approved;
            await context.SaveChangesAsync();

            return Results.Ok(leaveRequest);
        });

        // Endpoint to reject a leave request
        app.MapPatch("/api/leaverequests/{id}/reject", async (int id, DataContext context) =>
        {
            var leaveRequest = await context.LeaveRequests.FindAsync(id);
            if (leaveRequest is null)
            {
                return Results.NotFound();
            }

            if (leaveRequest.Status != Status.Pending)
            {
                return Results.BadRequest("Only pending requests can be rejected.");
            }

            leaveRequest.Status = Status.Rejected;
            await context.SaveChangesAsync();

            return Results.Ok(leaveRequest);
        });

        return app;
    }

    // Walks each calendar day in [start, end], skipping weekends and public holidays,
    // and checks whether adding this request would push same-team concurrent approved
    // leave above floor(teamSize * 0.3) on that day. Returns the first offending date, or null.
    private static async Task<DateTime?> FindCapacityConflictAsync(
    DataContext context, Team team, DateTime start, DateTime end, int? excludeRequestId)
{
    var teamSize = await context.Employees.CountAsync(e => e.Team == team);
    var maxConcurrentLeave = (int)Math.Floor(teamSize * LeaveCapacityRatio);

    var holidays = (await context.PublicHolidays
            .Select(h => h.Date.Date)
            .ToListAsync())
        .ToHashSet();

    var teamEmployeeIds = await context.Employees
        .Where(e => e.Team == team)
        .Select(e => e.Id)
        .ToListAsync();

    for (var day = start.Date; day <= end.Date; day = day.AddDays(1))
    {
        if (day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday || holidays.Contains(day))
        {
            continue;
        }

        var onLeaveCount = await context.LeaveRequests
            .Where(lr => lr.Status == Status.Approved &&
                         (excludeRequestId == null || lr.Id != excludeRequestId) &&
                         lr.StartDate <= day && lr.EndDate >= day &&
                         teamEmployeeIds.Contains(lr.EmployeeId))
            .CountAsync();

        if (onLeaveCount >= maxConcurrentLeave)
        {
            return day;
        }
    }

        return null;
    }
}