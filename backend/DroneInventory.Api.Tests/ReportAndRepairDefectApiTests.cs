using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Report and repair a defect" (REQ-024).
/// </summary>
public sealed class ReportAndRepairDefectApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public ReportAndRepairDefectApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Report_a_defect()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });

        var response = await _client.PostAsJsonAsync($"/api/drones/{droneId}/defect", new { description = " Motor 3 dreht nicht ", studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" }) });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var drone = Assert.Single(await ListDronesAsync());
        Assert.Equal("Defective", drone.GetProperty("status").GetString());
        Assert.Equal("Motor 3 dreht nicht", drone.GetProperty("defectNote").GetString());
        Assert.Equal("Group 3", drone.GetProperty("defectGroupName").GetString());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public async Task Description_is_missing(string? description)
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });

        var response = await _client.PostAsJsonAsync($"/api/drones/{droneId}/defect", new { description });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("Available", Assert.Single(await ListDronesAsync()).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Student_group_is_missing()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });

        var withoutGroup = await _client.PostAsJsonAsync($"/api/drones/{droneId}/defect", new { description = "Motor 3" });
        var unknownGroup = await _client.PostAsJsonAsync($"/api/drones/{droneId}/defect", new { description = "Motor 3", studentGroupId = 999 });

        await ApiResponseAssert.IsProblemAsync(withoutGroup, HttpStatusCode.BadRequest);
        await ApiResponseAssert.IsProblemAsync(unknownGroup, HttpStatusCode.BadRequest);
        Assert.Equal("Available", Assert.Single(await ListDronesAsync()).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Description_too_long()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });

        var response = await _client.PostAsJsonAsync($"/api/drones/{droneId}/defect", new { description = new string('x', 501) });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Drone_is_loaned()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId });

        var response = await _client.PostAsJsonAsync($"/api/drones/{droneId}/defect", new { description = "Motor 3", studentGroupId });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal("Loaned", Assert.Single(await ListDronesAsync()).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Repair_a_drone()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        await _client.PostAsJsonAsync($"/api/drones/{droneId}/defect", new { description = "Motor 3", studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" }) });

        var response = await _client.PostAsync($"/api/drones/{droneId}/repair", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var drone = Assert.Single(await ListDronesAsync());
        Assert.Equal("Available", drone.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, drone.GetProperty("defectNote").ValueKind);
        Assert.Equal(JsonValueKind.Null, drone.GetProperty("defectGroupName").ValueKind);
    }

    [Fact]
    public async Task Repairing_a_drone_without_defect_is_rejected()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });

        var response = await _client.PostAsync($"/api/drones/{droneId}/repair", null);

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
    }

    [Theory]
    [InlineData("defect")]
    [InlineData("repair")]
    public async Task Unknown_drone(string action)
    {
        var response = await _client.PostAsJsonAsync($"/api/drones/999/{action}", new { description = "x" });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Message_is_german_when_german_is_requested()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        using var request = new HttpRequestMessage(HttpMethod.Post, $"/api/drones/{droneId}/defect")
        {
            Content = JsonContent.Create(new { description = "" }),
        };
        request.Headers.AcceptLanguage.ParseAdd("de");

        var problem = await (await _client.SendAsync(request)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal("Ein Schaden braucht eine Beschreibung.", problem.GetProperty("detail").GetString());
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
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private async Task<List<JsonElement>> ListDronesAsync()
    {
        var response = await _client.GetAsync("/api/drones");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
