using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "List drones" (REQ-002).
/// </summary>
public sealed class ListDronesApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public ListDronesApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Drone_without_an_active_loan()
    {
        await CreateDroneAsync("TELLO-07", "SSID: TELLO-9FA21B");

        var drones = await ListDronesAsync();

        var drone = Assert.Single(drones);
        Assert.Equal("TELLO-07", drone.GetProperty("name").GetString());
        Assert.Equal("Available", drone.GetProperty("status").GetString());
        Assert.Equal("SSID: TELLO-9FA21B", drone.GetProperty("description").GetString());
    }

    [Fact]
    public async Task Drone_with_an_active_loan()
    {
        var droneId = await CreateDroneAsync("TELLO-07", "x");
        await SaveLoanAsync(droneId, LoanStatus.Active);

        var drone = Assert.Single(await ListDronesAsync());

        Assert.Equal("Loaned", drone.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Drone_with_only_a_returned_loan_is_available()
    {
        var droneId = await CreateDroneAsync("TELLO-07", "x");
        await SaveLoanAsync(droneId, LoanStatus.Returned);

        var drone = Assert.Single(await ListDronesAsync());

        Assert.Equal("Available", drone.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Status_belongs_to_each_drone_and_the_list_is_sorted_by_name()
    {
        var loanedDroneId = await CreateDroneAsync("TELLO-08", "x");
        await CreateDroneAsync("TELLO-07", "x");
        await SaveLoanAsync(loanedDroneId, LoanStatus.Active);

        var drones = await ListDronesAsync();

        Assert.Equal(["TELLO-07", "TELLO-08"], drones.Select(drone => drone.GetProperty("name").GetString()));
        Assert.Equal(["Available", "Loaned"], drones.Select(drone => drone.GetProperty("status").GetString()));
    }

    [Fact]
    public async Task Empty_list_when_no_drone_exists()
    {
        Assert.Empty(await ListDronesAsync());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<int> CreateDroneAsync(string name, string description)
    {
        var response = await _client.PostAsJsonAsync("/api/drones", new { name, description });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var drone = await response.Content.ReadFromJsonAsync<JsonElement>();
        return drone.GetProperty("id").GetInt32();
    }

    private async Task<List<JsonElement>> ListDronesAsync()
    {
        var response = await _client.GetAsync("/api/drones");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }

    private async Task SaveLoanAsync(int droneId, LoanStatus status)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var studentGroup = new StudentGroup { Name = $"Group {Guid.NewGuid()}" };
        dbContext.Add(new Loan
        {
            DroneId = droneId,
            StudentGroup = studentGroup,
            LoanDate = new DateOnly(2026, 8, 19),
            ReturnDate = status == LoanStatus.Returned ? new DateOnly(2026, 8, 20) : null,
            Status = status,
        });
        await dbContext.SaveChangesAsync();
    }
}
