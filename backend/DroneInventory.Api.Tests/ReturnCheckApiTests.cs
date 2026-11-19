using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Check accessories on return" (REQ-023).
/// </summary>
public sealed class ReturnCheckApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public ReturnCheckApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Everything_returned()
    {
        var loanId = await LoanAsync(4, 8);

        var response = await _client.PostAsync($"/api/loans/{loanId}/return", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var loan = Assert.Single(await ListAsync("Returned"));
        Assert.Equal(0, loan.GetProperty("missingBatteries").GetInt32());
        Assert.Equal(0, loan.GetProperty("missingPropellers").GetInt32());
    }

    [Fact]
    public async Task Battery_missing()
    {
        var loanId = await LoanAsync(4, 8);

        var response = await ReturnAsync(loanId, new[] { new { type = "Battery", returnedQuantity = 3 }, new { type = "Propeller", returnedQuantity = 8 } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var returned = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, returned.GetProperty("missingBatteries").GetInt32());
        var loan = Assert.Single(await ListAsync("Returned"));
        Assert.Equal(1, loan.GetProperty("missingBatteries").GetInt32());
        Assert.Equal(0, loan.GetProperty("missingPropellers").GetInt32());
        Assert.Equal(4, loan.GetProperty("batteries").GetInt32());
    }

    [Fact]
    public async Task A_type_without_quantity_counts_as_fully_returned()
    {
        var loanId = await LoanAsync(4, 8);

        await ReturnAsync(loanId, new[] { new { type = "Propeller", returnedQuantity = 6 } });

        var loan = Assert.Single(await ListAsync("Returned"));
        Assert.Equal(0, loan.GetProperty("missingBatteries").GetInt32());
        Assert.Equal(2, loan.GetProperty("missingPropellers").GetInt32());
    }

    [Fact]
    public async Task More_returned_than_loaned()
    {
        var loanId = await LoanAsync(4, 8);

        var response = await ReturnAsync(loanId, new[] { new { type = "Battery", returnedQuantity = 5 } });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Single(await ListAsync("Active"));
    }

    [Fact]
    public async Task Negative_quantity()
    {
        var loanId = await LoanAsync(4, 8);

        var response = await ReturnAsync(loanId, new[] { new { type = "Battery", returnedQuantity = -1 } });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Single(await ListAsync("Active"));
    }

    [Fact]
    public async Task Type_that_was_not_loaned_can_only_come_back_as_zero()
    {
        var loanId = await LoanAsync(4, 0);

        var response = await ReturnAsync(loanId, new[] { new { type = "Propeller", returnedQuantity = 1 } });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Active_loans_have_nothing_missing()
    {
        await LoanAsync(4, 8);

        var loan = Assert.Single(await ListAsync("Active"));

        Assert.Equal(0, loan.GetProperty("missingBatteries").GetInt32());
    }

    [Fact]
    public async Task Unknown_loan_with_quantities_is_not_found()
    {
        var response = await ReturnAsync(999, new[] { new { type = "Battery", returnedQuantity = 5 } });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Empty_body_counts_everything_as_returned()
    {
        var loanId = await LoanAsync(4, 8);

        var response = await _client.PostAsJsonAsync($"/api/loans/{loanId}/return", new { });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0, Assert.Single(await ListAsync("Returned")).GetProperty("missingBatteries").GetInt32());
    }

    [Fact]
    public async Task Type_appears_twice()
    {
        var loanId = await LoanAsync(4, 8);

        var response = await ReturnAsync(loanId, new[] { new { type = "Battery", returnedQuantity = 3 }, new { type = "Battery", returnedQuantity = 4 } });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Single(await ListAsync("Active"));
    }

    [Fact]
    public async Task Returned_quantity_is_missing()
    {
        var loanId = await LoanAsync(4, 8);

        var response = await ReturnAsync(loanId, new[] { new { type = "Battery", returnedQuantity = (int?)null } });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Empty_item_is_rejected()
    {
        var loanId = await LoanAsync(4, 8);

        var response = await _client.PostAsJsonAsync($"/api/loans/{loanId}/return", new { items = new object?[] { null } });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private Task<HttpResponseMessage> ReturnAsync(int loanId, object items) =>
        _client.PostAsJsonAsync($"/api/loans/{loanId}/return", new { items });

    private async Task<int> LoanAsync(int batteries, int propellers)
    {
        var drone = await (await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07", description = "x" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var group = await (await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var response = await _client.PostAsJsonAsync("/api/loans", new
        {
            droneId = drone.GetProperty("id").GetInt32(),
            studentGroupId = group.GetProperty("id").GetInt32(),
            items = new[] { new { type = "Battery", quantity = batteries }, new { type = "Propeller", quantity = propellers } },
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private async Task<List<JsonElement>> ListAsync(string status)
    {
        var response = await _client.GetAsync($"/api/loans?status={status}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
