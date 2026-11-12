using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Loan duration" (REQ-012).
/// </summary>
public sealed class LoanDurationApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public LoanDurationApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task New_loan()
    {
        var created = await LoanTelloToGroup3Async();

        Assert.Equal(0, created.GetProperty("daysActive").GetInt32());
        Assert.False(created.GetProperty("isLongRunning").GetBoolean());

        var loan = Assert.Single(await ListAsync("Active"));
        Assert.Equal(0, loan.GetProperty("daysActive").GetInt32());
        Assert.False(loan.GetProperty("isLongRunning").GetBoolean());
    }

    [Fact]
    public async Task Loan_running_exactly_7_days()
    {
        await LoanTelloToGroup3Async();
        _factory.Time.SetNow(DroneInventoryApiFactory.FixedNow.AddDays(7));

        var loan = Assert.Single(await ListAsync("Active"));

        Assert.Equal(7, loan.GetProperty("daysActive").GetInt32());
        Assert.False(loan.GetProperty("isLongRunning").GetBoolean());
    }

    [Fact]
    public async Task Long_running_loan()
    {
        await LoanTelloToGroup3Async();
        _factory.Time.SetNow(DroneInventoryApiFactory.FixedNow.AddDays(9));

        var loan = Assert.Single(await ListAsync("Active"));

        Assert.Equal(9, loan.GetProperty("daysActive").GetInt32());
        Assert.True(loan.GetProperty("isLongRunning").GetBoolean());
    }

    [Fact]
    public async Task Loan_turns_long_running_after_the_eighth_day()
    {
        await LoanTelloToGroup3Async();
        _factory.Time.SetNow(DroneInventoryApiFactory.FixedNow.AddDays(8));

        var loan = Assert.Single(await ListAsync("Active"));

        Assert.Equal(8, loan.GetProperty("daysActive").GetInt32());
        Assert.True(loan.GetProperty("isLongRunning").GetBoolean());
    }

    [Fact]
    public async Task Returned_loan_is_not_marked()
    {
        var created = await LoanTelloToGroup3Async();
        _factory.Time.SetNow(DroneInventoryApiFactory.FixedNow.AddDays(10));

        var response = await _client.PostAsync($"/api/loans/{created.GetProperty("id").GetInt32()}/return", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var returned = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, returned.GetProperty("daysActive").ValueKind);
        Assert.False(returned.GetProperty("isLongRunning").GetBoolean());

        var loan = Assert.Single(await ListAsync("Returned"));
        Assert.Equal(JsonValueKind.Null, loan.GetProperty("daysActive").ValueKind);
        Assert.False(loan.GetProperty("isLongRunning").GetBoolean());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<JsonElement> LoanTelloToGroup3Async()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task<int> CreateAsync(string path, object body)
    {
        var response = await _client.PostAsJsonAsync(path, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        return created.GetProperty("id").GetInt32();
    }

    private async Task<List<JsonElement>> ListAsync(string status)
    {
        var response = await _client.GetAsync($"/api/loans?status={status}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
