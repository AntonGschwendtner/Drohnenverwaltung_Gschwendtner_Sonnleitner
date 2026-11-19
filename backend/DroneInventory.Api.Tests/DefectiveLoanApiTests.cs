using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenario of the requirement "Defective drone cannot be loaned" (REQ-024).
/// </summary>
public sealed class DefectiveLoanApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public DefectiveLoanApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Loan_a_defective_drone()
    {
        var (droneId, studentGroupId) = await SeedDefectiveDroneAsync();

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        var active = await (await _client.GetAsync("/api/loans?status=Active")).Content.ReadFromJsonAsync<List<JsonElement>>();
        Assert.Empty(active!);
    }

    [Fact]
    public async Task Repaired_drone_can_be_loaned_again()
    {
        var (droneId, studentGroupId) = await SeedDefectiveDroneAsync();
        await _client.PostAsync($"/api/drones/{droneId}/repair", null);

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Message_is_german_when_german_is_requested()
    {
        var (droneId, studentGroupId) = await SeedDefectiveDroneAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/loans")
        {
            Content = JsonContent.Create(new { droneId, studentGroupId }),
        };
        request.Headers.AcceptLanguage.ParseAdd("de");

        var problem = await (await _client.SendAsync(request)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Contains("ist defekt", problem.GetProperty("detail").GetString());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<(int DroneId, int StudentGroupId)> SeedDefectiveDroneAsync()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var defect = await _client.PostAsJsonAsync($"/api/drones/{droneId}/defect", new { description = "Motor 3" });
        Assert.Equal(HttpStatusCode.OK, defect.StatusCode);
        return (droneId, studentGroupId);
    }

    private async Task<int> CreateAsync(string path, object body)
    {
        var response = await _client.PostAsJsonAsync(path, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }
}
