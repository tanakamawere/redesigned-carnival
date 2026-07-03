using Microsoft.EntityFrameworkCore;
using Scheduler.API;
using Scheduler.API.Entities;
using Scheduler.API.Validation;

public class LeaveRequestValidatorTests
{
    private static DataContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<DataContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()) // unique DB per test
            .Options;
        return new DataContext(options);
    }

    [Fact]
    public async Task FindCapacityConflict_BlocksWhenTeamAtCapacity()
    {
        // Arrange: team of 4 -> floor(4 * 0.3) = 1 max concurrent leave
        await using var context = CreateContext();

        var team = Team.Engineering;
        var employees = Enumerable.Range(0, 4)
            .Select(_ => new Employee { Id = Guid.NewGuid(), Name = "Test", Team = team })
            .ToList();
        context.Employees.AddRange(employees);

        var approvedLeave = new LeaveRequest
        {
            EmployeeId = employees[0].Id,
            StartDate = new DateTime(2026, 8, 10),
            EndDate = new DateTime(2026, 8, 10),
            Status = Status.Approved
        };
        context.LeaveRequests.Add(approvedLeave);
        await context.SaveChangesAsync();

        // Act: a second employee requests the same day
        var conflict = await LeaveRequestValidator.FindCapacityConflictAsync(
            context, team, new DateTime(2026, 8, 10), new DateTime(2026, 8, 10));

        // Assert
        Assert.Equal(new DateTime(2026, 8, 10), conflict);
    }

    [Fact]
    public async Task HasApprovedOverlap_ReturnsTrueWhenDatesOverlapApprovedRequest()
    {
        // Arrange
        await using var context = CreateContext();

        var employeeId = Guid.NewGuid();
        context.Employees.Add(new Employee { Id = employeeId, Name = "Test", Team = Team.Finance });

        context.LeaveRequests.Add(new LeaveRequest
        {
            EmployeeId = employeeId,
            StartDate = new DateTime(2026, 9, 1),
            EndDate = new DateTime(2026, 9, 5),
            Status = Status.Approved
        });
        await context.SaveChangesAsync();

        // Act: new request overlaps middle of the approved range
        var overlaps = await LeaveRequestValidator.HasApprovedOverlapAsync(
            context, employeeId, new DateTime(2026, 9, 3), new DateTime(2026, 9, 8));

        // Assert
        Assert.True(overlaps);
    }
}