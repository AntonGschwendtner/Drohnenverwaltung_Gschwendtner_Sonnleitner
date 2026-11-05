using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirements "Return loan" (REQ-008) and "Store return date" (REQ-009).
/// </summary>
public sealed class ReturnLoanApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public ReturnLoanApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Return_a_loan()
    {
        var loanId = await CreateLoanAsync();

        var response = await _client.PostAsync($"/api/loans/{loanId}/return", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Returned", loan.GetProperty("status").GetString());

        var drones = await _client.GetFromJsonAsync<List<JsonElement>>("/api/drones");
        Assert.Equal("Available", Assert.Single(drones!).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Return_date_is_stored()
    {
        var loanId = await CreateLoanAsync();

        var response = await _client.PostAsync($"/api/loans/{loanId}/return", null);

        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("2026-08-19", loan.GetProperty("returnDate").GetString());

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var stored = await dbContext.Loans.SingleAsync();
        Assert.Equal(new DateOnly(2026, 8, 19), stored.ReturnDate);
        Assert.Equal(LoanStatus.Returned, stored.Status);
    }

    [Fact]
    public async Task Loan_is_already_returned()
    {
        var earlierReturnDate = new DateOnly(2026, 8, 1);
        var loanId = await CreateLoanAsync();
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
            var loan = await dbContext.Loans.SingleAsync();
            loan.Status = LoanStatus.Returned;
            loan.ReturnDate = earlierReturnDate;
            await dbContext.SaveChangesAsync();
        }

        var response = await _client.PostAsync($"/api/loans/{loanId}/return", null);

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal(earlierReturnDate, (await verifyContext.Loans.SingleAsync()).ReturnDate);
    }

    [Fact]
    public async Task Unknown_loan()
    {
        var response = await _client.PostAsync("/api/loans/999/return", null);

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Returned_loan_keeps_its_accessories()
    {
        var loanId = await CreateLoanAsync();

        var response = await _client.PostAsync($"/api/loans/{loanId}/return", null);

        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(4, loan.GetProperty("batteries").GetInt32());
        Assert.Equal(8, loan.GetProperty("propellers").GetInt32());
        Assert.Equal("TELLO-07", loan.GetProperty("droneName").GetString());
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
    }

    [Fact]
    public async Task Two_returns_at_the_same_time_keep_one_return()
    {
        var loanId = await CreateLoanAsync();

        var responses = await Task.WhenAll(Enumerable.Range(0, 4)
            .Select(_ => _factory.CreateClient().PostAsync($"/api/loans/{loanId}/return", null)));

        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.OK);
        Assert.All(
            responses.Where(response => response.StatusCode != HttpStatusCode.OK),
            response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<int> CreateLoanAsync()
    {
        var droneResponse = await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var groupResponse = await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" });
        var drone = await droneResponse.Content.ReadFromJsonAsync<JsonElement>();
        var group = await groupResponse.Content.ReadFromJsonAsync<JsonElement>();

        var response = await _client.PostAsJsonAsync("/api/loans", new
        {
            droneId = drone.GetProperty("id").GetInt32(),
            studentGroupId = group.GetProperty("id").GetInt32(),
            items = new[]
            {
                new { type = "Battery", quantity = 4 },
                new { type = "Propeller", quantity = 8 },
            },
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        return loan.GetProperty("id").GetInt32();
    }
}
