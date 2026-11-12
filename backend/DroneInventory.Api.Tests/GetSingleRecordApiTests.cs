using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Single records for the detail pages: scenarios of "Drone details" (REQ-018) and
/// "Student group details" (REQ-019) that the backend answers on its own.
/// </summary>
public sealed class GetSingleRecordApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public GetSingleRecordApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Drone_that_was_never_loaned()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-09", description = "Neu" });

        var drone = await GetAsync($"/api/drones/{droneId}");

        Assert.Equal(droneId, drone.GetProperty("id").GetInt32());
        Assert.Equal("TELLO-09", drone.GetProperty("name").GetString());
        Assert.Equal("Neu", drone.GetProperty("description").GetString());
        Assert.Equal("Available", drone.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Loaned_drone_shows_its_status()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId });

        var drone = await GetAsync($"/api/drones/{droneId}");

        Assert.Equal("Loaned", drone.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Unknown_drone()
    {
        var response = await _client.GetAsync("/api/drones/999");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Student_group()
    {
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });

        var studentGroup = await GetAsync($"/api/student-groups/{studentGroupId}");

        Assert.Equal(studentGroupId, studentGroup.GetProperty("id").GetInt32());
        Assert.Equal("Group 3", studentGroup.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Unknown_student_group()
    {
        var response = await _client.GetAsync("/api/student-groups/999");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
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

    private async Task<JsonElement> GetAsync(string path)
    {
        var response = await _client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
