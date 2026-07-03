using Microsoft.EntityFrameworkCore;
using Scheduler.API.Entities;

namespace Scheduler.API.Validation;

public static class LeaveRequestValidator
{
    private const double LeaveCapacityRatio = 0.3;

    public static async Task<bool> HasApprovedOverlapAsync(
        DataContext context, Guid employeeId, DateTime start, DateTime end, int? excludeRequestId = null)
    {
        return await context.LeaveRequests.AnyAsync(lr =>
            lr.EmployeeId == employeeId &&
            lr.Status == Status.Approved &&
            (excludeRequestId == null || lr.Id != excludeRequestId) &&
            lr.StartDate <= end &&
            lr.EndDate >= start);
    }

    public static async Task<DateTime?> FindCapacityConflictAsync(
        DataContext context, Team team, DateTime start, DateTime end, int? excludeRequestId = null)
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