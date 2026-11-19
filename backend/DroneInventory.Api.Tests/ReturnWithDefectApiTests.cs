using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the modified requirement "Return loan" (REQ-008, REQ-024).
/// </summary>
public sealed class ReturnWithDefectApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public ReturnWithDefectApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Return_a_loan()
    {
        var (loanId, _) = await LoanAsync();

        var response = await _client.PostAsJsonAsync($"/api/loans/{loanId}/return", new { items = (object?)null });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Available", Assert.Single(await ListDronesAsync()).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Return_with_a_defect()
    {
        var (loanId, droneId) = await LoanAsync();

        var response = await _client.PostAsJsonAsync($"/api/loans/{loanId}/return", new { defect = " Propeller gebrochen " });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Returned", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString());
        var drone = Assert.Single(await ListDronesAsync());
        Assert.Equal("Defective", drone.GetProperty("status").GetString());
        Assert.Equal("Propeller gebrochen", drone.GetProperty("defectNote").GetString());
        Assert.Equal(droneId, drone.GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task Blank_defect_is_no_defect()
    {
        var (loanId, _) = await LoanAsync();

        await _client.PostAsJsonAsync($"/api/loans/{loanId}/return", new { defect = "   " });

        Assert.Equal("Available", Assert.Single(await ListDronesAsync()).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Defect_too_long_keeps_the_loan_active()
    {
        var (loanId, _) = await LoanAsync();

        var response = await _client.PostAsJsonAsync($"/api/loans/{loanId}/return", new { defect = new string('x', 501) });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("Loaned", Assert.Single(await ListDronesAsync()).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Second_return_with_a_defect_changes_nothing()
    {
        var (loanId, _) = await LoanAsync();
        await _client.PostAsync($"/api/loans/{loanId}/return", null);

        var response = await _client.PostAsJsonAsync($"/api/loans/{loanId}/return", new { defect = "Propeller gebrochen" });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal("Available", Assert.Single(await ListDronesAsync()).GetProperty("status").GetString());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<(int LoanId, int DroneId)> LoanAsync()
    {
        var drone = await (await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07", description = "x" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var group = await (await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var droneId = drone.GetProperty("id").GetInt32();
        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = group.GetProperty("id").GetInt32() });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return ((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32(), droneId);
    }

    private async Task<List<JsonElement>> ListDronesAsync()
    {
        var response = await _client.GetAsync("/api/drones");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
