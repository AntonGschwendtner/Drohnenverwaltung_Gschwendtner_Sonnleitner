using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace DroneInventory.Api.Tests;

/// <summary>Scenarios of the requirement "Health check" (REQ-041).</summary>
public sealed class HealthApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();

    [Fact]
    public async Task Healthy()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("healthy", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Database_not_reachable()
    {
        // The app starts with a database file; afterwards its folder disappears, as with a lost volume.
        var folder = Directory.CreateTempSubdirectory("drone-health-").FullName;
        var connectionString = $"Data Source={Path.Combine(folder, "health.db")};Pooling=False";
        using var app = _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<DroneInventoryDbContext>>();
            services.RemoveAll<Microsoft.EntityFrameworkCore.Infrastructure.IDbContextOptionsConfiguration<DroneInventoryDbContext>>();
            services.AddDbContext<DroneInventoryDbContext>(options => options.UseSqlite(connectionString));
        }));
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/health")).StatusCode);

        Directory.Delete(folder, recursive: true);
        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    public void Dispose() => _factory.Dispose();
}
