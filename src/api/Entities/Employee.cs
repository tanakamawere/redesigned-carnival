namespace Scheduler.API.Entities;

public class Employee
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public Team Team { get; set; }
}

public enum Team
{
    Engineering,
    Operations,
    Finance
}