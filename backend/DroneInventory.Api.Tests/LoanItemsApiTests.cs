using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Loan accessories" (REQ-006).
/// </summary>
public sealed class LoanItemsApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public LoanItemsApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Loan_with_accessories()
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await _client.PostAsJsonAsync("/api/loans", new
        {
            droneId,
            studentGroupId,
            items = new[]
            {
                new { type = "Battery", quantity = 4 },
                new { type = "Propeller", quantity = 8 },
            },
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(4, loan.GetProperty("batteries").GetInt32());
        Assert.Equal(8, loan.GetProperty("propellers").GetInt32());

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var stored = await dbContext.Loans.Include(l => l.Items).SingleAsync();
        Assert.Equal(4, stored.Items.Single(item => item.Type == LoanItemType.Battery).Quantity);
        Assert.Equal(8, stored.Items.Single(item => item.Type == LoanItemType.Propeller).Quantity);
    }

    [Fact]
    public async Task Quantity_of_zero()
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await _client.PostAsJsonAsync("/api/loans", new
        {
            droneId,
            studentGroupId,
            items = new[]
            {
                new { type = "Battery", quantity = 0 },
                new { type = "Propeller", quantity = 0 },
            },
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, loan.GetProperty("batteries").GetInt32());
        Assert.Equal(0, loan.GetProperty("propellers").GetInt32());
    }

    [Fact]
    public async Task Loan_without_items_has_no_accessories()
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, loan.GetProperty("batteries").GetInt32());
        Assert.Equal(0, loan.GetProperty("propellers").GetInt32());
    }

    [Fact]
    public async Task Negative_quantity()
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await PostItemsAsync(droneId, studentGroupId, """[{"type":"Battery","quantity":-1}]""");

        await AssertRejectedAndDroneAvailableAsync(response);
    }

    [Fact]
    public async Task Quantity_is_not_a_whole_number()
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await PostItemsAsync(droneId, studentGroupId, """[{"type":"Propeller","quantity":1.5}]""");

        await AssertRejectedAndDroneAvailableAsync(response);
    }

    [Theory]
    [InlineData("""[{"type":"Camera","quantity":1}]""")]
    [InlineData("""[{"type":"battery","quantity":1}]""")]
    [InlineData("""[{"type":"0","quantity":1}]""")]
    [InlineData("""[{"type":null,"quantity":1}]""")]
    [InlineData("""[{"quantity":1}]""")]
    public async Task Unknown_accessory_type(string items)
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await PostItemsAsync(droneId, studentGroupId, items);

        await AssertRejectedAndDroneAvailableAsync(response);
    }

    [Theory]
    [InlineData("[null]")]
    [InlineData("""[{"type":"Battery","quantity":1},null]""")]
    public async Task Empty_entry_in_the_items_is_rejected(string items)
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await PostItemsAsync(droneId, studentGroupId, items);

        await AssertRejectedAndDroneAvailableAsync(response);
    }

    [Fact]
    public async Task Missing_quantity_is_rejected()
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await PostItemsAsync(droneId, studentGroupId, """[{"type":"Battery"}]""");

        await AssertRejectedAndDroneAvailableAsync(response);
    }

    [Fact]
    public async Task Accessory_type_appears_twice()
    {
        var (droneId, studentGroupId) = await SeedAsync();

        var response = await PostItemsAsync(
            droneId,
            studentGroupId,
            """[{"type":"Battery","quantity":1},{"type":"Battery","quantity":2}]""");

        await AssertRejectedAndDroneAvailableAsync(response);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<(int DroneId, int StudentGroupId)> SeedAsync()
    {
        var droneResponse = await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var groupResponse = await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" });
        var drone = await droneResponse.Content.ReadFromJsonAsync<JsonElement>();
        var group = await groupResponse.Content.ReadFromJsonAsync<JsonElement>();
        return (drone.GetProperty("id").GetInt32(), group.GetProperty("id").GetInt32());
    }

    private Task<HttpResponseMessage> PostItemsAsync(int droneId, int studentGroupId, string itemsJson)
    {
        var body = $$"""{"droneId":{{droneId}},"studentGroupId":{{studentGroupId}},"items":{{itemsJson}}}""";
        return _client.PostAsync("/api/loans", new StringContent(body, Encoding.UTF8, "application/json"));
    }

    private async Task AssertRejectedAndDroneAvailableAsync(HttpResponseMessage response)
    {
        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);

        var drones = await _client.GetFromJsonAsync<List<JsonElement>>("/api/drones");
        Assert.Equal("Available", Assert.Single(drones!).GetProperty("status").GetString());

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal(0, await dbContext.Loans.CountAsync());
    }
}
