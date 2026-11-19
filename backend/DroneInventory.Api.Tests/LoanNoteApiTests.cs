using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Loan note" (REQ-021).
/// </summary>
public sealed class LoanNoteApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public LoanNoteApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Loan_with_a_note()
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId, note = "  Projekt Vermessung " });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Projekt Vermessung", created.GetProperty("note").GetString());
        var active = Assert.Single(await ListAsync("Active"));
        Assert.Equal("Projekt Vermessung", active.GetProperty("note").GetString());
    }

    [Fact]
    public async Task Note_stays_in_the_history()
    {
        var (droneId, studentGroupId) = await SeedAsync();
        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId, note = "Projekt Vermessung" });
        var loanId = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();

        await _client.PostAsync($"/api/loans/{loanId}/return", null);

        var returned = Assert.Single(await ListAsync("Returned"));
        Assert.Equal("Projekt Vermessung", returned.GetProperty("note").GetString());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public async Task Loan_without_a_note(string? note)
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId, note });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var active = Assert.Single(await ListAsync("Active"));
        Assert.Equal(JsonValueKind.Null, active.GetProperty("note").ValueKind);
    }

    [Fact]
    public async Task Note_with_500_characters_is_accepted()
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId, note = new string('x', 500) });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Note_too_long()
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId, note = new string('x', 501) });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Empty(await ListAsync("Active"));
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<(int DroneId, int StudentGroupId)> SeedAsync()
    {
        var drone = await (await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07", description = "x" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var group = await (await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        return (drone.GetProperty("id").GetInt32(), group.GetProperty("id").GetInt32());
    }

    private async Task<List<JsonElement>> ListAsync(string status)
    {
        var response = await _client.GetAsync($"/api/loans?status={status}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
