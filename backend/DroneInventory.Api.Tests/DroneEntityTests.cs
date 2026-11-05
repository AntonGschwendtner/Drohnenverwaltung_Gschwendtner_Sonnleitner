using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

public sealed class DroneEntityTests : IDisposable
{
    private const int SqliteConstraintError = 19;

    private readonly DroneInventoryApiFactory _factory = new();

    [Fact]
    public async Task Drone_is_stored_with_name_and_description()
    {
        await SaveDroneAsync("TELLO-07", "SSID: TELLO-9FA21B, rechter Propellerschutz beschädigt");

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var drone = await dbContext.Drones.SingleAsync();

        Assert.Equal("TELLO-07", drone.Name);
        Assert.Equal("SSID: TELLO-9FA21B, rechter Propellerschutz beschädigt", drone.Description);
    }

    [Fact]
    public async Task Database_refuses_a_duplicate_name()
    {
        await SaveDroneAsync("TELLO-07", "first");

        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => SaveDroneAsync("TELLO-07", "second"));

        var sqliteException = Assert.IsType<SqliteException>(exception.InnerException);
        Assert.Equal(SqliteConstraintError, sqliteException.SqliteErrorCode);
        Assert.Contains("Drones.Name", sqliteException.Message);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var drone = await dbContext.Drones.SingleAsync();
        Assert.Equal("first", drone.Description);
    }

    [Fact]
    public async Task Database_accepts_different_names()
    {
        await SaveDroneAsync("TELLO-07", "first");
        await SaveDroneAsync("TELLO-08", "second");

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();

        Assert.Equal(2, await dbContext.Drones.CountAsync());
    }

    public void Dispose() => _factory.Dispose();

    private async Task SaveDroneAsync(string name, string description)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        dbContext.Drones.Add(new Drone { Name = name, Description = description });
        await dbContext.SaveChangesAsync();
    }
}
