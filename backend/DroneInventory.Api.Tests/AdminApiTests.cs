using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DroneInventory.Api.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>Scenarios of "General reset", "Backup and restore" (REQ-038, REQ-039) and "Delete the history" (REQ-040).</summary>
public sealed class AdminApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public AdminApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Return_all_drones()
    {
        var group = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await LoanAsync(await CreateAsync("/api/drones", new { name = "TELLO-07" }), group, batteries: 4);
        await LoanAsync(await CreateAsync("/api/drones", new { name = "TELLO-08" }), group, batteries: 2);
        _factory.Time.SetNow(DroneInventoryApiFactory.FixedNow.AddDays(2));

        var response = await _client.PostAsJsonAsync("/api/admin/reset", new { returnAllDrones = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("returnedLoans").GetInt32());
        Assert.Empty(await ListAsync("/api/loans?status=Active"));
        var history = await ListAsync("/api/loans?status=Returned");
        Assert.Equal(2, history.Count);
        Assert.All(history, loan =>
        {
            Assert.Equal("2026-08-21", loan.GetProperty("returnDate").GetString());
            Assert.Equal(0, loan.GetProperty("missingBatteries").GetInt32());
        });
        Assert.All(await ListAsync("/api/drones"), drone => Assert.Equal("Available", drone.GetProperty("status").GetString()));
    }

    [Fact]
    public async Task Delete_all_drones_and_groups()
    {
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync($"/api/student-groups/{group3}/members", new { name = "Anna Huber" });
        var tello7 = await CreateAsync("/api/drones", new { name = "TELLO-07" });
        await ReturnAsync(await LoanAsync(tello7, group3));
        var tello8 = await CreateAsync("/api/drones", new { name = "TELLO-08" });
        var group4 = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        await LoanAsync(tello8, group4);
        var trashed = await CreateAsync("/api/drones", new { name = "TELLO-09" });
        await _client.DeleteAsync($"/api/drones/{trashed}");

        var response = await _client.PostAsJsonAsync("/api/admin/reset", new { deleteAllDrones = true, deleteAllStudentGroups = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await ListAsync("/api/drones"));
        Assert.Empty(await ListAsync("/api/drones/trash"));
        Assert.Empty(await ListAsync("/api/student-groups"));
        Assert.Empty(await ListAsync("/api/loans?status=Active"));
        var loan = Assert.Single(await ListAsync("/api/loans?status=Returned"));
        Assert.Equal("TELLO-07", loan.GetProperty("droneName").GetString());
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
        Assert.Equal(0, await CountAsync(db => db.StudentGroupMembers));
    }

    [Fact]
    public async Task Delete_everything()
    {
        var group = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReturnAsync(await LoanAsync(await CreateAsync("/api/drones", new { name = "TELLO-07" }), group, batteries: 2));
        await LoanAsync(await CreateAsync("/api/drones", new { name = "TELLO-08" }), group);

        var response = await _client.PostAsJsonAsync(
            "/api/admin/reset",
            new { returnAllDrones = true, deleteAllDrones = true, deleteAllStudentGroups = true, deleteHistory = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0, await CountAsync(db => db.Drones));
        Assert.Equal(0, await CountAsync(db => db.StudentGroups));
        Assert.Equal(0, await CountAsync(db => db.Loans));
        Assert.Equal(0, await CountAsync(db => db.Set<Domain.LoanItem>()));
    }

    [Fact]
    public async Task Nothing_chosen()
    {
        await CreateAsync("/api/drones", new { name = "TELLO-07" });

        var response = await _client.PostAsJsonAsync("/api/admin/reset", new { });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Single(await ListAsync("/api/drones"));
    }

    [Fact]
    public async Task Download_a_backup()
    {
        await CreateAsync("/api/drones", new { name = "TELLO-07" });

        var response = await _client.GetAsync("/api/admin/backup");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("drohnenverwaltung-backup-2026-08-19.db", response.Content.Headers.ContentDisposition?.FileNameStar ?? response.Content.Headers.ContentDisposition?.FileName);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal("SQLite format 3\0", Encoding.ASCII.GetString(bytes, 0, 16));
        Assert.Equal(["TELLO-07"], await DroneNamesInFileAsync(bytes));
    }

    [Fact]
    public async Task Restore_a_backup()
    {
        var tello7 = await CreateAsync("/api/drones", new { name = "TELLO-07" });
        var backup = await (await _client.GetAsync("/api/admin/backup")).Content.ReadAsByteArrayAsync();
        await _client.DeleteAsync($"/api/drones/{tello7}");
        await _client.DeleteAsync($"/api/drones/{tello7}/permanent?history=delete");
        await CreateAsync("/api/drones", new { name = "TELLO-08" });

        var response = await RestoreAsync(backup);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var names = (await ListAsync("/api/drones")).Select(drone => drone.GetProperty("name").GetString());
        Assert.Equal(["TELLO-07"], names);
    }

    [Fact]
    public async Task Not_a_backup()
    {
        await CreateAsync("/api/drones", new { name = "TELLO-07" });

        var text = await RestoreAsync(Encoding.UTF8.GetBytes("Drohnen;Gruppen\nTELLO-07;Group 3\n"));
        var otherDatabase = await RestoreAsync(await OtherSqliteDatabaseAsync());

        await ApiResponseAssert.IsProblemAsync(text, HttpStatusCode.BadRequest);
        await ApiResponseAssert.IsProblemAsync(otherDatabase, HttpStatusCode.BadRequest);
        Assert.Single(await ListAsync("/api/drones"));
    }

    [Fact]
    public async Task Backup_of_a_newer_version()
    {
        await CreateAsync("/api/drones", new { name = "TELLO-07" });
        var backup = await (await _client.GetAsync("/api/admin/backup")).Content.ReadAsByteArrayAsync();
        backup = await WithMigrationAsync(backup, "29991231000000_FromTheFuture");

        var response = await RestoreAsync(backup);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("newer version", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Delete_the_history()
    {
        var group = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReturnAsync(await LoanAsync(await CreateAsync("/api/drones", new { name = "TELLO-07" }), group));
        await ReturnAsync(await LoanAsync(await CreateAsync("/api/drones", new { name = "TELLO-08" }), group));
        await LoanAsync(await CreateAsync("/api/drones", new { name = "TELLO-09" }), group);

        var response = await _client.DeleteAsync("/api/loans/history");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("deletedLoans").GetInt32());
        Assert.Empty(await ListAsync("/api/loans?status=Returned"));
        Assert.Equal("TELLO-09", Assert.Single(await ListAsync("/api/loans?status=Active")).GetProperty("droneName").GetString());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private Task<HttpResponseMessage> RestoreAsync(byte[] file)
    {
        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(file);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        content.Add(fileContent, "file", "backup.db");
        return _client.PostAsync("/api/admin/restore", content);
    }

    private static async Task<string[]> DroneNamesInFileAsync(byte[] bytes)
    {
        var file = Path.Combine(Path.GetTempPath(), $"test-backup-{Guid.NewGuid():N}.db");
        await File.WriteAllBytesAsync(file, bytes);
        try
        {
            await using var connection = new SqliteConnection($"Data Source={file};Pooling=False");
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT Name FROM Drones ORDER BY Name";
            var names = new List<string>();
            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                names.Add(reader.GetString(0));
            }

            return names.ToArray();
        }
        finally
        {
            File.Delete(file);
        }
    }

    private static async Task<byte[]> OtherSqliteDatabaseAsync()
    {
        var file = Path.Combine(Path.GetTempPath(), $"test-other-{Guid.NewGuid():N}.db");
        try
        {
            await using (var connection = new SqliteConnection($"Data Source={file};Pooling=False"))
            {
                await connection.OpenAsync();
                await using var command = connection.CreateCommand();
                command.CommandText = "CREATE TABLE Recipes (Id INTEGER PRIMARY KEY, Name TEXT)";
                await command.ExecuteNonQueryAsync();
            }

            return await File.ReadAllBytesAsync(file);
        }
        finally
        {
            File.Delete(file);
        }
    }

    private static async Task<byte[]> WithMigrationAsync(byte[] backup, string migrationId)
    {
        var file = Path.Combine(Path.GetTempPath(), $"test-newer-{Guid.NewGuid():N}.db");
        await File.WriteAllBytesAsync(file, backup);
        try
        {
            await using (var connection = new SqliteConnection($"Data Source={file};Pooling=False"))
            {
                await connection.OpenAsync();
                await using var command = connection.CreateCommand();
                command.CommandText = $"INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('{migrationId}', '10.0.13')";
                await command.ExecuteNonQueryAsync();
            }

            return await File.ReadAllBytesAsync(file);
        }
        finally
        {
            File.Delete(file);
        }
    }

    private async Task<int> LoanAsync(int droneId, int groupId, int batteries = 0)
    {
        var response = await _client.PostAsJsonAsync("/api/loans", new
        {
            droneId,
            studentGroupId = groupId,
            items = new[] { new { type = "Battery", quantity = batteries } },
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private async Task ReturnAsync(int loanId) =>
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/loans/{loanId}/return", null)).StatusCode);

    private async Task<int> CreateAsync(string path, object body)
    {
        var response = await _client.PostAsJsonAsync(path, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private async Task<List<JsonElement>> ListAsync(string path)
    {
        var response = await _client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }

    private async Task<int> CountAsync<T>(Func<DroneInventoryDbContext, IQueryable<T>> set)
    {
        using var scope = _factory.Services.CreateScope();
        return await set(scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>()).CountAsync();
    }
}
