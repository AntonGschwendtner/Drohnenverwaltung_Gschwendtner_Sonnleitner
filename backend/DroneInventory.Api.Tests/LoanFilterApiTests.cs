using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Loans of one drone or one student group" (REQ-018, REQ-019).
/// </summary>
public sealed class LoanFilterApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public LoanFilterApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Loans_of_one_drone()
    {
        var tello7 = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var tello8 = await CreateAsync("/api/drones", new { name = "TELLO-08", description = "x" });
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReturnAsync(await CreateAsync("/api/loans", new { droneId = tello7, studentGroupId = group3 }));
        await ReturnAsync(await CreateAsync("/api/loans", new { droneId = tello8, studentGroupId = group3 }));

        var loans = await ListAsync($"/api/loans?droneId={tello7}");

        var loan = Assert.Single(loans);
        Assert.Equal("TELLO-07", loan.GetProperty("droneName").GetString());
    }

    [Fact]
    public async Task Loans_of_one_student_group()
    {
        var tello7 = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var tello8 = await CreateAsync("/api/drones", new { name = "TELLO-08", description = "x" });
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var group4 = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        await CreateAsync("/api/loans", new { droneId = tello7, studentGroupId = group3 });
        await CreateAsync("/api/loans", new { droneId = tello8, studentGroupId = group4 });

        var loans = await ListAsync($"/api/loans?studentGroupId={group3}");

        var loan = Assert.Single(loans);
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
    }

    [Fact]
    public async Task Active_loan_first_then_the_newest_return()
    {
        var tello7 = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var group4 = await CreateAsync("/api/student-groups", new { name = "Group 4" });

        var first = await CreateAsync("/api/loans", new { droneId = tello7, studentGroupId = group3 });
        _factory.Time.SetNow(DroneInventoryApiFactory.FixedNow.AddDays(2));
        await ReturnAsync(first);
        var second = await CreateAsync("/api/loans", new { droneId = tello7, studentGroupId = group4 });
        _factory.Time.SetNow(DroneInventoryApiFactory.FixedNow.AddDays(5));
        await ReturnAsync(second);
        var active = await CreateAsync("/api/loans", new { droneId = tello7, studentGroupId = group3 });

        var loans = await ListAsync($"/api/loans?droneId={tello7}");

        Assert.Equal([active, second, first], loans.Select(loan => loan.GetProperty("id").GetInt32()));
        Assert.Equal("Active", loans[0].GetProperty("status").GetString());
    }

    [Fact]
    public async Task Filters_and_status_combine()
    {
        var tello7 = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReturnAsync(await CreateAsync("/api/loans", new { droneId = tello7, studentGroupId = group3 }));
        await CreateAsync("/api/loans", new { droneId = tello7, studentGroupId = group3 });

        var returned = await ListAsync($"/api/loans?droneId={tello7}&studentGroupId={group3}&status=Returned");

        Assert.Equal("Returned", Assert.Single(returned).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Unknown_drone_has_no_loans()
    {
        Assert.Empty(await ListAsync("/api/loans?droneId=999"));
    }

    [Fact]
    public async Task Without_any_filter_the_status_is_still_required()
    {
        var response = await _client.GetAsync("/api/loans");

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

    private async Task ReturnAsync(int loanId)
    {
        var response = await _client.PostAsync($"/api/loans/{loanId}/return", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private async Task<List<JsonElement>> ListAsync(string path)
    {
        var response = await _client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
