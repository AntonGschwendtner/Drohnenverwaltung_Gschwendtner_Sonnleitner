using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DroneInventory.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Create drone" (REQ-001).
/// </summary>
public sealed class CreateDroneApiTests : IDisposable
{
    private const string Description = "SSID: TELLO-9FA21B, rechter Propellerschutz beschädigt";

    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public CreateDroneApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Create_a_drone()
    {
        var response = await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07", description = Description });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var drone = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("TELLO-07", drone.GetProperty("name").GetString());
        Assert.Equal(Description, drone.GetProperty("description").GetString());
        Assert.Equal("Available", drone.GetProperty("status").GetString());
        Assert.Equal($"/api/drones/{drone.GetProperty("id").GetInt32()}", response.Headers.Location?.ToString());

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var stored = await dbContext.Drones.SingleAsync();
        Assert.Equal("TELLO-07", stored.Name);
        Assert.Equal(Description, stored.Description);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("""{"name":null,"description":"x"}""")]
    [InlineData("""{"name":"","description":"x"}""")]
    [InlineData("""{"name":"   ","description":"x"}""")]
    public async Task Name_is_missing(string body)
    {
        var response = await _client.PostAsync("/api/drones", new StringContent(body, Encoding.UTF8, "application/json"));

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        await AssertDroneCountAsync(0);
    }

    [Fact]
    public async Task Name_already_exists()
    {
        await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07", description = "first" });

        var response = await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07", description = "second" });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        await AssertDroneCountAsync(1);
    }

    [Fact]
    public async Task Name_is_compared_without_surrounding_spaces()
    {
        await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07", description = "first" });

        var response = await _client.PostAsJsonAsync("/api/drones", new { name = "  TELLO-07 ", description = "second" });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Description_is_optional()
    {
        var response = await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var drone = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(string.Empty, drone.GetProperty("description").GetString());
    }

    [Fact]
    public async Task Same_name_at_the_same_time_stores_one_drone()
    {
        var requests = Enumerable.Range(0, 8)
            .Select(_ => _factory.CreateClient().PostAsJsonAsync("/api/drones", new { name = "TELLO-07", description = "x" }));

        var responses = await Task.WhenAll(requests);

        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Created);
        Assert.All(
            responses.Where(response => response.StatusCode != HttpStatusCode.Created),
            response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        await AssertDroneCountAsync(1);
    }

    [Fact]
    public async Task Invalid_json_is_rejected()
    {
        var response = await _client.PostAsync("/api/drones", new StringContent("{not json", Encoding.UTF8, "application/json"));

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        await AssertDroneCountAsync(0);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task AssertDroneCountAsync(int expected)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal(expected, await dbContext.Drones.CountAsync());
    }
}
