using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirements "Planned return date" (REQ-022) and the modified "Loan duration" (REQ-012).
/// The fixed date of the tests is 19.08.2026.
/// </summary>
public sealed class PlannedReturnDateApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public PlannedReturnDateApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Loan_with_a_planned_return_date()
    {
        var created = await LoanAsync("2026-08-26");

        Assert.Equal("2026-08-26", created.GetProperty("dueDate").GetString());
        var loan = Assert.Single(await ListAsync("Active"));
        Assert.Equal("2026-08-26", loan.GetProperty("dueDate").GetString());
        Assert.False(loan.GetProperty("isOverdue").GetBoolean());
    }

    [Fact]
    public async Task Planned_return_date_today_is_allowed()
    {
        var created = await LoanAsync("2026-08-19");

        Assert.Equal("2026-08-19", created.GetProperty("dueDate").GetString());
    }

    [Fact]
    public async Task Planned_return_date_in_the_past()
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId, dueDate = "2026-08-18" });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Empty(await ListAsync("Active"));
    }

    [Fact]
    public async Task Return_on_the_planned_day()
    {
        await LoanAsync("2026-08-26");
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 26, 12, 0, 0, TimeSpan.Zero));

        var loan = Assert.Single(await ListAsync("Active"));

        Assert.False(loan.GetProperty("isOverdue").GetBoolean());
    }

    [Fact]
    public async Task Overdue_loan()
    {
        await LoanAsync("2026-08-26");
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 27, 12, 0, 0, TimeSpan.Zero));

        var loan = Assert.Single(await ListAsync("Active"));

        Assert.True(loan.GetProperty("isOverdue").GetBoolean());
        Assert.False(loan.GetProperty("isLongRunning").GetBoolean());
    }

    [Fact]
    public async Task Returned_late()
    {
        var created = await LoanAsync("2026-08-26");
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 28, 12, 0, 0, TimeSpan.Zero));
        await _client.PostAsync($"/api/loans/{created.GetProperty("id").GetInt32()}/return", null);

        var loan = Assert.Single(await ListAsync("Returned"));

        Assert.Equal("2026-08-26", loan.GetProperty("dueDate").GetString());
        Assert.False(loan.GetProperty("isOverdue").GetBoolean());
    }

    [Fact]
    public async Task Long_loan_with_a_planned_return_date()
    {
        await LoanAsync("2026-09-30");
        _factory.Time.SetNow(DroneInventoryApiFactory.FixedNow.AddDays(9));

        var loan = Assert.Single(await ListAsync("Active"));

        Assert.Equal(9, loan.GetProperty("daysActive").GetInt32());
        Assert.False(loan.GetProperty("isLongRunning").GetBoolean());
        Assert.False(loan.GetProperty("isOverdue").GetBoolean());
    }

    [Fact]
    public async Task Long_loan_without_a_planned_return_date_stays_long_running()
    {
        await LoanAsync(null);
        _factory.Time.SetNow(DroneInventoryApiFactory.FixedNow.AddDays(9));

        var loan = Assert.Single(await ListAsync("Active"));

        Assert.True(loan.GetProperty("isLongRunning").GetBoolean());
        Assert.False(loan.GetProperty("isOverdue").GetBoolean());
        Assert.Equal(JsonValueKind.Null, loan.GetProperty("dueDate").ValueKind);
    }

    [Fact]
    public async Task Message_is_german_when_german_is_requested()
    {
        var (droneId, studentGroupId) = await SeedAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/loans")
        {
            Content = JsonContent.Create(new { droneId, studentGroupId, dueDate = "2026-08-18" }),
        };
        request.Headers.AcceptLanguage.ParseAdd("de");

        var response = await _client.SendAsync(request);

        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("Rückgabedatum", problem.GetProperty("detail").GetString());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<JsonElement> LoanAsync(string? dueDate)
    {
        var (droneId, studentGroupId) = await SeedAsync();
        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId, dueDate });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
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
