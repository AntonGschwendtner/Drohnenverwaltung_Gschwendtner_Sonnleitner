using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>Scenarios of the requirement "Lending statistics" (REQ-030).</summary>
public sealed class StatisticsApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public StatisticsApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Loan_outside_the_period()
    {
        var (tello7, group3) = await SetupAsync();
        await LoanOnAsync(tello7, group3, new DateOnly(2026, 6, 20), returnOn: new DateOnly(2026, 6, 22));
        await LoanOnAsync(tello7, group3, new DateOnly(2026, 9, 15), returnOn: new DateOnly(2026, 9, 16));
        SetToday(2026, 10, 10);

        var statistics = await GetAsync("/api/statistics");

        Assert.Equal("2026-09-01", statistics.GetProperty("from").GetString());
        Assert.Equal("2026-10-10", statistics.GetProperty("to").GetString());
        Assert.Equal(1, statistics.GetProperty("loanCount").GetInt32());
    }

    [Fact]
    public async Task Default_period_before_September_starts_last_year()
    {
        var statistics = await GetAsync("/api/statistics");

        Assert.Equal("2025-09-01", statistics.GetProperty("from").GetString());
        Assert.Equal("2026-08-19", statistics.GetProperty("to").GetString());
    }

    [Fact]
    public async Task Invalid_period()
    {
        var response = await _client.GetAsync("/api/statistics?from=2026-10-10&to=2026-10-01");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Totals()
    {
        var (tello7, group3) = await SetupAsync();
        var tello8 = await CreateAsync("/api/drones", new { name = "TELLO-08" });
        var tello9 = await CreateAsync("/api/drones", new { name = "TELLO-09" });
        await LoanOnAsync(tello7, group3, new DateOnly(2026, 8, 1), returnOn: new DateOnly(2026, 8, 3));
        await LoanOnAsync(tello8, group3, new DateOnly(2026, 8, 5), returnOn: new DateOnly(2026, 8, 10));
        await LoanOnAsync(tello9, group3, new DateOnly(2026, 8, 18), returnOn: null);
        SetToday(2026, 8, 19);

        var statistics = await GetAsync("/api/statistics?from=2026-08-01&to=2026-08-19");

        Assert.Equal(3, statistics.GetProperty("loanCount").GetInt32());
        Assert.Equal(1, statistics.GetProperty("activeCount").GetInt32());
        Assert.Equal(3.5, statistics.GetProperty("averageDays").GetDouble());
    }

    [Fact]
    public async Task No_returned_loan()
    {
        var (tello7, group3) = await SetupAsync();
        await LoanOnAsync(tello7, group3, new DateOnly(2026, 8, 18), returnOn: null);
        SetToday(2026, 8, 19);

        var statistics = await GetAsync("/api/statistics");

        Assert.Equal(JsonValueKind.Null, statistics.GetProperty("averageDays").ValueKind);
    }

    [Fact]
    public async Task Most_used_drone_first_and_unused_drone()
    {
        var (tello7, group3) = await SetupAsync();
        var tello8 = await CreateAsync("/api/drones", new { name = "TELLO-08" });
        await CreateAsync("/api/drones", new { name = "TELLO-09" });
        await LoanOnAsync(tello8, group3, new DateOnly(2026, 8, 1), returnOn: new DateOnly(2026, 8, 2));
        for (var day = 3; day <= 7; day += 2)
        {
            await LoanOnAsync(tello7, group3, new DateOnly(2026, 8, day), returnOn: new DateOnly(2026, 8, day + 1));
        }

        SetToday(2026, 8, 19);

        var drones = (await GetAsync("/api/statistics")).GetProperty("drones").EnumerateArray().ToList();

        Assert.Equal(["TELLO-07", "TELLO-08", "TELLO-09"], drones.Select(d => d.GetProperty("name").GetString()));
        Assert.Equal(3, drones[0].GetProperty("loanCount").GetInt32());
        Assert.Equal(0, drones[2].GetProperty("loanCount").GetInt32());
        Assert.Equal(0, drones[2].GetProperty("loanDays").GetInt32());
    }

    [Fact]
    public async Task Active_loan_counts_until_today()
    {
        var (tello7, group3) = await SetupAsync();
        await LoanOnAsync(tello7, group3, new DateOnly(2026, 8, 19), returnOn: null);
        SetToday(2026, 8, 25);

        var statistics = await GetAsync("/api/statistics");

        Assert.Equal(6, statistics.GetProperty("drones")[0].GetProperty("loanDays").GetInt32());
        Assert.Equal(6, statistics.GetProperty("studentGroups")[0].GetProperty("loanDays").GetInt32());
    }

    [Fact]
    public async Task Drones_in_the_trash_are_not_listed()
    {
        var (tello7, _) = await SetupAsync();
        await CreateAsync("/api/drones", new { name = "TELLO-08" });
        await _client.DeleteAsync($"/api/drones/{tello7}");

        var drones = (await GetAsync("/api/statistics")).GetProperty("drones").EnumerateArray();

        Assert.Equal(["TELLO-08"], drones.Select(d => d.GetProperty("name").GetString()));
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private void SetToday(int year, int month, int day) =>
        _factory.Time.SetNow(new DateTimeOffset(year, month, day, 12, 0, 0, TimeSpan.Zero));

    /// <summary>Loans on the given day by moving the clock, and returns on the other day if given.</summary>
    private async Task LoanOnAsync(int droneId, int groupId, DateOnly loanOn, DateOnly? returnOn)
    {
        SetToday(loanOn.Year, loanOn.Month, loanOn.Day);
        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        if (returnOn is { } day)
        {
            SetToday(day.Year, day.Month, day.Day);
            var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
            Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/loans/{id}/return", null)).StatusCode);
        }
    }

    private async Task<(int Drone, int Group)> SetupAsync() => (
        await CreateAsync("/api/drones", new { name = "TELLO-07" }),
        await CreateAsync("/api/student-groups", new { name = "Group 3" }));

    private async Task<JsonElement> GetAsync(string path)
    {
        var response = await _client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task<int> CreateAsync(string path, object body)
    {
        var response = await _client.PostAsJsonAsync(path, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }
}
