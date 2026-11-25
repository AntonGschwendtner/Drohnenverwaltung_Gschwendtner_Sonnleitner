using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>Storage for the student group trash: deletion date and the kept group name of a loan (REQ-033).</summary>
public sealed class StudentGroupTrashEntityTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();

    [Fact]
    public async Task Deletion_date_is_stored_and_empty_by_default()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
            dbContext.StudentGroups.AddRange(
                new StudentGroup { Name = "Group 3" },
                new StudentGroup { Name = "Group 4", DeletedAt = new DateOnly(2026, 8, 20) });
            await dbContext.SaveChangesAsync();
        }

        using var readScope = _factory.Services.CreateScope();
        var groups = await readScope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>()
            .StudentGroups.OrderBy(group => group.Name).ToListAsync();

        Assert.Null(groups[0].DeletedAt);
        Assert.Equal(new DateOnly(2026, 8, 20), groups[1].DeletedAt);
    }

    [Fact]
    public async Task Loans_of_existing_groups_keep_their_group()
    {
        using var client = _factory.CreateClient();
        var droneId = await CreateAsync(client, "/api/drones", new { name = "TELLO-07", description = "x" });
        var groupId = await CreateAsync(client, "/api/student-groups", new { name = "Group 3" });

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });
        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(groupId, loan.GetProperty("studentGroupId").GetInt32());
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
    }

    [Fact]
    public async Task Loan_without_group_shows_the_kept_name()
    {
        int droneId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
            var drone = new Drone { Name = "TELLO-07", Description = "x" };
            dbContext.Drones.Add(drone);
            await dbContext.SaveChangesAsync();
            droneId = drone.Id;
            dbContext.Loans.Add(new Loan
            {
                DroneId = droneId,
                StudentGroupId = null,
                FormerStudentGroupName = "Group 3",
                LoanDate = new DateOnly(2026, 8, 10),
                ReturnDate = new DateOnly(2026, 8, 12),
                Status = LoanStatus.Returned,
            });
            await dbContext.SaveChangesAsync();
        }

        using var client = _factory.CreateClient();
        var loans = await client.GetFromJsonAsync<List<JsonElement>>("/api/loans?status=Returned");

        var loan = Assert.Single(loans!);
        Assert.Equal(JsonValueKind.Null, loan.GetProperty("studentGroupId").ValueKind);
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
    }

    [Fact]
    public async Task Migration_keeps_existing_loans_and_the_one_active_loan_rule()
    {
        using var connection = new SqliteConnection($"Data Source={Guid.NewGuid():N};Mode=Memory;Cache=Shared");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<DroneInventoryDbContext>().UseSqlite(connection).Options;
        await using var dbContext = new DroneInventoryDbContext(options);
        var migrator = dbContext.GetService<IMigrator>();

        // The database as it was before this change, with a group, a drone and an active loan with an item.
        await migrator.MigrateAsync("AddStudentGroupMembers");
        await dbContext.Database.ExecuteSqlRawAsync("""
            INSERT INTO StudentGroups (Id, Name) VALUES (3, 'Group 3');
            INSERT INTO Drones (Id, Name, Description) VALUES (7, 'TELLO-07', 'x');
            INSERT INTO Loans (Id, DroneId, StudentGroupId, LoanDate, Status) VALUES (1, 7, 3, '2026-08-19', 'Active');
            INSERT INTO LoanItems (Id, LoanId, Type, Quantity) VALUES (1, 1, 'Battery', 4);
            """);

        await migrator.MigrateAsync();

        var loan = await dbContext.Loans.Include(l => l.Items).Include(l => l.StudentGroup).SingleAsync();
        Assert.Equal(3, loan.StudentGroupId);
        Assert.Equal("Group 3", loan.StudentGroup?.Name);
        Assert.Null(loan.FormerStudentGroupName);
        Assert.Equal(4, Assert.Single(loan.Items).Quantity);

        var secondActiveLoan = () => dbContext.Database.ExecuteSqlRawAsync(
            "INSERT INTO Loans (DroneId, StudentGroupId, LoanDate, Status) VALUES (7, 3, '2026-08-20', 'Active')");
        await Assert.ThrowsAsync<SqliteException>(secondActiveLoan);
    }

    public void Dispose() => _factory.Dispose();

    private static async Task<int> CreateAsync(HttpClient client, string url, object body)
    {
        var response = await client.PostAsJsonAsync(url, body);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }
}
