using Microsoft.EntityFrameworkCore;
using Scheduler.API.Entities;

namespace Scheduler.API;

public class DataContext : DbContext
{
    public DataContext(DbContextOptions<DataContext> options) : base(options)
    {
    }

    public DbSet<Employee> Employees { get; set; }
    public DbSet<LeaveRequest> LeaveRequests { get; set; }
    public DbSet<PublicHoliday> PublicHolidays { get; set; }
}