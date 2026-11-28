using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>Scenarios of the requirement "Damage history" (REQ-042).</summary>
public sealed class DefectHistoryApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public DefectHistoryApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Repaired_defect_stays_in_the_history()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "" });
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReportAsync(droneId, groupId, "Motor 3");
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 21, 9, 0, 0, TimeSpan.Zero));

        await _client.PostAsync($"/api/drones/{droneId}/repair", null);

        var report = Assert.Single(await ListAsync($"/api/defects?droneId={droneId}"));
        Assert.Equal("Motor 3", report.GetProperty("description").GetString());
        Assert.Equal("Group 3", report.GetProperty("studentGroupName").GetString());
        Assert.Equal("TELLO-07", report.GetProperty("droneName").GetString());
        Assert.Equal("2026-08-19", report.GetProperty("reportedOn").GetString());
        Assert.Equal("2026-08-21", report.GetProperty("repairedOn").GetString());
    }

    [Fact]
    public async Task Defect_from_a_return_is_in_the_history()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "" });
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var loanId = await CreateAsync("/api/loans", new { droneId, studentGroupId = groupId });

        await _client.PostAsJsonAsync($"/api/loans/{loanId}/return", new { defect = "Propeller gebrochen" });

        var report = Assert.Single(await ListAsync($"/api/defects?studentGroupId={groupId}"));
        Assert.Equal("Propeller gebrochen", report.GetProperty("description").GetString());
        Assert.Equal(JsonValueKind.Null, report.GetProperty("repairedOn").ValueKind);
    }

    [Fact]
    public async Task Several_defects_newest_first()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "" });
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var group4 = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        await ReportAsync(droneId, group3, "Motor 3");
        await _client.PostAsync($"/api/drones/{droneId}/repair", null);
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 22, 9, 0, 0, TimeSpan.Zero));
        await ReportAsync(droneId, group4, "Kamera");

        var reports = await ListAsync($"/api/defects?droneId={droneId}");

        Assert.Equal(["Kamera", "Motor 3"], reports.Select(report => report.GetProperty("description").GetString()));
        Assert.Single(await ListAsync($"/api/defects?studentGroupId={group4}"));
    }

    [Fact]
    public async Task Group_deleted_for_good_keeps_its_name_in_the_history()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "" });
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReportAsync(droneId, groupId, "Motor 3");
        await _client.DeleteAsync($"/api/student-groups/{groupId}");

        var delete = await _client.DeleteAsync($"/api/student-groups/{groupId}/permanent?history=keep");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        var report = Assert.Single(await ListAsync($"/api/defects?droneId={droneId}"));
        Assert.Equal("Group 3", report.GetProperty("studentGroupName").GetString());
        Assert.Equal(JsonValueKind.Null, report.GetProperty("studentGroupId").ValueKind);
    }

    [Fact]
    public async Task Drone_deleted_for_good_takes_its_history_with_it()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "" });
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReportAsync(droneId, groupId, "Motor 3");
        await _client.PostAsync($"/api/drones/{droneId}/repair", null);
        await _client.DeleteAsync($"/api/drones/{droneId}");

        await _client.DeleteAsync($"/api/drones/{droneId}/permanent?history=keep");

        Assert.Empty(await ListAsync($"/api/defects?studentGroupId={groupId}"));
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task ReportAsync(int droneId, int studentGroupId, string description)
    {
        var response = await _client.PostAsJsonAsync($"/api/drones/{droneId}/defect", new { description, studentGroupId });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
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
}
