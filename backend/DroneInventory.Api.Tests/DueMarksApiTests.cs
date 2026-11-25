using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>Scenarios of the requirement "Due today and days overdue" (REQ-035).</summary>
public sealed class DueMarksApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public DueMarksApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Due_today()
    {
        await LoanDueOnAsync("2026-08-26");
        SetToday(2026, 8, 26);

        var loan = await SingleActiveLoanAsync();

        Assert.True(loan.GetProperty("isDueToday").GetBoolean());
        Assert.False(loan.GetProperty("isOverdue").GetBoolean());
        Assert.Equal(JsonValueKind.Null, loan.GetProperty("daysOverdue").ValueKind);
    }

    [Fact]
    public async Task Overdue_for_days()
    {
        await LoanDueOnAsync("2026-08-26");
        SetToday(2026, 8, 29);

        var loan = await SingleActiveLoanAsync();

        Assert.True(loan.GetProperty("isOverdue").GetBoolean());
        Assert.False(loan.GetProperty("isDueToday").GetBoolean());
        Assert.Equal(3, loan.GetProperty("daysOverdue").GetInt32());
    }

    [Fact]
    public async Task Overdue_for_one_day()
    {
        await LoanDueOnAsync("2026-08-26");
        SetToday(2026, 8, 27);

        var loan = await SingleActiveLoanAsync();

        Assert.Equal(1, loan.GetProperty("daysOverdue").GetInt32());
    }

    [Fact]
    public async Task Not_due_yet()
    {
        await LoanDueOnAsync("2026-08-26");
        SetToday(2026, 8, 25);

        var loan = await SingleActiveLoanAsync();

        Assert.False(loan.GetProperty("isDueToday").GetBoolean());
        Assert.False(loan.GetProperty("isOverdue").GetBoolean());
        Assert.Equal(JsonValueKind.Null, loan.GetProperty("daysOverdue").ValueKind);
    }

    [Fact]
    public async Task Returned_or_without_a_planned_date()
    {
        var withoutDate = await LoanAsync("TELLO-08", dueDate: null);
        var returnedId = await LoanAsync("TELLO-07", dueDate: "2026-08-19");
        await _client.PostAsync($"/api/loans/{returnedId}/return", null);
        SetToday(2026, 8, 25);

        var active = Assert.Single(await ListAsync("/api/loans?status=Active"));
        var returned = Assert.Single(await ListAsync("/api/loans?status=Returned"));

        Assert.Equal(withoutDate, active.GetProperty("id").GetInt32());
        foreach (var loan in new[] { active, returned })
        {
            Assert.False(loan.GetProperty("isDueToday").GetBoolean());
            Assert.False(loan.GetProperty("isOverdue").GetBoolean());
            Assert.Equal(JsonValueKind.Null, loan.GetProperty("daysOverdue").ValueKind);
        }
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private void SetToday(int year, int month, int day) =>
        _factory.Time.SetNow(new DateTimeOffset(year, month, day, 12, 0, 0, TimeSpan.Zero));

    private Task<int> LoanDueOnAsync(string dueDate) => LoanAsync("TELLO-07", dueDate);

    private async Task<int> LoanAsync(string droneName, string? dueDate)
    {
        var drone = await _client.PostAsJsonAsync("/api/drones", new { name = droneName, description = "x" });
        var droneId = (await drone.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var group = await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group of " + droneName });
        var studentGroupId = (await group.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId, dueDate });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private async Task<JsonElement> SingleActiveLoanAsync() => Assert.Single(await ListAsync("/api/loans?status=Active"));

    private async Task<List<JsonElement>> ListAsync(string path)
    {
        var response = await _client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
