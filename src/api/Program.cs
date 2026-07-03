using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Scheduler.API;
using Scheduler.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

// Add MS SQL Server database context
builder.Services.AddDbContext<DataContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

// Seed the database with initial data if necessary
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<DataContext>();
    await context.Database.MigrateAsync(); // ensure schema exists first

    var seedDataPath = Path.Combine(AppContext.BaseDirectory, "SeedData");
    await DbSeeder.SeedAsync(context, seedDataPath);
}

app.MapAppEndpoints();
app.Run();
