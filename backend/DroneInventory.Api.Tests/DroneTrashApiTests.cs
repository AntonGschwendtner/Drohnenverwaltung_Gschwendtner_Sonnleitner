using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the drone trash (REQ-034): delete to the trash, list, restore, permanent delete with the history
/// choice, no changes and no loans for a drone in the trash, and the history afterwards.
/// </summary>
public sealed class DroneTrashApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public DroneTrashApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Delete_a_drone_without_loans()
    {
        var droneId = await CreateDroneAsync("TELLO-09");

        var response = await _client.DeleteAsync($"/api/drones/{droneId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await ListAsync("/api/drones"));
        var trashed = Assert.Single(await ListAsync("/api/drones/trash"));
        Assert.Equal("TELLO-09", trashed.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Drone_is_already_in_the_trash()
    {
        var droneId = await CreateDroneAsync("TELLO-07");
        await _client.DeleteAsync($"/api/drones/{droneId}");

        var response = await _client.DeleteAsync($"/api/drones/{droneId}");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Drone_in_the_trash_is_not_listed()
    {
        var tello7 = await CreateDroneAsync("TELLO-07");
        await CreateDroneAsync("TELLO-08");

        await _client.DeleteAsync($"/api/drones/{tello7}");

        Assert.Equal(["TELLO-08"], (await ListAsync("/api/drones")).Select(d => d.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task Show_the_drone_trash()
    {
        var droneId = await CreateDroneAsync("TELLO-07");
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReturnedLoanAsync(droneId, groupId);
        await ReturnedLoanAsync(droneId, groupId);
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 20, 9, 0, 0, TimeSpan.Zero));
        await _client.DeleteAsync($"/api/drones/{droneId}");

        var trashed = Assert.Single(await ListAsync("/api/drones/trash"));

        Assert.Equal("TELLO-07", trashed.GetProperty("name").GetString());
        Assert.Equal("2026-08-20", trashed.GetProperty("deletedAt").GetString());
        Assert.Equal(2, trashed.GetProperty("loanCount").GetInt32());
    }

    [Fact]
    public async Task Empty_drone_trash()
    {
        await CreateDroneAsync("TELLO-07");

        Assert.Empty(await ListAsync("/api/drones/trash"));
    }

    [Fact]
    public async Task Open_a_drone_in_the_trash()
    {
        var droneId = await CreateDroneAsync("TELLO-07");
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReturnedLoanAsync(droneId, groupId);
        await _client.DeleteAsync($"/api/drones/{droneId}");

        var drone = await _client.GetFromJsonAsync<JsonElement>($"/api/drones/{droneId}");

        Assert.Equal("2026-08-19", drone.GetProperty("deletedAt").GetString());
        Assert.Single(await ListAsync($"/api/loans?droneId={droneId}"));
    }

    [Fact]
    public async Task Restore_a_drone()
    {
        var droneId = await CreateDroneAsync("TELLO-07");
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReturnedLoanAsync(droneId, groupId);
        await _client.PostAsJsonAsync($"/api/drones/{droneId}/defect", new { description = "Motor" });
        await _client.DeleteAsync($"/api/drones/{droneId}");

        var response = await _client.PostAsync($"/api/drones/{droneId}/restore", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var drone = Assert.Single(await ListAsync("/api/drones"));
        Assert.Equal("Defective", drone.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, drone.GetProperty("deletedAt").ValueKind);
        Assert.Single(await ListAsync("/api/loans?status=Returned"));
        Assert.Empty(await ListAsync("/api/drones/trash"));
    }

    [Fact]
    public async Task Drone_is_not_in_the_trash()
    {
        var droneId = await CreateDroneAsync("TELLO-08");

        var restore = await _client.PostAsync($"/api/drones/{droneId}/restore", null);
        var permanent = await _client.DeleteAsync($"/api/drones/{droneId}/permanent?history=keep");

        await ApiResponseAssert.IsProblemAsync(restore, HttpStatusCode.NotFound);
        await ApiResponseAssert.IsProblemAsync(permanent, HttpStatusCode.Conflict);
        Assert.Single(await ListAsync("/api/drones"));
    }

    [Fact]
    public async Task Keep_the_drone_history()
    {
        var droneId = await CreateDroneAsync("TELLO-07");
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReturnedLoanAsync(droneId, groupId);
        await _client.DeleteAsync($"/api/drones/{droneId}");

        var response = await _client.DeleteAsync($"/api/drones/{droneId}/permanent?history=keep");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"/api/drones/{droneId}")).StatusCode);
        Assert.Empty(await ListAsync("/api/drones/trash"));

        // Scenario "Drone deleted, history kept" of the loan history.
        var loan = Assert.Single(await ListAsync("/api/loans?status=Returned"));
        Assert.Equal("TELLO-07", loan.GetProperty("droneName").GetString());
        Assert.Equal(JsonValueKind.Null, loan.GetProperty("droneId").ValueKind);
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
        Assert.Contains("TELLO-07", await _client.GetStringAsync("/api/loans/export"));

        // Returning the old loan again says it is returned, not that it is unknown.
        var loanId = loan.GetProperty("id").GetInt32();
        await ApiResponseAssert.IsProblemAsync(
            await _client.PostAsync($"/api/loans/{loanId}/return", null),
            HttpStatusCode.Conflict);

        // The name is free again.
        Assert.Equal(HttpStatusCode.Created, (await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07" })).StatusCode);
    }

    [Fact]
    public async Task Delete_the_drone_with_the_history()
    {
        var tello7 = await CreateDroneAsync("TELLO-07");
        var tello8 = await CreateDroneAsync("TELLO-08");
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReturnedLoanAsync(tello7, groupId);
        await ReturnedLoanAsync(tello8, groupId);
        await _client.DeleteAsync($"/api/drones/{tello7}");

        var response = await _client.DeleteAsync($"/api/drones/{tello7}/permanent?history=delete");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var loan = Assert.Single(await ListAsync("/api/loans?status=Returned"));
        Assert.Equal("TELLO-08", loan.GetProperty("droneName").GetString());
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal(1, await dbContext.Loans.CountAsync());
        Assert.Equal(2, await dbContext.Set<Domain.LoanItem>().CountAsync());
    }

    [Theory]
    [InlineData("")]
    [InlineData("?history=maybe")]
    public async Task No_choice_about_the_drone_history(string query)
    {
        var droneId = await CreateDroneAsync("TELLO-07");
        await _client.DeleteAsync($"/api/drones/{droneId}");

        var response = await _client.DeleteAsync($"/api/drones/{droneId}/permanent{query}");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Single(await ListAsync("/api/drones/trash"));
    }

    [Fact]
    public async Task Loaned_drone_in_the_trash_is_not_deleted_for_good()
    {
        var droneId = await CreateDroneAsync("TELLO-07");
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId = groupId });

        // The rare race: the drone reached the trash while it was loaned.
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
            (await dbContext.Drones.SingleAsync(d => d.Id == droneId)).DeletedAt = new DateOnly(2026, 8, 19);
            await dbContext.SaveChangesAsync();
        }

        var response = await _client.DeleteAsync($"/api/drones/{droneId}/permanent?history=delete");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Single(await ListAsync("/api/loans?status=Active"));
    }

    [Fact]
    public async Task Name_of_a_drone_in_the_trash()
    {
        var tello7 = await CreateDroneAsync("TELLO-07");
        var tello8 = await CreateDroneAsync("TELLO-08");
        await _client.DeleteAsync($"/api/drones/{tello7}");

        var create = await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07" });
        var rename = await _client.PutAsJsonAsync($"/api/drones/{tello8}", new { name = "TELLO-07", description = "" });

        Assert.Equal(HttpStatusCode.Conflict, create.StatusCode);
        Assert.Contains("trash", await DetailAsync(create));
        Assert.Equal(HttpStatusCode.Conflict, rename.StatusCode);
        Assert.Contains("trash", await DetailAsync(rename));
    }

    [Fact]
    public async Task Change_a_drone_in_the_trash()
    {
        var droneId = await CreateDroneAsync("TELLO-07");
        await _client.DeleteAsync($"/api/drones/{droneId}");

        var rename = await _client.PutAsJsonAsync($"/api/drones/{droneId}", new { name = "TELLO-77", description = "" });
        var defect = await _client.PostAsJsonAsync($"/api/drones/{droneId}/defect", new { description = "Motor" });
        var repair = await _client.PostAsync($"/api/drones/{droneId}/repair", null);

        foreach (var response in new[] { rename, defect, repair })
        {
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Contains("is in the trash", await DetailAsync(response));
        }
    }

    [Fact]
    public async Task Loan_a_drone_in_the_trash()
    {
        var droneId = await CreateDroneAsync("TELLO-07");
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await _client.DeleteAsync($"/api/drones/{droneId}");

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Empty(await ListAsync("/api/loans?status=Active"));
    }

    [Fact]
    public async Task Migration_keeps_existing_loans_of_drones()
    {
        using var connection = new SqliteConnection($"Data Source={Guid.NewGuid():N};Mode=Memory;Cache=Shared");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<DroneInventoryDbContext>().UseSqlite(connection).Options;
        await using var dbContext = new DroneInventoryDbContext(options);
        var migrator = dbContext.GetService<IMigrator>();

        await migrator.MigrateAsync("AddStudentGroupTrash");
        await dbContext.Database.ExecuteSqlRawAsync("""
            INSERT INTO StudentGroups (Id, Name) VALUES (3, 'Group 3');
            INSERT INTO Drones (Id, Name, Description) VALUES (7, 'TELLO-07', 'x');
            INSERT INTO Loans (Id, DroneId, StudentGroupId, LoanDate, Status) VALUES (1, 7, 3, '2026-08-19', 'Active');
            INSERT INTO LoanItems (Id, LoanId, Type, Quantity) VALUES (1, 1, 'Battery', 4);
            """);

        await migrator.MigrateAsync();

        var loan = await dbContext.Loans.Include(l => l.Items).Include(l => l.Drone).SingleAsync();
        Assert.Equal(7, loan.DroneId);
        Assert.Equal("TELLO-07", loan.Drone?.Name);
        Assert.Null(loan.FormerDroneName);
        Assert.Single(loan.Items);
        await Assert.ThrowsAsync<SqliteException>(() => dbContext.Database.ExecuteSqlRawAsync(
            "INSERT INTO Loans (DroneId, StudentGroupId, LoanDate, Status) VALUES (7, 3, '2026-08-20', 'Active')"));
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private Task<int> CreateDroneAsync(string name) => CreateAsync("/api/drones", new { name, description = "x" });

    private async Task ReturnedLoanAsync(int droneId, int groupId)
    {
        var response = await _client.PostAsJsonAsync("/api/loans", new
        {
            droneId,
            studentGroupId = groupId,
            items = new[] { new { type = "Battery", quantity = 2 }, new { type = "Propeller", quantity = 4 } },
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var loanId = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/loans/{loanId}/return", null)).StatusCode);
    }

    private async Task<int> CreateAsync(string path, object body)
    {
        var response = await _client.PostAsJsonAsync(path, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private async Task<List<JsonElement>> ListAsync(string path)
    {
        var response = await _client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }

    private static async Task<string> DetailAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("detail").GetString() ?? string.Empty;
}
