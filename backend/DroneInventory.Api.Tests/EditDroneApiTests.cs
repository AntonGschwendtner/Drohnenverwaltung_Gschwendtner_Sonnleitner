using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Edit drone" (REQ-015).
/// </summary>
public sealed class EditDroneApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public EditDroneApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Correct_a_name()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELO-07", description = "SSID: TELLO-9FA21B" });

        var response = await _client.PutAsJsonAsync($"/api/drones/{droneId}", new { name = "TELLO-07", description = "SSID: TELLO-9FA21B" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var drone = Assert.Single(await ListDronesAsync());
        Assert.Equal("TELLO-07", drone.GetProperty("name").GetString());
        Assert.Equal(droneId, drone.GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task Edit_a_loaned_drone()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "old" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId });

        var response = await _client.PutAsJsonAsync($"/api/drones/{droneId}", new { name = "TELLO-07", description = "Propellerschutz ersetzt" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var edited = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Loaned", edited.GetProperty("status").GetString());
        var drone = Assert.Single(await ListDronesAsync());
        Assert.Equal("Propellerschutz ersetzt", drone.GetProperty("description").GetString());
        Assert.Equal("Loaned", drone.GetProperty("status").GetString());
        Assert.Single(await ListLoansAsync("Active"));
    }

    [Fact]
    public async Task Name_already_used()
    {
        await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var secondId = await CreateAsync("/api/drones", new { name = "TELLO-08", description = "x" });

        var response = await _client.PutAsJsonAsync($"/api/drones/{secondId}", new { name = "TELLO-07", description = "x" });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal(["TELLO-07", "TELLO-08"], (await ListDronesAsync()).Select(drone => drone.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task A_drone_may_keep_its_own_name()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });

        var response = await _client.PutAsJsonAsync($"/api/drones/{droneId}", new { name = " TELLO-07 ", description = "y" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("TELLO-07", (await ListDronesAsync()).Single().GetProperty("name").GetString());
    }

    [Fact]
    public async Task Name_is_missing()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });

        var response = await _client.PutAsJsonAsync($"/api/drones/{droneId}", new { name = "  ", description = "x" });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("TELLO-07", (await ListDronesAsync()).Single().GetProperty("name").GetString());
    }

    [Fact]
    public async Task Unknown_drone()
    {
        var response = await _client.PutAsJsonAsync("/api/drones/999", new { name = "TELLO-07", description = "x" });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
        Assert.Empty(await ListDronesAsync());
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

    private async Task<List<JsonElement>> ListDronesAsync()
    {
        var response = await _client.GetAsync("/api/drones");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }

    private async Task<List<JsonElement>> ListLoansAsync(string status)
    {
        var response = await _client.GetAsync($"/api/loans?status={status}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
