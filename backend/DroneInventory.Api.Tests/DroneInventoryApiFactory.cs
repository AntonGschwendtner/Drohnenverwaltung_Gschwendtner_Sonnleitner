using DroneInventory.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Starts the API with its own in-memory SQLite database and a fixed date.
/// Create one instance per test. Each DbContext opens its own connection, as in
/// production, so concurrent requests behave like concurrent requests.
/// </summary>
public sealed class DroneInventoryApiFactory : WebApplicationFactory<Program>
{
    public static readonly DateTimeOffset FixedNow = new(2026, 8, 19, 12, 0, 0, TimeSpan.Zero);

    private readonly string _connectionString =
        $"Data Source={Guid.NewGuid():N};Mode=Memory;Cache=Shared";

    // A shared in-memory database exists only while a connection to it stays open.
    private readonly SqliteConnection _keepAlive;

    public DroneInventoryApiFactory()
    {
        _keepAlive = new SqliteConnection(_connectionString);
        _keepAlive.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<DroneInventoryDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<DroneInventoryDbContext>>();
            services.AddDbContext<DroneInventoryDbContext>(options => options.UseSqlite(_connectionString));

            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(new FixedTimeProvider(FixedNow));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
        {
            _keepAlive.Dispose();
        }
    }
}
