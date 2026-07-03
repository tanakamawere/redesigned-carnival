using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Scheduler.API.Entities;

namespace Scheduler.API.Services;

public static class DbSeeder
{
    public static async Task SeedAsync(DataContext context, string seedDataPath)
    {
        await SeedEmployeesAsync(context, Path.Combine(seedDataPath, "employees.csv"));
        await SeedPublicHolidaysAsync(context, Path.Combine(seedDataPath, "public_holidays.json"));
    }

    private static async Task SeedEmployeesAsync(DataContext context, string csvPath)
    {
        if (await context.Employees.AnyAsync())
        {
            return; // already seeded, don't touch existing data
        }

        if (!File.Exists(csvPath))
        {
            throw new FileNotFoundException(
                $"Seed file not found at '{csvPath}'. Expected a CSV with header 'Name,Team'.");
        }

        var lines = await File.ReadAllLinesAsync(csvPath);
        var employees = new List<Employee>();

        // Skip header row (index 0)
        foreach (var line in lines.Skip(1))
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            var parts = line.Split(',', StringSplitOptions.TrimEntries);
            if (parts.Length != 2)
            {
                throw new FormatException(
                    $"Malformed employees.csv row: '{line}'. Expected exactly 'Name,Team'.");
            }

            var name = parts[0];
            if (!Enum.TryParse<Team>(parts[1], ignoreCase: true, out var team))
            {
                throw new FormatException(
                    $"Unknown team '{parts[1]}' in employees.csv. Valid values: " +
                    string.Join(", ", Enum.GetNames<Team>()));
            }

            employees.Add(new Employee
            {
                Id = Guid.NewGuid(),
                Name = name,
                Team = team
            });
        }

        context.Employees.AddRange(employees);
        await context.SaveChangesAsync();
    }

    private static async Task SeedPublicHolidaysAsync(DataContext context, string jsonPath)
    {
        if (await context.PublicHolidays.AnyAsync())
        {
            return;
        }

        if (!File.Exists(jsonPath))
        {
            throw new FileNotFoundException(
                $"Seed file not found at '{jsonPath}'. Expected a JSON array of {{ Date, Name }}.");
        }

        var json = await File.ReadAllTextAsync(jsonPath);
        var holidayDtos = JsonSerializer.Deserialize<List<PublicHolidayDto>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (holidayDtos is null || holidayDtos.Count == 0)
        {
            throw new FormatException("public_holidays.json parsed to an empty or null list.");
        }

        var holidays = holidayDtos.Select(dto => new PublicHoliday
        {
            Name = dto.Name,
            Date = DateTime.Parse(dto.Date, CultureInfo.InvariantCulture, DateTimeStyles.None)
        }).ToList();

        context.PublicHolidays.AddRange(holidays);
        await context.SaveChangesAsync();
    }

    private sealed class PublicHolidayDto
    {
        public string Date { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }
}