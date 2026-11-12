using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Delete drone" (REQ-016).
/// </summary>
public sealed class DeleteDroneApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public DeleteDroneApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Delete_a_drone_without_loans()
    {
        await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-09", description = "x" });

        var response = await _client.DeleteAsync($"/api/drones/{droneId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(["TELLO-07"], (await ListAsync("/api/drones")).Select(drone => drone.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task Drone_has_a_returned_loan()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var loanId = await CreateAsync("/api/loans", new { droneId, studentGroupId });
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/loans/{loanId}/return", null)).StatusCode);

        var response = await _client.DeleteAsync($"/api/drones/{droneId}");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Single(await ListAsync("/api/drones"));
        var loan = Assert.Single(await ListAsync("/api/loans?status=Returned"));
        Assert.Equal("TELLO-07", loan.GetProperty("droneName").GetString());
    }

    [Fact]
    public async Task Drone_is_loaned()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId });

        var response = await _client.DeleteAsync($"/api/drones/{droneId}");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Single(await ListAsync("/api/drones"));
        Assert.Single(await ListAsync("/api/loans?status=Active"));
    }

    [Fact]
    public async Task Unknown_drone()
    {
        var response = await _client.DeleteAsync("/api/drones/999");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Database_refuses_to_delete_a_referenced_drone()
    {
        // The foreign key is the second line of defense when a loan arrives after the check.
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId });

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        dbContext.Drones.Remove(await dbContext.Drones.SingleAsync(drone => drone.Id == droneId));

        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => dbContext.SaveChangesAsync());
        Assert.True(Common.DbUpdateExceptionExtensions.IsForeignKeyViolation(exception));
        Assert.False(Common.DbUpdateExceptionExtensions.IsUniqueConstraintViolation(exception));
    }

    [Fact]
    public async Task Message_is_german_when_german_is_requested()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId });

        using var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/drones/{droneId}");
        request.Headers.AcceptLanguage.ParseAdd("de");
        var response = await _client.SendAsync(request);

        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("kann nicht gelöscht werden", problem.GetProperty("detail").GetString());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<int> CreateAsync(string path, object body)
    {
        var response = await _client.PostAsJsonAsync(path, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        return created.GetProperty("id").GetInt32();
    }

    private async Task<List<JsonElement>> ListAsync(string path)
    {
        var response = await _client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
