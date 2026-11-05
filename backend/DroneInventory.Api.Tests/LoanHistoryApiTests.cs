using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Loan history" (REQ-010).
/// </summary>
public sealed class LoanHistoryApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public LoanHistoryApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Returned_loan_stays_in_the_history()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var loanId = await CreateLoanAsync(droneId, studentGroupId);

        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 21, 12, 0, 0, TimeSpan.Zero));
        await _client.PostAsync($"/api/loans/{loanId}/return", null);

        var loan = Assert.Single(await ListHistoryAsync());
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
        Assert.Equal("TELLO-07", loan.GetProperty("droneName").GetString());
        Assert.Equal(4, loan.GetProperty("batteries").GetInt32());
        Assert.Equal(8, loan.GetProperty("propellers").GetInt32());
        Assert.Equal("2026-08-19", loan.GetProperty("loanDate").GetString());
        Assert.Equal("2026-08-21", loan.GetProperty("returnDate").GetString());
        Assert.Equal("Returned", loan.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Active_loan_is_not_in_the_history()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateLoanAsync(droneId, studentGroupId);

        Assert.Empty(await ListHistoryAsync());
    }

    [Fact]
    public async Task Same_drone_is_loaned_again()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var otherGroupId = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        var loanId = await CreateLoanAsync(droneId, studentGroupId);
        await _client.PostAsync($"/api/loans/{loanId}/return", null);

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = otherGroupId });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var loan = Assert.Single(await ListHistoryAsync());
        Assert.Equal(loanId, loan.GetProperty("id").GetInt32());
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
        Assert.Equal(4, loan.GetProperty("batteries").GetInt32());
    }

    [Fact]
    public async Task Loans_cannot_be_deleted()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var loanId = await CreateLoanAsync(droneId, studentGroupId);
        await _client.PostAsync($"/api/loans/{loanId}/return", null);

        var response = await _client.DeleteAsync($"/api/loans/{loanId}");

        Assert.False(response.IsSuccessStatusCode, $"Delete returned {response.StatusCode}");
        Assert.Contains(response.StatusCode, new[] { HttpStatusCode.NotFound, HttpStatusCode.MethodNotAllowed });
        Assert.Single(await ListHistoryAsync());

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal(1, await dbContext.Loans.CountAsync());
    }

    [Fact]
    public async Task History_shows_the_newest_return_first()
    {
        var firstDroneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var secondDroneId = await CreateAsync("/api/drones", new { name = "TELLO-08", description = "x" });
        var thirdDroneId = await CreateAsync("/api/drones", new { name = "TELLO-09", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var firstLoanId = await CreateLoanAsync(firstDroneId, studentGroupId);
        var secondLoanId = await CreateLoanAsync(secondDroneId, studentGroupId);
        var thirdLoanId = await CreateLoanAsync(thirdDroneId, studentGroupId);

        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 25, 12, 0, 0, TimeSpan.Zero));
        await _client.PostAsync($"/api/loans/{secondLoanId}/return", null);
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 30, 12, 0, 0, TimeSpan.Zero));
        await _client.PostAsync($"/api/loans/{thirdLoanId}/return", null);
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 27, 12, 0, 0, TimeSpan.Zero));
        await _client.PostAsync($"/api/loans/{firstLoanId}/return", null);

        var loans = await ListHistoryAsync();

        // The order fits neither ascending nor descending ids, so only the return date can produce it.
        Assert.Equal(["TELLO-09", "TELLO-07", "TELLO-08"], loans.Select(loan => loan.GetProperty("droneName").GetString()));
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

    private Task<int> CreateLoanAsync(int droneId, int studentGroupId) =>
        CreateAsync("/api/loans", new
        {
            droneId,
            studentGroupId,
            items = new[]
            {
                new { type = "Battery", quantity = 4 },
                new { type = "Propeller", quantity = 8 },
            },
        });

    private async Task<List<JsonElement>> ListHistoryAsync()
    {
        var response = await _client.GetAsync("/api/loans?status=Returned");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
