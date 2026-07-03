namespace Scheduler.API.Entities;

public class LeaveRequest
{
    public int Id { get; set; }
    public Guid EmployeeId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public Status Status { get; set; }
}

public enum Status
{
    Pending,
    Approved,
    Rejected
}
