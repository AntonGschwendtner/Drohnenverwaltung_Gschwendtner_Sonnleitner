using System.Net;
using DroneInventory.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

public sealed class SmokeTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();

    [Fact]
    public async Task Api_starts_and_answers_requests()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Migrations_are_applied_to_an_in_memory_database()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();

        Assert.Contains("Mode=Memory", dbContext.Database.GetConnectionString());
        Assert.Contains(await dbContext.Database.GetAppliedMigrationsAsync(), id => id.EndsWith("_InitialCreate"));
        Assert.Empty(await dbContext.Database.GetPendingMigrationsAsync());
    }

    [Fact]
    public async Task Each_factory_has_its_own_database()
    {
        using var otherFactory = new DroneInventoryApiFactory();

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        await dbContext.Database.ExecuteSqlRawAsync("CREATE TABLE Probe (Id INTEGER)");

        using var otherScope = otherFactory.Services.CreateScope();
        var otherDbContext = otherScope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();

        Assert.Equal(1, await CountProbeTablesAsync(dbContext));
        Assert.Equal(0, await CountProbeTablesAsync(otherDbContext));
    }

    [Fact]
    public void Services_get_the_fixed_date()
    {
        var timeProvider = _factory.Services.GetRequiredService<TimeProvider>();

        Assert.Equal(new DateTimeOffset(2026, 8, 19, 12, 0, 0, TimeSpan.Zero), timeProvider.GetUtcNow());
    }

    public void Dispose() => _factory.Dispose();

    private static Task<int> CountProbeTablesAsync(DroneInventoryDbContext dbContext) =>
        dbContext.Database
            .SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM sqlite_master WHERE name = 'Probe'")
            .SingleAsync();
}
