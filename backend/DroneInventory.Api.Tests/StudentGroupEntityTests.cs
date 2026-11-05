using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

public sealed class StudentGroupEntityTests : IDisposable
{
    private const int SqliteConstraintError = 19;

    private readonly DroneInventoryApiFactory _factory = new();

    [Fact]
    public async Task Student_group_is_stored_with_name()
    {
        await SaveStudentGroupAsync("Group 3");

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var studentGroup = await dbContext.StudentGroups.SingleAsync();

        Assert.Equal("Group 3", studentGroup.Name);
    }

    [Fact]
    public async Task Database_refuses_a_duplicate_name()
    {
        await SaveStudentGroupAsync("Group 3");

        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => SaveStudentGroupAsync("Group 3"));

        var sqliteException = Assert.IsType<SqliteException>(exception.InnerException);
        Assert.Equal(SqliteConstraintError, sqliteException.SqliteErrorCode);
        Assert.Contains("StudentGroups.Name", sqliteException.Message);
    }

    [Fact]
    public async Task Database_accepts_different_names()
    {
        await SaveStudentGroupAsync("Group 3");
        await SaveStudentGroupAsync("Group 4");

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();

        Assert.Equal(2, await dbContext.StudentGroups.CountAsync());
    }

    public void Dispose() => _factory.Dispose();

    private async Task SaveStudentGroupAsync(string name)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        dbContext.StudentGroups.Add(new StudentGroup { Name = name });
        await dbContext.SaveChangesAsync();
    }
}
