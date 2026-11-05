using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "List active loans" (REQ-007).
/// </summary>
public sealed class ListActiveLoansApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public ListActiveLoansApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task List_active_loans()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await _client.PostAsJsonAsync("/api/loans", new
        {
            droneId,
            studentGroupId,
            items = new[]
            {
                new { type = "Battery", quantity = 4 },
                new { type = "Propeller", quantity = 8 },
            },
        });

        var loan = Assert.Single(await ListActiveLoansAsync());

        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
        Assert.Equal("TELLO-07", loan.GetProperty("droneName").GetString());
        Assert.Equal(4, loan.GetProperty("batteries").GetInt32());
        Assert.Equal(8, loan.GetProperty("propellers").GetInt32());
        Assert.Equal("2026-08-19", loan.GetProperty("loanDate").GetString());
        Assert.Equal("Active", loan.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Returned_loan_is_not_active()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
            dbContext.Loans.Add(new Loan
            {
                DroneId = droneId,
                StudentGroupId = studentGroupId,
                LoanDate = new DateOnly(2026, 8, 19),
                ReturnDate = new DateOnly(2026, 8, 20),
                Status = LoanStatus.Returned,
            });
            await dbContext.SaveChangesAsync();
        }

        Assert.Empty(await ListActiveLoansAsync());
    }

    [Fact]
    public async Task Loan_without_items_shows_zero_quantities()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId });

        var loan = Assert.Single(await ListActiveLoansAsync());

        Assert.Equal(0, loan.GetProperty("batteries").GetInt32());
        Assert.Equal(0, loan.GetProperty("propellers").GetInt32());
    }

    [Fact]
    public async Task Each_loan_shows_its_own_quantities()
    {
        var firstDroneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var secondDroneId = await CreateAsync("/api/drones", new { name = "TELLO-08", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await _client.PostAsJsonAsync("/api/loans", new { droneId = firstDroneId, studentGroupId, items = new[] { new { type = "Battery", quantity = 1 } } });
        await _client.PostAsJsonAsync("/api/loans", new { droneId = secondDroneId, studentGroupId, items = new[] { new { type = "Battery", quantity = 2 } } });

        var loans = await ListActiveLoansAsync();

        Assert.Equal(1, loans.Single(loan => loan.GetProperty("droneName").GetString() == "TELLO-07").GetProperty("batteries").GetInt32());
        Assert.Equal(2, loans.Single(loan => loan.GetProperty("droneName").GetString() == "TELLO-08").GetProperty("batteries").GetInt32());
    }

    [Theory]
    [InlineData("/api/loans")]
    [InlineData("/api/loans?status=Unknown")]
    public async Task Missing_or_unknown_status_is_rejected(string url)
    {
        var response = await _client.GetAsync(url);

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
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

    private async Task<List<JsonElement>> ListActiveLoansAsync()
    {
        var response = await _client.GetAsync("/api/loans?status=Active");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
