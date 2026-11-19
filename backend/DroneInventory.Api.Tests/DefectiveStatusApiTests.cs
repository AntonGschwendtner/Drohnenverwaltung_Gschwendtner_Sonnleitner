using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the modified requirement "List drones" (REQ-002, REQ-024).
/// </summary>
public sealed class DefectiveStatusApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public DefectiveStatusApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Drone_without_an_active_loan()
    {
        await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });

        var drone = Assert.Single(await ListDronesAsync());

        Assert.Equal("Available", drone.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, drone.GetProperty("defectNote").ValueKind);
    }

    [Fact]
    public async Task Drone_with_an_active_loan()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId });

        Assert.Equal("Loaned", Assert.Single(await ListDronesAsync()).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Drone_with_a_reported_defect()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        await ReportDefectInDatabaseAsync(droneId, "Motor 3 dreht nicht");

        var drone = Assert.Single(await ListDronesAsync());

        Assert.Equal("Defective", drone.GetProperty("status").GetString());
        Assert.Equal("Motor 3 dreht nicht", drone.GetProperty("defectNote").GetString());

        var single = await (await _client.GetAsync($"/api/drones/{droneId}")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Defective", single.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Editing_keeps_a_defective_drone_defective()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        await ReportDefectInDatabaseAsync(droneId, "Motor 3 dreht nicht");

        var response = await _client.PutAsJsonAsync($"/api/drones/{droneId}", new { name = "TELLO-07", description = "y" });

        var edited = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Defective", edited.GetProperty("status").GetString());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    // The endpoint to report a defect follows in task 2.2; here the database holds the defect directly.
    private async Task ReportDefectInDatabaseAsync(int droneId, string defect)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var drone = await dbContext.Drones.SingleAsync(d => d.Id == droneId);
        drone.DefectNote = defect;
        await dbContext.SaveChangesAsync();
    }

    private async Task<int> CreateAsync(string path, object body)
    {
        var response = await _client.PostAsJsonAsync(path, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private async Task<List<JsonElement>> ListDronesAsync()
    {
        var response = await _client.GetAsync("/api/drones");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
