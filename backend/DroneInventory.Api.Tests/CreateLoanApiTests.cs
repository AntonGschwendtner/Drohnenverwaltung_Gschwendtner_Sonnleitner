using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirements "Loan drone" (REQ-004) and "Store return date" (REQ-009).
/// </summary>
public sealed class CreateLoanApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public CreateLoanApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Loan_an_available_drone()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Active", loan.GetProperty("status").GetString());
        Assert.Equal("2026-08-19", loan.GetProperty("loanDate").GetString());
        Assert.Equal("TELLO-07", loan.GetProperty("droneName").GetString());
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
        Assert.Equal($"/api/loans/{loan.GetProperty("id").GetInt32()}", response.Headers.Location?.ToString());

        var drones = await _client.GetFromJsonAsync<List<JsonElement>>("/api/drones");
        Assert.Equal("Loaned", Assert.Single(drones!).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Unknown_drone()
    {
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId = 999, studentGroupId });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        await AssertLoanCountAsync(0);
    }

    [Fact]
    public async Task Unknown_student_group()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = 999 });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        await AssertLoanCountAsync(0);
        var drones = await _client.GetFromJsonAsync<List<JsonElement>>("/api/drones");
        Assert.Equal("Available", Assert.Single(drones!).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Missing_drone_or_student_group_is_rejected()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });

        var withoutDrone = await _client.PostAsJsonAsync("/api/loans", new { studentGroupId });
        var withoutStudentGroup = await _client.PostAsJsonAsync("/api/loans", new { droneId });

        await ApiResponseAssert.IsProblemAsync(withoutDrone, HttpStatusCode.BadRequest);
        await ApiResponseAssert.IsProblemAsync(withoutStudentGroup, HttpStatusCode.BadRequest);
        await AssertLoanCountAsync(0);
    }

    [Fact]
    public async Task Active_loan_has_no_return_date()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, loan.GetProperty("returnDate").ValueKind);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var stored = await dbContext.Loans.SingleAsync();
        Assert.Null(stored.ReturnDate);
        Assert.Equal(LoanStatus.Active, stored.Status);
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

    private async Task AssertLoanCountAsync(int expected)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal(expected, await dbContext.Loans.CountAsync());
    }
}
