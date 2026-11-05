using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "No double loan" (REQ-005).
/// </summary>
public sealed class NoDoubleLoanApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public NoDoubleLoanApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Drone_is_already_loaned()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var firstGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var secondGroupId = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = firstGroupId });

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = secondGroupId });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var loan = await dbContext.Loans.SingleAsync();
        Assert.Equal(firstGroupId, loan.StudentGroupId);
        Assert.Equal(droneId, loan.DroneId);
        Assert.Equal(LoanStatus.Active, loan.Status);
        Assert.Equal(new DateOnly(2026, 8, 19), loan.LoanDate);
        Assert.Null(loan.ReturnDate);
    }

    [Theory]
    [InlineData(2)]
    [InlineData(8)]
    public async Task Two_loans_at_the_same_time(int requestCount)
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupIds = new List<int>();
        for (var number = 0; number < requestCount; number++)
        {
            studentGroupIds.Add(await CreateAsync("/api/student-groups", new { name = $"Group {number}" }));
        }

        var requests = studentGroupIds
            .Select(studentGroupId => _factory.CreateClient().PostAsJsonAsync("/api/loans", new { droneId, studentGroupId }));
        var responses = await Task.WhenAll(requests);

        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Created);
        foreach (var rejected in responses.Where(response => response.StatusCode != HttpStatusCode.Created))
        {
            await ApiResponseAssert.IsProblemAsync(rejected, HttpStatusCode.Conflict);
        }

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal(1, await dbContext.Loans.CountAsync(loan => loan.Status == LoanStatus.Active));
    }

    [Fact]
    public async Task Other_drones_stay_available_for_loan()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var otherDroneId = await CreateAsync("/api/drones", new { name = "TELLO-08", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId });

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId = otherDroneId, studentGroupId });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
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
}
